import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";

import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

import {
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  User,
  Sparkles,
  Radio,
  AlertCircle,
  FileText,
  Download,
  Upload,
  Table,
  X,
} from "lucide-react";

import type { SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

// Animated copy (subtle typing)
const ANIMATED_TEXTS = [
  "Terminvereinbarungen automatisieren",
  "Leads qualifizieren",
  "Kundentermine bestätigen",
  "Follow-ups durchführen",
  "Feedback einholen",
  "Bestellungen aufnehmen",
];

const EXAMPLE_PROMPTS = [
  {
    text: "Biete meine Dienstleistung/Produkt an",
    detail:
      "Beschreibe es so konkret wie möglich – ARAS führt ein passendes Gespräch und macht das Angebot.",
  },
  { text: "Lade den Bewerber ein", detail: null },
  {
    text: "Frage nach, ob das Angebot angekommen ist",
    detail: "Falls Angebots- oder Rechnungsnummer vorhanden, bitte eintragen.",
  },
];

const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

const formatPhoneInput = (value: string): string => {
  return value.replace(/[^\d+]/g, "");
};

export default function Power() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [phoneError, setPhoneError] = useState("");

  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const [callStatus, setCallStatus] = useState<
    "idle" | "ringing" | "connected" | "ended" | "processing"
  >("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---------- NEW (Frontend-Only) Bulk Campaign UI State ----------
  // Reine UI – keine Backend-Logik geändert
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkRowsPreview, setBulkRowsPreview] = useState<
    Array<{ name: string; company: string; phone: string }>
  >([]);
  const [campaignObjective, setCampaignObjective] = useState("");
  const CAMPAIGN_OBJECTIVES = [
    "Akquiriere Kunden für meine Dienstleistung XY",
    "Lade Besucher zu unserem Event ein",
    "Qualifiziere Leads und vereinbare Termine",
    "Bestätige bestehende Kundentermine",
    "Hole Feedback nach einem Kauf ein",
  ];
  // ---------------------------------------------------------------

  const { data: userSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  const subscriptionData =
    userSubscription || {
      plan: "pro",
      status: "active",
      aiMessagesUsed: 0,
      voiceCallsUsed: 0,
      aiMessagesLimit: 100,
      voiceCallsLimit: 100,
      renewalDate: new Date().toISOString(),
      hasPaymentMethod: false,
      requiresPaymentSetup: false,
      isTrialActive: false,
      canUpgrade: false,
    };

  // Contacts
  const checkContact = async (name: string) => {
    if (!name) return;
    try {
      const response = await fetch(
        `/api/user/contacts/search?name=${encodeURIComponent(name)}`,
        { credentials: "include" }
      );
      const data = await response.json();
      if (data.found && data.contact) {
        setPhoneNumber(data.contact.phoneNumber);
        setShowSaveContact(false);
      } else {
        setShowSaveContact(true);
      }
    } catch (error) {
      console.error("Error checking contact:", error);
    }
  };

  const saveContact = async () => {
    if (!contactName || !phoneNumber) return;
    try {
      await fetch("/api/user/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: contactName, phoneNumber }),
      });
      setShowSaveContact(false);
      toast({
        title: "Kontakt gespeichert",
        description: `${contactName} wurde zu Ihrem Telefonbuch hinzugefügt`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Kontakt konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  // Call history
  useEffect(() => {
    if (phoneNumber && validatePhoneNumber(phoneNumber)) {
      fetch(`/api/user/call-history/${encodeURIComponent(phoneNumber)}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setCallHistory(data || []))
        .catch(console.error);
    } else {
      setCallHistory([]);
    }
  }, [phoneNumber]);

  const handleSectionChange = (section: string) => {
    if (section !== "power") {
      window.location.href = `/app/${section}`;
    }
  };

  // Hero typing
  useEffect(() => {
    const currentText = ANIMATED_TEXTS[currentTextIndex];
    let charIndex = 0;
    if (isTyping) {
      const typeInterval = setInterval(() => {
        if (charIndex <= currentText.length) {
          setDisplayText(currentText.substring(0, charIndex));
          charIndex++;
        } else {
          setIsTyping(false);
          setTimeout(() => {
            setIsTyping(true);
            setCurrentTextIndex((prev) => (prev + 1) % ANIMATED_TEXTS.length);
          }, 1600);
          clearInterval(typeInterval);
        }
      }, 42);
      return () => clearInterval(typeInterval);
    }
  }, [currentTextIndex, isTyping]);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [message]);

  // Placeholder rotation
  useEffect(() => {
    const placeholderInterval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 4000);
    return () => clearInterval(placeholderInterval);
  }, []);

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setPhoneNumber(formatted);
    if (formatted && !validatePhoneNumber(formatted)) {
      setPhoneError("Format: +4917661119320 (ohne Leerzeichen)");
    } else {
      setPhoneError("");
    }
  };

  const makeCall = async () => {
    if (!contactName || !phoneNumber || !message) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte fülle alle Pflichtfelder aus",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Ungültige Telefonnummer",
        description: "Format: +4917661119320 (ohne Leerzeichen)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setCallStatus("processing");
    setCallDuration(0);

    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      setCallStatus("ringing");
      const response = await fetch("/api/aras-voice/smart-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: contactName,
          phoneNumber,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.error || data.message || `Fehler: ${response.status}`;
        setCallStatus("idle");
        setResult({ success: false, error: errorMessage });
        setLoading(false);

        if (response.status === 403 || errorMessage.toLowerCase().includes("limit")) {
          toast({
            title: "Anruf-Limit erreicht",
            description:
              errorMessage + " – Upgrade für höhere Kapazität möglich.",
            variant: "destructive",
            duration: 20000,
            action: (
              <ToastAction
                altText="Jetzt upgraden"
                onClick={() => (window.location.href = "/billing")}
              >
                Jetzt upgraden
              </ToastAction>
            ),
          });
        } else {
          toast({
            title: "Fehler",
            description: errorMessage,
            variant: "destructive",
            duration: 10000,
          });
        }
        return;
      }

      if (data.success) {
        setTimeout(() => setCallStatus("connected"), 2200);
        setTimeout(() => {
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }, 2200);

        const callId = data.callId;
        const pollCallDetails = async () => {
          let attempts = 0;
          const maxAttempts = 30;
          const pollInterval = setInterval(async () => {
            attempts++;
            try {
              const detailsResponse = await fetch(
                `/api/aras-voice/call-details/${callId}`,
                { credentials: "include" }
              );
              if (!detailsResponse.ok) {
                if (attempts >= maxAttempts) {
                  clearInterval(pollInterval);
                  if (callTimerRef.current) clearInterval(callTimerRef.current);
                  setCallStatus("ended");
                  setResult({
                    success: false,
                    error: "Anruf-Details konnten nicht abgerufen werden",
                  });
                }
                return;
              }
              const callDetails = await detailsResponse.json();
              if (
                callDetails.transcript ||
                callDetails.recordingUrl ||
                callDetails.status === "completed"
              ) {
                clearInterval(pollInterval);
                if (callTimerRef.current) clearInterval(callTimerRef.current);
                setCallStatus("ended");
                setResult({
                  success: true,
                  callId: callDetails.callId,
                  recordingUrl: callDetails.recordingUrl,
                  summary: {
                    transcript:
                      callDetails.transcript ||
                      "Gespräch erfolgreich durchgeführt. Transkript wird verarbeitet...",
                    sentiment: callDetails.metadata?.sentiment || "positiv",
                    nextSteps:
                      callDetails.metadata?.nextSteps ||
                      "Follow-up wurde vereinbart",
                    duration: callDetails.duration || callDuration,
                  },
                });
              }
              if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                if (callTimerRef.current) clearInterval(callTimerRef.current);
                setCallStatus("ended");
                setResult({
                  success: true,
                  callId: callDetails.callId,
                  summary: {
                    transcript:
                      callDetails.transcript ||
                      "Anruf wurde durchgeführt. Details werden noch verarbeitet...",
                    sentiment: "positiv",
                    nextSteps: "Bitte später erneut prüfen",
                    duration: callDuration,
                  },
                });
              }
            } catch {
              if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                if (callTimerRef.current) clearInterval(callTimerRef.current);
                setCallStatus("ended");
              }
            }
          }, 4000);
        };
        setTimeout(pollCallDetails, 4200);

        toast({
          title: "Anruf wird verbunden",
          description: `ARAS AI ruft ${contactName} an...`,
        });
      } else {
        setResult(data);
        setCallStatus("idle");
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message || "Anruf fehlgeschlagen" });
      setCallStatus("idle");
      if (!error.message?.toLowerCase().includes("limit")) {
        toast({
          title: "Fehler",
          description: error.message || "Anruf konnte nicht gestartet werden",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  // ---------- Bulk Campaign UI handlers (Frontend only) ----------
  const handleBulkFile = (file: File) => {
    setBulkFile(file);
    setBulkFileName(file.name);

    // UI-only: generate a tiny fake preview (no parsing/logic)
    // Expecting columns: Name, Firmenname, Telefonnummer
    setBulkRowsPreview([
      { name: "Max Mustermann", company: "Muster GmbH", phone: "+491701234567" },
      { name: "Anna Bauer", company: "Bauer Consult", phone: "+431234567890" },
      { name: "Lukas Steiner", company: "Steiner AG", phone: "+41791234567" },
    ]);
  };

  const clearBulk = () => {
    setBulkFile(null);
    setBulkFileName("");
    setBulkRowsPreview([]);
    setCampaignObjective("");
  };
  // ---------------------------------------------------------------

  const anyError = !contactName || !phoneNumber || !message || !!phoneError;

  return (
    <>
      <div className="flex h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
        {/* Subtle ARAS background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black opacity-90" />
          <div className="absolute inset-0 opacity-35 mix-blend-screen bg-[radial-gradient(circle_at_12%_18%,rgba(254,145,0,0.10),transparent_55%),radial-gradient(circle_at_88%_82%,rgba(163,78,0,0.08),transparent_55%),radial-gradient(circle_at_50%_50%,rgba(233,215,196,0.06),transparent_55%)]" />
          <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>

        <Sidebar
          activeSection="power"
          onSectionChange={handleSectionChange}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col relative z-10">
          <TopBar
            currentSection="power"
            subscriptionData={subscriptionData}
            user={user as import("@shared/schema").User}
            isVisible={true}
          />

          <div className="flex-1 overflow-y-auto premium-scroll">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-10 space-y-8">
              {/* HERO (smaller, cleaner) */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-[#FE9100]">
                      <span className="m-auto h-1.5 w-1.5 animate-ping rounded-full bg-[#FE9100]" />
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-gray-300">
                      ARAS Outbound Engine
                    </span>
                    <span className="h-3 w-px bg-white/15" />
                    <span className="text-[11px] text-gray-400">
                      System online · v1.0
                    </span>
                  </div>

                  <h1
                    className="text-4xl md:text-5xl font-black tracking-tight"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    <span className="bg-gradient-to-r from-[#e9d7c4] via-[#FE9100] to-[#a34e00] bg-clip-text text-transparent">
                      POWER
                    </span>
                  </h1>

                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Automatisierte Outbound-Calls für</span>{" "}
                    <span className="text-[#FE9100] font-medium">
                      {displayText || "Ihre Kontakte"}
                      <motion.span
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                        className="ml-1 inline-block h-4 w-[2px] bg-[#FE9100] align-middle"
                      />
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-[#FE9100]" />
                    <span>
                      {subscriptionData.voiceCallsUsed || 0} /{" "}
                      {subscriptionData.voiceCallsLimit || 100} Anrufe
                    </span>
                  </div>
                  <div className="hidden md:block h-3 w-px bg-white/15" />
                  <div className="hidden md:flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#e9d7c4]" />
                    <span>Live-Orchestrierung über ARAS Core</span>
                  </div>
                </div>
              </motion.div>

              {/* GRID: Left = Single Call; Right = Bulk Campaign */}
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-start">
                {/* LEFT: Single Call Form */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 }}
                  className="space-y-6"
                >
                  <div className="relative rounded-2xl border border-white/10 bg-black/60 px-6 py-6 backdrop-blur-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[#FE9100]/30 blur-xl" />
                          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#FE9100]/40 bg-black/70">
                            <img
                              src={arasLogo}
                              alt="ARAS"
                              className="h-5 w-5 object-contain"
                            />
                          </div>
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-white">
                            Einzeln anrufen lassen
                          </h2>
                          <p className="text-xs text-gray-500">
                            ARAS führt das Gespräch in Ihrem Namen.
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end text-[11px] text-gray-400">
                        <span>Aktive Leitungen</span>
                        <span className="mt-0.5 font-mono text-sm text-[#FE9100]">
                          1 / 1
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <AnimatePresence>
                      {callStatus !== "idle" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="mb-5"
                        >
                          <div
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] ${
                              callStatus === "processing"
                                ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-200"
                                : callStatus === "ringing"
                                ? "border-blue-400/35 bg-blue-500/10 text-blue-200"
                                : callStatus === "connected"
                                ? "border-green-400/35 bg-green-500/10 text-green-200"
                                : "border-gray-500/35 bg-gray-500/10 text-gray-200"
                            }`}
                          >
                            {callStatus === "processing" && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {callStatus === "ringing" && (
                              <Phone className="h-3.5 w-3.5" />
                            )}
                            {callStatus === "connected" && (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {callStatus === "ended" && (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {callStatus === "processing" && "Verarbeitung"}
                              {callStatus === "ringing" && "Verbindungsaufbau"}
                              {callStatus === "connected" &&
                                `Verbunden · ${formatCallDuration(
                                  callDuration
                                )}`}
                              {callStatus === "ended" && "Anruf beendet"}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Fields */}
                    <div className="space-y-5">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                          Kontakt
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={contactName}
                            onChange={(e) => {
                              setContactName(e.target.value);
                              checkContact(e.target.value);
                            }}
                            className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#FE9100]/55"
                            placeholder="Mit wem soll ARAS AI sprechen?"
                          />
                          <User className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        </div>
                        {showSaveContact && contactName && (
                          <button
                            onClick={saveContact}
                            className="text-xs text-[#FE9100] hover:text-[#FE9100]/80 transition-colors"
                          >
                            Kontakt im ARAS Telefonbuch speichern
                          </button>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                          Telefonnummer
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            className={`w-full rounded-xl border px-3.5 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors bg-black/50 ${
                              phoneError
                                ? "border-red-500/60 focus:border-red-500"
                                : "border-white/10 focus:border-[#FE9100]/55"
                            }`}
                            placeholder="+49..."
                          />
                          <Phone className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        </div>
                        {phoneError && (
                          <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {phoneError}
                          </p>
                        )}
                      </div>

                      {/* Message */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                          Auftrag
                        </label>
                        <div className="relative">
                          <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full min-h-[110px] max-h-[170px] rounded-xl border border-white/10 bg-black/50 px-3.5 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors resize-none focus:border-[#FE9100]/55"
                            placeholder={
                              EXAMPLE_PROMPTS[placeholderIndex]?.text ||
                              "Was soll ARAS AI ausrichten?"
                            }
                          />
                          <div className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-gray-500">
                            {message.length} / 500
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-1">
                        <motion.button
                          type="button"
                          onClick={makeCall}
                          disabled={loading || anyError}
                          whileHover={{
                            scale: loading || anyError ? 1 : 1.01,
                          }}
                          whileTap={{
                            scale: loading || anyError ? 1 : 0.99,
                          }}
                          className={`relative flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-wide ${
                            loading || anyError
                              ? "cursor-not-allowed bg-black/70 text-gray-500"
                              : "bg-black/80 text-white hover:bg-black/70"
                          } border border-white/10`}
                          style={{
                            backdropFilter: "blur(10px)",
                          }}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-[#FE9100]" />
                              <span>Anruf wird gestartet</span>
                            </>
                          ) : (
                            <>
                              <Phone className="h-4 w-4 text-[#FE9100]" />
                              <span>ARAS AI jetzt anrufen lassen</span>
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Result / Summary */}
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-white/10 bg-black/60 px-5 py-5 backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {result.success
                                ? "Anruf erfolgreich"
                                : "Anruf fehlgeschlagen"}
                            </p>
                            <p className="text-xs text-gray-400">
                              Zusammenfassung durch ARAS AI
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setResult(null);
                            setCallStatus("idle");
                          }}
                          className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-400 hover:text-white" />
                        </button>
                      </div>

                      {result.summary && (
                        <div className="space-y-3 text-sm text-gray-300">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-1">
                              Kurzprotokoll
                            </div>
                            <p className="text-gray-200">
                              {result.summary.transcript}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3 text-xs">
                            <div className="rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
                              <div className="text-gray-500 uppercase tracking-[0.18em] mb-1">
                                Stimmung
                              </div>
                              <div className="text-gray-100">
                                {result.summary.sentiment}
                              </div>
                            </div>
                            <div className="rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
                              <div className="text-gray-500 uppercase tracking-[0.18em] mb-1">
                                Nächste Schritte
                              </div>
                              <div className="text-gray-100">
                                {result.summary.nextSteps}
                              </div>
                            </div>
                            <div className="rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
                              <div className="text-gray-500 uppercase tracking-[0.18em] mb-1">
                                Dauer
                              </div>
                              <div className="text-gray-100">
                                {formatCallDuration(
                                  result.summary.duration || callDuration
                                )}
                              </div>
                            </div>
                          </div>

                          {result.recordingUrl && (
                            <div className="pt-2">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-[#FE9100]" />
                                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                                  Aufzeichnung
                                </h4>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                                <audio controls className="w-full">
                                  <source
                                    src={result.recordingUrl}
                                    type="audio/mpeg"
                                  />
                                </audio>
                                <a
                                  href={result.recordingUrl}
                                  download="aras-call-recording.mp3"
                                  className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-[#FE9100] hover:text-[#e9d7c4] transition-colors"
                                >
                                  <Download className="h-4 w-4" />
                                  Aufzeichnung herunterladen
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!result.success && result.error && (
                        <p className="mt-2 text-xs text-red-300">
                          {result.error}
                        </p>
                      )}
                    </motion.div>
                  )}
                </motion.div>

                {/* RIGHT: Bulk Campaign (Frontend-only UI) */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="space-y-6"
                >
                  <div className="relative rounded-2xl border border-white/10 bg-black/60 px-6 py-6 backdrop-blur-xl">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3
                          className="text-base font-semibold"
                          style={{ fontFamily: "Orbitron, sans-serif" }}
                        >
                          <span className="bg-gradient-to-r from-[#e9d7c4] via-[#FE9100] to-[#e9d7c4] bg-clip-text text-transparent">
                            Bulk-Campaign
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Bis zu 10.000 Gespräche parallel. ARAS analysiert bis zu
                          500 Quellen pro Kontakt und passt das Gespräch an.
                        </p>
                      </div>
                      {bulkFile && (
                        <button
                          onClick={clearBulk}
                          className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                          title="Zurücksetzen"
                        >
                          <X className="h-4 w-4 text-gray-400 hover:text-white" />
                        </button>
                      )}
                    </div>

                    {/* Upload */}
                    <div className="space-y-4">
                      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg border border-white/10 bg-black/60 p-2.5">
                              <Upload className="h-4 w-4 text-[#FE9100]" />
                            </div>
                            <div className="text-sm">
                              <div className="text-gray-200">
                                Liste hochladen (CSV/XLSX)
                              </div>
                              <div className="text-xs text-gray-500">
                                Spalten: Name · Firmenname · Telefonnummer
                              </div>
                            </div>
                          </div>
                          <label className="relative inline-flex cursor-pointer items-center rounded-md border border-white/10 bg-black/70 px-3 py-2 text-xs font-medium hover:bg-black/60">
                            <input
                              type="file"
                              accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleBulkFile(f);
                              }}
                            />
                            Datei wählen
                          </label>
                        </div>

                        {/* File chip */}
                        {bulkFileName && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px]">
                            <Table className="h-3.5 w-3.5 text-[#e9d7c4]" />
                            <span className="text-gray-300">{bulkFileName}</span>
                          </div>
                        )}
                      </div>

                      {/* Objective */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                          Ziel der Kampagne
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={campaignObjective}
                            onChange={(e) => setCampaignObjective(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#FE9100]/55"
                          >
                            <option value="" disabled>
                              Bitte auswählen
                            </option>
                            {CAMPAIGN_OBJECTIVES.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>

                          {/* Hint (readonly) */}
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-gray-400">
                            ARAS passt Tonalität, Argumente und Reihenfolge dynamisch an –
                            basierend auf öffentlich verfügbaren Quellen.
                          </div>
                        </div>
                      </div>

                      {/* Tiny Preview (UI only) */}
                      {bulkRowsPreview.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03]">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                            <div className="text-xs text-gray-400">
                              Vorschau (erste 3 Zeilen)
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Gesamt: bis zu 10.000 Kontakte
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                              <div>Name</div>
                              <div>Firmenname</div>
                              <div>Telefon</div>
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {bulkRowsPreview.map((r, i) => (
                                <div
                                  key={i}
                                  className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-xs text-gray-200"
                                >
                                  <div>{r.name}</div>
                                  <div className="text-gray-300">{r.company}</div>
                                  <div className="text-gray-300">{r.phone}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CTA (disabled – Frontend only) */}
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={!bulkFile || !campaignObjective}
                          className={`w-full rounded-full border px-5 py-2.5 text-sm font-semibold tracking-wide ${
                            !bulkFile || !campaignObjective
                              ? "cursor-not-allowed bg-black/70 text-gray-500 border-white/10"
                              : "bg-black/80 text-white hover:bg-black/70 border-white/10"
                          }`}
                          title="Frontend-Demo – Backend folgt"
                        >
                          Kampagne vorbereiten
                        </button>
                        <p className="mt-2 text-[11px] text-gray-500">
                          Hinweis: Diese Oberfläche bereitet die Kampagne visuell vor.
                          Die eigentliche Ausführung erfolgt nach Backend-Freigabe.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Example Prompts – kompakt */}
                  <div className="rounded-2xl border border-white/10 bg-black/60 px-5 py-5 backdrop-blur-xl">
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-white">
                        Häufige Gesprächsszenarien
                      </h4>
                      <p className="text-xs text-gray-500">
                        Ein Klick übernimmt das Briefing in das Feld oben.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {EXAMPLE_PROMPTS.map((example, index) => (
                        <button
                          key={index}
                          onClick={() => setMessage(example.text)}
                          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left text-sm hover:border-[#FE9100]/35 hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div className="rounded-md border border-white/10 bg-black/60 p-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-[#FE9100]" />
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-200">{example.text}</p>
                              {example.detail && (
                                <p className="mt-0.5 text-[11px] text-gray-500">
                                  {example.detail}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Call history – kompakt */}
                  {callHistory.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-black/60 px-5 py-5 backdrop-blur-xl">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">
                          Anrufverlauf
                        </h4>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        {callHistory.slice(0, 4).map((call, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white">
                                    {call.contactName || call.phoneNumber}
                                  </span>
                                </div>
                                {call.message && (
                                  <p className="text-gray-400 line-clamp-2">
                                    {call.message}
                                  </p>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500">
                                {formatDistanceToNow(new Date(call.createdAt), {
                                  addSuffix: true,
                                  locale: de,
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>

          {/* Font + subtle scrollbar */}
          <link
            href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap"
            rel="stylesheet"
          />
          <style>{`
            .premium-scroll::-webkit-scrollbar { width: 6px; }
            .premium-scroll::-webkit-scrollbar-track { background: transparent; }
            .premium-scroll::-webkit-scrollbar-thumb { background: rgba(254,145,0,0.28); border-radius: 999px; }
            .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(254,145,0,0.45); }
          `}</style>
        </div>
      </div>
      <Toaster />
    </>
  );
}
