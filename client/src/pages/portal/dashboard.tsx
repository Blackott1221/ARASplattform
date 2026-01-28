/**
 * ============================================================================
 * ARAS CLIENT PORTAL - Premium Dashboard
 * ============================================================================
 * STEP 2: ARAS Intelligence Analysis (on-demand, cached)
 * STEP 3: Premium Experience (animated gradients, KPI filters, typing)
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Building2, User, Mail, MapPin, FileText, Phone, Clock, 
  ChevronRight, X, Play, Pause, Volume2, VolumeX,
  LogOut, RefreshCw, Search, Loader2, Copy, Info,
  MessageSquare, Mic, CheckCircle, XCircle, AlertCircle,
  Sparkles, TrendingUp, Zap, Target, BarChart3,
  FileDown, Activity, ChevronDown, AlertTriangle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

interface PortalBranding {
  mode: 'white_label' | 'co_branded';
  productName: string;
  showPoweredBy: boolean;
  accent: string;
  locationLabel?: string;
  supportLabel?: string;
  supportEmail?: string;
}

interface PortalCopy {
  welcomeTitle: string;
  welcomeSubtitle: string;
  packageExplainer: string;
  signalExplainerShort: string;
  signalExplainerLong: string;
  privacyNoteShort: string;
}

interface PortalInfoHints {
  signalScore: string;
  nextBestAction: string;
  riskFlags: string;
  exportCsv: string;
  pdfReport: string;
  autoAnalyze: string;
  insights: string;
  companyCard: string;
  packageCard: string;
}

interface PortalSession {
  portalKey: string;
  displayName: string;
  role: string;
  company: {
    name: string;
    ceo: string;
    email: string;
    addressLine: string;
    zipCity: string;
    vatId: string;
  };
  package: {
    includedCalls: number;
    label: string;
    notes: string;
  };
  ui: {
    portalTitle: string;
    tooltipMode: string;
    kpiFocus: string;
    branding: PortalBranding;
    copy: PortalCopy;
    infoHints: PortalInfoHints;
  };
}

interface CallStats {
  totalCalls: number;
  includedCalls: number;
  remainingCalls: number;
  usagePercent: number;
}

interface CallItem {
  id: number;
  startedAt: string;
  durationSec: number | null;
  to: string;
  contactName: string | null;
  status: string;
  outcome: string | null;
  hasTranscript: boolean;
  hasRecording: boolean;
  signalScore?: number | null;
  hasAnalysis?: boolean;
}

// ARAS Intelligence Analysis v1
interface AnalysisV1 {
  version: string;
  signalScore: number;
  confidence: number;
  intent: string;
  sentiment: string;
  keyMoments: Array<{ tSec: number; title: string; why: string }>;
  objections: Array<{ type: string; quote?: string; response: string }>;
  nextBestAction: string;
  followUpDraft: string;
  riskFlags: string[];
  generatedAt: string;
  transcriptHash: string;
}

type KPIFilter = 'all' | 'connected' | 'completed' | 'high_signal';

const HIGH_SIGNAL_THRESHOLD = 70;

// Insights API response type
interface InsightsData {
  range: string;
  totals: {
    total: number;
    completed: number;
    failed: number;
    initiated: number;
    avgDurationSec: number;
    sentiment: { positive: number; neutral: number; negative: number; mixed: number };
    analyzedCount: number;
    highSignalCount: number;
  };
  series: Array<{ date: string; total: number; completed: number; failed: number; highSignal: number; analyzed: number }>;
}

interface CallDetail {
  id: number;
  overview: {
    startedAt: string;
    updatedAt: string;
    durationSec: number | null;
    to: string;
    contactName: string | null;
    status: string;
    outcome: string | null;
  };
  transcript: string | null;
  summary: string | null;
  recordingUrl: string | null;
  analysis: {
    sentiment: string | null;
    nextStep: string | null;
    purpose: string | null;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return '#22c55e';
    case 'failed':
    case 'error':
      return '#ef4444';
    case 'initiated':
    case 'in_progress':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}

function getStatusIcon(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return <CheckCircle className="w-4 h-4" />;
    case 'failed':
    case 'error':
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
}

function getSignalColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#FE9100';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getIntentLabel(intent: string): string {
  const labels: Record<string, string> = {
    info: 'Information',
    appointment: 'Terminwunsch',
    objection: 'Einwand',
    not_interested: 'Kein Interesse',
    follow_up: 'Follow-up',
    unclear: 'Unklar'
  };
  return labels[intent] || intent;
}

function getSentimentLabel(sentiment: string): string {
  const labels: Record<string, string> = {
    positive: 'Positiv',
    neutral: 'Neutral',
    negative: 'Negativ',
    mixed: 'Gemischt'
  };
  return labels[sentiment] || sentiment;
}

// ============================================================================
// PREFERS REDUCED MOTION HOOK (portal-scope)
// ============================================================================

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReducedMotion;
}

// ============================================================================
// TYPING TEXT COMPONENT (reduced-motion aware)
// ============================================================================

function TypingText({ 
  text, 
  speed = 20, 
  onComplete,
  className = ''
}: { 
  text: string; 
  speed?: number; 
  onComplete?: () => void;
  className?: string;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const prefersReduced = usePrefersReducedMotion();
  
  useEffect(() => {
    if (prefersReduced) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, 1000 / speed);
    
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);
  
  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-[#FE9100] ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

// ============================================================================
// SIGNAL GAUGE COMPONENT
// ============================================================================

function SignalGauge({ score, size = 'normal' }: { score: number; size?: 'normal' | 'small' }) {
  const dimension = size === 'small' ? 80 : 120;
  const strokeWidth = size === 'small' ? 6 : 8;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: dimension, height: dimension }}>
      <svg width={dimension} height={dimension} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={getSignalColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="font-bold"
          style={{ 
            fontSize: size === 'small' ? '20px' : '32px',
            color: getSignalColor(score)
          }}
        >
          {score}
        </span>
        <span 
          className="uppercase tracking-[0.16em] text-white/40"
          style={{ fontSize: size === 'small' ? '8px' : '11px' }}
        >
          Signal
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// TOAST COMPONENT
// ============================================================================

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 1600);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-[60] px-4 py-3 rounded-[14px] text-sm text-white/90 animate-in slide-in-from-bottom-2 fade-in duration-200"
      style={{
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)'
      }}
    >
      {message}
    </div>
  );
}

// ============================================================================
// INFO TIP COMPONENT
// ============================================================================

function InfoTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
          <Info className="w-3.5 h-3.5 text-white/30" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[320px]">
        <p className="text-sm leading-relaxed">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// SPARKLINE COMPONENT (SVG, no lib)
// ============================================================================

function Sparkline({ 
  data, 
  height = 44, 
  className = '' 
}: { 
  data: number[]; 
  height?: number; 
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  
  if (!data || data.length < 2) {
    return <div className={className} style={{ height }} />;
  }
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  // Create path points
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  
  const pathD = `M ${points.join(' L ')}`;
  
  return (
    <svg 
      viewBox={`0 0 100 ${height}`} 
      preserveAspectRatio="none"
      className={className}
      style={{ width: '100%', height }}
    >
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: 0.6,
          strokeDasharray: prefersReduced ? 'none' : '200',
          strokeDashoffset: prefersReduced ? '0' : '200',
          animation: prefersReduced ? 'none' : 'sparklineDraw 1s ease-out forwards'
        }}
      />
      <style>{`
        @keyframes sparklineDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

// ============================================================================
// AUTO-ANALYZE TOGGLE HELPERS
// ============================================================================

function getAutoAnalyze(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('portal.autoAnalyze') === 'true';
}

function setAutoAnalyze(value: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('portal.autoAnalyze', value ? 'true' : 'false');
}

// ============================================================================
// CALL DETAIL DRAWER
// ============================================================================

function CallDetailDrawer({ 
  callId, 
  onClose,
  portalKey,
  onAnalysisComplete
}: { 
  callId: number; 
  onClose: () => void;
  portalKey: string;
  onAnalysisComplete?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hasAnimatedAnalysis, setHasAnimatedAnalysis] = useState(false);
  const [autoAnalyzeEnabled, setAutoAnalyzeEnabled] = useState(getAutoAnalyze);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Fetch call details
  const { data: call, isLoading } = useQuery<CallDetail>({
    queryKey: ['portal-call', callId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/calls/${callId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch call');
      return res.json();
    }
  });
  
  // Fetch cached analysis
  const { data: analysisData, refetch: refetchAnalysis } = useQuery<{ analysis: AnalysisV1; cached: boolean }>({
    queryKey: ['portal-analysis', callId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/calls/${callId}/analysis`, {
        credentials: 'include'
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!call
  });
  
  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/portal/calls/${callId}/analyze`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Analysis failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['portal-analysis', callId], data);
      setHasAnimatedAnalysis(false); // Enable typing animation for new analysis
      onAnalysisComplete?.();
    }
  });
  
  const analysis = analysisData?.analysis;
  
  // Auto-analyze on open (if enabled and no cached analysis)
  useEffect(() => {
    if (autoAnalyzeEnabled && call && !analysis && !analyzeMutation.isPending) {
      analyzeMutation.mutate();
    }
  }, [autoAnalyzeEnabled, call, analysis, analyzeMutation]);
  
  // Toggle auto-analyze (persist to localStorage)
  const handleToggleAutoAnalyze = useCallback(() => {
    const newValue = !autoAnalyzeEnabled;
    setAutoAnalyzeEnabled(newValue);
    setAutoAnalyze(newValue);
  }, [autoAnalyzeEnabled]);
  
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  // Audio controls
  const togglePlay = useCallback(() => {
    if (!audioRef) return;
    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play();
    }
    setIsPlaying(!isPlaying);
  }, [audioRef, isPlaying]);
  
  const toggleMute = useCallback(() => {
    if (!audioRef) return;
    audioRef.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [audioRef, isMuted]);
  
  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToast(`${label} kopiert`);
  }, []);
  
  // Scroll to key moment position in transcript
  const scrollToMoment = useCallback((tSec: number) => {
    if (!transcriptRef.current || !call?.transcript) return;
    const container = transcriptRef.current;
    const totalDuration = call.overview.durationSec || 1;
    const scrollRatio = tSec / totalDuration;
    const scrollPosition = container.scrollHeight * scrollRatio;
    container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
  }, [call]);
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className="fixed top-0 right-0 h-full w-full md:w-[600px] z-50 overflow-y-auto"
        style={{
          background: 'rgba(15,15,15,0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div 
          className="sticky top-0 flex items-center justify-between p-4 border-b border-white/5 backdrop-blur-xl"
          style={{ background: 'rgba(15,15,15,0.9)' }}
        >
          <h2 className="font-orbitron text-lg font-semibold text-white">
            Call Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#FE9100] animate-spin" />
            </div>
          ) : call ? (
            <>
              {/* Overview */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <div className="text-xs text-white/40 mb-1">Contact</div>
                    <div className="text-white font-medium">
                      {call.overview.contactName || call.overview.to}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <div className="text-xs text-white/40 mb-1">Duration</div>
                    <div className="text-white font-medium">
                      {formatDuration(call.overview.durationSec)}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <div className="text-xs text-white/40 mb-1">Date</div>
                    <div className="text-white font-medium text-sm">
                      {formatDate(call.overview.startedAt)}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <div className="text-xs text-white/40 mb-1">Status</div>
                    <div 
                      className="flex items-center gap-2 font-medium"
                      style={{ color: getStatusColor(call.overview.status) }}
                    >
                      {getStatusIcon(call.overview.status)}
                      <span className="capitalize">{call.overview.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recording Player */}
              {call.recordingUrl && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">
                    Recording
                  </h3>
                  <div 
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: 'rgba(254,145,0,0.1)', border: '1px solid rgba(254,145,0,0.2)' }}
                  >
                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 flex items-center justify-center rounded-full bg-[#FE9100] text-white transition-transform hover:scale-105"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="text-sm text-white/80">Audio Recording</div>
                      <div className="text-xs text-white/40">
                        {formatDuration(call.overview.durationSec)}
                      </div>
                    </div>
                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white/40" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white/60" />
                      )}
                    </button>
                    <audio
                      ref={setAudioRef}
                      src={call.recordingUrl}
                      onEnded={() => setIsPlaying(false)}
                      preload="metadata"
                    />
                  </div>
                </div>
              )}
              
              {/* Summary */}
              {call.summary && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">
                    Summary
                  </h3>
                  <div className="p-4 rounded-xl bg-white/5 text-white/80 text-sm leading-relaxed">
                    {call.summary}
                  </div>
                </div>
              )}
              
              {/* Transcript */}
              {call.transcript && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">
                    Transcript
                  </h3>
                  <div 
                    ref={transcriptRef}
                    className="p-4 rounded-[14px] bg-white/5 text-white/70 text-sm leading-[1.65] max-h-[320px] overflow-y-auto"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {call.transcript}
                  </div>
                </div>
              )}
              
              {/* ARAS Intelligence Analysis */}
              <div 
                className="p-4 rounded-2xl space-y-4"
                style={{
                  background: 'rgba(20,20,20,0.8)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-orbitron text-sm font-semibold uppercase tracking-[0.08em] text-white">
                    ARAS Intelligence
                  </h3>
                  <InfoTip content="Automatische Analyse des Gesprächsverlaufs mit Signal Score, Einwänden und nächsten Schritten." />
                </div>
                
                {/* Analysis States */}
                {analyzeMutation.isPending ? (
                  // Loading state
                  <div className="py-8 text-center">
                    <div className="inline-flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-[#FE9100] animate-spin" />
                      <span className="text-white/60 text-sm">Analyse wird erstellt...</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 bg-white/5 rounded animate-pulse" />
                      <div className="h-3 bg-white/5 rounded animate-pulse w-4/5" />
                      <div className="h-3 bg-white/5 rounded animate-pulse w-3/5" />
                    </div>
                  </div>
                ) : analyzeMutation.isError ? (
                  // Error state
                  <div className="py-6 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-white/60 text-sm mb-4">{analyzeMutation.error?.message || 'Analyse fehlgeschlagen'}</p>
                    <button
                      onClick={() => analyzeMutation.mutate()}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition-colors"
                    >
                      Nochmal versuchen
                    </button>
                  </div>
                ) : analysis ? (
                  // Analysis result
                  <div className="space-y-5">
                    {/* Top row: Signal + Chips */}
                    <div className="flex items-start gap-6">
                      <SignalGauge score={analysis.signalScore} />
                      <div className="flex-1 space-y-3">
                        {/* Intent & Sentiment badges */}
                        <div className="flex flex-wrap gap-2">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(254,145,0,0.15)', color: '#FE9100' }}
                          >
                            {getIntentLabel(analysis.intent)}
                          </span>
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              background: analysis.sentiment === 'positive' ? 'rgba(34,197,94,0.15)' : 
                                         analysis.sentiment === 'negative' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)',
                              color: analysis.sentiment === 'positive' ? '#22c55e' : 
                                     analysis.sentiment === 'negative' ? '#ef4444' : 'rgba(255,255,255,0.7)'
                            }}
                          >
                            {getSentimentLabel(analysis.sentiment)}
                          </span>
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                          >
                            {Math.round(analysis.confidence * 100)}% Confidence
                          </span>
                        </div>
                        
                        {/* Risk flags */}
                        {analysis.riskFlags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.riskFlags.map((flag, i) => (
                              <span 
                                key={i}
                                className="px-2 py-0.5 rounded text-xs"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}
                              >
                                ⚠ {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Next Best Action */}
                    <div className="p-3 rounded-xl bg-[#FE9100]/10 border border-[#FE9100]/20">
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-[#FE9100] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs text-[#FE9100] font-medium mb-1">Nächster Schritt</div>
                          <div className="text-sm text-white/90">
                            {!hasAnimatedAnalysis && !analysisData?.cached ? (
                              <TypingText 
                                text={analysis.nextBestAction} 
                                onComplete={() => setHasAnimatedAnalysis(true)}
                              />
                            ) : (
                              analysis.nextBestAction
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Key Moments */}
                    {analysis.keyMoments.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-white/40 uppercase tracking-wider">Key Moments</div>
                        <div className="space-y-2">
                          {analysis.keyMoments.map((moment, i) => (
                            <button
                              key={i}
                              onClick={() => scrollToMoment(moment.tSec)}
                              className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors group"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-[#FE9100] font-mono">
                                  {formatDuration(moment.tSec)}
                                </span>
                                <span className="text-sm text-white/90 font-medium">
                                  {moment.title}
                                </span>
                              </div>
                              <p className="text-xs text-white/50">{moment.why}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Objections */}
                    {analysis.objections.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-white/40 uppercase tracking-wider">Einwände & Antworten</div>
                        <div className="space-y-2">
                          {analysis.objections.map((obj, i) => (
                            <div key={i} className="p-3 rounded-xl bg-white/5">
                              <div className="text-xs text-red-400 font-medium mb-1">{obj.type}</div>
                              {obj.quote && (
                                <p className="text-xs text-white/50 italic mb-2">"{obj.quote}"</p>
                              )}
                              <p className="text-sm text-white/80">{obj.response}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Follow-up Draft */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-white/40 uppercase tracking-wider">Follow-up Vorlage</div>
                        <button
                          onClick={() => copyToClipboard(analysis.followUpDraft, 'Follow-up')}
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                          title="Kopieren"
                        >
                          <Copy className="w-4 h-4 text-white/40" />
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 text-sm text-white/80 leading-relaxed">
                        {analysis.followUpDraft}
                      </div>
                    </div>
                  </div>
                ) : (
                  // No analysis - show button
                  <div className="py-6 text-center">
                    <Sparkles className="w-8 h-8 text-[#FE9100]/50 mx-auto mb-3" />
                    <p className="text-white/50 text-sm mb-4">
                      Erstelle eine detaillierte Analyse mit Signal Score, Einwänden und nächsten Schritten.
                    </p>
                    <button
                      onClick={() => analyzeMutation.mutate()}
                      disabled={!call.transcript}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #FE9100 0%, #FF6B00 100%)',
                        boxShadow: '0 4px 20px rgba(254,145,0,0.3)'
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Analyse starten
                      </span>
                    </button>
                    {!call.transcript && (
                      <p className="text-xs text-white/30 mt-2">Transcript erforderlich</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-white/40">
              Call not found
            </div>
          )}
        </div>
      </div>
      
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function PortalDashboard() {
  const { portalKey } = useParams<{ portalKey: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<KPIFilter>('all');
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  
  // Fetch session/config
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery<PortalSession>({
    queryKey: ['portal-session', portalKey],
    queryFn: async () => {
      const res = await fetch('/api/portal/me', { credentials: 'include' });
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      if (!res.ok) throw new Error('Failed to fetch session');
      return res.json();
    },
    retry: false
  });
  
  // Fetch call stats
  const { data: stats } = useQuery<CallStats>({
    queryKey: ['portal-stats', portalKey],
    queryFn: async () => {
      const res = await fetch('/api/portal/calls/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!session
  });
  
  // Fetch calls list
  const { data: callsData, isLoading: callsLoading, refetch: refetchCalls } = useQuery<{ items: CallItem[]; nextCursor: string | null }>({
    queryKey: ['portal-calls', portalKey, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (searchQuery) params.set('q', searchQuery);
      const res = await fetch(`/api/portal/calls?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch calls');
      return res.json();
    },
    enabled: !!session
  });
  
  // Fetch insights (14 day trends)
  const { data: insights } = useQuery<InsightsData>({
    queryKey: ['portal-insights', portalKey],
    queryFn: async () => {
      const res = await fetch('/api/portal/calls/insights?range=14d', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch insights');
      return res.json();
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000 // 5 min cache
  });
  
  // CSV Export handler
  const handleExportCSV = useCallback(() => {
    const params = new URLSearchParams({ range: '14d' });
    if (activeFilter === 'completed') params.set('status', 'completed');
    if (searchQuery) params.set('q', searchQuery);
    window.open(`/api/portal/calls/export.csv?${params}`, '_blank');
  }, [activeFilter, searchQuery]);
  
  // PDF Report handler
  const handleOpenReport = useCallback(() => {
    const params = new URLSearchParams({ range: '14d' });
    if (activeFilter === 'completed') params.set('status', 'completed');
    if (activeFilter === 'high_signal') params.set('highSignal', '1');
    if (searchQuery) params.set('q', searchQuery);
    window.open(`/portal/${portalKey}/report?${params}`, '_blank');
  }, [portalKey, activeFilter, searchQuery]);
  
  // Fetch audit log
  const { data: auditData } = useQuery<{ entries: Array<{ ts: string; action: string; metaSafe: { callId?: number } }> }>({
    queryKey: ['portal-audit', portalKey],
    queryFn: async () => {
      const res = await fetch('/api/portal/audit?limit=50', { credentials: 'include' });
      if (!res.ok) return { entries: [] };
      return res.json();
    },
    enabled: !!session,
    staleTime: 30 * 1000 // 30 sec cache
  });
  
  // Filter calls based on active KPI filter
  const filteredCalls = useMemo(() => {
    if (!callsData?.items) return [];
    
    switch (activeFilter) {
      case 'connected':
        return callsData.items.filter(c => 
          ['initiated', 'completed', 'in_progress'].includes(c.status?.toLowerCase())
        );
      case 'completed':
        return callsData.items.filter(c => 
          ['completed', 'done'].includes(c.status?.toLowerCase())
        );
      case 'high_signal':
        return callsData.items.filter(c => 
          c.signalScore && c.signalScore >= HIGH_SIGNAL_THRESHOLD
        );
      default:
        return callsData.items;
    }
  }, [callsData?.items, activeFilter]);
  
  // Calculate KPI stats
  const kpiStats = useMemo(() => {
    if (!callsData?.items) return null;
    const items = callsData.items;
    
    const connected = items.filter(c => 
      ['initiated', 'completed', 'in_progress'].includes(c.status?.toLowerCase())
    ).length;
    
    const completed = items.filter(c => 
      ['completed', 'done'].includes(c.status?.toLowerCase())
    ).length;
    
    const highSignal = items.filter(c => 
      c.signalScore && c.signalScore >= HIGH_SIGNAL_THRESHOLD
    ).length;
    
    const analyzedCount = items.filter(c => c.hasAnalysis).length;
    
    return { connected, completed, highSignal, analyzedCount };
  }, [callsData?.items]);
  
  // Handle unauthorized - redirect to login
  useEffect(() => {
    if (sessionError?.message === 'UNAUTHORIZED') {
      setLocation(`/portal/${portalKey}/login`);
    }
  }, [sessionError, portalKey, setLocation]);
  
  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/portal/logout', { 
      method: 'POST', 
      credentials: 'include' 
    });
    setLocation(`/portal/${portalKey}/login`);
  };
  
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/40">
        <Loader2 className="w-10 h-10 text-[#FE9100] animate-spin" />
      </div>
    );
  }
  
  if (!session) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-black/40 relative overflow-hidden">
      {/* Animated Gradient Background (STEP 3) */}
      <div 
        className="absolute pointer-events-none"
        style={{
          inset: '-120px -120px auto -120px',
          height: '340px',
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(254,145,0,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 30%, rgba(255,107,0,0.08) 0%, transparent 45%),
            linear-gradient(180deg, rgba(254,145,0,0.06) 0%, transparent 60%)
          `,
          opacity: 0.28,
          animation: reducedMotion ? 'none' : 'gradientShift 8s ease-in-out infinite alternate',
        }}
      />
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
      
      {/* Header (STEP 6 — White-Label Branding) */}
      <header 
        className="sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl"
        style={{ background: 'rgba(10,10,10,0.8)' }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 
                className="text-[22px] font-bold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em' }}
              >
                {session.ui.branding?.productName || session.ui.portalTitle}
              </h1>
              <p className="text-[14px] text-white/60 hidden sm:block">
                {session.ui.copy?.welcomeSubtitle || 'Command Center'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Activity Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowActivityDrawer(true)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white relative"
                  >
                    <Activity className="w-5 h-5" />
                    {auditData && auditData.entries.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FE9100]" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Aktivitätsprotokoll</p>
                </TooltipContent>
              </Tooltip>
              
              {/* User Chip */}
              <div 
                className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full h-[32px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="w-6 h-6 rounded-full bg-[#FE9100]/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-[#FE9100]" />
                </div>
                <div className="text-right">
                  <span className="text-sm text-white font-medium">{session.displayName}</span>
                  <span className="text-white/30 mx-1">·</span>
                  <span className="text-xs text-white/40">{session.role}</span>
                </div>
              </div>
              
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                title="Abmelden"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Powered by (optional) */}
          {session.ui.branding?.showPoweredBy && (
            <div className="pb-2 text-center">
              <span className="text-[10px] text-white/30">Powered by ARAS AI</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        
        {/* Insights Panel (STEP 5) */}
        {insights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Performance Card */}
            <div 
              className="p-5 rounded-2xl"
              style={{
                background: 'rgba(20,20,20,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white/60">Performance (14 days)</h3>
                <BarChart3 className="w-4 h-4 text-[#FE9100]" />
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-white/60">{insights.totals.completed} completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-white/60">{insights.totals.failed} failed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#FE9100]" />
                  <span className="text-xs text-white/60">{insights.totals.highSignalCount} high signal</span>
                </div>
              </div>
              <Sparkline 
                data={insights.series.map(s => s.total)} 
                height={36}
                className="text-[#FE9100]"
              />
            </div>
            
            {/* Quality Card */}
            <div 
              className="p-5 rounded-2xl"
              style={{
                background: 'rgba(20,20,20,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white/60">Quality</h3>
                <Target className="w-4 h-4 text-blue-400" />
              </div>
              <div className="space-y-2">
                {/* Sentiment bars */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 w-16">Sentiment</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden flex">
                    {insights.totals.sentiment.positive > 0 && (
                      <div 
                        className="h-full bg-green-400" 
                        style={{ width: `${(insights.totals.sentiment.positive / insights.totals.total) * 100}%` }}
                      />
                    )}
                    {insights.totals.sentiment.neutral > 0 && (
                      <div 
                        className="h-full bg-white/30" 
                        style={{ width: `${(insights.totals.sentiment.neutral / insights.totals.total) * 100}%` }}
                      />
                    )}
                    {insights.totals.sentiment.negative > 0 && (
                      <div 
                        className="h-full bg-red-400" 
                        style={{ width: `${(insights.totals.sentiment.negative / insights.totals.total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
                {/* Analyzed bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 w-16">Analyzed</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full bg-[#FE9100]" 
                      style={{ width: `${insights.totals.total > 0 ? (insights.totals.analyzedCount / insights.totals.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">{insights.totals.analyzedCount}/{insights.totals.total}</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/40">
                Avg duration: {Math.floor(insights.totals.avgDurationSec / 60)}:{(insights.totals.avgDurationSec % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        )}
        
        {/* KPI Row (STEP 3) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Calls Used */}
          <button
            onClick={() => setActiveFilter('all')}
            className="group p-[18px] rounded-[20px] text-left transition-all duration-200"
            style={{
              minHeight: '112px',
              background: activeFilter === 'all' ? 'rgba(254,145,0,0.1)' : 'rgba(20,20,20,0.6)',
              border: activeFilter === 'all' ? '1px solid rgba(254,145,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => { if (!reducedMotion) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div className="flex items-start justify-between mb-2">
              <Phone className="w-5 h-5 text-[#FE9100]" />
              <InfoTip content="Jeder abgeschlossene Call zählt gegen das Kontingent von 2.000 Calls." />
            </div>
            <div className="text-[28px] font-bold text-white mb-1">
              {stats?.totalCalls ?? '—'}<span className="text-white/40 text-lg">/{stats?.includedCalls ?? 2000}</span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Calls Used</div>
            {stats && (
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${Math.min(stats.usagePercent, 100)}%`,
                    background: 'linear-gradient(90deg, #FE9100, #FF6B00)'
                  }}
                />
              </div>
            )}
          </button>
          
          {/* Connected */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'connected' ? 'all' : 'connected')}
            className="group p-[18px] rounded-[20px] text-left transition-all duration-200"
            style={{
              minHeight: '112px',
              background: activeFilter === 'connected' ? 'rgba(254,145,0,0.1)' : 'rgba(20,20,20,0.6)',
              border: activeFilter === 'connected' ? '1px solid rgba(254,145,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
            }}
            onMouseEnter={(e) => { if (!reducedMotion) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div className="flex items-start justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <InfoTip content="Calls die verbunden wurden (initiated, in progress, completed)." />
            </div>
            <div className="text-[28px] font-bold text-white mb-1">{kpiStats?.connected ?? '—'}</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Connected</div>
          </button>
          
          {/* Completed */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'completed' ? 'all' : 'completed')}
            className="group p-[18px] rounded-[20px] text-left transition-all duration-200"
            style={{
              minHeight: '112px',
              background: activeFilter === 'completed' ? 'rgba(254,145,0,0.1)' : 'rgba(20,20,20,0.6)',
              border: activeFilter === 'completed' ? '1px solid rgba(254,145,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
            }}
            onMouseEnter={(e) => { if (!reducedMotion) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div className="flex items-start justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <InfoTip content="Erfolgreich abgeschlossene Calls mit vollständigem Transcript." />
            </div>
            <div className="text-[28px] font-bold text-white mb-1">{kpiStats?.completed ?? '—'}</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">Completed</div>
          </button>
          
          {/* High Signal */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'high_signal' ? 'all' : 'high_signal')}
            className="group p-[18px] rounded-[20px] text-left transition-all duration-200"
            style={{
              minHeight: '112px',
              background: activeFilter === 'high_signal' ? 'rgba(254,145,0,0.1)' : 'rgba(20,20,20,0.6)',
              border: activeFilter === 'high_signal' ? '1px solid rgba(254,145,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
            }}
            onMouseEnter={(e) => { if (!reducedMotion) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div className="flex items-start justify-between mb-2">
              <Zap className="w-5 h-5 text-[#FE9100]" />
              <InfoTip content={`Signal Score ≥${HIGH_SIGNAL_THRESHOLD} zeigt hohe Abschlusswahrscheinlichkeit. Analyse im Call-Detail starten.`} />
            </div>
            <div className="text-[28px] font-bold text-white mb-1">
              {kpiStats?.highSignal ?? '—'}
              {kpiStats && kpiStats.analyzedCount < (callsData?.items?.length || 0) && (
                <span className="text-white/30 text-sm ml-1">?</span>
              )}
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">High Signal (≥{HIGH_SIGNAL_THRESHOLD})</div>
          </button>
        </div>
        
        {/* Active Filter Pill */}
        {activeFilter !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <span 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              style={{ background: 'rgba(254,145,0,0.15)', color: '#FE9100' }}
            >
              Filter: {activeFilter === 'connected' ? 'Connected' : activeFilter === 'completed' ? 'Completed' : 'High Signal'}
              <button 
                onClick={() => setActiveFilter('all')}
                className="hover:bg-white/10 rounded-full p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
            <span className="text-sm text-white/40">{filteredCalls.length} Ergebnisse</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Company & Package */}
          <div className="space-y-6">
            
            {/* Company Card */}
            <div 
              className="p-6 rounded-2xl"
              style={{
                background: 'rgba(20,20,20,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(254,145,0,0.15)' }}
                >
                  <Building2 className="w-5 h-5 text-[#FE9100]" />
                </div>
                <h2 className="font-semibold text-white">{session.company.name}</h2>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-white/30 mt-0.5" />
                  <div>
                    <div className="text-white/40 text-xs">Geschäftsführer</div>
                    <div className="text-white/80">{session.company.ceo}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-white/30 mt-0.5" />
                  <div>
                    <div className="text-white/40 text-xs">E-Mail</div>
                    <div className="text-white/80">{session.company.email}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-white/30 mt-0.5" />
                  <div>
                    <div className="text-white/40 text-xs">Adresse</div>
                    <div className="text-white/80">
                      {session.company.addressLine}<br />
                      {session.company.zipCity}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-white/30 mt-0.5" />
                  <div>
                    <div className="text-white/40 text-xs">USt-IdNr.</div>
                    <div className="text-white/80">{session.company.vatId}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Package Card */}
            <div 
              className="p-6 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(254,145,0,0.1) 0%, rgba(254,145,0,0.02) 100%)',
                border: '1px solid rgba(254,145,0,0.2)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">{session.package.label}</h2>
                <Phone className="w-5 h-5 text-[#FE9100]" />
              </div>
              
              {stats && (
                <>
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Used</span>
                      <span className="text-white font-medium">
                        {stats.totalCalls} / {stats.includedCalls}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(stats.usagePercent, 100)}%`,
                          background: stats.usagePercent > 90 
                            ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                            : 'linear-gradient(90deg, #FE9100, #FF6B00)'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <div className="text-2xl font-bold text-white">{stats.remainingCalls}</div>
                      <div className="text-xs text-white/40">Remaining</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <div className="text-2xl font-bold text-[#FE9100]">{stats.usagePercent}%</div>
                      <div className="text-xs text-white/40">Used</div>
                    </div>
                  </div>
                </>
              )}
              
              <p className="mt-4 text-xs text-white/40 leading-relaxed">
                {session.package.notes}
              </p>
            </div>
          </div>
          
          {/* Right Column - Calls Table */}
          <div className="lg:col-span-2">
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(20,20,20,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Table Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
                <h2 className="font-semibold text-white">Calls</h2>
                
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="h-9 pl-9 pr-4 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        width: '200px'
                      }}
                    />
                  </div>
                  
                  {/* Export CSV */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleExportCSV}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[320px]">
                      <p className="text-xs">{session.ui.infoHints?.exportCsv || 'Exportiert alle gefilterten Calls als CSV-Datei.'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* PDF Report (STEP 7) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleOpenReport}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[320px]">
                      <p className="text-xs">{session.ui.infoHints?.pdfReport || 'Öffnet einen druckoptimierten Report. Im Druckdialog "Als PDF speichern" wählen.'}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Refresh */}
                  <button
                    onClick={() => refetchCalls()}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-white/40 border-b border-white/5">
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">To</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1">
                          Signal
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-white/20" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Signal Score zeigt Abschlusswahrscheinlichkeit. Analyse im Detail starten.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-medium">Artifacts</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {callsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <Loader2 className="w-6 h-6 text-[#FE9100] animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredCalls.length > 0 ? (
                      filteredCalls.map((call) => (
                        <tr 
                          key={call.id}
                          onClick={() => setSelectedCallId(call.id)}
                          className="border-b border-white/5 cursor-pointer transition-colors hover:bg-white/[0.04] group"
                          style={{ height: '52px' }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: '#FE9100' }}
                              />
                              <div>
                                <div className="text-sm text-white/80">
                                  {formatDate(call.startedAt)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-white/80">
                              {call.contactName || call.to}
                            </div>
                            {call.contactName && (
                              <div className="text-xs text-white/40">{call.to}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-white/60">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDuration(call.durationSec)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                background: `${getStatusColor(call.status)}15`,
                                color: getStatusColor(call.status)
                              }}
                            >
                              {getStatusIcon(call.status)}
                              <span className="capitalize">{call.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {call.signalScore != null ? (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                                style={{ 
                                  background: `${getSignalColor(call.signalScore)}15`,
                                  color: getSignalColor(call.signalScore)
                                }}
                              >
                                <BarChart3 className="w-3 h-3" />
                                {call.signalScore}
                              </span>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="text-white/30 text-sm">—</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Analyse im Call-Detail starten</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {call.hasTranscript && (
                                <div 
                                  className="w-6 h-6 rounded-md flex items-center justify-center"
                                  style={{ background: 'rgba(255,255,255,0.05)' }}
                                  title="Transcript"
                                >
                                  <MessageSquare className="w-3 h-3 text-white/40" />
                                </div>
                              )}
                              {call.hasRecording && (
                                <div 
                                  className="w-6 h-6 rounded-md flex items-center justify-center"
                                  style={{ background: 'rgba(255,255,255,0.05)' }}
                                  title="Recording"
                                >
                                  <Mic className="w-3 h-3 text-white/40" />
                                </div>
                              )}
                              {call.hasAnalysis && (
                                <div 
                                  className="w-6 h-6 rounded-md flex items-center justify-center"
                                  style={{ background: 'rgba(254,145,0,0.1)' }}
                                  title="Analysis"
                                >
                                  <Sparkles className="w-3 h-3 text-[#FE9100]" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-white/40">
                          {activeFilter !== 'all' ? 'Keine Calls mit diesem Filter' : 'Keine Calls gefunden'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Call Detail Drawer */}
      {selectedCallId && (
        <CallDetailDrawer
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
          portalKey={portalKey || ''}
          onAnalysisComplete={() => refetchCalls()}
        />
      )}
      
      {/* Activity Drawer (STEP 7) */}
      {showActivityDrawer && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setShowActivityDrawer(false)}
          />
          <div 
            className="fixed top-0 right-0 h-full w-full md:w-[380px] z-50 overflow-y-auto"
            style={{
              background: 'rgba(15,15,15,0.98)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-10px 0 40px rgba(0,0,0,0.4)'
            }}
          >
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/5 backdrop-blur-xl" style={{ background: 'rgba(15,15,15,0.9)' }}>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#FE9100]" />
                <h2 className="font-semibold text-white">Aktivität</h2>
              </div>
              <button
                onClick={() => setShowActivityDrawer(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              {auditData?.entries && auditData.entries.length > 0 ? (
                auditData.entries.map((entry, idx) => {
                  const actionLabels: Record<string, string> = {
                    'portal.login': 'Login',
                    'portal.logout': 'Logout',
                    'portal.export.csv': 'Export (CSV)',
                    'portal.export.pdf': 'Report (PDF)',
                    'portal.analyze.start': 'Analyse gestartet',
                    'portal.analyze.success': 'Analyse erstellt',
                    'portal.analyze.fail': 'Analyse fehlgeschlagen',
                    'portal.call.view': 'Call angesehen'
                  };
                  const label = actionLabels[entry.action] || entry.action;
                  const time = new Date(entry.ts).toLocaleString('de-DE', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  });
                  
                  return (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        {entry.action.includes('login') ? <User className="w-4 h-4 text-green-400" /> :
                         entry.action.includes('export') || entry.action.includes('pdf') ? <FileDown className="w-4 h-4 text-blue-400" /> :
                         entry.action.includes('analyze') ? <Sparkles className="w-4 h-4 text-[#FE9100]" /> :
                         <Activity className="w-4 h-4 text-white/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/90">{label}</div>
                        <div className="text-xs text-white/40">{time}</div>
                      </div>
                      {entry.metaSafe?.callId && (
                        <span className="text-xs text-white/30 font-mono">#{entry.metaSafe.callId}</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-white/40 text-sm">
                  Noch keine Aktivitäten.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
