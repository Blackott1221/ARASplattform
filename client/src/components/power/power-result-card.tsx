import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Download, RotateCcw, FileText, Music } from 'lucide-react';

const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00'
};

interface PowerResultCardProps {
  success: boolean;
  recordingUrl?: string;
  transcript?: string | any[];
  duration?: number;
  error?: string;
  phoneNumber?: string;
  contactName?: string;
  linkedContact?: { id: number; name: string; company?: string } | null;
  onNewCall: () => void;
  onLinkToContact?: (phoneNumber: string, contactName?: string) => void;
  onSaveAsNewContact?: (phoneNumber: string, contactName?: string) => void;
}

export function PowerResultCard({
  success,
  recordingUrl,
  transcript,
  duration,
  error,
  phoneNumber,
  contactName,
  linkedContact,
  onNewCall,
  onLinkToContact,
  onSaveAsNewContact
}: PowerResultCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} Min`;
  };

  const formatTranscript = () => {
    if (typeof transcript === 'string') {
      return transcript;
    } else if (Array.isArray(transcript)) {
      return transcript
        .filter((turn: any) => turn.message && turn.message.trim() !== '...')
        .map((turn: any) => {
          const role = turn.role === 'agent' ? 'ARAS AI' : 'Kunde';
          const message = turn.original_message || turn.message;
          return `${role}: ${message.trim()}`;
        })
        .join('\n\n');
    }
    return JSON.stringify(transcript, null, 2);
  };

  if (!success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(185,28,28,0.08))',
          border: '1px solid rgba(239,68,68,0.3)',
          backdropFilter: 'blur(16px)'
        }}
      >
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid rgba(239,68,68,0.4)'
            }}
          >
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-red-300 mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Anruf fehlgeschlagen
          </h3>
          <p className="text-sm text-red-200/80 mb-6">{error || 'Ein unerwarteter Fehler ist aufgetreten'}</p>
          
          <button
            onClick={onNewCall}
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif'
            }}
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Erneut versuchen
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(254,145,0,0.25)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* Magic Sparkle Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 40%, ${CI.orange}40, transparent 60%),
                        radial-gradient(circle at 70% 60%, ${CI.goldLight}30, transparent 60%)`
          }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ 
              scale: { delay: 0.1, type: 'spring', stiffness: 200 },
              rotate: { delay: 0.3, duration: 0.6 }
            }}
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center relative"
            style={{
              background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
              boxShadow: `0 0 40px rgba(254,145,0,0.4)`
            }}
          >
            <Sparkles className="w-10 h-10 text-white" />
            
            {/* Pulse Ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: `3px solid ${CI.orange}`,
                opacity: 0.6
              }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 0, 0.6]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </motion.div>

          <h3 
            className="text-2xl font-black mb-2"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange}, ${CI.goldDark})`,
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Call erfolgreich!
          </h3>
          <p className="text-sm text-gray-300">ARAS hat Ihren Anruf abgeschlossen</p>
          
          {duration && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e'
              }}
            >
              ⏱️ Gesprächsdauer: {formatDuration(duration)}
            </div>
          )}
        </motion.div>

        {/* Audio Player */}
        {recordingUrl ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6 p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(254,145,0,0.08), rgba(233,215,196,0.05))',
              border: '1px solid rgba(254,145,0,0.2)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-4 h-4" style={{ color: CI.orange }} />
              <span className="text-sm font-semibold" style={{ color: CI.goldLight }}>
                Aufzeichnung
              </span>
            </div>
            
            <audio controls className="w-full mb-3" style={{ height: '40px', borderRadius: '8px' }}>
              <source src={recordingUrl} type="audio/mpeg" />
              <source src={recordingUrl} type="audio/wav" />
              Ihr Browser unterstützt keine Audio-Wiedergabe.
            </audio>

            <a 
              href={recordingUrl} 
              download={`ARAS_Call_${new Date().toISOString().split('T')[0]}.mp3`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{ 
                color: CI.orange,
                background: 'rgba(254,145,0,0.12)',
                border: '1px solid rgba(254,145,0,0.25)'
              }}
            >
              <Download className="w-4 h-4" />
              Audio herunterladen
            </a>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6 p-4 rounded-xl text-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 mx-auto mb-2"
            >
              <div 
                className="w-full h-full rounded-full border-2 border-t-transparent"
                style={{ borderColor: CI.orange, borderTopColor: 'transparent' }}
              />
            </motion.div>
            <p className="text-xs text-gray-400">Audio wird verarbeitet...</p>
          </motion.div>
        )}

        {/* Transcript */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" style={{ color: CI.orange }} />
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
                {formatTranscript()}
              </pre>
            </div>
          </motion.div>
        )}

        {/* 📇 Contact-Verknüpfung */}
        {phoneNumber && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6 p-4 rounded-xl"
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
                      onClick={() => onSaveAsNewContact(phoneNumber, contactName)}
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
                      onClick={() => onLinkToContact(phoneNumber, contactName)}
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
          transition={{ delay: 0.7 }}
          className="flex gap-3"
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
            
            {/* Hover Shimmer */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
              }}
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
          </button>
        </motion.div>

        {/* Notification Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 text-center text-[11px] text-gray-500"
        >
          💡 Sie erhalten automatisch eine Benachrichtigung, wenn der nächste Call abgeschlossen ist
        </motion.p>
      </div>
    </motion.div>
  );
}
