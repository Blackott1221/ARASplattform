import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, isToday, subDays, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';
import type { User } from '@shared/schema';
import { useState, useEffect, useRef, useMemo } from 'react';
import { PowerResultCard } from '@/components/power/power-result-card';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS (2026 Control Center)
// ═══════════════════════════════════════════════════════════════
const DT = {
  orange: '#ff6a00',
  gold: '#e9d7c4',
  goldDark: '#a34e00',
  panelBg: 'rgba(0,0,0,0.30)',
  panelBorder: 'rgba(255,255,255,0.10)',
  glow: '0 0 0 1px rgba(255,106,0,0.18), 0 0 22px rgba(255,106,0,0.10)',
  glowSubtle: '0 0 12px rgba(255,106,0,0.08)',
};

const ANIM = {
  duration: 0.22,
  easing: [0.22, 1, 0.36, 1] as const,
  stagger: 0.04,
};

interface DashboardContentProps {
  user: User;
}

interface CallLog {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  transcript?: string;
  recordingUrl?: string;
  duration?: number;
  createdAt: string;
  summaryShort?: string;
  summaryStatus?: string;
  summary?: any;
  metadata?: any;
}

interface PersistentError {
  userMessage: string;
  technicalMessage: string;
  endpoint?: string;
  status?: number;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedCallDetails, setSelectedCallDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [persistentError, setPersistentError] = useState<PersistentError | null>(null);
  const [expandedError, setExpandedError] = useState(false);
  const summaryPollRef = useRef<NodeJS.Timeout | null>(null);
  const drawerPollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch call logs from correct endpoint
  const { data: callLogs = [], refetch: refetchCallLogs, isError, error } = useQuery<CallLog[]>({
    queryKey: ['dashboard-call-logs'],
    queryFn: async () => {
      const res = await fetch('/api/user/call-logs', { credentials: 'include' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw { status: res.status, message: errData.error || 'Failed to fetch call logs', endpoint: '/api/user/call-logs' };
      }
      return res.json();
    },
    staleTime: 10000,
  });

  // Set persistent error if fetch fails
  useEffect(() => {
    if (isError && error) {
      setPersistentError({
        userMessage: 'Dashboard konnte nicht geladen werden',
        technicalMessage: (error as any).message || 'Unbekannter Fehler',
        endpoint: (error as any).endpoint,
        status: (error as any).status,
      });
    }
  }, [isError, error]);

  // Auto-refresh when pending summaries exist
  useEffect(() => {
    const hasPending = callLogs.some(c => c.summaryStatus === 'pending' || (c.status === 'completed' && !c.summaryShort));
    
    if (hasPending && !summaryPollRef.current) {
      summaryPollRef.current = setInterval(() => {
        refetchCallLogs();
      }, 6000);
    } else if (!hasPending && summaryPollRef.current) {
      clearInterval(summaryPollRef.current);
      summaryPollRef.current = null;
    }
    
    return () => {
      if (summaryPollRef.current) {
        clearInterval(summaryPollRef.current);
        summaryPollRef.current = null;
      }
    };
  }, [callLogs, refetchCallLogs]);

  // Auto-refresh drawer when viewing pending call
  useEffect(() => {
    const isPending = selectedCallDetails && (
      selectedCallDetails.summaryStatus === 'pending' || 
      (selectedCallDetails.status === 'completed' && !selectedCallDetails.summary)
    );
    
    if (isPending && selectedCallId && !drawerPollRef.current) {
      drawerPollRef.current = setInterval(() => {
        handleOpenCallDetails(selectedCallId);
      }, 6000);
    } else if ((!isPending || !selectedCallId) && drawerPollRef.current) {
      clearInterval(drawerPollRef.current);
      drawerPollRef.current = null;
    }
    
    return () => {
      if (drawerPollRef.current) {
        clearInterval(drawerPollRef.current);
        drawerPollRef.current = null;
      }
    };
  }, [selectedCallDetails, selectedCallId]);

  // Open call details drawer
  const handleOpenCallDetails = async (callId: string) => {
    setSelectedCallId(callId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/aras-voice/call-details/${callId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch call details');
      const data = await res.json();
      setSelectedCallDetails(data);
    } catch (err) {
      console.error('Failed to load call details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedCallId(null);
    setSelectedCallDetails(null);
  };

  // Calculate stats from call logs
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = subDays(now, 7);

    const callsToday = callLogs.filter(c => isToday(new Date(c.createdAt))).length;
    const callsLast7Days = callLogs.filter(c => isAfter(new Date(c.createdAt), sevenDaysAgo));
    const completedLast7Days = callsLast7Days.filter(c => c.status === 'completed').length;
    const successRate = callsLast7Days.length > 0 ? Math.round((completedLast7Days / callsLast7Days.length) * 100) : 0;
    
    const durations = callsLast7Days.filter(c => c.duration).map(c => c.duration!);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    
    const pendingCount = callLogs.filter(c => c.summaryStatus === 'pending' || (c.status === 'completed' && !c.summaryShort)).length;

    return { callsToday, successRate, avgDuration, pendingCount };
  }, [callLogs]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER - Dashboard V2 Control Center
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* HEADER - Gradient Title */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIM.duration }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
            CONTROL CENTER
          </p>
          <h1 
            className="text-2xl sm:text-3xl font-black font-['Orbitron'] tracking-wide inline-block relative"
            style={{ 
              background: `linear-gradient(90deg, ${DT.orange}, #ffb15a, ${DT.gold})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Dashboard
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute -bottom-1 left-0 right-0 h-[2px] origin-left"
              style={{ background: `linear-gradient(90deg, ${DT.orange}, ${DT.gold}40, transparent)` }}
            />
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            Willkommen zurück, {user.firstName}
          </p>
        </motion.div>

        {/* PERSISTENT ERROR PANEL */}
        <AnimatePresence>
          {persistentError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-[16px] overflow-hidden"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 mt-1 rounded-full bg-red-500/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-400 text-sm">{persistentError.userMessage}</p>
                    <p className="text-xs text-red-300/60 mt-1">{persistentError.technicalMessage}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setPersistentError(null); refetchCallLogs(); }}
                      className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Erneut versuchen
                    </button>
                    <button 
                      onClick={() => setPersistentError(null)}
                      className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedError(!expandedError)}
                  className="mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  {expandedError ? '− Details ausblenden' : '+ Technische Details'}
                </button>
                <AnimatePresence>
                  {expandedError && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <pre className="mt-3 p-3 rounded-[12px] bg-black/30 text-[11px] text-red-300/50 overflow-x-auto font-mono">
{`Endpoint: ${persistentError.endpoint || 'N/A'}
Status: ${persistentError.status || 'N/A'}`}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERVIEW TILES - 4 Mini Cards */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIM.duration, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <StatTile label="Anrufe heute" value={stats.callsToday} />
          <StatTile label="Erfolgsquote (7T)" value={`${stats.successRate}%`} />
          <StatTile label="Ø Dauer (7T)" value={stats.avgDuration ? formatDuration(stats.avgDuration) : '—'} />
          <StatTile label="Ausstehend" value={stats.pendingCount} highlight={stats.pendingCount > 0} />
        </motion.div>

        {/* MAIN GRID - 12 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: col-span-8 */}
          <div className="lg:col-span-8 space-y-5">

            {/* Call Feed */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.15 }}
              className="rounded-3xl p-5"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: DT.gold }}>
                Aktivität
              </h3>
              
              {callLogs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <p className="text-sm mb-2">Noch keine Anrufe</p>
                  <a 
                    href="/app/power" 
                    className="text-xs font-medium hover:underline transition-colors"
                    style={{ color: DT.orange }}
                  >
                    Ersten Anruf starten
                  </a>
                </div>
              ) : (
                <div className="space-y-1">
                  {callLogs.slice(0, 10).map((call, idx) => (
                    <motion.button
                      key={call.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: ANIM.duration, delay: idx * ANIM.stagger }}
                      onClick={() => handleOpenCallDetails(call.id)}
                      className="w-full flex items-center gap-3 py-3 px-3 -mx-3 rounded-[12px] transition-all hover:bg-white/[0.04] focus:outline-none text-left group"
                      style={{ borderRight: '2px solid transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.borderRightColor = `${DT.orange}50`)}
                      onMouseLeave={e => (e.currentTarget.style.borderRightColor = 'transparent')}
                    >
                      {/* Status dot */}
                      <div 
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          call.status === 'completed' ? 'bg-green-500/70' : 
                          call.status === 'failed' ? 'bg-red-500/70' : 
                          'bg-yellow-500/70'
                        }`} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm truncate font-medium group-hover:text-white transition-colors" style={{ color: DT.gold }}>
                            {call.contactName || call.phoneNumber}
                          </p>
                          <span className="text-[10px] text-neutral-500 flex-shrink-0">
                            {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: de })}
                          </span>
                        </div>
                        {/* Summary line */}
                        {call.summaryShort ? (
                          <p className="text-xs text-neutral-400 truncate mt-0.5 line-clamp-2">{call.summaryShort}</p>
                        ) : call.summaryStatus === 'pending' || (call.status === 'completed' && !call.summaryShort) ? (
                          <div className="mt-0.5">
                            <p className="text-xs text-neutral-500 italic">Zusammenfassung wird erstellt...</p>
                            <p className="text-[10px] text-neutral-600">Aktualisiert automatisch</p>
                          </div>
                        ) : call.status === 'failed' ? (
                          <p className="text-xs text-red-400/60 mt-0.5">Fehlgeschlagen</p>
                        ) : null}
                      </div>
                      {/* Duration */}
                      <span className="text-[11px] text-neutral-500 tabular-nums flex-shrink-0">
                        {call.duration ? formatDuration(call.duration) : '—'}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COLUMN: col-span-4 */}
          <div className="lg:col-span-4 space-y-5">

