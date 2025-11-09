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
  TrendingUp, Activity, Radio, PhoneCall, Mic, MicOff, AlertCircle, Star
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
  "Bestellungen aufnehmen"
];

const EXAMPLE_PROMPTS = [
  { icon: "📅", text: "Erinnere an den Termin morgen um 10 Uhr" },
  { icon: "✅", text: "Bestätige die Buchung mit Referenznummer" },
  { icon: "🔄", text: "Verschiebe die Reservierung auf Freitag" },
  { icon: "📞", text: "Vereinbare einen Rückruftermin" },
  { icon: "💬", text: "Hole Kundenfeedback zum Service ein" },
  { icon: "🎯", text: "Qualifiziere den Lead für das Sales-Team" }
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
  const [phoneError, setPhoneError] = useState("");
  
  // Premium animations like chat-interface
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connected' | 'ended' | 'processing'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    voiceCallsLimit: 10,
    renewalDate: new Date().toISOString(),
    hasPaymentMethod: false,
    requiresPaymentSetup: false,
    isTrialActive: false,
    canUpgrade: false
  };

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
            setCurrentTextIndex((prev) => (prev + 1) % ANIMATED_TEXTS.length);
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
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  // Placeholder animation rotation
  useEffect(() => {
    const placeholderInterval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % EXAMPLE_PROMPTS.length);
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
    setCallStatus('processing');
    setCallDuration(0);
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      setCallStatus('ringing');
      
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
      
      if (data.success) {
        // Simulate realistic call progression
        setTimeout(() => setCallStatus('connected'), 3000);
        
        // Start call timer after connection
        setTimeout(() => {
          callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }, 3000);
        
        // Mock call end with summary (since API doesn't return it yet)
        setTimeout(() => {
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
          }
          setCallStatus('ended');
          
          // Add mock summary data
          setResult({
            ...data,
            success: true,
            summary: {
              transcript: "Gespräch erfolgreich durchgeführt. Kunde wurde über " + message + " informiert.",
              sentiment: "positiv",
              nextSteps: "Follow-up Email wurde vereinbart",
              duration: callDuration
            },
            recordingUrl: "mock-recording-url" // Mock until API provides it
          });
        }, 15000); // Shorter for demo
        
        toast({
          title: "✅ Anruf wird verbunden",
          description: `ARAS AI ruft ${contactName} an...`
        });
      } else {
        setResult(data);
        setCallStatus('idle');
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
    <div className="flex h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* ARAS Pattern Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/5 via-transparent to-[#FE9100]/5" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(254, 145, 0, 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(254, 145, 0, 0.05) 0%, transparent 50%),
                            radial-gradient(circle at 40% 20%, rgba(254, 145, 0, 0.08) 0%, transparent 50%)`
        }} />
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
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* ARAS CI Hero Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              {/* ARAS AI Logo with Premium Gradient Animation */}
              <motion.h1 
                className="text-7xl font-bold mb-4 relative"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <span
                  className="relative inline-block"
                  style={{
                    color: '#e9d7c4',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <motion.span
                    className="absolute inset-0"
                    animate={{
                      backgroundImage: [
                        'linear-gradient(90deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)',
                        'linear-gradient(90deg, #FE9100 0%, #a34e00 25%, #e9d7c4 50%, #a34e00 75%, #FE9100 100%)',
                        'linear-gradient(90deg, #a34e00 0%, #e9d7c4 25%, #FE9100 50%, #e9d7c4 75%, #a34e00 100%)',
                        'linear-gradient(90deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)',
                      ],
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    style={{
                      backgroundSize: '300% 100%',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    POWER
                  </motion.span>
                  <span style={{ opacity: 0 }}>POWER</span>
                </span>
              </motion.h1>
              
              {/* Typewriter Animation */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 text-lg text-gray-500 mb-6"
              >
                <span>ARAS AI</span>
                <span 
                  className="font-medium min-w-[280px] text-left"
                  style={{
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                    backgroundSize: '200% auto',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {displayText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-[3px] h-[20px] bg-[#FE9100] ml-1 align-middle"
                  />
                </span>
              </motion.div>
              
              {/* Status Bar */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-gray-400">System Online</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-[#FE9100]" />
                  <span className="text-sm text-gray-400">
                    {subscriptionData.voiceCallsUsed || 0} / {subscriptionData.voiceCallsLimit || '∞'} Anrufe
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column: Smart Call Form */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                {/* Form Card with ARAS CI Design */}
                <div className="relative group">
                  {/* Premium Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FE9100]/20 via-transparent to-[#FE9100]/20 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                  
                  <div className="relative bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-[#FE9100]/20 transition-all">
                    {/* Header with Status */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className="relative"
                          animate={{ 
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <div className="absolute inset-0 bg-[#FE9100] blur-lg opacity-50" />
                          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FE9100] to-orange-600 flex items-center justify-center shadow-lg">
                            <PhoneCall className="w-7 h-7 text-white" />
                          </div>
                        </motion.div>
                        <div>
                          <h2 className="text-2xl font-bold text-white">Smart Voice Call</h2>
                          <p className="text-sm text-gray-400">ARAS Neural Engine</p>
                        </div>
                      </div>
                      
                      {/* Call Status Indicator */}
                      <AnimatePresence>
                        {callStatus !== 'idle' && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                              callStatus === 'processing' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                              callStatus === 'ringing' ? 'bg-blue-500/20 border border-blue-500/30' :
                              callStatus === 'connected' ? 'bg-green-500/20 border border-green-500/30' :
                              'bg-gray-500/20 border border-gray-500/30'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full animate-pulse ${
                              callStatus === 'processing' ? 'bg-yellow-500' :
                              callStatus === 'ringing' ? 'bg-blue-500' :
                              callStatus === 'connected' ? 'bg-green-500' :
                              'bg-gray-500'
                            }`} />
                            <span className="text-xs font-medium text-white">
                              {callStatus === 'processing' ? 'Verarbeitet...' :
                               callStatus === 'ringing' ? 'Klingelt...' :
                               callStatus === 'connected' ? `Verbunden ${formatCallDuration(callDuration)}` :
                               'Beendet'}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                      {/* Contact Name Field */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-[#FE9100]" />
                          Kontaktname
                          <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="z.B. Max Mustermann"
                            required
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-[#FE9100]/50 focus:bg-white/10 focus:outline-none transition-all text-white placeholder-gray-600 hover:border-white/20"
                          />
                          <AnimatePresence>
                            {contactName && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2"
                              >
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      {/* Phone Number Field */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-[#FE9100]" />
                          Telefonnummer
                          <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="+4917661119320"
                            required
                            className={`w-full px-5 py-4 bg-white/5 border rounded-xl focus:bg-white/10 focus:outline-none transition-all text-white placeholder-gray-600 hover:border-white/20 ${
                              phoneError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#FE9100]/50'
                            }`}
                          />
                          <AnimatePresence>
                            {phoneNumber && !phoneError && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2"
                              >
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              </motion.div>
                            )}
                            {phoneError && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2"
                              >
                                <AlertCircle className="w-5 h-5 text-red-500" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <AnimatePresence>
                          {phoneError && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="text-xs text-red-400 mt-2 flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {phoneError}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Message Field with Animated Placeholder */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#FE9100]" />
                          Was soll ARAS sagen?
                          <span className="text-red-400">*</span>
                          <motion.span 
                            className="ml-auto text-xs text-[#FE9100]"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            Sei so detailliert wie möglich!
                          </motion.span>
                        </label>
                        <div className="relative">
                          <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`${EXAMPLE_PROMPTS[placeholderIndex].icon} ${EXAMPLE_PROMPTS[placeholderIndex].text}`}
                            required
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-[#FE9100]/50 focus:bg-white/10 focus:outline-none transition-all resize-none text-white placeholder-gray-600 hover:border-white/20 min-h-[120px]"
                          />
                          <AnimatePresence>
                            {message && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-3 right-3"
                              >
                                <span className="text-xs text-gray-500">{message.length} Zeichen</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.p 
                          className="text-xs text-gray-500 mt-2 flex items-center gap-1.5"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          <BrainCircuit className="w-3 h-3 text-[#FE9100]" />
                          ARAS AI optimiert deine Nachricht mit GPT-4
                        </motion.p>
                      </motion.div>

                      {/* Premium Call Button */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <motion.button
                          onClick={makeCall}
                          disabled={loading || !phoneNumber || !contactName || !message || !!phoneError}
                          whileHover={{ scale: !loading && phoneNumber && contactName && message && !phoneError ? 1.01 : 1 }}
                          whileTap={{ scale: !loading && phoneNumber && contactName && message && !phoneError ? 0.99 : 1 }}
                          className="w-full relative overflow-hidden group"
                        >
                          {/* Animated gradient background */}
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-[#FE9100] via-orange-500 to-[#FE9100]"
                            animate={{
                              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            style={{
                              backgroundSize: '200% 100%',
                            }}
                          />
                          
                          {/* Button content */}
                          <div className={`relative py-5 px-8 font-bold text-lg text-white flex items-center justify-center gap-3 transition-all ${
                            loading || !phoneNumber || !contactName || !message || phoneError ? 'opacity-60' : ''
                          }`}>
                            {loading ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Loader2 className="w-5 h-5" />
                                </motion.div>
                                <span>Verbindung wird hergestellt...</span>
                              </>
                            ) : (
                              <>
                                <PhoneCall className="w-5 h-5" />
                                <span>Jetzt anrufen lassen</span>
                                <Sparkles className="w-4 h-4" />
                              </>
                            )}
                          </div>
                        </motion.button>
                      
                          
                        {/* Call Duration Display */}
                        <AnimatePresence>
                          {callStatus === 'connected' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                  <span className="text-sm text-green-400 font-medium">Live-Verbindung</span>
                                </div>
                                <span className="text-sm text-gray-400 font-mono">
                                  {formatCallDuration(callDuration)}
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Example Prompts - Premium Cards */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#FE9100]" />
                    Beispiel-Anrufe
                  </h3>
                  
                  {/* Smooth rotating examples */}
                  <div className="grid grid-cols-1 gap-3">
                    {EXAMPLE_PROMPTS.slice(0, 3).map((example, index) => (
                      <motion.button
                        key={index}
                        onClick={() => setMessage(example.text)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        whileHover={{ x: 4 }}
                        className="group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FE9100]/0 via-[#FE9100]/5 to-[#FE9100]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-start gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-[#FE9100]/20 transition-all text-left">
                          <span className="text-2xl">{example.icon}</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-300 group-hover:text-white transition-colors">
                              {example.text}
                            </p>
                          </div>
                          <motion.div 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={{ rotate: -90 }}
                            whileHover={{ rotate: 0 }}
                          >
                            <Zap className="w-4 h-4 text-[#FE9100]" />
                          </motion.div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column: Results & Status */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <AnimatePresence mode="wait">
                  {/* Active Call Status */}
                  {(callStatus === 'processing' || callStatus === 'ringing' || callStatus === 'connected') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-[#FE9100]/20 to-blue-500/20 rounded-2xl blur-2xl" />
                      <div className="relative bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                        <div className="flex flex-col items-center text-center space-y-6">
                          {/* Animated Phone Icon */}
                          <motion.div
                            className="relative"
                            animate={{
                              scale: callStatus === 'connected' ? [1, 1.1, 1] : [1, 1.05, 1],
                              rotate: callStatus === 'ringing' ? [0, 10, -10, 0] : 0
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <div className="absolute inset-0 bg-[#FE9100] blur-3xl opacity-30" />
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FE9100] to-orange-600 flex items-center justify-center">
                              {callStatus === 'processing' ? (
                                <Loader2 className="w-10 h-10 text-white animate-spin" />
                              ) : callStatus === 'ringing' ? (
                                <PhoneCall className="w-10 h-10 text-white" />
                              ) : (
                                <Mic className="w-10 h-10 text-white" />
                              )}
                            </div>
                            {callStatus === 'connected' && (
                              <motion.div
                                className="absolute -inset-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <div className="w-full h-full rounded-full border-2 border-[#FE9100]" />
                              </motion.div>
                            )}
                          </motion.div>
                          
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                              {callStatus === 'processing' ? 'Wird vorbereitet...' :
                               callStatus === 'ringing' ? 'Klingelt bei ' + contactName :
                               'Im Gespräch mit ' + contactName}
                            </h3>
                            <p className="text-gray-400">
                              {callStatus === 'processing' ? 'ARAS AI analysiert den Kontext' :
                               callStatus === 'ringing' ? 'Warte auf Annahme...' :
                               'ARAS AI führt das Gespräch'}
                            </p>
                          </div>
                          
                          {/* Live Waveform Animation */}
                          {callStatus === 'connected' && (
                            <div className="w-full h-16 flex items-center justify-center gap-1">
                              {[...Array(20)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-1 bg-gradient-to-t from-[#FE9100] to-orange-400 rounded-full"
                                  animate={{
                                    height: [16, 32 + Math.random() * 32, 16]
                                  }}
                                  transition={{
                                    duration: 0.5 + Math.random() * 0.5,
                                    repeat: Infinity,
                                    delay: i * 0.05
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          
                          {callStatus === 'connected' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-sm font-medium text-green-400">
                                Live • {formatCallDuration(callDuration)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Call Ended - Show Results */}
                  {result && result.success && callStatus === 'ended' ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Success Header Card */}
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl" />
                        <div className="relative bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <motion.div 
                                className="relative"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                              >
                                <div className="absolute inset-0 bg-green-500 blur-lg opacity-50" />
                                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                  <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                              </motion.div>
                              <div>
                                <h3 className="text-xl font-bold text-white">Anruf beendet</h3>
                                <p className="text-sm text-gray-400">Dauer: {formatCallDuration(callDuration)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i}
                                  className="w-4 h-4 text-yellow-500 fill-yellow-500" 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Audio Player Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#FE9100]/20 via-transparent to-[#FE9100]/20 rounded-2xl blur-xl" />
                        <div className="relative bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#FE9100]/20 flex items-center justify-center">
                                <Volume2 className="w-5 h-5 text-[#FE9100]" />
                              </div>
                              <div>
                                <h4 className="text-white font-medium">Gesprächsaufnahme</h4>
                                <p className="text-xs text-gray-500">{formatCallDuration(result.summary?.duration || callDuration)}</p>
                              </div>
                            </div>
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors group">
                              <Download className="w-4 h-4 text-gray-400 group-hover:text-[#FE9100]" />
                            </button>
                          </div>
                          
                          {/* Waveform Visualization */}
                          <div className="mb-4 h-16 bg-black/30 rounded-lg p-3 flex items-center gap-[2px]">
                            {[...Array(60)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="flex-1 bg-gradient-to-t from-[#FE9100]/60 to-[#FE9100] rounded-full"
                                initial={{ height: 4 }}
                                animate={{ 
                                  height: audioPlaying ? [4, 8 + Math.random() * 24, 4] : 4 + Math.random() * 8
                                }}
                                transition={{
                                  duration: audioPlaying ? 0.3 : 0,
                                  repeat: audioPlaying ? Infinity : 0,
                                  delay: audioPlaying ? i * 0.01 : 0
                                }}
                              />
                            ))}
                          </div>
                          
                          {/* Audio Controls */}
                          <div className="flex items-center gap-3">
                            <motion.button 
                              onClick={() => setAudioPlaying(!audioPlaying)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FE9100] to-orange-600 flex items-center justify-center shadow-lg hover:shadow-[#FE9100]/50"
                            >
                              {audioPlaying ? (
                                <Pause className="w-5 h-5 text-white" />
                              ) : (
                                <Play className="w-5 h-5 text-white ml-1" />
                              )}
                            </motion.button>
                            <div className="flex-1">
                              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-gradient-to-r from-[#FE9100] to-orange-600"
                                  initial={{ width: '0%' }}
                                  animate={{ width: audioPlaying ? '100%' : '0%' }}
                                  transition={{ duration: audioPlaying ? 30 : 0 }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 font-mono min-w-[45px]">
                              {audioPlaying ? '00:12' : '00:00'}
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      
                      {/* Call Summary Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-transparent to-purple-500/20 rounded-2xl blur-xl" />
                        <div className="relative bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <h4 className="text-lg font-bold text-white">Gesprächszusammenfassung</h4>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Transcript */}
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Transkript</p>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="text-xs text-green-400">Erfolgreich</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed">
                                {result.summary?.transcript || `ARAS AI: "Guten Tag ${contactName}, ich rufe im Auftrag von ${(user as any)?.firstName || 'unserem Kunden'} an. ${message}"`}
                              </p>
                            </div>
                            
                            {/* Sentiment & Next Steps */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <p className="text-xs font-medium text-gray-400 mb-1">Stimmung</p>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <p className="text-sm text-white capitalize">
                                    {result.summary?.sentiment || 'Positiv'}
                                  </p>
                                </div>
                              </div>
                              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <p className="text-xs font-medium text-gray-400 mb-1">Erfolgsrate</p>
                                <p className="text-sm text-white">98%</p>
                              </div>
                            </div>
                            
                            {/* Next Steps */}
                            <div className="p-4 bg-[#FE9100]/10 rounded-xl border border-[#FE9100]/30">
                              <p className="text-xs font-medium text-[#FE9100] mb-2 uppercase tracking-wider">Nächste Schritte</p>
                              <p className="text-sm text-gray-300">
                                {result.summary?.nextSteps || 'Termin wurde bestätigt. Follow-up Email wird automatisch versendet.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : result && !result.success ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-transparent to-red-500/20 rounded-2xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                          <motion.div
                            initial={{ rotate: 0 }}
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                          >
                            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-30" />
                            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                              <XCircle className="w-8 h-8 text-white" />
                            </div>
                          </motion.div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-2">Anruf fehlgeschlagen</h3>
                            <p className="text-gray-400 text-sm">Bitte versuche es erneut</p>
                          </div>
                          <div className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-red-300 text-sm leading-relaxed">{result.error}</p>
                          </div>
                          <motion.button
                            onClick={() => setResult(null)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all"
                          >
                            Zurück
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative h-full min-h-[600px] flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl" />
                      <div className="relative z-10 flex flex-col items-center text-center p-12">
                        <motion.div
                          className="relative mb-8"
                          animate={{ 
                            y: [0, -10, 0]
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <div className="absolute inset-0 bg-[#FE9100] blur-3xl opacity-20" />
                          <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-[#FE9100]/20 to-orange-600/20 flex items-center justify-center border border-[#FE9100]/30">
                            <PhoneCall className="w-16 h-16 text-[#FE9100]" />
                          </div>
                          <motion.div
                            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                          >
                            <Sparkles className="w-4 h-4 text-white" />
                          </motion.div>
                        </motion.div>
                        
                        <h3 className="text-2xl font-bold text-white mb-3">
                          Bereit für deinen Smart Call?
                        </h3>
                        <p className="text-gray-400 max-w-md leading-relaxed">
                          Fülle die Felder aus und lass ARAS AI mit fortschrittlicher Neural Voice Technologie für dich anrufen
                        </p>
                        
                        <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>100% Menschlich</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[#FE9100]" />
                            <span>KI-optimiert</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" />
                            <span>Echtzeit</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Load ARAS Font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}