import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Shield,
  Layers,
  ArrowRight,
  Target,
  Rocket,
  BarChart3,
  Cpu,
  Users,
  Globe,
  Lock,
  Zap,
  TrendingUp,
  Mail,
  ChevronRight,
  Linkedin,
  MessageSquare,
  Forward,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Network,
} from "lucide-react";

// ---------------------------------------------------------------------------
// b2venture — Personalized Pitch Deck for Andreas Goeldi
// Route: /vc/b2venture
// ---------------------------------------------------------------------------

const BRAND = {
  orange: "#FE9100",
  gold: "#e9d7c4",
  darkCard: "rgba(255,255,255,0.02)",
  border: "rgba(233,215,196,0.12)",
  borderHover: "rgba(254,145,0,0.25)",
};

// ─── BILINGUAL COPY ───
const copy = {
  en: {
    langLabel: "EN",
    badge: "ARAS AI × b2venture",
    heroTitle: "Swiss-hosted Voice Agents, built for DACH enterprises",
    heroSub: "We build voice agents as infrastructure: orchestration, workflows, compliance-grade deployment, and outcome tracking — not just \"better voice\".",
    heroPersonal: "Andreas — Peter Cullom suggested I reach out to you.",
    heroPersonalSub: "He explicitly recommended b2venture as the right place to evaluate ARAS — especially through the lens of defensibility beyond model demos.",
    whyB2Title: "Why b2venture is the right lens",
    whyB2Text: "b2venture's positioning and Fund V messaging is clear: Deep Tech / AI / infrastructure in Europe, with real DACH proximity and the network depth to scale the right teams.",
    whatTitle: "What ARAS is",
    whatSub: "(the thesis-aligned version)",
    whatIntro: "The market is moving fast and parts of voice will commoditize. The winners will own:",
    whatBullet1: "Workflow depth (not generic agents)",
    whatBullet2: "Switching costs (integration + outcomes)",
    whatBullet3: "Trust & deployment (procurement, compliance, hosting)",
    whatOutro: "That's why ARAS is built around orchestration + outcomes.",
    objectionsTitle: "Peter's three objections",
    objectionsSub: "(solved without arguing)",
    obj1Title: "Defensibility",
    obj1Text: "We don't sell \"outbound calling\". We ship an orchestration layer that owns routing, knowledge context, handoffs, auditing, and measurable outcomes.",
    obj2Title: "Commitment",
    obj2Text: "ARAS is my full-time focus — and we measure ourselves on product usage and paid adoption.",
    obj3Title: "Communication",
    obj3Text: "Less polish, more substance. No superlatives, no competitor talk — just architecture, traction, and plan.",
    tractionTitle: "Traction (today)",
    traction1: "1,000+ users, ~32% paying",
    traction2: "Strong daily engagement",
    traction3: "Clear DACH beachhead, then EU expansion",
    raiseTitle: "Round",
    raiseAmount: "€2.5M Seed",
    raiseItemsTitle: "for:",
    raise1: "Enterprise onboarding & compliance engine",
    raise2: "GTM team in DACH",
    raise3: "Partner distribution",
    askTitle: "What I'd like to ask you for",
    askText: "If relevant for b2venture: 20 minutes for a demo + a moat discussion (architecture + switching costs).",
    askFallback: "If you're not the right partner: who should I speak to?",
    cta1: "20-min demo + defensibility walkthrough",
    cta2: "Send intro deck (10–12 slides)",
    cta3: "Forward internally",
    linkedinLabel: "Justin Schwarzott on LinkedIn",
    footerLine1: "Developed by the Schwarzott Group",
    footerLine2: "Built in Switzerland. Powered by a proprietary language model.",
    footerLine3: "Precision. Elegance. Power.",
  },
  de: {
    langLabel: "DE",
    badge: "ARAS AI × b2venture",
    heroTitle: "Swiss-hosted Voice Agents für DACH-Enterprises",
    heroSub: "Wir bauen Voice Agents als Infrastruktur: Orchestrierung, Workflows, Compliance-grade Deployment und Outcome-Tracking — nicht einfach nur \"bessere Stimme\".",
    heroPersonal: "Andreas — Peter Cullom hat mir empfohlen, dich zu kontaktieren.",
    heroPersonalSub: "Er hat b2venture explizit als den richtigen Ort empfohlen, um ARAS zu evaluieren — besonders durch die Brille der Defensibility jenseits von Model-Demos.",
    whyB2Title: "Warum b2venture die richtige Perspektive ist",
    whyB2Text: "b2ventures Positionierung und Fund-V-Messaging ist klar: Deep Tech / AI / Infrastruktur in Europa, mit echter DACH-Nähe und der Netzwerk-Tiefe, um die richtigen Teams zu skalieren.",
    whatTitle: "Was ARAS ist",
    whatSub: "(die Thesis-alignierte Version)",
    whatIntro: "Der Markt bewegt sich schnell und Teile von Voice werden commoditisiert. Die Gewinner werden besitzen:",
    whatBullet1: "Workflow-Tiefe (keine generischen Agenten)",
    whatBullet2: "Switching Costs (Integration + Outcomes)",
    whatBullet3: "Vertrauen & Deployment (Beschaffung, Compliance, Hosting)",
    whatOutro: "Deshalb ist ARAS um Orchestrierung + Outcomes gebaut.",
    objectionsTitle: "Peters drei Einwände",
    objectionsSub: "(gelöst ohne zu argumentieren)",
    obj1Title: "Defensibility",
    obj1Text: "Wir verkaufen kein \"Outbound-Calling\". Wir liefern einen Orchestration Layer, der Routing, Wissenskontext, Handoffs, Auditing und messbare Outcomes besitzt.",
    obj2Title: "Commitment",
    obj2Text: "ARAS ist mein voller Fokus — und wir messen uns an Produktnutzung und zahlender Adoption.",
    obj3Title: "Kommunikation",
    obj3Text: "Weniger Politur, mehr Substanz. Keine Superlative, kein Wettbewerber-Talk — nur Architektur, Traktion und Plan.",
    tractionTitle: "Traktion (heute)",
    traction1: "1.000+ Nutzer, ~32% zahlend",
    traction2: "Starke tägliche Nutzung",
    traction3: "Klarer DACH-Brückenkopf, dann EU-Expansion",
    raiseTitle: "Runde",
    raiseAmount: "€2,5M Seed",
    raiseItemsTitle: "für:",
    raise1: "Enterprise-Onboarding & Compliance-Engine",
    raise2: "GTM-Team in DACH",
    raise3: "Partner-Distribution",
    askTitle: "Meine Bitte an dich",
    askText: "Falls relevant für b2venture: 20 Minuten für eine Demo + Moat-Diskussion (Architektur + Switching Costs).",
    askFallback: "Falls du nicht der richtige Ansprechpartner bist: an wen soll ich mich wenden?",
    cta1: "20-min Demo + Defensibility Walkthrough",
    cta2: "Intro-Deck senden (10–12 Slides)",
    cta3: "Intern weiterleiten",
    linkedinLabel: "Justin Schwarzott auf LinkedIn",
    footerLine1: "Entwickelt von der Schwarzott Group",
    footerLine2: "Gebaut in der Schweiz. Betrieben von einem eigenen Sprachmodell.",
    footerLine3: "Präzision. Eleganz. Kraft.",
  },
};

