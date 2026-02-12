/**
 * 🔥 GEMINI ENRICHMENT MODULE
 * Company intelligence enrichment via Google Gemini API
 * Uses @google/genai SDK with Structured Output (JSON Schema)
 * Tools: urlContext (default) + optional googleSearch
 * 
 * NO OpenAI dependency. Zero.
 */

import { GoogleGenAI } from "@google/genai";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_MODEL = "gemini-2.5-pro-preview-06-05";
const TIMEOUT_MS = 45_000; // 45s hard timeout
const MAX_OUTPUT_TOKENS = 4096;

// ============================================================================
// JSON SCHEMA for Structured Output
// ============================================================================

const ENRICHMENT_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    companyDescription: { type: "string" as const },
    foundedYear: { type: "string" as const },
    ceoName: { type: "string" as const },
    employeeCount: { type: "string" as const },
    headquarters: { type: "string" as const },
    products: { type: "array" as const, items: { type: "string" as const } },
    services: { type: "array" as const, items: { type: "string" as const } },
    targetAudience: { type: "string" as const },
    targetAudienceSegments: { type: "array" as const, items: { type: "string" as const } },
    decisionMakers: { type: "array" as const, items: { type: "string" as const } },
    competitors: { type: "array" as const, items: { type: "string" as const } },
    uniqueSellingPoints: { type: "array" as const, items: { type: "string" as const } },
    brandVoice: { type: "string" as const },
    callAngles: { type: "array" as const, items: { type: "string" as const } },
    objectionHandling: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          objection: { type: "string" as const },
          response: { type: "string" as const }
        },
        required: ["objection", "response"]
      }
    },
    bestCallTimes: { type: "string" as const },
    effectiveKeywords: { type: "array" as const, items: { type: "string" as const } },
    opportunities: { type: "array" as const, items: { type: "string" as const } },
    marketPosition: { type: "string" as const },
    recentNews: { type: "array" as const, items: { type: "string" as const } },
    confidence: { type: "number" as const }
  },
  required: [
    "companyDescription", "products", "services", "targetAudience",
    "brandVoice", "effectiveKeywords", "confidence"
  ]
};

// ============================================================================
// TYPES
// ============================================================================

export interface GeminiEnrichInput {
  company: string;
  industry: string;
  role: string;
  website: string | null;
  firstName: string;
  lastName: string;
  primaryGoal: string;
  language: string;
  email?: string;
}

export interface GeminiEnrichResult {
  success: boolean;
  data: any | null;
  sources: string[];
  confidence: number;
  error: string | null;
  durationMs: number;
  model: string;
  tokensUsed: number | null;
}

// ============================================================================
// CORE FUNCTION
// ============================================================================

