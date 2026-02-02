/**
 * ============================================================================
 * ARAS COMMAND CENTER - Team Command Center Routes
 * ============================================================================
 * Endpoints for the Team Command Center dashboard:
 * - Team Feed (activity stream + posts)
 * - Team Calendar (shared events)
 * - Team Todos (shared tasks)
 * - Active Users (online staff/admin)
 * - Action Center (next best actions)
 * - Contracts Pending (awaiting approval)
 * ============================================================================
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { 
  teamFeed, teamCalendar, teamTodos, users,
  internalDeals, internalTasks, internalCallLogs, internalContacts,
  InsertTeamFeed, InsertTeamCalendar, InsertTeamTodo
} from '../../../shared/schema';
import { eq, desc, and, gte, lte, or, ne, sql, isNull } from 'drizzle-orm';
import { logger } from '../../logger';
import { requireInternal } from '../../middleware/role-guard';
import * as contractService from '../../services/contract.service';

const router = Router();

// ============================================================================
// TEAM FEED - Activity stream + post updates
// ============================================================================

router.get('/team-feed', requireInternal, async (req: any, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    const items = await db
      .select({
        id: teamFeed.id,
        authorUserId: teamFeed.authorUserId,
        authorUsername: users.username,
        type: teamFeed.type,
        message: teamFeed.message,
        category: teamFeed.category,
        targetType: teamFeed.targetType,
        targetId: teamFeed.targetId,
        targetName: teamFeed.targetName,
        metadata: teamFeed.metadata,
        createdAt: teamFeed.createdAt,
      })
      .from(teamFeed)
      .leftJoin(users, eq(teamFeed.authorUserId, users.id))
      .orderBy(desc(teamFeed.createdAt))
      .limit(limit);
    
    res.json({ items, total: items.length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching team feed:', error.message);
    res.status(500).json({ error: 'Failed to fetch team feed' });
  }
});

router.post('/team-feed', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      message: z.string().min(1).max(2000),
      type: z.enum(['note', 'update', 'announcement']).default('note'),
      category: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      targetName: z.string().optional(),
    });

    const data = schema.parse(req.body);
    
    const [item] = await db
      .insert(teamFeed)
      .values({
        authorUserId: userId,
        type: data.type,
        message: data.message,
        category: data.category,
        targetType: data.targetType,
        targetId: data.targetId,
        targetName: data.targetName,
      })
      .returning();

    // Fetch with author info
    const [result] = await db
      .select({
        id: teamFeed.id,
        authorUserId: teamFeed.authorUserId,
        authorUsername: users.username,
        type: teamFeed.type,
        message: teamFeed.message,
        category: teamFeed.category,
        targetType: teamFeed.targetType,
        targetId: teamFeed.targetId,
        targetName: teamFeed.targetName,
        createdAt: teamFeed.createdAt,
      })
      .from(teamFeed)
      .leftJoin(users, eq(teamFeed.authorUserId, users.id))
      .where(eq(teamFeed.id, item.id));

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error creating feed post:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// TEAM CALENDAR - Shared calendar events
// ============================================================================

router.get('/team-calendar', requireInternal, async (req: any, res) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const events = await db
      .select({
        id: teamCalendar.id,
        title: teamCalendar.title,
        description: teamCalendar.description,
        startsAt: teamCalendar.startsAt,
        endsAt: teamCalendar.endsAt,
        allDay: teamCalendar.allDay,
        location: teamCalendar.location,
        color: teamCalendar.color,
        createdByUserId: teamCalendar.createdByUserId,
        creatorUsername: users.username,
      })
      .from(teamCalendar)
      .leftJoin(users, eq(teamCalendar.createdByUserId, users.id))
      .where(gte(teamCalendar.startsAt, now))
      .orderBy(teamCalendar.startsAt)
      .limit(20);

    res.json({ events, total: events.length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching calendar:', error.message);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

router.post('/team-calendar', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      startsAt: z.string().transform(s => new Date(s)),
      endsAt: z.string().optional().transform(s => s ? new Date(s) : undefined),
      allDay: z.boolean().optional().default(false),
      location: z.string().optional(),
      color: z.string().optional().default('#FE9100'),
    });

    const data = schema.parse(req.body);
    
    const [event] = await db
      .insert(teamCalendar)
      .values({
        title: data.title,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        allDay: data.allDay,
        location: data.location,
        color: data.color,
        createdByUserId: userId,
      })
      .returning();

    res.status(201).json(event);
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error creating calendar event:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// TEAM TODOS - Shared task list
// ============================================================================

router.get('/team-todos', requireInternal, async (req: any, res) => {
  try {
    const status = req.query.status as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    let query = db
      .select({
        id: teamTodos.id,
        title: teamTodos.title,
        description: teamTodos.description,
        dueAt: teamTodos.dueAt,
        priority: teamTodos.priority,
        status: teamTodos.status,
        assignedToUserId: teamTodos.assignedToUserId,
        assignedUsername: users.username,
        createdByUserId: teamTodos.createdByUserId,
        completedAt: teamTodos.completedAt,
        createdAt: teamTodos.createdAt,
      })
      .from(teamTodos)
      .leftJoin(users, eq(teamTodos.assignedToUserId, users.id))
      .orderBy(teamTodos.dueAt, teamTodos.createdAt)
      .limit(limit);

    // Filter by status if provided
    const todos = status && status !== 'all'
      ? await query.where(eq(teamTodos.status, status))
      : await query.where(ne(teamTodos.status, 'done'));

    res.json({ todos, total: todos.length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching todos:', error.message);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

router.post('/team-todos', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      dueAt: z.string().optional().transform(s => s ? new Date(s) : undefined),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
      assignedToUserId: z.string().optional(),
    });

    const data = schema.parse(req.body);
    
    const [todo] = await db
      .insert(teamTodos)
      .values({
        title: data.title,
        description: data.description,
        dueAt: data.dueAt,
        priority: data.priority,
        assignedToUserId: data.assignedToUserId,
        createdByUserId: userId,
        status: 'pending',
      })
      .returning();

    res.status(201).json(todo);
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error creating todo:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.patch('/team-todos/:id', requireInternal, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status, title, dueAt, priority } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (title) updates.title = title;
    if (dueAt) updates.dueAt = new Date(dueAt);
    if (priority) updates.priority = priority;
    if (status === 'done') updates.completedAt = new Date();
    if (status === 'pending' || status === 'in_progress') updates.completedAt = null;

    const [todo] = await db
      .update(teamTodos)
      .set(updates)
      .where(eq(teamTodos.id, parseInt(id)))
      .returning();

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(todo);
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error updating todo:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// ACTIVE USERS - Online staff/admin
// ============================================================================

router.get('/active-users', requireInternal, async (req: any, res) => {
  try {
    // Get all staff/admin users - actual online status tracked via sessions
    const staffUsers = await db
      .select({
        id: users.id,
        username: users.username,
        userRole: users.userRole,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        or(
          eq(users.userRole, 'staff'),
          eq(users.userRole, 'admin')
        )
      )
      .orderBy(desc(users.updatedAt));

    res.json({ 
      users: staffUsers, 
      count: staffUsers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching active users:', error.message);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
});

// ============================================================================
// CONTRACTS PENDING - Awaiting approval
// ============================================================================

router.get('/contracts/pending', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    const userRole = req.user?.userRole || req.session?.userRole;
    
    // Get all pending contracts (for admins) or assigned contracts (for staff)
    const allContracts = contractService.getAllContracts?.() || [];
    
    const pendingContracts = allContracts.filter((c: any) => {
      if (c.status !== 'pending_approval' && c.status !== 'pending') return false;
      // Admin sees all, staff sees only their assigned
      if (userRole === 'admin') return true;
      return c.assignedUserId === userId;
    });

    res.json({ 
      contracts: pendingContracts.slice(0, 10),
      total: pendingContracts.length 
    });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching pending contracts:', error.message);
    res.status(500).json({ error: 'Failed to fetch pending contracts' });
  }
});

// ============================================================================
// ACTION CENTER - Next best actions
// ============================================================================

router.get('/action-center', requireInternal, async (req: any, res) => {
  try {
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get overdue and upcoming todos
    const urgentTodos = await db
      .select({
        id: teamTodos.id,
        title: teamTodos.title,
        dueAt: teamTodos.dueAt,
        priority: teamTodos.priority,
        type: sql<string>`'todo'`.as('type'),
      })
      .from(teamTodos)
      .where(
        and(
          ne(teamTodos.status, 'done'),
          or(
            lte(teamTodos.dueAt, endOfWeek),
            isNull(teamTodos.dueAt)
          )
        )
      )
      .orderBy(teamTodos.dueAt)
      .limit(5);

    // Get upcoming calendar events
    const upcomingEvents = await db
      .select({
        id: teamCalendar.id,
        title: teamCalendar.title,
        dueAt: teamCalendar.startsAt,
        priority: sql<string>`'medium'`.as('priority'),
        type: sql<string>`'event'`.as('type'),
      })
      .from(teamCalendar)
      .where(
        and(
          gte(teamCalendar.startsAt, now),
          lte(teamCalendar.startsAt, endOfWeek)
        )
      )
      .orderBy(teamCalendar.startsAt)
      .limit(5);

    // Combine and sort actions
    const actions = [...urgentTodos, ...upcomingEvents]
      .sort((a, b) => {
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      })
      .slice(0, 8);

    res.json({ actions, total: actions.length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching action center:', error.message);
    res.status(500).json({ error: 'Failed to fetch action center' });
  }
});

// ============================================================================
// AI INTELLIGENCE - Computed insights from CRM data
// ============================================================================

router.get('/ai-intelligence', async (req: any, res) => {
  try {
    const range = (req.query.range as string) || '24h';
    
    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Gather data for insights
    const [
      recentDeals,
      recentTasks,
      recentCalls,
      pendingContracts,
      recentContacts,
      recentFeed,
    ] = await Promise.all([
      // Deals with stage info
      db.select()
        .from(internalDeals)
        .where(gte(internalDeals.updatedAt, startDate))
        .orderBy(desc(internalDeals.updatedAt))
        .limit(50),
      
      // Tasks
      db.select()
        .from(internalTasks)
        .where(gte(internalTasks.updatedAt, startDate))
        .orderBy(desc(internalTasks.updatedAt))
        .limit(50),
      
      // Call logs
      db.select()
        .from(internalCallLogs)
        .where(gte(internalCallLogs.createdAt, startDate))
        .orderBy(desc(internalCallLogs.createdAt))
        .limit(50),
      
      // Pending contracts - use file-based service
      Promise.resolve(
        contractService.getAllContracts()
          .filter(c => c.status === 'pending_approval')
          .slice(0, 20)
      ),
      
      // New contacts
      db.select()
        .from(internalContacts)
        .where(gte(internalContacts.createdAt, startDate))
        .limit(30),
      
      // Recent feed activity
      db.select()
        .from(teamFeed)
        .where(gte(teamFeed.createdAt, startDate))
        .orderBy(desc(teamFeed.createdAt))
        .limit(30),
    ]);

    // Compute insights
    const highlights: Array<{
      id: string;
      title: string;
      severity: 'info' | 'warning' | 'success';
      tag: string;
      entityType?: string;
      entityId?: string;
      text: string;
    }> = [];

    const risks: Array<{
      id: string;
      title: string;
      severity: 'low' | 'medium' | 'high';
      entityType?: string;
      entityId?: string;
      text: string;
    }> = [];

    const actions: Array<{
      id: string;
      title: string;
      dueAt?: string;
      entityType?: string;
      entityId?: string;
      ctaLabel: string;
    }> = [];

    // === HIGHLIGHTS ===
    
    // New contacts
    if (recentContacts.length > 0) {
      highlights.push({
        id: 'new-contacts',
        title: `${recentContacts.length} neue Kontakte`,
        severity: 'success',
        tag: 'CRM',
        text: `${recentContacts.length} neue Kontakte wurden in den letzten ${range === 'today' ? 'heute' : range === '7d' ? '7 Tagen' : '24 Stunden'} erstellt.`,
      });
    }

    // Deals won
    const dealsWon = recentDeals.filter(d => d.stage === 'CLOSED_WON');
    if (dealsWon.length > 0) {
      const totalValue = dealsWon.reduce((sum, d) => sum + (d.value || 0), 0);
      highlights.push({
        id: 'deals-won',
        title: `${dealsWon.length} Deal${dealsWon.length > 1 ? 's' : ''} gewonnen`,
        severity: 'success',
        tag: 'Sales',
        text: `Gewonnene Deals mit einem Gesamtwert von €${(totalValue / 100).toLocaleString('de-DE')}.`,
      });
    }

    // Tasks completed
    const tasksCompleted = recentTasks.filter(t => t.status === 'DONE');
    if (tasksCompleted.length > 0) {
      highlights.push({
        id: 'tasks-completed',
        title: `${tasksCompleted.length} Tasks erledigt`,
        severity: 'success',
        tag: 'Productivity',
        text: `Das Team hat ${tasksCompleted.length} Aufgaben abgeschlossen.`,
      });
    }

    // Calls made
    if (recentCalls.length > 0) {
      const positiveCalls = recentCalls.filter(c => c.sentiment === 'POSITIVE');
      highlights.push({
        id: 'calls-summary',
        title: `${recentCalls.length} Anrufe`,
        severity: 'info',
        tag: 'Calls',
        text: `${recentCalls.length} Anrufe durchgeführt, davon ${positiveCalls.length} mit positivem Ergebnis.`,
      });
    }

    // === RISKS ===

    // Overdue tasks
    const overdueTasks = recentTasks.filter(t => 
      t.status !== 'DONE' && 
      t.status !== 'CANCELLED' && 
      t.dueDate && 
      new Date(t.dueDate) < now
    );
    if (overdueTasks.length > 0) {
      risks.push({
        id: 'overdue-tasks',
        title: `${overdueTasks.length} überfällige Tasks`,
        severity: overdueTasks.length > 5 ? 'high' : overdueTasks.length > 2 ? 'medium' : 'low',
        text: `${overdueTasks.length} Aufgaben sind überfällig und benötigen Aufmerksamkeit.`,
      });
    }

    // Pending contracts
    if (pendingContracts.length > 0) {
      risks.push({
        id: 'pending-contracts',
        title: `${pendingContracts.length} Verträge warten auf Freigabe`,
        severity: pendingContracts.length > 3 ? 'high' : 'medium',
        text: `${pendingContracts.length} Vertrag${pendingContracts.length > 1 ? 'e' : ''} benötigt Genehmigung.`,
      });
    }

    // Stuck deals (in same stage for too long)
    const stuckDeals = recentDeals.filter(d => {
      if (d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST') return false;
      const daysSinceUpdate = (now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    });
    if (stuckDeals.length > 0) {
      risks.push({
        id: 'stuck-deals',
        title: `${stuckDeals.length} stagnierende Deals`,
        severity: stuckDeals.length > 3 ? 'high' : 'medium',
        entityType: 'deal',
        entityId: stuckDeals[0]?.id,
        text: `${stuckDeals.length} Deal${stuckDeals.length > 1 ? 's' : ''} hatte seit über 7 Tagen keine Aktivität.`,
      });
    }

    // Negative call outcomes
    const negativeCalls = recentCalls.filter(c => c.sentiment === 'NEGATIVE');
    if (negativeCalls.length > 2) {
      risks.push({
        id: 'negative-calls',
        title: `${negativeCalls.length} negative Anrufe`,
        severity: 'medium',
        text: `${negativeCalls.length} Anrufe mit negativem Ergebnis - Gesprächsstrategie prüfen.`,
      });
    }

    // === ACTIONS ===

    // Oldest overdue task
    if (overdueTasks.length > 0) {
      const oldestOverdue = overdueTasks.sort((a, b) => 
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )[0];
      actions.push({
        id: 'action-overdue-task',
        title: oldestOverdue.title,
        dueAt: oldestOverdue.dueDate?.toISOString(),
        entityType: 'task',
        entityId: oldestOverdue.id,
        ctaLabel: 'Task öffnen',
      });
    }

    // Pending contract to approve
    if (pendingContracts.length > 0) {
      const oldestContract = pendingContracts[0];
      actions.push({
        id: 'action-approve-contract',
        title: `Vertrag freigeben: ${(oldestContract as any).title || 'Unbenannt'}`,
        entityType: 'contract',
        entityId: (oldestContract as any).id,
        ctaLabel: 'Freigeben',
      });
    }

    // Deal needing follow-up
    if (stuckDeals.length > 0) {
      const priorityDeal = stuckDeals.sort((a, b) => (b.value || 0) - (a.value || 0))[0];
      actions.push({
        id: 'action-followup-deal',
        title: `Follow-up: ${priorityDeal.title}`,
        entityType: 'deal',
        entityId: priorityDeal.id,
        ctaLabel: 'Deal öffnen',
      });
    }

    // Open tasks to complete
    const openTasks = recentTasks.filter(t => t.status === 'OPEN').slice(0, 2);
    for (const task of openTasks) {
      actions.push({
        id: `action-task-${task.id}`,
        title: task.title,
        dueAt: task.dueDate?.toISOString(),
        entityType: 'task',
        entityId: task.id,
        ctaLabel: 'Erledigen',
      });
    }

    res.json({
      range,
      generatedAt: now.toISOString(),
      stats: {
        deals: recentDeals.length,
        tasks: recentTasks.length,
        calls: recentCalls.length,
        contacts: recentContacts.length,
        feedItems: recentFeed.length,
      },
      highlights: highlights.slice(0, 5),
      risks: risks.slice(0, 5),
      actions: actions.slice(0, 5),
    });

  } catch (error: any) {
    console.error('[AI-INTELLIGENCE] Error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
