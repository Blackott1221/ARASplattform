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
  Check,
  Zap,
  Users,
  Clock,
  ChevronRight,
  Lock,
} from "lucide-react";

/* ─── Smooth animated number (rAF-based, no deps) ────────────────────── */
function useAnimatedNumber(target: number, duration = 600) {
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
      className={`transition-all ease-[cubic-bezier(.16,1,.3,1)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      } ${className}`}
      style={{
        transitionDuration: "420ms",
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
      className={`rounded-[24px] border border-[rgba(233,215,196,0.12)] bg-[rgba(255,255,255,0.015)] backdrop-blur-[12px] shadow-[0_18px_70px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out hover:border-[rgba(254,145,0,0.22)] hover:-translate-y-[2px] hover:shadow-[0_22px_80px_rgba(0,0,0,0.6)] ${className}`}
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

  const { data: stats, dataUpdatedAt, refetch } = useQuery<{ cap: number; pending: number; activated: number; total: number }>({
    queryKey: ["/api/public/founding/stats"],
    refetchInterval: 15000,
    staleTime: 8000,
  });

  useEffect(() => { if (dataUpdatedAt) setLastUpdate(dataUpdatedAt); }, [dataUpdatedAt]);

  useEffect(() => {
    const handler = () => { if (document.visibilityState === "visible") refetch(); };
    const focusHandler = () => refetch();
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", focusHandler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", focusHandler);
    };
  }, [refetch]);

  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (!lastUpdate) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdate) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  const available = useAnimatedNumber(stats ? stats.cap - stats.total : 0);
  const reserved = useAnimatedNumber(stats?.total ?? 0);

  // Subtle parallax for hero background layers
  const [heroOffset, setHeroOffset] = useState(0);
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const onScroll = () => setHeroOffset(Math.min(window.scrollY * 0.15, 30));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCTA = useCallback(() => { window.location.href = STRIPE_LINK; }, []);

  return (
    <>
      <style>{`
        @keyframes foundingGoldWave {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .founding-gold-gradient {
          background-image: linear-gradient(90deg, var(--aras-gold-light) 0%, var(--aras-orange) 30%, var(--aras-gold-dark) 55%, var(--aras-gold-light) 100%);
        }
        @keyframes foundingPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .5; transform: scale(1.4); }
        }
        @keyframes foundingNoise {
          0%   { transform: translate(0,0); }
          20%  { transform: translate(-1.5%,-1.5%); }
          40%  { transform: translate(1.5%,1%); }
          60%  { transform: translate(-1%,1.5%); }
          80%  { transform: translate(1%,-1%); }
          100% { transform: translate(0,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .founding-gold-gradient { animation: none !important; }
          .founding-pulse { animation: none !important; }
          .founding-noise-inner { animation: none !important; }
          .founding-reveal { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--aras-orange)]"
      >
        Zum Inhalt springen
      </a>

      <main id="main-content" className="relative w-full overflow-x-hidden" style={{ background: "var(--aras-bg)" }}>

        {/* ═══ HERO ═══ */}
        <section
          className="relative flex flex-col items-center justify-center text-center px-5 md:px-8"
          style={{ minHeight: "min(100vh, 980px)" }}
        >
          {/* BG Layer 1+2: Radial gradients with parallax */}
          <div
            className="absolute inset-0 pointer-events-none will-change-transform"
            style={{
              background: `
                radial-gradient(1200px circle at 20% 10%, rgba(254,145,0,.18), transparent 60%),
                radial-gradient(900px circle at 85% 20%, rgba(233,215,196,.10), transparent 65%)
              `,
              transform: `translateY(${heroOffset}px) translateZ(0)`,
            }}
          />

          {/* BG Layer 3: Animated noise overlay (CSS only, 3% opacity) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.03 }}>
            <div
              className="founding-noise-inner absolute -inset-1/2 w-[200%] h-[200%]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: "256px 256px",
                animation: "foundingNoise 8s steps(5) infinite",
              }}
            />
          </div>

          {/* BG Layer 4: Grid horizon */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(233,215,196,.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(233,215,196,.05) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
              maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.12) 50%, transparent 85%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.12) 50%, transparent 85%)",
            }}
          />

          {/* Hero Content */}
          <div className="relative z-10 max-w-[1180px] w-full mx-auto">

            {/* H1 — Orbitron Dominance */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [.16, 1, .3, 1] }}
              className="font-orbitron font-bold leading-[1.02] mb-6"
              style={{ fontSize: "clamp(3.2rem, 8vw, 6.8rem)" }}
            >
              <span className="block" style={{ color: "var(--aras-text)" }}>
                Founding Member
              </span>
              <GoldGradientText>PRO. Für immer.</GoldGradientText>
            </motion.h1>

            {/* Subline */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [.16, 1, .3, 1] }}
              className="font-inter text-base md:text-lg lg:text-xl max-w-[640px] mx-auto mb-4 leading-relaxed"
              style={{ color: "var(--aras-text)", opacity: 0.78 }}
            >
              Einmal zahlen. Jeden Monat 500 Calls inklusive.
              <br className="hidden sm:block" />
              Kein Abo. Keine versteckten Kosten.
              <br className="hidden sm:block" />
              Sichere dir PRO dauerhaft — bevor wir auf Enterprise-Preise umstellen.
            </motion.p>

            {/* Microline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[12px] font-inter mb-10"
              style={{ color: "var(--aras-soft)" }}
            >
              Limitierte Founding Runde. Nach {TOTAL_PASSES} vergebenen Pässen schließen wir.
            </motion.p>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: [.16, 1, .3, 1] }}
              className="mb-10"
            >
              <button
                onClick={handleCTA}
                className="aras-btn--primary h-[54px] px-8 rounded-full font-inter font-semibold text-base cursor-pointer transition-all duration-300 hover:-translate-y-[2px] active:translate-y-0"
                style={{ minWidth: "280px" }}
                aria-label="Pass sichern für 499 CHF — weiter zu Stripe Checkout"
              >
                Pass sichern (499 CHF)
                <ChevronRight className="inline-block w-4 h-4 ml-1.5 -mt-0.5" />
              </button>
              <p className="text-[12px] mt-3 font-inter" style={{ color: "var(--aras-soft)" }}>
                Sichere Bezahlung via Stripe.
              </p>
            </motion.div>

            {/* ═══ LIVE SCARCITY MODULE ═══ */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.35, ease: [.16, 1, .3, 1] }}
                className="relative max-w-md mx-auto rounded-[28px] overflow-hidden"
                style={{
                  background: "rgba(255,255,255,.02)",
                  border: "1px solid rgba(233,215,196,.16)",
                  boxShadow: "0 30px 120px rgba(0,0,0,.65)",
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 15% 0%, rgba(254,145,0,.10) 0%, transparent 55%)" }}
                />
                <div className="relative p-[18px] md:p-[22px]">

                  {/* LIVE Indicator */}
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="founding-pulse inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: "var(--aras-orange)", animation: "foundingPulse 1.6s ease-in-out infinite" }}
                    />
                    <span
                      className="text-[10.5px] font-inter font-bold uppercase"
                      style={{ color: "var(--aras-orange)", letterSpacing: ".28em" }}
                    >
                      LIVE VERFÜGBARKEIT
                    </span>
                  </div>

                  {/* Counter */}
                  <div className="mb-4">
                    <p className="text-[11px] font-inter uppercase tracking-wider mb-1" style={{ color: "var(--aras-muted)" }}>
                      Noch verfügbar
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-orbitron font-bold text-[36px] md:text-[48px] leading-none founding-gold-gradient bg-clip-text text-transparent"
                        style={{ backgroundSize: "200% 100%", animation: "foundingGoldWave 5s ease-in-out infinite" }}
                      >
                        {available}
                      </span>
                      <span className="text-[13px] font-inter" style={{ color: "var(--aras-soft)" }}>/ {stats.cap}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className="w-full rounded-[999px] h-[8px] md:h-[12px] overflow-hidden mb-3"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-[999px]"
                      style={{
                        width: `${Math.min((reserved / (stats?.cap || 1)) * 100, 100)}%`,
                        background: "linear-gradient(90deg, var(--aras-gold-light), var(--aras-orange), var(--aras-gold-dark))",
                        boxShadow: "0 0 24px rgba(254,145,0,.28)",
                        transition: "width 520ms cubic-bezier(.16,1,.3,1)",
                      }}
                    />
                  </div>

                  {/* Micro */}
                  <p className="text-[11px] font-inter" style={{ color: "var(--aras-soft)", opacity: 0.6 }}>
                    Automatisch aktualisiert
                  </p>
                </div>
              </motion.div>
            )}

          </div>
        </section>

        {/* ═══ WARUM DIESER PASS EXISTIERT ═══ */}
        <RevealSection className="px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Statement */}
            <div>
              <h2
                className="font-orbitron font-bold text-[28px] md:text-[42px] leading-[1.1] mb-6"
                style={{ color: "var(--aras-text)" }}
              >
                Wir belohnen die,{" "}
                <span className="relative inline">
                  die früh an ARAS glauben.
                  <span
                    className="absolute bottom-0 left-0 w-full h-[3px] rounded-full"
                    style={{
                      background: "linear-gradient(90deg, var(--aras-gold-light), var(--aras-orange), var(--aras-gold-dark))",
                    }}
                  />
                </span>
              </h2>
              <p
                className="text-sm md:text-base leading-relaxed max-w-md"
                style={{ color: "var(--aras-muted)" }}
              >
                Der Founding Member Pass ist unser Dankeschön an die Community, die ARAS von Tag eins begleitet. Du sicherst dir PRO zu Konditionen, die es nach dieser Runde nicht mehr geben wird.
              </p>
            </div>

            {/* Right: 3 glass feature cards */}
            <div className="space-y-4">
              {[
                { icon: Crown, title: "PRO dauerhaft", text: "Kein monatliches Abo. Dein PRO-Zugang bleibt — solange ARAS existiert." },
                { icon: Phone, title: "500 Calls / Monat", text: "Jeden Monat 500 Anrufe inklusive. Mehr als genug für den Start." },
                { icon: Lock, title: "Preis bleibt für dich fix", text: "499 CHF einmalig. Egal, wie sich unsere Enterprise-Preise entwickeln." },
              ].map(({ icon: Icon, title, text }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.26, delay: i * 0.08, ease: [.16, 1, .3, 1] }}
                >
                  <GlassCard className="p-5 md:p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(254,145,0,0.08)] border border-[rgba(254,145,0,0.18)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" style={{ color: "var(--aras-orange)" }} />
                    </div>
                    <div>
                      <h3 className="font-inter font-semibold text-[15px] mb-1" style={{ color: "var(--aras-text)" }}>{title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--aras-muted)" }}>{text}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

          </div>
        </RevealSection>

        {/* ═══ HEUTE FOUNDING. MORGEN ENTERPRISE. ═══ */}
        <RevealSection className="px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-[1180px] mx-auto text-center">
            <h2
              className="font-orbitron font-bold text-[26px] md:text-[38px] leading-[1.1] mb-4"
              style={{ color: "var(--aras-text)" }}
            >
              Dieser Preis wird nicht zurückkommen.
            </h2>
            <p
              className="font-inter text-sm md:text-base max-w-[600px] mx-auto mb-14 leading-relaxed"
              style={{ color: "var(--aras-muted)" }}
            >
              Mit dem Founding Pass sicherst du dir den Zugang, bevor ARAS in die Enterprise-Phase übergeht.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                { icon: Users, value: "500+", label: "Alpha-User" },
                { icon: Zap, value: "10.000", label: "Parallele Calls möglich" },
                { icon: Clock, value: "< 1s", label: "Optimierte Low-Latency" },
              ].map(({ icon: Icon, value, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.26, delay: i * 0.08, ease: [.16, 1, .3, 1] }}
                >
                  <GlassCard className="p-[22px] text-center">
                    <Icon className="w-6 h-6 mx-auto mb-3" style={{ color: "var(--aras-orange)" }} />
                    <p className="font-orbitron font-bold text-2xl md:text-3xl mb-1" style={{ color: "var(--aras-gold-light)" }}>
                      {value}
                    </p>
                    <p className="text-sm" style={{ color: "var(--aras-muted)" }}>{label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ═══ ENTSCHEIDUNG IN 30 SEKUNDEN ═══ */}
        <RevealSection className="px-5 md:px-8 py-20 md:py-28">
          <div
            className="max-w-[780px] mx-auto rounded-[32px] px-6 md:px-12 py-12 md:py-16 text-center"
            style={{
              background: "rgba(255,255,255,.015)",
              border: "1px solid rgba(233,215,196,.10)",
              boxShadow: "0 30px 100px rgba(0,0,0,.5)",
            }}
          >
            <h2
              className="font-orbitron font-bold text-[24px] md:text-[32px] leading-[1.1] mb-8"
              style={{ color: "var(--aras-text)" }}
            >
              Entscheidung in 30 Sekunden.
            </h2>

            <ul className="space-y-4 text-left max-w-sm mx-auto mb-10">
              {[
                "Kein Abo",
                "500 Calls jeden Monat",
                "Preis für immer gesichert",
                "Aktivierung manuell nach Zahlung",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[rgba(254,145,0,0.12)] border border-[rgba(254,145,0,0.25)] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" style={{ color: "var(--aras-orange)" }} />
                  </div>
                  <span className="text-sm md:text-base font-inter" style={{ color: "var(--aras-text)" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleCTA}
              className="aras-btn--primary h-[54px] px-8 rounded-full font-inter font-semibold text-base cursor-pointer transition-all duration-300 hover:-translate-y-[2px] active:translate-y-0 w-full sm:w-auto"
              style={{ minWidth: "280px" }}
              aria-label="Pass sichern für 499 CHF"
            >
              Pass sichern (499 CHF)
              <ChevronRight className="inline-block w-4 h-4 ml-1.5 -mt-0.5" />
            </button>

            <p className="text-[12px] mt-4 font-inter" style={{ color: "var(--aras-soft)" }}>
              Sichere Bezahlung via Stripe.
            </p>

            <p className="mt-4">
              <a
                href="/founding/success"
                className="text-[12.5px] font-inter underline-offset-4 hover:underline transition-opacity opacity-60 hover:opacity-100"
                style={{ color: "var(--aras-gold-light)" }}
              >
                Schon bezahlt? Account zuordnen →
              </a>
            </p>
          </div>
        </RevealSection>

        {/* ═══ FAQ ═══ */}
        <RevealSection className="px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-[1180px] mx-auto">
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
                    a: "Manuell — nach Zahlung ordnen wir den Pass anhand deiner E-Mail deinem Account zu. In der Regel innerhalb von 24 Stunden.",
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
                    className="border-b border-[rgba(233,215,196,0.08)]"
                  >
                    <AccordionTrigger
                      className="text-left text-sm md:text-base font-inter font-medium py-5 hover:no-underline"
                      style={{ color: "var(--aras-text)" }}
                    >
                      {q}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm leading-relaxed pb-2" style={{ color: "var(--aras-muted)" }}>
                        {a}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </RevealSection>

        {/* ═══ FOOTER ═══ */}
        <footer className="px-5 md:px-8 py-10 md:py-14 border-t border-[rgba(233,215,196,0.06)]">
          <div className="max-w-[1180px] mx-auto text-center">
            <p
              className="text-xs md:text-[13px] leading-relaxed max-w-xl mx-auto"
              style={{ color: "var(--aras-soft)" }}
            >
              ARAS AI ist eine Outbound-Telefonie-Plattform. Ergebnisse hängen
              von Zielgruppe, Datenqualität und Kampagnenaufbau ab.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <a href="/terms" className="text-xs hover:underline transition-colors" style={{ color: "var(--aras-soft)" }}>
                AGB
              </a>
              <span style={{ color: "var(--aras-soft)" }}>·</span>
              <a href="/privacy" className="text-xs hover:underline transition-colors" style={{ color: "var(--aras-soft)" }}>
                Datenschutz
              </a>
            </div>
          </div>
        </footer>

        {/* ═══ MOBILE STICKY CTA BAR ═══ */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-5 border-t border-[rgba(233,215,196,0.08)] sm:hidden"
          style={{
            height: "68px",
            background: "rgba(0,0,0,0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {stats && (
            <div className="flex flex-col">
              <span className="text-[10px] font-inter uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>
                Verfügbar
              </span>
              <span className="text-[14px] font-orbitron font-bold" style={{ color: "var(--aras-gold-light)" }}>
                {stats.cap - stats.total}/{stats.cap}
              </span>
            </div>
          )}
          <button
            onClick={handleCTA}
            className="aras-btn--primary h-[44px] rounded-full px-6 font-inter font-semibold text-sm cursor-pointer transition-all duration-200"
            aria-label="Pass sichern"
          >
            Pass sichern (499 CHF)
          </button>
        </div>

        {/* Bottom spacer for sticky bar on mobile */}
        <div className="h-[68px] sm:hidden" aria-hidden="true" />
      </main>
    </>
  );
}
