/**
 * ============================================================================
 * SPACE — Daily Industry News (Premium Card)
 * ============================================================================
 * Fetches /api/news/daily with mode (top/breaking) + scope toggles.
 * Matches existing ARAS Space card design language exactly.
 * ============================================================================
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  RefreshCw,
  ExternalLink,
  Globe,
  Zap,
  TrendingUp,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

// ============================================================================
// TYPES
// ============================================================================

interface NewsItem {
  id: string;
  title: string;
  summaryDe: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  scope: string;
  tags: string[];
}

interface NewsDigestResponse {
  industryKey: string;
  language: "de";
  scopes: string[];
  mode: "top" | "breaking";
  generatedAt: string;
  items: NewsItem[];
  cached: boolean;
  provider: string;
}

interface ScopesResponse {
  scopes: string[];
  industry: string;
}

type NewsMode = "top" | "breaking";

// ============================================================================
// CONSTANTS
// ============================================================================

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  AT: "AT",
  DE: "DE",
  CH: "CH",
  US: "US",
  UK: "UK",
  FR: "FR",
  IT: "IT",
  ES: "ES",
  NL: "NL",
  BE: "BE",
  LU: "LU",
};

const SCOPE_FULL_LABELS: Record<string, string> = {
  global: "International",
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
  US: "USA",
  UK: "Großbritannien",
  FR: "Frankreich",
  IT: "Italien",
  ES: "Spanien",
  NL: "Niederlande",
};

const INDUSTRY_LABELS: Record<string, string> = {
  real_estate: "Immobilien",
  immobilien: "Immobilien",
  insurance: "Versicherungen",
  versicherung: "Versicherungen",
  finance: "Finanzen",
  technology: "Technologie",
  healthcare: "Gesundheit",
  consulting: "Beratung",
  legal: "Recht",
  marketing: "Marketing",
  automotive: "Automobil",
  energy: "Energie",
  retail: "Handel",
  construction: "Bauwesen",
  education: "Bildung",
  general: "Wirtschaft",
};

function getIndustryLabel(key: string): string {
  const normalized = key.toLowerCase().replace(/[\s-]/g, "_");
  return INDUSTRY_LABELS[normalized] || key;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SpaceDailyNews() {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 30 });
  const [isHovered, setIsHovered] = useState(false);
  const [sheenTriggered, setSheenTriggered] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [mode, setMode] = useState<NewsMode>("top");
  const [activeScopes, setActiveScopes] = useState<Set<string>>(new Set(["global"]));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch default scopes from user profile
  const { data: scopesData } = useQuery<ScopesResponse>({
    queryKey: ["/api/news/scopes"],
    queryFn: async () => {
      const res = await fetch("/api/news/scopes", { credentials: "include" });
      if (!res.ok) return { scopes: ["global", "AT", "DE", "CH"], industry: "general" };
      return res.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Set initial active scopes from profile
  useEffect(() => {
    if (scopesData?.scopes) {
      setActiveScopes(new Set(scopesData.scopes));
    }
  }, [scopesData]);

  const availableScopes = useMemo(() => {
    return scopesData?.scopes || ["global", "AT", "DE", "CH"];
  }, [scopesData]);

  const industryKey = scopesData?.industry || (user as any)?.industry || "general";

  // Build scopes query string
  const scopesQuery = useMemo(() => {
    const arr = Array.from(activeScopes);
    return arr.length > 0 ? arr.join(",") : "global";
  }, [activeScopes]);

  // Fetch news
  const {
    data: newsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<NewsDigestResponse>({
    queryKey: ["/api/news/daily", mode, scopesQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/news/daily?mode=${mode}&scopes=${scopesQuery}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any)?.error || "News fetch failed");
      }
      return res.json();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/news/daily"] });
    await refetch();
    setIsRefreshing(false);
  }, [queryClient, refetch]);

  const toggleScope = useCallback((scope: string) => {
    setActiveScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        // Don't allow removing all scopes
        if (next.size > 1) next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  }, []);

  // Mouse handlers (matching existing card pattern)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosition({ x, y });
    },
    [prefersReducedMotion]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (!prefersReducedMotion) {
      setSheenTriggered(true);
      setTimeout(() => setSheenTriggered(false), 650);
    }
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!prefersReducedMotion) {
      setMousePosition({ x: 50, y: 30 });
    }
  }, [prefersReducedMotion]);

  // Format date
  const formatPublishedDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return "Heute";
      if (isYesterday(d)) return "Gestern";
      return format(d, "d. MMM", { locale: de });
    } catch {
      return dateStr;
    }
  };

  // Generated at label
  const generatedAtLabel = useMemo(() => {
    if (!newsData?.generatedAt) return "";
    try {
      const d = parseISO(newsData.generatedAt);
      return `Stand: ${format(d, "HH:mm", { locale: de })}`;
    } catch {
      return "";
    }
  }, [newsData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.25, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="w-full"
      style={{
        maxWidth: "1120px",
        marginTop: "14px",
        paddingLeft: "12px",
        paddingRight: "12px",
      }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative rounded-[18px] overflow-hidden"
        style={{
          padding: "18px 18px 16px 18px",
          background: `
            linear-gradient(135deg, rgba(254,145,0,0.08), rgba(233,215,196,0.04) 45%, rgba(0,0,0,0) 100%),
            rgba(15,15,15,0.62)
          `,
          border:
            isHovered && !prefersReducedMotion
              ? "1px solid rgba(254,145,0,0.26)"
              : "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            isHovered && !prefersReducedMotion
              ? "0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06), 0 0 28px rgba(254,145,0,0.10)"
              : "0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
          transition: prefersReducedMotion
            ? "border-color 120ms, background 120ms"
            : "border-color 160ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 160ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        {/* Pointer-follow Glow */}
        {!prefersReducedMotion && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-220"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(240px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(254,145,0,0.14), transparent 55%)`,
            }}
          />
        )}

        {/* Sheen sweep */}
        {!prefersReducedMotion && (
          <div
            className="absolute inset-[-2px] pointer-events-none overflow-hidden rounded-[18px]"
            style={{ zIndex: 10 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.10) 35%, transparent 70%)",
                transform: sheenTriggered
                  ? "translateX(120%)"
                  : "translateX(-120%)",
                transition: sheenTriggered
                  ? "transform 650ms cubic-bezier(0.2,0.8,0.2,1)"
                  : "none",
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-20 flex flex-col gap-3">
          {/* ===== TOP ROW: Icon + Title + Actions ===== */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left: Icon + Title */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="flex items-center justify-center shrink-0 rounded-[14px]"
                style={{
                  width: "44px",
                  height: "44px",
                  border: "1px solid rgba(233,215,196,0.14)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <Newspaper
                  className="w-[20px] h-[20px]"
                  style={{
                    color: "#FE9100",
                    filter: "drop-shadow(0 0 14px rgba(254,145,0,0.20))",
                  }}
                />
              </div>

              <div className="min-w-0">
                <h3
                  className="font-semibold leading-[1.15] mb-1"
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "rgba(233,215,196,0.95)",
                  }}
                >
                  Daily Industry News
                </h3>
                <p
                  className="leading-[1.45]"
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.62)",
                    maxWidth: "58ch",
                  }}
                >
                  Tagesaktuell für:{" "}
                  <span style={{ color: "rgba(254,145,0,0.85)", fontWeight: 600 }}>
                    {getIndustryLabel(industryKey)}
                  </span>
                  {" "}— kuratiert von ARAS AI
                </p>
              </div>
            </div>

            {/* Right: Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              aria-label="News aktualisieren"
              className="shrink-0 flex items-center gap-2 rounded-full self-start sm:self-center outline-none"
              style={{
                height: "32px",
                padding: "0 14px",
                background: isRefreshing
                  ? "rgba(254,145,0,0.22)"
                  : "rgba(254,145,0,0.12)",
                border: "1px solid rgba(254,145,0,0.25)",
                transition: "background 160ms, border-color 160ms",
                cursor: isRefreshing ? "wait" : "pointer",
                opacity: isRefreshing ? 0.7 : 1,
              }}
            >
              {isRefreshing ? (
                <Loader2
                  className="w-3.5 h-3.5 animate-spin"
                  style={{ color: "rgba(255,255,255,0.88)" }}
                />
              ) : (
                <RefreshCw
                  className="w-3.5 h-3.5"
                  style={{ color: "rgba(255,255,255,0.88)" }}
                />
              )}
              <span
                className="font-semibold whitespace-nowrap"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {isRefreshing ? "Lädt…" : "Aktualisieren"}
              </span>
            </button>
          </div>

          {/* ===== FILTER ROW: Mode + Scope chips ===== */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="toolbar"
            aria-label="News-Filter"
          >
            {/* Mode chips */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode("top")}
                aria-pressed={mode === "top"}
                className="flex items-center gap-1 transition-all duration-150"
                style={{
                  height: "28px",
                  padding: "0 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background:
                    mode === "top"
                      ? "rgba(254,145,0,0.18)"
                      : "rgba(255,255,255,0.03)",
                  border:
                    mode === "top"
                      ? "1px solid rgba(254,145,0,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                  color:
                    mode === "top"
                      ? "#FE9100"
                      : "rgba(255,255,255,0.50)",
                }}
              >
                <TrendingUp className="w-3 h-3" />
                Top
              </button>
              <button
                onClick={() => setMode("breaking")}
                aria-pressed={mode === "breaking"}
                className="flex items-center gap-1 transition-all duration-150"
                style={{
                  height: "28px",
                  padding: "0 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background:
                    mode === "breaking"
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(255,255,255,0.03)",
                  border:
                    mode === "breaking"
                      ? "1px solid rgba(239,68,68,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                  color:
                    mode === "breaking"
                      ? "#ef4444"
                      : "rgba(255,255,255,0.50)",
                }}
              >
                <Zap className="w-3 h-3" />
                Breaking
              </button>
            </div>

            {/* Separator */}
            <div
              style={{
                width: "1px",
                height: "16px",
                background: "rgba(255,255,255,0.10)",
              }}
            />

            {/* Scope chips */}
            {availableScopes.map((scope) => {
              const isOn = activeScopes.has(scope);
              return (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  aria-pressed={isOn}
                  className="flex items-center gap-1 transition-all duration-150"
                  title={SCOPE_FULL_LABELS[scope] || scope}
                  style={{
                    height: "28px",
                    padding: "0 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: isOn
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.02)",
                    border: isOn
                      ? "1px solid rgba(255,255,255,0.20)"
                      : "1px solid rgba(255,255,255,0.06)",
                    color: isOn
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.40)",
                  }}
                >
                  {scope === "global" && <Globe className="w-3 h-3" />}
                  {SCOPE_LABELS[scope] || scope}
                </button>
              );
            })}

            {/* Generated at */}
            {generatedAtLabel && (
              <span
                className="ml-auto text-[10px] flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                <Clock className="w-3 h-3" />
                {generatedAtLabel}
                {newsData?.cached && " (Cache)"}
              </span>
            )}
          </div>

          {/* ===== NEWS ITEMS ===== */}
          <div
            className="flex flex-col gap-0 rounded-[14px] overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(233,215,196,0.10)",
            }}
          >
            <AnimatePresence mode="wait">
              {/* Loading state */}
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="px-4 py-3"
                      style={{
                        borderBottom:
                          i < 2
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                      }}
                    >
                      <div
                        className="rounded-md mb-2"
                        style={{
                          width: `${65 + i * 10}%`,
                          height: "14px",
                          background:
                            "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
                          backgroundSize: "200% 100%",
                          animation: prefersReducedMotion
                            ? "none"
                            : "skeletonPulse 1.5s ease-in-out infinite",
                        }}
                      />
                      <div
                        className="rounded-md"
                        style={{
                          width: `${85 - i * 12}%`,
                          height: "10px",
                          background:
                            "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
                          backgroundSize: "200% 100%",
                          animation: prefersReducedMotion
                            ? "none"
                            : "skeletonPulse 1.5s ease-in-out infinite",
                          animationDelay: "0.2s",
                        }}
                      />
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Error state */}
              {!isLoading && isError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 px-4 py-4"
                >
                  <AlertCircle
                    className="w-5 h-5 shrink-0"
                    style={{ color: "rgba(239,68,68,0.65)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-medium mb-0.5"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      News konnten nicht geladen werden.
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "rgba(255,255,255,0.40)" }}
                    >
                      {(error as any)?.message || "Bitte versuchen Sie es später erneut."}
                    </p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg"
                    style={{
                      background: "rgba(254,145,0,0.10)",
                      border: "1px solid rgba(254,145,0,0.20)",
                      color: "#FE9100",
                    }}
                  >
                    Erneut versuchen
                  </button>
                </motion.div>
              )}

              {/* Empty state */}
              {!isLoading && !isError && newsData && newsData.items.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-6 px-4 text-center"
                >
                  <Newspaper
                    className="w-8 h-8 mb-2"
                    style={{ color: "rgba(255,255,255,0.12)" }}
                  />
                  <p
                    className="text-[13px] font-medium mb-1"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    Heute keine passenden News gefunden.
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Versuchen Sie weitere Scopes zu aktivieren oder wechseln Sie den Modus.
                  </p>
                </motion.div>
              )}

              {/* News items */}
              {!isLoading && !isError && newsData && newsData.items.length > 0 && (
                <motion.div
                  key={`${mode}-${scopesQuery}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                >
                  {newsData.items.map((item, idx) => (
                    <a
                      key={item.id}
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/item flex gap-3 px-4 py-3 transition-colors outline-none"
                      style={{
                        borderBottom:
                          idx < newsData.items.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(254,145,0,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background =
                          "rgba(254,145,0,0.04)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Left: Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p
                          className="font-medium leading-[1.35] mb-1"
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.88)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.title}
                        </p>

                        {/* Summary */}
                        <p
                          className="leading-[1.45] mb-1.5"
                          style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.50)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.summaryDe}
                        </p>

                        {/* Meta: Source + Date + Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: "rgba(254,145,0,0.70)" }}
                          >
                            {item.sourceName}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: "rgba(255,255,255,0.25)" }}
                          >
                            ·
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: "rgba(255,255,255,0.40)" }}
                          >
                            {formatPublishedDate(item.publishedAt)}
                          </span>

                          {/* Scope badge */}
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.55)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            {SCOPE_LABELS[item.scope] || item.scope}
                          </span>

                          {/* Breaking badge */}
                          {mode === "breaking" && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                              style={{
                                background: "rgba(239,68,68,0.12)",
                                color: "rgba(239,68,68,0.80)",
                                border: "1px solid rgba(239,68,68,0.20)",
                              }}
                            >
                              Breaking
                            </span>
                          )}

                          {/* Tags */}
                          {item.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{
                                background: "rgba(254,145,0,0.06)",
                                color: "rgba(254,145,0,0.55)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: External link icon */}
                      <div className="shrink-0 pt-1">
                        <ExternalLink
                          className="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        />
                      </div>
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Focus Ring + Skeleton Animation */}
        <style>{`
          .group:focus-within {
            outline: none;
            box-shadow: 0 0 0 2px rgba(254,145,0,0.55), 0 0 0 5px rgba(0,0,0,0.65) !important;
          }
          @keyframes skeletonPulse {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    </motion.div>
  );
}
