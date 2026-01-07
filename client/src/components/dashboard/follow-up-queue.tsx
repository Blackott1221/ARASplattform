/**
 * Follow-Up Queue - Prioritized next actions from calls
 * Mission Control V4
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Phone, MessageSquare, Calendar, 
  Sparkles, Clock, Copy, Check, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// ARAS Design Tokens
const DT = {
  orange: '#ff6a00',
  gold: '#e9d7c4',
  panelBg: 'rgba(20,20,25,0.85)',
  panelBorder: 'rgba(255,255,255,0.06)',
};

interface FollowUpItem {
  id: string;
  callId: string;
  contactId?: string;
  contactName: string;
  contactPhone?: string;
  lastCallAt: string;
  action: string;
  reason: string;
  priority: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  hasGeminiInsights: boolean;
}

interface FollowUpQueueProps {
  followups: FollowUpItem[];
  total: number;
  loading?: boolean;
  onOpenCall?: (callId: string) => void;
  onOpenContact?: (contactId: string) => void;
  onCopyMessage?: (action: string, contactName: string) => void;
  onCreateTask?: (followup: FollowUpItem) => void;
  onGenerateFollowups?: () => void;
}

function SentimentDot({ sentiment }: { sentiment?: string }) {
  const colors = {
    positive: '#22c55e',
    neutral: '#f59e0b',
    negative: '#ef4444',
  };
  const color = colors[sentiment as keyof typeof colors] || colors.neutral;
  
  return (
    <span 
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function FollowUpCard({ 
  followup, 
  onOpenCall, 
  onOpenContact,
  onCopyMessage,
  onCreateTask,
}: { 
  followup: FollowUpItem;
  onOpenCall?: (id: string) => void;
  onOpenContact?: (id: string) => void;
  onCopyMessage?: (action: string, name: string) => void;
  onCreateTask?: (f: FollowUpItem) => void;
}) {
  const [copied, setCopied] = useState(false);

  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(followup.lastCallAt), { addSuffix: true, locale: de });
  } catch { /* ignore */ }

  const handleCopy = () => {
    const message = `Hallo ${followup.contactName},\n\nbezüglich unseres letzten Gesprächs: ${followup.action}\n\nMit freundlichen Grüßen`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyMessage?.(followup.action, followup.contactName);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="group p-3 rounded-xl transition-all hover:bg-white/5"
      style={{ 
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${DT.panelBorder}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <SentimentDot sentiment={followup.sentiment} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {followup.contactName}
            </span>
            {followup.hasGeminiInsights && (
              <Sparkles size={12} style={{ color: DT.orange }} />
            )}
          </div>
          
          <p className="text-[11px] text-white/50 mt-0.5 flex items-center gap-1">
            <Clock size={10} />
            {timeAgo}
          </p>
        </div>

        <button
          onClick={() => onOpenCall?.(followup.callId)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-white/10"
        >
          <ChevronRight size={14} className="text-white/50" />
        </button>
      </div>

      {/* Action */}
      <div className="mt-2 pl-5">
        <p className="text-xs text-white/70 line-clamp-2">
          {followup.action}
        </p>
        <p className="text-[10px] text-white/40 mt-1">
          {followup.reason}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mt-3 pl-5 flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all hover:bg-white/10"
          style={{ color: DT.orange }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Kopiert' : 'Nachricht'}
        </button>
        
        <button
          onClick={() => onCreateTask?.(followup)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/60 transition-all hover:bg-white/10"
        >
          <Calendar size={10} />
          Task
        </button>

        {followup.contactId && (
          <button
            onClick={() => onOpenContact?.(followup.contactId!)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/60 transition-all hover:bg-white/10"
          >
            <Phone size={10} />
            Kontakt
          </button>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ onGenerate }: { onGenerate?: () => void }) {
  return (
    <div className="text-center py-8 px-4">
      <div 
        className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
        style={{ background: `${DT.orange}15` }}
      >
        <MessageSquare size={20} style={{ color: DT.orange }} />
      </div>
      <p className="text-xs text-white/60 mb-1">Keine Follow-ups erkannt</p>
      <p className="text-[10px] text-white/40 mb-4">
        Starte Anrufe für automatische Empfehlungen
      </p>
      {onGenerate && (
        <button
          onClick={onGenerate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium text-white transition-all hover:scale-105"
          style={{ background: `linear-gradient(135deg, ${DT.orange}, #ff8533)` }}
        >
          <Sparkles size={12} />
          Aus Calls generieren
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2 mt-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FollowUpQueue({
  followups,
  total,
  loading,
  onOpenCall,
  onOpenContact,
  onCopyMessage,
  onCreateTask,
  onGenerateFollowups,
}: FollowUpQueueProps) {
  return (
    <div 
      className="rounded-2xl overflow-hidden"
      style={{
        background: DT.panelBg,
        border: `1px solid ${DT.panelBorder}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${DT.panelBorder}` }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: `${DT.orange}20` }}
          >
            <ArrowRight size={12} style={{ color: DT.orange }} />
          </div>
          <h3 
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: DT.gold }}
          >
            Follow-up Queue
          </h3>
        </div>
        
        {total > 0 && (
          <span className="text-[10px] text-white/40">
            {total} offen
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : followups.length === 0 ? (
        <EmptyState onGenerate={onGenerateFollowups} />
      ) : (
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {followups.map((followup, index) => (
              <FollowUpCard
                key={followup.id}
                followup={followup}
                onOpenCall={onOpenCall}
                onOpenContact={onOpenContact}
                onCopyMessage={onCopyMessage}
                onCreateTask={onCreateTask}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {followups.length > 0 && total > followups.length && (
        <div 
          className="px-4 py-2 text-center"
          style={{ borderTop: `1px solid ${DT.panelBorder}` }}
        >
          <p className="text-[10px] text-white/30">
            +{total - followups.length} weitere
          </p>
        </div>
      )}
    </div>
  );
}

export default FollowUpQueue;