            {/* Status / Setup Hints */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.2 }}
              className="rounded-3xl p-5"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: DT.gold }}>
                Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-[12px]" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="w-2 h-2 rounded-full bg-green-500/70" />
                  <span className="text-sm text-green-400">System bereit</span>
                </div>
                <div className="p-3 rounded-[12px]" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${DT.panelBorder}` }}>
                  <p className="text-xs text-neutral-400 mb-2">
                    Profil vervollständigen für bessere Calls
                  </p>
                  <a 
                    href="/app/leads" 
                    className="text-xs font-medium hover:underline"
                    style={{ color: DT.orange }}
                  >
                    Zur Wissensdatenbank
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.25 }}
              className="rounded-3xl p-5"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: DT.gold }}>
                Schnellaktionen
              </h3>
              <div className="space-y-2">
                <a 
                  href="/app/power"
                  className="block w-full py-3 px-4 rounded-[14px] text-sm font-medium text-center transition-all hover:translate-y-[-1px]"
                  style={{ background: `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})`, color: '#000' }}
                >
                  Anruf starten
                </a>
                <a 
                  href="/app/contacts"
                  className="block w-full py-3 px-4 rounded-[14px] text-sm font-medium text-center transition-colors hover:bg-white/[0.06]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                >
                  Kontakte
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* CALL DETAILS DRAWER */}
        <AnimatePresence>
          {selectedCallId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
              onClick={handleCloseDrawer}
            >
              <motion.div
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ duration: 0.3, ease: ANIM.easing }}
                className="w-full sm:w-[460px] sm:max-w-[90vw] h-[85vh] sm:h-full sm:max-h-screen overflow-hidden rounded-t-[24px] sm:rounded-none flex flex-col"
                style={{ background: 'rgba(8,8,8,0.98)', borderLeft: `1px solid ${DT.panelBorder}` }}
                onClick={e => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"
                >
                  <h3 
                    className="text-base font-bold uppercase tracking-wide"
                    style={{ 
                      background: `linear-gradient(90deg, ${DT.orange}, ${DT.gold})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Anrufdetails
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectedCallId && handleOpenCallDetails(selectedCallId)}
                      disabled={loadingDetails}
                      className="text-xs font-medium px-3 py-1.5 rounded-[10px] hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                      style={{ color: DT.gold }}
                    >
                      {loadingDetails ? 'Lädt...' : 'Aktualisieren'}
                    </button>
                    <button
                      onClick={handleCloseDrawer}
                      className="text-xs font-medium px-3 py-1.5 rounded-[10px] hover:bg-white/[0.06] transition-colors"
                      style={{ color: '#888' }}
                    >
                      Schließen
                    </button>
                  </div>
                </motion.div>
                
                {/* Drawer Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                  <AnimatePresence mode="wait">
                    {loadingDetails ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4 w-full"
                      >
                        <div className="h-4 bg-neutral-800/50 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-neutral-800/30 rounded animate-pulse w-full" />
                        <div className="h-3 bg-neutral-800/30 rounded animate-pulse w-5/6" />
                        <div className="h-20 bg-neutral-800/20 rounded-[12px] animate-pulse w-full mt-4" />
                      </motion.div>
                    ) : selectedCallDetails ? (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: ANIM.duration }}
                      >
                        <PowerResultCard
                          result={{
                            id: selectedCallDetails.id,
                            callId: selectedCallDetails.id,
                            recordingUrl: selectedCallDetails.recordingUrl,
                            transcript: selectedCallDetails.transcript,
                            duration: selectedCallDetails.durationSeconds ?? selectedCallDetails.duration,
                            phoneNumber: selectedCallDetails.phoneNumber,
                            contactName: selectedCallDetails.metadata?.contactName
                          }}
                          summary={selectedCallDetails.summary}
                          onNewCall={handleCloseDrawer}
                          onRefresh={() => selectedCallId && handleOpenCallDetails(selectedCallId)}
                        />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-40 text-neutral-500"
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-red-500/30 flex items-center justify-center mb-3 relative">
                          <div className="w-6 h-0.5 bg-red-500/50 rotate-45 absolute" />
                          <div className="w-6 h-0.5 bg-red-500/50 -rotate-45 absolute" />
                        </div>
                        <p className="text-sm">Details konnten nicht geladen werden</p>
                        <button
                          onClick={() => selectedCallId && handleOpenCallDetails(selectedCallId)}
                          className="mt-3 text-xs px-4 py-2 rounded-[10px] font-medium"
                          style={{ background: 'rgba(255,106,0,0.12)', color: DT.orange, border: '1px solid rgba(255,106,0,0.25)' }}
                        >
                          Erneut versuchen
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS (No Icons)
// ═══════════════════════════════════════════════════════════════

function StatTile({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="rounded-2xl p-4 transition-all"
      style={{ 
        background: highlight ? 'rgba(255,106,0,0.08)' : 'rgba(0,0,0,0.25)',
        border: `1px solid ${highlight ? 'rgba(255,106,0,0.25)' : 'rgba(255,255,255,0.10)'}`,
        backdropFilter: 'blur(12px)'
      }}
    >
      <div 
        className="text-2xl sm:text-3xl font-bold mb-1 tabular-nums"
        style={{ color: highlight ? DT.orange : '#fff' }}
      >
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
    </motion.div>
  );
}
