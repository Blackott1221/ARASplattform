import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter, format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import type { User } from '@shared/schema';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PowerResultCard } from '@/components/power/power-result-card';

// ═══════════════════════════════════════════════════════════════
// SAFE HELPERS V7 (prevent crashes from null/undefined)
// ═══════════════════════════════════════════════════════════════
const safeArray = <T,>(x: T[] | null | undefined): T[] => Array.isArray(x) ? x : [];
const safeObj = <T extends object>(x: T | null | undefined): T => (x && typeof x === 'object' ? x : {} as T);
const safeString = (x: unknown): string => typeof x === 'string' ? x : '';
const safeNumber = (x: unknown): number | null => typeof x === 'number' && Number.isFinite(x) ? x : null;
const safeJson = async (res: Response): Promise<any> => {
  try { return await res.json(); } catch { return {}; }
};

// LocalStorage keys for action management (Operations panel)
const DONE_ACTIONS_KEY = 'aras_done_actions_v1';
const SNOOZED_ACTIONS_KEY = 'aras_snoozed_actions_v1';

const getDoneActions = (): Set<string> => {
  try {
    const stored = localStorage.getItem(DONE_ACTIONS_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch { return new Set(); }
};
const setDoneAction = (id: string, done: boolean) => {
  const current = getDoneActions();
  if (done) current.add(id); else current.delete(id);
  localStorage.setItem(DONE_ACTIONS_KEY, JSON.stringify([...current]));
};

// Snoozed actions: { id: snoozeUntilTimestamp }
const getSnoozedActions = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(SNOOZED_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
};
const snoozeAction = (id: string, untilMs: number) => {
  const current = getSnoozedActions();
  current[id] = untilMs;
  localStorage.setItem(SNOOZED_ACTIONS_KEY, JSON.stringify(current));
};
const unsnoozeAction = (id: string) => {
  const current = getSnoozedActions();
  delete current[id];
  localStorage.setItem(SNOOZED_ACTIONS_KEY, JSON.stringify(current));
};

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS V8 (2026 Clean Futurism - Unicorn Control Center)
// ═══════════════════════════════════════════════════════════════
const DT = {
  // Premium Futuristic Layer
  orange: '#ff6a00',
  gold: '#e9d7c4',
  goldDark: '#a34e00',
  panelBg: 'rgba(0,0,0,0.42)',
  panelBgHover: 'rgba(0,0,0,0.52)',
  panelBorder: 'rgba(255,255,255,0.08)',
  panelBorderStrong: 'rgba(255,255,255,0.14)',
  glow: '0 0 0 1px rgba(255,106,0,0.18), 0 0 22px rgba(255,106,0,0.10)',
  glowSubtle: '0 0 12px rgba(255,106,0,0.08)',
  rowBg: 'rgba(255,255,255,0.02)',
  rowBgHover: 'rgba(255,255,255,0.05)',
  textDim: 'rgba(255,255,255,0.72)',
  textSoft: 'rgba(255,255,255,0.55)',
  shadow: '0 18px 60px rgba(0,0,0,0.55)',
  // Matrix Tech Layer
  matrixBg: 'rgba(0,12,8,0.88)',
  matrixBorder: 'rgba(0,255,136,0.12)',
  matrixText: 'rgba(0,255,136,0.85)',
  matrixTextDim: 'rgba(0,255,136,0.50)',
  matrixAccent: '#00ff88',
  // Status colors
  statusReady: '#22c55e',
  statusPending: '#f59e0b',
  statusFailed: '#ef4444',
};

const ANIM = {
  duration: 0.24,
  easing: [0.22, 1, 0.36, 1] as const,
  stagger: 0.03,
};

// CSS Keyframes for shimmer + matrix scanline animation V8 (injected once)
const v8CSS = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes sheen {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes drawer-sheen {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
.matrix-panel {
  position: relative;
  overflow: hidden;
}
.matrix-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,255,136,0.012) 2px,
      rgba(0,255,136,0.012) 4px
    );
  pointer-events: none;
  z-index: 1;
}
.matrix-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,255,136,0.02), transparent 8px, transparent 92%, rgba(0,255,136,0.02));
  animation: scanline 10s linear infinite;
  pointer-events: none;
  z-index: 2;
  opacity: 0.3;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot-pending {
  animation: pulse-dot 1.5s ease-in-out infinite;
}
/* V9 Mission Panel Drawer Styles */
.mission-drawer-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.mission-drawer-scrollbar::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.02);
  border-radius: 3px;
}
.mission-drawer-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,106,0,0.25);
  border-radius: 3px;
}
.mission-drawer-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255,106,0,0.4);
}
.drawer-sheen-line {
  position: relative;
  overflow: hidden;
}
.drawer-sheen-line::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 25%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: drawer-sheen 4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .matrix-panel::after { animation: none; }
  .status-dot-pending { animation: none; }
  .drawer-sheen-line::after { animation: none; }
  @keyframes shimmer { 0%, 100% { transform: none; } }
  @keyframes sheen { 0%, 100% { background-position: 0 center; } }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('aras-v8-css')) {
  const style = document.createElement('style');
  style.id = 'aras-v8-css';
  style.textContent = v8CSS;
  document.head.appendChild(style);
}

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

// Profile context from /api/user/profile-context
interface ProfileContext {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  website?: string;
  industry?: string;
  jobRole?: string;
  phone?: string;
  aiProfile?: {
    companyDescription?: string;
    targetAudience?: string;
    effectiveKeywords?: string[];
    competitors?: string[];
    services?: string;
    products?: string[];
    ceoName?: string;
    employeeCount?: string;
  };
}

// Calendar event from /api/calendar/events
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}

// Action item extracted from nextStep fields
interface ActionItem {
  id: string;
  title: string;
  source: { type: 'call' | 'space'; name: string; timestamp: string };
  done: boolean;
  rawId: string | number;
}

