import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Shield,
  Layers,
  ArrowRight,
  Target,
  Rocket,
  Building2,
  BarChart3,
  Cpu,
  Users,
  Globe,
  Lock,
  Zap,
  TrendingUp,
  Calendar,
  Mail,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Fly Ventures — Pitch Deck Landing Page
// Route: /vc/fly-ventures
// ---------------------------------------------------------------------------

const BRAND = {
  orange: "#FE9100",
  gold: "#e9d7c4",
  dark: "#0a0a0a",
  darkCard: "rgba(255,255,255,0.02)",
  border: "rgba(233,215,196,0.12)",
  borderHover: "rgba(254,145,0,0.25)",
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: BRAND.darkCard,
        border: `1px solid ${BRAND.border}`,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </div>
  );
}

const TEN_PS = [
  { label: "Position", icon: Target, text: "Build the most trusted enterprise voice stack in Europe; start with outbound (immediate ROI), expand to voice-first ops + orchestration." },
  { label: "People", icon: Users, text: "Justin Schwarzott (Founder/CEO) + senior execution for product/engineering; shipping-focused org; multi-year platform commitment." },
  { label: "Product", icon: Cpu, text: "Proprietary voice + workflow automation; human-grade conversations; enterprise deployment; compliance-by-design." },
  { label: "Price", icon: BarChart3, text: "Subscription + usage-based scaling + enterprise tiers; ROI anchored (cost per qualified lead / meeting)." },
  { label: "Place", icon: Globe, text: "DACH beachhead; regulated verticals early; expand EU after repeatable playbook." },
  { label: "Process", icon: Layers, text: "Onboard → ingest context → launch campaigns → optimize routing & scripts → measure outcomes." },
  { label: "Performance", icon: TrendingUp, text: "Track paid conversion, usage depth, escalation quality, meeting yield, pipeline impact." },
  { label: "Plan", icon: Calendar, text: "2026 DACH wedge → 2027 platform opening (SDK) → 2028 marketplace → 2029/30 category leadership." },
  { label: "Purpose", icon: Shield, text: "For orgs where qualification + routing decide revenue; for teams that need trust + compliance." },
  { label: "Potential", icon: Rocket, text: "Voice becomes a programmable enterprise layer; ARAS aims to own the infrastructure version of that market." },
];

const WHY_FLY = [
  {
    title: "Day-zero + hard technical problems",
    text: "ARAS is stack-first, not feature-first — LLM + voice + orchestration + compliance primitives. Exactly the \"hard problem\" profile Fly backs.",
    icon: Cpu,
  },
  {
    title: "Defensibility matters now",
    text: "Voice AI is commoditizing; the winners own infrastructure, distribution, and trust — not thin wrappers on third-party APIs.",
    icon: Shield,
  },
  {
    title: "Europe / DACH reality",
    text: "Swiss/EU-first processing, sovereignty posture, enterprise-readiness — built for regulated markets where compliance is non-negotiable.",
    icon: Lock,
  },
];

const TIMELINE = [
  { year: "2026", label: "DACH Leadership Wedge", desc: "Repeatable GTM motion, key enterprise logos, compliance certifications." },
  { year: "2027", label: "Platform Opening", desc: "SDK launch, partner channels, EU expansion begins." },
  { year: "2028", label: "Marketplace", desc: "Skills marketplace, third-party agent integrations, multi-vertical." },
  { year: "2029–30", label: "Category Leadership", desc: "European category leader in enterprise voice AI infrastructure." },
];

