import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Lock, Phone, Contact, Plus, X, Building2, User, Mail, StickyNote, ChevronDown, Search, Sparkles, Loader2 } from 'lucide-react';
import type { SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";
import { CallWizard } from '@/components/power/call-wizard';
import { ClarificationChat } from '@/components/power/clarification-chat';
import { CallTimeline } from '@/components/power/call-timeline';
import { PowerResultCard } from '@/components/power/power-result-card';
// Templates entfernt aus POWER - bleiben im Code für spätere Features

// ----------------- ARAS CI -----------------
const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00',
  black: '#0a0a0a'
};

const ANIMATED_TEXTS = [
  "Terminvereinbarungen automatisieren",
  "Leads qualifizieren",
  "Kundentermine bestätigen",
  "Follow-ups durchführen",
  "Feedback einholen",
  "Bestellungen aufnehmen"
];

const EXAMPLE_PROMPTS = [
  { text: 'Akquiriere Kunden für meine Dienstleistung XY' },
  { text: 'Lade Besucher zu unserem Event ein' },
  { text: 'Reaktiviere Bestandskunden mit einem kurzen Angebot' },
  { text: 'Qualifiziere neue Leads aus der letzten Messe' },
];

const validatePhoneNumber = (phone: string): boolean => /^\+[0-9]{10,15}$/.test(phone);
const formatPhoneInput = (value: string): string => value.replace(/[^\d+]/g, '');

