/**
 * ============================================================================
 * INBOUND MAIL CARD - Dashboard Widget
 * ============================================================================
 * Compact card for the dashboard feed showing NEW mail count + last 3 subjects
 * Premium ARAS CI styling with "Mails öffnen" button
 * ============================================================================
 */

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Mail, ChevronRight, Inbox } from 'lucide-react';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface MailItem {
  id: number;
  subject: string;
  fromEmail: string;
  receivedAt: string;
  status: string;
}

export function InboundMailCard() {
  const [, navigate] = useLocation();

  const { data: listData, isLoading } = useQuery({
    queryKey: ['dashboard-mail-preview'],
    queryFn: async () => {
      const res = await fetch('/api/internal/mail/inbound?status=NEW&limit=3', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: counts } = useQuery({
    queryKey: ['inbound-mail-counts'],
    queryFn: async () => {
      const res = await fetch('/api/internal/mail/inbound/count', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const mails: MailItem[] = listData?.data || [];
  const newCount = counts?.counts?.NEW || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(233,215,196,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(254,145,0,0.1)' }}
          >
            <Mail className="w-4 h-4" style={{ color: '#FE9100' }} />
          </div>
          <div>
            <h3 
              className="text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Orbitron, sans-serif' }}
            >
              Inbound Mails
            </h3>
          </div>
        </div>
        {newCount > 0 && (
          <span 
            className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
            style={{ background: 'rgba(254,145,0,0.15)', color: '#FE9100' }}
          >
            {newCount} NEW
          </span>
        )}
      </div>

      {/* Mail Preview List */}
      <div className="space-y-2 mb-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded animate-pulse"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
              <div className="flex-1 space-y-1">
                <div 
                  className="h-3 rounded animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.05)', width: '70%' }}
                />
                <div 
                  className="h-2 rounded animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.03)', width: '50%' }}
                />
              </div>
            </div>
          ))
        ) : mails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Inbox className="w-8 h-8 mb-2" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Keine neuen Mails
            </p>
          </div>
        ) : (
          mails.map((mail) => (
            <div
              key={mail.id}
              className="flex items-start gap-2 p-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: '#FE9100' }}
              />
              <div className="flex-1 min-w-0">
                <p 
                  className="text-xs font-medium truncate"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {mail.subject || '(Kein Betreff)'}
                </p>
                <p 
                  className="text-[10px] truncate"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {mail.fromEmail} · {formatDistanceToNow(new Date(mail.receivedAt), { addSuffix: true, locale: de })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => navigate('/internal/mails')}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
        style={{
          background: 'linear-gradient(135deg, rgba(254,145,0,0.1), rgba(163,78,0,0.1))',
          border: '1px solid rgba(254,145,0,0.2)',
          color: '#FE9100',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(254,145,0,0.15), rgba(163,78,0,0.15))';
          e.currentTarget.style.borderColor = 'rgba(254,145,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(254,145,0,0.1), rgba(163,78,0,0.1))';
          e.currentTarget.style.borderColor = 'rgba(254,145,0,0.2)';
        }}
      >
        <span>Mails öffnen</span>
        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </motion.div>
  );
}

export default InboundMailCard;
