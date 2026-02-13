import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SEOHead } from "@/components/seo-head";
import { useLanguage } from "@/lib/auto-translate";
import { getInvestorCopy, type Lang } from "@/config/investor-copy";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Shield,
  Mic,
  Settings2,
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Zap,
  Globe,
  TrendingUp,
  Users,
  Target,
  Rocket,
  Building2,
  AlertTriangle,
  BarChart3,
  Phone,
  ShieldCheck,
  Cpu,
  Eye,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Motion constants (repo-aligned: ease [0.32, 0.72, 0, 1])
// ---------------------------------------------------------------------------
const ease = [0.32, 0.72, 0, 1] as const;

function sectionVariants(reduced: boolean | null) {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0.05 : 0.6, ease },
    },
  };
}

function staggerContainer(reduced: boolean | null) {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: reduced ? 0 : 0.045 } },
  };
}

function itemVariant(reduced: boolean | null) {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0.05 : 0.45, ease },
    },
  };
}

// ---------------------------------------------------------------------------
// Scroll-reveal Section wrapper
// ---------------------------------------------------------------------------
function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      variants={sectionVariants(reduced)}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={cn("relative", className)}
    >
      {children}
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Eyebrow
// ---------------------------------------------------------------------------
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block font-orbitron tracking-[0.25em] uppercase text-[var(--aras-orange)] mb-4"
      style={{ fontSize: "clamp(0.65rem, 0.8vw, 0.75rem)" }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-orbitron font-bold text-white aras-headline-gradient inline-block mb-6"
      style={{
        fontSize: "clamp(1.8rem, 2.4vw, 2.6rem)",
        lineHeight: 1.1,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Glass card (premium V2)
// ---------------------------------------------------------------------------
function Glass({
  children,
  className,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[rgba(233,215,196,0.12)] p-6 md:p-8",
        glow && "shadow-[0_0_40px_rgba(254,145,0,0.06)]",
        className
      )}
      style={{
        background:
          "linear-gradient(145deg, rgba(254,145,0,0.03) 0%, rgba(10,10,10,0.82) 40%, rgba(233,215,196,0.015) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tilt card (subtle 2deg hover)
// ---------------------------------------------------------------------------
function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      ref.current.style.transform = `perspective(800px) rotateX(${-y * 2}deg) rotateY(${x * 2}deg) translateY(-4px)`;
    },
    [reduced]
  );

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform =
      "perspective(800px) rotateX(0) rotateY(0) translateY(0)";
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "rounded-3xl border border-[rgba(233,215,196,0.10)] p-6 md:p-7 transition-shadow duration-300",
        "hover:shadow-[0_0_30px_rgba(254,145,0,0.08)] hover:border-[rgba(254,145,0,0.25)]",
        className
      )}
      style={{
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(10,10,10,0.75) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        transition:
          "transform 0.3s cubic-bezier(0.32,0.72,0,1), box-shadow 0.3s ease, border-color 0.3s ease",
        willChange: "transform",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scroll Progress Bar
// ---------------------------------------------------------------------------
function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [progress, setProgress] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!reduced) setProgress(v);
  });

  if (reduced) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-[2px]">
      <motion.div
        className="h-full origin-left"
        style={{
          scaleX: progress,
          background:
            "linear-gradient(90deg, var(--aras-orange), var(--aras-gold))",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Rail (desktop only)
// ---------------------------------------------------------------------------
function SectionRail({
  sections,
  activeId,
}: {
  sections: { id: string; label: string }[];
  activeId: string;
}) {
  return (
    <nav className="hidden xl:flex fixed left-6 2xl:left-10 top-[120px] z-50 flex-col gap-2.5 w-[200px]">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
          }}
          className={cn(
            "text-[13px] leading-tight py-1.5 px-3 rounded-lg transition-all duration-300 font-medium",
            activeId === s.id
              ? "text-[var(--aras-orange)] bg-[var(--aras-orange)]/[0.08] border-l-2 border-[var(--aras-orange)]"
              : "text-white/40 hover:text-white/65 border-l-2 border-transparent"
          )}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Floating mobile CTA
// ---------------------------------------------------------------------------
function FloatingCTA({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="xl:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(254,145,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aras-orange)]"
      style={{
        background: "linear-gradient(135deg, var(--aras-orange), #a34e00)",
      }}
      aria-label={label}
    >
      <ArrowRight className="w-5 h-5 text-white" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Language Toggle (inline, glass)
// ---------------------------------------------------------------------------
function LangToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
      {(["de", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLanguage(l)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold font-orbitron uppercase transition-all duration-200",
            language === l
              ? "text-black bg-gradient-to-br from-[var(--aras-gold)] to-[var(--aras-orange)] shadow-[0_0_12px_rgba(254,145,0,0.3)]"
              : "text-white/50 hover:text-white/70"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useActiveSection — tracks which section is visible
// ---------------------------------------------------------------------------
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] || "");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);

  return active;
}

// ---------------------------------------------------------------------------
// Lead form schema + component
// ---------------------------------------------------------------------------
const leadSchema = z.object({
  name: z.string().min(2),
  firm: z.string().min(2),
  email: z.string().email(),
  ticketSize: z.string().optional(),
  thesis: z.string().max(800).optional(),
  website: z.string().optional(),
  requestType: z.enum(["data_room", "intro_call"]).optional(),
  lang: z.string().optional(),
  companyWebsite2: z.string().optional(), // honeypot
});

type LeadData = z.infer<typeof leadSchema>;

function LeadForm({
  formType,
  lang,
}: {
  formType: "data_room" | "intro_call";
  lang: Lang;
}) {
  const copy = getInvestorCopy(lang);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LeadData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { requestType: formType, lang },
  });

  useEffect(() => {
    setValue("requestType", formType);
    setValue("lang", lang);
  }, [formType, lang, setValue]);

  const onSubmit = async (data: LeadData) => {
    // Honeypot check
    if (data.companyWebsite2) {
      setStatus("success");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/investors/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyWebsite2: undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "Error");
      setStatus("success");
      reset();
    } catch (err: any) {
      setErrorMsg(err.message || "Request failed");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        <p className="text-lg font-semibold text-white">{copy.form.success}</p>
        <p className="text-sm text-white/50">{copy.form.successSub}</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-2 text-xs text-[var(--aras-orange)] underline underline-offset-4 hover:text-white transition-colors"
        >
          {copy.form.another}
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[var(--aras-orange)]/40 focus:border-[var(--aras-orange)]/30 transition-all duration-200";
  const labelCls =
    "block text-[11px] font-semibold text-[var(--aras-gold)] mb-1.5 tracking-wider uppercase";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Honeypot — hidden from humans */}
      <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
        <input {...register("companyWebsite2")} tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{copy.form.fields.name}</label>
          <input {...register("name")} placeholder="Max Mustermann" className={inputCls} />
          {errors.name && (
            <p className="text-[13px] text-[var(--aras-orange)] mt-1">{copy.form.errors.name}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>{copy.form.fields.firm}</label>
          <input {...register("firm")} placeholder="Firm / Family Office" className={inputCls} />
          {errors.firm && (
            <p className="text-[13px] text-[var(--aras-orange)] mt-1">{copy.form.errors.firm}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{copy.form.fields.email}</label>
          <input {...register("email")} type="email" placeholder="you@firm.com" className={inputCls} />
          {errors.email && (
            <p className="text-[13px] text-[var(--aras-orange)] mt-1">{copy.form.errors.email}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>{copy.form.fields.ticketSize}</label>
          <select {...register("ticketSize")} className={inputCls}>
            <option value="">—</option>
            {copy.form.fields.ticketOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>{copy.form.fields.website}</label>
        <input {...register("website")} placeholder="https://..." className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>{copy.form.fields.thesis}</label>
        <textarea
          {...register("thesis")}
          rows={3}
          placeholder={copy.form.fields.thesisPlaceholder}
          className={cn(inputCls, "resize-none")}
        />
      </div>

      {status === "error" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-300">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="aras-btn--primary w-full h-13 rounded-2xl font-orbitron text-sm font-semibold relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aras-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {status === "loading"
            ? "…"
            : formType === "intro_call"
              ? copy.form.submit.introCall
              : copy.form.submit.dataRoom}
        </span>
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Icon map for moat cards
// ---------------------------------------------------------------------------
const moatIcons = [ShieldCheck, Eye, Settings2, Cpu];
const fundingIcons = [Layers, Rocket, Shield, BarChart3];

// ===========================================================================
// MAIN PAGE COMPONENT
// ===========================================================================
export default function InvestorsV2Page() {
  const reduced = useReducedMotion();
  const { language } = useLanguage();
  const lang = language as Lang;
  const copy = useMemo(() => getInvestorCopy(lang), [lang]);

  const [formType, setFormType] = useState<"data_room" | "intro_call">("data_room");
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = useCallback(
    (type: "data_room" | "intro_call") => {
      setFormType(type);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    },
    []
  );

  const sectionIds = useMemo(
    () => copy.nav.sections.map((s) => s.id),
    [copy.nav.sections]
  );
  const activeSection = useActiveSection(sectionIds);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title={copy.seo.title}
        description={copy.seo.description}
        url="https://www.plattform-aras.ai/investors"
      />

      <ScrollProgress />
      <SectionRail sections={copy.nav.sections} activeId={activeSection} />
      <FloatingCTA
        label={copy.hero.ctaPrimary}
        onClick={() => scrollToForm("data_room")}
      />

      {/* ── Background layers ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
        {/* Top glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 45% at 50% -5%, rgba(254,145,0,0.14) 0%, transparent 65%)",
          }}
        />
        {/* Bottom glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 35% at 50% 105%, rgba(233,215,196,0.06) 0%, transparent 60%)",
          }}
        />
        {/* Center subtle sweep */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 30% 50%, rgba(254,145,0,0.04) 0%, transparent 70%)",
          }}
        />
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "256px",
          }}
        />
      </div>

      {/* ── Main content column ── */}
      <div
        className="relative mx-auto xl:ml-[240px] 2xl:ml-[260px]"
        style={{ maxWidth: 1160, paddingInline: "clamp(16px, 3vw, 24px)" }}
      >
        {/* ─────────── HERO ─────────── */}
        <section id="hero" className="pt-10 lg:pt-16 pb-20 lg:pb-28">
          {/* Lang toggle */}
          <div className="flex justify-end mb-8">
            <LangToggle />
          </div>

          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0.05 : 0.7, ease }}
          >
            <Eyebrow>{copy.hero.eyebrow}</Eyebrow>

            <h1
              className="font-orbitron font-bold aras-headline-gradient whitespace-pre-line"
              style={{
                fontSize: "clamp(2.6rem, 6vw, 5.3rem)",
                lineHeight: 0.98,
                letterSpacing: "-0.02em",
              }}
            >
              {copy.hero.headline}
            </h1>

            <p
              className="mt-7 text-[var(--aras-gold)]/60 leading-[1.6]"
              style={{
                fontSize: "clamp(1.05rem, 1.4vw, 1.35rem)",
                maxWidth: 780,
              }}
            >
              {copy.hero.subheadline}
            </p>

            {/* Microfacts */}
            <div className="flex flex-wrap gap-3 mt-8">
              {copy.hero.microfacts.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-white/70 border border-white/[0.08] bg-white/[0.03]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--aras-orange)]" />
                  {f}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mt-10">
              <button
                onClick={() => scrollToForm("data_room")}
                className="aras-btn--primary h-13 px-8 rounded-2xl font-orbitron text-sm font-semibold relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aras-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {copy.hero.ctaPrimary}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
              <button
                onClick={() => scrollToForm("intro_call")}
                className="h-13 px-8 rounded-2xl text-sm font-medium bg-white/[0.05] border border-white/[0.1] text-white/80 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.18] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                {copy.hero.ctaSecondary}
              </button>
            </div>

            {/* Note */}
            <p className="mt-6 text-[11px] text-white/30 max-w-lg">
              {copy.hero.note}
            </p>
          </motion.div>
        </section>

        {/* ─────────── THE PROBLEM ─────────── */}
        <Section id="problem" className="py-20 lg:py-28">
          <Eyebrow>{copy.problem.eyebrow}</Eyebrow>
          <SectionTitle>{copy.problem.title}</SectionTitle>

          <div className="max-w-3xl space-y-5 mb-12">
            {copy.problem.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-[15px] md:text-base text-white/55 leading-[1.75]"
              >
                {p}
              </p>
            ))}
          </div>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {copy.problem.stats.map((s) => (
              <motion.div key={s.label} variants={itemVariant(reduced)}>
                <Glass className="text-center py-6 px-4">
                  <p className="font-orbitron text-2xl md:text-3xl font-bold aras-headline-gradient inline-block">
                    {s.value}
                  </p>
                  <p className="text-xs text-white/45 mt-2 leading-snug">
                    {s.label}
                  </p>
                </Glass>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ─────────── WHAT ARAS IS ─────────── */}
        <Section id="platform" className="py-20 lg:py-28">
          <Eyebrow>{copy.whatArasIs.eyebrow}</Eyebrow>
          <SectionTitle>{copy.whatArasIs.title}</SectionTitle>

          <p className="text-[15px] md:text-base text-white/55 leading-[1.75] max-w-3xl mb-10">
            {copy.whatArasIs.intro}
          </p>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="space-y-3 max-w-2xl"
          >
            {copy.whatArasIs.layers.map((layer, i) => (
              <motion.div key={layer.title} variants={itemVariant(reduced)}>
                <div
                  className="rounded-2xl border border-white/[0.08] p-5 md:p-6 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(145deg, rgba(254,145,0,${0.025 + i * 0.015}) 0%, rgba(10,10,10,0.85) 100%)`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[var(--aras-orange)]/10 flex items-center justify-center text-[var(--aras-orange)] font-orbitron text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <h3
                      className="font-orbitron font-semibold text-white"
                      style={{ fontSize: "clamp(0.85rem, 1vw, 0.95rem)" }}
                    >
                      {layer.title}
                    </h3>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed pl-11">
                    {layer.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ─────────── WHY WE WIN ─────────── */}
        <Section id="moat" className="py-20 lg:py-28">
          <Eyebrow>{copy.whyWeWin.eyebrow}</Eyebrow>
          <SectionTitle>{copy.whyWeWin.title}</SectionTitle>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {copy.whyWeWin.cards.map((card, i) => {
              const Icon = moatIcons[i] || Shield;
              return (
                <motion.div key={card.title} variants={itemVariant(reduced)}>
                  <TiltCard className="h-full">
                    <Icon className="w-6 h-6 text-[var(--aras-orange)] mb-4" />
                    <h3
                      className="font-orbitron font-semibold text-white mb-3"
                      style={{ fontSize: "clamp(0.85rem, 1vw, 0.95rem)" }}
                    >
                      {card.title}
                    </h3>
                    <p className="text-sm text-white/50 leading-[1.7]">
                      {card.description}
                    </p>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* ─────────── TRACTION ─────────── */}
        <Section id="traction" className="py-20 lg:py-28">
          <Eyebrow>{copy.traction.eyebrow}</Eyebrow>
          <SectionTitle>{copy.traction.title}</SectionTitle>

          <p className="text-[15px] md:text-base text-white/55 leading-[1.75] max-w-3xl mb-8">
            {copy.traction.intro}
          </p>

          <Glass className="max-w-2xl mb-12" glow>
            <ul className="space-y-3.5">
              {copy.traction.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/65 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--aras-orange)] mt-2 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </Glass>

          <h3
            className="font-orbitron font-semibold text-white mb-6"
            style={{ fontSize: "clamp(1rem, 1.2vw, 1.15rem)" }}
          >
            {copy.traction.timelineTitle}
          </h3>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="space-y-1 max-w-lg"
          >
            {copy.traction.timeline.map((item, i) => (
              <motion.div
                key={item.label}
                variants={itemVariant(reduced)}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--aras-orange)] shadow-[0_0_8px_rgba(254,145,0,0.5)]" />
                  {i < copy.traction.timeline.length - 1 && (
                    <div className="w-px h-10 bg-gradient-to-b from-[var(--aras-orange)]/40 to-transparent" />
                  )}
                </div>
                <div className="-mt-0.5">
                  <span className="font-orbitron text-xs font-semibold text-[var(--aras-orange)]">
                    {item.label}
                  </span>
                  <p className="text-sm text-white/55 mt-0.5">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ─────────── GO-TO-MARKET ─────────── */}
        <Section id="gtm" className="py-20 lg:py-28">
          <Eyebrow>{copy.gtm.eyebrow}</Eyebrow>
          <SectionTitle>{copy.gtm.title}</SectionTitle>

          <p className="text-[15px] md:text-base text-white/55 leading-[1.75] max-w-3xl mb-10">
            {copy.gtm.intro}
          </p>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {copy.gtm.phases.map((phase) => (
              <motion.div key={phase.time} variants={itemVariant(reduced)}>
                <TiltCard className="h-full">
                  <span className="font-orbitron text-xs font-bold text-[var(--aras-orange)]">
                    {phase.time}
                  </span>
                  <h3
                    className="font-orbitron font-semibold text-white mt-2 mb-2.5"
                    style={{ fontSize: "clamp(0.85rem, 1vw, 0.95rem)" }}
                  >
                    {phase.title}
                  </h3>
                  <p className="text-sm text-white/50 leading-[1.7]">
                    {phase.description}
                  </p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <Glass className="inline-block">
            <p className="text-sm text-white/60">
              <Target className="w-4 h-4 text-[var(--aras-orange)] inline mr-2 -mt-0.5" />
              {copy.gtm.beachhead}
            </p>
          </Glass>
        </Section>

        {/* ─────────── BUSINESS MODEL ─────────── */}
        <Section id="model" className="py-20 lg:py-28">
          <Eyebrow>{copy.businessModel.eyebrow}</Eyebrow>
          <SectionTitle>{copy.businessModel.title}</SectionTitle>

          <p className="text-[15px] md:text-base text-white/55 leading-[1.75] max-w-3xl mb-10">
            {copy.businessModel.intro}
          </p>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
          >
            {copy.businessModel.models.map((m, i) => {
              const icons = [Building2, Phone, Users];
              const Icon = icons[i] || Building2;
              return (
                <motion.div key={m.title} variants={itemVariant(reduced)}>
                  <Glass className="h-full">
                    <Icon className="w-6 h-6 text-[var(--aras-orange)] mb-4" />
                    <h3
                      className="font-orbitron font-semibold text-white mb-2"
                      style={{ fontSize: "clamp(0.85rem, 1vw, 0.95rem)" }}
                    >
                      {m.title}
                    </h3>
                    <p className="text-sm text-white/50 leading-[1.7]">
                      {m.description}
                    </p>
                  </Glass>
                </motion.div>
              );
            })}
          </motion.div>

          <p className="text-xs text-white/30 max-w-xl">{copy.businessModel.note}</p>
        </Section>

        {/* ─────────── FUNDING ─────────── */}
        <Section id="funding" className="py-20 lg:py-28">
          <Eyebrow>{copy.funding.eyebrow}</Eyebrow>
          <SectionTitle>{copy.funding.title}</SectionTitle>

          <p className="text-[15px] md:text-base text-white/55 leading-[1.75] max-w-3xl mb-10">
            {copy.funding.intro}
          </p>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12"
          >
            {copy.funding.areas.map((area, i) => {
              const Icon = fundingIcons[i] || Layers;
              return (
                <motion.div key={area.label} variants={itemVariant(reduced)}>
                  <Glass className="text-center py-6">
                    <Icon className="w-6 h-6 text-[var(--aras-orange)] mx-auto mb-2.5" />
                    <p className="font-orbitron text-xs font-semibold text-white">
                      {area.label}
                    </p>
                  </Glass>
                </motion.div>
              );
            })}
          </motion.div>

          <h3
            className="font-orbitron font-semibold text-white mb-6"
            style={{ fontSize: "clamp(1rem, 1.2vw, 1.15rem)" }}
          >
            {copy.funding.milestoneTitle}
          </h3>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="space-y-1 max-w-lg mb-8"
          >
            {copy.funding.milestones.map((ms, i) => (
              <motion.div
                key={ms.time}
                variants={itemVariant(reduced)}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--aras-orange)] shadow-[0_0_8px_rgba(254,145,0,0.5)]" />
                  {i < copy.funding.milestones.length - 1 && (
                    <div className="w-px h-10 bg-gradient-to-b from-[var(--aras-orange)]/40 to-transparent" />
                  )}
                </div>
                <div className="-mt-0.5">
                  <span className="font-orbitron text-xs font-bold text-[var(--aras-orange)]">
                    {ms.time}
                  </span>
                  <p className="text-sm text-white/60 mt-0.5">{ms.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-sm text-white/40 max-w-xl leading-relaxed">
            {copy.funding.terms}
          </p>
        </Section>

        {/* ─────────── RISKS ─────────── */}
        <Section id="risks" className="py-20 lg:py-28">
          <Eyebrow>{copy.risks.eyebrow}</Eyebrow>
          <SectionTitle>{copy.risks.title}</SectionTitle>

          <p className="text-[15px] md:text-base text-white/55 leading-[1.75] max-w-3xl mb-10">
            {copy.risks.intro}
          </p>

          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {copy.risks.items.map((item) => (
              <motion.div key={item.risk} variants={itemVariant(reduced)}>
                <Glass className="h-full">
                  <div className="flex items-center gap-2.5 mb-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--aras-orange)]" />
                    <h3
                      className="font-orbitron font-semibold text-white"
                      style={{ fontSize: "clamp(0.82rem, 1vw, 0.92rem)" }}
                    >
                      {item.risk}
                    </h3>
                  </div>
                  <p className="text-sm text-white/50 leading-[1.7]">
                    {item.mitigation}
                  </p>
                </Glass>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ─────────── FAQ ─────────── */}
        <Section id="faq" className="py-20 lg:py-28">
          <Eyebrow>{copy.faq.eyebrow}</Eyebrow>
          <SectionTitle>{copy.faq.title}</SectionTitle>

          <div className="max-w-3xl">
            <Accordion type="single" collapsible className="space-y-2.5">
              {copy.faq.items.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-white/[0.08] rounded-2xl px-5 md:px-6 overflow-hidden data-[state=open]:border-[var(--aras-orange)]/20 transition-colors"
                >
                  <AccordionTrigger className="text-left text-sm font-medium text-white hover:no-underline hover:text-[var(--aras-orange)] transition-colors py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/50 leading-[1.7]">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Section>

        {/* ─────────── CONTACT / LEAD FORM ─────────── */}
        <Section id="contact" className="py-20 lg:py-28">
          <div ref={formRef} className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <Eyebrow>{copy.form.eyebrow}</Eyebrow>
              <SectionTitle>{copy.form.title}</SectionTitle>
              <p className="text-sm text-white/45 mt-2 max-w-md mx-auto">
                {copy.form.subtitle}
              </p>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              {(
                [
                  { value: "data_room" as const, label: copy.form.tabs.dataRoom },
                  { value: "intro_call" as const, label: copy.form.tabs.introCall },
                ]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormType(opt.value)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    formType === opt.value
                      ? "bg-[var(--aras-orange)]/12 text-[var(--aras-orange)] border border-[var(--aras-orange)]/25"
                      : "text-white/40 hover:text-white/60 border border-transparent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Glass glow>
              <LeadForm formType={formType} lang={lang} />
            </Glass>
          </div>
        </Section>

        {/* ─────────── FOOTER ─────────── */}
        <footer className="border-t border-white/[0.05] py-10 mt-4 mb-8">
          <p className="text-[11px] text-white/25 leading-relaxed max-w-3xl">
            {copy.footer}
          </p>
        </footer>
      </div>
    </div>
  );
}
