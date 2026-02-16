import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Sun, Check, Loader2, Eye, EyeOff, AlertCircle, ArrowRight, RefreshCw, ChevronDown, Phone, CalendarCheck, Bell, UserCheck, Clock, Zap, ShieldCheck, HelpCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AuthTab = "register" | "login";

interface RegisterFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  company: string;
}

interface LoginFields {
  username: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Stepper items (UI-only, shown during register loading)
// ---------------------------------------------------------------------------
const REGISTER_STEPS = [
  "Account wird erstellt",
  "Solar-Profil wird vorbereitet",
  "Dashboard wird geladen",
] as const;

// ---------------------------------------------------------------------------
// Error mapper — no tech details, user-friendly German
// ---------------------------------------------------------------------------
function mapRegisterError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("e-mail") && lower.includes("registriert")) {
    return "Diese E-Mail ist bereits registriert. Bitte einloggen.";
  }
  if (lower.includes("email") && (lower.includes("exist") || lower.includes("registr"))) {
    return "Diese E-Mail ist bereits registriert. Bitte einloggen.";
  }
  if (lower.includes("benutzername") || lower.includes("username")) {
    return "Dieser Benutzername ist bereits vergeben. Bitte versuche es erneut.";
  }
  if (lower.includes("telefon") || lower.includes("phone")) {
    return "Bitte gib eine gültige Telefonnummer ein (mindestens 8 Zeichen).";
  }
  if (lower.includes("passwort") || lower.includes("password")) {
    return "Dein Passwort erfüllt nicht die Mindestanforderungen. Mindestens 6 Zeichen.";
  }
  if (lower.includes("failed to fetch") || lower.includes("load failed") || lower.includes("network")) {
    return "Kurzzeitiges Problem. Bitte erneut versuchen.";
  }
  return msg || "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
}