// Data source from /api/user/data-sources
interface DataSource {
  id: number;
  user_id: string;
  type: 'text' | 'url' | 'file';
  title?: string;
  status: string;
  content_text?: string;
  url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

// Normalized data sources response
interface DataSourcesResponse {
  success: boolean;
  count: number;
  dataSources: DataSource[];
}

// V8: Contact Radar - grouped contact data from call logs
interface ContactRadarEntry {
  key: string; // phoneNumber or contactName
  displayName: string;
  lastCallAt: string;
  callCount7d: number;
  callCount30d: number;
  lastOutcome?: string;
  lastSentiment?: string;
  lastNextStep?: string;
  pendingCount: number;
  calls: CallLog[];
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [persistentError, setPersistentError] = useState<PersistentError | null>(null);
  const [expandedError, setExpandedError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'call' | 'space'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [doneActions, setDoneActionsState] = useState<Set<string>>(getDoneActions);
  const [snoozedActions, setSnoozedActionsState] = useState<Record<string, number>>(getSnoozedActions);
  const [opsFilter, setOpsFilter] = useState<'offen' | 'heute' | 'später' | 'erledigt'>('offen');
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

  // Fetch chat sessions (Space) - SAFE: handles API failures gracefully
  const { data: chatSessions = [], refetch: refetchChatSessions, isError: isChatError } = useQuery<ChatSession[]>({
    queryKey: ['dashboard-chat-sessions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/chat-sessions', { credentials: 'include' });
        const data = await safeJson(res);
        // Handle new { success, sessions } shape or legacy array
        return safeArray(data.sessions ?? data);
      } catch (err) {
        console.error('[Dashboard] Failed to fetch chat sessions:', err);
        return [];
      }
    },
    staleTime: 10000,
  });

