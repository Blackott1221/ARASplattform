import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2, CheckCircle2, XCircle, MessageSquare, Clock, User, Sparkles, Zap, BrainCircuit } from "lucide-react";
import type { SubscriptionResponse } from "@shared/schema";

const EXAMPLE_PROMPTS = [
  "Erinnere an den Termin morgen um 10 Uhr",
  "Bestätige die Buchung und gib die Referenznummer durch",
  "Frag ob noch Interesse am Angebot besteht",
  "Informiere über die neue Produktlinie",
  "Vereinbare einen Rückruftermin für nächste Woche",
  "Bestätige den Liefertermin für Freitag",
  "Erinnere an die ausstehende Rechnung",
  "Frag nach Feedback zum letzten Service",
  "Teile mit dass das Meeting verschoben wurde",
  "Informiere über die Sonderaktion diese Woche",
  "Bestätige die Tischreservierung für heute Abend",
  "Erinnere an den Zahnarzttermin übermorgen"
];

const PHONE_EXAMPLES = [
  "+49 176 311 18560",
  "+49 152 345 67890",
  "+49 168 123 45678",
  "+49 177 987 65432"
];

export default function Power() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [currentPhoneExample, setCurrentPhoneExample] = useState(0);

  const { data: userSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });
  
  const subscriptionData = userSubscription || {
    plan: 'pro',
    status: 'active',
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: 100,
    voiceCallsLimit: 10
  };

  const handleSectionChange = (section: string) => {
    if (section !== "power") {
      window.location.href = `/app/${section}`;
    }
  };

  // Cycle through example prompts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Cycle through phone examples
  useEffect(() => {
    if (phoneNumber) return;
    
    const interval = setInterval(() => {
      setCurrentPhoneExample((prev) => (prev + 1) % PHONE_EXAMPLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phoneNumber]);

  const makeCall = async () => {
    if (!phoneNumber || !contactName || !message) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/aras-voice/smart-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: contactName,
          phoneNumber,
          message
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ 
        success: false, 
        error: error.message || "Anruf fehlgeschlagen" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar 
        activeSection="power" 
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col relative">
        <TopBar 
          currentSection="power" 
          subscriptionData={subscriptionData}
          user={user as import("@shared/schema").User}
          isVisible={true}
        />
        
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Hero Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block"
              >
                <h1 className="text-5xl font-bold mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  <span className="bg-gradient-to-r from-[#FE9100] via-white to-[#FE9100] bg-clip-text text-transparent">
                    ARAS POWER CALL
                  </span>
                </h1>
              </motion.div>
              <p className="text-gray-400 flex items-center justify-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-[#FE9100]" />
                Neural Voice System - Ultra-menschliche KI-Anrufe
              </p>
            </motion.div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Call Form */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2 }}
              >
                <div className="relative group">
                  <div className="absolute -inset-[2px] bg-gradient-to-r from-[#FE9100] via-[#a34e00] to-[#FE9100] rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
                  <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <motion.div 
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FE9100]/20 to-[#a34e00]/20 flex items-center justify-center ring-2 ring-[#FE9100]/30"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <Phone className="w-6 h-6 text-[#FE9100]" />
                      </motion.div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Smart Call</h2>
                        <p className="text-sm text-gray-400">ARAS ruft für dich an</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Contact Name Input */}
                      <div>
                        <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-[#FE9100]" />
                          Kontaktname
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="z.B. Restaurant Bella Italia"
                          className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl focus:border-[#FE9100] focus:ring-2 focus:ring-[#FE9100]/20 focus:outline-none transition-all text-white text-lg"
                        />
                      </div>

                      {/* Phone Number Input */}
                      <div>
                        <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-[#FE9100]" />
                          Telefonnummer
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl focus:border-[#FE9100] focus:ring-2 focus:ring-[#FE9100]/20 focus:outline-none transition-all text-white text-lg"
                          />
                          
                          {/* Animated Placeholder */}
                          <AnimatePresence mode="wait">
                            {!phoneNumber && (
                              <motion.div
                                key={currentPhoneExample}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 flex items-center px-5 pointer-events-none text-gray-500 text-lg"
                              >
                                {PHONE_EXAMPLES[currentPhoneExample]}
                              </motion.div>
                            )}
                          </AnimatePresence>
                          
                          {phoneNumber && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-4 top-1/2 -translate-y-1/2"
                            >
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Message Input */}
                      <div>
                        <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#FE9100]" />
                          Was soll ARAS sagen?
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="z.B. Verschiebe meine Reservierung auf morgen 18:00 Uhr"
                          rows={4}
                          className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl focus:border-[#FE9100] focus:ring-2 focus:ring-[#FE9100]/20 focus:outline-none transition-all resize-none text-white"
                        />
                      </div>

                      {/* Call Button */}
                      <motion.button
                        onClick={makeCall}
                        disabled={loading || !phoneNumber || !contactName || !message}
                        whileHover={{ scale: !loading && phoneNumber && contactName && message ? 1.02 : 1 }}
                        whileTap={{ scale: !loading && phoneNumber && contactName && message ? 0.98 : 1 }}
                        className="w-full relative group"
                      >
                        <div className="absolute -inset-[2px] bg-gradient-to-r from-[#FE9100] to-[#a34e00] rounded-xl opacity-75 group-hover:opacity-100 blur-md transition-all" />
                        <div className={`relative py-5 bg-gradient-to-r from-[#FE9100] to-[#a34e00] rounded-xl font-bold text-xl text-white flex items-center justify-center gap-3 transition-all ${
                          loading || !phoneNumber || !contactName || !message ? 'opacity-50 cursor-not-allowed' : ''
                        }`}>
                          {loading ? (
                            <>
                              <Loader2 className="w-7 h-7 animate-spin" />
                              <span>ARAS ruft an...</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-7 h-7" />
                              <span>Jetzt anrufen</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Animated Examples Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3 }}
                  className="mt-6 relative"
                >
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FE9100]/20 to-[#a34e00]/20 rounded-xl blur" />
                  <div className="relative p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl">
                    <h3 className="font-semibold mb-4 text-[#FE9100] flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4" />
                      Beispiel-Anweisungen (klicken zum Übernehmen)
                    </h3>
                    
                    <AnimatePresence mode="wait">
                      <motion.button
                        key={currentExampleIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                        onClick={() => setMessage(EXAMPLE_PROMPTS[currentExampleIndex])}
                        className="w-full text-left flex items-start gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-[#FE9100]/30 transition-all group cursor-pointer"
                      >
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="flex-shrink-0 mt-0.5"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#FE9100] group-hover:shadow-lg group-hover:shadow-[#FE9100]/50" />
                        </motion.div>
                        <p className="text-sm text-gray-300 group-hover:text-white leading-relaxed transition-colors">
                          "{EXAMPLE_PROMPTS[currentExampleIndex]}"
                        </p>
                      </motion.button>
                    </AnimatePresence>

                    {/* Progress Dots */}
                    <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
                      {Array.from({ length: Math.min(EXAMPLE_PROMPTS.length, 12) }).map((_, index) => (
                        <motion.div
                          key={index}
                          className={`h-1 rounded-full transition-all ${
                            index === currentExampleIndex % 12
                              ? 'w-8 bg-[#FE9100]' 
                              : 'w-1 bg-gray-600'
                          }`}
                          animate={{
                            scale: index === currentExampleIndex % 12 ? [1, 1.2, 1] : 1
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right: Results */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative group"
                    >
                      <div className={`absolute -inset-[2px] rounded-2xl blur transition-all ${
                        result.success ? 'bg-gradient-to-r from-green-500 to-emerald-500 opacity-50 group-hover:opacity-75' : 'bg-gradient-to-r from-red-500 to-pink-500 opacity-50'
                      }`} />
                      <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                          <motion.div 
                            className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                              result.success ? 'bg-green-500/20 ring-2 ring-green-500/30' : 'bg-red-500/20 ring-2 ring-red-500/30'
                            }`}
                            animate={{ scale: result.success ? [1, 1.05, 1] : 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {result.success ? 
                              <CheckCircle2 className="w-7 h-7 text-green-400" /> : 
                              <XCircle className="w-7 h-7 text-red-400" />
                            }
                          </motion.div>
                          <div>
                            <h3 className="text-2xl font-bold text-white">
                              {result.success ? "Anruf gestartet!" : "Fehler"}
                            </h3>
                            <p className="text-gray-400">
                              {result.success ? "ARAS AI ist verbunden" : "Versuch es erneut"}
                            </p>
                          </div>
                        </div>
                        
                        {result.callId && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                              <Phone className="w-5 h-5 text-gray-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 mb-1">Call ID</p>
                                <p className="text-sm text-white font-mono truncate">{result.callId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Status</p>
                                <p className="text-sm text-green-400 font-semibold">{result.status || 'initiated'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                              <BrainCircuit className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-400 mb-1">System</p>
                                <p className="text-sm text-[#FE9100] font-semibold">ARAS Neural Voice</p>
                              </div>
                            </div>
                            {result.message && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 bg-[#FE9100]/10 border border-[#FE9100]/30 rounded-lg"
                              >
                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Antwort
                                </p>
                                <p className="text-sm text-white leading-relaxed">{result.message}</p>
                              </motion.div>
                            )}
                          </div>
                        )}
                        
                        {result.error && (
                          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-red-400 text-sm">{result.error}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center min-h-[500px]"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="w-24 h-24 rounded-full bg-[#FE9100]/20 flex items-center justify-center mb-6 ring-4 ring-[#FE9100]/10"
                      >
                        <Phone className="w-12 h-12 text-[#FE9100]" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-white mb-3">Bereit für deinen Call?</h3>
                      <p className="text-gray-400 max-w-sm">
                        Gib Kontaktdaten ein und starte einen KI-gesteuerten Anruf mit ARAS Neural Voice
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}