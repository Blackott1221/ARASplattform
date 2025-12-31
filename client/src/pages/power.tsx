import React, { useState, useRef, useEffect, Component, ReactNode } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { ClarificationChat } from '@/components/power/clarification-chat';
import { PowerResultCard } from '@/components/power/power-result-card';
import { ContactAutoSuggest } from '@/components/power/contact-auto-suggest';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS (2026 Control Room - No Icons)
// ═══════════════════════════════════════════════════════════════
const DT = {
  // Colors
  orange: '#ff6a00',
  gold: '#e9d7c4',
  goldDark: '#a34e00',
  // Panels
  panelBg: 'rgba(0,0,0,0.35)',
  panelBorder: 'rgba(255,255,255,0.10)',
  // Glow
  glow: '0 0 0 1px rgba(255,106,0,0.18), 0 0 22px rgba(255,106,0,0.10)',
  glowSubtle: '0 0 12px rgba(255,106,0,0.08)',
};

// Legacy CI alias for backward compat
const CI = {
  goldLight: DT.gold,
  orange: DT.orange,
  goldDark: DT.goldDark,
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
            className="max-w-lg w-full p-8 rounded-[20px] text-center"
            style={{ background: DT.panelBg, border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-red-500/50 flex items-center justify-center">
              <div className="w-8 h-0.5 bg-red-500 rotate-45 absolute" />
              <div className="w-8 h-0.5 bg-red-500 -rotate-45 absolute" />
            </div>
            <h2 className="text-xl font-bold mb-2 font-['Orbitron'] text-red-400">
              FEHLER
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              POWER konnte nicht geladen werden.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-[14px] font-bold text-sm transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})`, color: '#000' }}
              >
                Neu laden
              </button>
              <button
                onClick={this.handleCopyError}
                className="px-5 py-2.5 rounded-[14px] font-bold text-sm transition-all hover:bg-white/15"
                style={{ background: 'rgba(255,255,255,0.08)', color: DT.gold, border: `1px solid ${DT.panelBorder}` }}
              >
                Kopieren
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
// HELPER COMPONENTS (No Icons - Pure CSS)
// ═══════════════════════════════════════════════════════════════

// Status Dot - CSS only circle with color
function StatusDot({ status }: { status: 'pending' | 'pass' | 'warn' | 'fail' }) {
  const colors = {
    pending: { bg: 'rgba(156,163,175,0.3)', border: 'rgba(156,163,175,0.5)' },
    pass: { bg: 'rgba(34,197,94,0.4)', border: 'rgba(34,197,94,0.6)' },
    warn: { bg: 'rgba(251,191,36,0.4)', border: 'rgba(251,191,36,0.6)' },
    fail: { bg: 'rgba(239,68,68,0.4)', border: 'rgba(239,68,68,0.6)' },
  };
  const c = colors[status];
  return (
    <span 
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status === 'pending' ? 'animate-pulse' : ''}`}
      style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
    />
  );
}

