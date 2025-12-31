import React, { useState, useRef, useEffect, Component, ReactNode } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Phone, Plus, X, Building2, User, Mail, StickyNote, ChevronDown, ChevronUp, 
  Search, Sparkles, Loader2, CheckCircle, AlertTriangle, XCircle, Copy, 
  RefreshCw, Zap, Clock, Database
} from 'lucide-react';
import { ClarificationChat } from '@/components/power/clarification-chat';
import { PowerResultCard } from '@/components/power/power-result-card';
import { ContactAutoSuggest } from '@/components/power/contact-auto-suggest';

// ═══════════════════════════════════════════════════════════════
// ARAS CI COLORS
// ═══════════════════════════════════════════════════════════════
const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00',
  black: '#0a0a0a'
};

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY - Catches React crashes, shows fallback UI
// ═══════════════════════════════════════════════════════════════
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PowerErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleCopyError = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      route: '/app/power',
      error: this.state.error?.message,
      stack: this.state.error?.stack?.substring(0, 500),
    };
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div 
            className="max-w-lg w-full p-8 rounded-2xl text-center"
            style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2 font-['Orbitron'] text-red-400">
              POWER konnte nicht geladen werden
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              Ein unerwarteter Fehler ist aufgetreten.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`, color: '#000' }}
              >
                <RefreshCw className="w-4 h-4" />
                Neu laden
              </button>
              <button
                onClick={this.handleCopyError}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', color: CI.goldLight }}
              >
                <Copy className="w-4 h-4" />
                Fehler kopieren
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// PREFLIGHT CHECK TYPES
// ═══════════════════════════════════════════════════════════════
interface PreflightCheck {
  id: string;
  label: string;
  status: 'pending' | 'pass' | 'warn' | 'fail';
  details?: string;
  fixLink?: string;
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENT ERROR TYPES
// ═══════════════════════════════════════════════════════════════
interface PersistentError {
  userMessage: string;
  technicalMessage: string;
  endpoint?: string;
  status?: number;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════
function PreflightCheckItem({ check }: { check: PreflightCheck }) {
  const icons = {
    pending: <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />,
    pass: <CheckCircle className="w-4 h-4 text-green-500" />,
    warn: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    fail: <XCircle className="w-4 h-4 text-red-500" />,
  };
  return (
    <div className="flex items-center gap-3 py-2">
      {icons[check.status]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: CI.goldLight }}>{check.label}</p>
        {check.details && (
          <p className="text-xs text-neutral-500 truncate">{check.details}</p>
        )}
      </div>
      {check.fixLink && check.status === 'fail' && (
        <a
          href={check.fixLink}
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{ background: `${CI.orange}20`, color: CI.orange }}
        >
          Beheben →
        </a>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    idle: { label: 'BEREIT', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    processing: { label: 'PRÜFE...', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    ringing: { label: 'KLINGELT', color: CI.orange, bg: `${CI.orange}15` },
    connected: { label: 'VERBUNDEN', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    ended: { label: 'BEENDET', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    error: { label: 'FEHLER', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  };
  const c = config[status] || config.idle;
  return (
    <span 
      className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}30` }}
    >
      {c.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT - NO SIDEBAR/TOPBAR (AppPage provides shell)
// ═══════════════════════════════════════════════════════════════
function PowerContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  // Call state
  const [callStatus, setCallStatus] = useState<'idle' | 'processing' | 'ringing' | 'connected' | 'ended' | 'error'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [callSummary, setCallSummary] = useState<any>(null);

  // UI state
  const [showChatFlow, setShowChatFlow] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Preflight & Error state
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [persistentError, setPersistentError] = useState<PersistentError | null>(null);
  const [expandedError, setExpandedError] = useState(false);

  // Contact picker state
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactData, setNewContactData] = useState({
    company: '', firstName: '', lastName: '', phone: '', email: '', notes: ''
  });

  // ─────────────────────────────────────────────────────────────
  // DATA QUERIES (real endpoints verified in server/routes.ts)
  // ─────────────────────────────────────────────────────────────
  
  // GET /api/user/profile-context - Returns: { id, name, company, website, industry, jobRole, aiProfile }
  const { data: profileContext, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-context'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile-context', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // GET /api/user/knowledge/digest?mode=power - Returns: { sourceCount, charCount, digest }
  const { data: knowledgeDigest, isLoading: digestLoading } = useQuery({
    queryKey: ['knowledge-digest-power'],
    queryFn: async () => {
      const res = await fetch('/api/user/knowledge/digest?mode=power', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // GET /api/contacts - Returns array of contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // GET /api/user/call-logs - Returns array of call history (REAL ENDPOINT)
  const { data: callHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['call-history'],
    queryFn: async () => {
      const res = await fetch('/api/user/call-logs', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // ─────────────────────────────────────────────────────────────
  // PREFLIGHT CHECKS (runs on input change)
  // ─────────────────────────────────────────────────────────────
  const runPreflightChecks = () => {
    const checks: PreflightCheck[] = [];

    // 1. Auth check
    checks.push({
      id: 'auth',
      label: 'Authentifizierung',
      status: user ? 'pass' : 'fail',
      details: user ? `Angemeldet als ${(user as any).firstName || (user as any).username}` : 'Nicht angemeldet',
    });

    // 2. Profile check (real BI fields: company, aiProfile)
    const hasCompany = !!profileContext?.company;
    const hasAiProfile = !!(profileContext?.aiProfile?.companyDescription || profileContext?.aiProfile?.targetAudience);
    checks.push({
      id: 'profile',
      label: 'Profildaten',
      status: hasCompany && hasAiProfile ? 'pass' : hasCompany || hasAiProfile ? 'warn' : 'fail',
      details: hasCompany ? profileContext.company : 'Firma & KI-Profil fehlen',
      fixLink: !hasCompany && !hasAiProfile ? '/app/leads?section=ai-profile' : undefined,
    });

    // 3. Knowledge check (real endpoint: /api/user/knowledge/digest?mode=power)
    const hasDigest = (knowledgeDigest?.charCount || 0) > 50;
    checks.push({
      id: 'knowledge',
      label: 'Wissensdatenbank',
      status: hasDigest ? 'pass' : 'warn',
      details: hasDigest ? `${knowledgeDigest.sourceCount} Quellen, ${knowledgeDigest.charCount} Zeichen` : 'Wissensdatenbank ist leer',
      fixLink: !hasDigest ? '/app/leads' : undefined,
    });

    // 4. Input validation
    const phoneValid = phoneNumber.length >= 8;
    const messageValid = message.trim().length > 0;
    checks.push({
      id: 'input',
      label: 'Eingabedaten',
      status: phoneValid && messageValid ? 'pass' : phoneValid || messageValid ? 'warn' : 'fail',
      details: phoneValid && messageValid ? 'Alle Eingaben vorhanden' : 'Telefon und Nachricht eingeben',
    });

    setPreflightChecks(checks);
    return !checks.some(c => c.status === 'fail');
  };

  // Run preflight on input change
  useEffect(() => {
    if (phoneNumber.length >= 3 || message.length > 0) {
      runPreflightChecks();
    }
  }, [phoneNumber, message, profileContext, knowledgeDigest, user]);

  // ─────────────────────────────────────────────────────────────
  // CALL FLOW HANDLERS
  // ─────────────────────────────────────────────────────────────

  // Step 1: Start validation
  const handleStartCallProcess = async () => {
    if (!runPreflightChecks()) {
      toast({ title: 'Systemprüfung fehlgeschlagen', description: 'Bitte behebe die markierten Probleme.', variant: 'destructive' });
      return;
    }

    setPersistentError(null);
    setLoading(true);
    setCallStatus('processing');

    try {
      // POST /api/aras-voice/validate-prompt - Body: { message, contactName, phoneNumber }
      const response = await fetch('/api/aras-voice/validate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message,
          contactName,
          phoneNumber,
          contactId: selectedContactId,
          answers: {}
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw { status: response.status, message: errData.error || 'Validierung fehlgeschlagen', endpoint: '/api/aras-voice/validate-prompt' };
      }

      const result = await response.json();
      setValidationResult(result);

      if (result.isComplete) {
        setEnhancedPrompt(result.enhancedPrompt || message);
        setShowReview(true);
      } else if (result.questions?.length > 0) {
        setShowChatFlow(true);
      } else {
        setEnhancedPrompt(message);
        setShowReview(true);
      }
    } catch (err: any) {
      setPersistentError({
        userMessage: 'Validierung fehlgeschlagen',
        technicalMessage: err.message || 'Unbekannter Fehler',
        endpoint: err.endpoint,
        status: err.status,
        timestamp: new Date().toISOString(),
      });
      setCallStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Chat complete
  const handleChatComplete = (answers: Record<string, string>) => {
    const finalPrompt = Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join('\n');
    setEnhancedPrompt(message + '\n\n' + finalPrompt);
    setShowChatFlow(false);
    setShowReview(true);
  };

  // Step 3: Skip chat
  const handleSkipChat = () => {
    setEnhancedPrompt(message);
    setShowChatFlow(false);
    setShowReview(true);
  };

  // Step 4: Confirm call
  const handleConfirmCall = async () => {
    setShowReview(false);
    setLoading(true);
    setPersistentError(null);
    setResult(null);
    setCallStatus('processing');
    setCallDuration(0);

    try {
      // POST /api/aras-voice/smart-call - Body: { name, phoneNumber, message } (ALL REQUIRED)
      const response = await fetch('/api/aras-voice/smart-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: contactName || 'Unbekannt',
          phoneNumber: phoneNumber,
          message: enhancedPrompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, message: data.error || data.message || 'Anruf fehlgeschlagen', endpoint: '/api/aras-voice/smart-call' };
      }

      if (data.success && data.callId) {
        setCallStatus('ringing');
        toast({ title: '🚀 Anruf gestartet', description: `ARAS AI ruft jetzt ${contactName || phoneNumber} an...` });

        // After 3s: connected (status from backend is in-progress)
        setTimeout(() => {
          setCallStatus('connected');
          callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }, 3000);

        // Start polling
        setTimeout(() => pollCallDetails(data.callId), 5000);
      } else {
        setCallStatus('idle');
        setResult(data);
      }
    } catch (err: any) {
      setPersistentError({
        userMessage: 'Anruf konnte nicht gestartet werden',
        technicalMessage: err.message || 'Unbekannter Fehler',
        endpoint: err.endpoint,
        status: err.status,
        timestamp: new Date().toISOString(),
      });
      setCallStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Polling: GET /api/aras-voice/call-details/:callId
  const pollCallDetails = async (callId: number) => {
    let attempts = 0;
    const maxAttempts = 30;

    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/aras-voice/call-details/${callId}`, { credentials: 'include' });

        if (!response.ok) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            clearCallTimer();
            setCallStatus('ended');
            setResult({ success: false, error: 'Anruf-Details konnten nicht abgerufen werden' });
          }
          return;
        }

        const callDetails = await response.json();
        const hasTranscript = !!callDetails.transcript;
        const hasAudio = !!callDetails.recordingUrl;

        // Status check: completed, failed, no-answer
        if (callDetails.status === 'completed' || callDetails.status === 'failed' || callDetails.status === 'no-answer' || (hasTranscript && hasAudio)) {
          clearInterval(pollInterval);
          clearCallTimer();
          setCallStatus('ended');
          setResult({
            success: callDetails.status === 'completed',
            callId: callDetails.id,
            transcript: callDetails.transcript,
            recordingUrl: callDetails.recordingUrl,
            duration: callDetails.duration || callDuration,
            phoneNumber: callDetails.phoneNumber,
            contactName: callDetails.contactName
          });
          if (callDetails.summary) {
            setCallSummary(callDetails.summary);
          }
          refetchHistory();
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          clearCallTimer();
          setCallStatus('ended');
          setResult({
            success: true,
            callId: callDetails.callId,
            transcript: 'Anruf wurde durchgeführt. Details werden verarbeitet.',
            duration: callDuration
          });
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          clearCallTimer();
          setCallStatus('ended');
          setResult({ success: false, error: 'Fehler beim Abrufen der Anrufdaten' });
        }
      }
    }, 4000);

    // Safety timeout
    setTimeout(() => {
      clearInterval(pollInterval);
      clearCallTimer();
      if (callStatus !== 'ended') {
        setCallStatus('ended');
        setResult({ success: true, transcript: 'Anruf beendet. Details werden verarbeitet.', duration: callDuration });
      }
    }, 150000);
  };

  const clearCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  // Reset for new call
  const handleNewCall = () => {
    setResult(null);
    setCallSummary(null);
    setCallStatus('idle');
    setCallDuration(0);
    setShowReview(false);
    setShowChatFlow(false);
    setEnhancedPrompt('');
    setValidationResult(null);
    setContactName('');
    setPhoneNumber('');
    setMessage('');
    setPersistentError(null);
    setPreflightChecks([]);
  };

  // Refresh call details (for transcript/recording that may be processing)
  const handleRefreshCallDetails = async () => {
    if (!result?.callId && !result?.id) return;
    
    const callId = result.callId || result.id;
    try {
      const response = await fetch(`/api/aras-voice/call-details/${callId}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const callDetails = await response.json();
      
      // Update result with fresh data
      setResult({
        ...result,
        transcript: callDetails.transcript,
        recordingUrl: callDetails.recordingUrl,
        duration: callDetails.duration || result.duration,
      });
      
      if (callDetails.summary) {
        setCallSummary(callDetails.summary);
      }
      
      toast({ title: 'Aktualisiert', description: 'Call-Details wurden neu geladen' });
    } catch (err: any) {
      toast({ title: 'Fehler', description: 'Details konnten nicht geladen werden', variant: 'destructive' });
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearCallTimer();
  }, []);

  // Copy error debug info
  const copyErrorDebug = () => {
    if (!persistentError) return;
    const debug = {
      timestamp: persistentError.timestamp,
      userId: (user as any)?.id,
      route: '/app/power',
      state: callStatus,
      endpoint: persistentError.endpoint,
      httpStatus: persistentError.status,
      message: persistentError.technicalMessage,
    };
    navigator.clipboard.writeText(JSON.stringify(debug, null, 2));
    toast({ title: 'Debug-Info kopiert', description: 'In Zwischenablage kopiert' });
  };

  // Contact handlers
  const handleSelectContact = (contact: any) => {
    setContactName(contact.company || `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
    setPhoneNumber(contact.phone || contact.phoneNumber || '');
    setSelectedContactId(contact.id || null);
    setShowContactPicker(false);
  };

  const handleSaveNewContact = async () => {
    if (!newContactData.company.trim()) {
      toast({ title: 'Firma erforderlich', variant: 'destructive' });
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
      const saved = await response.json();
      setContactName(saved.company);
      setPhoneNumber(saved.phone || '');
      setNewContactData({ company: '', firstName: '', lastName: '', phone: '', email: '', notes: '' });
      setShowNewContactModal(false);
      toast({ title: 'Kontakt gespeichert' });
    } catch {
      toast({ title: 'Fehler beim Speichern', variant: 'destructive' });
    }
  };

  const filteredContacts = contacts.filter((c: any) =>
    contactSearchQuery === '' ||
    c.company?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.firstName?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.phone?.includes(contactSearchQuery)
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canStart = preflightChecks.length > 0 && !preflightChecks.some(c => c.status === 'fail') && phoneNumber.length >= 8 && message.trim().length > 0;
  const isLoading = profileLoading || digestLoading || loading;

  // ─────────────────────────────────────────────────────────────
  // RENDER - Scrollable container, no Sidebar/TopBar
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 
              className="text-2xl sm:text-3xl font-bold font-['Orbitron'] tracking-wide"
              style={{ 
                backgroundImage: 'linear-gradient(90deg, #E9D7C4, #FE9100, #ffffff, #FE9100, #E9D7C4)',
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              POWER
            </h1>
            <p className="text-sm text-neutral-400 mt-1">KI-gesteuerte Einzelanrufe starten</p>
          </div>
          <StatusPill status={callStatus} />
        </div>

        {/* PERSISTENT ERROR PANEL */}
        <AnimatePresence>
          {persistentError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-400">{persistentError.userMessage}</p>
                    <p className="text-sm text-red-300/70 mt-1">{persistentError.technicalMessage}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyErrorDebug} className="p-2 rounded-lg hover:bg-white/5">
                      <Copy className="w-4 h-4 text-red-400" />
                    </button>
                    <button onClick={() => setPersistentError(null)} className="p-2 rounded-lg hover:bg-white/5">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedError(!expandedError)}
                  className="flex items-center gap-1 mt-3 text-xs text-red-400/70 hover:text-red-400"
                >
                  {expandedError ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Technische Details
                </button>
                <AnimatePresence>
                  {expandedError && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <pre className="mt-2 p-3 rounded-lg bg-black/30 text-xs text-red-300/60 overflow-x-auto">
{`Endpoint: ${persistentError.endpoint || 'N/A'}
Status: ${persistentError.status || 'N/A'}
Time: ${persistentError.timestamp}`}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Setup */}
          <div className="space-y-5">

            {/* Preflight Checks Panel */}
            <div 
              className="rounded-xl p-5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: CI.goldLight }}>
                <Zap className="w-4 h-4" style={{ color: CI.orange }} />
                Systemprüfung
              </h3>
              {preflightChecks.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {preflightChecks.map(check => (
                    <PreflightCheckItem key={check.id} check={check} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Gib Telefonnummer und Nachricht ein, um die Prüfung zu starten.</p>
              )}
            </div>

            {/* Input Form */}
            <div 
              className="rounded-xl p-5 space-y-4"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h3 className="text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: CI.goldLight }}>
                <Phone className="w-4 h-4" style={{ color: CI.orange }} />
                Anruf konfigurieren
              </h3>

              {/* Contact Name */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Kontaktname</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="z.B. Firma GmbH"
                    className="flex-1 px-4 py-3 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: CI.goldLight }}
                  />
                  <button
                    onClick={() => setShowContactPicker(true)}
                    className="px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Search className="w-4 h-4" style={{ color: CI.goldLight }} />
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Telefonnummer *</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="+49 123 4567890"
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: CI.goldLight }}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nachricht / Anweisung *</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="z.B. Frag nach dem aktuellen Stand des Projekts..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: CI.goldLight }}
                />
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartCallProcess}
                disabled={!canStart || isLoading || callStatus === 'ringing' || callStatus === 'connected'}
                className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: canStart ? `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})` : 'rgba(255,255,255,0.1)',
                  color: canStart ? '#000' : '#666'
                }}
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Wird vorbereitet...</>
                ) : callStatus === 'ringing' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Klingelt...</>
                ) : (
                  <><Phone className="w-5 h-5" /> Jetzt anrufen lassen</>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Status & Results */}
          <div className="space-y-5">

            {/* Chat Flow */}
            {showChatFlow && validationResult?.questions && (
              <div 
                className="rounded-xl p-5"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <ClarificationChat
                  questions={validationResult.questions}
                  initialMessage={message}
                  userProfileContext={profileContext}
                  onAnswersComplete={handleChatComplete}
                  onSkip={handleSkipChat}
                />
              </div>
            )}

            {/* Review Modal */}
            {showReview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-5"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(254,145,0,0.3)' }}
              >
                <h3 className="text-lg font-bold mb-4" style={{ color: CI.orange }}>
                  <Sparkles className="w-5 h-5 inline mr-2" />
                  Anruf bestätigen
                </h3>
                <div className="space-y-3 text-sm" style={{ color: CI.goldLight }}>
                  <p><strong>Kontakt:</strong> {contactName || 'Unbekannt'}</p>
                  <p><strong>Telefon:</strong> {phoneNumber}</p>
                  <p><strong>Nachricht:</strong></p>
                  <div className="p-3 rounded-lg bg-black/30 text-xs whitespace-pre-wrap">{enhancedPrompt}</div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={handleConfirmCall}
                    className="flex-1 py-3 rounded-xl font-bold"
                    style={{ background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`, color: '#000' }}
                  >
                    Jetzt anrufen
                  </button>
                  <button
                    onClick={() => setShowReview(false)}
                    className="px-5 py-3 rounded-xl font-bold"
                    style={{ background: 'rgba(255,255,255,0.1)', color: CI.goldLight }}
                  >
                    Abbrechen
                  </button>
                </div>
              </motion.div>
            )}

            {/* Active Call Status */}
            {(callStatus === 'ringing' || callStatus === 'connected') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-6 text-center"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
                  <Phone className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-lg font-bold text-green-400 mb-1">
                  {callStatus === 'ringing' ? 'Anruf wird verbunden...' : 'Anruf läuft'}
                </p>
                {callStatus === 'connected' && (
                  <p className="text-sm text-green-300/70">Dauer: {formatDuration(callDuration)}</p>
                )}
              </motion.div>
            )}

            {/* Call Result */}
            {callStatus === 'ended' && result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <PowerResultCard
                  result={result}
                  summary={callSummary}
                  onNewCall={handleNewCall}
                  onRefresh={handleRefreshCallDetails}
                />
              </motion.div>
            )}

            {/* Call History (REAL ENDPOINT: /api/user/call-logs) */}
            {callHistory.length > 0 && (
              <div 
                className="rounded-xl p-5"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: CI.goldLight }}>
                  <Clock className="w-4 h-4" style={{ color: CI.orange }} />
                  Letzte Anrufe
                </h3>
                <div className="space-y-2">
                  {callHistory.slice(0, 5).map((call: any) => (
                    <div key={call.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className={`w-2 h-2 rounded-full ${call.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: CI.goldLight }}>{call.contactName || call.phoneNumber}</p>
                        <p className="text-xs text-neutral-500">
                          {call.createdAt ? formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: de }) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTACT PICKER MODAL */}
        <AnimatePresence>
          {showContactPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setShowContactPicker(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-md rounded-2xl p-5"
                style={{ background: 'rgba(15,15,15,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color: CI.goldLight }}>Kontakt auswählen</h3>
                  <button onClick={() => setShowContactPicker(false)}>
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>
                <input
                  type="text"
                  value={contactSearchQuery}
                  onChange={e => setContactSearchQuery(e.target.value)}
                  placeholder="Suchen..."
                  className="w-full px-4 py-2.5 rounded-lg mb-4 text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: CI.goldLight }}
                />
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredContacts.map((contact: any) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <p className="text-sm font-medium" style={{ color: CI.goldLight }}>{contact.company || contact.firstName}</p>
                      <p className="text-xs text-neutral-500">{contact.phone}</p>
                    </button>
                  ))}
                  {filteredContacts.length === 0 && (
                    <p className="text-center text-sm text-neutral-500 py-4">Keine Kontakte gefunden</p>
                  )}
                </div>
                <button
                  onClick={() => { setShowContactPicker(false); setShowNewContactModal(true); }}
                  className="w-full mt-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: `${CI.orange}20`, color: CI.orange }}
                >
                  <Plus className="w-4 h-4" /> Neuen Kontakt anlegen
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NEW CONTACT MODAL */}
        <AnimatePresence>
          {showNewContactModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setShowNewContactModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-md rounded-2xl p-5"
                style={{ background: 'rgba(15,15,15,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color: CI.goldLight }}>Neuer Kontakt</h3>
                  <button onClick={() => setShowNewContactModal(false)}>
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newContactData.company}
                    onChange={e => setNewContactData({ ...newContactData, company: e.target.value })}
                    placeholder="Firma *"
                    className="w-full px-4 py-2.5 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: CI.goldLight }}
                  />
                  <input
                    type="tel"
                    value={newContactData.phone}
                    onChange={e => setNewContactData({ ...newContactData, phone: e.target.value })}
                    placeholder="Telefon"
                    className="w-full px-4 py-2.5 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: CI.goldLight }}
                  />
                  <input
                    type="email"
                    value={newContactData.email}
                    onChange={e => setNewContactData({ ...newContactData, email: e.target.value })}
                    placeholder="E-Mail"
                    className="w-full px-4 py-2.5 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: CI.goldLight }}
                  />
                </div>
                <button
                  onClick={handleSaveNewContact}
                  className="w-full mt-4 py-3 rounded-xl font-bold"
                  style={{ background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`, color: '#000' }}
                >
                  Speichern
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORT - Wrapped in ErrorBoundary
// ═══════════════════════════════════════════════════════════════
export default function Power() {
  return (
    <PowerErrorBoundary>
      <PowerContent />
    </PowerErrorBoundary>
  );
}
