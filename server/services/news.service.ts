/**
 * ============================================================================
 * ARAS NEWS SERVICE — Daily Industry News Digest
 * ============================================================================
 * Uses Google Gemini with Google Search grounding to find and curate
 * real-time industry news for each user based on their DB profile.
 *
 * - mode: "top" (curated best) | "breaking" (fast-moving, high impact)
 * - scopes: "global" + country codes (AT, DE, CH, US, …)
 * - Caching: in-memory per userId+mode+scopes, 30min TTL
 * - All summaries in German (UI language)
 * ============================================================================
 */

import { GoogleGenAI } from "@google/genai";
import { logger } from "../logger";

// ============================================================================
// TYPES
// ============================================================================

export interface NewsItem {
  id: string;
  title: string;
  summaryDe: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  scope: string;
  tags: string[];
}

export interface NewsDigestResponse {
  industryKey: string;
  language: "de";
  scopes: string[];
  mode: "top" | "breaking";
  generatedAt: string;
  items: NewsItem[];
  cached: boolean;
  provider: string;
}

export interface NewsDigestRequest {
  userId: string;
  industry: string;
  company?: string;
  mode: "top" | "breaking";
  scopes: string[];
  language?: string;
}

// ============================================================================
// CACHE — in-memory, 30min TTL
// ============================================================================

interface CacheEntry {
  data: NewsDigestResponse;
  timestamp: number;
}

const NEWS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(req: NewsDigestRequest): string {
  const scopesSorted = [...req.scopes].sort().join(",");
  const today = new Date().toISOString().slice(0, 10);
  return `news:${req.userId}:${req.industry}:${req.mode}:${scopesSorted}:${today}`;
}

