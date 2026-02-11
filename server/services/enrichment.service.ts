/**
 * 🔥 ENRICHMENT SERVICE
 * Async company intelligence enrichment with retry + quality gate
 * 🔥 SWITCHED TO OPENAI GPT-4o - More reliable than Gemini
 */

import OpenAI from "openai";
import { storage } from "../storage";
import { type EnrichmentStatus, type EnrichmentErrorCode } from "@shared/schema";

// 🔥 ROBUST JSON EXTRACTOR - handles markdown fences, extra text, repair
function extractJsonFromText(rawText: string): { json: any | null; repaired: boolean; error: string | null } {
  if (!rawText || typeof rawText !== 'string') {
    return { json: null, repaired: false, error: 'empty_input' };
  }
  
  let text = rawText.trim();
  
  // Step 1: Remove markdown code fences
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Step 2: Remove common prefixes like "Here is the JSON:" or "Response:"
  text = text.replace(/^[\s\S]*?(?=\{)/m, '');
  
  // Step 3: Find first { and last } - proper brace matching
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.log('[extractJson] No valid braces found', { firstBrace, lastBrace, textLength: text.length });
    return { json: null, repaired: false, error: 'no_braces' };
  }
  
  let jsonString = text.substring(firstBrace, lastBrace + 1);
  
  // Step 4: Try direct parse
  try {
    const parsed = JSON.parse(jsonString);
    console.log('[extractJson] Direct parse success');
    return { json: parsed, repaired: false, error: null };
  } catch (directError: any) {
    console.log('[extractJson] Direct parse failed:', directError.message?.substring(0, 100));
  }
  
  // Step 5: Attempt repairs
  let repaired = false;
  
  // Fix trailing commas before } or ]
  jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
  
  // Fix single quotes to double quotes (careful with apostrophes)
  jsonString = jsonString.replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');
  jsonString = jsonString.replace(/:\s*'([^']*)'/g, ': "$1"');
  
  // Fix unquoted keys
  jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Try parse again
  try {
    const parsed = JSON.parse(jsonString);
    console.log('[extractJson] Repaired parse success');
    return { json: parsed, repaired: true, error: null };
  } catch (repairError: any) {
    console.log('[extractJson] Repaired parse failed:', repairError.message?.substring(0, 100));
    console.log('[extractJson] First 300 chars:', jsonString.substring(0, 300));
    console.log('[extractJson] Last 300 chars:', jsonString.substring(Math.max(0, jsonString.length - 300)));
    return { json: null, repaired: false, error: 'parse_failed' };
  }
}

// 🔥 SCHEMA REPAIR - ensure all required fields exist with defaults
function repairEnrichmentSchema(data: any): { data: any; fieldsRepaired: string[] } {
  const fieldsRepaired: string[] = [];
  
  // Ensure data is an object
  if (!data || typeof data !== 'object') {
    return { data: {}, fieldsRepaired: ['root'] };
  }
  
  // Required string fields with defaults
  const stringFields: Record<string, string> = {
    companyDescription: 'Unternehmensbeschreibung wird noch analysiert...',
    targetAudience: 'Zielgruppe wird analysiert...',
    brandVoice: 'Neutral und professionell',
    bestCallTimes: 'Vormittags 9-12 Uhr, Nachmittags 14-17 Uhr',
    marketPosition: 'Marktposition wird analysiert...',
    confidence: 'medium'
  };
  
  for (const [field, defaultValue] of Object.entries(stringFields)) {
    if (!data[field] || typeof data[field] !== 'string') {
      data[field] = defaultValue;
      fieldsRepaired.push(field);
    }
  }
  
  // Required array fields with defaults
  const arrayFields: Record<string, string[]> = {
    products: ['Produkte werden analysiert...'],
    services: ['Services werden analysiert...'],
    targetAudienceSegments: ['Zielgruppensegmente werden analysiert...'],
    decisionMakers: ['Entscheider werden identifiziert...'],
    competitors: ['Wettbewerber werden recherchiert...'],
    uniqueSellingPoints: ['USPs werden analysiert...'],
    callAngles: ['Gesprächseinstiege werden generiert...'],
    effectiveKeywords: ['Keywords werden analysiert...'],
    opportunities: ['Chancen werden identifiziert...'],
    recentNews: []
  };
  
  for (const [field, defaultValue] of Object.entries(arrayFields)) {
    if (!Array.isArray(data[field])) {
      // Try to convert string to array
      if (typeof data[field] === 'string' && data[field].length > 0) {
        data[field] = [data[field]];
        fieldsRepaired.push(`${field}_converted`);
      } else {
        data[field] = defaultValue;
        fieldsRepaired.push(field);
      }
    }
  }
  
  // objectionHandling must be array of objects
  if (!Array.isArray(data.objectionHandling)) {
    data.objectionHandling = [
      { objection: 'Kein Interesse', response: 'Verstehe ich. Darf ich kurz fragen, was der Hauptgrund ist?' },
      { objection: 'Keine Zeit', response: 'Natürlich, wann passt es besser? Ich rufe gerne zurück.' },
      { objection: 'Schicken Sie Infos', response: 'Sehr gerne! Welcher Aspekt interessiert Sie am meisten?' }
    ];
    fieldsRepaired.push('objectionHandling');
  } else {
    // Ensure each item has objection and response
    data.objectionHandling = data.objectionHandling.map((item: any, i: number) => {
      if (typeof item === 'string') {
        return { objection: item, response: 'Antwort wird generiert...' };
      }
      return {
        objection: item?.objection || `Einwand ${i + 1}`,
        response: item?.response || 'Antwort wird generiert...'
      };
    });
  }
  
  return { data, fieldsRepaired };
}

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
  email?: string;
}

