import React, { useState } from 'react';
import { motion } from 'framer-motion';

const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00'
};

interface CallSummary {
  outcome: string;
  bulletPoints: string[];
  nextStep: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  tags: string[];
}

interface PowerResultCardProps {
  result: {
    id?: string;
    recordingUrl?: string | null;
    transcript?: string | null;
    duration?: number | null;
    phoneNumber?: string;
    contactName?: string;
  } | null;
  summary?: CallSummary | null;
  linkedContact?: { id: number; name: string; company?: string } | null;
  onNewCall: () => void;
  onLinkToContact?: (phoneNumber: string, contactName?: string) => void;
  onSaveAsNewContact?: (phoneNumber: string, contactName?: string) => void;
}

export function PowerResultCard({
  result,
  summary,
  linkedContact,
  onNewCall,
  onLinkToContact,
  onSaveAsNewContact
}: PowerResultCardProps) {
  const [audioError, setAudioError] = useState(false);

  if (!result) return null;

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

        {/* 🎤 Audio Recording */}
        {result.recordingUrl ? (
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
              {result.duration != null && (
                <span>{formatDuration(result.duration)}</span>
              )}
            </div>
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
            {audioError && (
              <p className="mt-2 text-[10px] text-red-400">
                Die Aufzeichnung konnte nicht geladen werden. Versuche es später erneut oder überprüfe deine Verbindung.
              </p>
            )}
            {!audioError && (
              <p className="mt-1 text-[10px] text-neutral-500">
                Falls die Aufzeichnung nicht lädt, versuche es später erneut.
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

        {/* 📄 Transkript */}
        {result.transcript && (
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
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold" style={{ color: CI.goldLight }}>
                Transkript
              </span>
            </div>
            
            <div 
              className="p-4 rounded-xl overflow-y-auto"
              style={{ 
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '300px'
              }}
            >
              <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                {result.transcript}
              </pre>
            </div>
          </motion.div>
        )}

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
