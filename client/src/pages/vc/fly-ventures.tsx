import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Mail,
  ChevronRight,
  Linkedin,
  Forward,
  FileText,
  CheckCircle2,
  Quote,
  Phone,
  BarChart3,
  Users,
  Rocket,
  Crown,
  Building2,
  Star,
  Globe,
  Shield,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Fly Ventures — Personalized for Gabriel Matuschka
// Route: /vc/fly-ventures
// ---------------------------------------------------------------------------

const BRAND = {
  orange: "#FE9100",
  gold: "#e9d7c4",
  darkCard: "rgba(255,255,255,0.02)",
  border: "rgba(233,215,196,0.12)",
  borderHover: "rgba(254,145,0,0.25)",
};

const TEAM = [
  { name: "Justin Schwarzott", role: { en: "Founder & CEO — self-funded from prior exit", de: "Gründer & CEO — selbstfinanziert aus früherem Exit" }, url: "https://www.linkedin.com/in/justin-schwarzott-a3560a205" },
  { name: "Moritz Schwarzmann", role: { en: "Commercial & strategic support", de: "Kommerziell & strategische Unterstützung" }, url: "https://www.linkedin.com/in/moritz-schwarzmann/" },
  { name: "Dr. Salim Kraatz", role: { en: "Commercial & strategic support", de: "Kommerziell & strategische Unterstützung" }, url: "https://www.linkedin.com/in/salimkraatz/" },
  { name: "Martin Daschner", role: { en: "Technical infrastructure", de: "Technische Infrastruktur" }, url: "https://www.linkedin.com/in/martin-daschner-08819151/" },
  { name: "Christopher Kyser", role: { en: "Technical infrastructure", de: "Technische Infrastruktur" }, url: "https://www.linkedin.com/in/christopherkyser/" },
];

