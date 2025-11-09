import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
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
  { 
    text: 'Biete meine Dienstleistung/Produkt an', 
    detail: 'Beschreibe es bitte so konkret wie möglich, ich entwickle daraus ein super Gespräch und biete dein Produkt oder Dienstleistung an'
  },
  { 
    text: 'Lade den Bewerber ein',
    detail: null 
  },
  { 
    text: 'Frage nach ob er mein Angebot erhalten hat', 
    detail: 'Falls Angebotsnummer/Rechnungsnummer vorhanden bitte eintragen'
  },
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
    voiceCallsLimit: 100, // Fixed to show correct limit
    renewalDate: new Date().toISOString(),
    hasPaymentMethod: false,
    requiresPaymentSetup: false,
    isTrialActive: false,
    canUpgrade: false
  };

  // Check if contact exists in database
  const checkContact = async (name: string) => {
    if (!name) return;
    try {
      const response = await fetch(`/api/user/contacts/search?name=${encodeURIComponent(name)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.found && data.contact) {
        setPhoneNumber(data.contact.phoneNumber);
        setShowSaveContact(false);
      } else {
        setShowSaveContact(true);
      }
    } catch (error) {
      console.error('Error checking contact:', error);
    }
  };

  // Save new contact
  const saveContact = async () => {
    if (!contactName || !phoneNumber) return;
    try {
      await fetch('/api/user/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: contactName, phoneNumber })
      });
      setShowSaveContact(false);
      toast({ title: 'Kontakt gespeichert', description: `${contactName} wurde zu Ihrem Telefonbuch hinzugefügt` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Kontakt konnte nicht gespeichert werden', variant: 'destructive' });
    }
  };

  // Fetch call history when phone number changes
  useEffect(() => {
    if (phoneNumber && validatePhoneNumber(phoneNumber)) {
      fetch(`/api/user/call-history/${encodeURIComponent(phoneNumber)}`, {
        credentials: 'include'
      })
      .then(res => res.json())
      .then(data => setCallHistory(data || []))
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
        credentials: "include",
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
            {/* Header Section */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              {/* POWER Title with Animated Gradient - NO TEXT BELOW */}
              <motion.h1 
                className="text-6xl font-black mb-8"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.span
                  className="inline-block"
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
              </motion.h1>
              
              {/* Status Bar */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-gray-400">System Online</span>
                </div>
                <div className="w-px h-3 bg-white/20" />
                <span className="text-gray-400">
                  {subscriptionData.voiceCallsUsed || 0} / {subscriptionData.voiceCallsLimit || 100} Anrufe
                </span>
              </motion.div>
            </motion.div>

            {/* Main Content */}
            <div className="flex flex-col items-center">
              {/* Call Form - Narrow and Clean */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.4 }}
                className="w-full max-w-md"
              >
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FE9100]/10 to-[#FE9100]/10 rounded-lg blur-lg opacity-50" />
                  
                  <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg p-8">
                    {/* Title */}
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold mb-2">
                        <motion.span
                          animate={{
                            backgroundImage: [
                              'linear-gradient(90deg, #e9d7c4 0%, #FE9100 50%, #e9d7c4 100%)',
                              'linear-gradient(90deg, #FE9100 0%, #e9d7c4 50%, #FE9100 100%)',
                            ],
                            backgroundPosition: ['0% 50%', '100% 50%'],
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          style={{
                            backgroundSize: '200% 100%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          ARAS AI
                        </motion.span>
                      </h2>
                      <p className="text-sm text-gray-500">ARAS Core PRO 1.0</p>
                    </div>

                    {/* Call Status */}
                    <AnimatePresence>
                      {callStatus !== 'idle' && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="mb-6 text-center"
                        >
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                            callStatus === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                            callStatus === 'ringing' ? 'bg-blue-500/20 text-blue-400' :
                            callStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                              callStatus === 'processing' ? 'bg-yellow-500' :
                              callStatus === 'ringing' ? 'bg-blue-500' :
                              callStatus === 'connected' ? 'bg-green-500' :
                              'bg-gray-500'
                            }`} />
                            {callStatus === 'processing' ? 'Verarbeitet...' :
                             callStatus === 'ringing' ? 'Klingelt...' :
                             callStatus === 'connected' ? `Verbunden ${formatCallDuration(callDuration)}` :
                             'Beendet'}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form Fields */}
                    <div className="space-y-6">
                      {/* Contact Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Mit wem möchten Sie telefonieren?*
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => {
                            setContactName(e.target.value);
                            checkContact(e.target.value);
                          }}
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#FE9100]/50 focus:outline-none transition-colors"
                          placeholder="Name eingeben..."
                        />
                        {showSaveContact && contactName && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={saveContact}
                            className="mt-2 text-xs text-[#FE9100] hover:text-[#FE9100]/80 transition-colors"
                          >
                            + Kontakt speichern
                          </motion.button>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Telefonnummer bitte*
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => {
                            const formatted = formatPhoneInput(e.target.value);
                            setPhoneNumber(formatted);
                            if (formatted && !validatePhoneNumber(formatted)) {
                              setPhoneError("Format: +4917661119320 (ohne Leerzeichen)");
                            } else {
                              setPhoneError("");
                            }
                          }}
                          className={`w-full px-4 py-3 bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors ${
                            phoneError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#FE9100]/50'
                          }`}
                          placeholder="+49..."
                        />
                        {phoneError && (
                          <p className="mt-1 text-xs text-red-400">{phoneError}</p>
                        )}
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Was darf ARAS AI in Ihren Namen ausrichten?*
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#FE9100]/50 focus:outline-none transition-colors resize-none"
                          rows={4}
                          placeholder="Nachricht eingeben..."
                        />
                        <div className="mt-2 text-xs text-gray-500 text-right">
                          {message.length} / 500
                        </div>
                      </div>

                      {/* Call Button - Round with Animated Border */}
                      <motion.div className="relative w-full">
                        {/* Animated border */}
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          animate={{
                            background: [
                              'linear-gradient(0deg, #FE9100, #e9d7c4, #a34e00, #FE9100)',
                              'linear-gradient(90deg, #e9d7c4, #a34e00, #FE9100, #e9d7c4)',
                              'linear-gradient(180deg, #a34e00, #FE9100, #e9d7c4, #a34e00)',
                              'linear-gradient(270deg, #FE9100, #e9d7c4, #a34e00, #FE9100)',
                            ],
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          style={{ padding: '2px' }}
                        >
                          <motion.button
                            onClick={makeCall}
                            disabled={loading || !phoneNumber || !contactName || !message || !!phoneError}
                            whileHover={{ scale: !loading && phoneNumber && contactName && message && !phoneError ? 1.02 : 1 }}
                            whileTap={{ scale: !loading && phoneNumber && contactName && message && !phoneError ? 0.98 : 1 }}
                            className={`w-full py-4 rounded-full font-semibold text-base transition-all ${
                              loading || !phoneNumber || !contactName || !message || phoneError
                                ? 'bg-black/60 text-gray-500 cursor-not-allowed'
                                : 'bg-transparent text-white hover:bg-[#FE9100]/10'
                            }`}
                            style={{
                              backdropFilter: 'blur(10px)',
                            }}
                          >
                            {loading ? 'Anruf wird gestartet...' : 'Jetzt anrufen lassen'}
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Example Prompts */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-md mt-8"
              >
                <h3 className="text-sm font-medium text-gray-400 mb-4">Häufige Gespräche:</h3>
                <div className="space-y-2">
                  {EXAMPLE_PROMPTS.map((example, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setMessage(example.text)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      whileHover={{ x: 4 }}
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#FE9100]/20 rounded-lg transition-all"
                    >
                      <p className="text-sm text-gray-300">{example.text}</p>
                      {example.detail && (
                        <p className="text-xs text-gray-500 mt-1">{example.detail}</p>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Call History */}
              {callHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="w-full max-w-md mt-8"
                >
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Anrufverlauf:</h3>
                  <div className="space-y-2">
                    {callHistory.slice(0, 3).map((call, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="p-3 bg-white/5 border border-white/10 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-white">{call.contactName || call.phoneNumber}</p>
                            <p className="text-xs text-gray-500 mt-1">{call.message?.substring(0, 50)}...</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: de })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Load ARAS Font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
} 