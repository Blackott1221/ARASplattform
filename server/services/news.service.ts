/**
 * ============================================================================
 * ARAS NEWS SERVICE — Daily Industry News Digest
 * ============================================================================
 * Uses Google Gemini (@google/genai) with Google Search grounding to find
 * and curate real-time industry news. Same SDK pattern as gemini-enrich.ts.
 *
 * Click-to-load only (no auto-fetch) → saves API credits.
 * ============================================================================
 */

import { GoogleGenAI } from "@google/genai";
import { resolveGeminiModel } from "../lib/gemini-enrich";
import { logger } from "../logger";

// ============================================================================
// TYPES
// ============================================================================

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  date: string;
  scope: string;
  tags: string[];
  sentiment: "positive" | "neutral" | "negative";
  whyItMatters: string;
}

export interface NewsDigestResponse {
  industryLabel: string;
  scopes: string[];
  mode: "top" | "breaking";
  generatedAt: string;
  items: NewsItem[];
  sources: string[];
  cached: boolean;
  provider: string;
}

export interface NewsDigestRequest {
  userId: string;
  industry: string;
  company?: string;
  aiProfile?: any;
  mode: "top" | "breaking";
  scopes: string[];
}

// ============================================================================
// CACHE — in-memory, 15min TTL
// ============================================================================

interface CacheEntry { data: NewsDigestResponse; timestamp: number; }
const NEWS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function cacheKey(req: NewsDigestRequest): string {
  return `news:${req.userId}:${req.industry}:${req.mode}:${[...req.scopes].sort().join(",")}:${new Date().toISOString().slice(0, 10)}`;
}

function fromCache(key: string): NewsDigestResponse | null {
  const e = NEWS_CACHE.get(key);
  if (!e) return null;
  if (Date.now() - e.timestamp > CACHE_TTL_MS) { NEWS_CACHE.delete(key); return null; }
  return { ...e.data, cached: true };
}

function toCache(key: string, data: NewsDigestResponse): void {
  if (NEWS_CACHE.size > 150) {
    const old = Array.from(NEWS_CACHE.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp).slice(0, 40);
    old.forEach(([k]) => NEWS_CACHE.delete(k));
  }
  NEWS_CACHE.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// LABELS
// ============================================================================

const INDUSTRY_LABELS: Record<string, string> = {
  real_estate: "Immobilien", immobilien: "Immobilien",
  insurance: "Versicherungen", versicherung: "Versicherungen",
  finance: "Finanzen & Banking", technology: "Technologie & Software",
  healthcare: "Gesundheitswesen", consulting: "Unternehmensberatung",
  legal: "Recht & Kanzleien", marketing: "Marketing & Werbung",
  automotive: "Automobil & Mobilität", energy: "Energie & Nachhaltigkeit",
  retail: "Einzelhandel & E-Commerce", construction: "Bauwesen & Architektur",
  education: "Bildung & Weiterbildung", food: "Gastronomie & Lebensmittel",
  travel: "Tourismus & Reisen", logistics: "Logistik & Transport",
  manufacturing: "Produktion & Industrie", media: "Medien & Unterhaltung",
  b2b_services: "B2B Dienstleistungen", general: "Wirtschaft & Märkte",
  saas: "SaaS & Cloud", ai: "Künstliche Intelligenz",
};

const SCOPE_LABELS: Record<string, string> = {
  global: "International", AT: "Österreich", DE: "Deutschland", CH: "Schweiz",
  US: "USA", UK: "Großbritannien", FR: "Frankreich", IT: "Italien",
  ES: "Spanien", NL: "Niederlande", BE: "Belgien", LU: "Luxemburg",
};

function industryLabel(key: string): string {
  return INDUSTRY_LABELS[key.toLowerCase().replace(/[\s-]/g, "_")] || key;
}

// ============================================================================
// ROBUST JSON EXTRACTOR (handles markdown fences, mixed text, etc.)
// ============================================================================

function extractJSON(raw: string): any | null {
  // 1. Direct parse
  try { return JSON.parse(raw); } catch {}

  // 2. Strip markdown fences: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch {}
  }

  // 3. Find outermost { ... }
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(raw.slice(braceStart, braceEnd + 1)); } catch {}
  }

  // 4. Find outermost [ ... ] (if items returned as array directly)
  const bracketStart = raw.indexOf("[");
  const bracketEnd = raw.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    try { return { items: JSON.parse(raw.slice(bracketStart, bracketEnd + 1)) }; } catch {}
  }

  return null;
}

