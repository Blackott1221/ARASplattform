import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';
import type { User } from '@shared/schema';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PowerResultCard } from '@/components/power/power-result-card';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS (2026 Mission Control)
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

// ═══════════════════════════════════════════════════════════════
// UNIFIED ACTIVITY MODEL
// ═══════════════════════════════════════════════════════════════
type ActivityType = 'call' | 'space';

interface ActivityItem {
  type: ActivityType;
  id: string | number;
  title: string;
  timestamp: string;
  status: 'ready' | 'pending' | 'failed' | 'in_progress' | 'completed';
  summaryShort?: string;
  tags?: string[];
  meta?: {
    durationSec?: number;
    phoneNumber?: string;
    messageCount?: number;
  };
  raw?: any;
}

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

interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  messageCount?: number;
  lastMessageAt?: string | null;
  summaryStatus: 'missing' | 'pending' | 'ready' | 'failed';
  summaryShort?: string | null;
}

interface PersistentError {
  userMessage: string;
  technicalMessage: string;
  endpoint?: string;
  status?: number;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [persistentError, setPersistentError] = useState<PersistentError | null>(null);
  const [expandedError, setExpandedError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'call' | 'space'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const summaryPollRef = useRef<NodeJS.Timeout | null>(null);
  const drawerPollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch call logs
  const { data: callLogs = [], refetch: refetchCallLogs, isError: isCallError, error: callError } = useQuery<CallLog[]>({
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

  // Fetch chat sessions (Space)
  const { data: chatSessions = [], refetch: refetchChatSessions } = useQuery<ChatSession[]>({
    queryKey: ['dashboard-chat-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/user/chat-sessions', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10000,
  });

  // Set persistent error if fetch fails
  useEffect(() => {
    if (isCallError && callError) {
      setPersistentError({
        userMessage: 'Dashboard konnte nicht geladen werden',
        technicalMessage: (callError as any).message || 'Unbekannter Fehler',
        endpoint: (callError as any).endpoint,
        status: (callError as any).status,
      });
    }
  }, [isCallError, callError]);

  // Map calls to ActivityItems
  const callActivities: ActivityItem[] = useMemo(() => 
    callLogs.map(call => ({
      type: 'call' as ActivityType,
      id: call.id,
      title: call.contactName || call.phoneNumber,
      timestamp: call.createdAt,
      status: call.summaryStatus === 'pending' ? 'pending' : 
              call.status === 'completed' ? (call.summaryShort ? 'ready' : 'pending') :
              call.status === 'failed' ? 'failed' : 'in_progress',
      summaryShort: call.summaryShort,
      tags: call.summary?.tags,
      meta: {
        durationSec: call.duration,
        phoneNumber: call.phoneNumber,
      },
      raw: call,
    }))
  , [callLogs]);

  // Map chat sessions to ActivityItems (with real summary status)
  const chatActivities: ActivityItem[] = useMemo(() => 
    chatSessions.map(session => ({
      type: 'space' as ActivityType,
      id: session.id,
      title: session.title || 'Unbenannter Chat',
      timestamp: session.lastMessageAt || session.updatedAt || session.createdAt,
      status: session.summaryStatus === 'ready' ? 'ready' :
              session.summaryStatus === 'pending' ? 'pending' :
              session.summaryStatus === 'failed' ? 'failed' : 'completed',
      summaryShort: session.summaryShort || undefined,
      meta: {
        messageCount: session.messageCount,
      },
      raw: session,
    }))
  , [chatSessions]);

  // Unified activity list
  const allActivities: ActivityItem[] = useMemo(() => {
    let items = [...callActivities, ...chatActivities];
    
    // Filter by type
    if (activeFilter !== 'all') {
      items = items.filter(i => i.type === activeFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.summaryShort?.toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    
    // Sort by timestamp (newest first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return items;
  }, [callActivities, chatActivities, activeFilter, searchQuery]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { label: string; items: ActivityItem[] }[] = [];
    const today: ActivityItem[] = [];
    const yesterday: ActivityItem[] = [];
    const last7Days: ActivityItem[] = [];
    const older: ActivityItem[] = [];
    const sevenDaysAgo = subDays(new Date(), 7);
    
    allActivities.forEach(item => {
      const date = new Date(item.timestamp);
      if (isToday(date)) today.push(item);
      else if (isYesterday(date)) yesterday.push(item);
      else if (isAfter(date, sevenDaysAgo)) last7Days.push(item);
      else older.push(item);
    });
    
    if (today.length) groups.push({ label: 'Heute', items: today });
    if (yesterday.length) groups.push({ label: 'Gestern', items: yesterday });
    if (last7Days.length) groups.push({ label: 'Letzte 7 Tage', items: last7Days });
    if (older.length) groups.push({ label: 'Älter', items: older });
    
    return groups;
  }, [allActivities]);

  // Global auto-refresh when pending summaries exist
  useEffect(() => {
    const hasPending = allActivities.some(i => i.status === 'pending');
    
    if (hasPending && !summaryPollRef.current) {
      summaryPollRef.current = setInterval(() => {
        refetchCallLogs();
        refetchChatSessions();
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
  }, [allActivities, refetchCallLogs, refetchChatSessions]);

  // Auto-refresh drawer when viewing pending item
  useEffect(() => {
    const isPending = selectedItem?.status === 'pending';
    
    if (isPending && selectedItem && !drawerPollRef.current) {
      drawerPollRef.current = setInterval(() => {
        handleOpenDetails(selectedItem);
      }, 6000);
    } else if ((!isPending || !selectedItem) && drawerPollRef.current) {
      clearInterval(drawerPollRef.current);
      drawerPollRef.current = null;
    }
    
    return () => {
      if (drawerPollRef.current) {
        clearInterval(drawerPollRef.current);
        drawerPollRef.current = null;
      }
    };
  }, [selectedItem]);

  // Open details drawer (generic for all types)
  const handleOpenDetails = useCallback(async (item: ActivityItem) => {
    setSelectedItem(item);
    setLoadingDetails(true);
    try {
      let endpoint = '';
      if (item.type === 'call') {
        endpoint = `/api/aras-voice/call-details/${item.id}`;
      } else if (item.type === 'space') {
        endpoint = `/api/chat/session/${item.id}`;
      }
      
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setSelectedDetails(data);
    } catch (err) {
      console.error('Failed to load details:', err);
      setSelectedDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handleCloseDrawer = () => {
    setSelectedItem(null);
    setSelectedDetails(null);
  };

  // Calculate stats from all activities (REAL DATA ONLY - no fake KPIs)
  const stats = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    
    // Calls today - always real
    const callsToday = callActivities.filter(c => isToday(new Date(c.timestamp))).length;
    
    // Success rate - only show if we have at least 3 calls in last 7 days
    const callsLast7Days = callActivities.filter(c => isAfter(new Date(c.timestamp), sevenDaysAgo));
    const completedLast7Days = callsLast7Days.filter(c => c.status === 'ready' || c.status === 'completed').length;
    // Only calculate if we have meaningful data (min 3 calls)
    const successRate = callsLast7Days.length >= 3 ? Math.round((completedLast7Days / callsLast7Days.length) * 100) : null;
    
    // Average duration - only show if we have at least 2 calls with duration
    const durations = callsLast7Days.filter(c => c.meta?.durationSec && c.meta.durationSec > 0).map(c => c.meta!.durationSec!);
    const avgDuration = durations.length >= 2 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    
    // Pending count - always real
    const pendingCount = allActivities.filter(i => i.status === 'pending').length;
    
    // Space sessions count
    const spaceSessions = chatActivities.length;

    return { callsToday, successRate, avgDuration, pendingCount, spaceSessions };
  }, [callActivities, chatActivities, allActivities]);

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

        {/* OVERVIEW TILES - 4 Mini Cards (REAL DATA ONLY) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIM.duration, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <StatTile label="Anrufe heute" value={stats.callsToday} />
          <StatTile 
            label="Erfolgsquote (7T)" 
            value={stats.successRate !== null ? `${stats.successRate}%` : '—'} 
            hint={stats.successRate === null ? 'Nicht verfügbar (min. 3 Calls nötig)' : undefined}
          />
          <StatTile 
            label="Ø Dauer (7T)" 
            value={stats.avgDuration ? formatDuration(stats.avgDuration) : '—'} 
            hint={!stats.avgDuration ? 'Nicht verfügbar (Daten fehlen)' : undefined}
          />
          <StatTile label="Ausstehend" value={stats.pendingCount} highlight={stats.pendingCount > 0} />
        </motion.div>

        {/* MAIN GRID - 12 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: col-span-8 */}
          <div className="lg:col-span-8 space-y-5">

            {/* Unified Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.15 }}
              className="rounded-3xl p-5"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              {/* Header + Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: DT.gold }}>
                  Aktivität
                </h3>
                
                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-[12px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {(['all', 'call', 'space'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-3 py-1.5 rounded-[10px] text-[11px] font-medium uppercase tracking-wide transition-all ${
                        activeFilter === filter 
                          ? 'text-white' 
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                      style={activeFilter === filter ? { 
                        background: 'rgba(255,106,0,0.15)', 
                        border: '1px solid rgba(255,106,0,0.3)',
                        boxShadow: '0 0 8px rgba(255,106,0,0.15)'
                      } : { border: '1px solid transparent' }}
                    >
                      {filter === 'all' ? 'Alles' : filter === 'call' ? 'Calls' : 'Space'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Suchen nach Kontakt, Thema, Tag..."
                  className="w-full px-4 py-2.5 rounded-[12px] text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs font-medium transition-colors"
                  >
                    x
                  </button>
                )}
              </div>
              
              {/* Activity List */}
              {allActivities.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <p className="text-sm mb-2">Noch keine Aktivität</p>
                  <a 
                    href="/app/power" 
                    className="text-xs font-medium hover:underline transition-colors"
                    style={{ color: DT.orange }}
                  >
                    Starte deinen ersten Call
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedActivities.map(group => (
                    <div key={group.label}>
                      {/* Group Label */}
                      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 mb-2 px-1">
                        {group.label}
                      </p>
                      
                      {/* Group Items */}
                      <div className="space-y-1">
                        {group.items.map((item, idx) => (
                          <motion.button
                            key={`${item.type}-${item.id}`}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: ANIM.duration, delay: idx * ANIM.stagger }}
                            onClick={() => handleOpenDetails(item)}
                            className="w-full flex items-center gap-3 py-3 px-3 -mx-3 rounded-[12px] transition-all hover:bg-white/[0.04] focus:outline-none text-left group"
                            style={{ borderRight: '2px solid transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.borderRightColor = `${DT.orange}50`)}
                            onMouseLeave={e => (e.currentTarget.style.borderRightColor = 'transparent')}
                          >
                            {/* Type indicator + Status dot */}
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <div 
                                className={`w-2 h-2 rounded-full ${
                                  item.status === 'ready' || item.status === 'completed' ? 'bg-green-500/70' : 
                                  item.status === 'failed' ? 'bg-red-500/70' : 
                                  item.status === 'pending' ? 'bg-amber-500/70' :
                                  'bg-blue-500/70'
                                }`} 
                              />
                              <span className="text-[9px] uppercase tracking-wide text-neutral-600">
                                {item.type === 'call' ? 'C' : 'S'}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm truncate font-medium group-hover:text-white transition-colors" style={{ color: DT.gold }}>
                                  {item.title}
                                </p>
                                <span className="text-[10px] text-neutral-500 flex-shrink-0">
                                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: de })}
                                </span>
                              </div>
                              {/* Summary line - type-specific handling */}
                              {item.summaryShort ? (
                                <p className="text-xs text-neutral-400 truncate mt-0.5 line-clamp-2">{item.summaryShort}</p>
                              ) : item.status === 'pending' ? (
                                <div className="mt-0.5 flex items-center gap-2">
                                  <div className="h-2 w-16 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full w-8 rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, transparent, ${DT.orange}40, transparent)`, animation: 'shimmer 1.5s infinite' }} />
                                  </div>
                                  <p className="text-[10px] text-neutral-500">Aktualisiert automatisch</p>
                                </div>
                              ) : item.status === 'failed' ? (
                                <p className="text-xs text-red-400/60 mt-0.5">Zusammenfassung fehlgeschlagen</p>
                              ) : item.type === 'space' && item.status === 'completed' ? (
                                <p className="text-xs text-neutral-500 mt-0.5">
                                  {item.meta?.messageCount ? `${item.meta.messageCount} Nachrichten` : 'Chat Session'}
                                </p>
                              ) : item.type === 'call' && !item.summaryShort ? (
                                <div className="mt-0.5 flex items-center gap-2">
                                  <div className="h-2 w-16 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full w-8 rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, transparent, ${DT.orange}40, transparent)`, animation: 'shimmer 1.5s infinite' }} />
                                  </div>
                                  <p className="text-[10px] text-neutral-500">Aktualisiert automatisch</p>
                                </div>
                              ) : null}
                            </div>
                            
                            {/* Meta (duration for calls) */}
                            <span className="text-[11px] text-neutral-500 tabular-nums flex-shrink-0">
                              {item.meta?.durationSec ? formatDuration(item.meta.durationSec) : '—'}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
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

        {/* UNIFIED DETAILS DRAWER */}
        <AnimatePresence>
          {selectedItem && (
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
                    {selectedItem.type === 'call' ? 'Anrufdetails' : 'Chat Session'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectedItem && handleOpenDetails(selectedItem)}
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
                    ) : selectedDetails ? (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: ANIM.duration }}
                      >
                        {selectedItem.type === 'call' ? (
                          <PowerResultCard
                            result={{
                              id: selectedDetails.id,
                              callId: selectedDetails.id,
                              recordingUrl: selectedDetails.recordingUrl,
                              transcript: selectedDetails.transcript,
                              duration: selectedDetails.durationSeconds ?? selectedDetails.duration,
                              phoneNumber: selectedDetails.phoneNumber,
                              contactName: selectedDetails.metadata?.contactName
                            }}
                            summary={selectedDetails.summary}
                            onNewCall={handleCloseDrawer}
                            onRefresh={() => selectedItem && handleOpenDetails(selectedItem)}
                          />
                        ) : (
                          <ChatSessionDetails 
                            session={selectedDetails} 
                            onClose={handleCloseDrawer}
                            onRefresh={() => selectedItem && handleOpenDetails(selectedItem)}
                          />
                        )}
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
                          onClick={() => selectedItem && handleOpenDetails(selectedItem)}
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

function StatTile({ label, value, highlight = false, hint }: { label: string; value: string | number; highlight?: boolean; hint?: string }) {
  const isUnavailable = value === '—';
  
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="rounded-2xl p-4 transition-all group relative"
      style={{ 
        background: highlight ? 'rgba(255,106,0,0.08)' : 'rgba(0,0,0,0.25)',
        border: `1px solid ${highlight ? 'rgba(255,106,0,0.25)' : 'rgba(255,255,255,0.10)'}`,
        backdropFilter: 'blur(12px)'
      }}
    >
      <div 
        className="text-2xl sm:text-3xl font-bold mb-1 tabular-nums"
        style={{ color: isUnavailable ? '#666' : (highlight ? DT.orange : '#fff') }}
      >
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      {/* Hint tooltip on hover */}
      {hint && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-[8px] text-[10px] text-neutral-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {hint}
        </div>
      )}
    </motion.div>
  );
}

// Chat Session Details Component (for Space drawer) - with real summaries
function ChatSessionDetails({ session, onClose, onRefresh }: { session: any; onClose: () => void; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const [triggeringSummary, setTriggeringSummary] = useState(false);
  
  const handleCopyAll = () => {
    let text = '';
    
    // Add summary if ready
    if (session.summaryStatus === 'ready' && session.summaryFull) {
      text += `ZUSAMMENFASSUNG:\n${session.summaryFull.outcome}\n\n`;
      if (session.summaryFull.bulletPoints?.length) {
        text += `WICHTIGE PUNKTE:\n${session.summaryFull.bulletPoints.map((b: string) => `- ${b}`).join('\n')}\n\n`;
      }
      text += `NÄCHSTER SCHRITT:\n${session.summaryFull.nextStep}\n\n`;
      if (session.summaryFull.tags?.length) {
        text += `TAGS: ${session.summaryFull.tags.join(', ')}\n\n`;
      }
      text += '---\n\n';
    }
    
    // Add messages
    if (session.messages?.length) {
      text += 'VERLAUF:\n';
      text += session.messages.slice(-20).map((m: any) => `${m.role === 'assistant' ? 'ARAS' : 'Du'}: ${m.content}`).join('\n\n');
    }
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerSummary = async () => {
    setTriggeringSummary(true);
    try {
      await fetch(`/api/chat/session/${session.id}/summarize`, {
        method: 'POST',
        credentials: 'include'
      });
      // Refresh to get pending status
      setTimeout(onRefresh, 500);
    } catch (err) {
      console.error('Failed to trigger summary:', err);
    } finally {
      setTriggeringSummary(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Session Info */}
      <div className="p-4 rounded-[14px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 className="text-sm font-semibold mb-2" style={{ color: DT.gold }}>{session.title}</h4>
        <p className="text-xs text-neutral-500">
          {session.messageCount || session.messages?.length || 0} Nachrichten
        </p>
      </div>

      {/* Summary Section */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">
          Zusammenfassung
        </h4>
        
        {session.summaryStatus === 'ready' && session.summaryFull ? (
          <div className="p-4 rounded-[14px] space-y-4" style={{ background: 'rgba(255,106,0,0.05)', border: '1px solid rgba(255,106,0,0.15)' }}>
            {/* Outcome */}
            <p className="text-sm font-medium" style={{ color: DT.gold }}>{session.summaryFull.outcome}</p>
            
            {/* Bullet Points */}
            {session.summaryFull.bulletPoints?.length > 0 && (
              <ul className="space-y-1.5">
                {session.summaryFull.bulletPoints.map((point: string, idx: number) => (
                  <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: DT.orange }} />
                    {point}
                  </li>
                ))}
              </ul>
            )}
            
            {/* Next Step */}
            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Nächster Schritt</p>
              <p className="text-xs text-neutral-300">{session.summaryFull.nextStep}</p>
            </div>
            
            {/* Tags */}
            {session.summaryFull.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {session.summaryFull.tags.map((tag: string, idx: number) => (
                  <span 
                    key={idx}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: 'rgba(255,106,0,0.12)', color: DT.orange }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : session.summaryStatus === 'pending' ? (
          <div className="p-4 rounded-[14px] text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="h-2 w-24 mx-auto rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full w-12 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${DT.orange}50, transparent)`, animation: 'shimmer 1.5s infinite' }} />
            </div>
            <p className="text-xs text-neutral-500">Zusammenfassung wird erstellt...</p>
            <p className="text-[10px] text-neutral-600 mt-1">Aktualisiert automatisch</p>
          </div>
        ) : session.summaryStatus === 'failed' ? (
          <div className="p-4 rounded-[14px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs text-red-400 mb-2">Zusammenfassung fehlgeschlagen</p>
            {session.summaryError && (
              <p className="text-[10px] text-red-300/60 mb-3">{session.summaryError}</p>
            )}
            <button
              onClick={handleTriggerSummary}
              disabled={triggeringSummary}
              className="text-xs font-medium px-3 py-1.5 rounded-[10px] transition-colors disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {triggeringSummary ? 'Wird gestartet...' : 'Erneut versuchen'}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-[14px] text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs text-neutral-500 mb-3">Keine Zusammenfassung vorhanden</p>
            <button
              onClick={handleTriggerSummary}
              disabled={triggeringSummary}
              className="text-xs font-medium px-4 py-2 rounded-[10px] transition-all hover:translate-y-[-1px] disabled:opacity-50"
              style={{ 
                background: 'transparent', 
                color: DT.orange, 
                border: `1px solid ${DT.orange}40`,
                boxShadow: '0 0 12px rgba(255,106,0,0.1)'
              }}
            >
              {triggeringSummary ? 'Wird gestartet...' : 'Zusammenfassung erstellen'}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {session.messages?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">
              Verlauf
            </h4>
            <button
              onClick={handleCopyAll}
              className="text-[11px] font-medium px-2 py-1 rounded-[8px] transition-colors"
              style={{ color: copied ? '#22c55e' : DT.gold, background: 'rgba(255,255,255,0.04)' }}
            >
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
          
          <div 
            className="max-h-[300px] overflow-y-auto space-y-3 p-3 rounded-[12px]"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {session.messages.slice(-20).map((msg: any, idx: number) => (
              <div 
                key={msg.id || idx}
                className={`p-3 rounded-[10px] text-sm ${
                  msg.role === 'assistant' 
                    ? 'bg-orange-500/5 border border-orange-500/10' 
                    : 'bg-white/[0.03] border border-white/[0.06]'
                }`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: msg.role === 'assistant' ? DT.orange : '#888' }}>
                  {msg.role === 'assistant' ? 'ARAS' : 'Du'}
                </p>
                <p className="text-neutral-300 whitespace-pre-wrap text-[13px] leading-relaxed">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open in Space CTA - CORRECT DEEP LINK */}
      <a
        href="/app/space"
        className="block w-full py-3 px-4 rounded-[14px] text-sm font-medium text-center transition-all hover:translate-y-[-1px]"
        style={{ background: `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})`, color: '#000' }}
      >
        Im Space öffnen
      </a>
    </div>
  );
}
