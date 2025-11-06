import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2, CheckCircle2, XCircle, MessageSquare, Clock, User, Mic, FileText, Sparkles, Play, StopCircle, Zap, TrendingUp } from "lucide-react";
import type { SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

export default function VoiceCalls() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState(false);

  const { data: userSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });
  
  const subscriptionData = userSubscription || {
    plan: 'starter',
    status: 'active',
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: 100,
    voiceCallsLimit: 10
  };

  const handleSectionChange = (section: string) => {
    if (section !== "voice-agents") {
      window.location.href = `/${section}`;
    }
  };

  const fetchTranscript = async (callId: string, attempt = 1) => {
    if (attempt === 1) setLoadingTranscript(true);
    setTranscriptError(false);
    
    try {
      const response = await fetch(`/api/voice/calls/${callId}/transcript`);
      const data = await response.json();
      
      if (data.success && data.transcript) {
        setTranscript(data.transcript);
        setLoadingTranscript(false);
      } else if (attempt < 10) {
        setTimeout(() => fetchTranscript(callId, attempt + 1), 5000);
      } else {
        setTranscriptError(true);
        setLoadingTranscript(false);
      }
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      if (attempt < 10) {
        setTimeout(() => fetchTranscript(callId, attempt + 1), 5000);
      } else {
        setTranscriptError(true);
        setLoadingTranscript(false);
      }
    }
  };

  const makeCall = async () => {
    if (!phoneNumber) return;
    
    setLoading(true);
    setResult(null);
    setTranscript(null);
    setTranscriptError(false);
    
    try {
      if (customPrompt.trim()) {
        const taskRes = await fetch("/api/voice/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            taskName: "Quick Call",
            taskPrompt: customPrompt,
            phoneNumber 
          })
        });
        const taskData = await taskRes.json();
        
        const execRes = await fetch("/api/voice/tasks/" + taskData.task.id + "/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber, taskPrompt: customPrompt })
        });
        const data = await execRes.json();
        setResult(data);
        if (data.call && data.call.call_id) {
          fetchTranscript(data.call.call_id);
        }
      } else {
        const response = await fetch("/api/voice/retell/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber })
        });
        const data = await response.json();
        setResult(data);
        if (data.call && data.call.call_id) {
          fetchTranscript(data.call.call_id);
        }
      }
    } catch (error) {
      setResult({ success: false, message: "Call failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar 
        activeSection="voice-agents" 
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col relative">
        <TopBar 
          currentSection="voice-agents" 
          subscriptionData={subscriptionData}
          user={user as import("@shared/schema").User}
          isVisible={true}
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Hero Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <motion.div 
                  className="relative"
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="absolute inset-0 bg-[#FE9100] blur-2xl opacity-30" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FE9100]/20 to-[#a34e00]/20 border border-[#FE9100]/30 flex items-center justify-center backdrop-blur-sm">
                    <Phone className="w-8 h-8 text-[#FE9100]" />
                  </div>
                </motion.div>
                <div>
                  <h1 className="text-4xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <span className="bg-gradient-to-r from-white via-[#FE9100] to-white bg-clip-text text-transparent">
                      VOICE AGENTS
                    </span>
                  </h1>
                  <p className="text-gray-400 flex items-center gap-2 mt-2">
                    <Zap className="w-4 h-4 text-[#FE9100]" />
                    KI-gesteuerte Anrufe in Echtzeit
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FE9100]/10 to-[#a34e00]/10 rounded-xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Anrufe heute</p>
                        <p className="text-2xl font-bold text-white">0</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-[#FE9100]/20 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-[#FE9100]" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Erfolgsrate</p>
                        <p className="text-2xl font-bold text-white">--</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Gesamt</p>
                        <p className="text-2xl font-bold text-white">{subscriptionData.voiceCallsUsed}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Call Form */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2 }}
              >
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FE9100] via-[#a34e00] to-[#FE9100] rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
                  <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <motion.div 
                        className="w-10 h-10 rounded-xl bg-[#FE9100]/20 flex items-center justify-center ring-2 ring-[#FE9100]/30"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <Play className="w-5 h-5 text-[#FE9100]" />
                      </motion.div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Neuer Anruf starten</h2>
                        <p className="text-sm text-gray-400">ARAS AI ruft für dich an</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Phone Number Input */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-[#FE9100]" />
                          Telefonnummer
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+49 176 12345678"
                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:border-[#FE9100] focus:ring-2 focus:ring-[#FE9100]/20 focus:outline-none transition-all text-white placeholder-gray-500"
                          />
                          <motion.div 
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            animate={{ scale: phoneNumber ? [1, 1.2, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            {phoneNumber && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          </motion.div>
                        </div>
                      </div>

                      {/* Custom Prompt */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#FE9100]" />
                          Was soll ARAS sagen? (Optional)
                        </label>
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="z.B. Bestätige den Termin für morgen um 10 Uhr..."
                          rows={4}
                          className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:border-[#FE9100] focus:ring-2 focus:ring-[#FE9100]/20 focus:outline-none transition-all resize-none text-white placeholder-gray-500"
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#FE9100]" />
                          Gib ARAS spezifische Anweisungen oder lass es leer für Standard
                        </p>
                      </div>

                      {/* Call Button */}
                      <motion.button
                        onClick={makeCall}
                        disabled={loading || !phoneNumber}
                        whileHover={{ scale: !loading && phoneNumber ? 1.02 : 1 }}
                        whileTap={{ scale: !loading && phoneNumber ? 0.98 : 1 }}
                        className="w-full relative group"
                      >
                        <div className="absolute -inset-[2px] bg-gradient-to-r from-[#FE9100] to-[#a34e00] rounded-xl opacity-75 group-hover:opacity-100 blur group-hover:blur-md transition-all" />
                        <div className={`relative py-4 bg-gradient-to-r from-[#FE9100] to-[#a34e00] rounded-xl font-semibold text-lg text-white flex items-center justify-center gap-3 transition-all ${
                          loading || !phoneNumber ? 'opacity-50 cursor-not-allowed' : ''
                        }`}>
                          {loading ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span>Anruf läuft...</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-6 h-6" />
                              <span>Jetzt anrufen</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Examples Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3 }}
                  className="mt-4 p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl"
                >
                  <h3 className="font-semibold mb-3 text-[#FE9100] flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4" />
                    Beispiel-Anweisungen
                  </h3>
                  <ul className="text-xs text-gray-400 space-y-2">
                    <li className="flex items-start gap-2 hover:text-gray-300 transition-colors">
                      <span className="text-[#FE9100] mt-0.5">→</span>
                      <span>"Erinnere an den Termin morgen um 10 Uhr"</span>
                    </li>
                    <li className="flex items-start gap-2 hover:text-gray-300 transition-colors">
                      <span className="text-[#FE9100] mt-0.5">→</span>
                      <span>"Bestätige die Buchung und gib Referenznummer durch"</span>
                    </li>
                    <li className="flex items-start gap-2 hover:text-gray-300 transition-colors">
                      <span className="text-[#FE9100] mt-0.5">→</span>
                      <span>"Frag ob noch Interesse am Angebot besteht"</span>
                    </li>
                  </ul>
                </motion.div>
              </motion.div>

              {/* Right: Results */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <AnimatePresence mode="wait">
                  {result ? (
                    <>
                      {/* Call Status */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative group"
                      >
                        <div className={`absolute -inset-[1px] rounded-2xl blur-sm transition-opacity ${
                          result.success ? 'bg-gradient-to-r from-green-500 to-emerald-500 opacity-50' : 'bg-gradient-to-r from-red-500 to-pink-500 opacity-50'
                        }`} />
                        <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <motion.div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                result.success ? 'bg-green-500/20 ring-2 ring-green-500/30' : 'bg-red-500/20 ring-2 ring-red-500/30'
                              }`}
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              {result.success ? 
                                <CheckCircle2 className="w-6 h-6 text-green-400" /> : 
                                <XCircle className="w-6 h-6 text-red-400" />
                              }
                            </motion.div>
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {result.success ? "Anruf aktiv!" : "Fehler"}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {result.success ? "ARAS AI ist verbunden" : "Versuch es erneut"}
                              </p>
                            </div>
                          </div>
                          
                          {result.call && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-400">Call ID</p>
                                  <p className="text-xs text-white font-mono truncate">{result.call.call_id}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-400">Status</p>
                                  <p className="text-sm text-green-400 font-medium">{result.call.call_status}</p>
                                </div>
                              </div>
                              {customPrompt && (
                                <div className="mt-3 p-3 bg-[#FE9100]/10 border border-[#FE9100]/30 rounded-lg">
                                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                                    <MessageSquare className="w-3 h-3" />
                                    Anweisung
                                  </p>
                                  <p className="text-sm text-white">{customPrompt}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>

                      {/* Transcript */}
                      {result.success && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="relative group"
                        >
                          <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-30 group-hover:opacity-50 blur-sm transition-opacity" />
                          <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
                                <FileText className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-white">Gesprächs-Transkript</h3>
                                <p className="text-sm text-gray-400">Live-Konversation</p>
                              </div>
                            </div>

                            <div className="min-h-[200px]">
                              {loadingTranscript && !transcript && (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Loader2 className="w-8 h-8 text-[#FE9100] mb-3" />
                                  </motion.div>
                                  <p className="text-sm">Transkript wird erstellt...</p>
                                  <p className="text-xs text-gray-500 mt-1">Bis zu 50 Sekunden</p>
                                </div>
                              )}

                              {transcript && (
                                <motion.div 
                                  initial={{ opacity: 0 }} 
                                  animate={{ opacity: 1 }}
                                  className="p-4 bg-white/5 rounded-xl border border-white/5 max-h-[400px] overflow-y-auto"
                                >
                                  <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">{transcript}</pre>
                                </motion.div>
                              )}

                              {transcriptError && !transcript && (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                  <XCircle className="w-8 h-8 mb-3 text-red-500" />
                                  <p className="text-sm">Transkript nicht verfügbar</p>
                                  <p className="text-xs text-gray-500 mt-1">Call war zu kurz</p>
                                </div>
                              )}

                              {!loadingTranscript && !transcript && !transcriptError && (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                  <FileText className="w-8 h-8 mb-3 text-gray-600" />
                                  <p className="text-sm">Warte auf Transkript...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="w-20 h-20 rounded-full bg-[#FE9100]/20 flex items-center justify-center mb-4"
                      >
                        <Phone className="w-10 h-10 text-[#FE9100]" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-2">Bereit für deinen Call?</h3>
                      <p className="text-gray-400 text-sm max-w-sm">
                        Gib eine Telefonnummer ein und starte einen KI-gesteuerten Anruf mit ARAS AI
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
