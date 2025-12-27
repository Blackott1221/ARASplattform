import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  users, leads, calendarEvents, contacts, campaigns,
  chatSessions, chatMessages, voiceAgents, callLogs,
  voiceTasks, feedback, usageTracking, twilioSettings,
  subscriptionPlans, sessions
} from '../../shared/schema';
import { eq, desc, gt, sql, count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const router = Router();

// 🔒 Admin Auth Middleware (you should verify admin rights here)
function requireAdmin(req: Request, res: Response, next: any) {
  // TODO: Add proper admin authentication check
  // For now, just proceed
  next();
}

// ═══════════════════════════════════════════════════════════════
// 🟢 ONLINE STATUS - Get currently online users based on active sessions
// ═══════════════════════════════════════════════════════════════
router.get('/online-users', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    
    // Get all non-expired sessions
    const activeSessions = await db.select().from(sessions).where(gt(sessions.expire, now));
    
    // Extract user IDs from session data
    const onlineUserIds = new Set<string>();
    activeSessions.forEach((session: any) => {
      try {
        const sessData = typeof session.sess === 'string' ? JSON.parse(session.sess) : session.sess;
        if (sessData?.passport?.user) {
          onlineUserIds.add(sessData.passport.user);
        }
      } catch (e) {
        // Skip invalid sessions
      }
    });
    
    console.log(`[ADMIN] Found ${onlineUserIds.size} online users`);
    res.json({ 
      onlineUserIds: Array.from(onlineUserIds),
      totalActiveSessions: activeSessions.length
    });
  } catch (error: any) {
    console.error('[ADMIN ERROR] Failed to get online users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tables that have updatedAt column
const TABLES_WITH_UPDATED_AT = [
  'users', 'leads', 'calendar-events', 'contacts', 'campaigns',
  'chat-sessions', 'chat-messages', 'voice-agents', 'call-logs',
  'voice-tasks', 'feedback', 'twilio-settings'
];

// Helper function to create CRUD routes for any table
function createCRUDRoutes(
  tableName: string,
  table: any,
  router: Router
) {
  const basePath = `/${tableName}`;
  const hasUpdatedAt = TABLES_WITH_UPDATED_AT.includes(tableName);

  // GET ALL - List all records (sorted by createdAt DESC if available)
  router.get(basePath, requireAdmin, async (req, res) => {
    try {
      // Check if table has createdAt column for sorting
      const hasCreatedAt = table.createdAt !== undefined;
      const records = hasCreatedAt 
        ? await db.select().from(table).orderBy(desc(table.createdAt))
        : await db.select().from(table);
      console.log(`[ADMIN] Fetched ${records.length} records from ${tableName}`);
      res.json(records);
    } catch (error: any) {
      console.error(`[ADMIN ERROR] Error fetching ${tableName}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET ONE - Get single record
  router.get(`${basePath}/:id`, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // Try to parse as number for serial IDs
      const parsedId = isNaN(Number(id)) ? id : Number(id);
      const record = await db.select().from(table).where(eq(table.id, parsedId)).limit(1);
      if (record.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json(record[0]);
    } catch (error: any) {
      console.error(`Error fetching ${tableName} record:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST - Create new record
  router.post(basePath, requireAdmin, async (req, res) => {
    try {
      const newRecord = await db.insert(table).values(req.body).returning();
      res.status(201).json(newRecord[0]);
    } catch (error: any) {
      console.error(`Error creating ${tableName}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH - Update record
  router.patch(`${basePath}/:id`, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const parsedId = isNaN(Number(id)) ? id : Number(id);
      
      // Only add updatedAt if the table has that column
      const updateData = hasUpdatedAt 
        ? { ...req.body, updatedAt: new Date() }
        : { ...req.body };
      
      const updatedRecord = await db
        .update(table)
        .set(updateData)
        .where(eq(table.id, parsedId))
        .returning();
      
      if (updatedRecord.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      console.log(`[ADMIN] Updated ${tableName} record ${id}:`, Object.keys(req.body));
      res.json(updatedRecord[0]);
    } catch (error: any) {
      console.error(`[ADMIN ERROR] Error updating ${tableName}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE - Delete record
  router.delete(`${basePath}/:id`, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const parsedId = isNaN(Number(id)) ? id : Number(id);
      const deletedRecord = await db.delete(table).where(eq(table.id, parsedId)).returning();
      
      if (deletedRecord.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      console.log(`[ADMIN] Deleted ${tableName} record ${id}`);
      res.json({ success: true, deleted: deletedRecord[0] });
    } catch (error: any) {
      console.error(`[ADMIN ERROR] Error deleting ${tableName}:`, error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Create CRUD routes for all tables
createCRUDRoutes('users', users, router);
createCRUDRoutes('leads', leads, router);
createCRUDRoutes('calendar-events', calendarEvents, router);
createCRUDRoutes('contacts', contacts, router);
createCRUDRoutes('campaigns', campaigns, router);
createCRUDRoutes('chat-sessions', chatSessions, router);
createCRUDRoutes('chat-messages', chatMessages, router);
createCRUDRoutes('voice-agents', voiceAgents, router);
createCRUDRoutes('call-logs', callLogs, router);
createCRUDRoutes('voice-tasks', voiceTasks, router);
createCRUDRoutes('feedback', feedback, router);
createCRUDRoutes('usage-tracking', usageTracking, router);
createCRUDRoutes('twilio-settings', twilioSettings, router);
createCRUDRoutes('subscription-plans', subscriptionPlans, router);

// Sessions endpoint (special handling - uses 'sid' as primary key)
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const allSessions = await db.select().from(sessions).orderBy(desc(sessions.expire));
    // Map sid to id for frontend compatibility
    const mapped = allSessions.map(s => ({ ...s, id: s.sid }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete session by sid
router.delete('/sessions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(sessions).where(eq(sessions.sid, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    console.log(`[ADMIN] Deleted session ${id}`);
    res.json({ success: true, deleted: deleted[0] });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📊 Dashboard Stats Endpoint - ENHANCED with real metrics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all active sessions for online count
    const activeSessions = await db.select().from(sessions).where(gt(sessions.expire, now));
    const onlineUserIds = new Set<string>();
    activeSessions.forEach((session: any) => {
      try {
        const sessData = typeof session.sess === 'string' ? JSON.parse(session.sess) : session.sess;
        if (sessData?.passport?.user) {
          onlineUserIds.add(sessData.passport.user);
        }
      } catch (e) {}
    });
    
    const [
      allUsers,
      leadCount,
      contactCount,
      campaignCount,
      callLogCount,
      feedbackCount,
      chatSessionCount,
      voiceAgentCount
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(leads).then(r => r.length),
      db.select().from(contacts).then(r => r.length),
      db.select().from(campaigns).then(r => r.length),
      db.select().from(callLogs).then(r => r.length),
      db.select().from(feedback).then(r => r.length),
      db.select().from(chatSessions).then(r => r.length),
      db.select().from(voiceAgents).then(r => r.length),
    ]);

    // Calculate plan distribution
    const planDistribution = {
      free: 0,
      pro: 0,
      ultra: 0,
      ultimate: 0,
      other: 0
    };
    
    const statusDistribution = {
      active: 0,
      trialing: 0,
      canceled: 0,
      past_due: 0,
      trial_pending: 0
    };
    
    let totalAiMessages = 0;
    let totalVoiceCalls = 0;
    
    allUsers.forEach((user: any) => {
      // Plan distribution
      const plan = user.subscriptionPlan?.toLowerCase() || 'free';
      if (plan in planDistribution) {
        planDistribution[plan as keyof typeof planDistribution]++;
      } else {
        planDistribution.other++;
      }
      
      // Status distribution
      const status = user.subscriptionStatus?.toLowerCase() || 'trial_pending';
      if (status in statusDistribution) {
        statusDistribution[status as keyof typeof statusDistribution]++;
      }
      
      // Usage totals
      totalAiMessages += user.aiMessagesUsed || 0;
      totalVoiceCalls += user.voiceCallsUsed || 0;
    });

    res.json({
      // Basic counts
      users: allUsers.length,
      leads: leadCount,
      contacts: contactCount,
      campaigns: campaignCount,
      callLogs: callLogCount,
      feedback: feedbackCount,
      chatSessions: chatSessionCount,
      voiceAgents: voiceAgentCount,
      
      // Real-time metrics
      onlineUsers: onlineUserIds.size,
      activeSessions: activeSessions.length,
      
      // Usage metrics
      totalAiMessages,
      totalVoiceCalls,
      
      // Distributions
      planDistribution,
      statusDistribution
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔐 SPECIAL USER ACTIONS

// Change user password
router.post('/users/:id/change-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updated = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[ADMIN] Password changed for user ${id}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('[ADMIN ERROR] Change password failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Change user subscription plan
router.post('/users/:id/change-plan', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, status } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    const updateData: any = {
      subscriptionPlan: plan,
      updatedAt: new Date()
    };

    if (status) {
      updateData.subscriptionStatus = status;
    }

    const updated = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[ADMIN] Plan changed for user ${id} to ${plan}`);
    res.json({ success: true, user: updated[0] });
  } catch (error: any) {
    console.error('[ADMIN ERROR] Change plan failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset user usage counters
router.post('/users/:id/reset-usage', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await db
      .update(users)
      .set({ 
        aiMessagesUsed: 0,
        voiceCallsUsed: 0,
        trialMessagesUsed: 0,
        monthlyResetDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[ADMIN] Usage reset for user ${id}`);
    res.json({ success: true, user: updated[0] });
  } catch (error: any) {
    console.error('[ADMIN ERROR] Reset usage failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
