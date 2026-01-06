/**
 * ARAS Mission Control - Dashboard API
 * Aggregates all user data into single overview endpoint
 * Graceful degradation - partial data on service failures
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  users, callLogs, campaigns, contacts, chatSessions, 
  chatMessages, voiceTasks, feedback, calendarEvents 
} from '@shared/schema';
import { eq, desc, gte, and, count, sql } from 'drizzle-orm';

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
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  nextStep?: string;
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
      overview.user = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        plan: user.subscriptionTier || 'free',
        timezone: 'Europe/Berlin',
      };
    }
  } catch (e: any) {
    errors.push('user: ' + e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // FETCH CALL LOGS KPIs
  // ─────────────────────────────────────────────────────────────
  try {
    const allCalls = await db.select().from(callLogs).where(eq(callLogs.userId, userId));
    
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

    // Recent calls with FULL DATA (audio, transcript, summary)
    const recentCallsRaw = allCalls
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);
    
    // Parse metadata for summary/sentiment/nextStep
    for (const call of recentCallsRaw) {
      const metadata = (call.metadata && typeof call.metadata === 'object') ? call.metadata as any : {};
      const hasAudio = Boolean(call.recordingUrl);
      const hasTranscript = Boolean(call.transcript && call.transcript.length > 0);
      
      // Extract summary from metadata or transcript
      let summary = metadata.summary || metadata.ai_summary || '';
      if (!summary && call.transcript && call.transcript.length > 100) {
        summary = call.transcript.substring(0, 150) + '...';
      }
      
      const recentCall: RecentCall = {
        id: String(call.id),
        startedAt: (call.createdAt || now).toISOString(),
        status: (call.status as any) || 'initiated',
        contact: {
          id: call.leadId ? String(call.leadId) : undefined,
          name: call.contactName || undefined,
          phone: call.phoneNumber || undefined,
        },
        campaign: call.voiceAgentId ? {
          id: String(call.voiceAgentId),
          name: metadata.campaignName || 'Kampagne',
        } : undefined,
        duration: call.duration || undefined,
        hasAudio,
        audioUrl: call.recordingUrl || undefined,
        hasTranscript,
        transcript: call.transcript || undefined,
        summary: summary || undefined,
        sentiment: metadata.sentiment || undefined,
        nextStep: metadata.nextStep || metadata.next_action || undefined,
      };
      
      overview.recentCalls.push(recentCall);
      
      // Also add to activity feed
      overview.activity.push({
        id: `call-${call.id}`,
        type: call.status === 'completed' ? 'call_completed' : call.status === 'failed' ? 'call_failed' : 'call_started',
        title: `Call ${call.status === 'completed' ? 'abgeschlossen' : call.status === 'failed' ? 'fehlgeschlagen' : 'gestartet'}`,
        description: call.contactName || call.phoneNumber || 'Unbekannte Nummer',
        timestamp: (call.createdAt || now).toISOString(),
        metadata: { 
          callId: call.id, 
          duration: call.duration,
          hasAudio,
          hasTranscript,
          summary: summary ? summary.substring(0, 80) : undefined,
        },
      });
    }
  } catch (e: any) {
    errors.push('calls: ' + e.message);
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
        name: c.name || 'Unbekannt',
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
    const allMessages = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, userId));
    
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
    
    const todayTasks = allTasks
      .filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= todayStart && due < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      })
      .map(t => ({
        id: String(t.id),
        type: 'task' as const,
        title: t.title || 'Aufgabe',
        time: t.dueDate || null,
        done: t.status === 'completed',
        priority: (t.priority as any) || 'medium',
        actionCta: { label: 'Erledigen', actionType: 'CREATE_TASK' as const, payload: { taskId: t.id } },
      }));

    overview.modules.todayOS = todayTasks;

    // Add calendar events to Today OS
    const todayEvents = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startDate, todayStart.toISOString())
      ));
    
    for (const event of todayEvents.slice(0, 5)) {
      overview.modules.todayOS.push({
        id: `event-${event.id}`,
        type: 'meeting',
        title: event.title || 'Termin',
        time: event.startDate || null,
        done: false,
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

export default router;