type Lang = "en" | "de";

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

function LanguageToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed top-6 right-6 z-50"
    >
      <div
        className="flex items-center rounded-full p-1 gap-0.5"
        style={{
          background: "rgba(0,0,0,0.7)",
          border: `1px solid ${BRAND.border}`,
          backdropFilter: "blur(20px)",
        }}
      >
        {(["en", "de"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="relative px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300"
            style={{
              fontFamily: "Orbitron, sans-serif",
              color: lang === l ? "#fff" : "rgba(255,255,255,0.4)",
            }}
          >
            {lang === l && (
              <motion.div
                layoutId="lang-pill-b2"
                className="absolute inset-0 rounded-full"
                style={{ background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)` }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{l.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function B2VenturePage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = copy[lang];

  useEffect(() => {
    document.title = lang === "en"
      ? "ARAS AI × b2venture — Swiss-hosted Voice Agents for DACH"
      : "ARAS AI × b2venture — Swiss-hosted Voice Agents für DACH";
  }, [lang]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <LanguageToggle lang={lang} setLang={setLang} />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-20"
          style={{ background: `radial-gradient(ellipse at center, ${BRAND.orange}22 0%, transparent 70%)`, filter: "blur(80px)" }}
        />
      </div>

      <div className="relative z-10">
        {/* ─── HERO ─── */}
        <section className="min-h-[90vh] flex items-center">
          <div className="max-w-5xl mx-auto px-6 py-24 w-full">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] tracking-[0.25em] uppercase font-bold"
                style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold, background: "rgba(0,0,0,0.6)", border: `1px solid ${BRAND.borderHover}`, backdropFilter: "blur(20px)" }}
              >
                <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND.orange }} animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                {t.badge}
              </span>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div key={lang + "-hero"} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 max-w-4xl"
                  style={{ fontFamily: "Orbitron, sans-serif", background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange}, #a34e00)`, backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {t.heroTitle}
                </h1>

                <p className="text-lg md:text-xl text-gray-300 max-w-3xl mb-8 leading-relaxed">{t.heroSub}</p>

                <div className="mb-10 p-6 rounded-2xl" style={{ background: "rgba(254,145,0,0.04)", border: `1px solid rgba(254,145,0,0.15)` }}>
                  <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {t.heroPersonal}
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">{t.heroPersonalSub}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="flex flex-wrap gap-4">
              <a
                href="mailto:ai@aras-ai.com?subject=b2venture%20%E2%80%94%2020-min%20demo%20%2B%20defensibility%20walkthrough"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]"
                style={{ fontFamily: "Orbitron, sans-serif", background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)`, color: "#fff", boxShadow: `0 12px 40px ${BRAND.orange}33` }}
              >
                {t.cta1}
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/justin-schwarzott-a3560a205"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition-all hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}
              >
                <Linkedin className="w-4 h-4" />
                {t.linkedinLabel}
              </a>
            </motion.div>
          </div>
        </section>

        {/* ─── WHY B2VENTURE ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <AnimatePresence mode="wait">
                <motion.div key={lang + "-whyb2"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>
                    {t.whyB2Title}
                  </h2>
                  <GlassCard className="p-8">
                    <p className="text-gray-300 leading-relaxed text-lg">{t.whyB2Text}</p>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── WHAT ARAS IS ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <AnimatePresence mode="wait">
                <motion.div key={lang + "-what"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>
                    {t.whatTitle}
                  </h2>
                  <p className="text-gray-500 mb-8 text-sm">{t.whatSub}</p>
                  <GlassCard className="p-8">
                    <p className="text-gray-300 leading-relaxed mb-6">{t.whatIntro}</p>
                    <ul className="space-y-3 mb-6">
                      {[t.whatBullet1, t.whatBullet2, t.whatBullet3].map((b) => (
                        <li key={b} className="flex gap-3 items-start">
                          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: BRAND.orange }} />
                          <span className="text-white font-semibold">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-lg text-white font-medium">{t.whatOutro}</p>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── THREE OBJECTIONS ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>
                {t.objectionsTitle}
              </h2>
              <p className="text-gray-500 mb-10 text-sm">{t.objectionsSub}</p>
            </AnimatedSection>

            <AnimatePresence mode="wait">
              <motion.div key={lang + "-obj"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                {[
                  { title: t.obj1Title, text: t.obj1Text, icon: Shield },
                  { title: t.obj2Title, text: t.obj2Text, icon: Target },
                  { title: t.obj3Title, text: t.obj3Text, icon: MessageSquare },
                ].map((obj, i) => (
                  <AnimatedSection key={obj.title} delay={i * 0.12}>
                    <GlassCard className="p-6 hover:border-[rgba(254,145,0,0.2)] transition-colors">
                      <div className="flex gap-5 items-start">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                          style={{ background: `${BRAND.orange}15`, border: `1px solid ${BRAND.orange}30` }}
                        >
                          <obj.icon className="w-5 h-5" style={{ color: BRAND.orange }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {obj.title}
                          </h3>
                          <p className="text-sm text-gray-400 leading-relaxed">{obj.text}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </AnimatedSection>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ─── TRACTION ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>
                {t.tractionTitle}
              </h2>
            </AnimatedSection>

            <AnimatePresence mode="wait">
              <motion.div key={lang + "-traction"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="grid md:grid-cols-3 gap-5">
                  {[t.traction1, t.traction2, t.traction3].map((item, i) => (
                    <AnimatedSection key={item} delay={i * 0.1}>
                      <GlassCard className="p-6 h-full">
                        <CheckCircle2 className="w-6 h-6 mb-3" style={{ color: BRAND.orange }} />
                        <p className="text-sm text-gray-300 leading-relaxed">{item}</p>
                      </GlassCard>
                    </AnimatedSection>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ─── THE ASK / RAISE ─── */}
        <section className="py-24" id="ask">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <AnimatePresence mode="wait">
                <motion.div key={lang + "-ask"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <GlassCard className="p-8 md:p-12">
                    <div className="grid md:grid-cols-2 gap-10 mb-10">
                      <div>
                        <h2 className="text-3xl font-black tracking-tight mb-6" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>
                          {t.raiseTitle}
                        </h2>
                        <span className="text-4xl font-black block mb-3" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.orange }}>
                          {t.raiseAmount}
                        </span>
                        <p className="text-sm text-gray-400 mb-4">{t.raiseItemsTitle}</p>
                        <ul className="space-y-2 text-sm text-gray-300">
                          {[t.raise1, t.raise2, t.raise3].map((r) => (
                            <li key={r} className="flex gap-2 items-start">
                              <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: BRAND.orange }} />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight mb-6" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>
                          {t.askTitle}
                        </h2>
                        <p className="text-sm text-gray-300 mb-6">{t.askText}</p>
                        <p className="text-xs text-gray-500 italic">{t.askFallback}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <a
                        href="mailto:ai@aras-ai.com?subject=b2venture%20%E2%80%94%2020-min%20demo%20%2B%20defensibility%20walkthrough"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                        style={{ fontFamily: "Orbitron, sans-serif", background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)`, color: "#fff", boxShadow: `0 12px 40px ${BRAND.orange}33` }}
                      >
                        <Mail className="w-4 h-4" />
                        {t.cta1}
                      </a>
                      <a
                        href="mailto:ai@aras-ai.com?subject=b2venture%20%E2%80%94%20Intro%20Deck"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                        style={{ fontFamily: "Orbitron, sans-serif", background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}
                      >
                        <FileText className="w-4 h-4" />
                        {t.cta2}
                      </a>
                      <a
                        href="mailto:ai@aras-ai.com?subject=b2venture%20%E2%80%94%20Forward%20internally"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]"
                        style={{ fontFamily: "Orbitron, sans-serif", background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}
                      >
                        <Forward className="w-4 h-4" />
                        {t.cta3}
                      </a>
                    </div>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="py-12 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-[10px] text-gray-600 leading-relaxed text-center md:text-left">
              <p>{t.footerLine1}</p>
              <p>{t.footerLine2}</p>
              <p className="font-semibold" style={{ color: `${BRAND.gold}99` }}>{t.footerLine3}</p>
            </div>
            <a
              href="https://www.linkedin.com/in/justin-schwarzott-a3560a205"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#FE9100] transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              Justin Schwarzott
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
