/**
 * 🔥 ENRICHMENT SERVICE
 * Async company intelligence enrichment with retry + quality gate
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "../storage";
import { type EnrichmentStatus, type EnrichmentErrorCode } from "@shared/schema";

// 🔥 ENRICHMENT META: Stored in ai_profile JSONB
export interface EnrichmentMeta {
  status: EnrichmentStatus | 'queued' | 'in_progress';
  errorCode: EnrichmentErrorCode;
  lastUpdated: string | null;
  attempts: number;
  nextRetryAt: string | null;
  confidence: 'low' | 'medium' | 'high' | null;
}

// 🔥 ENRICHMENT INPUT
export interface EnrichmentInput {
  userId: string;
  company: string;
  industry: string;
  role: string;
  website: string | null;
  phone: string;
  language: string;
  primaryGoal: string;
  firstName: string;
  lastName: string;
}

// 🔥 ENRICHMENT RESULT
export interface EnrichmentResult {
  aiProfile: any;
  enrichmentWasSuccessful: boolean;
  enrichmentStatus: EnrichmentStatus;
  enrichmentErrorCode: EnrichmentErrorCode;
  confidence: 'low' | 'medium' | 'high';
}

// 🔥 MODEL ALLOWLIST
const ALLOWED_ENRICH_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'] as const;

// 🔥 RETRY CONFIG
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [2 * 60 * 1000, 10 * 60 * 1000, 60 * 60 * 1000]; // 2min, 10min, 60min
const NO_RETRY_ERROR_CODES: EnrichmentErrorCode[] = ['quota', 'auth', 'model_not_allowed'];

// 🔥 QUALITY GATE: Check if enrichment result is actually valuable
function isEnrichmentValid(profile: any): { valid: boolean; score: number } {
  if (!profile) return { valid: false, score: 0 };
  
  let score = 0;
  
  if (profile.companyDescription && profile.companyDescription.length >= 120) score++;
  if (Array.isArray(profile.products) && profile.products.length >= 2) score++;
  if (Array.isArray(profile.services) && profile.services.length >= 2) score++;
  if (Array.isArray(profile.uniqueSellingPoints) && profile.uniqueSellingPoints.length >= 2) score++;
  if (Array.isArray(profile.competitors) && profile.competitors.length >= 2) score++;
  if (profile.targetAudience && profile.targetAudience.length >= 40) score++;
  
  return { valid: score >= 2, score };
}

// 🔥 CONFIDENCE FROM SCORE
function getConfidence(score: number): 'low' | 'medium' | 'high' {
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

// 🔥 BUILD FALLBACK PROFILE
function buildFallbackProfile(input: EnrichmentInput, errorCode: EnrichmentErrorCode): any {
  const { company, industry, role, firstName, lastName, primaryGoal, language } = input;
  
  const companyIntel = {
    companyDescription: `${company} ist ein innovatives Unternehmen in der ${industry} Branche. Als ${role} bei ${company} fokussiert sich das Team auf ${primaryGoal?.replace('_', ' ') || 'strategisches Wachstum'}. Das Unternehmen zeichnet sich durch moderne Ansätze und kundenorientierte Lösungen aus.`,
    products: [`${industry} Lösungen`, "Premium Services", "Beratungsleistungen"],
    services: ["Strategieberatung", "Implementierung", "Support & Wartung"],
    targetAudience: `Entscheider in der ${industry} Branche, B2B Kunden mit Fokus auf Innovation und Effizienz`,
    brandVoice: "Professionell, innovativ und kundenorientiert mit persönlicher Note",
    bestCallTimes: "Dienstag-Donnerstag, 14-16 Uhr (optimale Erreichbarkeit)",
    effectiveKeywords: [company, industry, primaryGoal?.replace('_', ' ') || '', "Innovation", "Effizienz", "Lösungen", "Strategie", "Wachstum"].filter(Boolean),
    competitors: ["Branchenführer", "Etablierte Anbieter", "Innovative Startups"],
    uniqueSellingPoints: ["Kundenorientierung", "Expertise in " + industry, "Innovative Ansätze"],
    goals: ["Marktanteil ausbauen", "Kundenzufriedenheit steigern", "Innovation vorantreiben"],
    communicationPreferences: "Professionell, direkt, lösungsorientiert",
    opportunities: ["Digitale Transformation", "Marktexpansion", "Strategische Partnerschaften"]
  };
  
  const customSystemPrompt = `Du bist ARAS AI® – die persönliche KI-Assistenz von ${firstName} ${lastName}.

🧠 ÜBER DEN USER:
Name: ${firstName} ${lastName}
Firma: ${company}
Branche: ${industry}
Position: ${role}

🏢 ÜBER DIE FIRMA:
${companyIntel.companyDescription}

Zielgruppe: ${companyIntel.targetAudience}
Brand Voice: ${companyIntel.brandVoice}

🎯 PRIMÄRES ZIEL: ${primaryGoal}

💬 SPRACHE: ${language === 'de' ? 'Deutsch (du-Form)' : language === 'en' ? 'English' : 'Français'}

Du bist die persönliche KI von ${firstName} bei ${company}. Beziehe dich immer auf den Business Context.

Bleibe immer ARAS AI - entwickelt von der Schwarzott Group.`;

  return {
    companyDescription: companyIntel.companyDescription,
    products: companyIntel.products,
    services: companyIntel.services,
    targetAudience: companyIntel.targetAudience,
    brandVoice: companyIntel.brandVoice,
    customSystemPrompt,
    effectiveKeywords: companyIntel.effectiveKeywords,
    bestCallTimes: companyIntel.bestCallTimes,
    goals: companyIntel.goals,
    competitors: companyIntel.competitors,
    uniqueSellingPoints: companyIntel.uniqueSellingPoints,
    opportunities: companyIntel.opportunities,
    communicationPreferences: companyIntel.communicationPreferences,
    lastUpdated: new Date().toISOString(),
    enrichmentStatus: 'fallback' as EnrichmentStatus,
    enrichmentErrorCode: errorCode,
    enrichmentMeta: {
      status: 'fallback',
      errorCode,
      lastUpdated: new Date().toISOString(),
      attempts: 1,
      nextRetryAt: null,
      confidence: 'low'
    }
  };
}

/**
 * 🔥 RUN ENRICHMENT JOB
 * Pure function that performs the enrichment and returns the result
 */
