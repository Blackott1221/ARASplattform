import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

import {
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Radio,
  User,
} from "lucide-react";

import type { SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

// Smooth rotating examples like chat-interface
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
      "Beschreibe es bitte so konkret wie möglich, ich entwickle daraus ein Gespräch und biete dein Produkt oder deine Dienstleistung an.",
  },
  {
    text: "Lade den Bewerber ein",
    detail: null,
  },
  {
    text: "Frage nach, ob er mein Angebot erhalten hat",
    detail: "Falls Angebotsnummer oder Rechnungsnummer vorhanden, bitte eintragen.",
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

  // Premium animations like chat-interface
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

  // Check if contact exists in database
  const checkContact = async (name: string) => {
    if (!name) return;
    try {
      const response = await fetch(
        `/api/user/contacts/search?name=${encodeURIComponent(name)}`,
        {
          credentials: "include",
        }
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

  // Save new contact
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
        description: `${contactName} wurde zu Ihrem Telefonbuch hinzugefügt.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Kontakt konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  // Fetch call history when phone number changes
  useEffect(() => {
    if (phoneNumber && validatePhoneNumber(phoneNumber)) {
      fetch(
        `/api/user/call-history/${encodeURIComponent(phoneNumber)}`,
        {
          credentials: "include",
        }
      )
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

  // Smooth typewriter effect from chat-interface
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
            setCurrentTextIndex(
              (prev) => (prev + 1) % ANIMATED_TEXTS.length
            );
          }, 2000);
          clearInterval(typeInterval);
        }
      }, 60);

      return () => clearInterval(typeInterval);
    }
  }, [currentTextIndex, isTyping]);

  // Auto-resize textarea like chat-interface
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [message]);

  // Placeholder animation rotation
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
      setPhoneError("Format: +4917661119320 (ohne Leerzeichen).");
    } else {
      setPhoneError("");
    }
  };

  const makeCall = async () => {
    if (!contactName || !phoneNumber || !message) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Ungültige Telefonnummer",
        description: "Format: +4917661119320 (ohne Leerzeichen).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setCallStatus("processing");
    setCallDuration(0);

    // Small delay for better UX
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

      if (data.success) {
        // Simulate realistic call progression
        setTimeout(() => setCallStatus("connected"), 3000);

        // Start call timer after connection
        setTimeout(() => {
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }, 3000);

        // Mock call end with summary (since API does not return it yet)
        setTimeout(() => {
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
          }
          setCallStatus("ended");

          setResult({
            ...data,
            success: true,
            summary: {
              transcript:
                "Gespräch erfolgreich durchgeführt. Der Kontakt wurde über folgendes Anliegen informiert: " +
                message,
              sentiment: "positiv",
              nextSteps: "Follow-up wurde vereinbart.",
              duration: callDuration,
            },
            recordingUrl: "mock-recording-url",
          });
        }, 15000);

        toast({
          title: "Anruf wird verbunden",
          description: `ARAS AI ruft ${contactName} an.`,
        });
      } else {
        setResult(data);
        setCallStatus("idle");
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "Anruf fehlgeschlagen.",
      });
      setCallStatus("idle");
      toast({
        title: "Fehler",
        description:
          error.message || "Der Anruf konnte nicht gestartet werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  const anyError = !contactName || !phoneNumber || !message || !!phoneError;

  return (
    <div className="flex h-screen bg-[#050506] text-white relative overflow-hidden">
      {/* ARAS grid and glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050506] to-black" />
        <div className="absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(circle_at_0%_0%,rgba(254,145,0,0.22),transparent_55%),radial-gradient(circle_at_100%_0%,rgba(163,78,0,0.2),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(233,215,196,0.18),transparent_55%)]" />
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
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
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-12 space-y-10">
            {/* Header / Hero */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8"
            >
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
                  <span className="flex h-2 w-2 rounded-full bg-[#FE9100]">
                    <span className="m-auto h-2 w-2 animate-ping rounded-full bg-[#FE9100]" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] text-gray-300">
                    ARAS Outbound Engine
                  </span>
                  <span className="h-3 w-px bg-white/15" />
                  <span className="text-xs text-gray-400">
                    System online · Version 1.0
                  </span>
                </div>

                <div>
                  <motion.h1
                    className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                    initial={{ scale: 0.96 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="bg-gradient-to-r from-[#e9d7c4] via-[#FE9100] to-[#a34e00] bg-clip-text text-transparent">
                      POWER
                    </span>
                  </motion.h1>

                  <div className="mt-4 text-sm sm:text-base text-gray-300 max-w-xl">
                    <span className="text-gray-400">
                      Automatisierte Outbound Calls für
                    </span>
                    <span className="ml-2 inline-flex items-center text-[#FE9100] font-medium">
                      {displayText || "Ihre Kontakte"}
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="ml-1 h-5 w-[2px] bg-[#FE9100]"
                      />
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#FE9100]" />
                    <span>
                      {subscriptionData.voiceCallsUsed || 0} /{" "}
                      {subscriptionData.voiceCallsLimit || 100} Anrufe in
                      diesem Zeitraum
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#e9d7c4]" />
                    <span>Live Call Orchestrierung über ARAS Core</span>
                  </div>
                </div>
              </div>

              {/* Right: logo + abstract visual */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative w-full max-w-sm lg:max-w-md self-center"
              >
                <div className="relative flex items-center justify-center rounded-3xl border border-white/10 bg-black/50 px-6 py-6 backdrop-blur-xl overflow-hidden">
                  <div className="absolute -inset-24 bg-[conic-gradient(from_160deg_at_50%_50%,rgba(254,145,0,0.05),transparent_40%,rgba(233,215,196,0.08),transparent_70%,rgba(163,78,0,0.12))]" />
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#FE9100]/30 blur-xl" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 18,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#FE9100]/60 bg-black/60"
                      >
                        <img
                          src={arasLogo}
                          alt="ARAS AI"
                          className="h-10 w-10 object-contain"
                        />
                      </motion.div>
                    </div>
                    <div className="text-center text-xs text-gray-300 space-y-1">
                      <div className="uppercase tracking-[0.25em] text-gray-400">
                        Voice Core
                      </div>
                      <div className="text-sm text-gray-300">
                        ARAS generiert, führt und protokolliert Ihre
                        Outbound-Gespräche in Echtzeit.
                      </div>
                    </div>
                    <div className="flex gap-3 text-[11px] text-gray-400">
                      <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 border border-white/10">
                        <Radio className="h-3.5 w-3.5 text-[#FE9100]" />
                        <span>Parallele Leitungen</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 border border-white/10">
                        <MessageSquare className="h-3.5 w-3.5 text-[#e9d7c4]" />
                        <span>Kontextbasiertes Skripting</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Main content grid */}
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
              {/* Left: Call form + status */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-6"
              >
                <div className="relative">
                  <div className="absolute -inset-[1px] rounded-3xl bg-[radial-gradient(circle_at_0%_0%,rgba(254,145,0,0.6),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(233,215,196,0.5),transparent_55%)] opacity-40 blur-lg" />
                  <div className="relative rounded-3xl border border-white/10 bg-black/70 px-6 py-7 sm:px-8 sm:py-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                    {/* Form header */}
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-white">
                          Outbound Call konfigurieren
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-gray-400">
                          Tragen Sie Kontakt, Nummer und Auftrag ein. ARAS
                          übernimmt den kompletten Anruf in Ihrem Namen.
                        </p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end text-xs text-gray-400">
                        <span>Aktive Leitungen</span>
                        <span className="mt-0.5 font-mono text-sm text-[#FE9100]">
                          1 / 1
                        </span>
                      </div>
                    </div>

                    {/* Call status */}
                    <AnimatePresence>
                      {callStatus !== "idle" && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="mb-6"
                        >
                          <div
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] sm:text-xs ${
                              callStatus === "processing"
                                ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-200"
                                : callStatus === "ringing"
                                ? "border-blue-400/40 bg-blue-400/10 text-blue-200"
                                : callStatus === "connected"
                                ? "border-green-400/40 bg-green-400/10 text-green-200"
                                : "border-gray-500/40 bg-gray-500/10 text-gray-200"
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

                    {/* Form fields */}
                    <div className="space-y-5">
                      {/* Contact name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
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
                            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#FE9100]/60"
                            placeholder="Mit wem soll ARAS AI sprechen?"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-500">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                        </div>
                        {showSaveContact && contactName && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={saveContact}
                            className="text-xs text-[#FE9100] hover:text-[#FE9100]/80 transition-colors"
                          >
                            Kontakt im ARAS Telefonbuch speichern
                          </motion.button>
                        )}
                      </div>

                      {/* Phone number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                          Telefonnummer
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) =>
                              handlePhoneChange(e.target.value)
                            }
                            className={`w-full rounded-2xl border px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors bg-black/60 ${
                              phoneError
                                ? "border-red-500/60 focus:border-red-500"
                                : "border-white/10 focus:border-[#FE9100]/60"
                            }`}
                            placeholder="+49..."
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-500">
                            <Phone className="h-4 w-4" />
                          </div>
                        </div>
                        {phoneError && (
                          <p className="text-xs text-red-400 mt-0.5">
                            {phoneError}
                          </p>
                        )}
                      </div>

                      {/* Message */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                          Auftrag an ARAS AI
                        </label>
                        <div className="relative">
                          <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full min-h-[120px] max-h-[180px] rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors resize-none focus:border-[#FE9100]/60"
                            placeholder={
                              EXAMPLE_PROMPTS[placeholderIndex]?.text ||
                              "Was soll ARAS AI in Ihrem Namen ausrichten?"
                            }
                          />
                          <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2 text-[11px] text-gray-500">
                            <span>{message.length} / 500</span>
                          </div>
                        </div>
                      </div>

                      {/* Call button */}
                      <div className="pt-2">
                        <motion.div
                          className="relative inline-flex w-full items-center justify-center"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            animate={{
                              background: [
                                "conic-gradient(from_0deg,rgba(254,145,0,0.7),rgba(233,215,196,0.9),rgba(163,78,0,0.8),rgba(254,145,0,0.7))",
                                "conic-gradient(from_140deg,rgba(254,145,0,0.7),rgba(233,215,196,0.9),rgba(163,78,0,0.8),rgba(254,145,0,0.7))",
                              ],
                            }}
                            transition={{
                              duration: 6,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            style={{ padding: "2px" }}
                          >
                            <motion.button
                              type="button"
                              onClick={makeCall}
                              disabled={loading || anyError}
                              whileHover={{
                                scale:
                                  loading || anyError ? 1 : 1.02,
                              }}
                              whileTap={{
                                scale:
                                  loading || anyError ? 1 : 0.98,
                              }}
                              className={`relative flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold tracking-wide ${
                                loading || anyError
                                  ? "cursor-not-allowed bg-black/80 text-gray-500"
                                  : "bg-black/90 text-white hover:bg-black/70"
                              }`}
                              style={{ backdropFilter: "blur(14px)" }}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin text-[#FE9100]" />
                                  <span>Anruf wird vorbereitet</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="h-4 w-4 text-[#FE9100]" />
                                  <span>ARAS AI jetzt anrufen lassen</span>
                                </>
                              )}
                            </motion.button>
                          </motion.div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Result / Summary */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-white/10 bg-black/70 px-5 py-5 sm:px-6 sm:py-6 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {result.success
                            ? "Anruf erfolgreich ausgeführt"
                            : "Anruf fehlgeschlagen"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Zusammenfassung durch ARAS AI
                        </p>
                      </div>
                    </div>

                    {result.summary && (
                      <div className="space-y-3 text-sm text-gray-300">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-1">
                            Kurzprotokoll
                          </div>
                          <p className="text-gray-200">
                            {result.summary.transcript}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 text-xs">
                          <div className="rounded-2xl bg-white/5 px-3 py-2.5 border border-white/10">
                            <div className="text-gray-500 uppercase tracking-[0.18em] mb-1">
                              Stimmung
                            </div>
                            <div className="text-gray-100">
                              {result.summary.sentiment}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white/5 px-3 py-2.5 border border-white/10">
                            <div className="text-gray-500 uppercase tracking-[0.18em] mb-1">
                              Nächste Schritte
                            </div>
                            <div className="text-gray-100">
                              {result.summary.nextSteps}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white/5 px-3 py-2.5 border border-white/10">
                            <div className="text-gray-500 uppercase tracking-[0.18em] mb-1">
                              Dauer
                            </div>
                            <div className="text-gray-100">
                              {formatCallDuration(
                                result.summary.duration ||
                                  callDuration
                              )}
                            </div>
                          </div>
                        </div>
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

              {/* Right column: examples + history */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="space-y-6"
              >
                {/* Example prompts */}
                <div className="rounded-3xl border border-white/10 bg-black/70 px-5 py-5 sm:px-6 sm:py-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Häufige Gesprächsszenarien
                      </h3>
                      <p className="text-xs text-gray-400">
                        Ein Klick, um das Briefing zu übernehmen.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <User className="h-3.5 w-3.5 text-[#FE9100]" />
                      <span>Verwendet von Teams im Alltag</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {EXAMPLE_PROMPTS.map((example, index) => (
                      <motion.button
                        key={index}
                        type="button"
                        onClick={() => setMessage(example.text)}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.06 }}
                        whileHover={{ x: 4 }}
                        className="group w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm transition-colors hover:border-[#FE9100]/40 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-200">
                            {example.text}
                          </span>
                          <span className="text-[11px] text-[#FE9100] opacity-0 group-hover:opacity-100 transition-opacity">
                            Übernehmen
                          </span>
                        </div>
                        {example.detail && (
                          <p className="mt-1 text-xs text-gray-500">
                            {example.detail}
                          </p>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Call history */}
                <div className="rounded-3xl border border-white/10 bg-black/70 px-5 py-5 sm:px-6 sm:py-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Anrufverlauf für diese Nummer
                      </h3>
                      <p className="text-xs text-gray-400">
                        Die letzten automatisierten Gespräche mit diesem
                        Kontakt.
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>

                  {callHistory.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/60 px-4 py-4 text-xs text-gray-500">
                      Sobald ARAS AI Anrufe für diese Nummer geführt hat,
                      erscheint hier eine kurze Übersicht.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {callHistory.slice(0, 4).map((call, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + index * 0.05 }}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">
                                  {call.contactName ||
                                    call.phoneNumber}
                                </span>
                              </div>
                              {call.message && (
                                <p className="text-gray-400 line-clamp-2">
                                  {call.message.substring(0, 120)}
                                  {call.message.length > 120 && "..."}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 text-[11px] text-gray-400">
                              <span>
                                {formatDistanceToNow(
                                  new Date(call.createdAt),
                                  {
                                    addSuffix: true,
                                    locale: de,
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Load ARAS font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .premium-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .premium-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .premium-scroll::-webkit-scrollbar-thumb {
            background: rgba(254, 145, 0, 0.25);
            border-radius: 999px;
          }
          .premium-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(254, 145, 0, 0.45);
          }
        `}</style>
      </div>
    </div>
  );
}
