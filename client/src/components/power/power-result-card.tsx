import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Download, RefreshCw, Loader2, CheckCircle, User, Bot, Sparkles } from 'lucide-react';

const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00'
};

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT NORMALIZER - Handles all possible formats robustly
// ═══════════════════════════════════════════════════════════════
interface TranscriptMessage {
  role: 'user' | 'agent' | 'system';
  text: string;
  ts?: number;
}

interface NormalizedTranscript {
  text: string;                    // Always a clean string
  messages: TranscriptMessage[];   // Parsed messages if available
  isProcessing: boolean;           // True if transcript not yet ready
}

function normalizeTranscript(raw: any): NormalizedTranscript {
  // Case 0: null/undefined/empty
  if (!raw || (typeof raw === 'string' && raw.trim() === '')) {
    return { text: '', messages: [], isProcessing: true };
  }

  // Case 1: Already a clean string
  if (typeof raw === 'string') {
    // Try to parse as JSON first (might be JSON string)
    try {
      const parsed = JSON.parse(raw);
      return normalizeTranscript(parsed); // Recurse with parsed object
    } catch {
      // Not JSON, it's a plain string - clean it up
      const cleaned = raw.trim();
      if (cleaned.length < 10) {
        return { text: cleaned, messages: [], isProcessing: true };
      }
      return { text: cleaned, messages: [], isProcessing: false };
    }
  }

  // Case 2: Array of messages/segments
  if (Array.isArray(raw)) {
    const messages: TranscriptMessage[] = [];
    const textParts: string[] = [];

    for (const item of raw) {
      if (typeof item === 'string') {
        textParts.push(item);
        continue;
      }
      
      // Handle various message formats from different APIs
      const role = item.role || item.speaker || item.type || 'system';
      const text = item.message || item.text || item.content || item.transcript || '';
      
      if (text && typeof text === 'string' && text.trim()) {
        const normalizedRole = 
          role === 'assistant' || role === 'agent' || role === 'ai' || role === 'bot' ? 'agent' :
          role === 'user' || role === 'human' || role === 'customer' ? 'user' : 'system';
        
        messages.push({ role: normalizedRole as any, text: text.trim(), ts: item.timestamp || item.ts });
        
        const label = normalizedRole === 'agent' ? 'ARAS' : normalizedRole === 'user' ? 'Kunde' : 'System';
        textParts.push(`[${label}]: ${text.trim()}`);
      }
    }

    const finalText = textParts.join('\n\n');
    return {
      text: finalText,
      messages,
      isProcessing: finalText.length < 10
    };
  }

  // Case 3: Object with transcript/messages property
  if (typeof raw === 'object') {
    // Check common property names
    const nested = raw.transcript || raw.messages || raw.segments || raw.turns || raw.conversation;
    if (nested) {
      return normalizeTranscript(nested);
    }
    
    // Single message object
    if (raw.text || raw.message || raw.content) {
      const text = raw.text || raw.message || raw.content;
      return { text: String(text), messages: [], isProcessing: false };
    }
    
    // Fallback: stringify but mark as potentially processing
    try {
      const str = JSON.stringify(raw, null, 2);
      return { text: str, messages: [], isProcessing: true };
    } catch {
      return { text: '[Transkript konnte nicht gelesen werden]', messages: [], isProcessing: true };
    }
  }

  return { text: '', messages: [], isProcessing: true };
}

interface CallSummary {
  outcome: string;
  bulletPoints: string[];
  nextStep: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  tags: string[];
}

interface PowerResultCardProps {
  result: {
    id?: string | number;
    callId?: string | number;
    recordingUrl?: string | null;
    transcript?: any;  // Can be string, array, object - we normalize it
    duration?: number | null;
    phoneNumber?: string;
    contactName?: string;
  } | null;
  summary?: CallSummary | null;
  linkedContact?: { id: number; name: string; company?: string } | null;
  onNewCall: () => void;
  onRefresh?: () => void;  // NEW: For refreshing call details
  onLinkToContact?: (phoneNumber: string, contactName?: string) => void;
  onSaveAsNewContact?: (phoneNumber: string, contactName?: string) => void;
}