// ============================================================================
// PROMPT BUILDER — uses ALL user DB data
// ============================================================================

function buildPrompt(req: NewsDigestRequest): string {
  const label = industryLabel(req.industry);
  const scopes = req.scopes.map((s) => SCOPE_LABELS[s] || s).join(", ");
  const today = new Date().toISOString().slice(0, 10);

  const aiProfile = req.aiProfile || {};
  const companyDesc = aiProfile.companyDescription || "";
  const products = Array.isArray(aiProfile.products) ? aiProfile.products.join(", ") : "";
  const competitors = Array.isArray(aiProfile.competitors) ? aiProfile.competitors.join(", ") : "";

  const modeBlock =
    req.mode === "breaking"
      ? "MODUS: BREAKING — nur News der letzten 24h. Priorisiere: Regulierungsänderungen, Marktschocks, Übernahmen, Insolvenzen, politische Entscheidungen."
      : "MODUS: TOP — die wichtigsten Nachrichten der letzten 7 Tage. Priorisiere: Markttrends, große Deals, Analysen, Branchenberichte, strategische Entwicklungen.";

  return `Du bist ein Elite-Nachrichten-Kurator. Nutze Google Search um AKTUELLE, ECHTE Nachrichten zu finden.

DATUM HEUTE: ${today}
BRANCHE: ${label}
${req.company ? `UNTERNEHMEN: ${req.company}` : ""}
${companyDesc ? `BESCHREIBUNG: ${companyDesc.slice(0, 300)}` : ""}
${products ? `PRODUKTE/SERVICES: ${products.slice(0, 200)}` : ""}
${competitors ? `WETTBEWERBER: ${competitors.slice(0, 200)}` : ""}
REGIONEN: ${scopes}
${modeBlock}

AUFGABE: Finde die 5 wichtigsten News-Artikel zu dieser Branche.
Schwerpunkt: international relevant + DACH/EU wo möglich.

Für jeden Artikel liefere:
- "title": Originaltitel oder deutschsprachiger Titel
- "summary": 1-2 Sätze Zusammenfassung auf Deutsch
- "source": Name der Quelle (z.B. "Handelsblatt", "Reuters", "Der Standard")
- "url": Link zum Originalartikel
- "date": Erscheinungsdatum als "YYYY-MM-DD"
- "scope": einer von: ${req.scopes.map((s) => `"${s}"`).join(", ")}
- "tags": 2-3 Schlagworte (z.B. "markt", "regulierung", "zinsen")
- "sentiment": "positive", "neutral", oder "negative"
- "whyItMatters": 1 Satz warum das für die Branche relevant ist

Antworte STRIKT als JSON-Objekt:
{
  "items": [
    { "title": "...", "summary": "...", "source": "...", "url": "...", "date": "YYYY-MM-DD", "scope": "...", "tags": [...], "sentiment": "...", "whyItMatters": "..." }
  ]
}

REGELN:
- NUR echte, existierende Artikel. KEINE Erfindungen.
- Jeder Scope sollte mindestens 1 Artikel haben (wenn möglich).
- Keine Duplikate.
- Antworte NUR mit JSON. Kein Markdown, keine Erklärungen.`;
}

// ============================================================================
// CORE: Generate News Digest
// ============================================================================

