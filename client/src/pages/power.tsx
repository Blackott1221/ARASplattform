import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, Loader2, CheckCircle2, XCircle, MessageSquare, Clock, User, 
  Sparkles, Zap, BrainCircuit, Download, Play, Pause, Volume2, FileText, 
  TrendingUp, Activity, Radio 
} from "lucide-react";
import type { SubscriptionResponse } from "@shared/schema";

const EXAMPLE_PROMPTS = [
  "Erinnere an den Termin morgen um 10 Uhr",
  "Bestätige die Buchung und gib die Referenznummer durch",
  "Verschiebe meine Reservierung auf Freitag 19:00 Uhr",
  "Informiere über die neue Produktlinie",
  "Vereinbare einen Rückruftermin für nächste Woche",
  "Frag nach Feedback zum letzten Service"
];

const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

const formatPhoneInput = (value: string): string => {
  return value.replace(/[^\d+]/g, '');
};

export default function Power() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [phoneError, setPhoneError] = useState("");
  
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 3500);
    return () => clearInterval(interval);
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
        variant: "destructive"
      });
      return;
    }
    
    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Ungültige Telefonnummer",
        description: "Format: +4917661119320 (ohne Leerzeichen)",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    setCallStatus('ringing');
    setCallDuration(0);
    
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
      
      if (data.success) {
        setCallStatus('connected');
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
        
        toast({
          title: "✅ Anruf gestartet!",
          description: `ARAS AI ruft ${contactName} an...`
        });
        
        setTimeout(() => {
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
          }
          setCallStatus('ended');
        }, 45000);
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message || "Anruf fehlgeschlagen" });
      setCallStatus('idle');
      toast({
        title: "❌ Fehler",
        description: error.message || "Anruf konnte nicht gestartet werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

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
          <div className="max-w-7xl mx-auto">
            {/* Hero Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 text-center"
            >
              <motion.div className="inline-flex items-center gap-3 mb-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FE9100] to-orange-600 blur-xl opacity-50" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FE9100] to-orange-600 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
                <h1 className="text-6xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  <span className="bg-gradient-to-r from-[#FE9100] via-orange-400 to-[#FE9100] bg-clip-text text-transparent">
                    POWER
                  </span>
                </h1>
              </motion.div>
              <p className="text-gray-400 text-lg font-medium">
                Neural Voice AI • Ultra-menschlich • Echtzeit-Analyse
              </p>
              <motion.div 
                className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                <span>System Online</span>
                <span className="mx-2">•</span>
                <TrendingUp className="w-4 h-4 text-[#FE9100]" />
                <span>{subscriptionData.voiceCallsUsed || 0} / {subscriptionData.voiceCallsLimit || '∞'} Calls</span>
              </motion.div>
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
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FE9100]/50 via-orange-500/50 to-[#FE9100]/50 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                  <div className="relative bg-gradient-to-br from-black/80 via-black/60 to-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FE9100]/20 to-orange-600/20 flex items-center justify-center ring-2 ring-[#FE9100]/30">
                          <Phone className="w-6 h-6 text-[#FE9100]" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white">Smart Call</h2>
                          <p className="text-sm text-gray-400">ARAS Neural Voice</p>
                        </div>
                      </div>
                      {callStatus !== 'idle' && (
                        <motion.div 
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                          <span className="text-xs font-medium text-green-400">
                            {callStatus === 'ringing' ? 'Klingelt' : callStatus === 'connected' ? 'Verbunden' : 'Beendet'}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold mb-3 text-gray-200 flex items-center gap-2">
                          <User className="w-4 h-4 text-[#FE9100]" />
                          Kontaktname *
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="z.B. Restaurant Bella Italia"
                          required
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-[#FE9100] focus:ring-2 focus:ring-[#FE9100]/30 focus:outline-none transition-all text-white text-lg placeholder-gray-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-3 text-gray-200 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-[#FE9100]" />
                          Telefonnummer *
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="+4917661119320"
                            required
                            className={`w-full px-5 py-4 bg-white/5 border rounded-xl focus:ring-2 focus:outline-none transition-all text-white text-lg placeholder-gray-500 font-medium ${
                              phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-white/10 focus:border-[#FE9100] focus:ring-[#FE9100]/30'
                            }`}
                          />
                          {phoneNumber && !phoneError && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-4 top-1/2 -translate-y-1/2"
                            >
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </motion.div>
                          )}
                          {phoneError && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-4 top-1/2 -translate-y-1/2"
                            >
                              <XCircle className="w-5 h-5 text-red-500" />
                            </motion.div>
                          )}
                        </div>
                        {phoneError && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400 mt-2 flex items-center gap-1 font-medium"
                          >
                            <XCircle className="w-3 h-3" />
                            {phoneError}
                          </motion.p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-3 text-gray-200 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#FE9100]" />
                          Was soll ARAS sagen? *
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="z.B. Verschiebe meine Reservierung auf morgen 18:00 Uhr"
                          rows={4}
                          required
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-[#FE9100] focus:ring-2 focus:ring-[#FE9100]/30 focus:outline-none transition-all resize-none text-white placeholder-gray-500 font-medium"
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                          <BrainCircuit className="w-3 h-3 text-[#FE9100]" />
                          KI analysiert & optimiert automatisch
                        </p>
                      </div>

                      <motion.button
                        onClick={makeCall}
                        disabled={loading || !phoneNumber || !contactName || !message || !!phoneError}
                        whileHover={{ scale: !loading && phoneNumber && contactName && message && !phoneError ? 1.02 : 1 }}
                        whileTap={{ scale: !loading && phoneNumber && contactName && message && !phoneError ? 0.98 : 1 }}
                        className="w-full relative group"
                      >
                        <div className="absolute -inset-[2px] bg-gradient-to-r from-[#FE9100] via-orange-500 to-[#FE9100] rounded-xl opacity-75 group-hover:opacity-100 blur-lg transition-all animate-gradient" />
                        <div className={`relative py-5 bg-gradient-to-r from-[#FE9100] to-orange-600 rounded-xl font-bold text-xl text-white flex items-center justify-center gap-3 transition-all shadow-xl ${
                          loading || !phoneNumber || !contactName || !message || phoneError ? 'opacity-50 cursor-not-allowed' : ''
                        }`}>
                          {loading ? (
                            <>
                              <Loader2 className="w-7 h-7 animate-spin" />
                              <span>Wird initiiert...</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-7 h-7" />
                              <span>Anruf starten</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                      
                      {callStatus === 'connected' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-sm font-medium text-green-400">Anruf läuft</span>
                            </div>
                            <span className="text-lg font-mono text-white">{formatCallDuration(callDuration)}</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Examples */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.3 }}
                  className="mt-6 relative"
                >
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FE9100]/20 to-orange-600/20 rounded-xl blur" />
                  <div className="relative p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl">
                    <h3 className="font-semibold mb-4 text-[#FE9100] flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4" />
                      Beispiele (klicken zum Übernehmen)
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
                        <div className="w-2 h-2 mt-2 rounded-full bg-[#FE9100] group-hover:shadow-lg group-hover:shadow-[#FE9100]/50" />
                        <p className="text-sm text-gray-300 group-hover:text-white leading-relaxed transition-colors">
                          "{EXAMPLE_PROMPTS[currentExampleIndex]}"
                        </p>
                      </motion.button>
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right: Results */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3 }}
              >
                <AnimatePresence mode="wait">
                  {result && result.success ? (
                    <div className="space-y-6">
                      {/* Call Status Card */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group"
                      >
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-green-500/50 to-emerald-500/50 rounded-2xl blur-xl" />
                        <div className="relative bg-gradient-to-br from-black/80 via-black/60 to-black/80 backdrop-blur-2xl border border-green-500/20 rounded-2xl p-8">
                          <div className="flex items-center gap-4 mb-6">
                            <motion.div 
                              className="w-14 h-14 rounded-xl bg-green-500/20 ring-2 ring-green-500/30 flex items-center justify-center"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <CheckCircle2 className="w-7 h-7 text-green-400" />
                            </motion.div>
                            <div>
                              <h3 className="text-2xl font-bold text-white">Anruf erfolgreich!</h3>
                              <p className="text-gray-400">ARAS AI ist aktiv</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                              <Phone className="w-5 h-5 text-gray-400" />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-1 font-medium">Call ID</p>
                                <p className="text-sm text-white font-mono">{result.callId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium">Status</p>
                                <p className="text-sm text-green-400 font-semibold">{result.status || 'initiated'}</p>
                              </div>
                            </div>
                            {result.message && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-[#FE9100]/10 border border-[#FE9100]/30 rounded-xl"
                              >
                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5 font-medium">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  System Response
                                </p>
                                <p className="text-sm text-white leading-relaxed">{result.message}</p>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>

                      {/* Call Summary - Shown after call ends */}
                      {callStatus === 'ended' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative group"
                        >
                          <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/50 to-pink-500/50 rounded-2xl blur-xl" />
                          <div className="relative bg-gradient-to-br from-black/80 via-black/60 to-black/80 backdrop-blur-2xl border border-purple-500/20 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/30">
                                <FileText className="w-6 h-6 text-purple-400" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white">Call Zusammenfassung</h3>
                                <p className="text-sm text-gray-400">Dauer: {formatCallDuration(callDuration)}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="p-4 bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-500 mb-2 font-medium">Kontakt</p>
                                <p className="text-white font-medium">{contactName}</p>
                              </div>
                              <div className="p-4 bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-500 mb-2 font-medium">Auftrag</p>
                                <p className="text-white">{message}</p>
                              </div>
                              
                              {/* Audio Player Placeholder */}
                              <div className="p-4 bg-gradient-to-r from-[#FE9100]/10 to-orange-600/10 border border-[#FE9100]/30 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Volume2 className="w-4 h-4 text-[#FE9100]" />
                                    <span className="text-sm font-medium text-white">Call Recording</span>
                                  </div>
                                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                    <Download className="w-4 h-4 text-gray-400" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button className="w-10 h-10 rounded-full bg-[#FE9100] hover:bg-orange-600 flex items-center justify-center transition-colors">
                                    <Play className="w-5 h-5 text-white" />
                                  </button>
                                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-[#FE9100] to-orange-600 w-0" />
                                  </div>
                                  <span className="text-xs text-gray-500 font-mono">00:00</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                  ℹ️ Aufnahme wird nach Anruf-Ende automatisch verfügbar
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : result && !result.success ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-red-500/50 to-pink-500/50 rounded-2xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-black/80 via-black/60 to-black/80 backdrop-blur-2xl border border-red-500/20 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-xl bg-red-500/20 ring-2 ring-red-500/30 flex items-center justify-center">
                            <XCircle className="w-7 h-7 text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-white">Fehler</h3>
                            <p className="text-gray-400">Versuch es erneut</p>
                          </div>
                        </div>
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <p className="text-red-400 text-sm">{result.error}</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center min-h-[500px]"
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