export default function FlyVenturesPage() {
  useEffect(() => {
    document.title = "ARAS AI × Fly Ventures — Swiss-built Voice AI Infrastructure";
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, ${BRAND.orange}22 0%, transparent 70%)`,
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ─── HERO ─── */}
        <section className="min-h-[90vh] flex items-center">
          <div className="max-w-6xl mx-auto px-6 py-24 w-full">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] tracking-[0.25em] uppercase font-bold"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  color: BRAND.gold,
                  background: "rgba(0,0,0,0.6)",
                  border: `1px solid ${BRAND.borderHover}`,
                  backdropFilter: "blur(20px)",
                }}
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: BRAND.orange }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                ARAS AI × Fly Ventures
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 max-w-4xl"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange}, #a34e00)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Swiss-built Voice AI Infrastructure
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg md:text-xl text-gray-300 max-w-3xl mb-6 leading-relaxed"
            >
              A fully proprietary voice AI platform for enterprise outbound and voice-first workflows:{" "}
              <span className="text-white font-semibold">own LLM, own real-time voice engine, own orchestration layer, Swiss-hosted</span>{" "}
              — built for DACH compliance, scale, and long-term defensibility.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-sm text-gray-400 mb-10 max-w-2xl"
            >
              Peter Cullom suggested we reach out to Fly Ventures — because Fly backs{" "}
              <span className="text-[#e9d7c4] font-semibold">technical founders solving hard problems early</span>, from{" "}
              <span className="text-[#e9d7c4] font-semibold">day-zero to seed</span>, across Europe.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-wrap gap-4"
            >
              <a
                href="mailto:ai@aras-ai.com?subject=Fly%20Ventures%20%E2%80%94%2020-min%20technical%20walkthrough"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] hover:shadow-lg"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)`,
                  color: "#fff",
                  boxShadow: `0 12px 40px ${BRAND.orange}33`,
                }}
              >
                Book a 20-min walkthrough
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#deck"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BRAND.border}`,
                  color: BRAND.gold,
                }}
              >
                Download pitch deck
                <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </section>

        {/* ─── WHY FLY FITS ARAS ─── */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight mb-4"
                style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}
              >
                Why Fly fits ARAS
              </h2>
              <p className="text-gray-400 mb-12 max-w-2xl">No fluff — concrete thesis alignment.</p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6">
              {WHY_FLY.map((item, i) => (
                <AnimatedSection key={item.title} delay={i * 0.15}>
                  <GlassCard className="p-6 h-full hover:border-[rgba(254,145,0,0.25)] transition-colors">
                    <item.icon className="w-8 h-8 mb-4" style={{ color: BRAND.orange }} />
                    <h3
                      className="text-lg font-bold mb-3 text-white"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{item.text}</p>
                  </GlassCard>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHAT ARAS IS ─── */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <GlassCard className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <h2
                      className="text-3xl font-black tracking-tight mb-6"
                      style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}
                    >
                      What ARAS is
                    </h2>
                    <p className="text-gray-300 leading-relaxed mb-4">
                      A proprietary <span className="text-white font-semibold">Voice + Workflow automation</span> platform
                      running on Swiss/EU infrastructure, designed for{" "}
                      <span className="text-white font-semibold">human-grade conversations</span>, real-time orchestration,
                      and enterprise deployment.
                    </p>
                    <p className="text-sm text-gray-500">
                      Open APIs/webhooks + CRM integrations today. SDK (2027) → Skills Marketplace (2028).
                    </p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Proprietary LLM", desc: "ARAS Core — trained for sales conversations" },
                      { label: "Real-time Voice Engine", desc: "Sub-200ms latency, human-grade prosody" },
                      { label: "Orchestration Layer", desc: "Qualification, routing, follow-ups, handoffs" },
                      { label: "Swiss/EU Hosting", desc: "GDPR-native, data sovereignty by design" },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-3 items-start"
                      >
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ background: BRAND.orange }}
                        />
                        <div>
                          <span className="text-white font-semibold text-sm">{item.label}</span>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── 10 BUSINESS Ps ─── */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight mb-4"
                style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}
              >
                10 Business Ps
              </h2>
              <p className="text-gray-400 mb-12">Investor-grade snapshot — Peter Cullom framework.</p>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 gap-4">
              {TEN_PS.map((p, i) => (
                <AnimatedSection key={p.label} delay={i * 0.08}>
                  <GlassCard className="p-5 h-full hover:border-[rgba(254,145,0,0.2)] transition-colors">
                    <div className="flex gap-4 items-start">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${BRAND.orange}15`, border: `1px solid ${BRAND.orange}30` }}
                      >
                        <p.icon className="w-5 h-5" style={{ color: BRAND.orange }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-bold tracking-wider uppercase"
                            style={{ color: BRAND.orange, fontFamily: "Orbitron, sans-serif" }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-sm font-bold text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {p.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{p.text}</p>
                      </div>
                    </div>
                  </GlassCard>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── ROADMAP ─── */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight mb-12"
                style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}
              >
                Value Creation Roadmap
              </h2>
            </AnimatedSection>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#FE9100] via-[#FE910050] to-transparent hidden md:block" />

              <div className="space-y-8">
                {TIMELINE.map((t, i) => (
                  <AnimatedSection key={t.year} delay={i * 0.15}>
                    <div className="flex gap-6 items-start">
                      <div className="hidden md:flex flex-col items-center">
                        <motion.div
                          className="w-3 h-3 rounded-full z-10"
                          style={{ background: BRAND.orange, boxShadow: `0 0 12px ${BRAND.orange}66` }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        />
                      </div>
                      <GlassCard className="p-5 flex-1">
                        <span
                          className="text-xs font-bold tracking-wider uppercase mb-1 block"
                          style={{ color: BRAND.orange, fontFamily: "Orbitron, sans-serif" }}
                        >
                          {t.year}
                        </span>
                        <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {t.label}
                        </h3>
                        <p className="text-sm text-gray-400">{t.desc}</p>
                      </GlassCard>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── THE ASK ─── */}
        <section className="py-24" id="request-call">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <GlassCard className="p-8 md:p-12">
                <h2
                  className="text-3xl md:text-4xl font-black tracking-tight mb-8"
                  style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}
                >
                  The Ask
                </h2>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-2">Raising</span>
                    <span
                      className="text-3xl font-black"
                      style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.orange }}
                    >
                      €2.5M Seed
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-2">
                      Use of funds (12–18 months)
                    </span>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex gap-2 items-start">
                        <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: BRAND.orange }} />
                        Enterprise compliance + integrations
                      </li>
                      <li className="flex gap-2 items-start">
                        <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: BRAND.orange }} />
                        DACH go-to-market (sales / partners / CS)
                      </li>
                      <li className="flex gap-2 items-start">
                        <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: BRAND.orange }} />
                        Infra hardening (multi-tenant + dedicated instances)
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-gray-300 mb-8 text-lg">
                  If you're open to it, we'd love a{" "}
                  <span className="text-white font-semibold">20-minute technical walkthrough</span>: architecture,
                  defensibility, traction, and the 12–18 month scale plan.
                </p>

                <div className="flex flex-wrap gap-4">
                  <a
                    href="mailto:ai@aras-ai.com?subject=Fly%20Ventures%20%E2%80%94%2020-min%20technical%20walkthrough"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                    style={{
                      fontFamily: "Orbitron, sans-serif",
                      background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)`,
                      color: "#fff",
                      boxShadow: `0 12px 40px ${BRAND.orange}33`,
                    }}
                  >
                    <Mail className="w-4 h-4" />
                    Request a call
                  </a>
                  <a
                    href="mailto:ai@aras-ai.com"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                    style={{
                      fontFamily: "Orbitron, sans-serif",
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${BRAND.border}`,
                      color: BRAND.gold,
                    }}
                  >
                    ai@aras-ai.com
                  </a>
                </div>
              </GlassCard>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── PITCH DECK DOWNLOAD ─── */}
        <section className="py-24" id="deck">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <GlassCard className="p-8 text-center">
                <h2
                  className="text-2xl font-black tracking-tight mb-3"
                  style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}
                >
                  Pitch Deck
                </h2>
                <p className="text-gray-500 mb-6 text-sm">Download the Fly Ventures version of the ARAS AI deck.</p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${BRAND.border}`,
                    color: BRAND.gold,
                  }}
                >
                  Download Deck (PDF)
                  <ArrowRight className="w-4 h-4" />
                </a>
              </GlassCard>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="py-12 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-[10px] text-gray-600 leading-relaxed space-y-0.5">
              <span className="block">Entwickelt von der Schwarzott Group</span>
              <span className="block">Gebaut in der Schweiz. Betrieben von einem eigenen Sprachmodell.</span>
              <span className="block font-semibold" style={{ color: `${BRAND.gold}99` }}>
                Präzision. Eleganz. Kraft.
              </span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
