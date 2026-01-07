/**
 * SPACE Start Launchpad - Premium Entry Experience
 * Speech bubble + pulse orb + chat overlay wrapper
 */

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

// ARAS CI Colors
const ARAS = {
  orange: '#ff6a00',
  gold: '#e9d7c4',
  darkBg: '#07070a',
};

interface StartLaunchpadProps {
  children: ReactNode;
  companyHint?: string;
}

function PulseOrb() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className="relative w-16 h-16 mx-auto mb-6">
      {/* Core orb */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${ARAS.orange}, ${ARAS.orange}80)`,
          boxShadow: `0 0 30px ${ARAS.orange}60`,
        }}
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.05, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Expanding rings */}
      {!prefersReducedMotion && [0, 0.4, 0.8].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: `${ARAS.orange}40` }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{
            scale: [1, 1.8, 1.8],
            opacity: [0.6, 0, 0],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

function SpeechBubble({ onClick }: { onClick: () => void }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group relative max-w-2xl mx-auto p-12 rounded-3xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/55 focus:ring-offset-2 focus:ring-offset-black/80 transition-shadow"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Animated ring on hover */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `linear-gradient(135deg, ${ARAS.gold}40, ${ARAS.orange}60, rgba(255,255,255,0.3), ${ARAS.orange}60, ${ARAS.gold}40)`,
          backgroundSize: '300% 300%',
          animation: prefersReducedMotion ? 'none' : 'arasGradientShift 4s linear infinite',
          padding: '2px',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMaskComposite: 'xor',
        }}
      />

      <div className="relative z-10">
        <PulseOrb />
        
        <h1 
          className="text-4xl md:text-5xl font-bold text-center mb-4"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            background: `linear-gradient(135deg, ${ARAS.gold}, ${ARAS.orange}, #fff)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Lass uns STARTEN.
        </h1>
        
        <p className="text-center text-white/60 text-base max-w-md mx-auto leading-relaxed">
          Sag mir dein Ziel – ich telefoniere oder baue dir Vertrieb.
        </p>
      </div>
    </motion.button>
  );
}

function ChatOverlay({ children, onClose, companyHint }: { children: ReactNode; onClose: () => void; companyHint?: string }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Chat Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl h-[90vh] rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(15,15,18,0.98)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <Sparkles size={20} style={{ color: ARAS.orange }} />
            <div>
              <h2 
                className="text-lg font-bold"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: `linear-gradient(135deg, ${ARAS.gold}, ${ARAS.orange})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ARAS AI
              </h2>
              <p className="text-xs text-white/50">
                {companyHint ? `Vertrieb für ${companyHint}` : 'Ihr persönlicher AI-Assistent'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/55 focus:ring-offset-2 focus:ring-offset-black/80"
            aria-label="Schließen"
          >
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Starter Messages - Static UI Guidance */}
        <div className="px-6 py-4 space-y-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${ARAS.orange}20` }}>
              <Sparkles size={14} style={{ color: ARAS.orange }} />
            </div>
            <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm text-white/80 leading-relaxed">
                Ich kann <span className="font-semibold text-white">einzelne Calls</span> erledigen (Termin/Reservierung verschieben)
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${ARAS.orange}20` }}>
              <Sparkles size={14} style={{ color: ARAS.orange }} />
            </div>
            <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm text-white/80 leading-relaxed">
                Oder <span className="font-semibold text-white">Vertrieb skalieren</span> – bis zu 10.000 Calls (paketabhängig)
              </p>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function StartLaunchpad({ children, companyHint }: StartLaunchpadProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (showOverlay) {
    return (
      <AnimatePresence>
        <ChatOverlay onClose={() => setShowOverlay(false)} companyHint={companyHint}>
          {children}
        </ChatOverlay>
      </AnimatePresence>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{ background: ARAS.darkBg }}
      >
        {/* Subtle fog layers */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 40%, ${ARAS.orange}15, transparent 50%)`,
          }}
          animate={prefersReducedMotion ? {} : {
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 70% 60%, ${ARAS.gold}10, transparent 50%)`,
          }}
          animate={prefersReducedMotion ? {} : {
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl px-6">
        <SpeechBubble onClick={() => setShowOverlay(true)} />
        
        {/* Optional hint chips */}
        {companyHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex justify-center gap-3 flex-wrap"
          >
            <span className="px-4 py-2 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Vertrieb für {companyHint}
            </span>
            <span className="px-4 py-2 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Bis zu 10.000 Calls
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default StartLaunchpad;
