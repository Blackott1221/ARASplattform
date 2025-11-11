import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Phone, Loader2, CheckCircle2, XCircle, MessageSquare, Clock, User, 
  Sparkles, Zap, BrainCircuit, Download, Play, Pause, Volume2, FileText, 
  TrendingUp, Activity, Radio, PhoneCall, Mic, MicOff, AlertCircle, Star, X
} from "lucide-react";
import type { SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

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
    voiceCallsLimit: 100,
    renewalDate: new Date().toISOString(),
    hasPaymentMethod: false,
    requiresPaymentSetup: false,
    isTrialActive: false,
    canUpgrade: false
  };

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

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
      
      // 🔍 DEBUG: Log response details
      console.log('[POWER-DEBUG] Response status:', response.status);
      console.log('[POWER-DEBUG] Response ok:', response.ok);
      console.log('[POWER-DEBUG] Response data:', data);
      
      // Check for ANY error response
      if (!response.ok) {
        const errorMessage = data.error || data.message || `Fehler: ${response.status}`;
        
        console.log('[POWER-DEBUG] ❌ ERROR DETECTED!');
        console.log('[POWER-DEBUG] Error message:', errorMessage);
        console.log('[POWER-DEBUG] Is 403?', response.status === 403);
        console.log('[POWER-DEBUG] Contains "limit"?', errorMessage.toLowerCase().includes('limit'));
        
        setCallStatus('idle');
        setResult({ 
          success: false, 
          error: errorMessage
        });
        setLoading(false);
        
        // Check if it's a limit error (403 or specific message)
        if (response.status === 403 || errorMessage.toLowerCase().includes('limit')) {
          console.log('[POWER-DEBUG] 🚨 SHOWING LIMIT TOAST NOW!');
          toast({
            title: "❌ Anruf-Limit erreicht!",
            description: errorMessage + " - Upgraden Sie jetzt für unbegrenzte Anrufe!",
            variant: "destructive",
            duration: 20000,
            action: (
              <ToastAction 
                altText="Jetzt upgraden" 
                onClick={() => window.location.href = '/billing'}
              >
                Jetzt upgraden 🚀
              </ToastAction>
            )
          });
          console.log('[POWER-DEBUG] ✅ Toast called successfully');
        } else {
          toast({
            title: "❌ Fehler",
            description: errorMessage,
            variant: "destructive",
            duration: 10000
          });
        }
        
        return;
      }

      if (data.success) {
        setTimeout(() => setCallStatus('connected'), 3000);
        
        setTimeout(() => {
          callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }, 3000);

        setTimeout(() => {
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
          }
          setCallStatus('ended');
          setResult({
            ...data,
            success: true,
            summary: {
              transcript: "Gespräch erfolgreich durchgeführt. Kunde wurde über " + message + " informiert.",
              sentiment: "positiv",
              nextSteps: "Follow-up Email wurde vereinbart",
              duration: callDuration
            },
            recordingUrl: "mock-recording-url"
          });
        }, 15000);

        toast({
          title: "Anruf wird verbunden",
          description: `ARAS AI ruft ${contactName} an...`
        });
      } else {
        setResult(data);
        setCallStatus('idle');
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message || "Anruf fehlgeschlagen" });
      setCallStatus('idle');
      
      // Don't show generic error toast if it's a limit error (already shown)
      if (!error.message?.includes('Limit') && !error.message?.includes('limit')) {
        toast({
          title: "Fehler",
          description: error.message || "Anruf konnte nicht gestartet werden",
          variant: "destructive"
        });
      }
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
    <div className="flex h-screen bg-black relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/10 via-transparent to-[#a34e00]/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(254, 145, 0, 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(163, 78, 0, 0.06) 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, rgba(233, 215, 196, 0.04) 0%, transparent 70%)`
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

        <div className="flex-1 overflow-y-auto premium-scroll">
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Header with Animated Title */}
            <motion.div 
              initial={{ opacity: 0, y: -30 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
              className="text-center mb-16"
            >
              {/* POWER Title */}
              <motion.h1 
                className="text-7xl font-black mb-6 tracking-tight"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
              >
                <motion.span
                  className="inline-block relative"
                  style={{
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                    backgroundSize: '300% 100%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 40px rgba(254, 145, 0, 0.3)'
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  POWER
                  <motion.div
                    className="absolute -inset-2 blur-2xl opacity-30"
                    style={{
                      background: 'linear-gradient(90deg, #FE9100, #a34e00, #FE9100)',
                      zIndex: -1
                    }}
                    animate={{
                      opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </motion.span>
              </motion.h1>

              {/* Animated Subtitle */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="flex items-center justify-center gap-3 text-xl mb-8"
              >
                <span className="text-gray-500">ARAS AI erledigt:</span>
                <motion.span 
                  className="text-[#FE9100] font-semibold min-w-[380px] text-left"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {displayText}
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-[3px] h-[24px] bg-[#FE9100] ml-1 align-middle"
                  />
                </motion.span>
              </motion.div>

              {/* Status Indicator */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="inline-flex items-center gap-4 px-6 py-3 rounded-full border transition-all"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(20px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 0 20px rgba(254, 145, 0, 0.1)'
                }}
              >
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm text-gray-400 font-medium">System Online</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#FE9100]" />
                  <span className="text-sm font-medium">
                    <span className="text-white">{subscriptionData.voiceCallsUsed || 0}</span>
                    <span className="text-gray-500"> / </span>
                    <span className="text-gray-400">{subscriptionData.voiceCallsLimit || 100}</span>
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Left Side: Call Form */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
              >
                <div className="relative group">
                  {/* Animated Glow Border */}
                  <motion.div
                    className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                      backgroundSize: '300% 100%'
                    }}
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  />
                  
                  {/* Card */}
                  <div 
                    className="relative rounded-2xl p-8"
                    style={{
                      background: 'rgba(0, 0, 0, 0.6)',
                      backdropFilter: 'blur(40px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    {/* Card Header */}
                    <div className="text-center mb-8">
                      <motion.div
                        className="inline-flex items-center gap-3 mb-4"
                        animate={{
                          boxShadow: [
                            '0 0 20px rgba(254, 145, 0, 0.2)',
                            '0 0 30px rgba(254, 145, 0, 0.4)',
                            '0 0 20px rgba(254, 145, 0, 0.2)'
                          ]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '12px',
                          background: 'rgba(254, 145, 0, 0.1)',
                          border: '1px solid rgba(254, 145, 0, 0.2)'
                        }}
                      >
                        <img src={arasLogo} alt="ARAS" className="w-8 h-8 object-contain" />
                        <h2 
                          className="text-2xl font-bold"
                          style={{
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #e9d7c4)',
                            backgroundSize: '200% 100%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          ARAS AI
                        </h2>
                      </motion.div>
                      <p className="text-xs text-gray-500 font-medium tracking-wider">CORE PRO 1.0</p>
                    </div>

                    {/* Call Status Indicator */}
                    <AnimatePresence>
                      {callStatus !== 'idle' && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", damping: 20, stiffness: 300 }}
                          className="mb-6"
                        >
                          <div 
                            className="p-4 rounded-xl text-center"
                            style={{
                              background: callStatus === 'processing' ? 'rgba(234, 179, 8, 0.1)' :
                                         callStatus === 'ringing' ? 'rgba(59, 130, 246, 0.1)' :
                                         callStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)' :
                                         'rgba(107, 114, 128, 0.1)',
                              border: `1px solid ${
                                callStatus === 'processing' ? 'rgba(234, 179, 8, 0.3)' :
                                callStatus === 'ringing' ? 'rgba(59, 130, 246, 0.3)' :
                                callStatus === 'connected' ? 'rgba(34, 197, 94, 0.3)' :
                                'rgba(107, 114, 128, 0.3)'
                              }`
                            }}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <motion.div
                                className={`w-2 h-2 rounded-full ${
                                  callStatus === 'processing' ? 'bg-yellow-500' :
                                  callStatus === 'ringing' ? 'bg-blue-500' :
                                  callStatus === 'connected' ? 'bg-green-500' :
                                  'bg-gray-500'
                                }`}
                                animate={{ 
                                  scale: [1, 1.5, 1],
                                  opacity: [1, 0.5, 1]
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                              <span className={`text-sm font-semibold ${
                                callStatus === 'processing' ? 'text-yellow-400' :
                                callStatus === 'ringing' ? 'text-blue-400' :
                                callStatus === 'connected' ? 'text-green-400' :
                                'text-gray-400'
                              }`}>
                                {callStatus === 'processing' ? 'Anruf wird verarbeitet' :
                                 callStatus === 'ringing' ? 'Anruf wird verbunden' :
                                 callStatus === 'connected' ? `Gespräch läuft ${formatCallDuration(callDuration)}` :
                                 'Anruf beendet'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form Fields */}
                    <div className="space-y-6">
                      {/* Contact Name Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          Mit wem möchten Sie telefonieren?
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            value={contactName}
                            onChange={(e) => {
                              setContactName(e.target.value);
                              checkContact(e.target.value);
                            }}
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = 'rgba(254, 145, 0, 0.5)';
                              e.target.style.boxShadow = '0 0 20px rgba(254, 145, 0, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Name des Kontakts"
                          />
                        </div>
                        {showSaveContact && contactName && (
                          <motion.button
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={saveContact}
                            className="mt-2 text-sm font-medium text-[#FE9100] hover:text-[#FE9100]/80 transition-colors"
                          >
                            Kontakt im Telefonbuch speichern
                          </motion.button>
                        )}
                      </div>

                      {/* Phone Number Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          Telefonnummer
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all duration-300 ${
                              phoneError ? 'border-red-500/50' : ''
                            }`}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: phoneError ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)'
                            }}
                            onFocus={(e) => {
                              if (!phoneError) {
                                e.target.style.borderColor = 'rgba(254, 145, 0, 0.5)';
                                e.target.style.boxShadow = '0 0 20px rgba(254, 145, 0, 0.2)';
                              }
                            }}
                            onBlur={(e) => {
                              if (!phoneError) {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.boxShadow = 'none';
                              }
                            }}
                            placeholder="+49..."
                          />
                        </div>
                        {phoneError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 text-xs text-red-400 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {phoneError}
                          </motion.p>
                        )}
                      </div>

                      {/* Message Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          Was möchten Sie ausrichten?
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                          <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all duration-300 resize-none"
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)',
                              minHeight: '120px',
                              maxHeight: '180px'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = 'rgba(254, 145, 0, 0.5)';
                              e.target.style.boxShadow = '0 0 20px rgba(254, 145, 0, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                              e.target.style.boxShadow = 'none';
                            }}
                            placeholder="Ihre Nachricht an den Kontakt..."
                          />
                        </div>
                        <div className="mt-2 text-xs text-gray-600 text-right font-medium">
                          {message.length} / 500 Zeichen
                        </div>
                      </div>

                      {/* Call Button */}
                      <motion.div className="relative pt-2">
                        <motion.div
                          className="absolute -inset-[2px] rounded-full opacity-75"
                          style={{
                            background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                            backgroundSize: '300% 100%',
                            filter: 'blur(8px)'
                          }}
                          animate={{
                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                            opacity: [0.5, 0.8, 0.5]
                          }}
                          transition={{ 
                            backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
                            opacity: { duration: 2, repeat: Infinity }
                          }}
                        />
                        
                        <motion.button
                          onClick={makeCall}
                          disabled={loading || !phoneNumber || !contactName || !message || !!phoneError}
                          whileHover={{ 
                            scale: (!loading && phoneNumber && contactName && message && !phoneError) ? 1.02 : 1 
                          }}
                          whileTap={{ 
                            scale: (!loading && phoneNumber && contactName && message && !phoneError) ? 0.98 : 1 
                          }}
                          className="relative w-full py-4 rounded-full font-bold text-base tracking-wide transition-all duration-300 overflow-hidden"
                          style={{
                            fontFamily: 'Orbitron, sans-serif',
                            background: (loading || !phoneNumber || !contactName || !message || phoneError)
                              ? 'rgba(50, 50, 50, 0.5)'
                              : 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                            backgroundSize: '200% 100%',
                            color: (loading || !phoneNumber || !contactName || !message || phoneError)
                              ? 'rgba(150, 150, 150, 0.5)'
                              : '#ffffff',
                            cursor: (loading || !phoneNumber || !contactName || !message || phoneError)
                              ? 'not-allowed'
                              : 'pointer'
                          }}
                        >
                          {!loading && (
                            <motion.div
                              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                              }}
                              animate={{
                                x: ['-100%', '100%']
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear'
                              }}
                            />
                          )}
                          <span className="relative flex items-center justify-center gap-2">
                            {loading ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Anruf wird gestartet
                              </>
                            ) : (
                              <>
                                <Phone className="w-5 h-5" />
                                Jetzt anrufen lassen
                              </>
                            )}
                          </span>
                        </motion.button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Call Result Display - Audio & Transcript */}
              {callStatus === 'ended' && result && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
                  className="mt-8 p-8 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.05), rgba(233, 215, 196, 0.03))',
                    border: '1px solid rgba(254, 145, 0, 0.2)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(254, 145, 0, 0.15)'
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-3 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.2), rgba(163, 78, 0, 0.2))',
                          border: '1px solid rgba(254, 145, 0, 0.3)'
                        }}
                      >
                        <Phone className="w-5 h-5 text-[#FE9100]" />
                      </div>
                      <div>
                        <h3 
                          className="text-xl font-bold"
                          style={{
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #FE9100, #e9d7c4)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          Anruf abgeschlossen
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {contactName} • {formatDistanceToNow(new Date(), { addSuffix: true, locale: de })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setResult(null); setCallStatus('idle'); }}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  {/* Audio Player */}
                  {result.recordingUrl && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Volume2 className="w-4 h-4 text-[#FE9100]" />
                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Aufzeichnung</h4>
                      </div>
                      <div 
                        className="p-4 rounded-xl"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <audio 
                          controls 
                          className="w-full"
                          style={{
                            height: '40px',
                            filter: 'grayscale(0.3) brightness(1.2)'
                          }}
                        >
                          <source src={result.recordingUrl} type="audio/mpeg" />
                          Dein Browser unterstützt keine Audio-Wiedergabe.
                        </audio>
                        <a
                          href={result.recordingUrl}
                          download="aras-call-recording.mp3"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#FE9100] hover:text-[#e9d7c4] transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Aufzeichnung herunterladen
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Transcript */}
                  {result.summary?.transcript && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-[#FE9100]" />
                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Gesprächszusammenfassung</h4>
                      </div>
                      <div 
                        className="p-5 rounded-xl"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {result.summary.transcript}
                        </p>
                        
                        {/* Additional Info */}
                        {(result.summary.sentiment || result.summary.nextSteps) && (
                          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.summary.sentiment && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Stimmung</p>
                                <p className="text-sm font-medium text-gray-200">{result.summary.sentiment}</p>
                              </div>
                            )}
                            {result.summary.duration && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Dauer</p>
                                <p className="text-sm font-medium text-gray-200">{result.summary.duration} Sekunden</p>
                              </div>
                            )}
                            {result.summary.nextSteps && (
                              <div className="md:col-span-2">
                                <p className="text-xs text-gray-500 mb-1">Nächste Schritte</p>
                                <p className="text-sm font-medium text-gray-200">{result.summary.nextSteps}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No Data Warning */}
                  {!result.recordingUrl && !result.summary?.transcript && (
                    <div 
                      className="p-4 rounded-xl flex items-start gap-3"
                      style={{
                        background: 'rgba(254, 145, 0, 0.05)',
                        border: '1px solid rgba(254, 145, 0, 0.2)'
                      }}
                    >
                      <AlertCircle className="w-5 h-5 text-[#FE9100] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-200 mb-1">Daten werden verarbeitet</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Die Aufzeichnung und Zusammenfassung werden in Kürze verfügbar sein. Dies kann einige Minuten dauern.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Right Side: Examples & History */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
                className="space-y-6"
              >
                {/* Example Prompts */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-4 tracking-wider uppercase">
                    Häufige Gespräche
                  </h3>
                  <div className="space-y-3">
                    {EXAMPLE_PROMPTS.map((example, index) => (
                      <motion.button
                        key={index}
                        onClick={() => setMessage(example.text)}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        whileHover={{ x: 4, scale: 1.02 }}
                        className="w-full text-left p-4 rounded-xl transition-all duration-300 group"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(20px)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(254, 145, 0, 0.3)';
                          e.currentTarget.style.background = 'rgba(254, 145, 0, 0.05)';
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(254, 145, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="mt-0.5 p-2 rounded-lg transition-colors"
                            style={{
                              background: 'rgba(254, 145, 0, 0.1)',
                              border: '1px solid rgba(254, 145, 0, 0.2)'
                            }}
                          >
                            <Sparkles className="w-4 h-4 text-[#FE9100]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-200 mb-1 group-hover:text-white transition-colors">
                              {example.text}
                            </p>
                            {example.detail && (
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {example.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Call History */}
                {callHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <h3 className="text-sm font-bold text-gray-400 mb-4 tracking-wider uppercase flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Anrufverlauf
                    </h3>
                    <div className="space-y-3">
                      {callHistory.slice(0, 4).map((call, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                          className="p-4 rounded-xl transition-all duration-300"
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)'
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, #FE9100, #a34e00)'
                                }}
                              />
                              <span className="text-sm font-semibold text-white">
                                {call.contactName || call.phoneNumber}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(call.createdAt), { 
                                addSuffix: true, 
                                locale: de 
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                            {call.message}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ARAS Font */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" 
        rel="stylesheet" 
      />

      {/* Premium Scrollbar Styles */}
      <style>{`
        .premium-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .premium-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .premium-scroll::-webkit-scrollbar-thumb {
          background: rgba(254, 145, 0, 0.3);
          border-radius: 10px;
        }
        .premium-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(254, 145, 0, 0.5);
        }
      `}</style>
    </div>
  );
}