export default function Power() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // 🔥 NEW: Load user profile context for AI-enhanced calls
  const { 
    data: userProfileContext, 
    isLoading: isProfileLoading, 
    isError: isProfileError 
  } = useQuery({
    queryKey: ["user-profile-context"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile-context", {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to load profile context");
      }
      return res.json();
    },
    // Nur laden wenn User eingeloggt
    enabled: !!user,
    // Cache für 5 Minuten
    staleTime: 5 * 60 * 1000
  });

  // Existing states (technical behaviour untouched)
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [expandedCall, setExpandedCall] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [phoneError, setPhoneError] = useState("");
  
  // 🎯 Call Summary from ARAS Core
  const [callSummary, setCallSummary] = useState<{
    outcome: string;
    bulletPoints: string[];
    nextStep: string;
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    tags: string[];
  } | null>(null);
  
  // NEW: Kontaktbuch Integration
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [newContactData, setNewContactData] = useState({
    company: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: ""
  });

  // UI/typing
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Call status tracking
  const [callStatus, setCallStatus] = useState<'idle' | 'processing' | 'ringing' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // NEW (UI only, no backend): bulk campaign inputs
  const [campaignGoal, setCampaignGoal] = useState("");
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  
  // 🔥 NEW: Wizard State
  const [showWizard, setShowWizard] = useState(false);
  
  // 🔥 NEW: Chat Clarification Flow
  const [showChatFlow, setShowChatFlow] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [chatAnswers, setChatAnswers] = useState<Record<string, string>>({});
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>('');
  const [showReview, setShowReview] = useState(false);

  // Contact ID für Contact-Kontext (ohne Templates)
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch call history from database
  useEffect(() => {
    const fetchCallHistory = async () => {
      try {
        const response = await fetch('/api/user/call-logs', {
          credentials: 'include'
        });
        if (response.ok) {
          const logs = await response.json();
          setCallHistory(logs);
        }
      } catch (error) {
        console.error('[CALL-HISTORY] Error fetching:', error);
      }
    };
    
    fetchCallHistory();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCallHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch subscription
  const { data: subscription, refetch: refetchSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  // Fetch contacts from new API
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  const subscriptionData = subscription || {
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

  // ----------------- Minimal helper UI (unchanged networking) -----------------
  // NEW: Select contact from phonebook
  const handleSelectContact = (contact: any) => {
    setContactName(contact.company || `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
    setPhoneNumber(contact.phone || contact.phoneNumber || '');
    setSelectedContactId(contact.id || null); // 🔥 Speichere contactId für Template-Personalisierung
    setShowContactPicker(false);
    toast({
      title: 'Kontakt ausgewählt',
      description: `${contact.company || 'Kontakt'} wurde ausgewählt`
    });
  };

  // Template-Handler entfernt - POWER fokussiert sich auf freien Text

  // NEW: Save new contact with all fields
  const handleSaveNewContact = async () => {
    if (!newContactData.company.trim()) {
      toast({
        title: 'Firma erforderlich',
        description: 'Bitte geben Sie mindestens einen Firmennamen ein.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newContactData)
      });

      if (!response.ok) throw new Error('Save failed');

      const savedContact = await response.json();
      
      // Fill form with new contact
      setContactName(savedContact.company);
      setPhoneNumber(savedContact.phone || '');
      
      // Reset and close
      setNewContactData({
        company: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        notes: ''
      });
      setShowNewContactModal(false);
      
      toast({
        title: 'Kontakt gespeichert',
        description: `${savedContact.company} wurde zu Ihrem Kontaktbuch hinzugefügt`
      });
    } catch {
      toast({
        title: 'Fehler',
        description: 'Kontakt konnte nicht gespeichert werden',
        variant: 'destructive'
      });
    }
  };

  // Filter contacts for picker
  const filteredContacts = contacts.filter(c => 
    contactSearchQuery === '' ||
    c.company?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.firstName?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.lastName?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.phone?.includes(contactSearchQuery)
  );

  useEffect(() => {
    if (phoneNumber && validatePhoneNumber(phoneNumber)) {
      fetch(`/api/user/call-history/${encodeURIComponent(phoneNumber)}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setCallHistory(data || []))
        .catch(() => {});
    } else {
      setCallHistory([]);
    }
  }, [phoneNumber]);

  const handleSectionChange = (section: string) => {
    if (section !== "power") window.location.href = `/app/${section}`;
  };

  // Typewriter
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
      }, 45);
      return () => clearInterval(typeInterval);
    }
  }, [currentTextIndex, isTyping]);

  // autoresize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setPhoneNumber(formatted);
    setPhoneError(formatted && !validatePhoneNumber(formatted) ? "Format: +4917661119320 (ohne Leerzeichen)" : "");
  };

  // ----------------- UI ONLY: bulk list drop -----------------
  const onBulkFilePick = (f?: File) => {
    if (!f) return;
    const ok = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!ok.includes(f.type) && !f.name.endsWith('.csv') && !f.name.endsWith('.xlsx')) {
      toast({ title: 'Dateityp', description: 'Bitte CSV oder XLSX hochladen', variant: 'destructive' });
      return;
    }
    setBulkFileName(f.name);
    // UI only – keine Verarbeitung
  };

  // ----------------- 🔥 NEUE CALL LOGIC MIT CHAT-FLOW -----------------
  // Schritt 1: Starte Chat-Flow (Validierung mit Gemini)
  const handleStartCallProcess = async () => {
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
    
    // Starte Validierung mit ARAS Core
    setLoading(true);
    try {
      const response = await fetch('/api/aras-voice/validate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message,
          contactName,
          answers: {},
          contactId: selectedContactId
          // Kein templateId/templateScenario mehr - POWER nutzt freien Text
        })
      });

      if (!response.ok) {
        throw new Error('Validierung fehlgeschlagen');
      }

      const result = await response.json();
      setValidationResult(result);

      if (result.isComplete) {
        // Direkt zum Review, keine Fragen
        setEnhancedPrompt(result.enhancedPrompt || message);
        setShowReview(true);
      } else if (result.questions && result.questions.length > 0) {
        // Zeige Chat-Flow für Fragen
        setShowChatFlow(true);
      } else {
        // Fallback: Direkt Call
        setEnhancedPrompt(message);
        setShowReview(true);
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Schritt 2: Chat-Flow abgeschlossen
  const handleChatComplete = (answers: Record<string, string>) => {
    setChatAnswers(answers);
    
    // Baue Enhanced Prompt aus Antworten
    const prompt = `${message}\n\nZusätzliche Details:\n${Object.entries(answers)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n')}`;
    
    setEnhancedPrompt(validationResult?.enhancedPrompt || prompt);
    setShowChatFlow(false);
    setShowReview(true);
  };

  // Schritt 3: Chat überspringen
  const handleSkipChat = () => {
    setEnhancedPrompt(message);
    setShowChatFlow(false);
    setShowReview(true);
  };

  // Schritt 4: Review bestätigt → Call starten
  const handleConfirmCall = async () => {
    setShowReview(false);
    setLoading(true);
    setResult(null);
    setCallStatus('processing');
    setCallDuration(0);

    try {
      const response = await fetch("/api/aras-voice/smart-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          name: contactName,
          phoneNumber: phoneNumber,
          message: enhancedPrompt
        })
      });
      const data = await response.json();
      
      if (!response.ok) {
        setLoading(false);
        setCallStatus('idle');
        setResult({ success: false, error: data.error || data.message || `Fehler: ${response.status}` });
        return;
      }
      
      if (data.success && data.callId) {
        const callId = data.callId;
        setCallStatus('ringing');
        
        toast({
          title: "🚀 Anruf gestartet",
          description: `ARAS AI ruft jetzt ${contactName} an...`
        });
        
        // Nach 3s: connected
        setTimeout(() => {
          setCallStatus('connected');
          callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }, 3000);
        
        // Start polling
        setTimeout(() => pollCallDetails(callId), 5000);
      } else {
        setCallStatus('idle');
        setResult(data);
      }
      
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      setCallStatus('idle');
      setResult({ success: false, error: e?.message || "Anruf fehlgeschlagen" });
    }
  };
  
  // Polling Logic
  const pollCallDetails = async (callId: number) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const detailsResponse = await fetch(`/api/aras-voice/call-details/${callId}`, {
          credentials: 'include'
        });
        
        if (!detailsResponse.ok) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            if (callTimerRef.current) {
              clearInterval(callTimerRef.current);
              callTimerRef.current = null;
            }
            setCallStatus('ended');
            setResult({ success: false, error: 'Anruf-Details konnten nicht abgerufen werden' });
          }
          return;
        }
        
        const callDetails = await detailsResponse.json();
        const hasTranscript = !!callDetails.transcript;
        const hasAudio = !!callDetails.recordingUrl;
        const isCompleted = callDetails.status === 'completed' || callDetails.status === 'done';
        
        if (hasTranscript) {
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
          }
          setCallStatus('ended');
          
          setResult({
            success: true,
            id: callDetails.id || callDetails.callId,
            recordingUrl: callDetails.recordingUrl || null,
            transcript: callDetails.transcript,
            duration: callDetails.duration || callDuration,
            phoneNumber: callDetails.phoneNumber || phoneNumber,
            contactName: callDetails.contactName || contactName
          });
          
          // 🎯 Extract & Set Summary from ARAS Core
          if (callDetails.summary) {
            setCallSummary({
              outcome: callDetails.summary.outcome ?? '',
              bulletPoints: Array.isArray(callDetails.summary.bulletPoints) ? callDetails.summary.bulletPoints : [],
              nextStep: callDetails.summary.nextStep ?? '',
              sentiment: callDetails.summary.sentiment ?? 'neutral',
              tags: Array.isArray(callDetails.summary.tags) ? callDetails.summary.tags : []
            });
          } else {
            setCallSummary(null);
          }
          
          // 🔥 NEUE TOAST-BENACHRICHTIGUNG
          toast({
            title: "✅ Anruf abgeschlossen",
            description: `Der Anruf an ${contactName} wurde erfolgreich beendet. Transkript und Aufzeichnung sind verfügbar.`,
          });
          
          // Refresh call history
          try {
            const historyResponse = await fetch('/api/user/call-logs', { credentials: 'include' });
            if (historyResponse.ok) {
              const logs = await historyResponse.json();
              setCallHistory(logs);
            }
          } catch (e) {
            console.error('Failed to refresh history:', e);
          }
          
          if (hasAudio || isCompleted) {
            clearInterval(pollInterval);
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
          }
          setCallStatus('ended');
          setResult({
            success: true,
            callId: callDetails.callId,
            transcript: 'Anruf wurde durchgeführt. Details werden verarbeitet.',
            duration: callDuration
          });
        }
      } catch (pollError) {
        console.error('Polling error:', pollError);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
          }
          setCallStatus('ended');
          setResult({ success: false, error: 'Fehler beim Abrufen der Anrufdaten' });
        }
      }
    }, 4000);
    
    // Safety timeout
    setTimeout(() => {
      clearInterval(pollInterval);
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      if (callStatus !== 'ended') {
        setCallStatus('ended');
        setResult({
          success: true,
          transcript: 'Anruf beendet. Details werden verarbeitet.',
          duration: callDuration
        });
      }
    }, 150000);
  };

  // Reset für neuen Call
  const handleNewCall = () => {
    setResult(null);
    setCallSummary(null); // 🎯 Reset Summary
    setCallStatus('idle');
    setCallDuration(0);
    setShowReview(false);
    setShowChatFlow(false);
    setEnhancedPrompt('');
    setChatAnswers({});
    setValidationResult(null);
    setContactName('');
    setPhoneNumber('');
    setMessage('');
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);
  
  // Format call duration
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ----------------- UI -----------------
  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Premium ARAS background */}
      <div className="absolute inset-0 opacity-[0.14] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/10 via-transparent to-[#A34E00]/10" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 22% 30%, rgba(254,145,0,0.09) 0%, transparent 55%),
              radial-gradient(circle at 78% 70%, rgba(163,78,0,0.07) 0%, transparent 55%),
              radial-gradient(circle at 50% 50%, rgba(233,215,196,0.05) 0%, transparent 65%)`
          }}
        />
      </div>

      <Sidebar
        activeSection="power"
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden content-zoom">
        <TopBar
          currentSection="power"
          subscriptionData={subscriptionData}
          user={user as import("@shared/schema").User}
          isVisible={true}
        />

        <div className="flex-1 overflow-y-auto premium-scroll">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            
            {/* 🎯 HERO-ZONE */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-start gap-4 mb-8"
            >
              {/* ARAS Orb */}
              <div
                className="mt-1 h-11 w-11 rounded-full flex-shrink-0"
                style={{
                  background: 'radial-gradient(circle at 30% 20%, rgba(254,145,0,0.95), rgba(10,10,10,0.1) 70%)',
                  boxShadow: '0 0 22px rgba(254,145,0,0.55)',
                  border: '1px solid rgba(233,215,196,0.30)'
                }}
              />

              {/* Headline + Subheadline */}
              <div className="flex-1">
                <h1
                  className="text-[20px] md:text-[22px] font-semibold tracking-wide mb-2"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    backgroundImage: 'linear-gradient(90deg, #E9D7C4, #FE9100, #ffffff)',
                    backgroundSize: '260% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'aras-gradient-shift 14s linear infinite'
                  }}
                >
                  POWER · Einzelanruf
                </h1>
                <p className="text-xs md:text-sm text-neutral-400 leading-relaxed max-w-2xl">
                  Ein geführter Outbound-Einzelanruf mit ARAS. 
                  Du beschreibst in 1–2 Sätzen, was passieren soll – 
                  ARAS übernimmt den Rest und liefert Aufnahme, Transkript und eine klare Zusammenfassung zurück.
                </p>
              </div>
            </motion.div>

            {/* 🎯 2-SPALTEN-GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
              
              {/* ============ LINKE SPALTE: SETUP + CHAT ============ */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col gap-4"
              >
                {/* Setup Card */}
                <div
                  className="rounded-3xl p-5 md:p-6"
                  style={{
                    background: 'linear-gradient(145deg, rgba(7,7,7,0.9), rgba(12,12,12,0.96))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 22px 60px rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  {/* Profil-Status-Box */}
                  {userProfileContext && (
                    <div
                      className="mb-5 rounded-2xl px-4 py-3 text-xs"
                      style={{
                        background: userProfileContext.aiProfile?.products?.length > 0
                          ? 'rgba(34,197,94,0.08)'
                          : 'rgba(234,179,8,0.08)',
                        border: userProfileContext.aiProfile?.products?.length > 0
                          ? '1px solid rgba(34,197,94,0.25)'
                          : '1px solid rgba(234,179,8,0.25)',
                        color: userProfileContext.aiProfile?.products?.length > 0
                          ? '#4ade80'
                          : '#fde047'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {userProfileContext.aiProfile?.products?.length > 0
                            ? '✓ ARAS AI – Core PRO 1.0'
                            : '⚠ Firmenprofil unvollständig'}
                        </span>
                        {!userProfileContext.aiProfile?.products?.length && (
                          <button
                            onClick={() => window.location.href = '/app/settings?tab=profile'}
                            className="text-[10px] underline hover:no-underline"
                          >
                            Jetzt vervollständigen
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Formular */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-2">
                        Gesprächspartner (Name/Firma)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Max Mustermann GmbH"
                          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-neutral-500 transition-all outline-none"
                          style={{
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.10)'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = CI.orange;
                            e.currentTarget.style.boxShadow = `0 0 0 4px rgba(254,145,0,0.08)`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                        <button
                          onClick={() => setShowContactPicker(true)}
                          className="px-4 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#d1d5db'
                          }}
                        >
                          Aus Kontakten
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-2">
                        Telefonnummer
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="+491701234567"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-neutral-500 transition-all outline-none"
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: phoneError ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.10)'
                        }}
                        onFocus={(e) => {
                          if (!phoneError) {
                            e.currentTarget.style.borderColor = CI.orange;
                            e.currentTarget.style.boxShadow = `0 0 0 4px rgba(254,145,0,0.08)`;
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = phoneError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.10)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      {phoneError && (
                        <p className="mt-1 text-[10px] text-red-400">{phoneError}</p>
                      )}
                      <p className="mt-1 text-[10px] text-neutral-500">
                        Mit Ländervorwahl, z.B. +491701234567
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-2">
                        Ziel der Nachricht
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                        placeholder="Beschreibe in 1–2 Sätzen, was ARAS klären oder erreichen soll..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-neutral-500 transition-all outline-none resize-none"
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.10)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = CI.orange;
                          e.currentTarget.style.boxShadow = `0 0 0 4px rgba(254,145,0,0.08)`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-[10px] text-neutral-500">
                          Ton, Zielgruppe und Argumente zieht ARAS aus deinem Firmenprofil.
                        </p>
                        <span className="text-[10px] text-neutral-500">{message.length}/500</span>
                      </div>
                    </div>

                    {/* Button */}
                    <button
                      onClick={handleStartCallProcess}
                      disabled={loading || !contactName || !phoneNumber || !message || !!phoneError}
                      className="relative w-full overflow-hidden rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
                    >
                      <span
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          backgroundImage: 'linear-gradient(120deg, rgba(233,215,196,0.0), rgba(254,145,0,0.85), rgba(233,215,196,0.0))',
                          backgroundSize: '220% 100%',
                          animation: 'aras-border-run 8s linear infinite'
                        }}
                      />
                      <span className="relative flex h-[calc(100%-2px)] w-[calc(100%-2px)] items-center justify-center rounded-[18px] m-[1px] bg-black/90 px-4 py-3 text-sm font-semibold text-white"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        {loading ? 'Wird vorbereitet...' : 'Jetzt anrufen lassen'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* ClarificationChat Inline */}
                <AnimatePresence>
                  {showChatFlow && validationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ClarificationChat
                        questions={validationResult.questions}
                        onAnswersComplete={handleChatComplete}
                        onSkip={handleSkipChat}
                        initialMessage={message}
                        userProfileContext={userProfileContext || null}
                        callStatus={callStatus}
                        finalSummary={callSummary}
                        callInProgressSummaryHint="Der Anruf läuft – ich höre zu und bereite deine Zusammenfassung vor."
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Placeholder wenn kein Chat */}
                {!showChatFlow && !result && (
                  <div className="mt-2 text-[11px] text-neutral-500 px-2">
                    Sobald ARAS Rückfragen zum Auftrag hat, erscheinen sie hier als kurze Chat-Nachrichten.
                  </div>
                )}
              </motion.div>

              {/* ============ RECHTE SPALTE: TIMELINE + RESULT + HISTORY ============ */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Timeline */}
                <div
                  className="rounded-3xl p-5"
                  style={{
                    background: 'linear-gradient(155deg, rgba(8,8,8,0.95), rgba(4,4,4,0.98))',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 18px 50px rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <CallTimeline currentStatus={callStatus} duration={callDuration} />
                </div>

                {/* Result Card */}
                {result ? (
                  <PowerResultCard
                    result={result}
                    summary={callSummary}
                    linkedContact={callHistory.find(c => c.phoneNumber === result.phoneNumber) || null}
                    onNewCall={handleNewCall}
                    onLinkToContact={(phone, name) => {
                      setShowContactPicker(true);
                      // TODO: Auto-select contact logic
                    }}
                    onSaveAsNewContact={(phone, name) => {
                      setNewContactData({
                        ...newContactData,
                        phone: phone || '',
                        firstName: name?.split(' ')[0] || '',
                        lastName: name?.split(' ').slice(1).join(' ') || ''
                      });
                      setShowNewContactModal(true);
                    }}
                  />
                ) : (
                  <div
                    className="rounded-3xl p-6 text-center"
                    style={{
                      background: 'linear-gradient(155deg, rgba(8,8,8,0.95), rgba(4,4,4,0.98))',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: '0 18px 50px rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(20px)'
                    }}
                  >
                    <p className="text-xs text-neutral-500">
                      Sobald ein POWER Anruf abgeschlossen ist, erscheinen hier Aufnahme, Transkript und eine klare Zusammenfassung.
                    </p>
                  </div>
                )}

                {/* Kompakte Call-History */}
                {callHistory.length > 0 && (
                  <div
                    className="rounded-3xl p-4"
                    style={{
                      background: 'rgba(8,8,8,0.85)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(16px)'
                    }}
                  >
                    <h3 className="text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
                      Letzte Anrufe
                    </h3>
                    <div className="space-y-2">
                      {callHistory.slice(0, 5).map((call, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            // TODO: Load full call details
                            console.log('Load call:', call);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl transition-all hover:bg-white/5"
                          style={{
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-neutral-200 truncate">
                                {call.contactName || 'Unbekannt'} · {call.phoneNumber}
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                {call.status} · {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: de })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 REVIEW MODAL (bleibt wie gehabt) */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: 'rgba(10, 10, 10, 0.90)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl rounded-3xl p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(12,12,12,0.98), rgba(7,7,7,0.98))',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.90)'
              }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif', color: CI.orange }}>
                Final Review
              </h3>
              <div className="space-y-3 text-sm mb-6">
                <div>
                  <span className="text-neutral-400">Kontakt:</span>{' '}
                  <span className="text-white">{contactName}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Telefon:</span>{' '}
                  <span className="text-white">{phoneNumber}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Auftrag:</span>{' '}
                  <p className="text-white mt-1 p-3 rounded-xl bg-black/40 border border-white/10">
                    {enhancedPrompt || message}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReview(false)}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#d1d5db'
                  }}
                >
                  Zurück
                </button>
                <button
                  onClick={handleConfirmCall}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                    color: '#fff',
                    fontFamily: 'Orbitron, sans-serif'
                  }}
                >
                  {loading ? 'Startet...' : 'Anruf starten'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Picker Modal (bleibt wie gehabt) */}
      <AnimatePresence>
        {showContactPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: 'rgba(10, 10, 10, 0.90)',
              backdropFilter: 'blur(12px)'
            }}
            onClick={() => setShowContactPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-2xl rounded-3xl p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(12,12,12,0.98), rgba(7,7,7,0.98))',
                border: '1px solid rgba(255,255,255,0.10)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Kontakt auswählen
                </h3>
                <button
                  onClick={() => setShowContactPicker(false)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                placeholder="Suchen..."
                className="w-full px-4 py-2 rounded-xl mb-4 text-sm bg-black/40 border border-white/10 text-white"
              />
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {contacts?.filter((c: any) =>
                  c.company?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                  c.firstName?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                  c.lastName?.toLowerCase().includes(contactSearchQuery.toLowerCase())
                ).map((contact: any) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      handleSelectContact(contact);
                      setShowContactPicker(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="font-medium text-sm text-white">
                      {contact.company || `${contact.firstName} ${contact.lastName}`}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {contact.phone || contact.phoneNumber}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Contact Modal (bleibt wie gehabt) */}
      <AnimatePresence>
        {showNewContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: 'rgba(10, 10, 10, 0.90)',
              backdropFilter: 'blur(12px)'
            }}
            onClick={() => setShowNewContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-xl rounded-3xl p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(12,12,12,0.98), rgba(7,7,7,0.98))',
                border: '1px solid rgba(255,255,255,0.10)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Neuen Kontakt anlegen
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newContactData.company}
                  onChange={(e) => setNewContactData({ ...newContactData, company: e.target.value })}
                  placeholder="Firma *"
                  className="w-full px-4 py-2 rounded-xl text-sm bg-black/40 border border-white/10 text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newContactData.firstName}
                    onChange={(e) => setNewContactData({ ...newContactData, firstName: e.target.value })}
                    placeholder="Vorname"
                    className="px-4 py-2 rounded-xl text-sm bg-black/40 border border-white/10 text-white"
                  />
                  <input
                    type="text"
                    value={newContactData.lastName}
                    onChange={(e) => setNewContactData({ ...newContactData, lastName: e.target.value })}
                    placeholder="Nachname"
                    className="px-4 py-2 rounded-xl text-sm bg-black/40 border border-white/10 text-white"
                  />
                </div>
                <input
                  type="tel"
                  value={newContactData.phone}
                  onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                  placeholder="Telefon"
                  className="w-full px-4 py-2 rounded-xl text-sm bg-black/40 border border-white/10 text-white"
                />
                <input
                  type="email"
                  value={newContactData.email}
                  onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                  placeholder="E-Mail"
                  className="w-full px-4 py-2 rounded-xl text-sm bg-black/40 border border-white/10 text-white"
                />
                <textarea
                  value={newContactData.notes}
                  onChange={(e) => setNewContactData({ ...newContactData, notes: e.target.value })}
                  placeholder="Notizen"
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl text-sm bg-black/40 border border-white/10 text-white resize-none"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowNewContactModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-neutral-300"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveNewContact}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                    color: '#fff'
                  }}
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
