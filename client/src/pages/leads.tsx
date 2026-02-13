/**
 * ============================================================================
 * WISSENSDATENBANK — ARAS AI Knowledge Base
 * ============================================================================
 * Premium ARAS CI design: no icons, Orbitron headlines, glass cards.
 * All user data visible & editable. Re-analysis modal included.
 * Voice-sync safe: everything here feeds directly into the telephony AI.
 * ============================================================================
 */
import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// ============================================================================
// TYPES
// ============================================================================

interface DataSource {
  id: number;
  userId: string;
  type: string;
  title: string;
  status: string;
  contentText: string;
  url: string;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileCtx {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  website: string | null;
  industry: string | null;
  jobRole: string | null;
  phone: string | null;
  aiProfile: any;
  profileEnriched: boolean;
  enrichmentStatus: string | null;
  lastEnrichmentDate: string | null;
}

// ============================================================================
// STYLE CONSTANTS (ARAS CI — no icons, glass, Orbitron headlines)
// ============================================================================

const CARD = "relative rounded-[20px] border border-white/[0.07] bg-[rgba(8,8,12,0.7)] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]";
const ACCENT = '#FE9100';
const GOLD = '#e9d7c4';
const orbitron: React.CSSProperties = { fontFamily: "'Orbitron', system-ui, sans-serif", fontWeight: 800, letterSpacing: '0.04em' };

// ============================================================================
// HELPERS
// ============================================================================

const trim = (v: any): string => (typeof v === 'string' ? v.trim() : '');
const arr = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean) : []);

// Normalize ANY data-sources response shape to a safe array
function normalizeDataSources(raw: any): DataSource[] {
  if (!raw) return [];
  const found =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.dataSources) ? raw.dataSources :
    Array.isArray(raw?.sources) ? raw.sources :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.userDataSources) ? raw.userDataSources :
    Array.isArray(raw?.data) ? raw.data :
    [];
  return found.filter(Boolean).map((s: any) => ({
    id: s.id ?? s.source_id ?? 0,
    userId: s.userId ?? s.user_id ?? '',
    type: s.type ?? 'text',
    title: s.title ?? '',
    status: s.status ?? 'active',
    contentText: s.contentText ?? s.content_text ?? s.content_preview ?? '',
    url: s.url ?? '',
    fileName: s.fileName ?? s.file_name ?? null,
    createdAt: s.createdAt ?? s.created_at ?? '',
    updatedAt: s.updatedAt ?? s.updated_at ?? '',
  }));
}

const fmtDate = (v: string | Date | null | undefined): string => {
  if (!v) return '—';
  try {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? '—' : format(d, 'dd.MM.yyyy', { locale: de });
  } catch { return '—'; }
};

const fmtAgo = (v: string | Date | null | undefined): string => {
  if (!v) return '—';
  try {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { locale: de, addSuffix: true });
  } catch { return '—'; }
};

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

class LeadsErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[LEADS] ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className={CARD + " p-8 max-w-md text-center"}>
            <h2 className="text-lg font-semibold text-white mb-2" style={orbitron}>Fehler aufgetreten</h2>
            <p className="text-sm text-white/50 mb-4">Die Wissensdatenbank konnte nicht geladen werden.</p>
            <pre className="text-xs text-red-300/70 bg-black/40 p-3 rounded-xl border border-red-500/20 overflow-auto max-h-24 mb-4 text-left">
              {this.state.error?.message || 'Unbekannter Fehler'}
            </pre>
            <button onClick={() => window.location.reload()} className="px-5 py-2 rounded-full text-sm font-semibold border border-[#FE9100]/30 text-[#e9d7c4] hover:bg-[#FE9100]/10 transition-colors">
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// FIELD ROW — reusable label + value / input
// ============================================================================