export async function generateNewsDigest(
  req: NewsDigestRequest
): Promise<NewsDigestResponse> {
  const key = cacheKey(req);
  const cached = fromCache(key);
  if (cached) {
    logger.info("[NEWS] Cache hit", { userId: req.userId, mode: req.mode });
    return cached;
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn("[NEWS] No Gemini API key");
    return fallback(req, "Kein AI-Service konfiguriert.");
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = await resolveGeminiModel(apiKey);
    const prompt = buildPrompt(req);

    console.log("[NEWS] Calling Gemini", JSON.stringify({ model, mode: req.mode, scopes: req.scopes, industry: req.industry }));

    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("TimeoutError: 55s")), 55_000)),
    ]);

    // Extract text — handle different response shapes
    let rawText = "";
    try {
      rawText = response.text || "";
    } catch {
      // Some models return text via candidates
      try {
        const parts = (response as any)?.candidates?.[0]?.content?.parts || [];
        rawText = parts.map((p: any) => p.text || "").join("");
      } catch { /* empty */ }
    }

    // Extract grounding sources
    const groundingSources: string[] = [];
    try {
      const gm = (response as any)?.candidates?.[0]?.groundingMetadata;
      if (gm?.groundingChunks) {
        for (const chunk of gm.groundingChunks) {
          if (chunk?.web?.uri) groundingSources.push(chunk.web.uri);
        }
      }
    } catch { /* ignore */ }

    const durationMs = Date.now() - startTime;
    console.log("[NEWS] Raw response", JSON.stringify({
      textLength: rawText.length,
      preview: rawText.slice(0, 300),
      groundingSourceCount: groundingSources.length,
      durationMs,
    }));

    if (!rawText || rawText.length < 10) {
      logger.warn("[NEWS] Empty Gemini response", { durationMs });
      return fallback(req, "Leere AI-Antwort.");
    }

    // Parse JSON robustly
    const parsed = extractJSON(rawText);
    if (!parsed) {
      logger.warn("[NEWS] JSON extraction failed", { preview: rawText.slice(0, 400), durationMs });
      return fallback(req, "JSON-Parsing fehlgeschlagen.");
    }

    // Normalize items — handle both {items:[...]} and direct array
    const rawItems = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];

    console.log("[NEWS] Parsed items count:", rawItems.length);

    const items: NewsItem[] = rawItems.slice(0, 10).map((item: any, idx: number) => ({
      id: `news-${req.mode}-${Date.now()}-${idx}`,
      title: String(item.title || "Unbekannter Titel"),
      summary: String(item.summary || item.summaryDe || ""),
      source: String(item.source || item.sourceName || "Unbekannt"),
      url: String(item.url || item.sourceUrl || "#"),
      date: String(item.date || item.publishedAt || today()),
      scope: req.scopes.includes(item.scope) ? item.scope : req.scopes[0] || "global",
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 4) : [],
      sentiment: ["positive", "neutral", "negative"].includes(item.sentiment) ? item.sentiment : "neutral",
      whyItMatters: String(item.whyItMatters || item.why_it_matters || ""),
    }));

    const result: NewsDigestResponse = {
      industryLabel: industryLabel(req.industry),
      scopes: req.scopes,
      mode: req.mode,
      generatedAt: new Date().toISOString(),
      items,
      sources: groundingSources,
      cached: false,
      provider: `gemini (${model})`,
    };

    logger.info("[NEWS] Digest OK", { userId: req.userId, mode: req.mode, itemCount: items.length, durationMs });
    toCache(key, result);
    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    logger.error("[NEWS] Gemini error", { error: (error?.message || "").slice(0, 300), durationMs });
    return fallback(req, error?.message || "Unbekannter Fehler.");
  }
}

function today(): string { return new Date().toISOString().slice(0, 10); }

function fallback(req: NewsDigestRequest, reason: string): NewsDigestResponse {
  return {
    industryLabel: industryLabel(req.industry),
    scopes: req.scopes,
    mode: req.mode,
    generatedAt: new Date().toISOString(),
    items: [],
    sources: [],
    cached: false,
    provider: `fallback (${reason})`,
  };
}

// ============================================================================
// SCOPE MAPPING
// ============================================================================

export function deriveDefaultScopes(user: any): string[] {
  const scopes: string[] = ["global"];
  const hq = String(user?.aiProfile?.headquarters || "").toLowerCase();

  if (hq.includes("österreich") || hq.includes("austria") || hq.includes("wien")) scopes.push("AT");
  if (hq.includes("deutschland") || hq.includes("germany") || hq.includes("berlin") || hq.includes("münchen") || hq.includes("frankfurt")) scopes.push("DE");
  if (hq.includes("schweiz") || hq.includes("switzerland") || hq.includes("zürich")) scopes.push("CH");

  if (scopes.length === 1) scopes.push("AT", "DE", "CH");
  return scopes.slice(0, 4);
}
