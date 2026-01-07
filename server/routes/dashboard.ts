/**
 * ARAS Mission Control - Dashboard API
 * Aggregates all user data into single overview endpoint
 * Graceful degradation - partial data on service failures
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  users, callLogs, campaigns, contacts, chatSessions, 
  chatMessages, voiceTasks, feedback, calendarEvents,
  internalCallLogs
} from '@shared/schema';
import { eq, desc, gte, and, count, sql, or, isNotNull } from 'drizzle-orm';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface RecentCall {
  id: string;
  startedAt: string;
  status: 'running' | 'completed' | 'failed' | 'initiated';
  contact?: { id?: string; name?: string; phone?: string };
  campaign?: { id?: string; name?: string };
  duration?: number;
  hasAudio: boolean;
  audioUrl?: string;
  hasTranscript: boolean;
  transcript?: string;
  hasSummary: boolean;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  nextStep?: string;
  // Gemini recommendations (cached)
  geminiActions?: string[];
  geminiPriority?: number;
  geminiSuggestedMessage?: string;
  geminiRiskFlags?: string[];
}

interface DebugInfo {
  userId: string;
  scope: ScopeResult;
  sources: {
    callLogs: number;
    internalCallLogs: number;
  };
  totalRaw: number;
  totalDeduped: number;
  totalReturned: number;
  firstCallIds: string[];
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// SCOPE RESOLVER - Multi-field call matching
// ═══════════════════════════════════════════════════════════════

interface ScopeResult {
  userId: string;
  workspaceId?: string;
  orgId?: string;
  tenantId?: string;
  matchFieldUsed: 'userId' | 'workspaceId' | 'orgId' | 'tenantId' | 'ownerId' | 'createdBy' | 'accountId';
}

function resolveScope(req: Request): ScopeResult {
  const userId = req.session?.userId || '';
  
  // Try to extract additional scope from session/user
  const workspaceId = (req.session as any)?.workspaceId;
  const orgId = (req.session as any)?.orgId || (req.session as any)?.organizationId;
  const tenantId = (req.session as any)?.tenantId;
  
  // Determine best match field
  let matchFieldUsed: ScopeResult['matchFieldUsed'] = 'userId';
  if (workspaceId) matchFieldUsed = 'workspaceId';
  else if (orgId) matchFieldUsed = 'orgId';
  else if (tenantId) matchFieldUsed = 'tenantId';
  
  return {
    userId,
    workspaceId,
    orgId,
    tenantId,
    matchFieldUsed,
  };
}

interface DashboardOverview {
  user: any;
  kpis: any;
  recentCalls: RecentCall[];
  nextActions: any[];
  activity: any[];
  modules: any;
  systemAlerts: any[];
  lastUpdated: string;
  errors: string[];
  debug?: DebugInfo;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getDateRanges() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return { now, todayStart, weekStart, monthStart };
}

function safeCount(arr: any[] | null | undefined): number {
  return Array.isArray(arr) ? arr.length : 0;
}

// Robust metadata parser - handles string, object, or null
function parseMetadata(metadata: unknown): Record<string, any> {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  if (typeof metadata === 'object') {
    return metadata as Record<string, any>;
  }
  return {};
}

// Extract summary from various sources - NEVER uses transcript!
function extractSummary(metadata: Record<string, any>): { text: string; outcome?: string; nextStep?: string; hasSummary: boolean } {
  // Priority 1: Structured summary object (like Power uses)
  if (metadata.summary && typeof metadata.summary === 'object') {
    const s = metadata.summary;
    return {
      text: s.outcome || s.summary || s.text || '',
      outcome: s.outcome,
      nextStep: s.nextStep || s.next_step || s.recommendedAction,
      hasSummary: Boolean(s.outcome || s.summary || s.text),
    };
  }
  
  // Priority 2: Plain string summary fields
  const summaryFields = ['summary', 'ai_summary', 'call_summary', 'gemini_summary', 'aiSummary', 'callSummary'];
  for (const field of summaryFields) {
    if (metadata[field] && typeof metadata[field] === 'string' && metadata[field].length > 10) {
      return {
        text: metadata[field],
        hasSummary: true,
      };
    }
  }
  
  // Priority 3: Nested in analysis/ai object
  if (metadata.analysis?.summary) {
    return { text: metadata.analysis.summary, hasSummary: true };
  }
  if (metadata.ai?.summary) {
    return { text: metadata.ai.summary, hasSummary: true };
  }
  if (metadata.gemini?.summary) {
    return { text: metadata.gemini.summary, hasSummary: true };
  }
  
  // NO FALLBACK TO TRANSCRIPT - return empty
  return { text: '', hasSummary: false };
}

// Extract sentiment (normalize various formats)
function extractSentiment(metadata: Record<string, any>): 'positive' | 'neutral' | 'negative' | undefined {
  const raw = metadata.sentiment || metadata.call_sentiment || metadata.mood;
  if (!raw) return undefined;
  const normalized = String(raw).toLowerCase();
  if (normalized.includes('positive') || normalized.includes('good') || normalized.includes('positiv')) return 'positive';
  if (normalized.includes('negative') || normalized.includes('bad') || normalized.includes('negativ')) return 'negative';
  return 'neutral';
}

// Extract Gemini cached data
function extractGeminiData(metadata: Record<string, any>) {
  const gemini = metadata.gemini || metadata.ai_recommendations || {};
  return {
    actions: Array.isArray(gemini.actions) ? gemini.actions : [],
    priority: typeof gemini.priority === 'number' ? gemini.priority : undefined,
    suggestedMessage: gemini.suggestedMessage || gemini.suggested_message || undefined,
    riskFlags: Array.isArray(gemini.riskFlags) ? gemini.riskFlags : [],
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENDPOINT
// ═══════════════════════════════════════════════════════════════

router.get('/overview', async (req: Request, res: Response) => {
  const errors: string[] = [];
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { now, todayStart, weekStart, monthStart } = getDateRanges();
  
  // Initialize with safe defaults
  const overview: DashboardOverview = {
    user: { id: userId, name: 'User', plan: 'free', timezone: 'Europe/Berlin' },
    kpis: {
      calls: { started: { today: 0, week: 0, month: 0 }, connected: { today: 0, week: 0, month: 0 }, successful: { today: 0, week: 0, month: 0 }, failed: { today: 0, week: 0, month: 0 }, avgDuration: 0 },
      campaigns: { active: 0, paused: 0, completed: 0, errors: 0, conversionRate: 0 },
      contacts: { total: 0, new: { today: 0, week: 0, month: 0 }, enriched: 0, hot: 0 },
      spaces: { active: 0, lastUsed: null, totalMessages: 0 },
      knowledge: { totalDocuments: 0, newUploads: { today: 0, week: 0, month: 0 }, errorSources: 0 },
      quotas: { calls: { used: 0, limit: 100 }, spaces: { used: 0, limit: 10 }, storage: { used: 0, limit: 1000 } },
    },
    recentCalls: [],
    nextActions: [],
    activity: [],
    modules: {
      contactRadar: [],
      todayOS: [],
      matrix: { cells: [], summary: { healthy: 0, warning: 0, critical: 0 } },
    },
    systemAlerts: [],
    lastUpdated: now.toISOString(),
    errors: [],
  };

  // ─────────────────────────────────────────────────────────────
  // FETCH USER
  // ─────────────────────────────────────────────────────────────
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user) {
      const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'User';
      overview.user = {
        id: user.id,
        name: displayName,
        email: user.email || '',
        plan: user.subscriptionPlan || 'free',
        timezone: 'Europe/Berlin',
      };
    }
  } catch (e: any) {
    errors.push('user: ' + e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // RESOLVE SCOPE + FETCH CALL LOGS (Multi-source, deduped)
  // ─────────────────────────────────────────────────────────────
  const scope = resolveScope(req);
  const showDebug = req.query.debug === '1';
  
  let callLogsCount = 0;
  let internalCallLogsCount = 0;
  const seenCallIds = new Set<string>();
  
  try {
    // SOURCE 1: Main callLogs table - try multiple fields in priority order
    let mainCalls: any[] = [];
    
    // Priority 1: workspaceId/orgId/tenantId if available
    if (scope.workspaceId) {
      try {
        mainCalls = await db.select().from(callLogs)
          .where(sql`${callLogs.metadata}->>'workspaceId' = ${scope.workspaceId}`);
        if (mainCalls.length > 0) scope.matchFieldUsed = 'workspaceId';
      } catch { /* field may not exist */ }
    }
    
    // Priority 2: userId (standard)
    if (mainCalls.length === 0) {
      mainCalls = await db.select().from(callLogs).where(eq(callLogs.userId, userId));
      scope.matchFieldUsed = 'userId';
    }
    
    // Priority 3: Fallback - check ownerId/createdBy/accountId in metadata
    if (mainCalls.length === 0) {
      try {
        const fallbackCalls = await db.select().from(callLogs)
          .where(sql`
            ${callLogs.metadata}->>'ownerId' = ${userId} OR
            ${callLogs.metadata}->>'createdBy' = ${userId} OR
            ${callLogs.metadata}->>'accountId' = ${userId}
          `);
        if (fallbackCalls.length > 0) {
          mainCalls = fallbackCalls;
          scope.matchFieldUsed = 'ownerId';
        }
      } catch { /* SQL might fail on some DBs */ }
    }
    
    callLogsCount = mainCalls.length;
    
    // SOURCE 2: internalCallLogs (system-wide, for admin view)
    let internalCalls: any[] = [];
    try {
      const allInternalCalls = await db.select().from(internalCallLogs).limit(50);
      internalCalls = allInternalCalls;
      internalCallLogsCount = internalCalls.length;
    } catch (internalErr: any) {
      // Table might not exist - OK
      if (showDebug) console.log('[Dashboard] internalCallLogs skipped:', internalErr.message);
    }
    
    // Combine all calls into unified format
    const allCalls = [
      ...mainCalls.map(c => ({
        ...c,
        source: 'callLogs' as const,
        timestamp: c.createdAt,
      })),
      ...internalCalls.map(c => ({
        id: c.id,
        userId,
        phoneNumber: c.phoneNumber || '',
        contactName: '', // Will be enriched
        status: c.outcome === 'REACHED' ? 'completed' : c.outcome === 'NO_ANSWER' ? 'failed' : 'initiated',
        duration: c.durationSeconds,
        transcript: null, // internalCallLogs doesn't have transcript
        recordingUrl: c.recordingUrl,
        metadata: c.rawMetadata,
        createdAt: c.timestamp || c.createdAt,
        source: 'internalCallLogs' as const,
        timestamp: c.timestamp,
        internalSummary: c.summary,
        internalSentiment: c.sentiment,
        contactId: c.contactId,
      })),
    ];
    
    // Filter by date ranges
    const todayCalls = allCalls.filter(c => c.timestamp && new Date(c.timestamp) >= todayStart);
    const weekCalls = allCalls.filter(c => c.timestamp && new Date(c.timestamp) >= weekStart);
    const monthCalls = allCalls.filter(c => c.timestamp && new Date(c.timestamp) >= monthStart);

    overview.kpis.calls = {
      started: { today: todayCalls.length, week: weekCalls.length, month: monthCalls.length },
      connected: { 
        today: todayCalls.filter(c => c.status === 'completed' || c.status === 'connected').length,
        week: weekCalls.filter(c => c.status === 'completed' || c.status === 'connected').length,
        month: monthCalls.filter(c => c.status === 'completed' || c.status === 'connected').length,
      },
      successful: {
        today: todayCalls.filter(c => c.status === 'completed').length,
        week: weekCalls.filter(c => c.status === 'completed').length,
        month: monthCalls.filter(c => c.status === 'completed').length,
      },
      failed: {
        today: todayCalls.filter(c => c.status === 'failed' || c.status === 'error').length,
        week: weekCalls.filter(c => c.status === 'failed' || c.status === 'error').length,
        month: monthCalls.filter(c => c.status === 'failed' || c.status === 'error').length,
      },
      avgDuration: allCalls.length > 0 
        ? Math.round(allCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / allCalls.length)
        : 0,
    };

    // Recent calls with FULL DATA (audio, transcript, summary) - TOP 20
    const recentCallsRaw = allCalls
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 20);
    
    // Parse and enrich each call
    for (const call of recentCallsRaw) {
      const metadata = parseMetadata(call.metadata);
      const hasAudio = Boolean(call.recordingUrl);
      const hasTranscript = Boolean(call.transcript && String(call.transcript).length > 0);
      
      // Extract summary - NEVER from transcript!
      const summaryData = extractSummary(metadata);
      let summaryText = summaryData.text;
      let nextStepFromSummary = summaryData.nextStep;
      let hasSummary = summaryData.hasSummary;
      
      // Fallback to internalSummary if available (from internalCallLogs)
      if (!hasSummary && (call as any).internalSummary) {
        summaryText = (call as any).internalSummary;
        hasSummary = true;
      }
      
      // Extract sentiment
      let sentiment = extractSentiment(metadata);
      if (!sentiment && (call as any).internalSentiment) {
        const internalSent = String((call as any).internalSentiment).toLowerCase();
        if (internalSent.includes('positive')) sentiment = 'positive';
        else if (internalSent.includes('negative')) sentiment = 'negative';
        else sentiment = 'neutral';
      }
      
      // Extract Gemini cached recommendations
      const geminiData = extractGeminiData(metadata);
      
      const recentCall: RecentCall = {
        id: String(call.id),
        startedAt: (call.createdAt || now).toISOString(),
        status: (call.status as any) || 'initiated',
        contact: {
          id: (call as any).leadId ? String((call as any).leadId) : (call as any).contactId || undefined,
          name: call.contactName || undefined,
          phone: call.phoneNumber || undefined,
        },
        campaign: (call as any).voiceAgentId ? {
          id: String((call as any).voiceAgentId),
          name: metadata.campaignName || 'Kampagne',
        } : undefined,
        duration: call.duration || undefined,
        hasAudio,
        // Use proxy URL for audio (Safari CORS fix)
        audioUrl: hasAudio ? `/api/call-logs/${call.id}/audio` : undefined,
        hasTranscript,
        transcript: call.transcript || undefined,
        hasSummary,
        summary: summaryText || undefined,
        sentiment,
        nextStep: nextStepFromSummary || metadata.nextStep || metadata.next_action || metadata.recommended_action || undefined,
        // Gemini cached data
        geminiActions: geminiData.actions.length > 0 ? geminiData.actions : undefined,
        geminiPriority: geminiData.priority,
        geminiSuggestedMessage: geminiData.suggestedMessage,
        geminiRiskFlags: geminiData.riskFlags.length > 0 ? geminiData.riskFlags : undefined,
      };
      
      overview.recentCalls.push(recentCall);
      
      // Also add to activity feed (but only first 10 calls)
      if (overview.activity.length < 15) {
        overview.activity.push({
          id: `call-${call.id}`,
          type: call.status === 'completed' ? 'call_completed' : call.status === 'failed' ? 'call_failed' : 'call_started',
          title: `Call ${call.status === 'completed' ? 'abgeschlossen' : call.status === 'failed' ? 'fehlgeschlagen' : 'gestartet'}`,
          description: call.contactName || call.phoneNumber || 'Kontakt',
          timestamp: (call.createdAt || now).toISOString(),
          metadata: { 
            callId: call.id, 
            duration: call.duration,
            hasAudio,
            hasTranscript,
            hasSummary,
            summary: summaryText ? summaryText.substring(0, 100) : undefined,
          },
        });
      }
    }
    
    // Add debug info (only when ?debug=1)
    if (showDebug) {
      (overview as any).debug = {
        userId,
        scope,
        sources: {
          callLogs: callLogsCount,
          internalCallLogs: internalCallLogsCount,
        },
        totalRaw: callLogsCount + internalCallLogsCount,
        totalDeduped: seenCallIds.size,
        totalReturned: overview.recentCalls.length,
        firstCallIds: overview.recentCalls.slice(0, 3).map(c => c.id),
        timestamp: now.toISOString(),
      };
    }
    
  } catch (e: any) {
    errors.push('calls: ' + e.message);
    console.error('[Dashboard] Calls fetch error:', e);
  }

  // ─────────────────────────────────────────────────────────────
  // FETCH CAMPAIGNS KPIs
  // ─────────────────────────────────────────────────────────────
  try {
    const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.userId, userId));
    
    overview.kpis.campaigns = {
      active: allCampaigns.filter(c => c.status === 'active' || c.status === 'running').length,
      paused: allCampaigns.filter(c => c.status === 'paused').length,
      completed: allCampaigns.filter(c => c.status === 'completed').length,
      errors: allCampaigns.filter(c => c.status === 'error' || c.status === 'failed').length,
      conversionRate: 0, // TODO: Calculate from actual conversions
    };

    // If no campaigns, suggest creating one
    if (allCampaigns.length === 0) {
      overview.nextActions.push({
        id: 'create-campaign',
        title: 'Erste Kampagne erstellen',
        description: 'Starte eine automatisierte Outbound-Kampagne.',
        category: 'campaigns',
        icon: 'Megaphone',
        priority: 'medium',
        primaryCta: { label: 'Kampagne erstellen', actionType: 'NAVIGATE', payload: { path: '/app/power/kampagnen' } },
      });
    }
  } catch (e: any) {
    errors.push('campaigns: ' + e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // FETCH CONTACTS KPIs
  // ─────────────────────────────────────────────────────────────
  try {
    const allContacts = await db.select().from(contacts).where(eq(contacts.userId, userId));
    
    const todayContacts = allContacts.filter(c => c.createdAt && new Date(c.createdAt) >= todayStart);
    const weekContacts = allContacts.filter(c => c.createdAt && new Date(c.createdAt) >= weekStart);
    const monthContacts = allContacts.filter(c => c.createdAt && new Date(c.createdAt) >= monthStart);

    overview.kpis.contacts = {
      total: allContacts.length,
      new: { today: todayContacts.length, week: weekContacts.length, month: monthContacts.length },
      enriched: allContacts.filter(c => (c as any).enriched).length,
      hot: allContacts.filter(c => (c as any).priority === 'hot' || (c as any).score > 80).length,
    };

    // Contact Radar - top contacts needing action
    const radarContacts = allContacts
      .slice(0, 8)
      .map(c => ({
        id: String(c.id),
        contactKey: String(c.id),
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.company || 'Unbekannt',
        company: c.company || '',
        priority: 'medium' as const,
        nextAction: 'Follow-up planen',
        lastContact: c.updatedAt || null,
        openTasks: 0,
        pendingCalls: 0,
        tags: [],
      }));
    overview.modules.contactRadar = radarContacts;

    // If no contacts, suggest importing
    if (allContacts.length === 0) {
      overview.nextActions.unshift({
        id: 'import-contacts',
        title: 'Kontakte importieren',
        description: 'Lade deine Kontakte hoch um mit Calls zu starten.',
        category: 'contacts',
        icon: 'Users',
        priority: 'high',
        primaryCta: { label: 'Kontakte importieren', actionType: 'NAVIGATE', payload: { path: '/app/contacts' } },
      });
    }
  } catch (e: any) {
    errors.push('contacts: ' + e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // FETCH SPACES (Chat Sessions) KPIs
  // ─────────────────────────────────────────────────────────────
  try {
    const allSessions = await db.select().from(chatSessions).where(eq(chatSessions.userId, userId));
    // Get messages from user's sessions
    const sessionIds = allSessions.map(s => s.id);
    const allMessages = sessionIds.length > 0 
      ? await db.select().from(chatMessages).where(sql`${chatMessages.sessionId} = ANY(${sessionIds})`)
      : [];
    
    const activeSessions = allSessions.filter(s => s.isActive);
    const lastSession = allSessions.sort((a, b) => 
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    )[0];

    overview.kpis.spaces = {
      active: activeSessions.length,
      lastUsed: lastSession?.updatedAt || null,
      totalMessages: allMessages.length,
    };

    // Recent space activity
    for (const session of allSessions.slice(0, 3)) {
      overview.activity.push({
        id: `space-${session.id}`,
        type: 'space_message',
        title: session.title || 'Space-Aktivität',
        description: 'Neue Nachrichten im Space',
        timestamp: session.updatedAt || now.toISOString(),
        metadata: { sessionId: session.id },
      });
    }
  } catch (e: any) {
    errors.push('spaces: ' + e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // FETCH TASKS FOR TODAY OS
  // ─────────────────────────────────────────────────────────────
  try {
    const allTasks = await db.select().from(voiceTasks).where(eq(voiceTasks.userId, userId));
    
    // voiceTasks doesn't have dueDate/title/priority - use taskName and createdAt
    const todayTasks = allTasks
      .filter(t => {
        if (!t.createdAt) return false;
        const created = new Date(t.createdAt);
        return created >= todayStart && created < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      })
      .map(t => ({
        id: String(t.id),
        type: 'task' as const,
        title: t.taskName || 'Aufgabe',
        time: t.createdAt?.toISOString() || null,
        done: t.status === 'completed',
        priority: 'medium' as const,
        actionCta: { label: 'Erledigen', actionType: 'CREATE_TASK' as const, payload: { taskId: t.id } },
      }));

    overview.modules.todayOS = todayTasks;

    // Add calendar events to Today OS
    const todayDateStr = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, '0')}-${String(todayStart.getDate()).padStart(2, '0')}`;
    const todayEvents = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        eq(calendarEvents.date, todayDateStr)
      ));
    
    for (const event of todayEvents.slice(0, 5)) {
      overview.modules.todayOS.push({
        id: `event-${event.id}`,
        type: 'meeting',
        title: event.title || 'Termin',
        time: event.time || null,
        done: event.status === 'completed',
        priority: 'medium',
      });
    }
  } catch (e: any) {
    errors.push('tasks: ' + e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // BUILD MATRIX PANEL
  // ─────────────────────────────────────────────────────────────
  try {
    overview.modules.matrix = {
      cells: [
        { category: 'Calls', status: 'Aktiv', count: overview.kpis.calls.started.today, trend: 'stable' },
        { category: 'Kampagnen', status: 'Aktiv', count: overview.kpis.campaigns.active, trend: 'stable' },
        { category: 'Kontakte', status: 'Gesamt', count: overview.kpis.contacts.total, trend: 'up' },
        { category: 'Spaces', status: 'Aktiv', count: overview.kpis.spaces.active, trend: 'stable' },
      ],
      summary: {
        healthy: errors.length === 0 ? 4 : 4 - Math.min(errors.length, 3),
        warning: Math.min(errors.length, 2),
        critical: errors.length > 2 ? 1 : 0,
      },
    };
  } catch (e: any) {
    errors.push('matrix: ' + e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // ADD DEFAULT ACTIONS IF EMPTY
  // ─────────────────────────────────────────────────────────────
  if (overview.nextActions.length === 0) {
    overview.nextActions = [
      {
        id: 'start-call',
        title: 'Neuen Call starten',
        description: 'Starte einen Einzelanruf mit ARAS Voice.',
        category: 'calls',
        icon: 'Phone',
        priority: 'high',
        primaryCta: { label: 'Call starten', actionType: 'NAVIGATE', payload: { path: '/app/power/einzelanruf' } },
      },
      {
        id: 'create-space',
        title: 'Space erstellen',
        description: 'Erstelle einen neuen AI-Chat Space.',
        category: 'spaces',
        icon: 'MessageSquare',
        priority: 'medium',
        primaryCta: { label: 'Space erstellen', actionType: 'NAVIGATE', payload: { path: '/app/space' } },
      },
      {
        id: 'add-kb',
        title: 'Wissen hinzufügen',
        description: 'Füge neue Quellen zur Wissensdatenbank hinzu.',
        category: 'knowledge',
        icon: 'Database',
        priority: 'medium',
        primaryCta: { label: 'Quelle hinzufügen', actionType: 'NAVIGATE', payload: { path: '/app/leads' } },
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // ADD SYSTEM ALERTS FOR ERRORS
  // ─────────────────────────────────────────────────────────────
  if (errors.length > 0) {
    overview.systemAlerts.push({
      id: 'partial-data',
      type: 'warning',
      title: 'Einige Daten konnten nicht geladen werden',
      description: `${errors.length} Service(s) haben nicht geantwortet. Dashboard zeigt verfügbare Daten.`,
      service: 'dashboard',
      timestamp: now.toISOString(),
      dismissible: true,
    });
    overview.errors = errors;
  }

  // Sort activity by timestamp (newest first)
  overview.activity.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  overview.activity = overview.activity.slice(0, 10);

  res.json(overview);
});

// ═══════════════════════════════════════════════════════════════
// GET /calls - All calls with pagination and filters
// ═══════════════════════════════════════════════════════════════
router.get('/calls', async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Parse query params
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  const status = req.query.status as string; // completed | failed | running | initiated
  const range = req.query.range as string; // today | 7d | 30d | all
  const hasAudio = req.query.hasAudio === 'true' ? true : req.query.hasAudio === 'false' ? false : undefined;
  const hasSummary = req.query.hasSummary === 'true' ? true : req.query.hasSummary === 'false' ? false : undefined;

  try {
    // Build date filter
    const { todayStart, weekStart, monthStart } = getDateRanges();
    let dateFilter: Date | null = null;
    if (range === 'today') dateFilter = todayStart;
    else if (range === '7d') dateFilter = weekStart;
    else if (range === '30d') dateFilter = monthStart;

    // Fetch calls from callLogs
    let query = db.select().from(callLogs).where(eq(callLogs.userId, userId));
    
    // Get all calls first, then filter in memory (simpler than complex SQL)
    const allCalls = await query.orderBy(desc(callLogs.createdAt));
    
    // Apply filters
    let filteredCalls = allCalls;
    
    if (dateFilter) {
      filteredCalls = filteredCalls.filter(c => c.createdAt && new Date(c.createdAt) >= dateFilter!);
    }
    if (status) {
      filteredCalls = filteredCalls.filter(c => c.status === status);
    }
    if (hasAudio !== undefined) {
      filteredCalls = filteredCalls.filter(c => Boolean(c.recordingUrl) === hasAudio);
    }
    
    const total = filteredCalls.length;
    
    // Apply pagination
    const paginatedCalls = filteredCalls.slice(offset, offset + limit);
    
    // Transform to RecentCall format
    const calls: RecentCall[] = paginatedCalls.map(call => {
      const metadata = parseMetadata(call.metadata);
      const callHasAudio = Boolean(call.recordingUrl);
      const hasTranscript = Boolean(call.transcript && String(call.transcript).length > 0);
      const summaryData = extractSummary(metadata);
      
      return {
        id: String(call.id),
        startedAt: (call.createdAt || new Date()).toISOString(),
        status: (call.status as any) || 'initiated',
        contact: {
          name: (call as any).contactName || metadata.contactName || undefined,
          phone: call.phoneNumber || undefined,
        },
        duration: call.duration || undefined,
        hasAudio: callHasAudio,
        audioUrl: callHasAudio ? `/api/call-logs/${call.id}/audio` : undefined,
        hasTranscript,
        transcript: call.transcript || undefined,
        hasSummary: summaryData.hasSummary,
        summary: summaryData.text || undefined,
        sentiment: extractSentiment(metadata),
        nextStep: summaryData.nextStep || metadata.nextStep || undefined,
      };
    });
    
    // Apply hasSummary filter after processing
    const finalCalls = hasSummary !== undefined 
      ? calls.filter(c => c.hasSummary === hasSummary)
      : calls;

    res.json({
      calls: finalCalls,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      filters: { status, range, hasAudio, hasSummary },
    });
  } catch (error: any) {
    console.error('[Dashboard] Calls fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch calls', message: error.message });
  }
});

export default router;