export async function runEnrichment(input: EnrichmentInput, attemptNumber: number = 1): Promise<EnrichmentResult> {
  const startTime = Date.now();
  const { company, industry, role, website, firstName, lastName, primaryGoal, language } = input;
  
  // Log begin (NO PII)
  console.log('[enrich.job.begin]', JSON.stringify({
    timestamp: new Date().toISOString(),
    userId: input.userId,
    attempt: attemptNumber,
    hasCompany: !!company,
    hasIndustry: !!industry,
    hasWebsite: !!website
  }));
  
  // 🔥 MODEL VALIDATION
  const GEMINI_ENRICH_MODEL = process.env.GEMINI_ENRICH_MODEL ?? 'gemini-2.5-flash';
  
  if (!ALLOWED_ENRICH_MODELS.includes(GEMINI_ENRICH_MODEL as any)) {
    console.error(`[enrich.job.fail] Model not allowed: ${GEMINI_ENRICH_MODEL}`);
    return {
      aiProfile: buildFallbackProfile(input, 'model_not_allowed'),
      enrichmentWasSuccessful: false,
      enrichmentStatus: 'fallback',
      enrichmentErrorCode: 'model_not_allowed',
      confidence: 'low'
    };
  }
  
  try {
    // 🔥 API KEY VALIDATION
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || !apiKey.startsWith('AIza')) {
      console.error('[enrich.job.fail] Invalid or missing API key');
      return {
        aiProfile: buildFallbackProfile(input, 'auth'),
        enrichmentWasSuccessful: false,
        enrichmentStatus: 'fallback',
        enrichmentErrorCode: 'auth',
        confidence: 'low'
      };
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_ENRICH_MODEL,
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        candidateCount: 1,
      },
      tools: [{
        googleSearch: {}
      }] as any,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ] as any
    });
    
    // 🔥 PROMPT
    const companyDeepDive = `
[🤖 ULTRA-DEEP RESEARCH MODE ACTIVATED]

Unternehmen: ${company}
Website: ${website || 'Nicht angegeben'}
Branche: ${industry}

Du bist ein Elite-Business-Intelligence-Agent. Recherchiere ALLES über dieses Unternehmen:

🏢 UNTERNEHMENS-DNA:
- Gründungsjahr und Geschichte
- CEO/Gründer (Name, Background)
- Unternehmensstruktur und Mitarbeiterzahl
- Standorte und Niederlassungen

💼 BUSINESS INTELLIGENCE:
- Exakte Produkte und Services
- Unique Selling Propositions (USPs)
- Marktposition und Wettbewerber
- Aktuelle Projekte und Initiativen

🎯 TARGET & STRATEGY:
- Detaillierte Zielgruppenprofile
- Vertriebskanäle und Verkaufsprozess
- Marketing-Strategie
- Brand Voice und Tonality

Gib mir eine ULTRA-DETAILLIERTE Analyse als JSON:
{
  "companyDescription": "Ultra-detaillierte Beschreibung mit allen gefundenen Informationen",
  "foundedYear": "Jahr oder 'Unbekannt'",
  "ceoName": "Name des CEOs/Gründers",
  "employeeCount": "Anzahl oder Schätzung",
  "products": ["Detaillierte Produktliste"],
  "services": ["Detaillierte Serviceliste"],
  "targetAudience": "Sehr detaillierte Zielgruppenbeschreibung",
  "competitors": ["Hauptwettbewerber"],
  "uniqueSellingPoints": ["USPs"],
  "brandVoice": "Detaillierte Brand Voice Analyse",
  "opportunities": ["Chancen und Potenziale"],
  "bestCallTimes": "Optimale Kontaktzeiten mit Begründung",
  "effectiveKeywords": ["Top 20+ relevante Keywords"]
}

Sei EXTREM gründlich. Wenn das Unternehmen existiert, finde ECHTE Daten.
`;

    // 🔥 RETRY LOGIC
    let response: string | null = null;
    let lastError: any = null;
    const TIMEOUT_MS = 90000;
    
    for (let retry = 1; retry <= 3; retry++) {
      try {
        const resultPromise = model.generateContent(companyDeepDive);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT_MS/1000}s`)), TIMEOUT_MS)
        );
        
        const result = await Promise.race([resultPromise, timeoutPromise]) as any;
        
        if (result?.response) {
          const tempResponse = result.response.text();
          if (tempResponse && tempResponse.length > 200) {
            response = tempResponse;
            break;
          }
        }
      } catch (error: any) {
        lastError = error;
        if (retry < 3) {
          await new Promise(resolve => setTimeout(resolve, retry * 2000));
        }
      }
    }
    
    if (!response) {
      const errorCode: EnrichmentErrorCode = lastError?.message?.includes('Timeout') ? 'timeout' : 
                                             lastError?.message?.includes('quota') ? 'quota' : 'unknown';
      console.log('[enrich.job.fail]', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: input.userId,
        errorCode,
        attempt: attemptNumber,
        durationMs: Date.now() - startTime
      }));
      
      return {
        aiProfile: buildFallbackProfile(input, errorCode),
        enrichmentWasSuccessful: false,
        enrichmentStatus: 'fallback',
        enrichmentErrorCode: errorCode,
        confidence: 'low'
      };
    }
    
    // 🔥 PARSE JSON
    let companyIntel: any;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        companyIntel = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.log('[enrich.job.fail]', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: input.userId,
        errorCode: 'parse',
        attempt: attemptNumber,
        durationMs: Date.now() - startTime
      }));
      
      return {
        aiProfile: buildFallbackProfile(input, 'parse'),
        enrichmentWasSuccessful: false,
        enrichmentStatus: 'fallback',
        enrichmentErrorCode: 'parse',
        confidence: 'low'
      };
    }
    
    // 🔥 QUALITY GATE
    const { valid, score } = isEnrichmentValid(companyIntel);
    const confidence = getConfidence(score);
    
    if (!valid) {
      console.log('[enrich.job.fail]', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: input.userId,
        errorCode: 'quality_gate_failed',
        qualityScore: score,
        attempt: attemptNumber,
        durationMs: Date.now() - startTime
      }));
      
      return {
        aiProfile: buildFallbackProfile(input, 'quality_gate_failed'),
        enrichmentWasSuccessful: false,
        enrichmentStatus: 'fallback',
        enrichmentErrorCode: 'quality_gate_failed',
        confidence: 'low'
      };
    }
    
    // 🔥 BUILD SUCCESSFUL PROFILE
    const customSystemPrompt = `Du bist ARAS AI® – die persönliche KI-Assistenz von ${firstName} ${lastName}.

🧠 ÜBER DEN USER:
Name: ${firstName} ${lastName}
Firma: ${company}
Branche: ${industry}
Position: ${role}

🏢 ÜBER DIE FIRMA:
${companyIntel.companyDescription}

Zielgruppe: ${companyIntel.targetAudience}
Brand Voice: ${companyIntel.brandVoice}

🎯 PRIMÄRES ZIEL: ${primaryGoal}

💬 SPRACHE: ${language === 'de' ? 'Deutsch (du-Form)' : language === 'en' ? 'English' : 'Français'}

Du bist die persönliche KI von ${firstName} bei ${company}. Beziehe dich immer auf den Business Context.

Bleibe immer ARAS AI - entwickelt von der Schwarzott Group.`;

    const aiProfile = {
      companyDescription: companyIntel.companyDescription,
      products: companyIntel.products || [],
      services: companyIntel.services || [],
      targetAudience: companyIntel.targetAudience,
      brandVoice: companyIntel.brandVoice,
      customSystemPrompt,
      effectiveKeywords: companyIntel.effectiveKeywords || [],
      bestCallTimes: companyIntel.bestCallTimes,
      goals: companyIntel.goals || [primaryGoal],
      competitors: companyIntel.competitors || [],
      uniqueSellingPoints: companyIntel.uniqueSellingPoints || [],
      foundedYear: companyIntel.foundedYear || null,
      ceoName: companyIntel.ceoName || null,
      employeeCount: companyIntel.employeeCount || null,
      opportunities: companyIntel.opportunities || [],
      lastUpdated: new Date().toISOString(),
      enrichmentStatus: 'live_research' as EnrichmentStatus,
      enrichmentErrorCode: null,
      enrichmentMeta: {
        status: 'live_research',
        errorCode: null,
        lastUpdated: new Date().toISOString(),
        attempts: attemptNumber,
        nextRetryAt: null,
        confidence
      }
    };
    
    console.log('[enrich.job.ok]', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: input.userId,
      attempt: attemptNumber,
      qualityScore: score,
      confidence,
      durationMs: Date.now() - startTime
    }));
    
    return {
      aiProfile,
      enrichmentWasSuccessful: true,
      enrichmentStatus: 'live_research',
      enrichmentErrorCode: null,
      confidence
    };
    
  } catch (error: any) {
    const errorCode: EnrichmentErrorCode = error?.message?.includes('Timeout') ? 'timeout' :
                                           error?.message?.includes('quota') ? 'quota' :
                                           error?.message?.includes('API Key') ? 'auth' : 'unknown';
    
    console.log('[enrich.job.fail]', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: input.userId,
      errorCode,
      errorMessage: (error?.message || '').substring(0, 100),
      attempt: attemptNumber,
      durationMs: Date.now() - startTime
    }));
    
    return {
      aiProfile: buildFallbackProfile(input, errorCode),
      enrichmentWasSuccessful: false,
      enrichmentStatus: 'fallback',
      enrichmentErrorCode: errorCode,
      confidence: 'low'
    };
  }
}

/**
 * 🔥 RUN ENRICHMENT JOB ASYNC (with DB update)
 * Called after user creation, updates the user's ai_profile
 */
export async function runEnrichmentJobAsync(input: EnrichmentInput): Promise<void> {
  const user = await storage.getUser(input.userId);
  if (!user) {
    console.error('[enrich.job.fail] User not found:', input.userId);
    return;
  }
  
  // Get current attempt count
  const currentMeta = (user.aiProfile as any)?.enrichmentMeta;
  const attemptNumber = (currentMeta?.attempts || 0) + 1;
  
  // Check if we should skip (too many attempts or no-retry error)
  if (attemptNumber > MAX_ATTEMPTS) {
    console.log('[enrich.job.skip] Max attempts reached for user:', input.userId);
    return;
  }
  
  if (currentMeta?.errorCode && NO_RETRY_ERROR_CODES.includes(currentMeta.errorCode)) {
    console.log('[enrich.job.skip] No-retry error code:', currentMeta.errorCode);
    return;
  }
  
  // Update status to in_progress
  await storage.updateUserProfile(input.userId, {
    aiProfile: {
      ...(user.aiProfile || {}),
      enrichmentMeta: {
        ...currentMeta,
        status: 'in_progress',
        attempts: attemptNumber
      }
    }
  });
  
  // Run enrichment
  const result = await runEnrichment(input, attemptNumber);
  
  // Calculate next retry if failed
  let nextRetryAt: string | null = null;
  if (!result.enrichmentWasSuccessful && attemptNumber < MAX_ATTEMPTS) {
    if (!NO_RETRY_ERROR_CODES.includes(result.enrichmentErrorCode)) {
      const backoffMs = RETRY_BACKOFF_MS[attemptNumber - 1] || RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
    }
  }
  
  // Update user with result
  const updatedMeta: EnrichmentMeta = {
    status: result.enrichmentStatus,
    errorCode: result.enrichmentErrorCode,
    lastUpdated: new Date().toISOString(),
    attempts: attemptNumber,
    nextRetryAt,
    confidence: result.confidence
  };
  
  await storage.updateUserProfile(input.userId, {
    aiProfile: {
      ...result.aiProfile,
      enrichmentMeta: updatedMeta
    },
    profileEnriched: result.enrichmentWasSuccessful,
    lastEnrichmentDate: result.enrichmentWasSuccessful ? new Date() : user.lastEnrichmentDate
  });
  
  // Schedule retry if needed
  if (nextRetryAt && !result.enrichmentWasSuccessful) {
    const backoffMs = RETRY_BACKOFF_MS[attemptNumber - 1] || RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
    console.log(`[enrich.job.retry] Scheduling retry in ${backoffMs / 1000}s for user:`, input.userId);
    
    setTimeout(() => {
      runEnrichmentJobAsync(input).catch(err => {
        console.error('[enrich.job.retry.error]', err);
      });
    }, backoffMs);
  }
}

/**
 * 🔥 TRIGGER ENRICHMENT (non-blocking)
 * Called from registration, starts enrichment job asynchronously
 */
export function triggerEnrichmentAsync(input: EnrichmentInput): void {
  setImmediate(() => {
    runEnrichmentJobAsync(input).catch(err => {
      console.error('[enrich.trigger.error]', err);
    });
  });
}

/**
 * 🔥 FORCE RE-ENRICH (Admin)
 * Resets attempts and triggers new enrichment
 */
export async function forceReEnrich(userId: string): Promise<{ success: boolean; message: string }> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  // Check if already enriched and not forcing
  if (user.profileEnriched) {
    // Reset for re-enrich
    await storage.updateUserProfile(userId, {
      aiProfile: {
        ...(user.aiProfile || {}),
        enrichmentMeta: {
          status: 'queued',
          errorCode: null,
          lastUpdated: new Date().toISOString(),
          attempts: 0,
          nextRetryAt: null,
          confidence: null
        }
      },
      profileEnriched: false
    });
  }
  
  // Build input from user data
  const input: EnrichmentInput = {
    userId: user.id,
    company: user.company || '',
    industry: user.industry || '',
    role: user.jobRole || '',
    website: user.website,
    phone: user.phone || '',
    language: user.language || 'de',
    primaryGoal: user.primaryGoal || '',
    firstName: user.firstName || '',
    lastName: user.lastName || ''
  };
  
  // Trigger async
  triggerEnrichmentAsync(input);
  
  return { success: true, message: 'Enrichment job started' };
}
