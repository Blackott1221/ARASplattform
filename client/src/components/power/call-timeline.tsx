import React from 'react';
import { motion } from 'framer-motion';

const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00'
};

type CallStatus = 'idle' | 'processing' | 'ringing' | 'connected' | 'ended';

interface TimelineStep {
  id: CallStatus;
  label: string;
  description: string;
  emoji: string;
}

interface CallTimelineProps {
  currentStatus: CallStatus;
  duration?: number;
}

const steps: TimelineStep[] = [
  {
    id: 'processing',
    label: 'Vorbereitung',
    description: 'Anruf wird konfiguriert',
    emoji: '⚙️'
  },
  {
    id: 'ringing',
    label: 'Verbindung',
    description: 'Nummer wird gewählt',
    emoji: '📞'
  },
  {
    id: 'connected',
    label: 'Gespräch',
    description: 'ARAS spricht',
    emoji: '🎤'
  },
  {
    id: 'ended',
    label: 'Abgeschlossen',
    description: 'Transkript wird erstellt',
    emoji: '✅'
  }
];

export function CallTimeline({ currentStatus, duration = 0 }: CallTimelineProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStatus);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Removed outer container - handled by parent */}

      {/* Timeline */}
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isPending = index > currentIndex;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start gap-4"
            >
              {/* Dot with Emoji */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="w-10 h-10 rounded-full flex items-center justify-center relative z-10 text-base"
                  style={{
                    background: isActive 
                      ? 'rgba(254,145,0,0.15)'
                      : isCompleted
                      ? 'rgba(34, 197, 94, 0.12)'
                      : 'rgba(255,255,255,0.03)',
                    border: isActive
                      ? '2px solid rgba(254,145,0,0.6)'
                      : isCompleted
                      ? '2px solid rgba(34,197,94,0.4)'
                      : '1px solid rgba(255,255,255,0.1)'
                  }}
                  animate={isActive ? {
                    boxShadow: [
                      '0 0 0 0 rgba(254,145,0,0.6)',
                      '0 0 12px 4px rgba(254,145,0,0.3)',
                      '0 0 0 0 rgba(254,145,0,0.6)'
                    ]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                    ease: 'easeInOut'
                  }}
                >
                  {step.emoji}
                </motion.div>

                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-1/2 top-10 w-px h-8 -translate-x-1/2"
                    style={{
                      background: index < currentIndex
                        ? 'linear-gradient(180deg, rgba(34,197,94,0.6), rgba(34,197,94,0.2))'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: index < currentIndex
                        ? '0 0 4px rgba(34,197,94,0.3)'
                        : 'none'
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-center justify-between mb-1">
                  <h4 
                    className="text-[15px] font-semibold"
                    style={{
                      color: isActive ? CI.orange : isCompleted ? '#22c55e' : '#9ca3af',
                      fontFamily: 'Orbitron, sans-serif',
                      animation: isActive ? 'aras-pulse 2s ease-in-out infinite' : 'none'
                    }}
                  >
                    {step.label}
                  </h4>
                  
                  {isActive && currentStatus === 'connected' && duration > 0 && (
                    <motion.span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                      }}
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {formatDuration(duration)}
                    </motion.span>
                  )}
                </div>
                
                <p 
                  className="text-[13px]"
                  style={{
                    color: isActive ? '#d1d5db' : '#6b7280'
                  }}
                >
                  {step.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