function getFromCache(key: string): NewsDigestResponse | null {
  const entry = NEWS_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    NEWS_CACHE.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

function setCache(key: string, data: NewsDigestResponse): void {
  // Evict old entries (keep max 200)
  if (NEWS_CACHE.size > 200) {
    const oldest = Array.from(NEWS_CACHE.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 50);
    oldest.forEach(([k]) => NEWS_CACHE.delete(k));
  }
  NEWS_CACHE.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// INDUSTRY LABELS (German, for prompt context)
// ============================================================================

const INDUSTRY_LABELS: Record<string, string> = {
  real_estate: "Immobilien & Immobilienmakler",
  immobilien: "Immobilien & Immobilienmakler",
  insurance: "Versicherungen & Finanzdienstleistungen",
  versicherung: "Versicherungen & Finanzdienstleistungen",
  finance: "Finanzen & Banking",
  technology: "Technologie & Software",
  healthcare: "Gesundheitswesen & Medizin",
  consulting: "Unternehmensberatung",
  legal: "Recht & Kanzleien",
  marketing: "Marketing & Werbung",
  automotive: "Automobil & Mobilität",
  energy: "Energie & Nachhaltigkeit",
  retail: "Einzelhandel & E-Commerce",
  construction: "Bauwesen & Architektur",
  education: "Bildung & Weiterbildung",
  food: "Gastronomie & Lebensmittel",
  travel: "Tourismus & Reisen",
  logistics: "Logistik & Transport",
  manufacturing: "Produktion & Industrie",
  media: "Medien & Unterhaltung",
};

function getIndustryLabel(industry: string): string {
  const key = industry.toLowerCase().replace(/[\s-]/g, "_");
  return INDUSTRY_LABELS[key] || industry;
}

// ============================================================================
// SCOPE LABELS
// ============================================================================

const SCOPE_LABELS: Record<string, string> = {
  global: "International / Weltweit",
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
  US: "USA",
  UK: "Großbritannien",
  FR: "Frankreich",
  IT: "Italien",
  ES: "Spanien",
  NL: "Niederlande",
  BE: "Belgien",
  LU: "Luxemburg",
};

// ============================================================================
// JSON SCHEMA for structured output
// ============================================================================

const NEWS_DIGEST_SCHEMA = {
  type: "object" as const,
  properties: {
    items: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          summaryDe: { type: "string" as const },
          sourceName: { type: "string" as const },
          sourceUrl: { type: "string" as const },
          publishedAt: { type: "string" as const },
          scope: { type: "string" as const },
          tags: { type: "array" as const, items: { type: "string" as const } },
        },
        required: ["title", "summaryDe", "sourceName", "sourceUrl", "publishedAt", "scope", "tags"],
      },
    },
  },
  required: ["items"],
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildNewsPrompt(req: NewsDigestRequest): string {
  const industryLabel = getIndustryLabel(req.industry);
  const scopeList = req.scopes
    .map((s) => SCOPE_LABELS[s] || s)
    .join(", ");
  const modeInstruction =
    req.mode === "breaking"
      ? `MODUS: BREAKING NEWS — Priorisiere schnelllebige, hochrelevante Nachrichten der letzten 24 Stunden.
Suche nach: Regulierungsänderungen, Marktschocks, Übernahmen, Insolvenzen, politische Entscheidungen, bedeutende Deals.`
      : `MODUS: TOP NEWS — Priorisiere die wichtigsten und meistdiskutierten Nachrichten der letzten 48 Stunden.
Suche nach: Markttrends, große Deals, Analysen, Branchenberichte, strategische Entwicklungen.`;

  const today = new Date().toISOString().slice(0, 10);

  return `Du bist ein Elite-Nachrichten-Kurator für die ARAS AI Plattform.

AUFGABE: Finde und kuratiere die ${req.mode === "breaking" ? "BREAKING" : "TOP"} Industrie-News für heute (${today}).

BRANCHE: ${industryLabel}
${req.company ? `UNTERNEHMEN DES USERS: ${req.company}` : ""}
GEOGRAFISCHE SCHWERPUNKTE: ${scopeList}

${modeInstruction}

REGELN:
1. Nutze Google Search um AKTUELLE Nachrichten zu finden (letzten 24-48h).
2. Liefere genau 5 Nachrichten-Items (nicht mehr, nicht weniger).
3. Jedes Item MUSS eine echte, existierende Nachricht sein — KEINE Erfindungen.
4. summaryDe: 1-2 Sätze auf Deutsch, neutral, sachlich, nicht reißerisch.
5. sourceName: Name der Quelle (z.B. "Handelsblatt", "Der Standard", "Reuters").
6. sourceUrl: Die tatsächliche URL des Artikels. Wenn keine URL verfügbar, verwende die Startseite der Quelle.
7. publishedAt: Datum im Format YYYY-MM-DD (oder YYYY-MM-DDTHH:mm wenn bekannt).
8. scope: Genau EINER der folgenden Werte: ${req.scopes.map((s) => `"${s}"`).join(", ")}
   - Weise jedem Artikel den passendsten Scope zu.
   - Stelle sicher, dass mindestens 1 Artikel pro aktivem Scope dabei ist (wenn möglich).
9. tags: 2-4 relevante Schlagworte pro Artikel (z.B. "markt", "regulierung", "zinsen", "investition").
10. Deduplizierung: Keine zwei Items über dasselbe Ereignis.

WICHTIG: Antworte NUR mit dem JSON-Objekt. Keine Erklärungen, kein Markdown.`;
}

// ============================================================================
// CORE: Generate News Digest via Gemini + Google Search
// ============================================================================

