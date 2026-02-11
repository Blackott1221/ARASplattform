import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Crown,
  Phone,
  Sparkles,
  Shield,
  ArrowDown,
  Check,
  Zap,
  Users,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

/* ─── Smooth animated number (rAF-based, no deps) ────────────────────── */
function useAnimatedNumber(target: number, duration = 520) {
  const [display, setDisplay] = useState(target);
  const raf = useRef(0);
  const prev = useRef(target);

  useEffect(() => {
    const from = prev.current;
    const delta = target - from;
    if (delta === 0) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setDisplay(target); prev.current = target; return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + delta * ease));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return display;
}

/* ─── Constants ────────────────────────────────────────────────────────── */
const STRIPE_LINK = "https://buy.stripe.com/cNi3cpbUL4Tu6aO6x67Zu01";
const TOTAL_PASSES = 500;

/* ─── Intersection-Observer reveal hook ────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ─── Section wrapper with reveal ──────────────────────────────────────── */
function RevealSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <section
      ref={ref}
      id={id}
      className={`transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
      style={{
        transitionDuration: "280ms",
      }}
    >
      {children}
    </section>
  );
}

/* ─── Glass Card ───────────────────────────────────────────────────────── */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] md:rounded-[24px] border border-[rgba(233,215,196,0.12)] bg-[rgba(255,255,255,0.03)] backdrop-blur-[12px] shadow-[0_18px_70px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out hover:border-[rgba(254,145,0,0.22)] hover:-translate-y-[2px] hover:shadow-[0_22px_80px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Animated Gold Gradient Text ──────────────────────────────────────── */
function GoldGradientText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent founding-gold-gradient ${className}`}
      style={{
        backgroundSize: "200% 100%",
        animation: "foundingGoldWave 5s ease-in-out infinite",
      }}
    >
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function FoundingMemberPass() {
  const [, setLocation] = useLocation();
  const [lastUpdate, setLastUpdate] = useState(0);

  // Live stats from API — poll every 15s + on focus/visibility
  const { data: stats, dataUpdatedAt, refetch } = useQuery<{ cap: number; pending: number; activated: number; total: number }>({
    queryKey: ["/api/public/founding/stats"],
    refetchInterval: 15000,
    staleTime: 8000,
  });

  // Track seconds since last update
  useEffect(() => {
    if (dataUpdatedAt) setLastUpdate(dataUpdatedAt);
  }, [dataUpdatedAt]);

  // Refetch on visibility/focus
  useEffect(() => {
    const handler = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", () => refetch());
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", () => refetch());
    };
  }, [refetch]);

  // Seconds ago ticker
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (!lastUpdate) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdate) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  // Animated numbers
  const available = useAnimatedNumber(stats ? stats.cap - stats.total : 0);
  const reserved = useAnimatedNumber(stats?.total ?? 0);

  const handleCTA = useCallback(() => {
    window.location.href = STRIPE_LINK;
  }, []);

  const scrollToDetails = useCallback(() => {
    document.getElementById("was-du-bekommst")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  return (
    <>
      {/* Scoped styles */}
      <style>{`
        @keyframes foundingGoldWave {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .founding-gold-gradient {
          background-image: linear-gradient(
            90deg,
            var(--aras-gold-light) 0%,
            var(--aras-orange) 30%,
            var(--aras-gold-dark) 55%,
            var(--aras-gold-light) 100%
          );
        }
        @keyframes foundingPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          .founding-gold-gradient {
            animation: none !important;
          }
          .founding-reveal {
            opacity: 1 !important;
            transform: none !important;
          }
          .founding-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--aras-orange)]"
      >
        Zum Inhalt springen
      </a>

      <main
        id="main-content"
        className="relative min-h-screen w-full overflow-x-hidden"
        style={{ background: "var(--aras-bg)" }}
      >
        {/* ═══ HERO ═══ */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 md:px-6 lg:px-8 pt-16 md:pt-24 pb-12 md:pb-16">
          <div className="max-w-[1120px] w-full mx-auto">
            {/* Kicker */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.85, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-orbitron uppercase text-[12px] tracking-[0.22em] mb-6"
              style={{ color: "var(--aras-gold-light)" }}
            >
              THE COMMUNITY BRIDGE ROUND
            </motion.p>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-orbitron font-bold text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] leading-tight mb-4"
            >
              <GoldGradientText>
                Founding Member Pass — PRO dauerhaft.
              </GoldGradientText>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl font-inter mb-3"
              style={{ color: "var(--aras-text)" }}
            >
              500 Anrufe pro Monat inklusive. 499 CHF einmalig.
            </motion.p>

            {/* Subcopy */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-sm md:text-base mb-5"
              style={{ color: "var(--aras-muted)" }}
            >
              Einmal zahlen. Jeden Monat 500 Calls inklusive. Keine monatliche Abo-Gebühr.
            </motion.p>

            {/* Trust Chips */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32 }}
              className="flex flex-wrap items-center justify-center gap-2 mb-8"
            >
              {[
                { icon: Users, text: "500+ Alpha-User" },
                { icon: Zap, text: "Bis zu 10.000 Calls parallel" },
                { icon: Clock, text: "Low latency (typ. < 1s)" },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] md:text-[12px] font-inter font-medium"
                  style={{
                    background: "rgba(254,145,0,0.07)",
                    border: "1px solid rgba(254,145,0,0.18)",
                    color: "var(--aras-gold-light)",
                  }}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color: "var(--aras-orange)" }} />
                  {text}
                </span>
              ))}
            </motion.div>

            {/* ═══ LIVE SCARCITY CARD ═══ */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.35 }}
                className="relative max-w-md mx-auto mb-8 rounded-[24px] overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(233,215,196,0.14)",
                  boxShadow: "0 18px 70px rgba(0,0,0,0.55)",
                }}
              >
                {/* Inner highlight */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at 15% 0%, rgba(254,145,0,0.12) 0%, transparent 55%)",
                  }}
                />
                <div className="relative p-[14px] md:p-[20px]">
                  {/* LIVE Pill + Last update */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-inter font-bold uppercase tracking-wide" style={{ background: "rgba(254,145,0,0.1)", color: "var(--aras-orange)" }}>
                      <span
                        className="founding-pulse inline-block w-[7px] h-[7px] rounded-full"
                        style={{
                          background: "var(--aras-orange)",
                          animation: "foundingPulse 1.6s ease-in-out infinite",
                        }}
                      />
                      LIVE
                    </span>
                    {lastUpdate > 0 && (
                      <span className="text-[11.5px] font-inter" style={{ color: "var(--aras-soft)", opacity: 0.55 }}>
                        Update: vor {secondsAgo < 60 ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}m`}
                      </span>
                    )}
                  </div>

                  {/* Headline number */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-[11.5px] font-inter" style={{ color: "var(--aras-muted)" }}>
                      Noch verfügbar:
                    </span>
                    <span
                      className="font-orbitron font-bold text-[28px] md:text-[34px] leading-none founding-gold-gradient bg-clip-text text-transparent"
                      style={{ backgroundSize: "200% 100%", animation: "foundingGoldWave 5s ease-in-out infinite" }}
                    >
                      {available}
                    </span>
                    <span className="text-[12px] font-inter" style={{ color: "var(--aras-soft)" }}>/ {stats.cap}</span>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className="w-full rounded-[999px] h-[8px] md:h-[10px] overflow-hidden mb-3"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-[999px]"
                      style={{
                        width: `${Math.min((reserved / (stats?.cap || 1)) * 100, 100)}%`,
                        background: "linear-gradient(90deg, var(--aras-gold-light), var(--aras-orange), var(--aras-gold-dark))",
                        boxShadow: "0 0 18px rgba(254,145,0,0.18)",
                        transition: "width 520ms cubic-bezier(.16,1,.3,1)",
                      }}
                    />
                  </div>

                  {/* Subline */}
                  <p className="text-[12px] md:text-[12.5px] leading-relaxed" style={{ color: "var(--aras-muted)", opacity: 0.72 }}>
                    Limitiert auf {stats.cap} Founding Member Pässe. Aktivierung nach Zahlung manuell per E-Mail.
                  </p>
                </div>
              </motion.div>
            )}

            {/* CTA Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
            >
              <button
                onClick={handleCTA}
                className="aras-btn--primary rounded-full px-8 py-3.5 font-inter font-semibold text-base transition-all duration-300 cursor-pointer"
                aria-label="Pass sichern für 499 CHF — weiter zu Stripe Checkout"
              >
                Pass sichern (499 CHF)
                <ChevronRight className="inline-block w-4 h-4 ml-1 -mt-0.5" />
              </button>

              <button
                onClick={scrollToDetails}
                className="aras-btn--secondary rounded-full px-6 py-3 font-inter text-sm border border-[rgba(233,215,196,0.15)] hover:border-[rgba(254,145,0,0.3)] transition-all duration-300"
                style={{ color: "var(--aras-muted)" }}
              >
                Details ansehen
                <ArrowDown className="inline-block w-3.5 h-3.5 ml-1.5 -mt-0.5" />
              </button>
            </motion.div>

            {/* Micro note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-[12px] md:text-[13px]"
              style={{ color: "var(--aras-soft)" }}
            >
              Nach Zahlung ordnen wir den Pass deinem ARAS-Account zu (manuell).
            </motion.p>

            {/* Secondary CTA: Already paid */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-4"
            >
              <a
                href="/founding/success"
                className="text-[13px] font-inter underline-offset-4 hover:underline transition-opacity opacity-[0.7] hover:opacity-100"
                style={{ color: "var(--aras-gold-light)" }}
              >
                Schon bezahlt? Account zuordnen →
              </a>
            </motion.p>
          </div>
        </section>

        {/* ═══ WAS DU BEKOMMST ═══ */}
        <RevealSection
          id="was-du-bekommst"
          className="px-4 md:px-6 lg:px-8 py-11 md:py-16"
        >
          <div className="max-w-[1120px] mx-auto">
            <h2
              className="font-orbitron font-bold text-2xl md:text-3xl mb-10 text-center"
              style={{ color: "var(--aras-text)" }}
            >
              Was du bekommst
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: Crown,
                  title: "PRO dauerhaft",
                  text: "Du bekommst den PRO-Zugang dauerhaft — ohne monatliche Abo-Gebühren.",
                },
                {
                  icon: Phone,
                  title: "500 Anrufe pro Monat inklusive",
                  text: "Jeden Monat sind 500 Anrufe enthalten. Für viele Teams reicht das bereits für spürbare Outbound-Ergebnisse.",
                },
                {
                  icon: Sparkles,
                  title: "Priorisierte Updates",
                  text: "Founding Member bekommen neue Outbound-Features früher und werden bei Feedback-Runden priorisiert.",
                },
                {
                  icon: Shield,
                  title: "Faire Regeln",
                  text: "Transparente Nutzung: du weißt immer, was inkludiert ist — ohne versteckte Überraschungen.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <GlassCard key={title} className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(254,145,0,0.1)] border border-[rgba(254,145,0,0.2)] flex items-center justify-center mb-4">
                    <Icon
                      className="w-5 h-5"
                      style={{ color: "var(--aras-orange)" }}
                    />
                  </div>
                  <h3
                    className="font-inter font-semibold text-base mb-2"
                    style={{ color: "var(--aras-text)" }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--aras-muted)" }}
                  >
                    {text}
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ═══ SO FUNKTIONIERT'S ═══ */}
        <RevealSection className="px-4 md:px-6 lg:px-8 py-11 md:py-16">
          <div className="max-w-[1120px] mx-auto">
            <h2
              className="font-orbitron font-bold text-2xl md:text-3xl mb-10 text-center"
              style={{ color: "var(--aras-text)" }}
            >
              So funktioniert's
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Pass kaufen",
                  text: "Stripe Checkout — sicher, schnell, verschlüsselt.",
                },
                {
                  step: "2",
                  title: "ARAS-Account zuordnen",
                  text: "Wir identifizieren dich über die Zahlungs-E-Mail. Bitte nutze dieselbe E-Mail wie im ARAS-Account.",
                },
                {
                  step: "3",
                  title: "Wir schalten PRO frei",
                  text: "Manuell — in der Regel innerhalb von 24 Stunden.",
                },
              ].map(({ step, title, text }) => (
                <GlassCard key={step} className="p-6 text-center">
                  <div
                    className="w-9 h-9 rounded-full border-2 border-[var(--aras-orange)] flex items-center justify-center mx-auto mb-4 font-orbitron font-bold text-sm"
                    style={{ color: "var(--aras-orange)" }}
                  >
                    {step}
                  </div>
                  <h3
                    className="font-inter font-semibold text-base mb-2"
                    style={{ color: "var(--aras-text)" }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--aras-muted)" }}
                  >
                    {text}
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ═══ FOMO STRIP ═══ */}
        <RevealSection className="px-4 md:px-6 lg:px-8 py-6">
          <div className="max-w-2xl mx-auto">
            <div
              className="flex items-center gap-3 rounded-[16px] px-5 py-3.5"
              style={{
                background: "rgba(254,145,0,0.06)",
                border: "1px solid rgba(254,145,0,0.18)",
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--aras-orange)" }} />
              <p className="text-[13px] md:text-sm font-inter" style={{ color: "var(--aras-gold-light)" }}>
                Diese Runde ist limitiert. Sobald {TOTAL_PASSES} vergeben sind, schließen wir.
              </p>
            </div>
          </div>
        </RevealSection>

        {/* ═══ WARUM JETZT ═══ */}
        <RevealSection className="px-4 md:px-6 lg:px-8 py-11 md:py-16">
          <div className="max-w-[1120px] mx-auto">
            <h2
              className="font-orbitron font-bold text-2xl md:text-3xl mb-8 text-center"
              style={{ color: "var(--aras-text)" }}
            >
              Warum jetzt?
            </h2>

            <GlassCard className="max-w-2xl mx-auto p-8">
              <ul className="space-y-5">
                {[
                  { icon: TrendingUp, text: "PRO dauerhaft sichern, bevor Preise auf Enterprise-Niveau steigen." },
                  { icon: Phone, text: "500 Calls/Monat inklusive — ideal zum Testen und Skalieren." },
                  { icon: Crown, text: "Du bist Teil der Founding Community und beeinflusst die Roadmap." },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[rgba(254,145,0,0.12)] border border-[rgba(254,145,0,0.25)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: "var(--aras-orange)" }} />
                    </div>
                    <span
                      className="text-sm md:text-base leading-relaxed"
                      style={{ color: "var(--aras-muted)" }}
                    >
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </RevealSection>

        {/* ═══ PROOF / STATS ═══ */}
        <RevealSection className="px-4 md:px-6 lg:px-8 py-11 md:py-16">
          <div className="max-w-[1120px] mx-auto">
            <h2
              className="font-orbitron font-bold text-2xl md:text-3xl mb-10 text-center"
              style={{ color: "var(--aras-text)" }}
            >
              Proof
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                {
                  icon: Users,
                  value: "500+",
                  label: "Alpha-User",
                },
                {
                  icon: Zap,
                  value: "10.000",
                  label: "Calls parallel möglich",
                },
                {
                  icon: Clock,
                  value: "< 1s",
                  label: "Latenz (typisch) / realtime voice",
                },
              ].map(({ icon: Icon, value, label }) => (
                <GlassCard key={label} className="p-6 text-center">
                  <Icon
                    className="w-6 h-6 mx-auto mb-3"
                    style={{ color: "var(--aras-orange)" }}
                  />
                  <p
                    className="font-orbitron font-bold text-2xl md:text-3xl mb-1"
                    style={{ color: "var(--aras-gold-light)" }}
                  >
                    {value}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--aras-muted)" }}
                  >
                    {label}
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ═══ FAQ ═══ */}
        <RevealSection className="px-4 md:px-6 lg:px-8 py-11 md:py-16">
          <div className="max-w-[1120px] mx-auto">
            <h2
              className="font-orbitron font-bold text-2xl md:text-3xl mb-10 text-center"
              style={{ color: "var(--aras-text)" }}
            >
              Häufige Fragen
            </h2>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-2">
                {[
                  {
                    q: "Wer kann kaufen?",
                    a: "Jeder. Du brauchst lediglich einen ARAS-Account. Falls du noch keinen hast, kannst du dich kostenlos registrieren.",
                  },
                  {
                    q: "Wie erfolgt die Aktivierung?",
                    a: "Manuell — nach Zahlung ordnen wir den Pass anhand deiner E-Mail / Login deinem Account zu. In der Regel innerhalb von 24 Stunden.",
                  },
                  {
                    q: "Was heißt 500 Calls/Monat?",
                    a: "Jeden Monat sind 500 Anrufe inklusive. Zusätzliche Kapazität kannst du bei Bedarf jederzeit ergänzen.",
                  },
                  {
                    q: "Gilt PRO wirklich dauerhaft?",
                    a: "Ja. Solange ARAS als Produkt betrieben wird, bleibt dein PRO-Zugang bestehen.",
                  },
                  {
                    q: "Kann ich den Pass übertragen?",
                    a: "Nein, der Pass ist an deinen ARAS-Account gebunden.",
                  },
                ].map(({ q, a }, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border-b border-[rgba(233,215,196,0.1)]"
                  >
                    <AccordionTrigger
                      className="text-left text-sm md:text-base font-inter font-medium py-4 hover:no-underline"
                      style={{ color: "var(--aras-text)" }}
                    >
                      {q}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--aras-muted)" }}
                      >
                        {a}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </RevealSection>

        {/* ═══ BOTTOM CTA ═══ */}
        <RevealSection className="px-4 md:px-6 lg:px-8 py-11 md:py-16">
          <div className="max-w-[1120px] mx-auto text-center">
            <h2
              className="font-orbitron font-bold text-xl md:text-2xl mb-3"
              style={{ color: "var(--aras-text)" }}
            >
              Bereit?
            </h2>
            {stats && (
              <p className="text-sm mb-6 font-inter" style={{ color: "var(--aras-muted)" }}>
                Noch <span className="font-semibold" style={{ color: "var(--aras-gold-light)" }}>{stats.cap - stats.total}</span> von {stats.cap} Pässen verfügbar.
              </p>
            )}
            <button
              onClick={handleCTA}
              className="aras-btn--primary rounded-full px-8 py-3.5 font-inter font-semibold text-base transition-all duration-300 cursor-pointer"
              aria-label="Pass sichern für 499 CHF — weiter zu Stripe Checkout"
            >
              Pass sichern (499 CHF)
              <ChevronRight className="inline-block w-4 h-4 ml-1 -mt-0.5" />
            </button>
            <p className="text-xs mt-4" style={{ color: "var(--aras-soft)" }}>
              <a
                href="/founding/success"
                className="hover:underline underline-offset-4 transition-opacity opacity-[0.7] hover:opacity-100"
                style={{ color: "var(--aras-gold-light)" }}
              >
                Schon bezahlt? Account zuordnen →
              </a>
            </p>
          </div>
        </RevealSection>

        {/* ═══ FOOTER ═══ */}
        <footer className="px-4 md:px-6 lg:px-8 py-8 md:py-12 border-t border-[rgba(233,215,196,0.08)]">
          <div className="max-w-[1120px] mx-auto text-center">
            <p
              className="text-xs md:text-[13px] leading-relaxed max-w-xl mx-auto"
              style={{ color: "var(--aras-soft)" }}
            >
              ARAS AI ist eine Outbound-Telefonie-Plattform. Ergebnisse hängen
              von Zielgruppe, Datenqualität und Kampagnenaufbau ab.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <a
                href="/terms"
                className="text-xs hover:underline transition-colors"
                style={{ color: "var(--aras-soft)" }}
              >
                AGB
              </a>
              <span style={{ color: "var(--aras-soft)" }}>·</span>
              <a
                href="/privacy"
                className="text-xs hover:underline transition-colors"
                style={{ color: "var(--aras-soft)" }}
              >
                Datenschutz
              </a>
            </div>
          </div>
        </footer>

        {/* ═══ MOBILE STICKY CTA BAR ═══ */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 border-t border-[rgba(233,215,196,0.10)] sm:hidden"
          style={{
            height: "64px",
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {stats && (
            <span className="text-[11px] font-inter font-medium whitespace-nowrap" style={{ color: "var(--aras-gold-light)" }}>
              {stats.cap - stats.total} verfügbar
            </span>
          )}
          <button
            onClick={handleCTA}
            className="aras-btn--primary rounded-full px-5 py-2.5 font-inter font-semibold text-sm flex-1 max-w-[200px] transition-all duration-200 cursor-pointer"
            aria-label="Pass sichern"
          >
            Pass sichern
          </button>
        </div>

        {/* Bottom spacer for sticky bar on mobile */}
        <div className="h-16 sm:hidden" aria-hidden="true" />
      </main>
    </>
  );
}
