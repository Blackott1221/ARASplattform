/**
 * Daily Briefing Card - AI-generated summary of priorities
 * Mission Control V4
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, RefreshCw, AlertTriangle, CheckCircle, 
  ChevronRight, Zap
} from 'lucide-react';

// ARAS Design Tokens
const DT = {
  orange: '#ff6a00',
  gold: '#e9d7c4',
  panelBg: 'rgba(20,20,25,0.85)',
  panelBorder: 'rgba(255,255,255,0.06)',
};

interface BriefingPriority {
  title: string;
  why: string;
  callId?: string;
  contactName?: string;
}

interface DailyBriefingData {
  headline: string;
  topPriorities: BriefingPriority[];
  quickWins: string[];
  riskFlags: string[];
  generatedAt: string;
  cached?: boolean;
}

interface DailyBriefingProps {
  briefing?: DailyBriefingData;
  loading?: boolean;
  onRefresh?: () => void;
  onOpenCall?: (callId: string) => void;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-5 bg-white/10 rounded w-3/4 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-white/5 rounded w-full" />
        <div className="h-4 bg-white/5 rounded w-5/6" />
      </div>
    </div>
  );
}

export function DailyBriefing({
  briefing,
  loading,
  onRefresh,
  onOpenCall,
}: DailyBriefingProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <div 
        className="rounded-2xl overflow-hidden"
        style={{
          background: DT.panelBg,
          border: `1px solid ${DT.panelBorder}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <LoadingSkeleton />
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${DT.panelBg}, rgba(255,106,0,0.05))`,
        border: `1px solid ${DT.panelBorder}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: `${DT.orange}20` }}
          >
            <Sparkles size={12} style={{ color: DT.orange }} />
          </div>
          <h3 
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: DT.gold }}
          >
            AI Briefing
          </h3>
          {briefing.cached && (
            <span className="text-[9px] text-white/30 px-1.5 py-0.5 rounded bg-white/5">
              cached
            </span>
          )}
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg transition-all hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw 
            size={12} 
            className={`text-white/40 ${refreshing ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>

      {/* Headline */}
      <div className="px-4 pb-3">
        <p className="text-sm font-medium text-white">
          {briefing.headline}
        </p>
      </div>

      {/* Top Priorities */}
      {briefing.topPriorities.length > 0 && (
        <div className="px-4 pb-3">
          <div className="space-y-2">
            {briefing.topPriorities.slice(0, 3).map((priority, i) => (
              <button
                key={i}
                onClick={() => priority.callId && onOpenCall?.(priority.callId)}
                className="w-full text-left p-2 rounded-lg transition-all hover:bg-white/5 group"
              >
                <div className="flex items-start gap-2">
                  <Zap size={12} style={{ color: DT.orange }} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate">
                      {priority.title}
                    </p>
                    <p className="text-[10px] text-white/40 line-clamp-1">
                      {priority.why}
                    </p>
                  </div>
                  <ChevronRight 
                    size={12} 
                    className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" 
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins & Risk Flags */}
      <div 
        className="px-4 py-3 flex flex-wrap gap-2"
        style={{ borderTop: `1px solid ${DT.panelBorder}` }}
      >
        {briefing.quickWins.map((win, i) => (
          <span
            key={`win-${i}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
          >
            <CheckCircle size={10} />
            {win}
          </span>
        ))}
        
        {briefing.riskFlags.map((flag, i) => (
          <span
            key={`risk-${i}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            <AlertTriangle size={10} />
            {flag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default DailyBriefing;
