import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2, CheckCircle2, XCircle, MessageSquare, Clock, User, Mic, FileText, Sparkles } from "lucide-react";

export default function VoiceCalls() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fe9100] to-orange-600 flex items-center justify-center shadow-lg shadow-[#fe9100]/20">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                ARAS Voice AI
              </h1>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Sparkles className="w-4 h-4 text-[#fe9100]" />
                Powered by Retell AI
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#fe9100]/20 flex items-center justify-center ring-2 ring-[#fe9100]/30">
                  <Phone className="w-6 h-6 text-[#fe9100]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Neuer Anruf</h2>
                  <p className="text-sm text-gray-400">Starte einen KI-gesteuerten Call</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#fe9100]" />
                    Telefonnummer *
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+4917661119320"
                    className="w-full px-4 py-3.5 bg-black/50 border border-gray-700/50 rounded-xl focus:border-[#fe9100] focus:ring-2 focus:ring-[#fe9100]/20 focus:outline-none transition-all text-lg text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#fe9100]" />
                    Was soll ARAS sagen? (Optional)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Bestätige die Buchung und gib die Referenznummer durch"
                    rows={4}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700/50 rounded-xl focus:border-[#fe9100] focus:ring-2 focus:ring-[#fe9100]/20 focus:outline-none transition-all resize-none text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Lass das Feld leer für einen Standard-Anruf oder gib ARAS spezifische Anweisungen
                  </p>
                </div>

                <button
                  onClick={makeCall}
                  disabled={loading || !phoneNumber}
                  className="w-full py-4 bg-gradient-to-r from-[#fe9100] to-orange-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-[#fe9100]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-white hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Rufe an...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-6 h-6" />
                      <span>{customPrompt ? "Mit Custom Prompt anrufen" : "Jetzt anrufen"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 p-6 bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-xl border border-gray-800/50 rounded-2xl">
              <h3 className="font-semibold mb-3 text-[#fe9100] flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Beispiele für Custom Prompts
              </h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#fe9100] mt-0.5">•</span><span>"Erinnere an den Termin morgen um 10 Uhr"</span></li>
                <li className="flex items-start gap-2"><span className="text-[#fe9100] mt-0.5">•</span><span>"Sag dass das Essen verschoben wird auf Freitag 19 Uhr"</span></li>
                <li className="flex items-start gap-2"><span className="text-[#fe9100] mt-0.5">•</span><span>"Frag ob die Person noch Interesse am Angebot hat"</span></li>
                <li className="flex items-start gap-2"><span className="text-[#fe9100] mt-0.5">•</span><span>"Bestätige die Buchung und gib die Referenznummer durch"</span></li>
              </ul>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${result.success ? 'bg-green-500/20 ring-2 ring-green-500/30' : 'bg-red-500/20 ring-2 ring-red-500/30'}`}>
                      {result.success ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{result.success ? "Anruf gestartet!" : "Fehler"}</h3>
                      <p className="text-sm text-gray-400">Call Details</p>
                    </div>
                  </div>
                  
                  {result.call && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400">Call ID</p>
                          <p className="text-sm text-white font-mono truncate">{result.call.call_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Status</p>
                          <p className="text-sm text-green-500 font-medium">{result.call.call_status}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg">
                        <Mic className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Agent</p>
                          <p className="text-sm text-[#fe9100] font-medium">ARAS AI</p>
                        </div>
                      </div>
                      {customPrompt && (
                        <div className="mt-4 p-4 bg-gradient-to-br from-[#fe9100]/10 to-orange-600/10 border border-[#fe9100]/30 rounded-xl">
                          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" />
                            Custom Prompt
                          </p>
                          <p className="text-sm text-white leading-relaxed">{customPrompt}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {result.message && !result.success && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-red-400 text-sm">{result.message}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {result && result.success && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
                      <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Gesprächs-Transkript</h3>
                      <p className="text-sm text-gray-400">Live-Konversation</p>
                    </div>
                  </div>

                  <div className="min-h-[200px]">
                    {loadingTranscript && !transcript && (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#fe9100]" />
                        <p className="text-sm">Transkript wird geladen...</p>
                        <p className="text-xs text-gray-500 mt-1">Dies kann bis zu 50 Sekunden dauern</p>
                      </div>
                    )}

                    {transcript && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-black/30 rounded-xl border border-gray-700/50">
                        <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">{transcript}</pre>
                      </motion.div>
                    )}

                    {transcriptError && !transcript && (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <XCircle className="w-8 h-8 mb-3 text-red-500" />
                        <p className="text-sm">Transkript konnte nicht geladen werden</p>
                        <p className="text-xs text-gray-500 mt-1">Der Call war möglicherweise zu kurz</p>
                      </div>
                    )}

                    {!loadingTranscript && !transcript && !transcriptError && (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <FileText className="w-8 h-8 mb-3 text-gray-600" />
                        <p className="text-sm">Warte auf Transkript...</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}