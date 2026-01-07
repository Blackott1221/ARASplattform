/**
 * Contact Drawer - Slide-in panel with contact timeline
 * Mission Control V4
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, Mail, Building2, Tag, Clock, 
  MessageSquare, Calendar, ArrowRight, Play,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

// ARAS Design Tokens
const DT = {
  orange: '#ff6a00',
  gold: '#e9d7c4',
  panelBg: 'rgba(15,15,18,0.98)',
  panelBorder: 'rgba(255,255,255,0.06)',
};

interface TimelineEvent {
  id: string;
  type: 'call' | 'task' | 'note' | 'campaign';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ContactData {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  tags?: string[];
  createdAt?: string;
}

interface ContactStats {
  totalCalls: number;
  totalTasks: number;
  lastCallAt?: string;
  lastCallSentiment?: string;
  nextStep?: string;
}

interface ContactDrawerProps {
  contactId: string | null;
  onClose: () => void;
  onOpenCall?: (callId: string) => void;
  onAddToCampaign?: (contactId: string) => void;
  onCreateTask?: (contactId: string) => void;
}

function TimelineItem({ 
  event, 
  onOpenCall 
}: { 
  event: TimelineEvent; 
  onOpenCall?: (id: string) => void;
}) {
  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: de });
  } catch { /* ignore */ }

  const getIcon = () => {
    switch (event.type) {
      case 'call':
        return <Phone size={12} />;
      case 'task':
        return <CheckCircle size={12} />;
      case 'campaign':
        return <Play size={12} />;
      default:
        return <MessageSquare size={12} />;
    }
  };

  const getColor = () => {
    if (event.type === 'call') {
      const sentiment = event.metadata?.sentiment;
      if (sentiment === 'positive') return '#22c55e';
      if (sentiment === 'negative') return '#ef4444';
      return DT.orange;
    }
    return 'rgba(255,255,255,0.4)';
  };

  return (
    <div className="flex gap-3 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${getColor()}20`, color: getColor() }}
        >
          {getIcon()}
        </div>
        <div className="w-px flex-1 bg-white/10 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-white/80">
              {event.title}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {timeAgo}
            </p>
          </div>
          
          {event.type === 'call' && event.metadata?.callId && (
            <button
              onClick={() => onOpenCall?.(String(event.metadata?.callId))}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all hover:bg-white/10"
            >
              <ArrowRight size={12} className="text-white/40" />
            </button>
          )}
        </div>

        {event.description && (
          <p className="text-[11px] text-white/60 mt-2 line-clamp-2">
            {event.description}
          </p>
        )}

        {event.metadata?.nextStep && (
          <div 
            className="mt-2 p-2 rounded-lg text-[10px]"
            style={{ background: `${DT.orange}10`, color: DT.orange }}
          >
            Nächster Schritt: {event.metadata.nextStep}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-white/10" />
        <div className="flex-1">
          <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 rounded-lg bg-white/10" />
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-1" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactDrawer({
  contactId,
  onClose,
  onOpenCall,
  onAddToCampaign,
  onCreateTask,
}: ContactDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState<ContactData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);

  useEffect(() => {
    if (!contactId) {
      setContact(null);
      setTimeline([]);
      setStats(null);
      return;
    }

    const fetchTimeline = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard/contacts/${contactId}/timeline`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setContact(data.contact);
          setTimeline(data.timeline || []);
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch contact timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [contactId]);

  const isOpen = Boolean(contactId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-hidden"
            style={{
              background: DT.panelBg,
              borderLeft: `1px solid ${DT.panelBorder}`,
            }}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${DT.panelBorder}` }}
            >
              <h2 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: DT.gold }}
              >
                Kontakt
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-all hover:bg-white/10"
              >
                <X size={16} className="text-white/60" />
              </button>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : contact ? (
              <div className="h-full overflow-y-auto pb-20">
                {/* Contact Info */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                      style={{ background: `${DT.orange}20`, color: DT.orange }}
                    >
                      {contact.name?.charAt(0) || '?'}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {contact.name}
                      </h3>
                      
                      {contact.company && (
                        <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                          <Building2 size={10} />
                          {contact.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="mt-4 space-y-2">
                    {contact.phone && (
                      <a 
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors"
                      >
                        <Phone size={12} />
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a 
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors"
                      >
                        <Mail size={12} />
                        {contact.email}
                      </a>
                    )}
                  </div>

                  {/* Tags */}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {contact.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                        >
                          <Tag size={8} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  {stats && (
                    <div 
                      className="mt-4 p-3 rounded-xl grid grid-cols-2 gap-3"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div>
                        <p className="text-[10px] text-white/40">Anrufe</p>
                        <p className="text-sm font-semibold text-white">{stats.totalCalls}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40">Aufgaben</p>
                        <p className="text-sm font-semibold text-white">{stats.totalTasks}</p>
                      </div>
                    </div>
                  )}

                  {/* Next Step */}
                  {stats?.nextStep && (
                    <div 
                      className="mt-4 p-3 rounded-xl"
                      style={{ background: `${DT.orange}10`, borderLeft: `3px solid ${DT.orange}` }}
                    >
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: DT.orange }}>
                        Nächster Schritt
                      </p>
                      <p className="text-xs text-white/80">
                        {stats.nextStep}
                      </p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => onCreateTask?.(String(contact.id))}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all hover:bg-white/10"
                      style={{ border: `1px solid ${DT.panelBorder}`, color: 'white' }}
                    >
                      <Calendar size={12} />
                      Task erstellen
                    </button>
                    <button
                      onClick={() => onAddToCampaign?.(String(contact.id))}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium text-white transition-all hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${DT.orange}, #ff8533)` }}
                    >
                      <Play size={12} />
                      In Kampagne
                    </button>
                  </div>
                </div>

                {/* Timeline */}
                <div 
                  className="px-6 py-4"
                  style={{ borderTop: `1px solid ${DT.panelBorder}` }}
                >
                  <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-4">
                    Aktivitäten
                  </h4>

                  {timeline.length > 0 ? (
                    <div>
                      {timeline.map(event => (
                        <TimelineItem 
                          key={event.id} 
                          event={event} 
                          onOpenCall={onOpenCall}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock size={20} className="mx-auto text-white/20 mb-2" />
                      <p className="text-xs text-white/40">Keine Aktivitäten</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <AlertCircle size={24} className="mx-auto text-white/20 mb-2" />
                <p className="text-xs text-white/40">Kontakt nicht gefunden</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ContactDrawer;
