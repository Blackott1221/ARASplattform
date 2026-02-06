/**
 * ============================================================================
 * ARAS INTERNAL MAILS PAGE
 * ============================================================================
 * Premium email inbox with AI triage, draft preview, and send workflow
 * Route: /internal/mails
 * ============================================================================
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Search, RefreshCw, X, Clock, Tag, CheckCircle, Archive, 
  Send, Eye, Sparkles, Copy, ChevronRight, AlertCircle, ExternalLink,
  Inbox, Filter, Zap, FileText, User
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import InternalLayout from '@/components/internal/internal-layout';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

type MailStatus = 'NEW' | 'TRIAGED' | 'DRAFT_READY' | 'APPROVED' | 'SENT' | 'SEND_ERROR' | 'CLOSED' | 'ARCHIVED';
type MailCategory = 'SALES' | 'SUPPORT' | 'MEETING' | 'BILLING' | 'SPAM' | 'OTHER';
type MailPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface MailItem {
  id: number;
  subject: string;
  fromEmail: string;
  fromName?: string | null;
  mailbox?: string | null;
  receivedAt: string;
  status: MailStatus;
  snippet: string;
  category?: MailCategory | null;
  priority?: MailPriority | null;
  aiConfidence?: number | null;
  aiSummary?: string;
  aiAction?: string | null;
  draftSubject?: string;
  draftHtml?: string;
  draftText?: string;
  bodyText?: string;
  bodyHtml?: string;
  triagedAt?: string | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  messageId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<MailStatus, { label: string; color: string; bg: string }> = {
  NEW: { label: 'Neu', color: '#FE9100', bg: 'rgba(254,145,0,0.15)' },
  TRIAGED: { label: 'Triaged', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  DRAFT_READY: { label: 'Draft', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  APPROVED: { label: 'Approved', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  SENT: { label: 'Sent', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  SEND_ERROR: { label: 'Error', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  CLOSED: { label: 'Closed', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  ARCHIVED: { label: 'Archived', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

const CATEGORY_CONFIG: Record<MailCategory, { label: string; color: string }> = {
  SALES: { label: 'Sales', color: '#FE9100' },
  SUPPORT: { label: 'Support', color: '#3B82F6' },
  MEETING: { label: 'Meeting', color: '#8B5CF6' },
  BILLING: { label: 'Billing', color: '#10B981' },
  SPAM: { label: 'Spam', color: '#EF4444' },
  OTHER: { label: 'Other', color: '#6B7280' },
};

const PRIORITY_CONFIG: Record<MailPriority, { label: string; color: string }> = {
  URGENT: { label: 'Urgent', color: '#EF4444' },
  HIGH: { label: 'High', color: '#F97316' },
  MEDIUM: { label: 'Medium', color: '#EAB308' },
  LOW: { label: 'Low', color: '#6B7280' },
};

const STATUS_FILTERS: MailStatus[] = ['NEW', 'TRIAGED', 'APPROVED', 'SENT', 'ARCHIVED'];

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)' }}
    />
  );
}

// ============================================================================
// BADGE COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: MailStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.NEW;
  return (
    <span 
      className="text-[10px] uppercase px-2 py-0.5 rounded font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: MailCategory }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.OTHER;
  return (
    <span 
      className="text-[9px] uppercase px-1.5 py-0.5 rounded font-medium"
      style={{ background: `${config.color}15`, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: MailPriority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
  return (
    <span 
      className="text-[9px] uppercase px-1.5 py-0.5 rounded font-medium"
      style={{ background: `${config.color}15`, color: config.color }}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// MAIL LIST ITEM
// ============================================================================

function MailListItem({ 
  mail, 
  isSelected, 
  onClick 
}: { 
  mail: MailItem; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(mail.receivedAt), { addSuffix: true, locale: de });
    } catch { return ''; }
  }, [mail.receivedAt]);

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl transition-all duration-200"
      style={{
        background: isSelected ? 'rgba(254,145,0,0.08)' : 'rgba(255,255,255,0.02)',
        border: isSelected ? '1px solid rgba(254,145,0,0.3)' : '1px solid transparent',
      }}
      whileHover={{ scale: 1.002, borderColor: 'rgba(254,145,0,0.15)' }}
    >
      <div className="flex items-start gap-3">
        {/* Status Dot */}
        <div 
          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
          style={{ 
            background: mail.status === 'NEW' ? '#FE9100' : 
                        mail.status === 'SEND_ERROR' ? '#EF4444' : 
                        'rgba(255,255,255,0.2)',
            boxShadow: mail.status === 'NEW' ? '0 0 8px rgba(254,145,0,0.5)' : 'none',
          }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-medium truncate mb-0.5"
            style={{ color: mail.status === 'NEW' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)' }}
          >
            {mail.subject || '(Kein Betreff)'}
          </p>
          <p className="text-xs truncate mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {mail.fromName || mail.fromEmail}
          </p>
          <p className="text-[11px] line-clamp-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {mail.snippet || '—'}
          </p>
          
          {/* Tags Row */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <StatusBadge status={mail.status} />
            {mail.category && <CategoryBadge category={mail.category} />}
            {mail.priority && <PriorityBadge priority={mail.priority} />}
          </div>
        </div>

        {/* Time */}
        <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {timeAgo}
        </span>
      </div>
    </motion.button>
  );
}

// ============================================================================
// DETAIL PANEL
// ============================================================================

function DetailPanel({ 
  mail, 
  onTriage,
  onApprove,
  onSend,
  onClose,
  isTriaging,
  isSending,
}: { 
  mail: MailItem | null;
  onTriage: () => void;
  onApprove: () => void;
  onSend: () => void;
  onClose: () => void;
  isTriaging: boolean;
  isSending: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'mail' | 'ai' | 'draft'>('mail');
  const { toast } = useToast();

  if (!mail) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Inbox className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.08)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Wähle eine E-Mail aus
          </p>
        </div>
      </div>
    );
  }

  const handleCopySummary = () => {
    const text = [
      `Subject: ${mail.subject}`,
      `From: ${mail.fromEmail}`,
      `Category: ${mail.category || 'N/A'}`,
      `Priority: ${mail.priority || 'N/A'}`,
      '',
      'AI Summary:',
      mail.aiSummary || 'Not triaged',
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: '✓ Summary kopiert' });
  };

  const hasDraft = (mail.draftText && mail.draftText.length > 0) || (mail.draftHtml && mail.draftHtml.length > 0);
  const isTriaged = mail.status !== 'NEW';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(233,215,196,0.08)' }}>
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-semibold pr-4" style={{ color: 'rgba(255,255,255,0.95)' }}>
            {mail.subject || '(Kein Betreff)'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
            <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {mail.fromEmail}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(mail.receivedAt), 'dd.MM.yyyy HH:mm')}
          </span>
          <StatusBadge status={mail.status} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {mail.status === 'NEW' && (
            <ActionButton 
              icon={Sparkles} 
              label={isTriaging ? 'Triaging...' : 'Triage / Draft erstellen'} 
              onClick={onTriage}
              variant="primary"
              disabled={isTriaging}
            />
          )}
          {isTriaged && hasDraft && mail.status !== 'SENT' && mail.status !== 'APPROVED' && (
            <ActionButton 
              icon={CheckCircle} 
              label="Approve" 
              onClick={onApprove}
              variant="success"
            />
          )}
          {(mail.status === 'APPROVED' || (isTriaged && hasDraft && mail.status !== 'SENT')) && (
            <ActionButton 
              icon={Send} 
              label={isSending ? 'Sending...' : 'Approve & Send'} 
              onClick={onSend}
              variant="primary"
              disabled={isSending}
            />
          )}
          <ActionButton icon={Copy} label="Copy Summary" onClick={handleCopySummary} />
          <ActionButton icon={Archive} label="Archive" onClick={() => toast({ title: '🗄️ Coming soon' })} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(233,215,196,0.06)' }}>
        <TabButton active={activeTab === 'mail'} onClick={() => setActiveTab('mail')} label="Mail" icon={Mail} />
        <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} label="AI" icon={Sparkles} disabled={!isTriaged} />
        <TabButton active={activeTab === 'draft'} onClick={() => setActiveTab('draft')} label="Draft" icon={FileText} disabled={!hasDraft} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'mail' && (
            <motion.div key="mail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {mail.bodyHtml ? (
                <iframe
                  sandbox=""
                  srcDoc={mail.bodyHtml}
                  className="w-full min-h-[400px] rounded-lg"
                  style={{ background: 'white', border: '1px solid rgba(233,215,196,0.1)' }}
                  title="Email Content"
                />
              ) : (
                <div 
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}
                >
                  {mail.bodyText || mail.snippet || 'Kein Inhalt verfügbar'}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Category" value={mail.category || '—'} color={mail.category ? CATEGORY_CONFIG[mail.category]?.color : undefined} />
                <InfoCard label="Priority" value={mail.priority || '—'} color={mail.priority ? PRIORITY_CONFIG[mail.priority]?.color : undefined} />
                <InfoCard label="Action" value={mail.aiAction || '—'} />
                <InfoCard label="Confidence" value={mail.aiConfidence ? `${Math.round(mail.aiConfidence * 100)}%` : '—'} />
              </div>

              {/* Summary */}
              <div 
                className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(233,215,196,0.08)' }}
              >
                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  AI Summary
                </h4>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                  {mail.aiSummary || 'Noch nicht triaged'}
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'draft' && (
            <motion.div key="draft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Subject */}
              <div>
                <label className="text-xs font-semibold uppercase mb-1 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Subject
                </label>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {mail.draftSubject || `Re: ${mail.subject}`}
                </p>
              </div>

              {/* HTML Preview */}
              {mail.draftHtml ? (
                <div>
                  <label className="text-xs font-semibold uppercase mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    HTML Preview
                  </label>
                  <iframe
                    sandbox=""
                    srcDoc={mail.draftHtml}
                    className="w-full min-h-[400px] rounded-lg"
                    style={{ background: 'white', border: '1px solid rgba(233,215,196,0.1)' }}
                    title="Draft Preview"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold uppercase mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Text
                  </label>
                  <div 
                    className="text-sm whitespace-pre-wrap p-4 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)' }}
                  >
                    {mail.draftText || 'Kein Draft verfügbar'}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ActionButton({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'default',
  disabled = false
}: { 
  icon: any; 
  label: string; 
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success';
  disabled?: boolean;
}) {
  const styles = {
    default: { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: 'transparent' },
    primary: { bg: 'rgba(254,145,0,0.1)', color: '#FE9100', border: 'rgba(254,145,0,0.2)' },
    success: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'rgba(16,185,129,0.2)' },
  };
  const style = styles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-40"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function TabButton({ 
  active, 
  onClick, 
  label,
  icon: Icon,
  disabled = false
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string;
  icon: any;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all -mb-px disabled:opacity-40"
      style={{
        color: active ? '#FE9100' : 'rgba(255,255,255,0.5)',
        borderBottom: active ? '2px solid #FE9100' : '2px solid transparent',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div 
      className="p-3 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(233,215,196,0.06)' }}
    >
      <p className="text-[10px] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: color || 'rgba(255,255,255,0.9)' }}>{value}</p>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function MailsPage() {
  const [activeStatus, setActiveStatus] = useState<MailStatus>('NEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMailId, setSelectedMailId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch mail list
  const { data: listData, isLoading: listLoading, refetch } = useQuery({
    queryKey: ['mails-list', activeStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('status', activeStatus);
      if (searchQuery) params.set('q', searchQuery);
      params.set('limit', '50');
      
      const res = await fetch(`/api/internal/mail/inbound?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch counts
  const { data: counts } = useQuery({
    queryKey: ['mails-counts'],
    queryFn: async () => {
      const res = await fetch('/api/internal/mail/inbound/count', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Fetch selected mail detail
  const { data: selectedMail } = useQuery({
    queryKey: ['mail-detail', selectedMailId],
    queryFn: async () => {
      if (!selectedMailId) return null;
      const res = await fetch(`/api/internal/mail/inbound/${selectedMailId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return json.data as MailItem;
    },
    enabled: !!selectedMailId,
  });

  // Triage mutation
  const triageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/internal/mail/inbound/${id}/triage`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Triage failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails-list'] });
      queryClient.invalidateQueries({ queryKey: ['mail-detail', selectedMailId] });
      queryClient.invalidateQueries({ queryKey: ['mails-counts'] });
      toast({ title: '✓ Triage abgeschlossen' });
    },
    onError: (err: any) => {
      toast({ title: 'Triage fehlgeschlagen', description: err.message, variant: 'destructive' });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/internal/mail/inbound/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Approve failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails-list'] });
      queryClient.invalidateQueries({ queryKey: ['mail-detail', selectedMailId] });
      toast({ title: '✓ Approved' });
    },
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/internal/mail/inbound/${id}/send`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Send failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mails-list'] });
      queryClient.invalidateQueries({ queryKey: ['mail-detail', selectedMailId] });
      queryClient.invalidateQueries({ queryKey: ['mails-counts'] });
      toast({ title: '✓ E-Mail gesendet!' });
    },
    onError: (err: any) => {
      toast({ title: 'Senden fehlgeschlagen', description: err.message, variant: 'destructive' });
    },
  });

  const mails: MailItem[] = listData?.data || [];
  const mailCounts = counts?.counts || {};

  return (
    <InternalLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 
              className="text-2xl font-bold mb-1"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              INBOUND · MAIL
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              AI-gestütztes E-Mail Triage & Response System
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#10B981' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#10B981' }} />
              </span>
              <span className="text-[10px] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Live</span>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 rounded-2xl overflow-hidden flex"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(233,215,196,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Left: List Panel */}
          <div className="w-[400px] flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid rgba(233,215,196,0.06)' }}>
            {/* Search + Filters */}
            <div className="p-4 space-y-3" style={{ borderBottom: '1px solid rgba(233,215,196,0.06)' }}>
              {/* Search */}
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(233,215,196,0.08)' }}
              >
                <Search className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suchen..."
                  className="bg-transparent outline-none text-sm flex-1"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    onClick={() => { setActiveStatus(status); setSelectedMailId(null); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: activeStatus === status ? STATUS_CONFIG[status].bg : 'transparent',
                      color: activeStatus === status ? STATUS_CONFIG[status].color : 'rgba(255,255,255,0.5)',
                      border: activeStatus === status ? `1px solid ${STATUS_CONFIG[status].color}30` : '1px solid transparent',
                    }}
                  >
                    {STATUS_CONFIG[status].label}
                    {mailCounts[status] > 0 && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {mailCounts[status]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Mail List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {listLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
              ) : mails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Inbox className="w-12 h-12 mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Keine {STATUS_CONFIG[activeStatus].label} E-Mails
                  </p>
                </div>
              ) : (
                mails.map((mail) => (
                  <MailListItem
                    key={mail.id}
                    mail={mail}
                    isSelected={selectedMailId === mail.id}
                    onClick={() => setSelectedMailId(mail.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Detail Panel */}
          <DetailPanel
            mail={selectedMail || null}
            onTriage={() => selectedMailId && triageMutation.mutate(selectedMailId)}
            onApprove={() => selectedMailId && approveMutation.mutate(selectedMailId)}
            onSend={() => selectedMailId && sendMutation.mutate(selectedMailId)}
            onClose={() => setSelectedMailId(null)}
            isTriaging={triageMutation.isPending}
            isSending={sendMutation.isPending}
          />
        </motion.div>
      </div>
    </InternalLayout>
  );
}