function mapLoginError(msg: string, code?: string): string {
  if (code === "ACCOUNT_DISABLED") {
    return "Dein Account wurde deaktiviert. Bitte kontaktiere den Support.";
  }
  if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("ungültig")) {
    return "Ungültige Anmeldedaten. Bitte überprüfe Benutzername und Passwort.";
  }
  if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
    return "Kurzzeitiges Problem. Bitte erneut versuchen.";
  }
  return msg || "Login fehlgeschlagen. Bitte erneut versuchen.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SolarLandingPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/space");
    }
  }, [authLoading, user, setLocation]);

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [tab, setTab] = useState<AuthTab>("register");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // UTM tracking: parse query params → localStorage (client-only, not sent to backend)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      const utm: Record<string, string> = {};
      for (const key of utmKeys) {
        const val = params.get(key);
        if (val) utm[key] = val;
      }
      if (Object.keys(utm).length > 0) {
        localStorage.setItem("aras_utm", JSON.stringify({ ...utm, ts: Date.now() }));
      }
    } catch {
      // localStorage unavailable — silently ignore
    }
  }, []);

  // Register
  const [reg, setReg] = useState<RegisterFields>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    company: "",
  });

  // Login
  const [login, setLogin] = useState<LoginFields>({
    username: "",
    password: "",
  });

  // Loading stepper
  const [stepperIdx, setStepperIdx] = useState(-1);
  const stepperInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStepper = useCallback(() => {
    if (stepperInterval.current) {
      clearInterval(stepperInterval.current);
      stepperInterval.current = null;
    }
    setStepperIdx(-1);
  }, []);

  const startStepper = useCallback(() => {
    setStepperIdx(0);
    let idx = 0;
    stepperInterval.current = setInterval(() => {
      idx++;
      if (idx < REGISTER_STEPS.length) {
        setStepperIdx(idx);
      } else {
        // stay on last step until completion
      }
    }, 1800);
  }, []);

  // ---------------------------------------------------------------------------
  // Register mutation
  // ---------------------------------------------------------------------------
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFields) => {
      const username =
        data.email.split("@")[0] + "_" + Math.random().toString(36).substring(2, 6);

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username,
          password: data.password,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          company: data.company,
          industry: "Solar / Erneuerbare Energien",
          role: "",
          language: "de",
          primaryGoal: "lead_generation",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Registration failed" }));
        const err = new Error(body.message || "Registration failed");
        (err as any).status = res.status;
        throw err;
      }
      return res.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/user"], userData);
    },
  });

  // ---------------------------------------------------------------------------
  // Login mutation
  // ---------------------------------------------------------------------------
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFields) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Login failed" }));
        const err = new Error(body.message || "Login failed");
        (err as any).code = body.code;
        (err as any).status = res.status;
        throw err;
      }
      return res.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/user"], userData);
      setLocation("/space");
    },
  });

  // ---------------------------------------------------------------------------
  // Submit handlers
  // ---------------------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsNetworkError(false);

    // Anti-bot: honeypot check
    if (honeypot) { return; }

    // Client-side validation
    if (!reg.firstName.trim()) { setError("Bitte gib deinen Vornamen ein."); return; }
    if (!reg.email.trim()) { setError("Bitte gib deine E-Mail-Adresse ein."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reg.email)) { setError("Bitte gib eine gültige E-Mail-Adresse ein."); return; }
    if (!reg.password || reg.password.length < 6) { setError("Passwort muss mindestens 6 Zeichen haben."); return; }
    if (!reg.phone.trim() || reg.phone.trim().length < 8) { setError("Bitte gib eine gültige Telefonnummer ein (mind. 8 Zeichen)."); return; }

    startStepper();

    try {
      await registerMutation.mutateAsync(reg);
      // Small delay so stepper finishes visually
      setTimeout(() => {
        clearStepper();
        setLocation("/space");
      }, 1200);
    } catch (err: any) {
      clearStepper();
      const msg = mapRegisterError(err.message || "");
      setError(msg);
      setIsNetworkError(
        err.message?.toLowerCase().includes("fetch") ||
        err.message?.toLowerCase().includes("network") ||
        false
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsNetworkError(false);

    if (!login.username.trim()) { setError("Bitte gib deinen Benutzernamen ein."); return; }
    if (!login.password) { setError("Bitte gib dein Passwort ein."); return; }

    try {
      await loginMutation.mutateAsync(login);
    } catch (err: any) {
      const msg = mapLoginError(err.message || "", (err as any).code);
      setError(msg);
      setIsNetworkError(
        err.message?.toLowerCase().includes("fetch") ||
        err.message?.toLowerCase().includes("network") ||
        false
      );
    }
  };

  const isPending = registerMutation.isPending || loginMutation.isPending;

  // ---------------------------------------------------------------------------
  // Reduced motion
  // ---------------------------------------------------------------------------
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#FE9100] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Glass overlay + noise texture */}
      <div className="min-h-screen bg-black/60 backdrop-blur-2xl relative solar-noise-bg">
        {/* Container */}
        <div className="mx-auto max-w-[1120px] px-6 py-10 lg:px-10 lg:py-14">
          {/* Grid: hero left + form right */}
          <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:items-start gap-10">
            {/* ============================================================ */}
            {/* LEFT: Hero */}
            {/* ============================================================ */}
            <div className="flex flex-col gap-6">
              {/* Label */}
              <p
                className="text-[11px] tracking-[0.25em] text-white/70 uppercase"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                ARAS AI &mdash; Solar &amp; Energieberatung
              </p>

              {/* Accent line */}
              <div className="solar-accent-line" aria-hidden="true" />

              {/* Headline */}
              <h1
                className="text-[42px] leading-[1.05] lg:text-[56px] font-black"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  background: "linear-gradient(135deg, #FE9100 0%, #FFB84D 40%, #FFFFFF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Deine Leads.
                <br />
                Automatisch qualifiziert.
              </h1>

              {/* Bullets */}
              <ul className="flex flex-col gap-3 text-[16px] leading-[1.6] text-white/80" style={{ fontFamily: "Inter, sans-serif" }}>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#FE9100] mt-0.5 flex-shrink-0" />
                  <span>KI-Telefonie qualifiziert deine Solar-Leads rund um die Uhr &mdash; ohne Wartezeit.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#FE9100] mt-0.5 flex-shrink-0" />
                  <span>Automatische Terminbuchung direkt im Kalender deines Außendienstes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#FE9100] mt-0.5 flex-shrink-0" />
                  <span>Keine verlorenen Anfragen mehr &mdash; jeder Lead wird sofort kontaktiert.</span>
                </li>
              </ul>

              {/* Trust signal */}
              <p className="text-xs text-white/40 mt-2" style={{ fontFamily: "Inter, sans-serif" }}>
                Kostenlos starten &bull; Keine Kreditkarte nötig &bull; DSGVO-konform
              </p>
            </div>

            {/* ============================================================ */}
            {/* RIGHT: Form Card */}
            {/* ============================================================ */}
            <div
              id="solar-form"
              className="max-w-[420px] w-full rounded-2xl border border-[#FE9100]/20 p-6 lg:p-7"
              style={{
                background: "rgba(0,0,0,0.55)",
                boxShadow:
                  "0 0 0 1px rgba(255,106,0,0.18), 0 0 22px rgba(255,106,0,0.10)",
              }}
            >
              {/* Tabs */}
              <div className="flex mb-6 rounded-lg overflow-hidden border border-white/10">
                <button
                  type="button"
                  onClick={() => { setTab("register"); setError(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    tab === "register"
                      ? "bg-[#FE9100]/20 text-[#FE9100]"
                      : "bg-transparent text-white/50 hover:text-white/70"
                  }`}
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "11px", letterSpacing: "0.08em" }}
                >
                  Kostenlos registrieren
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("login"); setError(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    tab === "login"
                      ? "bg-[#FE9100]/20 text-[#FE9100]"
                      : "bg-transparent text-white/50 hover:text-white/70"
                  }`}
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "11px", letterSpacing: "0.08em" }}
                >
                  Einloggen
                </button>
              </div>

              {/* Error box */}
              {error && (
                <div className="rounded-xl p-3 border border-red-500/30 bg-red-500/10 text-white/90 text-sm mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span>{error}</span>
                    {isNetworkError && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setIsNetworkError(false);
                        }}
                        className="ml-2 inline-flex items-center gap-1 text-[#FE9100] hover:text-[#FE9100]/80 text-xs font-medium"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Erneut versuchen
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* REGISTER FORM */}
              {/* ======================================================== */}
              {tab === "register" && (
                <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
                  {/* Stepper overlay (shown during loading) */}
                  {stepperIdx >= 0 && (
                    <div className="rounded-xl p-4 border border-[#FE9100]/20 bg-black/60 mb-2">
                      <p
                        className="text-[11px] tracking-widest text-[#FE9100] mb-3 uppercase"
                        style={{ fontFamily: "Orbitron, sans-serif" }}
                      >
                        ARAS richtet deinen Zugang ein …
                      </p>
                      <ol className="flex flex-col gap-2">
                        {REGISTER_STEPS.map((step, i) => {
                          const isActive = i === stepperIdx;
                          const isDone = i < stepperIdx;
                          return (
                            <li
                              key={i}
                              className={`flex items-center gap-2 text-sm transition-opacity duration-300 ${
                                isDone
                                  ? "text-[#FE9100]"
                                  : isActive
                                  ? "text-white"
                                  : "text-white/30"
                              }`}
                              style={{
                                opacity: isDone || isActive ? 1 : 0.4,
                              }}
                            >
                              {isDone ? (
                                <Check className="w-4 h-4 text-[#FE9100]" />
                              ) : isActive ? (
                                <Loader2
                                  className={`w-4 h-4 text-[#FE9100] ${
                                    prefersReducedMotion ? "" : "animate-spin"
                                  }`}
                                />
                              ) : (
                                <span className="w-4 h-4 rounded-full border border-white/20 inline-block" />
                              )}
                              <span>{step}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}

                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Vorname" htmlFor="reg-fn" required>
                      <input
                        id="reg-fn"
                        type="text"
                        autoComplete="given-name"
                        value={reg.firstName}
                        onChange={(e) => setReg((p) => ({ ...p, firstName: e.target.value }))}
                        placeholder="Max"
                        disabled={isPending}
                        className="solar-input"
                      />
                    </FieldGroup>
                    <FieldGroup label="Nachname" htmlFor="reg-ln">
                      <input
                        id="reg-ln"
                        type="text"
                        autoComplete="family-name"
                        value={reg.lastName}
                        onChange={(e) => setReg((p) => ({ ...p, lastName: e.target.value }))}
                        placeholder="Mustermann"
                        disabled={isPending}
                        className="solar-input"
                      />
                    </FieldGroup>
                  </div>

                  {/* Email */}
                  <FieldGroup label="E-Mail" htmlFor="reg-email" required>
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      value={reg.email}
                      onChange={(e) => setReg((p) => ({ ...p, email: e.target.value }))}
                      placeholder="max@solarfirma.de"
                      disabled={isPending}
                      className="solar-input"
                    />
                  </FieldGroup>

                  {/* Password */}
                  <FieldGroup label="Passwort" htmlFor="reg-pw" required>
                    <div className="relative">
                      <input
                        id="reg-pw"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={reg.password}
                        onChange={(e) => setReg((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Mindestens 6 Zeichen"
                        disabled={isPending}
                        className="solar-input pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                        aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FieldGroup>

                  {/* Phone */}
                  <FieldGroup label="Telefon" htmlFor="reg-phone" required>
                    <input
                      id="reg-phone"
                      type="tel"
                      autoComplete="tel"
                      value={reg.phone}
                      onChange={(e) => setReg((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+49 170 1234567"
                      disabled={isPending}
                      className="solar-input"
                    />
                  </FieldGroup>

                  {/* Company */}
                  <FieldGroup label="Firma" htmlFor="reg-company">
                    <input
                      id="reg-company"
                      type="text"
                      autoComplete="organization"
                      value={reg.company}
                      onChange={(e) => setReg((p) => ({ ...p, company: e.target.value }))}
                      placeholder="SolarTech GmbH"
                      disabled={isPending}
                      className="solar-input"
                    />
                  </FieldGroup>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="solar-cta-button mt-1"
                  >
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2
                          className={`w-4 h-4 ${prefersReducedMotion ? "" : "animate-spin"}`}
                        />
                        ARAS richtet deinen Zugang ein …
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Kostenlos registrieren
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>

                  {/* Honeypot — visually hidden, traps bots */}
                  <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
                    <label htmlFor="reg-website-url">Website</label>
                    <input
                      id="reg-website-url"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <p className="text-[11px] text-white/40 text-center leading-relaxed">
                    Mit der Registrierung akzeptierst du unsere{" "}
                    <a href="/terms" className="underline hover:text-white/60">AGB</a>{" "}
                    und{" "}
                    <a href="/privacy" className="underline hover:text-white/60">Datenschutzerklärung</a>.
                  </p>
                </form>
              )}

              {/* ======================================================== */}
              {/* LOGIN FORM */}
              {/* ======================================================== */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
                  <FieldGroup label="Benutzername" htmlFor="login-user" required>
                    <input
                      id="login-user"
                      type="text"
                      autoComplete="username"
                      value={login.username}
                      onChange={(e) => setLogin((p) => ({ ...p, username: e.target.value }))}
                      placeholder="Dein Benutzername"
                      disabled={isPending}
                      className="solar-input"
                    />
                  </FieldGroup>

                  <FieldGroup label="Passwort" htmlFor="login-pw" required>
                    <div className="relative">
                      <input
                        id="login-pw"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={login.password}
                        onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Dein Passwort"
                        disabled={isPending}
                        className="solar-input pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                        aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FieldGroup>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="solar-cta-button mt-1"
                  >
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2
                          className={`w-4 h-4 ${prefersReducedMotion ? "" : "animate-spin"}`}
                        />
                        Anmeldung läuft …
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Einloggen
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>

                  <p className="text-[11px] text-white/40 text-center">
                    <a href="/forgot-password" className="underline hover:text-white/60">
                      Passwort vergessen?
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* BELOW FOLD — Solar-specific sections                           */}
          {/* ============================================================== */}

          {/* ---- Section 1: Problem ---- */}
          <section className="mt-20 lg:mt-28">
            <h2
              className="text-center text-[28px] lg:text-[36px] font-bold mb-4"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: "linear-gradient(135deg, #FE9100 0%, #FFB84D 60%, #fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Problem: Leads gehen verloren
            </h2>
            <p className="text-center text-white/60 max-w-2xl mx-auto mb-10 text-[15px] leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
              Jede Minute zählt. Wenn ein Interessent nicht sofort kontaktiert wird, sinkt die Abschlussquote dramatisch.
            </p>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: <Clock className="w-6 h-6 text-[#FE9100]" />,
                  title: "Zu langsame Reaktionszeit",
                  body: "Anfragen von Portalen oder der Website bleiben stundenlang unbearbeitet. Der Interessent hat längst beim Wettbewerber unterschrieben.",
                },
                {
                  icon: <Phone className="w-6 h-6 text-[#FE9100]" />,
                  title: "Kein Rückruf, kein Termin",
                  body: "Dein Außendienst ist unterwegs, das Büro überlastet. Rückrufe werden vergessen, Termine nicht gebucht.",
                },
                {
                  icon: <Zap className="w-6 h-6 text-[#FE9100]" />,
                  title: "Manuelle Nachfassung frisst Zeit",
                  body: "Statt zu beraten, telefoniert dein Team Listen ab. Qualifizierung passiert aus dem Bauch — ohne System.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 p-6 flex flex-col gap-3 solar-card-lift"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FE9100]/10 flex items-center justify-center">
                    {card.icon}
                  </div>
                  <h3 className="text-white text-[16px] font-semibold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "14px" }}>
                    {card.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ---- Section 2: Was ARAS übernimmt ---- */}
          <section className="mt-20 lg:mt-28">
            <h2
              className="text-center text-[28px] lg:text-[36px] font-bold mb-4"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: "linear-gradient(135deg, #FE9100 0%, #FFB84D 60%, #fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Was ARAS für dich übernimmt
            </h2>
            <p className="text-center text-white/60 max-w-2xl mx-auto mb-10 text-[15px] leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
              Vom ersten Kontakt bis zum gebuchten Termin — vollautomatisch, rund um die Uhr.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: <ShieldCheck className="w-6 h-6 text-[#FE9100]" />,
                  title: "Qualify",
                  body: "Jeder Lead wird automatisch nach deinen Kriterien qualifiziert — Budget, Dachfläche, Zeitrahmen.",
                },
                {
                  icon: <CalendarCheck className="w-6 h-6 text-[#FE9100]" />,
                  title: "Termin buchen",
                  body: "ARAS bucht direkt einen Vor-Ort-Termin im Kalender deines Außendienstes.",
                },
                {
                  icon: <Bell className="w-6 h-6 text-[#FE9100]" />,
                  title: "Reminder",
                  body: "Automatische Erinnerungen per Anruf reduzieren No-Shows auf unter 5 %.",
                },
                {
                  icon: <UserCheck className="w-6 h-6 text-[#FE9100]" />,
                  title: "Übergabe",
                  body: "Vollständiges Gesprächsprotokoll + Lead-Daten landen in deinem CRM — dein Berater ist sofort vorbereitet.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#FE9100]/15 p-5 flex flex-col gap-3 solar-card-lift"
                  style={{ background: "rgba(254,145,0,0.03)" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FE9100]/10 flex items-center justify-center">
                    {card.icon}
                  </div>
                  <h3 className="text-white text-[14px] font-semibold" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    {card.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ---- Section 3: So startest du (Timeline) ---- */}
          <section className="mt-20 lg:mt-28">
            <h2
              className="text-center text-[28px] lg:text-[36px] font-bold mb-12"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: "linear-gradient(135deg, #FE9100 0%, #FFB84D 60%, #fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              So startest du
            </h2>

            <div className="max-w-xl mx-auto flex flex-col gap-10 relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-[2px] bg-gradient-to-b from-[#FE9100]/50 via-[#FE9100]/20 to-transparent" />

              {[
                {
                  step: 1,
                  title: "Kostenlos registrieren",
                  body: "Account in unter 60 Sekunden anlegen. Keine Kreditkarte, kein Vertrag.",
                },
                {
                  step: 2,
                  title: "Solar-Profil einrichten",
                  body: "ARAS analysiert dein Unternehmen und erstellt ein personalisiertes Gesprächsprofil für deine Zielgruppe.",
                },
                {
                  step: 3,
                  title: "Leads automatisch qualifizieren",
                  body: "Verbinde deine Lead-Quellen und ARAS übernimmt Erstkontakt, Qualifizierung und Terminbuchung.",
                },
              ].map((item) => (
                <div key={item.step} className="relative flex gap-5 pl-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#FE9100]/30 bg-black flex items-center justify-center text-[#FE9100] font-bold text-sm z-10"
                    style={{ fontFamily: "Orbitron, sans-serif", boxShadow: "0 0 15px rgba(254,145,0,0.12)" }}>
                    {item.step}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-white text-[15px] font-semibold mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {item.title}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA after timeline */}
            <div className="flex justify-center mt-10">
              <a
                href="#solar-form"
                className="solar-cta-button inline-flex items-center gap-2"
                style={{ width: "auto", padding: "0.75rem 2rem" }}
              >
                Jetzt kostenlos starten
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </section>

          {/* ---- Section 4: FAQ ---- */}
          <section className="mt-20 lg:mt-28 mb-16">
            <h2
              className="text-center text-[28px] lg:text-[36px] font-bold mb-10"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: "linear-gradient(135deg, #FE9100 0%, #FFB84D 60%, #fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Häufige Fragen
            </h2>

            <div className="max-w-2xl mx-auto flex flex-col gap-2">
              {[
                { q: "Ist ARAS wirklich kostenlos?", a: "Ja. Du kannst dich kostenlos registrieren und die Plattform im Free-Plan nutzen. Es gibt keine versteckten Kosten und keine Kreditkarte ist nötig." },
                { q: "Wie funktioniert die Lead-Qualifizierung?", a: "ARAS ruft deine Leads automatisch an, stellt die von dir definierten Qualifizierungsfragen (z. B. Dachfläche, Budget, Zeitrahmen) und bewertet die Antworten in Echtzeit." },
                { q: "Kann ARAS Termine direkt buchen?", a: "Ja. ARAS ist mit gängigen Kalender-Tools kompatibel und bucht qualifizierte Termine direkt in den Kalender deines Außendienstes." },
                { q: "Wie klingt die KI am Telefon?", a: "ARAS nutzt eine natürliche, ruhige Stimme, die speziell für professionelle B2B-Gespräche optimiert ist. Gesprächspartner nehmen den Anruf als hochwertig und seriös wahr." },
                { q: "Ist das DSGVO-konform?", a: "Ja. Alle Daten werden DSGVO-konform verarbeitet. Es werden keine Gesprächsaufnahmen ohne Zustimmung gespeichert." },
                { q: "Welche Lead-Quellen kann ich anbinden?", a: "Du kannst Leads manuell importieren, über API-Schnittstellen anbinden oder direkt aus Web-Formularen übernehmen." },
                { q: "Wie schnell ist ARAS einsatzbereit?", a: "Nach der Registrierung analysiert ARAS dein Unternehmen und erstellt ein Profil. Du kannst in wenigen Minuten die ersten Leads qualifizieren lassen." },
                { q: "Was passiert, wenn ein Lead nicht erreichbar ist?", a: "ARAS versucht es automatisch zu verschiedenen Tageszeiten erneut und informiert dich über den Status. Kein Lead geht verloren." },
                { q: "Kann ich ARAS an mein CRM anbinden?", a: "Ja. ARAS unterstützt gängige CRM-Systeme. Alle Lead-Daten und Gesprächsprotokolle werden automatisch synchronisiert." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 overflow-hidden"
                  style={{ background: openFaq === i ? "rgba(254,145,0,0.04)" : "rgba(255,255,255,0.02)" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-white text-sm font-medium pr-4" style={{ fontFamily: "Inter, sans-serif" }}>
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#FE9100] flex-shrink-0 transition-transform duration-200 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4">
                      <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* Sticky CTA — visible from md up, scroll to form */}
      <div className="hidden md:block fixed top-14 right-6 z-50">
        <a
          href="#solar-form"
          className="solar-cta-button inline-flex items-center gap-2 text-xs"
          style={{ width: "auto", padding: "0.5rem 1.25rem", fontSize: "0.6875rem" }}
        >
          Kostenlos registrieren
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      {/* Scoped styles — premium visual layer */}
      <style>{`
        /* ── Inputs ── */
        .solar-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 0.875rem;
          line-height: 1.5;
          font-family: Inter, sans-serif;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }
        .solar-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .solar-input:focus {
          border-color: rgba(254, 145, 0, 0.6);
          box-shadow: 0 0 0 2px rgba(254, 145, 0, 0.6), 0 0 16px rgba(254, 145, 0, 0.08);
        }
        .solar-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── CTA Button ── */
        .solar-cta-button {
          width: 100%;
          padding: 0.75rem 1.25rem;
          border-radius: 0.75rem;
          border: none;
          background: linear-gradient(135deg, #FE9100, #a34e00);
          color: #000;
          font-family: Orbitron, sans-serif;
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
                      box-shadow 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
                      opacity 160ms ease;
        }
        .solar-cta-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(254, 145, 0, 0.35),
                      0 0 0 1px rgba(254, 145, 0, 0.2);
        }
        .solar-cta-button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 1px 6px rgba(254, 145, 0, 0.2);
        }
        .solar-cta-button:focus-visible {
          outline: 2px solid rgba(254, 145, 0, 0.7);
          outline-offset: 2px;
        }
        .solar-cta-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* ── Accent line animation (hero) ── */
        .solar-accent-line {
          height: 2px;
          width: 72px;
          border-radius: 2px;
          background: linear-gradient(90deg, #FE9100, rgba(254,145,0,0.2));
          animation: accentPulse 3s ease-in-out infinite;
        }

        @keyframes accentPulse {
          0%, 100% { opacity: 0.6; width: 72px; }
          50% { opacity: 1; width: 96px; }
        }

        /* ── Subtle noise texture overlay (GPU-friendly) ── */
        .solar-noise-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px;
          pointer-events: none;
        }

        /* ── Section card hover lift ── */
        .solar-card-lift {
          transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1),
                      box-shadow 200ms ease;
        }
        .solar-card-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(254, 145, 0, 0.06);
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .solar-cta-button:hover:not(:disabled) {
            transform: none;
          }
          .solar-card-lift:hover {
            transform: none;
          }
          .solar-accent-line {
            animation: none;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helper: labelled field wrapper
// ---------------------------------------------------------------------------
function FieldGroup({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-white/60"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {label}
        {required && <span className="text-[#FE9100] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