  // V6: Fetch profile context for Business Snapshot
  const { data: profileContext, isLoading: profileLoading, isError: profileError } = useQuery<ProfileContext>({
    queryKey: ['dashboard-profile-context'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/profile-context', { credentials: 'include' });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.error('[Dashboard] Failed to fetch profile context:', err);
        return null;
      }
    },
    staleTime: 60000,
  });

  // V6: Fetch calendar events for Calendar Preview (next 7 days)
  const { data: calendarEvents = [], isLoading: calendarLoading, isError: calendarError } = useQuery<CalendarEvent[]>({
    queryKey: ['dashboard-calendar-events'],
    queryFn: async () => {
      try {
        const start = format(new Date(), 'yyyy-MM-dd');
        const end = format(addDays(new Date(), 7), 'yyyy-MM-dd');
        const res = await fetch(`/api/calendar/events?start=${start}&end=${end}`, { credentials: 'include' });
        if (!res.ok) return [];
        return safeArray(await res.json());
      } catch (err) {
        console.error('[Dashboard] Failed to fetch calendar events:', err);
        return [];
      }
    },
    staleTime: 30000,
  });

  // V7: Fetch data sources for Data Sources panel (Matrix Tech)
  const { data: dataSourcesData, isLoading: dataSourcesLoading, isError: dataSourcesError, refetch: refetchDataSources } = useQuery<DataSourcesResponse>({
    queryKey: ['dashboard-data-sources'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/data-sources', { credentials: 'include' });
        if (!res.ok) return { success: false, count: 0, dataSources: [] };
        const data = await safeJson(res);
        return {
          success: data.success ?? false,
          count: safeNumber(data.count) ?? 0,
          dataSources: safeArray(data.dataSources),
        };
      } catch (err) {
        console.error('[Dashboard] Failed to fetch data sources:', err);
        return { success: false, count: 0, dataSources: [] };
      }
    },
    staleTime: 60000,
  });

  // V7: Compute data sources stats
  const dataSourcesStats = useMemo(() => {
    const sources = safeArray(dataSourcesData?.dataSources);
    const byType: Record<string, number> = {};
    let totalChars = 0;
    sources.forEach(s => {
      byType[s.type] = (byType[s.type] || 0) + 1;
      if (s.content_text) totalChars += s.content_text.length;
    });
    return { total: sources.length, byType, totalChars };
  }, [dataSourcesData]);

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

  // Unified activity list - SAFE: always use safeArray to prevent spread crash
  const allActivities: ActivityItem[] = useMemo(() => {
    let items = [...safeArray(callActivities), ...safeArray(chatActivities)];
    
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

  const handleCloseDrawer = useCallback(() => {
    setSelectedItem(null);
    setSelectedDetails(null);
  }, []);

  // V9: ESC key closes drawer + body scroll lock
  useEffect(() => {
    if (!selectedItem) return;
    
    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // ESC key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseDrawer();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem, handleCloseDrawer]);

  // Calculate stats from all activities (REAL DATA ONLY - no fake KPIs)
  const stats = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    
    // Calls today - always real
    const callsToday = callActivities.filter(c => isToday(new Date(c.timestamp))).length;
    
    // Space today - always real
    const spaceToday = chatActivities.filter(c => isToday(new Date(c.timestamp))).length;
    
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

    return { callsToday, spaceToday, successRate, avgDuration, pendingCount };
  }, [callActivities, chatActivities, allActivities]);

  // V9: Extract action items from nextStep fields with snooze support
  const actionItems = useMemo(() => {
    const items: (ActionItem & { snoozedUntil?: number })[] = [];
    const done = doneActions;
    const snoozed = snoozedActions;
    const now = Date.now();
    
    // From calls with summary.nextStep
    callLogs.forEach(call => {
      const nextStep = call.summary?.nextStep;
      if (nextStep && nextStep.trim().length > 5) {
        const id = `call-${call.id}`;
        const snoozeTs = snoozed[id];
        items.push({
          id,
          title: nextStep.length > 140 ? nextStep.substring(0, 137) + '...' : nextStep,
          source: { type: 'call', name: call.contactName || call.phoneNumber, timestamp: call.createdAt },
          done: done.has(id),
          rawId: call.id,
          snoozedUntil: snoozeTs && snoozeTs > now ? snoozeTs : undefined,
        });
      }
    });
    
    // Sort by timestamp (newest first) and take top 15
    items.sort((a, b) => new Date(b.source.timestamp).getTime() - new Date(a.source.timestamp).getTime());
    return items.slice(0, 15);
  }, [callLogs, doneActions, snoozedActions]);

  // V9: Filtered action items based on opsFilter
  const filteredActionItems = useMemo(() => {
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    return actionItems.filter(item => {
      if (opsFilter === 'erledigt') return item.done;
      if (opsFilter === 'später') return item.snoozedUntil && item.snoozedUntil > now;
      if (opsFilter === 'heute') {
        // Show items due today (not snoozed beyond today, not done)
        return !item.done && (!item.snoozedUntil || item.snoozedUntil <= todayEnd.getTime());
      }
      // 'offen' - show all not done, not currently snoozed
      return !item.done && (!item.snoozedUntil || item.snoozedUntil <= now);
    });
  }, [actionItems, opsFilter]);

  // Toggle action done state
  const toggleActionDone = useCallback((id: string) => {
    setDoneActionsState(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      setDoneAction(id, next.has(id));
      return next;
    });
    // Also clear snooze if marking done
    if (!doneActions.has(id)) {
      setSnoozedActionsState(prev => {
        const next = { ...prev };
        delete next[id];
        unsnoozeAction(id);
        return next;
      });
    }
  }, [doneActions]);

  // V9: Snooze action handler
  const handleSnoozeAction = useCallback((id: string, duration: '1h' | 'morgen' | 'woche') => {
    const now = new Date();
    let untilMs: number;
    
    if (duration === '1h') {
      untilMs = now.getTime() + 60 * 60 * 1000;
    } else if (duration === 'morgen') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      untilMs = tomorrow.getTime();
    } else {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(9, 0, 0, 0);
      untilMs = nextWeek.getTime();
    }
    
    snoozeAction(id, untilMs);
    setSnoozedActionsState(prev => ({ ...prev, [id]: untilMs }));
  }, []);

  // Profile completeness calculation (REAL - count filled fields)
  const profileCompleteness = useMemo(() => {
    if (!profileContext) return null;
    const fieldChecks = [
      { name: 'Firma', filled: !!profileContext.company },
      { name: 'Branche', filled: !!profileContext.industry },
      { name: 'Website', filled: !!profileContext.website },
      { name: 'Telefon', filled: !!profileContext.phone },
      { name: 'Beschreibung', filled: !!profileContext.aiProfile?.companyDescription },
      { name: 'Zielgruppe', filled: !!profileContext.aiProfile?.targetAudience },
      { name: 'Services', filled: !!profileContext.aiProfile?.services },
      { name: 'Keywords', filled: (profileContext.aiProfile?.effectiveKeywords?.length ?? 0) > 0 },
      { name: 'Wettbewerber', filled: (profileContext.aiProfile?.competitors?.length ?? 0) > 0 },
      { name: 'Produkte', filled: (profileContext.aiProfile?.products?.length ?? 0) > 0 },
    ];
    const filled = fieldChecks.filter(f => f.filled).length;
    const missing = fieldChecks.filter(f => !f.filled).map(f => f.name);
    return { filled, total: fieldChecks.length, missing };
  }, [profileContext]);

  // V8: Contact Radar - group calls by contact
  const contactRadar: ContactRadarEntry[] = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);
    const grouped = new Map<string, ContactRadarEntry>();
    
    safeArray(callLogs).forEach(call => {
      const key = call.phoneNumber || call.contactName || 'unknown';
      const displayName = call.contactName || call.phoneNumber || 'Unbekannt';
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          displayName,
          lastCallAt: call.createdAt,
          callCount7d: 0,
          callCount30d: 0,
          pendingCount: 0,
          calls: [],
        });
      }
      
      const entry = grouped.get(key)!;
      entry.calls.push(call);
      
      // Update last call if newer
      if (new Date(call.createdAt) > new Date(entry.lastCallAt)) {
        entry.lastCallAt = call.createdAt;
        entry.lastOutcome = call.summary?.outcome;
        entry.lastSentiment = call.summary?.sentiment;
        entry.lastNextStep = call.summary?.nextStep;
      }
      
      // Count by time range
      const callDate = new Date(call.createdAt);
      if (isAfter(callDate, sevenDaysAgo)) entry.callCount7d++;
      if (isAfter(callDate, thirtyDaysAgo)) entry.callCount30d++;
      
      // Count pending
      if (call.summaryStatus === 'pending' || (!call.summary && call.status === 'completed')) {
        entry.pendingCount++;
      }
    });
    
    // Sort by last call date descending, take top 8
    return Array.from(grouped.values())
      .sort((a, b) => new Date(b.lastCallAt).getTime() - new Date(a.lastCallAt).getTime())
      .slice(0, 8);
  }, [callLogs]);

  // V8: Last sync timestamp (client time)
  const lastSyncTime = useMemo(() => format(new Date(), 'HH:mm:ss'), [callLogs, chatSessions]);

  // V7: Today Agenda - combine calls today + calendar events today
  const todayAgenda = useMemo(() => {
    const items: { time: string; title: string; label: 'CALL' | 'CALENDAR'; secondary?: string; rawId?: string | number; type?: 'call' | 'calendar' }[] = [];
    
    // Calls today
    callActivities.filter(c => isToday(new Date(c.timestamp))).forEach(call => {
      const time = format(new Date(call.timestamp), 'HH:mm');
      items.push({
        time,
        title: call.title,
        label: 'CALL',
        secondary: call.summaryShort || (call.status === 'pending' ? 'Wird verarbeitet' : call.status === 'ready' ? 'Abgeschlossen' : ''),
        rawId: call.id,
        type: 'call',
      });
    });
    
    // Calendar events today
    const today = format(new Date(), 'yyyy-MM-dd');
    safeArray(calendarEvents).filter(e => e.date === today || e.date?.startsWith(today)).forEach(event => {
      items.push({
        time: event.startTime || '—',
        title: event.title,
        label: 'CALENDAR',
        secondary: event.location || '',
        type: 'calendar',
      });
    });
    
    // Sort by time
    items.sort((a, b) => a.time.localeCompare(b.time));
    return items;
  }, [callActivities, calendarEvents]);

  // V7: Follow-up Queue - items that need attention
  const followUpQueue = useMemo(() => {
    const items: ActivityItem[] = [];
    
    // Failed items first
    [...safeArray(callActivities), ...safeArray(chatActivities)]
      .filter(i => i.status === 'failed')
      .forEach(i => items.push(i));
    
    // Pending/missing summaries
    [...safeArray(callActivities), ...safeArray(chatActivities)]
      .filter(i => i.status === 'pending' && !items.find(x => x.id === i.id))
      .forEach(i => items.push(i));
    
    // Items with nextStep (newest first, limit 5)
    const withActions = actionItems.filter(a => !a.done).slice(0, 3);
    withActions.forEach(a => {
      const existing = [...safeArray(callActivities), ...safeArray(chatActivities)].find(i => 
        (a.source.type === 'call' && i.type === 'call' && i.id === a.rawId) ||
        (a.source.type === 'space' && i.type === 'space' && i.id === a.rawId)
      );
      if (existing && !items.find(x => x.id === existing.id)) {
        items.push(existing);
      }
    });
    
    return items.slice(0, 5);
  }, [callActivities, chatActivities, actionItems]);

  // V7: Feed status for readiness panel
  const feedStatus = useMemo(() => {
    if (isCallError || isChatError) return 'DEGRADED';
    return 'OK';
  }, [isCallError, isChatError]);

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

        {/* HEADER - Mission Control V5 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIM.duration }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 mb-2 font-medium">
              ARAS AI
            </p>
            <h1 
              className="text-2xl sm:text-3xl font-black font-['Orbitron'] tracking-wide inline-block relative"
              style={{ 
                background: `linear-gradient(90deg, ${DT.orange}, #ffb15a, ${DT.gold}, #ffb15a, ${DT.orange})`,
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'sheen 10s linear infinite',
              }}
            >
              MISSION CONTROL
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute -bottom-1.5 left-0 right-0 h-[2px] origin-left"
                style={{ background: `linear-gradient(90deg, ${DT.orange}, ${DT.gold}50, transparent)` }}
              />
            </h1>
            <p className="text-[13px] text-neutral-500 mt-2">
              Anrufe &amp; Space-Aktivität in Echtzeit
            </p>
          </div>
          
          {/* Status Pill */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full self-start sm:self-auto"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
            <span className="text-[11px] text-green-400/90 font-medium uppercase tracking-wide">Bereit</span>
          </div>
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
          <StatTile label="Calls heute" value={stats.callsToday} />
          <StatTile label="Space heute" value={stats.spaceToday} />
          <StatTile 
            label="Ø Dauer (7T)" 
            value={stats.avgDuration ? formatDuration(stats.avgDuration) : '—'} 
            hint={!stats.avgDuration ? 'Min. 2 Calls nötig' : undefined}
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
              className="rounded-2xl overflow-hidden"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              {/* Control Strip - Filter + Search */}
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 p-0.5 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {(['all', 'call', 'space'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        aria-pressed={activeFilter === filter}
                        className={`px-4 py-2 rounded-[8px] text-[11px] font-semibold uppercase tracking-wider transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
                          activeFilter === filter 
                            ? 'text-white' 
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                        style={activeFilter === filter ? { 
                          background: `linear-gradient(135deg, rgba(255,106,0,0.2), rgba(255,106,0,0.08))`, 
                          boxShadow: '0 0 12px rgba(255,106,0,0.12), inset 0 0 0 1px rgba(255,106,0,0.25)'
                        } : {}}
                      >
                        {filter === 'all' ? 'Alles' : filter === 'call' ? 'Calls' : 'Space'}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Suchen (Titel, Tags, Zusammenfassung)"
                      className="w-full px-4 py-2 rounded-[10px] text-[13px] focus:outline-none transition-all placeholder:text-neutral-600"
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: `1px solid ${DT.panelBorder}`, 
                        color: '#fff'
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(255,106,0,0.3)'}
                      onBlur={e => e.target.style.borderColor = DT.panelBorder}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-[11px] font-medium transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.06]"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Feed Content */}
              <div className="p-4">
              
              {/* Activity List */}
              {allActivities.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-neutral-400 mb-4">Noch keine Aktivität</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a 
                      href="/app/power"
                      className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:translate-y-[-1px]"
                      style={{ 
                        background: `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})`, 
                        color: '#000',
                        boxShadow: '0 4px 20px rgba(255,106,0,0.2)'
                      }}
                    >
                      Ersten Anruf starten
                    </a>
                    <a 
                      href="/app/space"
                      className="px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:bg-white/[0.06]"
                      style={{ border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                    >
                      Space öffnen
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedActivities.map(group => (
                    <div key={group.label}>
                      {/* Group Label */}
                      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 mb-2 px-1">
                        {group.label}
                      </p>
                      
                      {/* Group Items - Premium List Rows */}
                      <div className="space-y-1.5">
                        {group.items.map((item, idx) => (
                          <motion.button
                            key={`${item.type}-${item.id}`}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ y: -1, x: 2 }}
                            transition={{ duration: ANIM.duration, delay: idx * ANIM.stagger }}
                            onClick={() => handleOpenDetails(item)}
                            aria-label={`${item.type === 'call' ? 'Anruf' : 'Space Session'}: ${item.title}`}
                            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 text-left group"
                            style={{ 
                              background: DT.rowBg,
                              border: `1px solid transparent`
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = DT.rowBgHover;
                              e.currentTarget.style.borderColor = 'rgba(255,106,0,0.15)';
                              e.currentTarget.style.boxShadow = '0 0 20px rgba(255,106,0,0.06)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = DT.rowBg;
                              e.currentTarget.style.borderColor = 'transparent';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {/* Status dot + Type indicator */}
                            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-5">
                              <div 
                                className={`w-2 h-2 rounded-full transition-all ${
                                  item.status === 'ready' || item.status === 'completed' ? 'bg-green-500/80' : 
                                  item.status === 'failed' ? 'bg-red-500/80' : 
                                  item.status === 'pending' ? 'bg-amber-500/80' :
                                  'bg-blue-500/80'
                                }`} 
                                style={{ boxShadow: item.status === 'pending' ? '0 0 8px rgba(245,158,11,0.4)' : undefined }}
                              />
                              <span className="text-[8px] uppercase tracking-wider text-neutral-600 font-medium">
                                {item.type === 'call' ? 'CALL' : 'SPACE'}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] truncate font-medium group-hover:text-white transition-colors" style={{ color: DT.gold }}>
                                  {item.title}
                                </p>
                                <span className="text-[10px] text-neutral-600 flex-shrink-0">
                                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: de })}
                                </span>
                              </div>
                              {/* Summary line - clean shimmer */}
                              {item.summaryShort ? (
                                <p className="text-xs text-neutral-400 truncate mt-1">{item.summaryShort}</p>
                              ) : item.status === 'pending' ? (
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="h-1 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <div className="h-full w-10 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${DT.orange}30, transparent)`, animation: 'shimmer 2s ease-in-out infinite' }} />
                                  </div>
                                  <p className="text-[10px] text-neutral-600">Wird aktualisiert</p>
                                </div>
                              ) : item.status === 'failed' ? (
                                <p className="text-[11px] text-red-400/70 mt-1">Fehlgeschlagen</p>
                              ) : item.type === 'space' && item.status === 'completed' ? (
                                <p className="text-[11px] text-neutral-500 mt-1">
                                  {item.meta?.messageCount ? `${item.meta.messageCount} Nachrichten` : 'Session'}
                                </p>
                              ) : item.type === 'call' && !item.summaryShort ? (
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="h-1 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <div className="h-full w-10 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${DT.orange}30, transparent)`, animation: 'shimmer 2s ease-in-out infinite' }} />
                                  </div>
                                  <p className="text-[10px] text-neutral-600">Wird aktualisiert</p>
                                </div>
                              ) : null}
                            </div>
                            
                            {/* Meta (duration/count) */}
                            <span className="text-[11px] text-neutral-500 tabular-nums flex-shrink-0 font-medium">
                              {item.meta?.durationSec ? formatDuration(item.meta.durationSec) : item.meta?.messageCount ? `${item.meta.messageCount}` : ''}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: col-span-4 */}
          <div className="lg:col-span-4 space-y-4">

            {/* V6: Business Snapshot Panel */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.2 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                    Business Snapshot
                  </h3>
                  {profileCompleteness && (
                    <span className="text-[10px] font-medium" style={{ color: profileCompleteness.filled >= 7 ? '#22c55e' : DT.orange }}>
                      {profileCompleteness.filled}/{profileCompleteness.total}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                {profileLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-neutral-800/50 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-neutral-800/30 rounded animate-pulse w-1/2" />
                  </div>
                ) : profileError || !profileContext ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-neutral-500 mb-3">Profil nicht verfügbar</p>
                    <a href="/app/leads" className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.06]" style={{ color: DT.orange }}>
                      Zur Wissensdatenbank
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Company / Name */}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DT.gold }}>
                        {profileContext.company || profileContext.name || 'Unbenannt'}
                      </p>
                      {profileContext.industry && (
                        <p className="text-[11px] text-neutral-500 mt-0.5">{profileContext.industry}</p>
                      )}
                    </div>
                    
                    {/* AI Profile fields */}
                    {profileContext.aiProfile?.companyDescription && (
                      <p className="text-xs text-neutral-400 line-clamp-2">
                        {profileContext.aiProfile.companyDescription}
                      </p>
                    )}
                    
                    {profileContext.aiProfile?.targetAudience && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-neutral-600 mb-0.5">Zielgruppe</p>
                        <p className="text-[11px] text-neutral-400">{profileContext.aiProfile.targetAudience}</p>
                      </div>
                    )}
                    
                    {/* V8: Completeness bar */}
                    {profileCompleteness && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] uppercase tracking-wide text-neutral-600">Vollständigkeit</span>
                          <span className="text-[10px] font-medium" style={{ color: profileCompleteness.filled >= 7 ? DT.statusReady : DT.orange }}>
                            {profileCompleteness.filled}/{profileCompleteness.total}
                          </span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(profileCompleteness.filled / profileCompleteness.total) * 100}%`,
                              background: profileCompleteness.filled >= 7 ? DT.statusReady : `linear-gradient(90deg, ${DT.orange}, ${DT.gold})`
                            }}
                          />
                        </div>
                        {profileCompleteness.missing.length > 0 && profileCompleteness.missing.length <= 5 && (
                          <p className="text-[9px] text-neutral-600 mt-1.5">
                            Fehlt: {profileCompleteness.missing.slice(0, 3).join(', ')}{profileCompleteness.missing.length > 3 ? ` +${profileCompleteness.missing.length - 3}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* CTA */}
                    {profileCompleteness && profileCompleteness.filled < 10 && (
                      <a 
                        href="/app/leads"
                        className="block w-full py-2.5 px-3 rounded-xl text-[11px] font-medium text-center transition-all hover:bg-white/[0.06] mt-1"
                        style={{ border: `1px solid ${DT.orange}30`, color: DT.orange }}
                      >
                        Jetzt vervollständigen
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* V9: Operations Panel (upgraded Action Inbox) */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.25 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                    Operations
                  </h3>
                  <span className="text-[10px] text-neutral-600">
                    {actionItems.filter(a => !a.done).length} offen
                  </span>
                </div>
                {/* Filter tabs */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {(['offen', 'heute', 'später', 'erledigt'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setOpsFilter(filter)}
                      className={`flex-1 px-2 py-1.5 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-all ${
                        opsFilter === filter ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'
                      }`}
                      style={opsFilter === filter ? { 
                        background: 'rgba(255,106,0,0.15)', 
                        boxShadow: 'inset 0 0 0 1px rgba(255,106,0,0.25)'
                      } : {}}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                {actionItems.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-neutral-500 mb-1">Keine Aufgaben</p>
                    <p className="text-[10px] text-neutral-600">Aufgaben werden aus Anruf-Zusammenfassungen erstellt</p>
                  </div>
                ) : filteredActionItems.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-neutral-500">Keine Aufgaben in dieser Ansicht</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto mission-drawer-scrollbar">
                    {filteredActionItems.map(action => (
                      <div 
                        key={action.id}
                        className={`p-3 rounded-xl transition-all ${action.done ? 'opacity-50' : ''}`}
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${DT.panelBorder}` }}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleActionDone(action.id)}
                            className="mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all"
                            style={{ 
                              borderColor: action.done ? '#22c55e' : 'rgba(255,255,255,0.2)',
                              background: action.done ? 'rgba(34,197,94,0.15)' : 'transparent'
                            }}
                          >
                            {action.done && <div className="w-2 h-2 rounded-sm bg-green-500" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed ${action.done ? 'line-through text-neutral-600' : 'text-neutral-300'}`}>
                              {action.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span 
                                className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
                                style={{ background: 'rgba(255,106,0,0.12)', color: DT.orange }}
                              >
                                {action.source.type}
                              </span>
                              <span className="text-[9px] text-neutral-600 truncate">{action.source.name}</span>
                            </div>
                            {/* Snooze indicator */}
                            {action.snoozedUntil && (
                              <p className="text-[9px] mt-1" style={{ color: DT.statusPending }}>
                                Zurückgestellt bis {format(new Date(action.snoozedUntil), 'dd.MM HH:mm', { locale: de })}
                              </p>
                            )}
                          </div>
                          {/* Snooze dropdown */}
                          {!action.done && !action.snoozedUntil && (
                            <div className="relative flex-shrink-0">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSnoozeAction(action.id, e.target.value as '1h' | 'morgen' | 'woche');
                                    e.target.value = '';
                                  }
                                }}
                                className="appearance-none text-[9px] px-2 py-1 rounded bg-transparent border cursor-pointer transition-colors hover:bg-white/[0.04]"
                                style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#888' }}
                                defaultValue=""
                              >
                                <option value="" disabled>Später</option>
                                <option value="1h">1 Stunde</option>
                                <option value="morgen">Morgen</option>
                                <option value="woche">Nächste Woche</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* V6: Calendar Preview Panel */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.3 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Kalender (7 Tage)
                </h3>
              </div>
              <div className="p-4">
                {calendarLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-neutral-800/50 rounded animate-pulse w-full" />
                    <div className="h-3 bg-neutral-800/30 rounded animate-pulse w-3/4" />
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-neutral-500 mb-1">Keine Termine</p>
                    <p className="text-[10px] text-neutral-600 mb-3">Kalender zeigt verbundene Termine</p>
                    <a 
                      href="/app/kalender"
                      className="inline-block text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                      style={{ color: DT.gold, border: `1px solid ${DT.panelBorder}` }}
                    >
                      Kalender öffnen
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {calendarEvents.slice(0, 5).map(event => (
                      <div 
                        key={event.id}
                        className="p-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${DT.panelBorder}` }}
                      >
                        <p className="text-xs font-medium text-neutral-300 truncate">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-neutral-500">
                            {format(new Date(event.date), 'dd.MM', { locale: de })}
                          </span>
                          {event.startTime && (
                            <span className="text-[10px] text-neutral-600">{event.startTime}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <a 
                      href="/app/kalender"
                      className="block text-center text-[11px] font-medium py-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      Alle anzeigen
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* V7: Today Agenda / Timeline Panel */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.35 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Heute
                </h3>
              </div>
              <div className="p-3">
                {todayAgenda.length === 0 ? (
                  <p className="text-xs text-neutral-600 text-center py-4">Heute keine Aktivitäten</p>
                ) : (
                  <div className="space-y-2">
                    {todayAgenda.slice(0, 6).map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                      >
                        <span className="text-[11px] font-mono text-neutral-500 w-10 flex-shrink-0">{item.time}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
                              style={{ 
                                background: item.label === 'CALL' ? 'rgba(255,106,0,0.15)' : 'rgba(99,102,241,0.15)',
                                color: item.label === 'CALL' ? DT.orange : '#818cf8'
                              }}
                            >
                              {item.label}
                            </span>
                            <p className="text-xs text-neutral-300 truncate">{item.title}</p>
                          </div>
                          {item.secondary && (
                            <p className="text-[10px] text-neutral-600 mt-0.5 truncate">{item.secondary}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* V7: Data Sources Panel (Matrix Tech) */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.4 }}
              className="matrix-panel rounded-2xl overflow-hidden"
              style={{ background: DT.matrixBg, border: `1px solid ${DT.matrixBorder}` }}
            >
              <div className="p-4 border-b relative z-10" style={{ borderColor: 'rgba(0,255,136,0.08)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono" style={{ color: DT.matrixTextDim }}>
                  Data Sources / Inventory
                </h3>
              </div>
              <div className="p-4 relative z-10 font-mono text-[11px]" style={{ color: DT.matrixText }}>
                {dataSourcesLoading ? (
                  <div className="space-y-1.5">
                    <div className="h-3 rounded animate-pulse w-3/4" style={{ background: 'rgba(0,255,136,0.1)' }} />
                    <div className="h-3 rounded animate-pulse w-1/2" style={{ background: 'rgba(0,255,136,0.08)' }} />
                  </div>
                ) : dataSourcesError ? (
                  <div>
                    <p style={{ color: '#ef4444' }}>FETCH_ERROR</p>
                    <button onClick={() => refetchDataSources()} className="mt-2 text-[10px] hover:underline" style={{ color: DT.matrixTextDim }}>
                      Erneut laden
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p>SOURCES_TOTAL: <span style={{ color: dataSourcesStats.total > 0 ? DT.matrixAccent : DT.matrixTextDim }}>{dataSourcesStats.total}</span></p>
                    {Object.entries(dataSourcesStats.byType).map(([type, count]) => (
                      <p key={type}>TYPE_{type.toUpperCase()}: {count}</p>
                    ))}
                    {dataSourcesStats.totalChars > 0 && (
                      <p>CHAR_TOTAL: {dataSourcesStats.totalChars.toLocaleString()}</p>
                    )}
                    {dataSourcesStats.total === 0 && (
                      <a href="/app/leads" className="block mt-3 text-[10px] hover:underline" style={{ color: DT.matrixTextDim }}>
                        Quellen verbinden
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* V8: System Readiness Panel (Matrix Tech) - Enhanced */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.45 }}
              className="matrix-panel rounded-2xl overflow-hidden"
              style={{ background: DT.matrixBg, border: `1px solid ${DT.matrixBorder}` }}
            >
              <div className="p-4 border-b relative z-10" style={{ borderColor: 'rgba(0,255,136,0.08)' }}>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono" style={{ color: DT.matrixTextDim }}>
                  System Readiness
                </h3>
              </div>
              <div className="p-4 relative z-10 font-mono text-[11px]" style={{ color: DT.matrixText }}>
                <div className="space-y-1">
                  <p>
                    PROFILE: <span style={{ color: (profileCompleteness?.filled ?? 0) >= 7 ? DT.matrixAccent : DT.orange }}>
                      {profileCompleteness ? `${profileCompleteness.filled}/${profileCompleteness.total}` : '—'}
                    </span>
                    {profileCompleteness && profileCompleteness.filled < 7 && (
                      <a href="/app/leads" className="ml-2 text-[9px] hover:underline" style={{ color: DT.matrixTextDim }}>FIX</a>
                    )}
                  </p>
                  <p>
                    SOURCES: <span style={{ color: dataSourcesStats.total > 0 ? DT.matrixAccent : DT.orange }}>{dataSourcesStats.total}</span>
                    {dataSourcesStats.total === 0 && (
                      <a href="/app/leads" className="ml-2 text-[9px] hover:underline" style={{ color: DT.matrixTextDim }}>FIX</a>
                    )}
                  </p>
                  <p>
                    SUMMARIES_PENDING: <span style={{ color: stats.pendingCount > 0 ? DT.statusPending : DT.matrixAccent }}>{stats.pendingCount}</span>
                    {stats.pendingCount > 0 && <span className="ml-2 text-[9px]" style={{ color: DT.matrixTextDim }}>AUTO</span>}
                  </p>
                  <p>
                    CALLS_TODAY: <span style={{ color: DT.matrixAccent }}>{stats.callsToday}</span>
                  </p>
                  <p>
                    SPACE_TODAY: <span style={{ color: DT.matrixAccent }}>{stats.spaceToday}</span>
                  </p>
                  <p>
                    FEED_STATUS: <span style={{ color: feedStatus === 'OK' ? DT.matrixAccent : DT.statusFailed }}>{feedStatus}</span>
                  </p>
                  <p>
                    LAST_SYNC: <span style={{ color: DT.matrixTextDim }}>{lastSyncTime}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* V8: Contact Radar Panel */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.48 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                    Contact Radar
                  </h3>
                  <span className="text-[10px] text-neutral-600">
                    {contactRadar.length} Kontakte
                  </span>
                </div>
              </div>
              <div className="p-3">
                {contactRadar.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-neutral-500 mb-1">Noch keine Kontakt-Historie</p>
                    <p className="text-[10px] text-neutral-600">Starte deinen ersten Anruf</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                    {contactRadar.map(contact => (
                      <button
                        key={contact.key}
                        onClick={() => {
                          // Open first call from this contact in drawer
                          const firstCall = contact.calls[0];
                          if (firstCall) {
                            const activity = callActivities.find(c => c.id === firstCall.id);
                            if (activity) handleOpenDetails(activity);
                          }
                        }}
                        className="w-full text-left p-3 rounded-xl transition-all hover:translate-y-[-1px]"
                        style={{ background: DT.rowBg, border: `1px solid ${DT.panelBorder}` }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-neutral-200 truncate">{contact.displayName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-neutral-500">{contact.callCount7d} Calls 7T</span>
                              {contact.pendingCount > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: DT.statusPending }}>
                                  {contact.pendingCount} pending
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] text-neutral-600 flex-shrink-0">
                            {formatDistanceToNow(new Date(contact.lastCallAt), { addSuffix: true, locale: de })}
                          </span>
                        </div>
                        {contact.lastOutcome && (
                          <p className="text-[10px] text-neutral-500 mt-1.5 line-clamp-1">{contact.lastOutcome}</p>
                        )}
                        {contact.lastNextStep && !contact.lastOutcome && (
                          <p className="text-[10px] mt-1.5 line-clamp-1" style={{ color: DT.orange }}>
                            Next: {contact.lastNextStep}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIM.duration, delay: 0.5 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: DT.panelBg, backdropFilter: 'blur(20px)', border: `1px solid ${DT.panelBorder}` }}
            >
              <div className="p-4 space-y-2">
                <a 
                  href="/app/power"
                  className="block w-full py-3 px-4 rounded-xl text-[13px] font-semibold text-center transition-all hover:translate-y-[-1px] hover:shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${DT.orange}, ${DT.goldDark})`, 
                    color: '#000',
                    boxShadow: '0 4px 20px rgba(255,106,0,0.15)'
                  }}
                >
                  Anruf starten
                </a>
                <a 
                  href="/app/space"
                  className="block w-full py-3 px-4 rounded-xl text-[13px] font-medium text-center transition-all hover:bg-white/[0.06]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${DT.panelBorder}`, color: DT.gold }}
                >
                  Space öffnen
                </a>
                <a 
                  href="/app/leads"
                  className="block w-full py-2.5 px-4 rounded-xl text-[12px] font-medium text-center transition-all hover:bg-white/[0.04]"
                  style={{ color: '#888' }}
                >
                  Wissensdatenbank
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* V9 MISSION PANEL DRAWER - 2026 Premium Design */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50"
              onClick={handleCloseDrawer}
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
            >
              {/* Backdrop: blur + gradient vignette */}
              <div 
                className="absolute inset-0"
                style={{ 
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.92) 100%)',
                  backdropFilter: 'blur(12px)',
                }}
              />
              
              {/* Panel Container - Responsive positioning */}
              <div className="absolute inset-0 flex items-end xl:items-stretch xl:justify-end">
                <motion.div
                  initial={{ x: '100%', opacity: 0.9 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0.9 }}
                  transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
                  className="relative w-full xl:w-[580px] xl:max-w-[40vw] xl:min-w-[520px] h-[90vh] xl:h-full flex flex-col rounded-t-[24px] xl:rounded-none overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(180deg, rgba(18,18,18,0.99) 0%, rgba(12,12,12,0.995) 100%)',
                    borderLeft: `1px solid ${DT.panelBorder}`,
                    boxShadow: '-20px 0 80px rgba(0,0,0,0.5)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Animated top border line */}
                  <div 
                    className="drawer-sheen-line h-[2px] w-full flex-shrink-0"
                    style={{ background: `linear-gradient(90deg, ${DT.orange}, ${DT.gold}, ${DT.orange})` }}
                  />
                  
                  {/* Drawer Header */}
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.22 }}
                    className="flex-shrink-0 px-6 py-5 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Type chip */}
                        <span 
                          className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
                          style={{ 
                            background: selectedItem.type === 'call' ? 'rgba(255,106,0,0.15)' : 'rgba(99,102,241,0.15)',
                            color: selectedItem.type === 'call' ? DT.orange : '#818cf8',
                            border: `1px solid ${selectedItem.type === 'call' ? 'rgba(255,106,0,0.25)' : 'rgba(99,102,241,0.25)'}`
                          }}
                        >
                          {selectedItem.type === 'call' ? 'CALL' : 'SPACE'}
                        </span>
                        
                        {/* Title */}
                        <h3 
                          id="drawer-title"
                          className="text-lg font-bold truncate"
                          style={{ color: DT.gold }}
                        >
                          {selectedItem.title}
                        </h3>
                        
                        {/* Secondary info line */}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500">
                          <span>{format(new Date(selectedItem.timestamp), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                          {selectedItem.meta?.durationSec && (
                            <span>{formatDuration(selectedItem.meta.durationSec)}</span>
                          )}
                          <span 
                            className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                            style={{ 
                              background: selectedItem.status === 'ready' || selectedItem.status === 'completed' ? 'rgba(34,197,94,0.12)' :
                                          selectedItem.status === 'pending' ? 'rgba(245,158,11,0.12)' :
                                          selectedItem.status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                              color: selectedItem.status === 'ready' || selectedItem.status === 'completed' ? '#22c55e' :
                                     selectedItem.status === 'pending' ? '#f59e0b' :
                                     selectedItem.status === 'failed' ? '#ef4444' : '#888'
                            }}
                          >
                            {selectedItem.status === 'ready' || selectedItem.status === 'completed' ? 'Bereit' :
                             selectedItem.status === 'pending' ? 'Wird verarbeitet' :
                             selectedItem.status === 'failed' ? 'Fehlgeschlagen' : 'In Bearbeitung'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => selectedItem && handleOpenDetails(selectedItem)}
                          disabled={loadingDetails}
                          className="text-[11px] font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                          style={{ 
                            background: 'rgba(255,106,0,0.1)', 
                            color: DT.orange,
                            border: '1px solid rgba(255,106,0,0.2)'
                          }}
                        >
                          {loadingDetails ? 'Lädt...' : 'Aktualisieren'}
                        </button>
                        <button
                          onClick={handleCloseDrawer}
                          className="text-[11px] font-medium px-3 py-2 rounded-lg transition-all hover:bg-white/[0.06]"
                          style={{ color: '#777', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          Schließen
                        </button>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Drawer Content - Premium scrollbar */}
                  <div className="flex-1 min-h-0 overflow-y-auto mission-drawer-scrollbar p-6">
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
              </div>
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
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className="rounded-2xl overflow-hidden transition-all group relative"
      style={{ 
        background: DT.panelBg,
        border: `1px solid ${DT.panelBorder}`,
        backdropFilter: 'blur(16px)'
      }}
    >
      {/* Top accent line */}
      <div 
        className="h-[2px] w-full"
        style={{ 
          background: highlight 
            ? `linear-gradient(90deg, ${DT.orange}, ${DT.gold})` 
            : isUnavailable 
              ? 'rgba(255,255,255,0.06)' 
              : `linear-gradient(90deg, ${DT.orange}60, ${DT.gold}40)`
        }}
      />
      
      <div className="p-4">
        <div 
          className="text-2xl sm:text-3xl font-bold mb-1 tabular-nums"
          style={{ color: isUnavailable ? '#555' : (highlight ? DT.orange : '#fff') }}
        >
          {value}
        </div>
        <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-neutral-500">
          {label}
        </div>
        {/* Unavailable hint inline */}
        {isUnavailable && hint && (
          <p className="text-[9px] text-neutral-600 mt-1">{hint}</p>
        )}
      </div>
      
      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
        style={{ boxShadow: highlight ? DT.glow : '0 0 20px rgba(255,255,255,0.03)' }}
      />
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