export function PowerResultCard({
  result,
  summary,
  linkedContact,
  onNewCall,
  onRefresh,
  onLinkToContact,
  onSaveAsNewContact
}: PowerResultCardProps) {
  const [audioError, setAudioError] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Normalize transcript once
  const normalizedTranscript = useMemo(() => 
    normalizeTranscript(result?.transcript), 
    [result?.transcript]
  );

  if (!result) return null;

  // Copy transcript to clipboard
  const handleCopyTranscript = async () => {
    if (!normalizedTranscript.text) return;
    try {
      await navigator.clipboard.writeText(normalizedTranscript.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Download recording via SAFE server endpoint (always same-origin, no CORS issues)
  const handleDownloadRecording = async () => {
    const callId = result.id || result.callId;
    if (!callId) {
      setDownloadError('Keine Call-ID verfügbar');
      return;
    }
    
    setDownloadingAudio(true);
    setDownloadError(null);
    
    try {
      // Use safe download endpoint - server handles CORS/auth/proxy
      const response = await fetch(`/api/aras-voice/call-recording/${callId}/download`, { 
        credentials: 'include' 
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header or generate
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `ARAS_CALL_${callId}.mp3`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download failed:', err);
      setDownloadError(err.message || 'Download fehlgeschlagen');
    } finally {
      setDownloadingAudio(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} Min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-6"
      style={{
        background: 'rgba(8,8,8,0.85)',
        border: '1px solid rgba(233,215,196,0.15)',
        backdropFilter: 'blur(16px)'
      }}
    >
      <div className="space-y-4">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="mb-3 mx-auto h-12 w-12 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(34,197,94,0.85), rgba(10,10,10,0.1) 70%)',
              boxShadow: '0 0 22px rgba(34,197,94,0.45)',
              border: '1px solid rgba(34,197,94,0.30)'
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="h-3 w-3 rounded-full bg-white/70" />
          </motion.div>

          <h3 
            className="text-xl font-black mb-2"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange})`,
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Call erfolgreich!
          </h3>
          <p className="text-sm text-gray-300">ARAS hat den Anruf abgeschlossen</p>
          
          {result.duration != null && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: '#4ade80'
              }}
            >
              Dauer: {formatDuration(result.duration)}
            </div>
          )}
        </motion.div>

        {/* 📋 Summary Panel */}
        {summary ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl px-4 py-4 relative overflow-hidden"
            style={{
              background: 'rgba(10,10,10,0.92)',
              border: '1px solid rgba(254,145,0,0.15)',
              backdropFilter: 'blur(14px)'
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(254,145,0,0.3), rgba(233,215,196,0.2), rgba(254,145,0,0.3), transparent)'
              }}
            />
            <h4 className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: CI.goldLight }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: CI.orange }} />
              Zusammenfassung
            </h4>
            
            {/* Outcome */}
            <p className="text-sm text-neutral-200 mb-3">{summary.outcome}</p>
            
            {/* Bullet Points */}
            {summary.bulletPoints && summary.bulletPoints.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {summary.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                    <span className="text-orange-400 mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {/* Next Step */}
            {summary.nextStep && (
              <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(254,145,0,0.08)', border: '1px solid rgba(254,145,0,0.15)' }}>
                <span className="font-semibold" style={{ color: CI.orange }}>Nächster Schritt:</span>
                <span className="text-neutral-300">{summary.nextStep}</span>
              </div>
            )}
            
            {/* Tags & Sentiment */}
            {(summary.tags?.length > 0 || summary.sentiment) && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {summary.sentiment && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    summary.sentiment === 'positive' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                    summary.sentiment === 'negative' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                    'bg-neutral-500/15 text-neutral-400 border border-neutral-500/20'
                  }`}>
                    {summary.sentiment === 'positive' ? '😊 Positiv' : 
                     summary.sentiment === 'negative' ? '😟 Negativ' : 
                     summary.sentiment === 'mixed' ? '🤔 Gemischt' : '😐 Neutral'}
                  </span>
                )}
                {summary.tags?.map((tag, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-500 border border-white/10">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ) : onRefresh ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl px-4 py-4 relative overflow-hidden"
            style={{
              background: 'rgba(10,10,10,0.92)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(14px)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Zusammenfassung wird erstellt…</span>
              </div>
              <button
                onClick={onRefresh}
                className="text-[10px] px-2 py-1 rounded flex items-center gap-1 hover:bg-white/5 transition-colors"
                style={{ color: CI.orange }}
              >
                <RefreshCw className="w-3 h-3" />
                Aktualisieren
              </button>
            </div>
          </motion.div>
        ) : null}

        {/* 🎤 Audio Recording with Download */}
        {(result.recordingUrl || result.id || result.callId) ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl px-4 py-3 relative overflow-hidden"
            style={{
              background: 'rgba(10,10,10,0.92)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(14px)'
            }}
          >
            {/* Dezente Audio-Wave-Linie */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(254,145,0,0.15), rgba(233,215,196,0.15), rgba(254,145,0,0.15), transparent)'
              }}
            />
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
              <span>Aufzeichnung des Gesprächs</span>
              <div className="flex items-center gap-2">
                {result.duration != null && (
                  <span>{formatDuration(result.duration)}</span>
                )}
                {/* Download Button */}
                <button
                  onClick={handleDownloadRecording}
                  disabled={downloadingAudio}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:scale-105 disabled:opacity-50"
                  style={{
                    background: 'rgba(254,145,0,0.15)',
                    border: '1px solid rgba(254,145,0,0.3)',
                    color: CI.orange
                  }}
                >
                  {downloadingAudio ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {downloadingAudio ? 'Lädt...' : 'Download'}
                </button>
              </div>
            </div>
            {result.recordingUrl ? (
              <audio
                controls
                className="w-full"
                src={result.recordingUrl}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  filter: 'invert(0.85)'
                }}
                onError={() => setAudioError(true)}
              />
            ) : (
              <p className="text-[10px] text-neutral-500 py-2">
                Audio-Player nicht verfügbar. Nutze den Download-Button.
              </p>
            )}
            {audioError && (
              <p className="mt-2 text-[10px] text-red-400">
                Die Aufzeichnung konnte nicht geladen werden. Versuche es später erneut oder überprüfe deine Verbindung.
              </p>
            )}
            {downloadError && (
              <p className="mt-2 text-[10px] text-red-400">
                Download-Fehler: {downloadError}
              </p>
            )}
            {!audioError && !downloadError && (
              <p className="mt-1 text-[10px] text-neutral-500">
                Klicke "Download" um die Aufnahme als Datei zu speichern.
              </p>
            )}
          </motion.div>
        ) : (
          <p className="text-[11px] text-neutral-500 px-2">
            Für diesen Anruf ist aktuell keine Aufzeichnung verfügbar. Du kannst das Transkript und die Zusammenfassung nutzen.
          </p>
        )}

        {/* 🎯 ARAS Core Summary */}
        {summary ? (
          <motion.div
            className="rounded-2xl p-4 md:p-5 relative overflow-hidden"
            style={{
              background: 'rgba(10,10,10,0.88)',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.06)'
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Animated border shimmer */}
            <div
              className="pointer-events-none absolute inset-[-1px] rounded-2xl"
              style={{
                backgroundImage: 'linear-gradient(120deg, rgba(233,215,196,0.0), rgba(254,145,0,0.45), rgba(233,215,196,0.0))',
                backgroundSize: '200% 100%',
                opacity: 0.35,
                animation: 'aras-border-run 10s linear infinite'
              }}
            />

            <div className="relative space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                    Zusammenfassung von ARAS
                  </div>
                  <div
                    className="mt-1 text-[15px] font-semibold"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      letterSpacing: '0.01em',
                      color: '#e5e7eb'
                    }}
                  >
                    {summary.outcome}
                  </div>
                </div>

                {/* Sentiment-Badge - Modern mit Green-Gold Gradient */}
                <div
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider flex-shrink-0"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background:
                      summary.sentiment === 'positive'
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(233,215,196,0.08))'
                        : summary.sentiment === 'negative'
                        ? 'linear-gradient(135deg, rgba(248,113,113,0.1), rgba(254,145,0,0.08))'
                        : 'rgba(64,64,64,0.3)',
                    border:
                      summary.sentiment === 'positive'
                        ? '1px solid rgba(34,197,94,0.3)'
                        : summary.sentiment === 'negative'
                        ? '1px solid rgba(248,113,113,0.3)'
                        : '1px solid rgba(100,100,100,0.4)',
                    color:
                      summary.sentiment === 'positive'
                        ? '#4ade80'
                        : summary.sentiment === 'negative'
                        ? '#fca5a5'
                        : '#a8a8a8'
                  }}
                >
                  {summary.sentiment === 'positive' && 'Positiv'}
                  {summary.sentiment === 'negative' && 'Kritisch'}
                  {summary.sentiment === 'neutral' && 'Neutral'}
                  {summary.sentiment === 'mixed' && 'Gemischt'}
                </div>
              </div>

              {/* Bulletpoints - Radial Gradient Dots */}
              {summary.bulletPoints?.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-xs text-neutral-300">
                  {summary.bulletPoints.map((bp, idx) => (
                    <li key={idx} className="flex gap-2.5">
                      <span
                        className="mt-[3px] h-[7px] w-[7px] rounded-full flex-shrink-0"
                        style={{
                          background: 'radial-gradient(circle at 30% 30%, #FE9100, #E9D7C4)',
                          boxShadow: '0 0 4px rgba(254,145,0,0.4)'
                        }}
                      />
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Next Step - Custom Border */}
              {summary.nextStep && (
                <div
                  className="mt-3 rounded-xl px-3 py-2.5 text-xs text-neutral-200"
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(254,145,0,0.25)',
                    borderLeft: '3px solid rgba(254,145,0,0.65)',
                    boxShadow: '0 0 12px rgba(254,145,0,0.08)'
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold block mb-1"
                    style={{
                      color: '#FE9100',
                      fontFamily: 'Orbitron, sans-serif'
                    }}
                  >
                    → NÄCHSTER SCHRITT
                  </span>
                  <span className="leading-relaxed">{summary.nextStep}</span>
                </div>
              )}

              {/* Tags */}
              {summary.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {summary.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em] bg-black/60 text-neutral-400 border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <p className="mt-4 text-[11px] text-neutral-500 px-2">
            Die automatische Zusammenfassung ist aktuell nicht verfügbar.
            Du kannst dir das Transkript und die Aufzeichnung trotzdem ansehen.
          </p>
        )}

        {/* 📄 Transkript - Normalized & with Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl p-4"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: CI.goldLight }}>
              Transkript
            </span>
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#9ca3af'
                  }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Aktualisieren
                </button>
              )}
              {/* Copy Button */}
              {normalizedTranscript.text && (
                <button
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:scale-105"
                  style={{
                    background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(254,145,0,0.15)',
                    border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(254,145,0,0.3)',
                    color: copied ? '#4ade80' : CI.orange
                  }}
                >
                  {copied ? (
                    <><CheckCircle className="w-3 h-3" /> Kopiert!</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Kopieren</>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div 
            className="p-4 rounded-xl overflow-y-auto"
            style={{ 
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '350px'
            }}
          >
            {normalizedTranscript.isProcessing && !normalizedTranscript.text ? (
              <div className="flex items-center gap-3 text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Transkript wird verarbeitet...</span>
              </div>
            ) : normalizedTranscript.messages.length > 0 ? (
              /* Chat-style rendering for messages */
              <div className="space-y-3">
                {normalizedTranscript.messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-2 ${msg.role === 'agent' ? '' : 'flex-row-reverse'}`}
                  >
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: msg.role === 'agent' 
                          ? 'linear-gradient(135deg, rgba(254,145,0,0.3), rgba(163,78,0,0.3))' 
                          : 'rgba(255,255,255,0.1)',
                        border: msg.role === 'agent' 
                          ? '1px solid rgba(254,145,0,0.4)' 
                          : '1px solid rgba(255,255,255,0.15)'
                      }}
                    >
                      {msg.role === 'agent' ? (
                        <Bot className="w-3 h-3" style={{ color: CI.orange }} />
                      ) : (
                        <User className="w-3 h-3 text-neutral-400" />
                      )}
                    </div>
                    <div 
                      className={`flex-1 px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'agent' ? 'text-right' : ''
                      }`}
                      style={{
                        background: msg.role === 'agent' 
                          ? 'rgba(254,145,0,0.08)' 
                          : 'rgba(255,255,255,0.05)',
                        border: msg.role === 'agent' 
                          ? '1px solid rgba(254,145,0,0.15)' 
                          : '1px solid rgba(255,255,255,0.08)',
                        color: msg.role === 'agent' ? CI.goldLight : '#d1d5db'
                      }}
                    >
                      <div className="text-[9px] uppercase tracking-wider mb-1 opacity-60">
                        {msg.role === 'agent' ? 'ARAS' : 'Kunde'}
                      </div>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : normalizedTranscript.text ? (
              /* Plain text rendering */
              <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                {normalizedTranscript.text}
              </pre>
            ) : (
              <p className="text-xs text-neutral-500">
                Kein Transkript verfügbar. Klicke "Aktualisieren" um es erneut zu laden.
              </p>
            )}
          </div>
        </motion.div>

        {/* 📇 Contact Verknüpfung */}
        {result.phoneNumber && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {linkedContact ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Verknüpft mit Kontakt:</div>
                  <div className="text-sm font-semibold text-white">
                    {linkedContact.name}
                    {linkedContact.company && (
                      <span className="text-xs text-gray-400 ml-2">({linkedContact.company})</span>
                    )}
                  </div>
                </div>
                <div className="text-xs" style={{ color: CI.orange }}>✓ Gespeichert</div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-semibold mb-3" style={{ color: CI.goldLight }}>
                  Diesen Anruf einem Kontakt zuordnen
                </div>
                <div className="flex gap-2">
                  {onSaveAsNewContact && (
                    <button
                      onClick={() => onSaveAsNewContact(result.phoneNumber!, result.contactName)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                      style={{
                        background: 'rgba(254,145,0,0.12)',
                        border: '1px solid rgba(254,145,0,0.25)',
                        color: CI.orange
                      }}
                    >
                      Als neuen Kontakt speichern
                    </button>
                  )}
                  {onLinkToContact && (
                    <button
                      onClick={() => onLinkToContact(result.phoneNumber!, result.contactName)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#d1d5db'
                      }}
                    >
                      Mit Kontakt verknüpfen
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3 pt-2"
        >
          <button
            onClick={onNewCall}
            className="flex-1 px-6 py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] relative overflow-hidden group"
            style={{
              background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: `0 8px 24px rgba(254,145,0,0.25)`
            }}
          >
            <span className="relative z-10">Neuer POWER Call</span>
          </button>
        </motion.div>

        {/* Notification Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-2 text-center text-[11px] text-gray-500"
        >
          💡 Du erhältst automatisch eine Benachrichtigung, wenn der nächste Call abgeschlossen ist
        </motion.p>
      </div>
    </motion.div>
  );
}