export async function generateNewsDigest(
  req: NewsDigestRequest
): Promise<NewsDigestResponse> {
  // 1. Check cache
  const cacheKey = getCacheKey(req);
  const cached = getFromCache(cacheKey);
  if (cached) {
    logger.info("[NEWS] Cache hit", { userId: req.userId, mode: req.mode });
    return cached;
  }

  // 2. Check API key
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn("[NEWS] No Gemini API key configured");
    return buildFallbackResponse(req, "Kein AI-Service konfiguriert.");
  }

  // 3. Call Gemini with Google Search grounding
  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildNewsPrompt(req);
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: NEWS_DIGEST_SCHEMA,
          temperature: 0.4,
          maxOutputTokens: 4096,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("TimeoutError: News digest exceeded 45s")),
          45_000
        )
      ),
    ]);

    const rawText = response.text || "";
    const durationMs = Date.now() - startTime;

    if (!rawText || rawText.length < 20) {
      logger.warn("[NEWS] Empty Gemini response", { durationMs });
      return buildFallbackResponse(req, "Leere AI-Antwort.");
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from potential markdown fences
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          logger.warn("[NEWS] JSON parse failed", {
            durationMs,
            preview: rawText.slice(0, 200),
          });
          return buildFallbackResponse(req, "JSON-Parsing fehlgeschlagen.");
        }
      } else {
        return buildFallbackResponse(req, "Kein JSON in Antwort.");
      }
    }

    // Validate and transform items
    const items: NewsItem[] = (parsed.items || [])
      .slice(0, 5)
      .map((item: any, idx: number) => ({
        id: `news-${req.mode}-${Date.now()}-${idx}`,
        title: String(item.title || "Unbekannter Titel"),
        summaryDe: String(item.summaryDe || "Keine Zusammenfassung verfügbar."),
        sourceName: String(item.sourceName || "Unbekannte Quelle"),
        sourceUrl: String(item.sourceUrl || "#"),
        publishedAt: String(item.publishedAt || new Date().toISOString().slice(0, 10)),
        scope: req.scopes.includes(item.scope) ? item.scope : req.scopes[0] || "global",
        tags: Array.isArray(item.tags)
          ? item.tags.map(String).slice(0, 4)
          : [],
      }));

    const result: NewsDigestResponse = {
      industryKey: req.industry,
      language: "de",
      scopes: req.scopes,
      mode: req.mode,
      generatedAt: new Date().toISOString(),
      items,
      cached: false,
      provider: "gemini",
    };

    logger.info("[NEWS] Digest generated", {
      userId: req.userId,
      mode: req.mode,
      scopes: req.scopes,
      itemCount: items.length,
      durationMs,
    });

    // 4. Cache
    setCache(cacheKey, result);
    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    logger.error("[NEWS] Gemini error", {
      error: (error?.message || "").slice(0, 200),
      durationMs,
    });
    return buildFallbackResponse(req, error?.message || "Unbekannter Fehler.");
  }
}

// ============================================================================
// FALLBACK
// ============================================================================

function buildFallbackResponse(
  req: NewsDigestRequest,
  reason: string
): NewsDigestResponse {
  return {
    industryKey: req.industry,
    language: "de",
    scopes: req.scopes,
    mode: req.mode,
    generatedAt: new Date().toISOString(),
    items: [],
    cached: false,
    provider: `fallback (${reason})`,
  };
}

// ============================================================================
// SCOPE MAPPING: derive default scopes from user profile
// ============================================================================

export function deriveDefaultScopes(user: any): string[] {
  const scopes: string[] = ["global"];

  // Try aiProfile fields for country hints
  const aiProfile = user?.aiProfile || {};
  const company = user?.company || "";
  const industry = user?.industry || "";

  // Check headquarters field for country
  const hq = aiProfile?.headquarters || "";
  if (typeof hq === "string") {
    const hqLower = hq.toLowerCase();
    if (hqLower.includes("österreich") || hqLower.includes("austria") || hqLower.includes("wien") || hqLower.includes("vienna")) {
      if (!scopes.includes("AT")) scopes.push("AT");
    }
    if (hqLower.includes("deutschland") || hqLower.includes("germany") || hqLower.includes("berlin") || hqLower.includes("münchen") || hqLower.includes("frankfurt")) {
      if (!scopes.includes("DE")) scopes.push("DE");
    }
    if (hqLower.includes("schweiz") || hqLower.includes("switzerland") || hqLower.includes("zürich") || hqLower.includes("zurich")) {
      if (!scopes.includes("CH")) scopes.push("CH");
    }
  }

  // If we couldn't derive any countries, use DACH fallback
  if (scopes.length === 1) {
    scopes.push("AT", "DE", "CH");
  }

  // Limit to global + max 3 countries
  return scopes.slice(0, 4);
}