export async function geminiEnrichProfile(input: GeminiEnrichInput): Promise<GeminiEnrichResult> {
  const startTime = Date.now();
  const model = process.env.GEMINI_ENRICH_MODEL || DEFAULT_MODEL;

  // 1. API Key check
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[enrich.gemini.error] No GOOGLE_GEMINI_API_KEY set');
    return {
      success: false, data: null, sources: [], confidence: 0,
      error: 'missing_gemini_key', durationMs: Date.now() - startTime,
      model, tokensUsed: null
    };
  }

  // 2. Normalize website URL
  let websiteUrl = input.website || null;
  if (websiteUrl && !websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
    websiteUrl = 'https://' + websiteUrl;
  }

  // 3. Build tools
  const tools: any[] = [{ urlContext: {} }];
  if (process.env.ENRICH_USE_GOOGLE_SEARCH === 'true') {
    tools.unshift({ googleSearch: {} });
  }

  // 4. Build prompt
  const prompt = buildEnrichPrompt(input, websiteUrl);

  console.log('[enrich.gemini.calling]', JSON.stringify({
    model,
    hasWebsite: !!websiteUrl,
    websiteUrl: websiteUrl || null,
    tools: tools.map((t: any) => Object.keys(t)[0]),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeoutMs: TIMEOUT_MS
  }));

  try {
    const ai = new GoogleGenAI({ apiKey });

    // 5. AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // 6. Call Gemini
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools,
        responseMimeType: "application/json",
        responseSchema: ENRICHMENT_JSON_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS
      }
    });

    clearTimeout(timeoutId);

    // 7. Parse response
    const rawText = response.text || '';
    const tokensUsed = (response as any)?.usageMetadata?.totalTokenCount ?? null;
    const durationMs = Date.now() - startTime;

    if (!rawText || rawText.length < 20) {
      console.error('[enrich.gemini.error] Empty or too short response', {
        textLength: rawText.length,
        durationMs
      });
      return {
        success: false, data: null, sources: [], confidence: 0,
        error: 'empty_response', durationMs, model, tokensUsed
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('[enrich.gemini.error] JSON parse failed', {
        error: parseErr.message,
        textPreview: rawText.substring(0, 200),
        durationMs
      });
      return {
        success: false, data: null, sources: [], confidence: 0,
        error: 'parse_failed', durationMs, model, tokensUsed
      };
    }

    // 8. Extract sources from grounding metadata if available
    const sources: string[] = [];
    try {
      const groundingMeta = (response as any)?.candidates?.[0]?.groundingMetadata;
      if (groundingMeta?.groundingChunks) {
        for (const chunk of groundingMeta.groundingChunks) {
          if (chunk?.web?.uri) sources.push(chunk.web.uri);
        }
      }
    } catch { /* ignore grounding extraction errors */ }

    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;

    console.log('[enrich.gemini.success]', JSON.stringify({
      model,
      durationMs,
      tokensUsed,
      confidence,
      sourcesCount: sources.length,
      hasCompanyDesc: !!parsed.companyDescription,
      productsCount: Array.isArray(parsed.products) ? parsed.products.length : 0,
      competitorsCount: Array.isArray(parsed.competitors) ? parsed.competitors.length : 0
    }));

    return {
      success: true,
      data: parsed,
      sources,
      confidence,
      error: null,
      durationMs,
      model,
      tokensUsed
    };

  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const msg = err?.message || String(err);
    
    let errorCode = 'unknown';
    if (msg.includes('aborted') || msg.includes('abort') || msg.includes('timeout')) {
      errorCode = 'timeout';
    } else if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      errorCode = 'quota';
    } else if (msg.includes('API key') || msg.includes('401') || msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
      errorCode = 'auth';
    } else if (msg.includes('not found') || msg.includes('404')) {
      errorCode = 'model_not_found';
    }

    console.error('[enrich.gemini.error]', JSON.stringify({
      errorCode,
      errorMessage: msg.substring(0, 300),
      model,
      durationMs
    }));

    return {
      success: false, data: null, sources: [], confidence: 0,
      error: errorCode, durationMs, model, tokensUsed: null
    };
  }
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildEnrichPrompt(input: GeminiEnrichInput, websiteUrl: string | null): string {
  const { company, industry, role, firstName, lastName, primaryGoal, language } = input;

  const websiteLine = websiteUrl
    ? `Website: ${websiteUrl} (BITTE diese URL über URL-Context analysieren!)`
    : `Website: Nicht angegeben (suche nach "${company}" online)`;

  return `Du bist ein Elite-Business-Intelligence-Agent für ARAS AI.

AUFGABE: Erstelle ein VOLLSTÄNDIGES Unternehmens- und Outbound-Profil.

📋 UNTERNEHMENSDATEN:
Unternehmen: ${company}
${websiteLine}
Branche: ${industry}
Kontaktperson: ${firstName} ${lastName} (${role})
Primäres Ziel: ${primaryGoal}
Sprache: ${language === 'de' ? 'Deutsch' : language === 'en' ? 'English' : language}

📊 ANALYSIERE FOLGENDES:

1. UNTERNEHMENS-DNA:
- Beschreibung (mindestens 300 Zeichen), Gründungsjahr, CEO/Geschäftsführer
- Mitarbeiterzahl, Standorte, Unternehmenskultur

2. PRODUKTE & SERVICES (je mindestens 5):
- Alle Produkte und Services mit kurzer Beschreibung

3. ZIELGRUPPEN:
- Primäre Zielgruppe (Branche, Größe, Entscheider)
- Zielgruppensegmente (mindestens 3)
- Pain Points und Kaufmotive

4. WETTBEWERB (mindestens 3 Konkurrenten):
- Direkte Wettbewerber, Marktposition, Differenzierung

5. OUTBOUND PLAYBOOK:
- 5+ Call-Angles (Gesprächseinstiege für Kaltakquise)
- 5+ Einwandbehandlungen (objection + response)
- Beste Kontaktzeiten
- Empfohlene Brand Voice / Tonalität

6. KEYWORDS (mindestens 10):
- Branchenspezifisch, produktbezogen, problemorientiert

7. CHANCEN & NEWS:
- Aktuelle Marktchancen
- Neueste Unternehmensnachrichten

WICHTIG:
- Nutze den URL-Context um die Website ${websiteUrl || company} zu analysieren
- confidence: Zahl zwischen 0 und 1 (1 = höchstes Vertrauen in die Datenqualität)
- Bei unbekannten Feldern: leerer String "" oder leeres Array []
- Alle Texte auf ${language === 'de' ? 'Deutsch' : language === 'en' ? 'Englisch' : language}`;
}