const copy = {
  en: {
    badge: "ARAS AI × Fly Ventures",
    heroPersonal: "Gabriel — Peter Cullom suggested I reach out to you.",
    heroIntro: "I'm Justin Schwarzott, founder of ARAS AI (named after my daughter Sara). We've built a voice platform that people describe, again and again, as the most human AI calling they've ever heard — not because we claim it, but because the feedback is consistently blunt and positive.",
    heroLive: "ARAS AI is live, growing daily, and already monetizing.",
    heroVision: "We're building this with a single goal: to become a Unicorn within 5 years — and we're treating it like a real company already: product, pricing, usage, retention, customers, roadmap, and execution.",
    heroOneLiner: "ARAS AI turns outbound calling into a one-click, high-quality workflow — from a single call to 10,000 calls — without the \"AI vibe\".",

    whyTitle: "Why I'm writing you",
    whySub: "(and why it's a \"Fly-type\" bet)",
    whyText: "Fly is known for backing founders early when the hard part isn't the pitch — it's building something that actually works and can become defensible infrastructure.",
    whyText2: "That's exactly what we're doing: Most \"voice AI\" products feel like demos. ARAS is the opposite — it's a system users run every day, because it produces outcomes: qualified leads, booked meetings, clean handoffs, measurable performance.",

    feelTitle: "What ARAS feels like",
    feelSub: "(not what it \"is\")",
    feelQuote: "\"Wait… that's AI?\"",
    feelText: "That's the reaction we get. Because the core design goal wasn't \"voice quality\" as a feature. It was human trust at scale — the kind of voice that doesn't trigger resistance, and the kind of workflow that feels like a real operator behind it.",

    tractionTitle: "Traction (today)",
    traction1: "1,000+ users and growing",
    traction2: "~32% paying (real subscriptions, not letters of intent)",
    traction3: "Strong daily usage (people actually use it, not just test it once)",
    traction4: "Increasing inbound from larger companies with serious budgets",

    productTitle: "The spearhead",
    productSub: "Outbound, done right.",
    prod1Title: "Power Calls",
    prod1Text: "One call, one task, immediate outcome.",
    prod2Title: "Campaign Mode",
    prod2Text: "One click → up to 10,000 calls, with consistent quality and routing logic.",
    prod3Title: "Contacts + Knowledge Base",
    prod3Text: "ARAS learns context, offers, tone, and objections — then calls accordingly.",
    prod4Title: "Dashboard",
    prod4Text: "KPI tracking, conversion signals, performance transparency.",

    pricingTitle: "Pricing",
    pricingSub: "Real users pay this today.",
    priceFree: "Free — Discover Mode",
    priceFreeCost: "€0",
    priceFreeItems: ["2 free outbound calls", "10 chat messages", "Basic console + stats", "No payment details required"],
    pricePro: "Pro — Growth Mode",
    priceProCost: "€59 / month",
    priceProItems: ["100 outbound calls / month", "500 chat messages", "Make / Zapier / n8n integrations", "Performance dashboard + 24h email support"],
    priceUltra: "Ultra — Performance Mode",
    priceUltraCost: "€249 / month",
    priceUltraItems: ["1,000 outbound calls / month", "10,000 chat messages", "Advanced ARAS voice model", "Multi-user (up to 5) + priority support"],
    priceUltimate: "Ultimate — Enterprise Mode",
    priceUltimateCost: "€1,990 / month",
    priceUltimateItems: ["10,000 outbound calls / month", "Unlimited chat", "Dedicated enterprise LLM + API/CRM", "Swiss data hosting + premium support"],
    priceMostPopular: "Most Popular",

    earlyTitle: "Early Access — honest, human",
    earlyText: "ARAS is live and already used commercially — and we still ship improvements continuously. That means: occasional fast iterations, UI changes, and rare short disruptions during updates. We're building this like infrastructure: stable, measurable, and getting better every week.",

    teamTitle: "The team",
    teamSub: "Clear, credible, committed.",

    askTitle: "The ask",
    askText: "Gabriel — if this sounds like it matches Fly's early, technical conviction bets:",
    askCTA: "Can we do a 20-minute call?",
    askBullet1: "A 3-minute live demo",
    askBullet2: "Why users call it \"the most human AI\"",
    askBullet3: "The 5-year plan to Unicorn — and what we need from the seed to get there",
    askFallback: "If you're not the right person: who at Fly should I forward this to?",
    cta1: "Book 20-min call",
    cta2: "Send deck + metrics snapshot",
    cta3: "Forward internally",

    contextNote: "Side note: We had several acquisition offers at Web Summit 2026 in Doha. We're not interested in selling — we want to grow. Peter's recommendation is why we're considering outside capital for the first time.",

    footerLine1: "Developed by the Schwarzott Group",
    footerLine2: "Built in Switzerland. Powered by a proprietary language model.",
    footerLine3: "Precision. Elegance. Power.",
  },
  de: {
    badge: "ARAS AI × Fly Ventures",
    heroPersonal: "Gabriel — Peter Cullom hat mir empfohlen, dich zu kontaktieren.",
    heroIntro: "Ich bin Justin Schwarzott, Gründer von ARAS AI (benannt nach meiner Tochter Sara). Wir haben eine Voice-Plattform gebaut, die Menschen immer wieder beschreiben als das menschlichste KI-Telefonat, das sie je gehört haben — nicht weil wir das behaupten, sondern weil das Feedback durchweg direkt und positiv ist.",
    heroLive: "ARAS AI ist live, wächst täglich und generiert bereits Umsatz.",
    heroVision: "Wir bauen das mit einem einzigen Ziel: in 5 Jahren ein Unicorn zu sein — und wir behandeln es jetzt schon wie ein echtes Unternehmen: Produkt, Pricing, Nutzung, Retention, Kunden, Roadmap und Execution.",
    heroOneLiner: "ARAS AI macht Outbound-Telefonie zu einem Ein-Klick-Workflow in höchster Qualität — von einem einzigen Anruf bis zu 10.000 Calls — ohne den \"KI-Vibe\".",

    whyTitle: "Warum ich dir schreibe",
    whySub: "(und warum das ein \"Fly-typisches\" Bet ist)",
    whyText: "Fly ist dafür bekannt, Gründer früh zu unterstützen, wenn das Schwierige nicht der Pitch ist — sondern etwas zu bauen, das wirklich funktioniert und verteidigbare Infrastruktur werden kann.",
    whyText2: "Genau das tun wir: Die meisten \"Voice AI\"-Produkte fühlen sich wie Demos an. ARAS ist das Gegenteil — es ist ein System, das Nutzer jeden Tag einsetzen, weil es Ergebnisse produziert: qualifizierte Leads, gebuchte Meetings, saubere Handoffs, messbare Performance.",

    feelTitle: "Wie sich ARAS anfühlt",
    feelSub: "(nicht was es \"ist\")",
    feelQuote: "\"Moment… das ist KI?\"",
    feelText: "Das ist die Reaktion, die wir bekommen. Denn das Design-Ziel war nie \"Voice-Qualität\" als Feature. Es war menschliches Vertrauen im großen Maßstab — die Art Stimme, die keinen Widerstand auslöst, und der Workflow, der sich anfühlt, als stünde ein echter Mensch dahinter.",

    tractionTitle: "Traktion (heute)",
    traction1: "1.000+ Nutzer und wachsend",
    traction2: "~32% zahlend (echte Subscriptions, keine Absichtserklärungen)",
    traction3: "Starke tägliche Nutzung (Menschen nutzen es wirklich, nicht nur einmal testen)",
    traction4: "Wachsendes Inbound-Interesse von größeren Unternehmen mit echten Budgets",

    productTitle: "Die Speerspitze",
    productSub: "Outbound, richtig gemacht.",
    prod1Title: "Power Calls",
    prod1Text: "Ein Anruf, eine Aufgabe, sofortiges Ergebnis.",
    prod2Title: "Kampagnen-Modus",
    prod2Text: "Ein Klick → bis zu 10.000 Anrufe, mit konsistenter Qualität und Routing-Logik.",
    prod3Title: "Kontakte + Wissensdatenbank",
    prod3Text: "ARAS lernt Kontext, Angebote, Tonalität und Einwände — und ruft dementsprechend an.",
    prod4Title: "Dashboard",
    prod4Text: "KPI-Tracking, Conversion-Signale, Performance-Transparenz.",

    pricingTitle: "Pricing",
    pricingSub: "Echte Nutzer bezahlen das heute.",
    priceFree: "Free — Discover Mode",
    priceFreeCost: "€0",
    priceFreeItems: ["2 kostenlose Outbound Calls", "10 Chat-Nachrichten", "Basis-Konsole + Statistiken", "Keine Zahlungsdaten erforderlich"],
    pricePro: "Pro — Growth Mode",
    priceProCost: "€59 / Monat",
    priceProItems: ["100 Outbound Calls / Monat", "500 Chat-Nachrichten", "Make / Zapier / n8n Integrationen", "Performance-Dashboard + 24h E-Mail-Support"],
    priceUltra: "Ultra — Performance Mode",
    priceUltraCost: "€249 / Monat",
    priceUltraItems: ["1.000 Outbound Calls / Monat", "10.000 Chat-Nachrichten", "Erweitertes ARAS Voice Model", "Multi-User (bis 5) + Priority Support"],
    priceUltimate: "Ultimate — Enterprise Mode",
    priceUltimateCost: "€1.990 / Monat",
    priceUltimateItems: ["10.000 Outbound Calls / Monat", "Unbegrenzte Chat-Nachrichten", "Dediziertes Enterprise-LLM + API/CRM", "Swiss Data Hosting + Premium Support"],
    priceMostPopular: "Beliebtester Plan",

    earlyTitle: "Early Access — ehrlich, menschlich",
    earlyText: "ARAS ist live und wird bereits kommerziell genutzt — und wir liefern weiterhin laufend Verbesserungen. Das bedeutet: gelegentliche schnelle Iterationen, UI-Änderungen und seltene kurze Unterbrechungen bei Updates. Wir bauen das wie Infrastruktur: stabil, messbar und jede Woche besser.",

    teamTitle: "Das Team",
    teamSub: "Klar, glaubwürdig, committed.",

    askTitle: "Die Bitte",
    askText: "Gabriel — wenn das nach Flys frühen, technischen Conviction-Bets klingt:",
    askCTA: "Können wir 20 Minuten telefonieren?",
    askBullet1: "Eine 3-minütige Live-Demo",
    askBullet2: "Warum Nutzer es \"die menschlichste KI\" nennen",
    askBullet3: "Der 5-Jahres-Plan zum Unicorn — und was wir vom Seed dafür brauchen",
    askFallback: "Falls du nicht der richtige Ansprechpartner bist: an wen bei Fly soll ich weiterleiten?",
    cta1: "20-min Call buchen",
    cta2: "Deck + Metriken senden",
    cta3: "Intern weiterleiten",

    contextNote: "Nebenbei: Wir hatten mehrere Kaufangebote auf dem Web Summit 2026 in Doha. Wir wollen nicht verkaufen — wir wollen wachsen. Peters Empfehlung ist der Grund, warum wir erstmals externes Kapital in Betracht ziehen.",

    footerLine1: "Entwickelt von der Schwarzott Group",
    footerLine2: "Gebaut in der Schweiz. Betrieben von einem eigenen Sprachmodell.",
    footerLine3: "Präzision. Eleganz. Kraft.",
  },
};