// 🔥 ENRICHMENT RESULT
export interface EnrichmentResult {
  aiProfile: any;
  enrichmentWasSuccessful: boolean;
  enrichmentStatus: EnrichmentStatus;
  enrichmentErrorCode: EnrichmentErrorCode;
  confidence: 'low' | 'medium' | 'high';
}

// 🔥 MODEL ALLOWLIST - OpenAI Feb 2026 (ORG VERIFIED ✅)
const ALLOWED_ENRICH_MODELS = ['o3-deep-research', 'o4-mini-deep-research', 'gpt-5.2', 'gpt-5.2-pro'] as const;
const DEFAULT_ENRICH_MODEL = 'o3-deep-research'; // 🔥 BEST deep research model!
const RESPONSES_ONLY_MODELS = new Set<string>(['o3-deep-research', 'o4-mini-deep-research']);

function isResponsesOnlyModel(model: string): boolean {
  return RESPONSES_ONLY_MODELS.has(model);
}

function isDeepResearchModel(model: string): boolean {
  return model.includes('deep-research') || model === 'o3-deep-research';
}

// Defensive extraction: SDK may provide output_text OR structured output array
function getResponsesOutputText(result: any): string | null {
  const direct = result?.output_text;
  if (typeof direct === 'string' && direct.trim()) return direct;

  const out = result?.output;
  if (!Array.isArray(out)) return null;

  const chunks: string[] = [];
  for (const item of out) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      const t1 = c?.text;
      if ((c?.type === 'output_text' || c?.type === 'text') && typeof t1 === 'string' && t1.trim()) {
        chunks.push(t1);
      }
      const t2 = c?.text?.value;
      if ((c?.type === 'output_text' || c?.type === 'text') && typeof t2 === 'string' && t2.trim()) {
        chunks.push(t2);
      }
    }
  }

  if (chunks.length) return chunks.join('\n').trim();
  return null;
}

// Generic email domains — do NOT use for domain-restricted web_search
const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'gmx.de', 'gmx.net', 'gmx.at',
  'gmx.ch', 'live.com', 'msn.com', 'aol.com', 'mail.com', 'web.de', 'freenet.de',
  't-online.de', 'posteo.de', 'tutanota.com', 'zoho.com', 'yandex.com'
]);