function FieldRow({ label, value, editing, editValue, onChange, placeholder, multiline, error }: {
  label: string; value: string; editing: boolean; editValue?: string;
  onChange?: (v: string) => void; placeholder?: string; multiline?: boolean; error?: string;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1.5">{label}</div>
      {editing ? (
        <>
          {multiline ? (
            <Textarea
              value={editValue ?? ''}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              className="bg-white/[0.04] border-white/[0.10] text-white/90 text-sm rounded-xl min-h-[80px] focus:border-[#FE9100]/40 focus:ring-[#FE9100]/20"
            />
          ) : (
            <Input
              value={editValue ?? ''}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={placeholder}
              className="bg-white/[0.04] border-white/[0.10] text-white/90 text-sm rounded-xl h-9 focus:border-[#FE9100]/40 focus:ring-[#FE9100]/20"
            />
          )}
          {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
        </>
      ) : (
        <div className="text-sm text-white/80 leading-relaxed break-words whitespace-pre-wrap">
          {value || <span className="text-white/25 italic">Nicht angegeben</span>}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SECTION CARD — glass card with section title + edit toggle
// ============================================================================

function SectionCard({ title, children, editing, onToggleEdit, onSave, onCancel, saving, className = '' }: {
  title: string; children: ReactNode; editing?: boolean;
  onToggleEdit?: () => void; onSave?: () => void; onCancel?: () => void;
  saving?: boolean; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
      className={CARD + " p-5 " + className}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${GOLD})` }} />
          <h3 className="text-[13px]" style={{ ...orbitron, color: GOLD }}>{title}</h3>
        </div>
        {onToggleEdit && !editing && (
          <button onClick={onToggleEdit} className="text-[11px] tracking-wide uppercase text-white/35 hover:text-[#FE9100] transition-colors font-semibold">
            Bearbeiten
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-3">
            <button onClick={onCancel} className="text-[11px] tracking-wide uppercase text-white/35 hover:text-white/60 transition-colors font-semibold">
              Abbrechen
            </button>
            <button onClick={onSave} disabled={saving} className="text-[11px] tracking-wide uppercase font-semibold transition-colors" style={{ color: ACCENT }}>
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function LeadsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── State ──
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});
  const [aiForm, setAiForm] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  // ── Data Fetching ──
  const { data: profileCtx, isLoading: profileLoading } = useQuery<ProfileCtx>({
    queryKey: ['/api/user/profile-context'],
    staleTime: 30_000,
    retry: 1,
  });

  const { data: dataSources = [], isLoading: sourcesLoading } = useQuery<DataSource[]>({
    queryKey: ['/api/user/data-sources'],
    queryFn: async () => {
      const res = await fetch('/api/user/data-sources', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load data sources');
      const json = await res.json();
      return normalizeDataSources(json);
    },
    staleTime: 30_000,
    retry: 1,
  });

  const { data: digestData } = useQuery<{ digest: string; sourceCount: number }>({
    queryKey: ['/api/user/knowledge/digest', 'space'],
    queryFn: async () => {
      const res = await fetch('/api/user/knowledge/digest?mode=space', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load digest');
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: subData } = useQuery<any>({
    queryKey: ['/api/user/subscription'],
    staleTime: 60_000,
    retry: false,
  });

  const ai = profileCtx?.aiProfile || {};

  // ── Mutations ──
  const profileMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await fetch('/api/user/profile', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, ...data };
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/user/profile-context'] });
      qc.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: 'Profil aktualisiert', description: 'Änderungen gespeichert.' });
      setEditingSection(null);
      setFieldErrors({});
      setTopError('');
    },
    onError: (err: any) => {
      if (err.code === 'USERNAME_TAKEN') {
        setFieldErrors({ username: err.message });
      } else if (err.code === 'EMAIL_TAKEN') {
        setFieldErrors({ email: err.message });
      } else if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setTopError(err.message || 'Fehler beim Speichern.');
      }
    },
  });

  const aiProfileMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await fetch('/api/user/ai-profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/user/profile-context'] });
      qc.invalidateQueries({ queryKey: ['/api/user/knowledge/digest'] });
      toast({ title: 'Wissensdatenbank aktualisiert' });
      setEditingSection(null);
    },
    onError: () => { setTopError('Fehler beim Speichern der Business-Daten.'); },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/user/data-sources/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/user/data-sources'] });
      qc.invalidateQueries({ queryKey: ['/api/user/knowledge/digest'] });
      toast({ title: 'Quelle gelöscht' });
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: async (body: { type: string; title: string; contentText?: string; url?: string }) => {
      const res = await fetch('/api/user/data-sources', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Add failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/user/data-sources'] });
      qc.invalidateQueries({ queryKey: ['/api/user/knowledge/digest'] });
      setShowAddSource(false);
      toast({ title: 'Quelle hinzugefügt' });
    },
  });

  // ── Edit helpers ──
  const startEdit = useCallback((section: string) => {
    setFieldErrors({});
    setTopError('');
    if (section === 'account') {
      setProfileForm({
        username: user?.username || '',
        email: (user as any)?.email || '',
        firstName: (user as any)?.firstName || '',
        lastName: (user as any)?.lastName || '',
      });
    } else if (section === 'company') {
      setProfileForm({
        username: user?.username || '',
        email: (user as any)?.email || '',
        firstName: (user as any)?.firstName || '',
        lastName: (user as any)?.lastName || '',
        company: profileCtx?.company || '',
        website: profileCtx?.website || '',
        industry: profileCtx?.industry || '',
        jobRole: profileCtx?.jobRole || '',
        phone: profileCtx?.phone || '',
      });
    } else if (section === 'business' || section === 'deep') {
      setAiForm({ ...ai });
    }
    setEditingSection(section);
  }, [user, profileCtx, ai]);

  const saveProfile = useCallback(() => {
    profileMutation.mutate({
      username: profileForm.username,
      email: profileForm.email,
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      company: profileForm.company || (profileCtx?.company ?? ''),
      website: profileForm.website || (profileCtx?.website ?? ''),
      industry: profileForm.industry || (profileCtx?.industry ?? ''),
      jobRole: profileForm.jobRole || (profileCtx?.jobRole ?? ''),
      phone: profileForm.phone || (profileCtx?.phone ?? ''),
    });
  }, [profileForm, profileCtx, profileMutation]);

  const saveCompany = useCallback(() => {
    profileMutation.mutate({
      username: user?.username || '',
      email: (user as any)?.email || '',
      firstName: (user as any)?.firstName || '',
      lastName: (user as any)?.lastName || '',
      company: profileForm.company,
      website: profileForm.website,
      industry: profileForm.industry,
      jobRole: profileForm.jobRole,
      phone: profileForm.phone,
    });
  }, [profileForm, user, profileMutation]);

  const saveAiProfile = useCallback(() => {
    aiProfileMutation.mutate(aiForm);
  }, [aiForm, aiProfileMutation]);

  // ── Loading state ──
  if (profileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#FE9100]/30 border-t-[#FE9100] animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/40" style={orbitron}>Wissensdatenbank laden...</p>
        </div>
      </div>
    );
  }

  const plan = subData?.plan || (user as any)?.subscriptionPlan || 'starter';
  const enriched = profileCtx?.profileEnriched;
  const enrichStatus = ai?.enrichmentMeta?.status || ai?.enrichmentStatus || (enriched ? 'live_research' : 'fallback');
  const isEnriching = enrichStatus === 'queued' || enrichStatus === 'in_progress';

  // ── RENDER ──
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #050508 0%, #0a0a12 100%)' }}>
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ═══ HERO ═══ */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
          <h1 className="text-[28px] sm:text-[36px] leading-tight mb-2" style={{ ...orbitron, color: GOLD }}>
            Wissensdatenbank
          </h1>
          <p className="text-sm text-white/45 max-w-xl leading-relaxed">
            Alles, was ARAS über dich und dein Business weiß. Jede Änderung hier fließt direkt in deine Telefon-KI ein.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => setShowAnalysisModal(true)}
              className="px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all"
              style={{
                border: `1.5px solid ${ACCENT}40`,
                background: `linear-gradient(180deg, ${ACCENT}18, transparent)`,
                color: '#fff',
                boxShadow: `0 0 20px ${ACCENT}15`,
              }}
            >
              Business neu analysieren
            </button>
            <button
              onClick={() => setShowAddSource(true)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide border border-white/[0.12] text-white/70 hover:text-white/90 hover:border-white/20 transition-all"
            >
              Quelle hinzufügen
            </button>
          </div>
          {/* Enrichment Status Pill */}
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{
              background: isEnriching ? '#FFA500' : enrichStatus === 'live_research' ? '#22c55e' : '#ef4444',
              boxShadow: isEnriching ? '0 0 8px #FFA50060' : enrichStatus === 'live_research' ? '0 0 8px #22c55e40' : '0 0 8px #ef444440',
            }} />
            <span className="text-[11px] text-white/40 tracking-wide uppercase font-semibold">
              {isEnriching ? 'Analyse läuft...' : enrichStatus === 'live_research' ? 'Analysiert' : 'Basis-Profil'}
            </span>
            {profileCtx?.lastEnrichmentDate && (
              <span className="text-[10px] text-white/25 ml-1">— {fmtAgo(profileCtx.lastEnrichmentDate)}</span>
            )}
          </div>
        </motion.div>

        {/* ═══ TOP ERROR BANNER ═══ */}
        <AnimatePresence>
          {topError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center justify-between"
            >
              <span className="text-sm text-red-300">{topError}</span>
              <button onClick={() => setTopError('')} className="text-xs text-red-400/60 hover:text-red-300 ml-4 font-semibold">Schließen</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── ACCOUNT ── */}
          <SectionCard
            title="Account & Zugriff"
            editing={editingSection === 'account'}
            onToggleEdit={() => startEdit('account')}
            onSave={saveProfile}
            onCancel={() => setEditingSection(null)}
            saving={profileMutation.isPending}
          >
            <FieldRow label="Username" value={user?.username || ''} editing={editingSection === 'account'}
              editValue={profileForm.username} onChange={(v) => setProfileForm(p => ({ ...p, username: v }))}
              placeholder="Username" error={fieldErrors.username} />
            <FieldRow label="E-Mail" value={(user as any)?.email || ''} editing={editingSection === 'account'}
              editValue={profileForm.email} onChange={(v) => setProfileForm(p => ({ ...p, email: v }))}
              placeholder="email@beispiel.de" error={fieldErrors.email} />
            <FieldRow label="Vorname" value={(user as any)?.firstName || ''} editing={editingSection === 'account'}
              editValue={profileForm.firstName} onChange={(v) => setProfileForm(p => ({ ...p, firstName: v }))}
              placeholder="Vorname" />
            <FieldRow label="Nachname" value={(user as any)?.lastName || ''} editing={editingSection === 'account'}
              editValue={profileForm.lastName} onChange={(v) => setProfileForm(p => ({ ...p, lastName: v }))}
              placeholder="Nachname" />
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/[0.06]">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Plan</div>
                <div className="text-sm font-semibold" style={{ color: ACCENT }}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Erstellt</div>
                <div className="text-sm text-white/60">{fmtDate((user as any)?.createdAt)}</div>
              </div>
            </div>
          </SectionCard>

          {/* ── COMPANY ── */}
          <SectionCard
            title="Unternehmensprofil"
            editing={editingSection === 'company'}
            onToggleEdit={() => startEdit('company')}
            onSave={saveCompany}
            onCancel={() => setEditingSection(null)}
            saving={profileMutation.isPending}
          >
            <FieldRow label="Firmenname" value={profileCtx?.company || ''} editing={editingSection === 'company'}
              editValue={profileForm.company} onChange={(v) => setProfileForm(p => ({ ...p, company: v }))}
              placeholder="ARAS AI GmbH" />
            <FieldRow label="Website" value={profileCtx?.website || ''} editing={editingSection === 'company'}
              editValue={profileForm.website} onChange={(v) => setProfileForm(p => ({ ...p, website: v }))}
              placeholder="https://aras-ai.com" />
            <FieldRow label="Branche" value={profileCtx?.industry || ''} editing={editingSection === 'company'}
              editValue={profileForm.industry} onChange={(v) => setProfileForm(p => ({ ...p, industry: v }))}
              placeholder="Technology / SaaS" />
            <FieldRow label="Position / Rolle" value={profileCtx?.jobRole || ''} editing={editingSection === 'company'}
              editValue={profileForm.jobRole} onChange={(v) => setProfileForm(p => ({ ...p, jobRole: v }))}
              placeholder="CEO, Sales Manager, ..." />
            <FieldRow label="Telefon" value={profileCtx?.phone || ''} editing={editingSection === 'company'}
              editValue={profileForm.phone} onChange={(v) => setProfileForm(p => ({ ...p, phone: v }))}
              placeholder="+43 ..." />
          </SectionCard>

          {/* ── BUSINESS INTELLIGENCE ── */}
          <SectionCard
            title="Business Intelligence"
            editing={editingSection === 'business'}
            onToggleEdit={() => startEdit('business')}
            onSave={saveAiProfile}
            onCancel={() => setEditingSection(null)}
            saving={aiProfileMutation.isPending}
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <FieldRow label="Unternehmensbeschreibung" value={trim(ai.companyDescription)} editing={editingSection === 'business'}
                editValue={aiForm.companyDescription} onChange={(v) => setAiForm(p => ({ ...p, companyDescription: v }))}
                placeholder="Was macht dein Unternehmen?" multiline />
              <FieldRow label="Zielgruppe" value={trim(ai.targetAudience)} editing={editingSection === 'business'}
                editValue={aiForm.targetAudience} onChange={(v) => setAiForm(p => ({ ...p, targetAudience: v }))}
                placeholder="Wer sind eure Kunden?" multiline />
              <FieldRow label="Produkte / Services" value={arr(ai.products).join(', ') || arr(ai.services).join(', ')} editing={editingSection === 'business'}
                editValue={(aiForm.products || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, products: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                placeholder="Produkt A, Service B, ..." />
              <FieldRow label="Alleinstellungsmerkmale (USP)" value={arr(ai.uniqueSellingPoints).join(' · ')} editing={editingSection === 'business'}
                editValue={(aiForm.uniqueSellingPoints || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, uniqueSellingPoints: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                placeholder="USP 1, USP 2, ..." />
              <FieldRow label="Wertversprechen" value={trim(ai.valueProp)} editing={editingSection === 'business'}
                editValue={aiForm.valueProp} onChange={(v) => setAiForm(p => ({ ...p, valueProp: v }))}
                placeholder="Euer Hauptversprechen" />
              <FieldRow label="Wettbewerber" value={arr(ai.competitors).join(', ')} editing={editingSection === 'business'}
                editValue={(aiForm.competitors || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, competitors: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                placeholder="Firma X, Firma Y, ..." />
              <FieldRow label="Brand Voice / Tonalität" value={trim(ai.brandVoice)} editing={editingSection === 'business'}
                editValue={aiForm.brandVoice} onChange={(v) => setAiForm(p => ({ ...p, brandVoice: v }))}
                placeholder="Professionell, freundlich, direkt..." multiline />
              <FieldRow label="Effektive Keywords" value={arr(ai.effectiveKeywords).join(', ')} editing={editingSection === 'business'}
                editValue={(aiForm.effectiveKeywords || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, effectiveKeywords: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                placeholder="Keyword 1, Keyword 2, ..." />
            </div>
          </SectionCard>

          {/* ── DEEP INTELLIGENCE ── */}
          <SectionCard
            title="Tiefe Analyse"
            editing={editingSection === 'deep'}
            onToggleEdit={() => startEdit('deep')}
            onSave={saveAiProfile}
            onCancel={() => setEditingSection(null)}
            saving={aiProfileMutation.isPending}
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
              <FieldRow label="Gründungsjahr" value={String(ai.foundedYear || '')} editing={editingSection === 'deep'}
                editValue={String(aiForm.foundedYear || '')} onChange={(v) => setAiForm(p => ({ ...p, foundedYear: v }))} placeholder="2024" />
              <FieldRow label="CEO / Geschäftsführung" value={trim(ai.ceoName)} editing={editingSection === 'deep'}
                editValue={aiForm.ceoName || ''} onChange={(v) => setAiForm(p => ({ ...p, ceoName: v }))} placeholder="Max Mustermann" />
              <FieldRow label="Mitarbeiterzahl" value={String(ai.employeeCount || '')} editing={editingSection === 'deep'}
                editValue={String(aiForm.employeeCount || '')} onChange={(v) => setAiForm(p => ({ ...p, employeeCount: v }))} placeholder="50" />
              <FieldRow label="Umsatz" value={trim(ai.revenue)} editing={editingSection === 'deep'}
                editValue={aiForm.revenue || ''} onChange={(v) => setAiForm(p => ({ ...p, revenue: v }))} placeholder="~5M EUR" />
              <FieldRow label="Funding" value={trim(ai.fundingInfo)} editing={editingSection === 'deep'}
                editValue={aiForm.fundingInfo || ''} onChange={(v) => setAiForm(p => ({ ...p, fundingInfo: v }))} placeholder="Series A, ..." />
              <FieldRow label="Online-Präsenz" value={trim(ai.onlinePresence)} editing={editingSection === 'deep'}
                editValue={aiForm.onlinePresence || ''} onChange={(v) => setAiForm(p => ({ ...p, onlinePresence: v }))} placeholder="Website, LinkedIn, ..." />
              <FieldRow label="Aktuelle Herausforderungen" value={arr(ai.currentChallenges).join(', ')} editing={editingSection === 'deep'}
                editValue={(aiForm.currentChallenges || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, currentChallenges: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
              <FieldRow label="Chancen / Opportunities" value={arr(ai.opportunities).join(', ')} editing={editingSection === 'deep'}
                editValue={(aiForm.opportunities || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, opportunities: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
              <FieldRow label="Entscheidungsträger" value={arr(ai.decisionMakers).join(', ')} editing={editingSection === 'deep'}
                editValue={(aiForm.decisionMakers || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, decisionMakers: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
              <FieldRow label="Sales Triggers" value={arr(ai.salesTriggers).join(', ')} editing={editingSection === 'deep'}
                editValue={(aiForm.salesTriggers || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, salesTriggers: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
              <FieldRow label="Beste Anrufzeiten" value={trim(ai.bestCallTimes)} editing={editingSection === 'deep'}
                editValue={aiForm.bestCallTimes || ''} onChange={(v) => setAiForm(p => ({ ...p, bestCallTimes: v }))} placeholder="Di-Do 10-12 Uhr" />
              <FieldRow label="Budget-Zyklen" value={trim(ai.budgetCycles)} editing={editingSection === 'deep'}
                editValue={aiForm.budgetCycles || ''} onChange={(v) => setAiForm(p => ({ ...p, budgetCycles: v }))} placeholder="Q1/Q3 Budget" />
            </div>

            {/* Personal Intelligence Sub-Section */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-white/25 mb-3">Persönliche Intelligenz</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <FieldRow label="Persönlichkeitstyp" value={trim(ai.personalityType)} editing={editingSection === 'deep'}
                  editValue={aiForm.personalityType || ''} onChange={(v) => setAiForm(p => ({ ...p, personalityType: v }))} placeholder="Analytisch, Direkt..." />
                <FieldRow label="Kommunikationsstil" value={trim(ai.communicationTone)} editing={editingSection === 'deep'}
                  editValue={aiForm.communicationTone || ''} onChange={(v) => setAiForm(p => ({ ...p, communicationTone: v }))} placeholder="Professional, casual..." />
                <FieldRow label="Entscheidungsstil" value={trim(ai.decisionMakingStyle)} editing={editingSection === 'deep'}
                  editValue={aiForm.decisionMakingStyle || ''} onChange={(v) => setAiForm(p => ({ ...p, decisionMakingStyle: v }))} placeholder="Datengetrieben..." />
                <FieldRow label="Pain Points" value={arr(ai.painPoints).join(', ')} editing={editingSection === 'deep'}
                  editValue={(aiForm.painPoints || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, painPoints: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
                <FieldRow label="Ziele" value={arr(ai.goals).join(', ')} editing={editingSection === 'deep'}
                  editValue={(aiForm.goals || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, goals: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
                <FieldRow label="Interessen" value={arr(ai.interests).join(', ')} editing={editingSection === 'deep'}
                  editValue={(aiForm.interests || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, interests: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
                <FieldRow label="Tech-Level" value={trim(ai.technicalLevel)} editing={editingSection === 'deep'}
                  editValue={aiForm.technicalLevel || ''} onChange={(v) => setAiForm(p => ({ ...p, technicalLevel: v }))} placeholder="Hoch / Mittel / Niedrig" />
                <FieldRow label="Prioritäten" value={arr(ai.priorityFocus).join(', ')} editing={editingSection === 'deep'}
                  editValue={(aiForm.priorityFocus || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, priorityFocus: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
                <FieldRow label="Erfolgsmetriken" value={arr(ai.successMetrics).join(', ')} editing={editingSection === 'deep'}
                  editValue={(aiForm.successMetrics || []).join(', ')} onChange={(v) => setAiForm(p => ({ ...p, successMetrics: v.split(',').map((s: string) => s.trim()).filter(Boolean) }))} placeholder="..." />
              </div>
            </div>

            {/* Custom Prompt */}
            {(ai.customSystemPrompt || editingSection === 'deep') && (
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <FieldRow label="Custom System Prompt" value={trim(ai.customSystemPrompt)} editing={editingSection === 'deep'}
                  editValue={aiForm.customSystemPrompt || ''} onChange={(v) => setAiForm(p => ({ ...p, customSystemPrompt: v }))}
                  placeholder="Eigene Anweisungen für die KI..." multiline />
              </div>
            )}
          </SectionCard>

          {/* ── USER FORM DATA (from re-analysis) ── */}
          {ai._userFormData && (
            <SectionCard title="Letzte Analyse-Eingaben" className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                {Object.entries(ai._userFormData as Record<string, any>).filter(([k]) => k !== 'submittedAt').map(([key, val]) => (
                  <FieldRow key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={String(val || '')} editing={false} />
                ))}
              </div>
              {ai._userFormData.submittedAt && (
                <div className="text-[10px] text-white/20 mt-3">Eingereicht: {fmtAgo(ai._userFormData.submittedAt)}</div>
              )}
            </SectionCard>
          )}

          {/* ── DATA SOURCES ── */}
          <SectionCard title={`Datenquellen (${dataSources.length})`} className="lg:col-span-2">
            {sourcesLoading ? (
              <div className="text-sm text-white/30 py-4">Laden...</div>
            ) : dataSources.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-white/30 mb-3">Noch keine Datenquellen hinzugefügt.</p>
                <button onClick={() => setShowAddSource(true)} className="text-xs font-semibold tracking-wide uppercase" style={{ color: ACCENT }}>
                  Erste Quelle hinzufügen
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {dataSources.map((src) => {
                  const isExpanded = expandedSources.has(src.id);
                  return (
                    <div key={src.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border"
                              style={{ borderColor: src.type === 'url' ? '#3b82f620' : src.type === 'text' ? '#22c55e20' : '#a855f720',
                                       color: src.type === 'url' ? '#60a5fa' : src.type === 'text' ? '#4ade80' : '#c084fc' }}>
                              {src.type}
                            </span>
                            <span className="text-sm text-white/80 font-medium truncate">{src.title || 'Ohne Titel'}</span>
                          </div>
                          {src.url && <div className="text-xs text-white/30 truncate">{src.url}</div>}
                          <div className="text-[10px] text-white/20 mt-1">{fmtAgo(src.updatedAt)}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {src.contentText && (
                            <button onClick={() => setExpandedSources(prev => {
                              const next = new Set(prev);
                              isExpanded ? next.delete(src.id) : next.add(src.id);
                              return next;
                            })} className="text-[10px] font-semibold tracking-wide uppercase text-white/30 hover:text-white/60 transition-colors">
                              {isExpanded ? 'Ausblenden' : 'Anzeigen'}
                            </button>
                          )}
                          <button onClick={() => { if (confirm('Quelle wirklich löschen?')) deleteSourceMutation.mutate(src.id); }}
                            className="text-[10px] font-semibold tracking-wide uppercase text-red-400/50 hover:text-red-400 transition-colors">
                            Löschen
                          </button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && src.contentText && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <pre className="mt-3 p-3 rounded-lg bg-black/30 border border-white/[0.04] text-xs text-white/50 whitespace-pre-wrap max-h-[200px] overflow-auto">
                              {src.contentText}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* ── CONTEXT PREVIEW ── */}
          <SectionCard title="KI-Kontext Vorschau" className="lg:col-span-2">
            <p className="text-[10px] text-white/25 mb-3 tracking-wide uppercase font-semibold">
              Das sieht die Telefon-KI bei jedem Anruf
            </p>
            {digestData?.digest ? (
              <div className="relative">
                <pre className="p-4 rounded-xl bg-black/40 border border-white/[0.04] text-xs text-white/50 whitespace-pre-wrap max-h-[300px] overflow-auto leading-relaxed font-mono">
                  {digestData.digest}
                </pre>
                <button onClick={() => { navigator.clipboard.writeText(digestData.digest); toast({ title: 'Kopiert!' }); }}
                  className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide text-white/25 hover:text-[#FE9100] transition-colors">
                  Kopieren
                </button>
              </div>
            ) : (
              <div className="text-sm text-white/25 italic py-4">Kein Kontext verfügbar. Füge Daten hinzu oder starte eine Analyse.</div>
            )}
            {digestData?.sourceCount !== undefined && (
              <div className="mt-2 text-[10px] text-white/20">{digestData.sourceCount} Quellen · {digestData.digest?.length || 0} Zeichen</div>
            )}
          </SectionCard>

          {/* ── USAGE & SUBSCRIPTION ── */}
          <SectionCard title="Nutzung & Plan">
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Plan</div>
                <div className="text-sm font-bold" style={{ color: ACCENT }}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
              </div>
              {subData?.usage?.aiMessages !== undefined && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">KI-Nachrichten</div>
                  <div className="text-sm text-white/70">{subData.usage.aiMessages.used} / {subData.usage.aiMessages.limit}</div>
                </div>
              )}
              {subData?.usage?.voiceCalls !== undefined && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Voice Calls</div>
                  <div className="text-sm text-white/70">{subData.usage.voiceCalls.used} / {subData.usage.voiceCalls.limit}</div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── ENRICHMENT META ── */}
          <SectionCard title="Analyse-Status">
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Status</div>
                <div className="text-sm text-white/70">{
                  enrichStatus === 'live_research' ? 'Live Research abgeschlossen' :
                  enrichStatus === 'queued' ? 'In Warteschlange' :
                  enrichStatus === 'in_progress' ? 'Wird analysiert...' :
                  'Basis-Profil (Fallback)'
                }</div>
              </div>
              {ai.enrichmentMeta?.confidence && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Konfidenz</div>
                  <div className="text-sm text-white/70 capitalize">{ai.enrichmentMeta.confidence}</div>
                </div>
              )}
              {ai.enrichmentMeta?.attempts !== undefined && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Versuche</div>
                  <div className="text-sm text-white/70">{ai.enrichmentMeta.attempts}</div>
                </div>
              )}
              {ai.enrichmentErrorCode && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Letzter Fehler</div>
                  <div className="text-sm text-red-400/70">{ai.enrichmentErrorCode}</div>
                </div>
              )}
              <div>
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">Letzte Aktualisierung</div>
                <div className="text-sm text-white/60">{fmtAgo(ai.lastUpdated || profileCtx?.lastEnrichmentDate)}</div>
              </div>
            </div>
          </SectionCard>

        </div>

        {/* ═══ RE-ANALYSIS MODAL ═══ */}
        <AnalysisModal open={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} profileCtx={profileCtx} ai={ai} />

        {/* ═══ ADD SOURCE DIALOG ═══ */}
        <AddSourceDialog open={showAddSource} onClose={() => setShowAddSource(false)} onAdd={(data) => addSourceMutation.mutate(data)} saving={addSourceMutation.isPending} />

      </div>
    </div>
  );
}

// ============================================================================
// ANALYSIS MODAL — Business Re-Analysis
// ============================================================================

function AnalysisModal({ open, onClose, profileCtx, ai }: { open: boolean; onClose: () => void; profileCtx: ProfileCtx | undefined; ai: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        companyName: profileCtx?.company || '',
        website: profileCtx?.website || '',
        industry: profileCtx?.industry || '',
        region: ai?._userFormData?.region || '',
        offer: trim(ai?.companyDescription) || '',
        targetAudience: trim(ai?.targetAudience) || '',
        usp: arr(ai?.uniqueSellingPoints).join(', ') || '',
        pricing: ai?._userFormData?.pricing || '',
        objections: ai?._userFormData?.objections || '',
        faq: ai?._userFormData?.faq || '',
        compliance: ai?._userFormData?.compliance || '',
        tone: trim(ai?.brandVoice) || '',
        competitors: arr(ai?.competitors).join(', ') || '',
        callGoal: ai?._userFormData?.callGoal || '',
        doNotSay: ai?._userFormData?.doNotSay || '',
      });
      setStatus('idle');
      setErrorMsg('');
    }
  }, [open, profileCtx, ai]);

  const handleSubmit = async () => {
    if (!form.companyName?.trim()) {
      setErrorMsg('Firmenname ist erforderlich.');
      return;
    }
    setStatus('running');
    setErrorMsg('');
    try {
      const res = await fetch('/api/user/business-analysis', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Analyse fehlgeschlagen');
      setStatus('done');
      toast({ title: 'Analyse abgeschlossen', description: data.message });
      // Refresh all data
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['/api/user/profile-context'] });
        qc.invalidateQueries({ queryKey: ['/api/user/knowledge/digest'] });
        qc.invalidateQueries({ queryKey: ['/api/auth/me'] });
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Unbekannter Fehler');
    }
  };

  const fields: { key: string; label: string; multi?: boolean; required?: boolean }[] = [
    { key: 'companyName', label: 'Firmenname', required: true },
    { key: 'website', label: 'Website' },
    { key: 'industry', label: 'Branche' },
    { key: 'region', label: 'Region / Markt' },
    { key: 'offer', label: 'Angebot / Beschreibung', multi: true },
    { key: 'targetAudience', label: 'Zielgruppe', multi: true },
    { key: 'usp', label: 'USPs (kommagetrennt)' },
    { key: 'pricing', label: 'Preise / Pakete', multi: true },
    { key: 'tone', label: 'Tonalität / Sprache' },
    { key: 'competitors', label: 'Wettbewerber (kommagetrennt)' },
    { key: 'callGoal', label: 'Anruf-Ziel', multi: true },
    { key: 'objections', label: 'Häufige Einwände', multi: true },
    { key: 'faq', label: 'FAQ', multi: true },
    { key: 'compliance', label: 'Compliance / No-Gos', multi: true },
    { key: 'doNotSay', label: 'Nicht sagen (Do-Not-Say)', multi: true },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && status !== 'running') onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0f] border-white/[0.08]" style={{ borderRadius: 22 }}>
        <DialogHeader>
          <DialogTitle className="text-lg" style={{ ...orbitron, color: GOLD }}>Business neu analysieren</DialogTitle>
          <DialogDescription className="text-white/40 text-sm">
            Fülle die Felder aus. ARAS analysiert dein Business und aktualisiert die Wissensdatenbank.
          </DialogDescription>
        </DialogHeader>

        {status === 'running' ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#FE9100]/30 border-t-[#FE9100] animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/50" style={orbitron}>Analyse läuft...</p>
            <p className="text-xs text-white/30 mt-2">Dies kann 10-30 Sekunden dauern.</p>
          </div>
        ) : status === 'done' ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-green-500/40 mx-auto mb-4 flex items-center justify-center">
              <span className="text-green-400 text-lg">✓</span>
            </div>
            <p className="text-sm text-white/70" style={orbitron}>Analyse abgeschlossen</p>
            <p className="text-xs text-white/40 mt-2">Wissensdatenbank wird aktualisiert...</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {errorMsg && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {errorMsg}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className={f.multi ? 'sm:col-span-2' : ''}>
                  <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35 mb-1.5 block">
                    {f.label}{f.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {f.multi ? (
                    <Textarea
                      value={form[f.key] || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="bg-white/[0.04] border-white/[0.10] text-white/90 text-sm rounded-xl min-h-[70px] focus:border-[#FE9100]/40"
                    />
                  ) : (
                    <Input
                      value={form[f.key] || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="bg-white/[0.04] border-white/[0.10] text-white/90 text-sm rounded-xl h-9 focus:border-[#FE9100]/40"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-5 py-2 rounded-full text-sm font-semibold border border-white/[0.10] text-white/50 hover:text-white/70 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleSubmit} className="px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all"
                style={{ border: `1.5px solid ${ACCENT}40`, background: `linear-gradient(180deg, ${ACCENT}18, transparent)`, color: '#fff' }}>
                Analyse starten
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ADD SOURCE DIALOG
// ============================================================================

function AddSourceDialog({ open, onClose, onAdd, saving }: {
  open: boolean; onClose: () => void;
  onAdd: (data: { type: string; title: string; contentText?: string; url?: string }) => void;
  saving: boolean;
}) {
  const [type, setType] = useState<'text' | 'url'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (open) { setType('text'); setTitle(''); setContent(''); setUrl(''); }
  }, [open]);

  const handleAdd = () => {
    if (!title.trim()) return;
    if (type === 'text') {
      onAdd({ type: 'text', title: title.trim(), contentText: content.trim() });
    } else {
      onAdd({ type: 'url', title: title.trim(), url: url.trim() });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-[#0a0a0f] border-white/[0.08]" style={{ borderRadius: 22 }}>
        <DialogHeader>
          <DialogTitle className="text-lg" style={{ ...orbitron, color: GOLD }}>Quelle hinzufügen</DialogTitle>
          <DialogDescription className="text-white/40 text-sm">
            Text oder URL als Wissensquelle hinzufügen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Type Toggle */}
          <div className="flex gap-2">
            {(['text', 'url'] as const).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
                style={{
                  border: `1px solid ${type === t ? ACCENT + '40' : 'rgba(255,255,255,0.08)'}`,
                  color: type === t ? ACCENT : 'rgba(255,255,255,0.4)',
                  background: type === t ? ACCENT + '10' : 'transparent',
                }}>
                {t === 'text' ? 'Text' : 'URL'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35 mb-1.5 block">Titel</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel der Quelle"
              className="bg-white/[0.04] border-white/[0.10] text-white/90 text-sm rounded-xl h-9 focus:border-[#FE9100]/40" />
          </div>

          {type === 'text' ? (
            <div>
              <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35 mb-1.5 block">Inhalt</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Hier den Text einfügen..."
                className="bg-white/[0.04] border-white/[0.10] text-white/90 text-sm rounded-xl min-h-[120px] focus:border-[#FE9100]/40" />
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35 mb-1.5 block">URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
                className="bg-white/[0.04] border-white/[0.10] text-white/90 text-sm rounded-xl h-9 focus:border-[#FE9100]/40" />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-5 py-2 rounded-full text-sm font-semibold border border-white/[0.10] text-white/50 hover:text-white/70 transition-colors">
              Abbrechen
            </button>
            <button onClick={handleAdd} disabled={saving || !title.trim()} className="px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all disabled:opacity-40"
              style={{ border: `1.5px solid ${ACCENT}40`, background: `linear-gradient(180deg, ${ACCENT}18, transparent)`, color: '#fff' }}>
              {saving ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default function Leads() {
  return (
    <LeadsErrorBoundary>
      <LeadsContent />
    </LeadsErrorBoundary>
  );
}
