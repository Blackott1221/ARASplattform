import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Phone, Radio, CheckCircle2, Loader2 } from 'lucide-react';

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
  icon: React.ReactNode;
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
    icon: <Settings className="w-5 h-5" />
  },
  {
    id: 'ringing',
    label: 'Verbindung',
    description: 'Nummer wird gewählt',
    icon: <Phone className="w-5 h-5" />
  },
  {
    id: 'connected',
    label: 'Gespräch',
    description: 'ARAS spricht',
    icon: <Radio className="w-5 h-5" />
  },
  {
    id: 'ended',
    label: 'Abgeschlossen',
    description: 'Transkript wird erstellt',
    icon: <CheckCircle2 className="w-5 h-5" />
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
    <div 
      className="rounded-2xl p-6"
      style={{
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(16px)'
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <h3 
          className="text-lg font-bold mb-1"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Call Status
        </h3>
        <p className="text-xs text-gray-400">Live-Tracking Ihrer Telefonie</p>
      </div>

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
              {/* Icon Circle */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="w-12 h-12 rounded-full flex items-center justify-center relative z-10"
                  style={{
                    background: isActive 
                      ? `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`
                      : isCompleted
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(255,255,255,0.05)',
                    border: isActive
                      ? `2px solid ${CI.orange}`
                      : isCompleted
                      ? '2px solid #22c55e'
                      : '2px solid rgba(255,255,255,0.15)',
                    color: isActive || isCompleted ? '#fff' : '#6b7280'
                  }}
                  animate={isActive ? {
                    boxShadow: [
                      `0 0 0 0 rgba(254, 145, 0, 0.4)`,
                      `0 0 0 8px rgba(254, 145, 0, 0)`,
                      `0 0 0 0 rgba(254, 145, 0, 0.4)`
                    ]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                    ease: 'easeInOut'
                  }}
                >
                  {isActive && <Loader2 className="w-5 h-5 animate-spin absolute" />}
                  {step.icon}
                </motion.div>

                {/* Animated Ring for Active Step */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: `2px solid ${CI.orange}`,
                      opacity: 0.5
                    }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}

                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-1/2 top-12 w-0.5 h-6 -translate-x-1/2"
                    style={{
                      background: index < currentIndex
                        ? 'linear-gradient(180deg, #22c55e, rgba(34, 197, 94, 0.3))'
                        : 'rgba(255,255,255,0.1)'
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <h4 
                    className="text-sm font-semibold"
                    style={{
                      color: isActive ? CI.orange : isCompleted ? '#22c55e' : '#9ca3af',
                      fontFamily: 'Orbitron, sans-serif'
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
                  className="text-xs"
                  style={{
                    color: isActive ? '#d1d5db' : '#6b7280'
                  }}
                >
                  {step.description}
                </p>

                {/* Active Step Extra Info */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    <div 
                      className="px-3 py-2 rounded-lg text-[11px]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(254,145,0,0.08), rgba(233,215,196,0.05))',
                        border: '1px solid rgba(254,145,0,0.15)',
                        color: '#e5e7eb'
                      }}
                    >
                      {currentStatus === 'processing' && '⚙️ KI optimiert Gesprächsführung...'}
                      {currentStatus === 'ringing' && '📞 Verbindung wird aufgebaut...'}
                      {currentStatus === 'connected' && '🎙️ Echtzeit-Konversation läuft...'}
                      {currentStatus === 'ended' && '✨ Aufzeichnung wird verarbeitet...'}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-gray-400">Fortschritt</span>
          <span className="text-[11px] font-semibold" style={{ color: CI.orange }}>
            {Math.round((currentIndex / (steps.length - 1)) * 100)}%
          </span>
        </div>
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${CI.orange}, ${CI.goldDark})`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
