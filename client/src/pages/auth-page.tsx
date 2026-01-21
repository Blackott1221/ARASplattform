import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Phone, Calendar, Sparkles, Building, Globe, User, Target, ChevronLeft, ChevronDown, Search, Mic, TrendingUp, Shield, ShieldCheck, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { trackLogin, trackSignup, captureUTMParameters } from "@/lib/analytics";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { T } from "@/lib/auto-translate";

const TYPED_LINES = [
  "Die Stimme, die verkauft.",
  "Echte Gespräche. Echte Resultate.",
  "ARAS AI führt tausende Anrufe gleichzeitig.",
  "Du liest nicht über die Zukunft.",
  "Du hörst sie."
];

// Auth Subtitle Lines for Typing Animation
const AUTH_SUBLINES = [
  "Alpha Zugang ist kostenlos.",
  "Dein Account bleibt auch nach dem Marktstart bestehen.",
  "Wenn du eine E-Mail von uns bekommen hast, bist du bereits Alpha-Kunde."
];

// Live Date and Time Component with Milliseconds
function LiveDateTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return {
      date: `${dayName}. ${day}. ${month} ${year}`,
      time: `${hours}:${minutes}:${seconds}`
    };
  };

  const { date, time } = formatDateTime(currentTime);

  return (
    <div className="flex justify-center w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Subtle Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-xl blur-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.1), rgba(233, 215, 196, 0.1))',
          }}
          animate={{
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Main Container */}
        <div
          className="relative px-6 py-3 rounded-xl backdrop-blur-sm"
          style={{
            background: 'rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(254, 145, 0, 0.15)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Date */}
            <div
              className="text-xs tracking-wide opacity-60"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                color: '#e9d7c4'
              }}
            >
              {date}
            </div>
            
            {/* Time without Milliseconds */}
            <div className="flex items-center gap-1.5">
              <span
                className="text-lg font-semibold"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4',
                  opacity: 0.8
                }}
              >
                {time}
              </span>
              <span
                className="text-xs tracking-wide opacity-50"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Uhr
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// 📞 Call Flow Timeline Component
function CallFlowTimeline() {
  const steps = [
    {
      step: 1,
      title: "Auftrag geben",
      description: "Sie definieren das Ziel – per natürlicher Sprache oder strukturierter Form:",
      quote: '"Rufe alle Leads aus Kampagne A an und qualifiziere nach Kriterium B."'
    },
    {
      step: 2,
      title: "Kontextanalyse",
      description: "ARAS verarbeitet CRM-Daten, bisherige Interaktionen & Lead-Informationen. Das System erkennt Absicht, Emotion & Gesprächssituation."
    },
    {
      step: 3,
      title: "Der Anruf läuft",
      description: "ARAS spricht mit einer ruhigen, strukturierten Stimme. Dialoge sind kontextbezogen, präzise und nachvollziehbar. Einwände werden logisch behandelt."
    },
    {
      step: 4,
      title: "Ergebnis & Zusammenfassung",
      description: "Direkt nach dem Gespräch erhalten Sie: qualifiziertes Ergebnis, Gesprächszusammenfassung, Empfehlung für den nächsten Schritt & Gesprächston."
    }
  ];

  return (
    <div className="space-y-12 relative">
      {/* Vertical Line */}
      <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-[#FE9100]/50 via-[#FE9100]/20 to-transparent z-0" />

      {steps.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.2 }}
          className="relative z-10 flex gap-6"
        >
          {/* Number Bubble */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#FE9100]/30 flex items-center justify-center text-[#FE9100] font-bold shadow-[0_0_15px_rgba(254,145,0,0.15)]">
            {item.step}
          </div>

          {/* Content */}
          <div className="pt-1">
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {item.title}
            </h3>
            <p className="text-white/60 leading-relaxed max-w-md">
              {item.description}
            </p>
            {item.quote && (
              <div className="mt-3 p-3 bg-[#FE9100]/5 border-l-2 border-[#FE9100] rounded-r-lg">
                <p className="text-sm text-[#FE9100] italic">
                  {item.quote}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// 📞 Live Call Window Component
function LiveCallWindow() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl shadow-2xl"
    >
      {/* Window Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white/60 tracking-wider">LIVE CALL — ARAS OPERATING</span>
          </div>
        </div>
        <div className="font-mono text-xs text-[#FE9100]">01:45</div>
      </div>

      {/* Chat Area */}
      <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
        {/* ARAS */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FE9100] to-[#a34e00] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-[0_0_10px_rgba(254,145,0,0.4)]">
            AI
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-[#FE9100]">ARAS AI</div>
            <div className="bg-white/5 p-3 rounded-r-xl rounded-bl-xl border border-white/5 text-sm text-gray-300 leading-relaxed">
              Guten Tag, hier spricht ARAS AI im Auftrag von Ihrer Firma. Haben Sie eine Minute Zeit?
            </div>
          </div>
        </div>

        {/* Lead */}
        <div className="flex gap-4 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            L
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[10px] font-bold text-gray-500">LEAD</div>
            <div className="bg-[#FE9100]/10 p-3 rounded-l-xl rounded-br-xl border border-[#FE9100]/20 text-sm text-white/90 leading-relaxed text-left">
              Ja, worum geht es?
            </div>
          </div>
        </div>

        {/* ARAS */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FE9100] to-[#a34e00] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-[0_0_10px_rgba(254,145,0,0.4)]">
            AI
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-[#FE9100]">ARAS AI</div>
            <div className="bg-white/5 p-3 rounded-r-xl rounded-bl-xl border border-white/5 text-sm text-gray-300 leading-relaxed">
              Es geht um eine Optimierung Ihrer Outbound-Prozesse. Wir haben gesehen, dass Sie im B2B-Bereich tätig sind.
            </div>
          </div>
        </div>

        {/* Lead */}
        <div className="flex gap-4 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            L
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[10px] font-bold text-gray-500">LEAD</div>
            <div className="bg-[#FE9100]/10 p-3 rounded-l-xl rounded-br-xl border border-[#FE9100]/20 text-sm text-white/90 leading-relaxed text-left">
              Interessant. Erzählen Sie mehr.
            </div>
          </div>
        </div>

        {/* Typing Indicator */}
        <div className="flex gap-4 items-end">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FE9100] to-[#a34e00] flex items-center justify-center text-white text-xs font-bold shrink-0 opacity-50">
            AI
          </div>
          <div className="bg-white/5 px-4 py-3 rounded-r-xl rounded-bl-xl border border-white/5">
            <div className="flex gap-1">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                className="w-1.5 h-1.5 rounded-full bg-[#FE9100]"
              />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                className="w-1.5 h-1.5 rounded-full bg-[#FE9100]"
              />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                className="w-1.5 h-1.5 rounded-full bg-[#FE9100]"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 🏷️ Pricing Section
function PricingSection() {
  const plans = [
    {
      name: "STARTER",
      role: "ARAS Pro",
      alphaPrice: "€59",
      standardPrice: "€1.990",
      savings: "€1.931",
      features: ["100 Outbound Calls pro Monat", "500 Chatnachrichten", "ARAS Konsole (Basic)", "Automatische Zusammenfassungen", "E-Mail Support"],
      isPopular: false
    },
    {
      name: "PRO",
      role: "ARAS Ultra",
      alphaPrice: "€249",
      standardPrice: "€4.990",
      savings: "€4.741",
      features: ["1.000 Outbound Calls pro Monat", "10.000 Chatnachrichten", "ARAS Voice Model (erweitert)", "Mehrbenutzerzugang", "Erweiterte Analysen", "Priorisierter Support"],
      isPopular: true
    },
    {
      name: "ENTERPRISE",
      role: "ARAS Ultimate",
      alphaPrice: "€1990",
      standardPrice: "€19.990",
      savings: "€18.000",
      features: ["10.000 Outbound Calls pro Monat", "Unbegrenzte Chatnachrichten", "Dediziertes ARAS Enterprise-LLM", "API & CRM Integrationen", "Swiss Hosting", "24/7 Support", "Early Access zu neuen Modulen"],
      isPopular: false
    },
    {
      name: "ARAS Free",
      role: "Kostenlos – dauerhaft",
      alphaPrice: "€0",
      standardPrice: "€0",
      savings: "€0",
      features: ["2 Outbound Calls", "10 Chatnachrichten", "Zugriff auf ARAS Basic Console", "Kostenlos starten"],
      isPopular: false,
      isFree: true
    }
  ];

  return (
    <section className="relative py-20 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#e9d7c4] via-[#FE9100] to-[#a34e00]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Die ARAS Alpha-Vorteile
          </h2>
          <div className="space-y-2 text-lg md:text-xl font-light text-white/80">
            <p className="text-[#FE9100] font-bold uppercase tracking-wider text-sm mb-4">Die Alpha-Phase ist streng limitiert</p>
            <p>Alle Nutzer, die heute testen, behalten ihre aktuellen Preise – <span className="text-[#FE9100] font-bold">dauerhaft</span>.</p>
            <p className="text-white/50 text-base">Die zukünftigen Enterprise-Preise werden am 01.01.2026 aktiviert.</p>
            <p className="text-green-400 font-bold flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Ihr Zugang bleibt geschützt.
            </p>
          </div>
        </motion.div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-6 flex flex-col h-full ${
                plan.isPopular 
                  ? 'bg-gradient-to-b from-[#FE9100]/10 to-black border-[#FE9100] shadow-[0_0_30px_rgba(254,145,0,0.15)]' 
                  : 'bg-[#111] border-white/10'
              } border`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FE9100] text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  ⭐ Beliebteste Wahl
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{plan.name}</div>
                <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>{plan.role}</h3>
                
                {!plan.isFree && (
                  <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-[#FE9100] font-bold uppercase">Alpha-Preis (Jetzt)</div>
                      <div className="text-2xl font-bold text-white">{plan.alphaPrice}<span className="text-sm font-normal text-gray-500">/ Monat</span></div>
                      <div className="text-[10px] text-green-400">Preisgarantie aktiv</div>
                    </div>
                    
                    <div className="pt-3 border-t border-white/10">
                      <div className="text-[10px] text-gray-500 uppercase">Standard ab 01.01.2026</div>
                      <div className="text-lg font-bold text-gray-500 line-through Decoration-red-500">{plan.standardPrice}</div>
                    </div>

                    <div className="bg-[#FE9100]/10 p-2 rounded text-center border border-[#FE9100]/20">
                      <div className="text-[10px] text-white/70">Ihre Ersparnis</div>
                      <div className="text-[#FE9100] font-bold">{plan.savings}</div>
                      <div className="text-[10px] text-white/50">monatlich</div>
                    </div>
                  </div>
                )}

                {plan.isFree && (
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 min-h-[180px] flex flex-col justify-center">
                    <div className="text-2xl font-bold text-white mb-2">Kostenlos</div>
                    <p className="text-sm text-gray-400">Für alle Nutzer, die ARAS in kleinem Rahmen testen wollen.</p>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8 flex-grow">
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Enthalten</div>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-[#FE9100] shrink-0 mt-0.5" />
                    <span className="text-xs">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button 
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                  plan.isPopular 
                    ? 'bg-[#FE9100] text-black hover:bg-[#ffaa33] shadow-[0_0_15px_rgba(254,145,0,0.3)]' 
                    : plan.isFree
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {plan.isFree ? 'Kostenlos starten' : 'Plan wählen'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 🏢 Premium Footer Component
function PremiumFooter() {
  const [showSupportPanel, setShowSupportPanel] = useState(false);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const words = ['100% DSGVO-konform', 'Eigenes LLM', '500+ parallele Anrufe', 'Schweizer Qualität'];

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (typedText.length < currentWord.length) {
          setTypedText(currentWord.substring(0, typedText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (typedText.length > 0) {
          setTypedText(currentWord.substring(0, typedText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, currentWordIndex]);

  const footerLinks = {
    produkt: [
      { name: 'KI-Outbound-Telefonie', href: '#ki-outbound-telefonie' },
      { name: 'Voice AI für Vertrieb', href: '#voice-ai-vertrieb' },
      { name: 'B2B Telefonakquise', href: '#b2b-telefonakquise' },
      { name: 'CRM-Integration', href: '#crm-integration' },
      { name: 'Preise & Pakete', href: '#preise-pakete' }
    ],
    ressourcen: [
      { name: 'Blog: KI im Vertrieb', href: 'https://platform.aras.ai/blog' },
      { name: 'Use Cases & Branchen', href: 'https://platform.aras.ai/use-cases' },
      { name: 'API-Dokumentation', href: 'https://api.aras-ai.com' },
      { name: 'Whitepaper: ARAS Core LLM', href: 'https://www.aras-ai.com/whitepaper' },
      { name: 'ROI-Rechner', href: 'https://platform.aras.ai/roi-calculator' }
    ],
    support: [
      { name: 'Demo vereinbaren', href: 'https://platform.aras.ai/demo' },
      { name: 'support@aras-plattform.ai', href: 'mailto:support@aras-plattform.ai' },
      { name: 'Live-Chat', action: 'openSupport' },
      { name: 'Knowledge Base', href: 'https://help.aras-ai.com' },
      { name: 'ARAS AI Community', href: 'https://discord.gg/aras-ai' }
    ],
    rechtliches: [
      { name: 'Impressum', href: 'https://www.aras-ai.com/legal-notice' },
      { name: 'Datenschutzerklärung', href: 'https://www.aras-ai.com/privacy-policy' },
      { name: 'AGB', href: 'https://www.aras-ai.com/terms-and-conditions' },
      { name: 'Nutzungsbedingungen', href: 'https://www.aras-ai.com/terms-of-use' },
      { name: 'Cookie-Richtlinie', href: 'https://www.aras-ai.com/cookie-policy' },
      { name: 'Haftungsausschluss', href: 'https://www.aras-ai.com/disclaimer' },
      { name: 'Risikohinweis', href: 'https://www.aras-ai.com/risk-disclosure' },
      { name: 'KYC/AML Compliance', href: 'https://www.aras-ai.com/kycaml-compliance-notice' },
      { name: 'Token-Bedingungen', href: 'https://www.aras-ai.com/token-terms-conditions' }
    ]
  };

  const badges = [
    {
      id: 'swiss-made',
      text: 'SWISS ENGINEERED',
      tooltip: 'Entwickelt und betrieben in Zürich. Schweizer Qualität und Präzision für Ihre KI-Telefonie.'
    },
    {
      id: 'dsgvo-certified',
      text: '100% DSGVO-KONFORM',
      tooltip: 'Vollständige EU-DSGVO und Schweizer nDSG Compliance. Ihre Daten verlassen niemals die europäischen Server.'
    },
    {
      id: 'own-llm',
      text: 'EIGENES LLM (ARAS CORE)',
      tooltip: 'Keine Abhängigkeit von externen AI-Anbietern. Unser proprietäres Sprachmodell wurde speziell für Business-Telefonie entwickelt.'
    },
    {
      id: 'enterprise-ready',
      text: 'ENTERPRISE READY',
      tooltip: 'ISO-27001 zertifizierte Infrastruktur, SOC2 Typ II konform, mit 99.9% SLA Uptime-Garantie.'
    }
  ];

  return (
    <>
      <footer className="relative" style={{ background: 'transparent' }}>
        {/* Animated Top Border */}
        <motion.div
          className="h-[2px] w-full"
          style={{
            background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)',
            backgroundSize: '300% 100%'
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        <div className="max-w-[1400px] mx-auto px-12 pt-[120px] pb-[80px]">
          {/* EBENE 1: Brand Signature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-24"
          >
            <h2
              className="text-4xl font-black mb-3"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                color: '#e9d7c4'
              }}
            >
              ARAS AI – Die erste KI-Outbound-Telefonie-Plattform für skalierbaren B2B-Vertrieb
            </h2>
            <p className="text-white/50 mb-6">
              Powered by Schwarzott Capital Partners AG – Löwenstrasse 20, 8001 Zürich
            </p>
            
            {/* Typewriter Effect */}
            <div
              className="text-lg font-semibold"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #ffd700)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {typedText}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ color: '#FE9100' }}
              >
                .
              </motion.span>
            </div>
          </motion.div>

          {/* EBENE 2: Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
            {/* Produkt */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <h3
                className="text-lg font-black mb-6"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Produkt
              </h3>
              <ul className="space-y-3">
                {footerLinks.produkt.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      className="text-white/70 hover:text-[#FE9100] transition-colors duration-300 text-[15px]"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Ressourcen */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3
                className="text-lg font-black mb-6"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Ressourcen
              </h3>
              <ul className="space-y-3">
                {footerLinks.ressourcen.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-[#FE9100] transition-colors duration-300 text-[15px]"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h3
                className="text-lg font-black mb-6"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Support
              </h3>
              <ul className="space-y-3">
                {footerLinks.support.map((link, i) => (
                  <li key={i}>
                    {link.action === 'openSupport' ? (
                      <button
                        onClick={() => setShowSupportPanel(true)}
                        className="text-white/70 hover:text-[#FE9100] transition-colors duration-300 text-[15px] text-left"
                      >
                        {link.name}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        target={link.href?.startsWith('http') ? '_blank' : undefined}
                        rel={link.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-white/70 hover:text-[#FE9100] transition-colors duration-300 text-[15px]"
                      >
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Rechtliches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3
                className="text-lg font-black mb-6"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Rechtliches
              </h3>
              <ul className="space-y-3">
                {footerLinks.rechtliches.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-[#FE9100] transition-colors duration-300 text-[15px]"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* EBENE 3: Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 mb-16"
          >
            {badges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
                className="relative px-6 py-3 rounded-lg border cursor-help"
                style={{
                  borderColor: hoveredBadge === badge.id ? '#FE9100' : 'rgba(254, 145, 0, 0.3)',
                  background: 'rgba(254, 145, 0, 0.05)',
                  transition: 'all 0.3s'
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#e9d7c4'
                  }}
                >
                  {badge.text}
                </div>

                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredBadge === badge.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.25 }}
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-4 rounded-xl border z-50"
                      style={{
                        background: 'rgba(15, 15, 15, 0.95)',
                        backdropFilter: 'blur(12px)',
                        borderColor: '#FE9100'
                      }}
                    >
                      <p className="text-sm text-white/80 leading-relaxed">
                        {badge.tooltip}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>

          {/* EBENE 4: Copyright */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-center text-sm text-white/40">
              © 2026 ARAS AI – KI-gestützte Vertriebsautomatisierung by Schwarzott Capital Partners AG, Zürich.
              <br />
              Eigenes LLM • 500+ parallele Anrufe • DSGVO-konform • Swiss Made
            </p>
          </div>
        </div>
      </footer>

      {/* Support Panel */}
      <AnimatePresence>
        {showSupportPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSupportPanel(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full rounded-2xl border-t-4 p-8"
              style={{
                background: 'rgba(15, 15, 15, 0.65)',
                backdropFilter: 'blur(12px)',
                borderColor: '#FE9100'
              }}
            >
              <h3
                className="text-2xl font-black mb-6"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Support Center
              </h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[#FE9100] focus:outline-none transition-colors"
                    placeholder="Ihr Name"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">E-Mail</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[#FE9100] focus:outline-none transition-colors"
                    placeholder="ihre.email@beispiel.de"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Anliegen</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[#FE9100] focus:outline-none transition-colors resize-none"
                    placeholder="Beschreiben Sie Ihr Anliegen..."
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-3 rounded-xl font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                    color: '#000'
                  }}
                >
                  Ticket senden
                </motion.button>
                <button
                  onClick={() => setShowSupportPanel(false)}
                  className="px-6 py-3 rounded-xl text-white/60 hover:text-white/80 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// 📋 FAQ Accordion Component  
function FAQAccordion() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqs = [
    {
      id: 1,
      question: "Klingt ARAS wirklich wie ein Mensch?",
      answer: `ARAS arbeitet mit einer eigenen Voice-Engine, die klar, ruhig und professionell klingt.

Wir versprechen keine „perfekte Menschlichkeit", sondern realistische, verständliche und strukturierte Gespräche – ohne Roboterklang oder monotone Intonation.`
    },
    {
      id: 2,
      question: "Wie zuverlässig funktioniert ARAS bei echten Anrufen?",
      answer: `Die Plattform ist für den täglichen Betrieb in Unternehmen gebaut.

Typische Kennzahlen (Alpha-Durchschnitt):
• STT-Verständnis: >95%
• Drop-Rate: <3%
• Gesprächsverzögerung minimal (durchschnittlich 180–240ms)

ARAS prüft jede Antwort auf Logik, Kontext und Stabilität.`
    },
    {
      id: 3,
      question: "Kann ARAS mit schwierigen Gesprächspartnern umgehen?",
      answer: `Ja, ARAS erkennt:
• Unsicherheit
• Unterbrechungen
• Einwände
• Gesprächsabbrüche
• Füllwörter

ARAS reagiert mit definierter Struktur, nicht mit unkontrollierten Aussagen.`
    },
    {
      id: 4,
      question: "Ist ARAS für Kaltakquise rechtlich erlaubt?",
      answer: `ARAS hält sich vollständig an europäische Vorgaben.

Unternehmen dürfen Kaltakquise nur durchführen, wenn eine rechtliche Grundlage besteht (B2B-Interesse oder Opt-in).

ARAS setzt das technisch um:
• optionaler Hinweis „dies ist ein automatisierter Anruf"
• definierbare Gesprächsöffner
• Ereignisprotokollierung`
    },
    {
      id: 5,
      question: "Wo werden meine Daten gespeichert?",
      answer: `Ausschließlich in zertifizierten EU-Rechenzentren.

Keine US-Server, keine amerikanischen Clouds, kein externer Zugriff.

ARAS unterliegt dem Schweizer Datenschutz (nDSG) und der DSGVO.`
    },
    {
      id: 6,
      question: "Zeichnet ARAS Gespräche auf?",
      answer: `Nur wenn Sie das explizit aktivieren und die rechtliche Grundlage besteht.

Standardmäßig speichert ARAS keine Audiodaten, sondern nur:
• Zusammenfassung
• Gesprächsergebnis
• technische Metadaten`
    },
    {
      id: 7,
      question: "Wie sicher ist die Plattform technisch?",
      answer: `ARAS arbeitet mit:
• TLS 1.3
• AES-256 Datenverschlüsselung
• automatischer Schlüsselrotation
• Multi-Layer-Encryption bei sensiblen Daten
• Audit Trails`
    },
    {
      id: 8,
      question: "Wie viele Anrufe kann ARAS gleichzeitig führen?",
      answer: `Technisch möglich: bis zu 500 parallele Leitungen je Projekt.

In der Alpha sind die Werte kontrolliert limitiert, um Qualität sicherzustellen.`
    },
    {
      id: 9,
      question: "Wie werden die Preise in der Alpha garantiert?",
      answer: `Jeder Nutzer, der sich in der Alpha registriert, erhält einen unveränderbaren Preisanker.

Auch wenn die Enterprise-Preise ab dem 01.01.2026 aktiviert werden, bleibt Ihr Tarif stabil.`
    },
    {
      id: 10,
      question: "Brauche ich ein CRM oder spezielle Software?",
      answer: `Nein. ARAS funktioniert eigenständig.

Optional können angebunden werden:
• Salesforce
• HubSpot
• Make
• Zapier
• n8n`
    },
    {
      id: 11,
      question: "Kann ich ARAS für Inbound-Anrufe nutzen?",
      answer: `Inbound befindet sich in Entwicklung.

Alpha-Tester erhalten als Erste Zugang.`
    },
    {
      id: 12,
      question: "Wie läuft das Onboarding ab?",
      answer: `1. Registrierung
2. Projektanlage
3. Zieldefinition
4. Testanruf
5. Automatisierung oder Integration

Alpha-Nutzer erhalten bevorzugten Support und individuelle Erklärung der ersten Einrichtung.`
    }
  ];

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {faqs.map((faq, index) => (
        <motion.div
          key={faq.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: [0.25, 0.8, 0.25, 1]
          }}
          className="relative group cursor-pointer"
          onClick={() => toggleFAQ(faq.id)}
        >
          {/* Animated Border */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #e9d7c4)',
              backgroundSize: '200% 200%',
              padding: '1px'
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              opacity: openFAQ === faq.id ? 1.1 : 1
            }}
            transition={{
              backgroundPosition: {
                duration: 16,
                repeat: Infinity,
                ease: 'linear'
              },
              opacity: {
                duration: 0.35
              }
            }}
          >
            <div className="w-full h-full rounded-2xl" style={{ background: '#151515' }} />
          </motion.div>

          {/* Card Content */}
          <div
            className="relative rounded-2xl p-8"
            style={{
              background: '#151515',
              boxShadow: openFAQ === faq.id 
                ? '0 0 20px rgba(254, 145, 0, 0.2)' 
                : '0 8px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            {/* Question */}
            <div className="flex items-start justify-between gap-4">
              <h3
                className="text-lg font-black flex-1"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4',
                  letterSpacing: '0.5px'
                }}
              >
                {faq.question}
              </h3>
              <motion.div
                animate={{ rotate: openFAQ === faq.id ? 180 : 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
              >
                <ChevronDown
                  className="w-6 h-6 flex-shrink-0 transition-colors duration-300"
                  style={{
                    color: openFAQ === faq.id ? '#FE9100' : '#e9d7c4'
                  }}
                />
              </motion.div>
            </div>

            {/* Answer */}
            <AnimatePresence>
              {openFAQ === faq.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 text-[16px] text-white/70 leading-[1.55] whitespace-pre-line">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// 💎 Pricing Cards Component
function PricingCards() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'starter',
      name: 'STARTER',
      subtitle: 'ARAS Pro',
      alphaPrice: 59,
      futurePrice: 1990,
      savings: 1931,
      features: [
        '100 Outbound Calls pro Monat',
        '500 Chatnachrichten',
        'ARAS Konsole (Basic)',
        'Automatische Zusammenfassungen',
        'E-Mail Support'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'PRO',
      subtitle: 'ARAS Ultra',
      alphaPrice: 249,
      futurePrice: 4990,
      savings: 4741,
      features: [
        '1.000 Outbound Calls pro Monat',
        '10.000 Chatnachrichten',
        'ARAS Voice Model (erweitert)',
        'Mehrbenutzerzugang',
        'Erweiterte Analysen',
        'Priorisierter Support'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'ENTERPRISE',
      subtitle: 'ARAS Ultimate',
      alphaPrice: 1990,
      futurePrice: 19990,
      savings: 18000,
      features: [
        '10.000 Outbound Calls pro Monat',
        'Unbegrenzte Chatnachrichten',
        'Dediziertes ARAS Enterprise-LLM',
        'API & CRM Integrationen',
        'Swiss Hosting',
        '24/7 Support',
        'Early Access zu neuen Modulen'
      ],
      popular: false
    }
  ];

  return (
    <>
      {/* Main Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ 
              duration: 0.6, 
              delay: index * 0.12,
              ease: [0.25, 0.8, 0.25, 1]
            }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedPlan(plan.id)}
            className="cursor-pointer relative group"
          >
            {/* Popular Badge */}
            {plan.popular && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
              >
                <div
                  className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                    color: '#000'
                  }}
                >
                  ⭐ Beliebteste Wahl
                </div>
              </motion.div>
            )}

            {/* Animated Border */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)',
                backgroundSize: '300% 100%',
                padding: '1.5px'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 14,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              <div className="w-full h-full rounded-2xl" style={{ background: '#151515' }} />
            </motion.div>

            {/* Card Content */}
            <div className="relative rounded-2xl" style={{ 
              background: '#151515',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              padding: '48px 36px'
            }}>
              {/* Plan Name */}
              <h3
                className="text-2xl font-black mb-1"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                {plan.name}
              </h3>
              <p className="text-sm text-[#FE9100]/70 mb-8">
                {plan.subtitle}
              </p>

              {/* Alpha Price */}
              <div className="mb-6">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
                  Alpha-Preis (jetzt)
                </div>
                <motion.div
                  animate={{
                    textShadow: [
                      '0 0 0px rgba(254, 145, 0, 0)',
                      '0 0 8px rgba(254, 145, 0, 0.3)',
                      '0 0 0px rgba(254, 145, 0, 0)'
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex items-baseline gap-2"
                >
                  <span
                    className="text-5xl font-black"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      color: '#e9d7c4'
                    }}
                  >
                    €{plan.alphaPrice}
                  </span>
                  <span className="text-white/50">/ Monat</span>
                </motion.div>
                <p className="text-xs text-white/50 mt-2">
                  Ihre Preisgarantie bleibt bestehen.
                </p>
              </div>

              {/* Future Price */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="mb-6 p-4 rounded-xl"
                style={{
                  background: 'rgba(254, 145, 0, 0.05)',
                  border: '1px solid rgba(254, 145, 0, 0.2)'
                }}
              >
                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                  Standardpreis ab 01.01.2026
                </div>
                <div className="text-2xl font-bold text-white/40 line-through">
                  €{plan.futurePrice.toLocaleString()}
                </div>
              </motion.div>

              {/* Savings */}
              <div className="mb-8 p-4 rounded-xl" style={{
                background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.1), rgba(255, 215, 0, 0.1))',
                border: '1px solid rgba(254, 145, 0, 0.3)'
              }}>
                <div className="text-xs text-[#FE9100] font-bold uppercase tracking-wider mb-1">
                  Ihre Ersparnis
                </div>
                <div
                  className="text-xl font-black"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  €{plan.savings.toLocaleString()} monatlich
                </div>
                <p className="text-xs text-white/60 mt-1">
                  dauerhaft geschützt
                </p>
              </div>

              {/* Features */}
              <div className="mb-8">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-4">
                  Enthalten
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#FE9100] mt-0.5" />
                      <span className="text-[15px] text-white/70">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                  color: '#000',
                  boxShadow: '0 4px 16px rgba(254, 145, 0, 0.3)'
                }}
              >
                Plan wählen
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ARAS Free Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="max-w-3xl mx-auto"
      >
        <div
          className="rounded-2xl p-8 border"
          style={{
            background: 'rgba(21, 21, 21, 0.5)',
            borderColor: 'rgba(254, 145, 0, 0.2)'
          }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3
                className="text-xl font-black mb-2"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                ARAS Free
              </h3>
              <p className="text-white/60 mb-4">
                Kostenlos – dauerhaft
              </p>
              <p className="text-sm text-white/50 mb-4">
                Für alle Nutzer, die ARAS in kleinem Rahmen testen wollen.
              </p>
              <ul className="space-y-2">
                {['2 Outbound Calls', '10 Chatnachrichten', 'Zugriff auf ARAS Basic Console'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <CheckCircle2 className="w-4 h-4 text-[#FE9100]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-lg border font-semibold text-sm"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                borderColor: '#FE9100',
                color: '#FE9100'
              }}
            >
              Kostenlos starten
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Upgrade Panel */}
      <AnimatePresence>
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPlan(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full rounded-2xl border-t-4 p-8"
              style={{
                background: 'rgba(15, 15, 15, 0.65)',
                backdropFilter: 'blur(12px)',
                borderColor: '#FE9100'
              }}
            >
              <h3
                className="text-2xl font-black mb-4"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Plan wechseln zu {plans.find(p => p.id === selectedPlan)?.subtitle}
              </h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                Ihr Alpha-Preis von €{plans.find(p => p.id === selectedPlan)?.alphaPrice} bleibt dauerhaft erhalten.
              </p>
              <p className="text-sm text-white/60 mb-8">
                Sie sparen <span className="text-[#FE9100] font-bold">€{plans.find(p => p.id === selectedPlan)?.savings.toLocaleString()}</span> monatlich im Vergleich zum Standardpreis ab 2026.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-4 rounded-xl font-bold uppercase tracking-wider"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                  color: '#000'
                }}
              >
                Zugang aktivieren
              </motion.button>
              <button
                onClick={() => setSelectedPlan(null)}
                className="w-full mt-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
              >
                Abbrechen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// 🔒 Compliance Cards Component
function ComplianceCards() {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const securityPillars = [
    {
      icon: Globe,
      title: "Swiss Data Hosting",
      subtitle: "EU + CH Regulatorik",
      description: "Alle Daten werden ausschließlich in zertifizierten europäischen Rechenzentren gespeichert.",
      bullets: [
        "Keine Datenübertragung in die USA",
        "Kein Zugriff externer Dienstleister"
      ],
      details: `ARAS nutzt ausschließlich ISO-27001-zertifizierte Rechenzentren in der EU und der Schweiz. 
      
Ihre Daten verlassen niemals den europäischen Rechtsraum. Es gibt keine automatischen Backups in Drittländer, keine Cloud-Provider mit US-Muttergesellschaften und keine versteckten Datenpipelines.

Alle Hosting-Partner unterliegen der DSGVO und dem Schweizer Datenschutzgesetz (nDSG). Sie haben das Recht, jederzeit Auskunft über den Speicherort Ihrer Daten zu erhalten.`
    },
    {
      icon: Shield,
      title: "DSGVO- & nDSG-Konformität",
      subtitle: "Vollständige Compliance",
      description: "ARAS erfüllt sämtliche Anforderungen der EU-DSGVO sowie des Schweizer Datenschutzgesetzes.",
      bullets: [
        "Zweckbindung",
        "Datensparsamkeit",
        "Löschkonzepte",
        "dokumentierte Verarbeitungsprozesse",
        "Auditierbarkeit"
      ],
      details: `ARAS AI verarbeitet Telefonate, Texte und Systemmeldungen ausschließlich zweckgebunden und gemäß den europäischen Datenschutzstandards.

Dazu gehören:
• definierte Speicherfristen
• dokumentierte technische & organisatorische Maßnahmen
• Löschprozesse
• Datenschutzfolgeabschätzung (falls erforderlich)

Daten dürfen nur mit expliziter Freigabe exportiert oder übertragen werden. Jede Verarbeitung ist nachvollziehbar dokumentiert.`
    },
    {
      icon: Target,
      title: "Vollständige Protokollierung",
      subtitle: "Audit Trails",
      description: "Jeder relevante Vorgang wird revisionssicher erfasst:",
      bullets: [
        "Anrufe",
        "Systemzugriffe",
        "Datenverarbeitungen",
        "Aktualisierungen",
        "Nutzeraktionen"
      ],
      details: `ARAS protokolliert alle sicherheitsrelevanten Ereignisse in einem unveränderlichen Audit-Log.

Sie können jederzeit nachvollziehen:
• Wer hat wann auf welche Daten zugegriffen?
• Welche Anrufe wurden geführt?
• Welche Systemänderungen wurden vorgenommen?

Die Logs werden verschlüsselt gespeichert und können für Compliance-Prüfungen exportiert werden. Aufbewahrungsdauer: mindestens 12 Monate, konfigurierbar.`
    },
    {
      icon: Shield,
      title: "Verschlüsselung auf Bankniveau",
      subtitle: "Multi-Layer Encryption",
      description: "Schutz auf höchstem Niveau:",
      bullets: [
        "Transport: TLS 1.3",
        "Daten im Ruhezustand: AES-256",
        "Schlüsselrotation automatisch",
        "Multi-Layer Encryption für sensible Inhalte"
      ],
      details: `ARAS nutzt die gleichen Verschlüsselungsstandards wie Schweizer Banken.

Transport-Layer:
• TLS 1.3 für alle Verbindungen
• Perfect Forward Secrecy
• Certificate Pinning

Data-at-Rest:
• AES-256 Verschlüsselung
• Automatische Schlüsselrotation alle 90 Tage
• Hardware Security Modules (HSM) für Schlüsselverwaltung

Sensible Gesprächsinhalte werden zusätzlich mit kundenspezifischen Schlüsseln verschlüsselt.`
    },
    {
      icon: CheckCircle2,
      title: "Kontrollierbare KI",
      subtitle: "Keine Blackbox",
      description: "ARAS arbeitet mit einer transparenten Entscheidungslogik:",
      bullets: [
        "nachvollziehbare Antworten",
        "erklärbare Einwandbehandlung",
        "definierbare Gesprächsregeln",
        "keine unkontrollierten LLM-Ausgaben"
      ],
      details: `ARAS nutzt eine kombinierte Architektur:

• eigene Entscheidungslogik (Rulesets)
• gesicherte Prompt-Frameworks
• parameterisierte Gesprächspfade
• definierte Fallbacks

Die KI darf keine unkontrollierten Aussagen treffen – jede Antwort ist prüfbar.

Sie können jederzeit:
• Gesprächsregeln definieren
• Verbotene Themen festlegen
• Eskalationspfade konfigurieren
• Ausgaben validieren

Transparenz statt Blackbox.`
    }
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {securityPillars.map((pillar, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ 
              duration: 0.7, 
              delay: index * 0.15,
              ease: [0.25, 0.8, 0.25, 1]
            }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedCard(selectedCard === index ? null : index)}
            className="group cursor-pointer relative"
          >
            {/* Animated Border */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #e9d7c4)',
                backgroundSize: '200% 200%',
                padding: '1px'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              <div className="w-full h-full rounded-2xl" style={{ background: '#151515' }} />
            </motion.div>

            {/* Card Content */}
            <div className="relative p-9 rounded-2xl" style={{ 
              background: '#151515',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
            }}>
              {/* Icon */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.25 }}
                className="mb-6"
              >
                <pillar.icon 
                  className="w-12 h-12 transition-colors duration-300"
                  style={{
                    color: selectedCard === index ? '#FE9100' : '#e9d7c4'
                  }}
                />
              </motion.div>

              {/* Title */}
              <h3
                className="text-2xl font-black mb-2"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                {pillar.title}
              </h3>

              {/* Subtitle */}
              <p className="text-sm text-[#FE9100]/80 mb-4 font-semibold">
                {pillar.subtitle}
              </p>

              {/* Description */}
              <p className="text-[17px] text-white/70 leading-relaxed mb-4">
                {pillar.description}
              </p>

              {/* Bullets */}
              {pillar.bullets && (
                <ul className="space-y-2">
                  {pillar.bullets.map((bullet, i) => (
                    <li key={i} className="text-[15px] text-white/60 flex items-start gap-2">
                      <span className="text-[#FE9100] mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Click Indicator */}
              <motion.div
                className="mt-6 text-xs text-[#FE9100]/60 font-semibold uppercase tracking-wider"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {selectedCard === index ? '← Details ausblenden' : 'Klicken für Details →'}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedCard !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              className="rounded-2xl border-t-4 p-10"
              style={{
                background: 'rgba(15, 15, 15, 0.7)',
                backdropFilter: 'blur(14px)',
                borderColor: '#FE9100'
              }}
            >
              <h4
                className="text-2xl font-black mb-6"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                {securityPillars[selectedCard].title} — Technische Details
              </h4>
              <div className="text-[17px] text-white/70 leading-relaxed whitespace-pre-line">
                {securityPillars[selectedCard].details}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<'idle' | 'login' | 'signup'>('idle');
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [showFeaturesPanel, setShowFeaturesPanel] = useState(false);
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    // 🔥 BUSINESS INTELLIGENCE FIELDS
    company: "",
    website: "",
    industry: "",
    role: "",
    phone: "",
    language: "de",
    primaryGoal: ""
  });

  const [typedIndex, setTypedIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailError, setEmailError] = useState("");
  
  // 🔥 HERO FEATURE STATES
  const [benefitIndex, setBenefitIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  
  const HERO_BENEFITS = [
    { title: "10.000+ CALLS", subtitle: "Mit nur einem Klick starten" },
    { title: "NIE WIEDER", subtitle: "Kalte Akquise selbst machen" },
    { title: "24/7 SALES", subtitle: "Dein Vertrieb schläft nie" }
  ];

  // Rotate Benefits
  useEffect(() => {
    const interval = setInterval(() => {
      setBenefitIndex((prev) => (prev + 1) % HERO_BENEFITS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Countdown to 01.01.2026
  useEffect(() => {
    const targetDate = new Date('2026-01-01T00:00:00').getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      
      if (distance < 0) {
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real typewriter effect
  useEffect(() => {
    if (authMode !== 'idle') return;

    const currentText = AUTH_SUBLINES[subtitleIndex];
    
    if (typedLength < currentText.length) {
      // Typing character by character
      const timeout = setTimeout(() => {
        setTypedLength((prev) => prev + 1);
      }, 35);

      return () => clearTimeout(timeout);
    } else {
      // Pause after complete, then next sentence
      const timeout = setTimeout(() => {
        setTypedLength(0);
        setSubtitleIndex((prev) => (prev + 1) % AUTH_SUBLINES.length);
      }, 2200);

      return () => clearTimeout(timeout);
    }
  }, [authMode, subtitleIndex, typedLength]);

  // Reset when switching to form mode
  useEffect(() => {
    if (authMode !== 'idle') {
      setTypedLength(0);
      setSubtitleIndex(0);
    }
  }, [authMode]);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [registrationStep, setRegistrationStep] = useState(1); // 1: Personal, 2: Business, 3: AI Config, 4: Live Research
  const [isResearching, setIsResearching] = useState(false);
  const [researchStatus, setResearchStatus] = useState<string>("");
  const [researchProgress, setResearchProgress] = useState<number>(0);
  
  // Industry & Goal Options
  const industries = [
    { value: "real_estate", label: "Immobilien" },
    { value: "insurance", label: "Versicherungen" },
    { value: "b2b_services", label: "B2B Services" },
    { value: "healthcare", label: "Healthcare" },
    { value: "finance", label: "Finanzwesen" },
    { value: "ecommerce", label: "E-Commerce" },
    { value: "technology", label: "Technologie" },
    { value: "consulting", label: "Beratung" },
    { value: "other", label: "Andere" }
  ];
  
  const primaryGoals = [
    { value: "lead_generation", label: "Lead Generierung" },
    { value: "appointment_booking", label: "Terminbuchung" },
    { value: "customer_support", label: "Kundensupport" },
    { value: "sales_outreach", label: "Vertrieb" },
    { value: "market_research", label: "Marktforschung" },
    { value: "follow_up", label: "Nachfassen" }
  ];
  
  const roles = [
    { value: "ceo", label: "CEO / Geschäftsführer" },
    { value: "sales_manager", label: "Sales Manager" },
    { value: "marketing", label: "Marketing Manager" },
    { value: "founder", label: "Founder" },
    { value: "freelancer", label: "Freelancer" },
    { value: "other", label: "Andere" }
  ];

  // Animated counter for stats
  const [callsCount, setCallsCount] = useState(0);
  const [accuracyCount, setAccuracyCount] = useState(0);

  useEffect(() => {
    // Count up animation for calls
    const callsTimer = setInterval(() => {
      setCallsCount(prev => {
        if (prev >= 10000) {
          clearInterval(callsTimer);
          return 10000;
        }
        return prev + 150;
      });
    }, 20);

    // Count up animation for accuracy
    const accuracyTimer = setInterval(() => {
      setAccuracyCount(prev => {
        if (prev >= 99) {
          clearInterval(accuracyTimer);
          return 99;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      clearInterval(callsTimer);
      clearInterval(accuracyTimer);
    };
  }, []);

  // Real-time validators for ALL fields
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("");
      return true;
    }
    if (!emailRegex.test(email)) {
      setEmailError("❌ Ungültige E-Mail (z.B. max@firma.de)");
      return false;
    }
    setEmailError("✅ E-Mail ist gültig");
    return true;
  };

  const validateUsername = (username: string) => {
    if (!username) {
      setUsernameError("");
      return true;
    }
    if (username.length < 3) {
      setUsernameError("❌ Mindestens 3 Zeichen");
      return false;
    }
    if (username.length > 50) {
      setUsernameError("❌ Maximal 50 Zeichen");
      return false;
    }
    setUsernameError("✅ Username ist verfügbar");
    return true;
  };

  const validateWebsite = (website: string) => {
    if (!website || website.trim() === '') {
      setWebsiteError("");
      return true; // Optional field
    }
    
    // FLEXIBLE URL VALIDATION - accepts ALL formats
    // - https://firma.de
    // - http://firma.de
    // - www.firma.de
    // - firma.de
    const flexibleUrlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    if (!flexibleUrlRegex.test(website)) {
      setWebsiteError("❌ Ungültig (z.B. firma.de oder www.firma.de)");
      return false;
    }
    
    setWebsiteError("✅ Website ist gültig");
    return true;
  };

  const validateFirstName = (name: string) => {
    if (!name || name.trim() === '') {
      setFirstNameError("❌ Vorname ist erforderlich");
      return false;
    }
    if (name.trim().length < 2) {
      setFirstNameError("❌ Mindestens 2 Zeichen");
      return false;
    }
    setFirstNameError("✅ Sieht gut aus!");
    return true;
  };

  const validateLastName = (name: string) => {
    if (!name || name.trim() === '') {
      setLastNameError("❌ Nachname ist erforderlich");
      return false;
    }
    if (name.trim().length < 2) {
      setLastNameError("❌ Mindestens 2 Zeichen");
      return false;
    }
    setLastNameError("✅ Sieht gut aus!");
    return true;
  };

  const validateCompany = (company: string) => {
    if (!company || company.trim() === '') {
      setCompanyError("❌ Firmenname ist erforderlich");
      return false;
    }
    if (company.trim().length < 2) {
      setCompanyError("❌ Mindestens 2 Zeichen");
      return false;
    }
    setCompanyError("✅ Perfekt!");
    return true;
  };

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(null);
      setPasswordError("");
      return;
    }
    if (password.length < 6) {
      setPasswordStrength('weak');
      setPasswordError("⚠️ Zu kurz - mindestens 6 Zeichen");
    } else if (password.length < 10) {
      setPasswordStrength('medium');
      setPasswordError("✅ Akzeptabel - besser wären 10+ Zeichen");
    } else {
      setPasswordStrength('strong');
      setPasswordError("✅ Stark und sicher!");
    }
  };

  useEffect(() => {
    captureUTMParameters();
  }, []);

  useEffect(() => {
    const current = TYPED_LINES[typedIndex];
    const speed = isDeleting ? 50 : 100;

    const timer = setTimeout(() => {
      const currentLine = TYPED_LINES[typedIndex];

      if (!isDeleting && typedText === currentLine) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (!isDeleting) {
        setTypedText(currentLine.substring(0, typedText.length + 1));
      } else if (typedText.length > 0) {
        setTypedText(currentLine.substring(0, typedText.length - 1));
      } else {
        setIsDeleting(false);
        setTypedIndex((prev) => (prev + 1) % TYPED_LINES.length);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, typedIndex]);

  // Redirect after login
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/space");
    }
  }, [isLoading, user, setLocation]);

  // Show loader during auth check or redirect
  if (isLoading || (!isLoading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-[#FE9100]" />
        </motion.div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync(loginData);
      trackLogin('email', result?.id);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in."
      });
      setLocation("/space");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // STEP 1 VALIDATION - Personal Data
    if (registrationStep === 1) {
      // Check required fields
      if (!registerData.firstName) {
        toast({
          title: "Hey, wir brauchen deinen Vornamen! 😊",
          description: "Damit deine KI dich persönlich ansprechen kann.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.lastName) {
        toast({
          title: "Und deinen Nachnamen bitte! 👤",
          description: "Das macht's offizieller und persönlicher.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.email) {
        toast({
          title: "E-Mail fehlt noch! 📧",
          description: "Wir brauchen sie für wichtige Updates und Login.",
          variant: "destructive"
        });
        return;
      }
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerData.email)) {
        toast({
          title: "Hmm, die E-Mail sieht komisch aus 🤔",
          description: "Bitte gib eine gültige E-Mail-Adresse ein (z.B. max@firma.de)",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.username) {
        toast({
          title: "Username vergessen! 💭",
          description: "Wähle einen coolen Usernamen für dein Login.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.password) {
        toast({
          title: "Passwort fehlt! 🔐",
          description: "Ein sicheres Passwort schützt deinen Account.",
          variant: "destructive"
        });
        return;
      }
      // Password strength check
      if (registerData.password.length < 6) {
        toast({
          title: "Passwort zu kurz! ⚠️",
          description: "Mindestens 6 Zeichen sind nötig für deine Sicherheit.",
          variant: "destructive"
        });
        return;
      }
      
      setRegistrationStep(2);
      return;
    }
    
    // STEP 2 VALIDATION - Business Intelligence
    if (registrationStep === 2) {
      if (!registerData.company) {
        toast({
          title: "Firmenname fehlt! 🏢",
          description: "Damit deine KI weiß, für wen sie arbeitet.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.industry) {
        toast({
          title: "Branche wählen! 🎯",
          description: "Das hilft der KI, sich auf deine Branche zu spezialisieren.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.role) {
        toast({
          title: "Deine Position fehlt! 👔",
          description: "Sag uns, welche Rolle du im Unternehmen hast.",
          variant: "destructive"
        });
        return;
      }
      
      // Website validation (optional, but if provided must be valid)
      if (registerData.website && registerData.website.trim() !== '') {
        if (!validateWebsite(registerData.website)) {
          toast({
            title: "Website-Format nicht korrekt 🌐",
            description: "Bitte gib eine gültige URL ein (z.B. firma.de, www.firma.de oder https://firma.de). Alle Formate sind akzeptiert!",
            variant: "destructive"
          });
          return;
        }
        // Auto-add https:// ONLY if no protocol is present
        if (!registerData.website.startsWith('http://') && !registerData.website.startsWith('https://')) {
          setRegisterData(prev => ({ 
            ...prev, 
            website: `https://${prev.website}` 
          }));
        }
      }
      
      setRegistrationStep(3);
      return;
    }
    
    // STEP 3 - Move to Live Research
    if (registrationStep === 3) {
      if (!registerData.primaryGoal) {
        toast({
          title: "Was ist dein Hauptziel?",
          description: "Wähle aus, wobei die KI dir am meisten helfen soll.",
          variant: "destructive"
        });
        return;
      }
      
      // Move to Step 4: Live Research
      setRegistrationStep(4);
      setIsResearching(true);
      
      // START ARAS AI RESEARCH ANIMATION - NO ICONS!
      const researchSteps = [
        "Verbindung zu globalen Datenbanken wird hergestellt",
        `ARAS AI analysiert über 500+ Datenquellen zu ${registerData.company}`,
        "Scanne Unternehmenswebsite und Social Media Präsenz",
        "ARAS AI durchsucht Branchendatenbanken",
        "ARAS AI analysiert Unternehmens-DNA und Marktposition",
        "Analysiere Wettbewerber und Zielgruppen",
        "Identifiziere Kundenprofile und USPs",
        "Extrahiere Produkte, Services und Alleinstellungsmerkmale",
        "ARAS AI generiert personalisiertes Profil",
        "Fast fertig"
      ];
      
      let currentStep = 0;
      const stepInterval = setInterval(() => {
        if (currentStep < researchSteps.length) {
          setResearchStatus(researchSteps[currentStep]);
          setResearchProgress(Math.min(((currentStep + 1) / researchSteps.length) * 100, 95));
          currentStep++;
        }
      }, 2000);
      
      // Start actual registration after animation starts
      setTimeout(async () => {
        try {
          const result = await registerMutation.mutateAsync(registerData);
          trackSignup('email', result?.id);
          
          // FIXED: Show animation but redirect much faster (research continues in background)
          // The AI analysis happens server-side and will be ready when user arrives at /space
          setTimeout(() => {
            clearInterval(stepInterval);
            setResearchProgress(100);
            setResearchStatus("ULTRA-DEEP Research abgeschlossen! ARAS AI kennt jetzt ALLES über " + registerData.company + "!");
            
            // Redirect faster - research is done server-side
            setTimeout(() => {
              toast({
                title: "🎉 Willkommen bei ARAS AI Pro Research™!",
                description: `Hey ${registerData.firstName}! Deine KI hat ${registerData.company} komplett analysiert. Ready to blow your mind! 💪🔥`
              });
              setLocation("/space");
            }, 2000); // Reduced from 3000ms
          }, 12000); // Reduced from 28000ms - much faster but still shows animation
          
        } catch (error: any) {
          clearInterval(stepInterval);
          setIsResearching(false);
          
          console.error('[REGISTER-ERROR]', error);
          
          // Better error messages from server with DETAILED feedback
          let errorMessage = "Ups, da ist was schief gelaufen. Versuch's nochmal!";
          let errorTitle = "Registrierung fehlgeschlagen 😕";
          
          // Check if error message contains specific keywords
          const errorText = error.message || error.toString() || '';
          
          if (errorText.includes('email') || errorText.includes('E-Mail')) {
            errorTitle = "E-Mail bereits registriert! 📧";
            errorMessage = `Die E-Mail-Adresse "${registerData.email}" ist bereits bei uns registriert. Möchtest du dich stattdessen einloggen?`;
          } else if (errorText.includes('username') || errorText.includes('Benutzername')) {
            errorTitle = "Username bereits vergeben! 👤";
            errorMessage = `Der Username "${registerData.username}" ist leider schon vergeben. Bitte wähle einen anderen!`;
          } else if (errorText) {
            errorMessage = errorText;
          }
          
          // Show PROMINENT error toast
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "destructive",
            duration: 8000 // Show longer for errors
          });
          
          // Go back to appropriate step based on error
          if (errorText.includes('email') || errorText.includes('username')) {
            setRegistrationStep(1); // Go back to step 1 for user info
          } else {
            setRegistrationStep(3); // Go back to step 3 for other errors
          }
          
          setResearchStatus("");
          setResearchProgress(0);
        }
      }, 2000); // Start registration after 2 seconds of animation
      
      return;
    }
  };

  const goToPreviousStep = () => {
    if (registrationStep > 1) {
      setRegistrationStep(registrationStep - 1);
    }
  };

  // Render the new Matrix Hero Section
  return (
    <>
      <LanguageSwitcher />
      <ArasHeroSection />
    </>
  );
}


// 🚀 ARAS AI HERO SECTION - Ultra Premium Matrix Design
export function ArasHeroSection() {
  const [, setLocation] = useLocation();
  const [currentText, setCurrentText] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [cursorBlink, setCursorBlink] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const typewriterTexts = [
    "die Zukunft",
    "ein Ökosystem", 
    "eine Revolution",
    "dein Vertrieb",
    "grenzenlos"
  ];

  // Matrix Rain Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const chars = 'ARASAI01アラスエーアイ電話営業自動化VOICE';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const gradient = ctx.createLinearGradient(x, y - fontSize, x, y);
        gradient.addColorStop(0, 'rgba(254, 145, 0, 0.05)');
        gradient.addColorStop(0.5, 'rgba(254, 145, 0, 0.3)');
        gradient.addColorStop(1, '#FE9100');
        ctx.fillStyle = gradient;
        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 35);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Typewriter Effect
  useEffect(() => {
    const currentWord = typewriterTexts[currentText];
    const typingSpeed = isDeleting ? 40 : 80;
    
    const timer = setTimeout(() => {
      if (!isDeleting && displayedText === currentWord) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (!isDeleting) {
        setDisplayedText(currentWord.substring(0, displayedText.length + 1));
      } else if (displayedText.length > 0) {
        setDisplayedText(currentWord.substring(0, displayedText.length - 1));
      } else {
        setIsDeleting(false);
        setCurrentText((prev) => (prev + 1) % typewriterTexts.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentText]);

  // Cursor Blink
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorBlink(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: '#030303' }}>
      {/* Matrix Rain Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{ zIndex: 0 }}
      />

      {/* Animated Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ zIndex: 1 }}>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(254, 145, 0, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(254, 145, 0, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridMove 25s linear infinite',
        }} />
      </div>

      {/* Glowing Orbs - Hidden on small screens for performance */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute pointer-events-none hidden sm:block"
        style={{ top: '-15%', left: '-10%' }}
      >
        <div 
          className="rounded-full w-[300px] h-[300px] md:w-[450px] md:h-[450px] lg:w-[600px] lg:h-[600px]"
          style={{
            background: 'radial-gradient(circle, rgba(254, 145, 0, 0.15) 0%, rgba(254, 145, 0, 0.05) 40%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'pulseSlow 6s ease-in-out infinite',
          }}
        />
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="absolute pointer-events-none hidden sm:block"
        style={{ bottom: '-10%', right: '-5%' }}
      >
        <div 
          className="rounded-full w-[250px] h-[250px] md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px]"
          style={{
            background: 'radial-gradient(circle, rgba(233, 215, 196, 0.1) 0%, rgba(254, 145, 0, 0.05) 40%, transparent 70%)',
            filter: 'blur(50px)',
            animation: 'pulseSlow 8s ease-in-out infinite',
          }}
        />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        
        {/* Central Card with Animated Border */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative w-full max-w-4xl"
        >
          {/* Animated Gradient Border */}
          <div className="absolute -inset-[2px] rounded-3xl opacity-75 blur-sm" style={{
            background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
            backgroundSize: '400% 100%',
            animation: 'gradientShift 4s ease infinite',
          }} />
          <div className="absolute -inset-[1px] rounded-3xl" style={{
            background: 'linear-gradient(90deg, #FE9100, #e9d7c4, #FE9100, #a34e00, #FE9100)',
            backgroundSize: '400% 100%',
            animation: 'gradientShift 4s ease infinite',
          }} />
          
          {/* Card Content */}
          <div className="relative bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 lg:p-16">
            
            {/* Top Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center mb-4 sm:mb-6 md:mb-8"
            >
              <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border border-[#FE9100]/30 bg-[#FE9100]/5">
                <motion.div
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FE9100]"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[10px] sm:text-xs md:text-sm font-bold text-[#FE9100] tracking-wider sm:tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  ALPHA PHASE • EARLY ACCESS
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="text-center mb-3 sm:mb-4 md:mb-6"
            >
              <h1 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-2 sm:mb-4"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #ffffff 0%, #FE9100 50%, #e9d7c4 100%)',
                  backgroundSize: '200% 200%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'gradientShift 6s ease infinite',
                  textShadow: '0 0 80px rgba(254, 145, 0, 0.3)',
                }}
              >
                ARAS AI
              </h1>
            </motion.div>

            {/* Typewriter Subheadline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center mb-4 sm:mb-6 md:mb-8"
            >
              <div className="h-8 sm:h-10 md:h-12 lg:h-14 flex items-center justify-center">
                <span
                  className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-medium"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ARAS ist {displayedText}
                  <span 
                    className="inline-block ml-1 w-[2px] sm:w-[3px] h-[18px] sm:h-[22px] md:h-[26px] lg:h-[28px] bg-[#FE9100] align-middle"
                    style={{ opacity: cursorBlink ? 1 : 0, transition: 'opacity 0.1s' }}
                  />
                </span>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10"
            >
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/70 leading-relaxed mb-2 sm:mb-4">
                Natürlich klingende KI-Telefonate, präzise Automation 
                und <span className="text-[#FE9100]">Schweizer Datensicherheit</span>.
              </p>
              <p className="text-xs sm:text-sm md:text-base text-white/50">
                Die Plattform für Unternehmen, die modern skalieren – nicht experimentieren.
              </p>
            </motion.div>

            {/* Terminal Preview - Hidden on very small screens */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8 }}
              className="hidden xs:block max-w-xl mx-auto mb-6 sm:mb-8 md:mb-10 p-3 sm:p-4 bg-black/60 rounded-lg sm:rounded-xl border border-[#FE9100]/20"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500/80" />
                <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80" />
                <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500/80" />
                <span className="text-white/30 text-[10px] sm:text-xs ml-2 sm:ml-3 font-mono">aras-ai-terminal</span>
              </div>
              <div className="font-mono text-[10px] sm:text-xs md:text-sm text-[#FE9100]/80 space-y-0.5 sm:space-y-1">
                <p><span className="text-green-400">$</span> aras --init-voice-agent</p>
                <p className="text-white/50">→ Initialisiere KI-Sprachagent...</p>
                <p className="text-white/50 hidden sm:block">→ Verbinde mit CRM...</p>
                <p className="text-white/50 hidden sm:block">→ Lade Lead-Datenbank...</p>
                <motion.p 
                  className="text-green-400"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ✓ Bereit für 10.000+ Anrufe
                </motion.p>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
            >
              {/* Primary CTA - Signup/Alpha Access */}
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(254, 145, 0, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocation('/auth')}
                className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg text-white relative overflow-hidden group"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #FE9100, #a34e00)',
                  boxShadow: '0 0 25px rgba(254, 145, 0, 0.4)',
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Alpha-Zugang sichern
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#a34e00] to-[#FE9100] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>

              {/* Secondary CTA - Login */}
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: "rgba(254, 145, 0, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocation('/auth')}
                className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg text-[#FE9100] border-2 border-[#FE9100]/50 hover:border-[#FE9100] transition-all"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                <span className="flex items-center justify-center gap-2">
                  Anmelden
                  <span>↗</span>
                </span>
              </motion.button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="mt-6 sm:mt-8 md:mt-10 pt-4 sm:pt-6 md:pt-8 border-t border-white/10"
            >
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center items-center gap-3 sm:gap-6 md:gap-10 text-white/40 text-[10px] sm:text-xs md:text-sm">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <span className="text-[#FE9100]">🔒</span>
                  <span>DSGVO</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <span className="text-[#FE9100]">🇨🇭</span>
                  <span>Swiss</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <span className="text-[#FE9100]">⚡</span>
                  <span>Enterprise</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <span className="text-[#FE9100]">🎯</span>
                  <span>99.9%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom Branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8 }}
          className="mt-6 sm:mt-8 md:mt-12 text-center px-4"
        >
          <p className="text-white/20 text-[10px] sm:text-xs font-mono tracking-wider">
            ARAS AI® – Die Zukunft der KI-Kommunikation
          </p>
          <p className="text-white/10 text-[10px] sm:text-xs mt-1">
            Entwickelt von der Schwarzott Group
          </p>
        </motion.div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes pulseSlow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(60px, 60px); }
          }
        `
      }} />
    </div>
  );
}