function extractDomainFromUrl(url: string): string | null {
  try {
    let cleaned = url.trim();
    if (!cleaned.includes('://')) cleaned = 'https://' + cleaned;
    const hostname = new URL(cleaned).hostname.replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}

function extractDomainFromEmail(email: string | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

function buildResponsesTools(params: { website: string | null; email?: string }): { tools: any[]; allowedDomains: string[] | null } {
  const domain = (params.website ? extractDomainFromUrl(params.website) : null)
    ?? extractDomainFromEmail(params.email);

  if (domain) {
    return {
      tools: [{ type: 'web_search_preview', search_context_size: 'medium', filters: { allowed_domains: [domain] } }],
      allowedDomains: [domain]
    };
  }
  return {
    tools: [{ type: 'web_search_preview', search_context_size: 'medium' }],
    allowedDomains: null
  };
}

// 🔥 RETRY CONFIG
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [2 * 60 * 1000, 10 * 60 * 1000, 60 * 60 * 1000]; // 2min, 10min, 60min
const NO_RETRY_ERROR_CODES: EnrichmentErrorCode[] = ['quota', 'auth', 'model_not_allowed'];

// 🔥 QUALITY GATE: Check if enrichment result is actually valuable (WOW-level)
function isEnrichmentValid(profile: any): { valid: boolean; score: number; details: Record<string, number> } {
  if (!profile) return { valid: false, score: 0, details: {} };
  
  const details: Record<string, number> = {};
  let score = 0;
  
  // Company description (max 2 points)
  if (profile.companyDescription && profile.companyDescription.length >= 300) {
    score += 2; details.companyDescription = 2;
  } else if (profile.companyDescription && profile.companyDescription.length >= 120) {
    score += 1; details.companyDescription = 1;
  }
  
  // Products (max 1 point)
  if (Array.isArray(profile.products) && profile.products.length >= 5) {
    score += 1; details.products = 1;
  }
  
  // Services (max 1 point)
  if (Array.isArray(profile.services) && profile.services.length >= 3) {
    score += 1; details.services = 1;
  }
  
  // USPs (max 1 point)
  if (Array.isArray(profile.uniqueSellingPoints) && profile.uniqueSellingPoints.length >= 5) {
    score += 1; details.uniqueSellingPoints = 1;
  }
  
  // Competitors (max 1 point)
  if (Array.isArray(profile.competitors) && profile.competitors.length >= 3) {
    score += 1; details.competitors = 1;
  }
  
  // Target audience (max 1 point)
  if (profile.targetAudience && profile.targetAudience.length >= 100) {
    score += 1; details.targetAudience = 1;
  }
  
  // Call angles (max 1 point) - NEW for WOW
  if (Array.isArray(profile.callAngles) && profile.callAngles.length >= 5) {
    score += 1; details.callAngles = 1;
  }
  
  // Objections (max 1 point) - NEW for WOW
  if (Array.isArray(profile.objectionHandling) && profile.objectionHandling.length >= 5) {
    score += 1; details.objectionHandling = 1;
  }
  
  // Max score: 10, WOW threshold: 6
  return { valid: score >= 4, score, details };
}

// 🔥 CONFIDENCE FROM SCORE (scaled for WOW-level 10-point system)
function getConfidence(score: number): 'low' | 'medium' | 'high' {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
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
  
  // 🔥 MODEL VALIDATION - OpenAI GPT-4o
  const ENRICH_MODEL = process.env.OPENAI_ENRICH_MODEL ?? DEFAULT_ENRICH_MODEL;
  const ENRICH_API: 'responses' | 'chat.completions' = isResponsesOnlyModel(ENRICH_MODEL) ? 'responses' : 'chat.completions';
  const responsesTooling = ENRICH_API === 'responses' ? buildResponsesTools({ website, email: input.email }) : null;
  console.log('[enrich.openai.route]', JSON.stringify({ userId: input.userId, model: ENRICH_MODEL, api: ENRICH_API, timeoutMs: ENRICH_API === 'responses' ? 300_000 : 90_000, toolsEnabled: !!responsesTooling, tools: responsesTooling?.tools.map((t: any) => t.type) ?? [], toolsCount: responsesTooling?.tools.length ?? 0, allowedDomains: responsesTooling?.allowedDomains ?? null }));
  
  if (!ALLOWED_ENRICH_MODELS.includes(ENRICH_MODEL as any)) {
    console.error(`[enrich.job.fail] Model not allowed: ${ENRICH_MODEL}`);
    return {
      aiProfile: buildFallbackProfile(input, 'model_not_allowed'),
      enrichmentWasSuccessful: false,
      enrichmentStatus: 'fallback',
      enrichmentErrorCode: 'model_not_allowed',
      confidence: 'low'
    };
  }
  
  try {
    // 🔥 API KEY VALIDATION - OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.error('[enrich.job.fail] Invalid or missing OpenAI API key');
      return {
        aiProfile: buildFallbackProfile(input, 'auth'),
        enrichmentWasSuccessful: false,
        enrichmentStatus: 'fallback',
        enrichmentErrorCode: 'auth',
        confidence: 'low'
      };
    }
    
    console.log('[enrich.model.init]', JSON.stringify({ model: ENRICH_MODEL, provider: 'openai', userId: input.userId }));
    
    const openai = new OpenAI({ apiKey });
    
    console.log('[enrich.model.ready]', JSON.stringify({ model: ENRICH_MODEL, provider: 'openai', userId: input.userId }));
    
    // 🔥 WOW-LEVEL DEEP INTELLIGENCE PROMPT
    const companyDeepDive = `
[🤖 ARAS DEEP INTELLIGENCE ENGINE - ULTRA RESEARCH MODE]

Unternehmen: ${company}
Website: ${website || 'Nicht angegeben'}
Branche: ${industry}
Kontaktperson: ${firstName} ${lastName} (${role})
Primäres Ziel: ${primaryGoal}

Du bist ein Elite-Business-Intelligence-Agent für ARAS AI. Deine Aufgabe: Erstelle ein VOLLSTÄNDIGES Outbound-Playbook für dieses Unternehmen.

🔍 RECHERCHIERE ÜBER GOOGLE SEARCH:
1. Besuche die Website ${website || company + '.com'} und analysiere ALLE Seiten
2. Suche nach Pressemitteilungen, News, LinkedIn-Profilen
3. Finde Bewertungen, Kundenreferenzen, Case Studies
4. Recherchiere Wettbewerber und Marktposition

📊 ERSTELLE FOLGENDE ULTRA-DETAILLIERTE ANALYSE:

🏢 UNTERNEHMENS-DNA:
- Exakte Gründungsgeschichte mit Jahr
- Gründer/CEO mit vollständigem Namen und Background
- Mitarbeiterzahl (exakt oder Schätzung mit Quelle)
- Standorte, Niederlassungen, Märkte
- Unternehmenskultur und Werte

💼 PRODUKTE & SERVICES (mindestens 5 von jedem):
- Alle Produkte mit kurzer Beschreibung
- Alle Services mit Zielgruppe
- Preismodelle wenn bekannt
- Besondere Features

🎯 ZIELGRUPPEN-ANALYSE:
- Primäre Zielgruppe (Branche, Größe, Entscheider)
- Sekundäre Zielgruppen
- Typische Pain Points der Zielgruppe
- Kaufmotive und Entscheidungskriterien

� WETTBEWERBS-ANALYSE (mindestens 5):
- Direkte Wettbewerber mit Namen
- Indirekte Wettbewerber
- Marktposition des Unternehmens
- Differenzierungsmerkmale

📞 OUTBOUND PLAYBOOK:
- 10 effektive Call-Angles (Gesprächseinstiege)
- 10 häufige Einwände mit überzeugenden Antworten
- Beste Kontaktzeiten mit Begründung
- Empfohlene Tonalität

🔑 KEYWORDS & SEO (mindestens 15):
- Branchenspezifische Keywords
- Produktbezogene Keywords
- Problem-Keywords der Zielgruppe

⚠️ KRITISCH - AUSGABEFORMAT:
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.
KEINE Markdown-Codeblöcke (\`\`\`), KEIN Text davor oder danach.
Die Antwort MUSS mit { beginnen und mit } enden.

{
  "companyDescription": "string (min 300 Zeichen)",
  "foundedYear": "string oder leerer String",
  "ceoName": "string oder leerer String",
  "employeeCount": "string",
  "headquarters": "string",
  "products": ["string", "string", "string", "string", "string"],
  "services": ["string", "string", "string", "string", "string"],
  "targetAudience": "string (min 100 Zeichen)",
  "targetAudienceSegments": ["string", "string", "string"],
  "decisionMakers": ["string", "string"],
  "competitors": ["string", "string", "string"],
  "uniqueSellingPoints": ["string", "string", "string"],
  "brandVoice": "string",
  "callAngles": ["string", "string", "string", "string", "string"],
  "objectionHandling": [
    {"objection": "string", "response": "string"},
    {"objection": "string", "response": "string"},
    {"objection": "string", "response": "string"}
  ],
  "bestCallTimes": "string",
  "effectiveKeywords": ["string", "string", "string", "string", "string"],
  "opportunities": ["string", "string", "string"],
  "marketPosition": "string",
  "recentNews": ["string"],
  "confidence": "high" | "medium" | "low"
}

STRENGE REGELN:
1. NUR JSON - kein Text, kein Markdown, keine Erklärungen
2. Alle Felder MÜSSEN vorhanden sein
3. Arrays MÜSSEN Arrays sein (niemals Strings)
4. Strings MÜSSEN Strings sein (niemals null - verwende "")
5. objectionHandling MUSS ein Array von Objekten mit "objection" und "response" sein
6. Nutze Google Search für echte Daten
7. Bei Unbekanntem: leerer String "" oder leeres Array []
`;

    // 🔥 RETRY LOGIC WITH DETAILED LOGGING
    let response: string | null = null;
    let lastError: any = null;
    let lastErrorCode: string = 'unknown';
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = isResponsesOnlyModel(ENRICH_MODEL) ? 300_000 : 90_000;
    
    for (let retry = 1; retry <= MAX_RETRIES; retry++) {
      try {
        console.log('[enrich.openai.attempt]', JSON.stringify({ 
          userId: input.userId, 
          retry, 
          model: ENRICH_MODEL,
          api: ENRICH_API,
          timeoutMs: TIMEOUT_MS,
          toolsCount: responsesTooling?.tools.length ?? 0,
          allowedDomains: responsesTooling?.allowedDomains ?? null
        }));
        
        // 🔥 OpenAI API CALL with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        
        try {
          let tempResponse: string | null = null;
          let logMeta: Record<string, any> = { api: ENRICH_API, model: ENRICH_MODEL };
          
          if (ENRICH_API === 'responses') {
            // 🔥 Responses API for deep-research models (v1/responses)
            const result = await openai.responses.create({
              model: ENRICH_MODEL,
              instructions: 'Du bist ein Elite-Business-Intelligence-Agent. Antworte AUSSCHLIESSLICH mit validem JSON. Keine Markdown-Codeblöcke, kein Text davor oder danach. Die Antwort MUSS mit { beginnen und mit } enden.',
              input: companyDeepDive,
              tools: responsesTooling!.tools,
            }, { signal: controller.signal });
            
            clearTimeout(timeoutId);
            tempResponse = getResponsesOutputText(result);
            logMeta = {
              ...logMeta,
              status: result?.status ?? null,
              tokensUsed: (result?.usage as any)?.total_tokens ?? null
            };
          } else {
            // 🔥 Chat Completions API for standard models (v1/chat/completions)
            const completion = await openai.chat.completions.create({
              model: ENRICH_MODEL,
              messages: [
                {
                  role: 'system',
                  content: 'Du bist ein Elite-Business-Intelligence-Agent. Antworte AUSSCHLIESSLICH mit validem JSON. Keine Markdown-Codeblöcke, kein Text davor oder danach. Die Antwort MUSS mit { beginnen und mit } enden.'
                },
                {
                  role: 'user',
                  content: companyDeepDive
                }
              ],
              temperature: 0.7,
              max_completion_tokens: 8192,
              response_format: { type: 'json_object' }
            }, { signal: controller.signal });
            
            clearTimeout(timeoutId);
            tempResponse = completion?.choices?.[0]?.message?.content ?? null;
            logMeta = {
              ...logMeta,
              finishReason: completion?.choices?.[0]?.finish_reason ?? null,
              tokensUsed: completion?.usage?.total_tokens ?? null
            };
          }
          
          const responseLength = tempResponse?.length || 0;
          
          console.log('[enrich.openai.response]', JSON.stringify({ 
            userId: input.userId, 
            retry,
            hasResponse: !!tempResponse,
            responseLength,
            ...logMeta
          }));
          
          if (tempResponse && responseLength > 200) {
            response = tempResponse;
            break;
          }
        } catch (apiError: any) {
          clearTimeout(timeoutId);
          throw apiError;
        }
      } catch (err: any) {
        const msg = String(err?.message ?? '');
        const status: number | null =
          err?.status ??
          err?.response?.status ??
          err?.cause?.status ??
          err?.error?.status ??
          null;

        let errorCode: string = 'unknown';
        let hint: string | null = null;
        if (msg.includes('only supported in v1/responses') || msg.includes('v1/chat/completions')) {
          errorCode = 'model_endpoint_mismatch';
        } else if (msg.includes('require at least one of') || msg.includes('web_search_preview')) {
          errorCode = 'missing_required_tool';
          hint = 'Deep-research requires tools:[{type:"web_search_preview"}] in Responses API call.';
        } else if (status === 401 || status === 403) {
          errorCode = 'auth_error';
        } else if (status === 429) {
          errorCode = 'rate_limited';
        } else if (status !== null && status >= 400 && status < 500) {
          errorCode = 'bad_request';
        } else if (status !== null && status >= 500) {
          errorCode = 'provider_error';
        }

        const retryable = status == null || status >= 500 || status === 429;

        console.error('[enrich.openai.api.error]', JSON.stringify({
          userId: input.userId,
          retry,
          model: ENRICH_MODEL,
          api: ENRICH_API,
          status,
          errorCode,
          errorType: err?.name ?? null,
          errorMessage: msg.substring(0, 300),
          retryable,
          hint
        }));

        const willRetry = retryable && retry < MAX_RETRIES;
        console.error('[enrich.openai.error]', JSON.stringify({
          userId: input.userId,
          retry,
          errorCode,
          status,
          errorMessage: msg.substring(0, 150),
          willRetry,
          retryable
        }));

        lastError = err;
        lastErrorCode = errorCode;

        if (!retryable) break;
        if (retry < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, retry * 2000));
        }
      }
    }
    
    if (!response) {
      // Map internal errorCode to EnrichmentErrorCode for DB/API
      const errorMsg = lastError?.message || '';
      let errorCode: EnrichmentErrorCode = 'unknown';
      
      if (lastErrorCode === 'model_endpoint_mismatch') errorCode = 'model_not_allowed';
      else if (lastErrorCode === 'missing_required_tool') errorCode = 'unknown';
      else if (lastErrorCode === 'auth_error') errorCode = 'auth';
      else if (lastErrorCode === 'rate_limited') errorCode = 'quota';
      else if (lastErrorCode === 'bad_request') errorCode = 'unknown';
      else if (lastErrorCode === 'provider_error') errorCode = 'unknown';
      else if (errorMsg.includes('timeout') || errorMsg.includes('abort')) errorCode = 'timeout';
      else if (errorMsg.includes('quota') || errorMsg.includes('insufficient_quota')) errorCode = 'quota';
      
      console.log('[enrich.job.fail]', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: input.userId,
        errorCode,
        internalErrorCode: lastErrorCode,
        api: ENRICH_API,
        errorMessage: errorMsg.substring(0, 200),
        attempt: attemptNumber,
        durationMs: Date.now() - startTime,
        hint: errorCode === 'auth' ? 'Check OPENAI_API_KEY in environment variables' : null
      }));
      
      return {
        aiProfile: buildFallbackProfile(input, errorCode),
        enrichmentWasSuccessful: false,
        enrichmentStatus: 'fallback',
        enrichmentErrorCode: errorCode,
        confidence: 'low'
      };
    }
    
    // 🔥 ROBUST JSON EXTRACTION (handles markdown fences, extra text, repairs)
    console.log('[enrich.parse.start]', JSON.stringify({ 
      userId: input.userId, 
      responseLength: response.length 
    }));
    
    const extractResult = extractJsonFromText(response);
    
    if (!extractResult.json) {
      console.log('[enrich.parse.fail]', JSON.stringify({
        userId: input.userId,
        error: extractResult.error,
        responsePreview: response.substring(0, 200)
      }));
      
      console.log('[enrich.job.fail]', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: input.userId,
        errorCode: 'parse',
        parseError: extractResult.error,
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
    
    // 🔥 SCHEMA REPAIR - ensure all required fields exist
    const repairResult = repairEnrichmentSchema(extractResult.json);
    const companyIntel = repairResult.data;
    
    if (repairResult.fieldsRepaired.length > 0) {
      console.log('[enrich.parse.repaired]', JSON.stringify({
        userId: input.userId,
        jsonRepaired: extractResult.repaired,
        fieldsRepaired: repairResult.fieldsRepaired
      }));
    } else {
      console.log('[enrich.parse.success]', JSON.stringify({
        userId: input.userId,
        jsonRepaired: extractResult.repaired
      }));
    }
    
    // 🔥 QUALITY GATE
    const { valid, score, details } = isEnrichmentValid(companyIntel);
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
      // 🔥 CORE COMPANY DATA
      companyDescription: companyIntel.companyDescription,
      products: companyIntel.products || [],
      services: companyIntel.services || [],
      targetAudience: companyIntel.targetAudience,
      targetAudienceSegments: companyIntel.targetAudienceSegments || [],
      decisionMakers: companyIntel.decisionMakers || [],
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
      headquarters: companyIntel.headquarters || null,
      opportunities: companyIntel.opportunities || [],
      marketPosition: companyIntel.marketPosition || null,
      recentNews: companyIntel.recentNews || [],
      
      // 🔥 WOW-LEVEL OUTBOUND PLAYBOOK
      callAngles: companyIntel.callAngles || [],
      objectionHandling: companyIntel.objectionHandling || [],
      
      // 🔥 META
      lastUpdated: new Date().toISOString(),
      enrichmentStatus: 'live_research' as EnrichmentStatus,
      enrichmentErrorCode: null,
      qualityScore: score,
      enrichmentMeta: {
        status: 'live_research',
        errorCode: null,
        lastUpdated: new Date().toISOString(),
        attempts: attemptNumber,
        nextRetryAt: null,
        confidence,
        qualityScore: score,
        qualityDetails: details
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
 * CRITICAL: This function MUST always end in a terminal state (complete/failed/timeout)
 */
export async function runEnrichmentJobAsync(input: EnrichmentInput): Promise<void> {
  const startTime = Date.now();
  let attemptNumber = 1;
  
  try {
    console.log('[enrich.async.start]', JSON.stringify({ userId: input.userId, timestamp: new Date().toISOString() }));
    
    const user = await storage.getUser(input.userId);
    if (!user) {
      console.error('[enrich.async.fail] User not found:', input.userId);
      return;
    }
    
    // Get current attempt count
    const currentMeta = (user.aiProfile as any)?.enrichmentMeta;
    attemptNumber = (currentMeta?.attempts || 0) + 1;
    
    // Check if we should skip (too many attempts or no-retry error)
    if (attemptNumber > MAX_ATTEMPTS) {
      console.log('[enrich.async.skip] Max attempts reached for user:', input.userId);
      return;
    }
    
    if (currentMeta?.errorCode && NO_RETRY_ERROR_CODES.includes(currentMeta.errorCode)) {
      console.log('[enrich.async.skip] No-retry error code:', currentMeta.errorCode);
      return;
    }
    
    // Update status to in_progress
    console.log('[enrich.step] status.in_progress', JSON.stringify({ userId: input.userId, attempt: attemptNumber }));
    await storage.updateUserProfile(input.userId, {
      aiProfile: {
        ...(user.aiProfile || {}),
        enrichmentMeta: {
          ...currentMeta,
          status: 'in_progress',
          attempts: attemptNumber,
          lastUpdated: new Date().toISOString()
        }
      }
    });
    
    // Run enrichment
    const _model = process.env.OPENAI_ENRICH_MODEL ?? DEFAULT_ENRICH_MODEL;
    const _api = isResponsesOnlyModel(_model) ? 'responses' : 'chat.completions';
    console.log('[enrich.step] openai.calling', JSON.stringify({ userId: input.userId, model: _model, api: _api }));
    const result = await runEnrichment(input, attemptNumber);
    console.log('[enrich.step] openai.returned', JSON.stringify({ 
      userId: input.userId, 
      model: _model,
      api: _api,
      success: result.enrichmentWasSuccessful,
      status: result.enrichmentStatus,
      errorCode: result.enrichmentErrorCode,
      confidence: result.confidence 
    }));
    
    // Calculate next retry if failed — non-retryable errors MUST NOT schedule
    let nextRetryAt: string | null = null;
    const isRetryableError = !result.enrichmentWasSuccessful &&
      attemptNumber < MAX_ATTEMPTS &&
      !NO_RETRY_ERROR_CODES.includes(result.enrichmentErrorCode);
    
    if (isRetryableError) {
      const backoffMs = RETRY_BACKOFF_MS[attemptNumber - 1] || RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
    } else if (!result.enrichmentWasSuccessful && NO_RETRY_ERROR_CODES.includes(result.enrichmentErrorCode)) {
      console.log('[enrich.async.retry.skip]', JSON.stringify({
        userId: input.userId,
        errorCode: result.enrichmentErrorCode,
        status: result.enrichmentStatus,
        reason: 'non-retryable'
      }));
    }
    
    // Update user with result - use terminal status
    const terminalStatus = result.enrichmentWasSuccessful ? 'complete' : 
                          result.enrichmentErrorCode === 'timeout' ? 'timeout' : 'failed';
    
    const updatedMeta: EnrichmentMeta = {
      status: terminalStatus as any,
      errorCode: result.enrichmentErrorCode,
      lastUpdated: new Date().toISOString(),
      attempts: attemptNumber,
      nextRetryAt,
      confidence: result.confidence
    };
    
    console.log('[enrich.step] db.updating', JSON.stringify({ userId: input.userId, status: terminalStatus, errorCode: result.enrichmentErrorCode }));
    await storage.updateUserProfile(input.userId, {
      aiProfile: {
        ...result.aiProfile,
        enrichmentMeta: updatedMeta,
        enrichmentStatus: result.enrichmentStatus
      },
      profileEnriched: result.enrichmentWasSuccessful,
      lastEnrichmentDate: result.enrichmentWasSuccessful ? new Date() : user.lastEnrichmentDate
    });
    
    console.log('[enrich.async.end]', JSON.stringify({
      userId: input.userId,
      status: terminalStatus,
      success: result.enrichmentWasSuccessful,
      errorCode: result.enrichmentErrorCode,
      attempt: attemptNumber,
      durationMs: Date.now() - startTime
    }));
    
    // Schedule retry ONLY if retryable
    if (nextRetryAt && isRetryableError) {
      const backoffMs = RETRY_BACKOFF_MS[attemptNumber - 1] || RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      console.log('[enrich.async.retry]', JSON.stringify({
        userId: input.userId,
        delaySeconds: backoffMs / 1000,
        attempt: attemptNumber,
        errorCode: result.enrichmentErrorCode
      }));
      
      setTimeout(() => {
        runEnrichmentJobAsync(input).catch(err => {
          console.error('[enrich.async.retry.error]', err);
        });
      }, backoffMs);
    }
    
  } catch (error: any) {
    // CRITICAL: Catch ALL errors and update DB with failed status
    console.error('[enrich.async.crash]', JSON.stringify({
      userId: input.userId,
      error: (error?.message || 'Unknown error').substring(0, 200),
      stack: (error?.stack || '').substring(0, 300),
      attempt: attemptNumber,
      durationMs: Date.now() - startTime
    }));
    
    // Try to update DB with failed status
    try {
      const fallbackProfile = buildFallbackProfile(input, 'unknown');
      await storage.updateUserProfile(input.userId, {
        aiProfile: {
          ...fallbackProfile,
          enrichmentMeta: {
            status: 'failed',
            errorCode: 'unknown',
            lastUpdated: new Date().toISOString(),
            attempts: attemptNumber,
            nextRetryAt: null,
            confidence: 'low'
          }
        },
        profileEnriched: false
      });
      console.log('[enrich.async.crash.recovered] DB updated with failed status');
    } catch (dbError: any) {
      console.error('[enrich.async.crash.db_fail]', dbError?.message);
    }
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
    lastName: user.lastName || '',
    email: user.email || undefined
  };
  
  // Trigger async
  triggerEnrichmentAsync(input);
  
  return { success: true, message: 'Enrichment job started' };
}