type Lang = "en" | "de";

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", delay } } }} className={className}>
      {children}
    </motion.div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ background: BRAND.darkCard, border: `1px solid ${BRAND.border}`, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
      {children}
    </div>
  );
}

function LanguageToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="fixed top-6 right-6 z-50">
      <div className="flex items-center rounded-full p-1 gap-0.5" style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${BRAND.border}`, backdropFilter: "blur(20px)" }}>
        {(["en", "de"] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)} className="relative px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300" style={{ fontFamily: "Orbitron, sans-serif", color: lang === l ? "#fff" : "rgba(255,255,255,0.4)" }}>
            {lang === l && <motion.div layoutId="lang-fly" className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)` }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            <span className="relative z-10">{l.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function PricingCard({ title, cost, items, highlight = false, popularLabel }: { title: string; cost: string; items: string[]; highlight?: boolean; popularLabel?: string }) {
  return (
    <GlassCard className={`p-6 h-full flex flex-col ${highlight ? "ring-1 ring-[#FE9100]/40" : ""}`}>
      {highlight && popularLabel && (
        <span className="inline-block self-start px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider mb-3" style={{ background: `${BRAND.orange}20`, color: BRAND.orange, fontFamily: "Orbitron, sans-serif" }}>
          {popularLabel}
        </span>
      )}
      <h4 className="text-sm font-bold text-white mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h4>
      <span className="text-2xl font-black mb-4" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.orange }}>{cost}</span>
      <ul className="space-y-2 flex-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 items-start text-xs text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: BRAND.orange }} />
            {item}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

export default function FlyVenturesPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = copy[lang];

  useEffect(() => {
    document.title = lang === "en" ? "ARAS AI × Fly Ventures — Voice AI that sounds human" : "ARAS AI × Fly Ventures — Voice AI die menschlich klingt";
  }, [lang]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <LanguageToggle lang={lang} setLang={setLang} />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-20" style={{ background: `radial-gradient(ellipse at center, ${BRAND.orange}22 0%, transparent 70%)`, filter: "blur(80px)" }} />
      </div>

      <div className="relative z-10">
        {/* ─── HERO ─── */}
        <section className="min-h-[90vh] flex items-center">
          <div className="max-w-5xl mx-auto px-6 py-24 w-full">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] tracking-[0.25em] uppercase font-bold" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold, background: "rgba(0,0,0,0.6)", border: `1px solid ${BRAND.borderHover}`, backdropFilter: "blur(20px)" }}>
                <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND.orange }} animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                {t.badge}
              </span>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div key={lang + "-hero"} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                {/* Personal greeting */}
                <div className="mb-8 p-6 rounded-2xl" style={{ background: "rgba(254,145,0,0.04)", border: "1px solid rgba(254,145,0,0.15)" }}>
                  <p className="text-xl md:text-2xl font-bold text-white mb-4" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {t.heroPersonal}
                  </p>
                  <p className="text-gray-300 leading-relaxed mb-4">{t.heroIntro}</p>
                  <p className="text-white font-semibold text-lg">{t.heroLive}</p>
                  <p className="text-gray-400 leading-relaxed mt-2">{t.heroVision}</p>
                </div>

                {/* One-liner */}
                <div className="mb-10 p-5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BRAND.border}` }}>
                  <p className="text-lg md:text-xl font-bold text-white leading-relaxed">
                    <Zap className="w-5 h-5 inline-block mr-2 -mt-0.5" style={{ color: BRAND.orange }} />
                    {t.heroOneLiner}
                  </p>
                </div>

                {/* Context note */}
                <p className="text-xs text-gray-500 italic mb-8 max-w-3xl">{t.contextNote}</p>
              </motion.div>
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="flex flex-wrap gap-4">
              <a href="mailto:ai@aras-ai.com?subject=Fly%20Ventures%20%E2%80%94%2020-min%20call" className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02]" style={{ fontFamily: "Orbitron, sans-serif", background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)`, color: "#fff", boxShadow: `0 12px 40px ${BRAND.orange}33` }}>
                {t.cta1} <ArrowRight className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/in/justin-schwarzott-a3560a205" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition-all hover:scale-[1.02]" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                <Linkedin className="w-4 h-4" /> Justin Schwarzott
              </a>
            </motion.div>
          </div>
        </section>

        {/* ─── WHY FLY ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <AnimatePresence mode="wait">
                <motion.div key={lang + "-why"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>{t.whyTitle}</h2>
                  <p className="text-gray-500 mb-8 text-sm">{t.whySub}</p>
                  <GlassCard className="p-8">
                    <p className="text-gray-300 leading-relaxed text-lg mb-4">{t.whyText}</p>
                    <p className="text-white leading-relaxed font-medium">{t.whyText2}</p>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── WHAT ARAS FEELS LIKE ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <AnimatePresence mode="wait">
                <motion.div key={lang + "-feel"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>{t.feelTitle}</h2>
                  <p className="text-gray-500 mb-8 text-sm">{t.feelSub}</p>
                  <GlassCard className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <Quote className="w-8 h-8 flex-shrink-0 mt-1" style={{ color: BRAND.orange }} />
                      <p className="text-3xl md:text-4xl font-black text-white italic" style={{ fontFamily: "Orbitron, sans-serif" }}>{t.feelQuote}</p>
                    </div>
                    <p className="text-gray-300 leading-relaxed text-lg">{t.feelText}</p>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── TRACTION ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>{t.tractionTitle}</h2>
            </AnimatedSection>
            <AnimatePresence mode="wait">
              <motion.div key={lang + "-traction"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    { text: t.traction1, icon: Users },
                    { text: t.traction2, icon: BarChart3 },
                    { text: t.traction3, icon: Star },
                    { text: t.traction4, icon: Building2 },
                  ].map((item, i) => (
                    <AnimatedSection key={item.text} delay={i * 0.1}>
                      <GlassCard className="p-6 h-full">
                        <item.icon className="w-6 h-6 mb-3" style={{ color: BRAND.orange }} />
                        <p className="text-sm text-gray-300 leading-relaxed">{item.text}</p>
                      </GlassCard>
                    </AnimatedSection>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ─── PRODUCT ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>{t.productTitle}</h2>
              <p className="text-gray-500 mb-10 text-sm">{t.productSub}</p>
            </AnimatedSection>
            <AnimatePresence mode="wait">
              <motion.div key={lang + "-prod"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    { title: t.prod1Title, text: t.prod1Text, icon: Phone },
                    { title: t.prod2Title, text: t.prod2Text, icon: Rocket },
                    { title: t.prod3Title, text: t.prod3Text, icon: Globe },
                    { title: t.prod4Title, text: t.prod4Text, icon: BarChart3 },
                  ].map((item, i) => (
                    <AnimatedSection key={item.title} delay={i * 0.1}>
                      <GlassCard className="p-6 h-full">
                        <item.icon className="w-6 h-6 mb-3" style={{ color: BRAND.orange }} />
                        <h3 className="text-sm font-bold text-white mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>{item.title}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>
                      </GlassCard>
                    </AnimatedSection>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>{t.pricingTitle}</h2>
              <p className="text-gray-500 mb-10 text-sm">{t.pricingSub}</p>
            </AnimatedSection>
            <AnimatePresence mode="wait">
              <motion.div key={lang + "-price"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <AnimatedSection delay={0}><PricingCard title={t.priceFree} cost={t.priceFreeCost} items={t.priceFreeItems} /></AnimatedSection>
                  <AnimatedSection delay={0.1}><PricingCard title={t.pricePro} cost={t.priceProCost} items={t.priceProItems} /></AnimatedSection>
                  <AnimatedSection delay={0.2}><PricingCard title={t.priceUltra} cost={t.priceUltraCost} items={t.priceUltraItems} highlight popularLabel={t.priceMostPopular} /></AnimatedSection>
                  <AnimatedSection delay={0.3}><PricingCard title={t.priceUltimate} cost={t.priceUltimateCost} items={t.priceUltimateItems} /></AnimatedSection>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ─── EARLY ACCESS ─── */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <AnimatePresence mode="wait">
                <motion.div key={lang + "-early"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <GlassCard className="p-8">
                    <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>{t.earlyTitle}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{t.earlyText}</p>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── TEAM ─── */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>{t.teamTitle}</h2>
              <p className="text-gray-500 mb-10 text-sm">{t.teamSub}</p>
            </AnimatedSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {TEAM.map((m, i) => (
                <AnimatedSection key={m.name} delay={i * 0.1}>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="block group">
                    <GlassCard className="p-5 h-full hover:border-[rgba(254,145,0,0.25)] transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${BRAND.orange}15`, border: `1px solid ${BRAND.orange}30` }}>
                          <Linkedin className="w-4 h-4" style={{ color: BRAND.orange }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-[#FE9100] transition-colors">{m.name}</p>
                          <p className="text-[10px] text-gray-500">{m.role[lang]}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </a>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ─── THE ASK ─── */}
        <section className="py-24" id="ask">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <AnimatePresence mode="wait">
                <motion.div key={lang + "-ask"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <GlassCard className="p-8 md:p-12">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6" style={{ fontFamily: "Orbitron, sans-serif", color: BRAND.gold }}>{t.askTitle}</h2>
                    <p className="text-gray-300 mb-2 text-lg">{t.askText}</p>
                    <p className="text-2xl font-black text-white mb-6" style={{ fontFamily: "Orbitron, sans-serif" }}>{t.askCTA}</p>

                    <ul className="space-y-3 mb-6">
                      {[t.askBullet1, t.askBullet2, t.askBullet3].map((b) => (
                        <li key={b} className="flex gap-3 items-start">
                          <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: BRAND.orange }} />
                          <span className="text-sm text-gray-300">{b}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="text-xs text-gray-500 italic mb-8">{t.askFallback}</p>

                    <div className="flex flex-wrap gap-3">
                      <a href="mailto:ai@aras-ai.com?subject=Fly%20Ventures%20%E2%80%94%2020-min%20call" className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]" style={{ fontFamily: "Orbitron, sans-serif", background: `linear-gradient(135deg, ${BRAND.orange}, #a34e00)`, color: "#fff", boxShadow: `0 12px 40px ${BRAND.orange}33` }}>
                        <Mail className="w-4 h-4" /> {t.cta1}
                      </a>
                      <a href="mailto:ai@aras-ai.com?subject=Fly%20Ventures%20%E2%80%94%20Deck%20%2B%20Metrics" className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]" style={{ fontFamily: "Orbitron, sans-serif", background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                        <FileText className="w-4 h-4" /> {t.cta2}
                      </a>
                      <a href="mailto:ai@aras-ai.com?subject=Fly%20Ventures%20%E2%80%94%20Forward" className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02]" style={{ fontFamily: "Orbitron, sans-serif", background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.border}`, color: BRAND.gold }}>
                        <Forward className="w-4 h-4" /> {t.cta3}
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
            <div className="flex gap-4">
              <a href="https://www.linkedin.com/in/justin-schwarzott-a3560a205" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#FE9100] transition-colors">
                <Linkedin className="w-4 h-4" /> Justin Schwarzott
              </a>
              <a href="mailto:ai@aras-ai.com" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#FE9100] transition-colors">
                <Mail className="w-4 h-4" /> ai@aras-ai.com
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