function PreflightCheckItem({ check }: { check: PreflightCheck }) {
  const showFixButton = check.fixLink && (check.status === 'fail' || check.status === 'warn');
  return (
    <div 
      className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-3 -mx-3 rounded-xl transition-all hover:bg-white/[0.03] group"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <StatusDot status={check.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: DT.gold }}>{check.label}</p>
          {check.details && (
            <p className="text-xs text-neutral-500 truncate mt-0.5">{check.details}</p>
          )}
        </div>
      </div>
      {showFixButton && (
        <a
          href={check.fixLink}
          className="text-xs font-semibold px-3 py-1.5 rounded-[10px] transition-all hover:scale-[1.03] self-start sm:self-center"
          style={{ 
            background: check.status === 'fail' ? 'rgba(255,106,0,0.12)' : 'rgba(251,191,36,0.10)',
            color: check.status === 'fail' ? DT.orange : '#fbbf24',
            border: `1px solid ${check.status === 'fail' ? 'rgba(255,106,0,0.25)' : 'rgba(251,191,36,0.25)'}`
          }}
        >
          Jetzt beheben
        </a>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string; glow?: string }> = {
    idle: { label: 'BEREIT', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
    processing: { label: 'PRÜFUNG', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
    ringing: { label: 'VERBINDET', color: DT.orange, bg: 'rgba(255,106,0,0.08)', glow: '0 0 12px rgba(255,106,0,0.3)' },
    connected: { label: 'LÄUFT', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', glow: '0 0 12px rgba(34,197,94,0.3)' },
    ended: { label: 'BEENDET', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
    error: { label: 'FEHLER', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  };
  const c = config[status] || config.idle;
  return (
    <span 
      className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] font-['Orbitron']"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}25`, boxShadow: c.glow || 'none' }}
    >
      {c.label}
    </span>
  );
}

// Visual Stepper (no logic, just display)
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Systemcheck' },
    { num: 2, label: 'Kontakt' },
    { num: 3, label: 'Anweisung' },
    { num: 4, label: 'Ergebnis' },
  ];
  return (
    <div className="flex items-center justify-between gap-2 mb-6">
      {steps.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        return (
          <div key={step.num} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive ? 'scale-110' : ''
                }`}
                style={{
                  background: isActive ? `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})` : 
                             isCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? 'none' : isCompleted ? '1px solid rgba(34,197,94,0.4)' : `1px solid ${DT.panelBorder}`,
                  color: isActive ? '#000' : isCompleted ? '#4ade80' : '#666',
                  boxShadow: isActive ? DT.glow : 'none'
                }}
              >
                {step.num}
              </div>
              {idx < steps.length - 1 && (
                <div 
                  className="flex-1 h-px mx-2"
                  style={{ 
                    background: isCompleted ? 'rgba(34,197,94,0.4)' : 
                               isActive ? `linear-gradient(90deg, ${DT.orange}60, transparent)` : 
                               'rgba(255,255,255,0.08)' 
                  }}
                />
              )}
            </div>
            <span 
              className="text-[10px] mt-1.5 font-medium tracking-wide hidden sm:block"
              style={{ color: isActive ? DT.gold : '#666' }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
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
  const [finalElapsedSeconds, setFinalElapsedSeconds] = useState<number | null>(null); // Frozen timer value at call end
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

  // Call history drawer state
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [selectedCallDetails, setSelectedCallDetails] = useState<any>(null);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);
  const summaryPollRef = useRef<NodeJS.Timeout | null>(null);

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

        // Start polling immediately - status will be updated based on backend response
        // No fake "connected" timeout - only show connected when backend confirms in_progress
        setTimeout(() => pollCallDetails(data.callId), 2000);
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
        const backendStatus = callDetails.status?.toLowerCase();

        // Map backend status to UI status accurately
        // Backend statuses: queued, dialing, in_progress, in-progress, connected, ended, completed, failed, no-answer
        if (backendStatus === 'in_progress' || backendStatus === 'in-progress' || backendStatus === 'connected') {
          // Only now show "connected" and start timer
          if (callStatus !== 'connected') {
            setCallStatus('connected');
            if (!callTimerRef.current) {
              callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
              }, 1000);
            }
          }
        } else if (backendStatus === 'queued' || backendStatus === 'dialing' || backendStatus === 'ringing') {
          // Still connecting
          setCallStatus('ringing');
        }

        // Status check: completed, failed, no-answer, ended
        if (backendStatus === 'completed' || backendStatus === 'ended' || backendStatus === 'failed' || backendStatus === 'no-answer' || (hasTranscript && hasAudio)) {
          clearInterval(pollInterval);
          clearCallTimer();
          // Freeze timer value BEFORE clearing
          const frozenElapsed = callDuration > 0 ? callDuration : null;
          setFinalElapsedSeconds(frozenElapsed);
          setCallStatus('ended');
          // Best-available duration: server durationSeconds > server duration > client timer
          const bestDuration = callDetails.durationSeconds ?? callDetails.duration ?? frozenElapsed ?? null;
          setResult({
            success: backendStatus === 'completed' || backendStatus === 'ended',
            callId: callDetails.id,
            transcript: callDetails.transcript,
            recordingUrl: callDetails.recordingUrl,
            duration: bestDuration,
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
          const frozenElapsed = callDuration > 0 ? callDuration : null;
          setFinalElapsedSeconds(frozenElapsed);
          setCallStatus('ended');
          setResult({
            success: true,
            callId: callDetails.callId,
            transcript: 'Anruf wurde durchgeführt. Details werden verarbeitet.',
            duration: frozenElapsed
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
        const frozenElapsed = callDuration > 0 ? callDuration : null;
        setFinalElapsedSeconds(frozenElapsed);
        setCallStatus('ended');
        setResult({ success: true, transcript: 'Anruf beendet. Details werden verarbeitet.', duration: frozenElapsed });
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
    setFinalElapsedSeconds(null); // Reset frozen timer
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
      
      // Best-available duration: server durationSeconds > server duration > current result > frozen timer
      const bestDuration = callDetails.durationSeconds ?? callDetails.duration ?? result.duration ?? finalElapsedSeconds ?? null;
      
      // Update result with fresh data
      setResult({
        ...result,
        transcript: callDetails.transcript,
        recordingUrl: callDetails.recordingUrl,
        duration: bestDuration,
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

  // Load call details when clicking a call history item
  const handleOpenCallDetails = async (callId: number) => {
    setSelectedCallId(callId);
    setLoadingCallDetails(true);
    setSelectedCallDetails(null);
    
    try {
      const res = await fetch(`/api/aras-voice/call-details/${callId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load call details');
      const data = await res.json();
      setSelectedCallDetails(data);
    } catch (err) {
      toast({ title: 'Fehler beim Laden der Anrufdetails', variant: 'destructive' });
    } finally {
      setLoadingCallDetails(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedCallId(null);
    setSelectedCallDetails(null);
  };

  const handleRefreshDrawerDetails = async () => {
    if (!selectedCallId) return;
    await handleOpenCallDetails(selectedCallId);
  };

  // Poll for pending summaries in call history
  useEffect(() => {
    const hasPending = callHistory.some((c: any) => c.summaryStatus === 'pending');
    
    if (hasPending && !summaryPollRef.current) {
      summaryPollRef.current = setInterval(() => {
        refetchHistory();
      }, 12000); // Poll every 12s
    } else if (!hasPending && summaryPollRef.current) {
      clearInterval(summaryPollRef.current);
      summaryPollRef.current = null;
    }
    
    return () => {
      if (summaryPollRef.current) {
        clearInterval(summaryPollRef.current);
        summaryPollRef.current = null;
      }
    };
  }, [callHistory, refetchHistory]);

  // Compute current step for visual stepper
  const currentStep = callStatus === 'ended' || result ? 4 : 
                      message.trim().length > 0 ? 3 : 
                      phoneNumber.length >= 3 ? 2 : 1;

  // ─────────────────────────────────────────────────────────────
  // RENDER - 2026 Control Room Layout
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* TOP HEADER - Ultra Clean */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
              POWER / EINZELANRUF
            </p>
            <h1 
              className="text-3xl sm:text-4xl font-black font-['Orbitron'] tracking-wide"
              style={{ 
                background: 'linear-gradient(90deg, #ff6a00, #ffb15a, #e9d7c4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              POWER
            </h1>
          </div>
          <StatusPill status={callStatus} />
        </div>

        {/* STEP INDICATOR */}
        <StepIndicator currentStep={currentStep} />

        {/* PERSISTENT ERROR PANEL - No Icons */}
        <AnimatePresence>
          {persistentError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-[16px] overflow-hidden"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 mt-1 rounded-full bg-red-500/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-400 text-sm">{persistentError.userMessage}</p>
                    <p className="text-xs text-red-300/60 mt-1">{persistentError.technicalMessage}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyErrorDebug} 
                      className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Kopieren
                    </button>
                    <button 
                      onClick={() => setPersistentError(null)} 
                      className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedError(!expandedError)}
                  className="mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  {expandedError ? '− Details ausblenden' : '+ Technische Details'}
                </button>
                <AnimatePresence>
                  {expandedError && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <pre className="mt-3 p-3 rounded-[12px] bg-black/30 text-[11px] text-red-300/50 overflow-x-auto font-mono">
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

        {/* MAIN GRID - 12 Column Control Room */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: col-span-7 */}
          <div className="lg:col-span-7 space-y-5">

            {/* Preflight Checks Panel - Glass Card */}
            <div 
              className="rounded-[20px] p-5"
              style={{ background: DT.panelBg, border: `1px solid ${DT.panelBorder}` }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: DT.gold }}>
                Systemprüfung
              </h3>
              {preflightChecks.length > 0 ? (
                <div>
                  {preflightChecks.map(check => (
                    <PreflightCheckItem key={check.id} check={check} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Gib Telefonnummer und Nachricht ein, um die Prüfung zu starten.</p>
              )}
            </div>

            {/* Input Form - Ultra Clean */}
            <div 
              className="rounded-[20px] p-5 space-y-5"
              style={{ background: DT.panelBg, border: `1px solid ${DT.panelBorder}` }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: DT.gold }}>
                Anruf konfigurieren
              </h3>

              {/* Contact Name */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-2 uppercase tracking-wide">Kontaktname</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="z.B. Firma GmbH"
                    className="flex-1 px-4 py-3 rounded-[14px] text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                  />
                  <button
                    onClick={() => setShowContactPicker(true)}
                    className="px-4 py-3 rounded-[14px] text-xs font-medium hover:bg-white/[0.06] transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                  >
                    Kontakte
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-2 uppercase tracking-wide">Telefonnummer *</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="+49 123 4567890"
                  className="w-full px-4 py-3 rounded-[14px] text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-2 uppercase tracking-wide">Nachricht / Anweisung *</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="z.B. Frag nach dem aktuellen Stand des Projekts..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-[14px] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold, minHeight: '120px' }}
                />
              </div>

              {/* Start Button - Primary CTA */}
              <button
                onClick={handleStartCallProcess}
                disabled={!canStart || isLoading || callStatus === 'ringing' || callStatus === 'connected'}
                className="w-full py-[14px] rounded-[18px] font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-1px]"
                style={{
                  background: canStart ? `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})` : 'rgba(255,255,255,0.06)',
                  color: canStart ? '#000' : '#555',
                  boxShadow: canStart ? DT.glowSubtle : 'none'
                }}
              >
                {isLoading ? 'Wird vorbereitet...' : 
                 callStatus === 'ringing' ? 'Verbindet...' : 
                 'Jetzt anrufen lassen'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: col-span-5 */}
          <div className="lg:col-span-5 space-y-5">

            {/* Chat Flow */}
            {showChatFlow && validationResult?.questions && (
              <div 
                className="rounded-[20px] p-5"
                style={{ background: DT.panelBg, border: `1px solid ${DT.panelBorder}` }}
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

            {/* Review Modal - No Icons */}
            {showReview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[20px] p-5"
                style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid rgba(255,106,0,0.25)` }}
              >
                <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: DT.orange }}>
                  Anruf bestätigen
                </h3>
                <div className="space-y-3 text-sm" style={{ color: DT.gold }}>
                  <p><span className="text-neutral-500">Kontakt:</span> {contactName || 'Unbekannt'}</p>
                  <p><span className="text-neutral-500">Telefon:</span> {phoneNumber}</p>
                  <p className="text-neutral-500">Nachricht:</p>
                  <div className="p-3 rounded-[12px] bg-black/40 text-xs whitespace-pre-wrap leading-relaxed">{enhancedPrompt}</div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={handleConfirmCall}
                    className="flex-1 py-3 rounded-[14px] font-bold text-sm transition-all hover:translate-y-[-1px]"
                    style={{ background: `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})`, color: '#000' }}
                  >
                    Jetzt anrufen
                  </button>
                  <button
                    onClick={() => setShowReview(false)}
                    className="px-5 py-3 rounded-[14px] font-bold text-sm hover:bg-white/[0.06] transition-colors"
                    style={{ background: 'rgba(255,255,255,0.1)', color: CI.goldLight }}
                  >
                    Abbrechen
                  </button>
                </div>
              </motion.div>
            )}

            {/* Active Call Status - Clean, No Icons */}
            {(callStatus === 'ringing' || callStatus === 'connected') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[20px] p-6 text-center"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <div 
                  className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}
                >
                  <div className="w-4 h-4 rounded-full bg-green-400" />
                </div>
                <p className="text-base font-bold text-green-400 mb-1 uppercase tracking-wide">
                  {callStatus === 'ringing' ? 'Verbindet...' : 'Anruf läuft'}
                </p>
                {callStatus === 'connected' && (
                  <p className="text-sm text-green-300/60 font-mono">{formatDuration(callDuration)}</p>
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

            {/* Call History - Clean, Clickable, No Icons */}
            {callHistory.length > 0 && (
              <div 
                className="rounded-[20px] p-5"
                style={{ background: DT.panelBg, border: `1px solid ${DT.panelBorder}` }}
              >
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: DT.gold }}>
                  Letzte Anrufe
                </h3>
                <div className="space-y-1">
                  {callHistory.slice(0, 5).map((call: any) => (
                    <button
                      key={call.id}
                      onClick={() => handleOpenCallDetails(call.id)}
                      className="w-full flex items-center gap-3 py-3 px-3 -mx-3 rounded-[12px] transition-all hover:bg-white/[0.04] focus:outline-none text-left group"
                      style={{ borderRight: '2px solid transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.borderRightColor = `${DT.orange}50`)}
                      onMouseLeave={e => (e.currentTarget.style.borderRightColor = 'transparent')}
                    >
                      <div 
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${call.status === 'completed' ? 'bg-green-500/70' : 'bg-red-500/70'}`} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm truncate font-medium group-hover:text-white transition-colors" style={{ color: DT.gold }}>
                            {call.contactName || call.phoneNumber}
                          </p>
                          <span className="text-[10px] text-neutral-500 flex-shrink-0">
                            {call.createdAt ? formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: de }) : ''}
                          </span>
                        </div>
                        {/* Summary line - no icons */}
                        {call.summaryShort ? (
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{call.summaryShort}</p>
                        ) : call.summaryStatus === 'pending' ? (
                          <p className="text-xs text-neutral-500 italic mt-0.5">
                            Zusammenfassung wird erstellt...
                          </p>
                        ) : call.status === 'failed' ? (
                          <p className="text-xs text-red-400/60 mt-0.5">Fehlgeschlagen</p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTACT PICKER MODAL - No Icons */}
        <AnimatePresence>
          {showContactPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.85)' }}
              onClick={() => setShowContactPicker(false)}
            >
              <motion.div
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.97 }}
                className="w-full max-w-md rounded-[20px] p-5"
                style={{ background: 'rgba(12,12,12,0.98)', border: `1px solid ${DT.panelBorder}` }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold" style={{ color: DT.gold }}>Kontakt auswählen</h3>
                  <button 
                    onClick={() => setShowContactPicker(false)}
                    className="text-xs font-medium text-neutral-500 hover:text-white transition-colors px-2 py-1"
                  >
                    Schließen
                  </button>
                </div>
                <input
                  type="text"
                  value={contactSearchQuery}
                  onChange={e => setContactSearchQuery(e.target.value)}
                  placeholder="Suchen..."
                  className="w-full px-4 py-2.5 rounded-[12px] mb-4 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                />
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredContacts.map((contact: any) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full text-left px-3 py-2.5 rounded-[10px] hover:bg-white/[0.04] transition-colors"
                    >
                      <p className="text-sm font-medium" style={{ color: DT.gold }}>{contact.company || contact.firstName}</p>
                      <p className="text-xs text-neutral-500">{contact.phone}</p>
                    </button>
                  ))}
                  {filteredContacts.length === 0 && (
                    <p className="text-center text-sm text-neutral-500 py-4">Keine Kontakte gefunden</p>
                  )}
                </div>
                <button
                  onClick={() => { setShowContactPicker(false); setShowNewContactModal(true); }}
                  className="w-full mt-4 py-2.5 rounded-[12px] text-sm font-medium transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,106,0,0.12)', color: DT.orange, border: '1px solid rgba(255,106,0,0.25)' }}
                >
                  + Neuen Kontakt anlegen
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NEW CONTACT MODAL - No Icons */}
        <AnimatePresence>
          {showNewContactModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.85)' }}
              onClick={() => setShowNewContactModal(false)}
            >
              <motion.div
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.97 }}
                className="w-full max-w-md rounded-[20px] p-5"
                style={{ background: 'rgba(12,12,12,0.98)', border: `1px solid ${DT.panelBorder}` }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold" style={{ color: DT.gold }}>Neuer Kontakt</h3>
                  <button 
                    onClick={() => setShowNewContactModal(false)}
                    className="text-xs font-medium text-neutral-500 hover:text-white transition-colors px-2 py-1"
                  >
                    Schließen
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newContactData.company}
                    onChange={e => setNewContactData({ ...newContactData, company: e.target.value })}
                    placeholder="Firma *"
                    className="w-full px-4 py-2.5 rounded-[12px] text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                  />
                  <input
                    type="tel"
                    value={newContactData.phone}
                    onChange={e => setNewContactData({ ...newContactData, phone: e.target.value })}
                    placeholder="Telefon"
                    className="w-full px-4 py-2.5 rounded-[12px] text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                  />
                  <input
                    type="email"
                    value={newContactData.email}
                    onChange={e => setNewContactData({ ...newContactData, email: e.target.value })}
                    placeholder="E-Mail"
                    className="w-full px-4 py-2.5 rounded-[12px] text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                  />
                </div>
                <button
                  onClick={handleSaveNewContact}
                  className="w-full mt-4 py-3 rounded-[14px] font-bold transition-all hover:translate-y-[-1px]"
                  style={{ background: `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})`, color: '#000' }}
                >
                  Speichern
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CALL DETAILS DRAWER - Premium Glass, No Icons */}
        <AnimatePresence>
          {selectedCallId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={handleCloseDrawer}
            >
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full sm:w-[440px] sm:max-w-[90vw] h-[85vh] sm:h-full sm:max-h-screen overflow-hidden rounded-t-[24px] sm:rounded-none flex flex-col"
                style={{ background: 'rgba(8,8,8,0.98)', borderLeft: `1px solid ${DT.panelBorder}` }}
                onClick={e => e.stopPropagation()}
              >
                {/* Drawer Header - Text Buttons Only */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                  <h3 
                    className="text-base font-bold uppercase tracking-wide"
                    style={{ 
                      background: `linear-gradient(90deg, ${DT.orange}, ${DT.gold})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Anrufdetails
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRefreshDrawerDetails}
                      disabled={loadingCallDetails}
                      className="text-xs font-medium px-3 py-1.5 rounded-[10px] hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                      style={{ color: DT.gold }}
                    >
                      {loadingCallDetails ? 'Lädt...' : 'Aktualisieren'}
                    </button>
                    <button
                      onClick={handleCloseDrawer}
                      className="text-xs font-medium px-3 py-1.5 rounded-[10px] hover:bg-white/[0.06] transition-colors"
                      style={{ color: '#888' }}
                    >
                      Schließen
                    </button>
                  </div>
                </div>
                
                {/* Drawer Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                  {loadingCallDetails ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                      <div 
                        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: `${DT.orange}40`, borderTopColor: 'transparent' }}
                      />
                      <p className="text-xs text-neutral-500">Lade Details...</p>
                    </div>
                  ) : selectedCallDetails ? (
                    <PowerResultCard
                      result={{
                        id: selectedCallDetails.id,
                        callId: selectedCallDetails.id,
                        recordingUrl: selectedCallDetails.recordingUrl,
                        transcript: selectedCallDetails.transcript,
                        duration: selectedCallDetails.durationSeconds ?? selectedCallDetails.duration,
                        phoneNumber: selectedCallDetails.phoneNumber,
                        contactName: selectedCallDetails.metadata?.contactName
                      }}
                      summary={selectedCallDetails.summary}
                      onNewCall={handleCloseDrawer}
                      onRefresh={handleRefreshDrawerDetails}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                      <div className="w-12 h-12 rounded-full border-2 border-red-500/30 flex items-center justify-center mb-3">
                        <div className="w-6 h-0.5 bg-red-500/50 rotate-45 absolute" />
                        <div className="w-6 h-0.5 bg-red-500/50 -rotate-45 absolute" />
                      </div>
                      <p className="text-sm">Details konnten nicht geladen werden</p>
                      <button
                        onClick={handleRefreshDrawerDetails}
                        className="mt-3 text-xs px-4 py-2 rounded-[10px] font-medium transition-all hover:scale-[1.02]"
                        style={{ background: 'rgba(255,106,0,0.12)', color: DT.orange, border: '1px solid rgba(255,106,0,0.25)' }}
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  )}
                </div>
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
