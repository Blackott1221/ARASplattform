import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  users, leads, calendarEvents, contacts, campaigns,
  chatSessions, chatMessages, voiceAgents, callLogs,
  voiceTasks, feedback, usageTracking, twilioSettings,
  subscriptionPlans, sessions
} from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// 🔒 Admin Auth Middleware (you should verify admin rights here)
function requireAdmin(req: Request, res: Response, next: any) {
  // TODO: Add proper admin authentication check
  // For now, just proceed
  next();
}

// Helper function to create CRUD routes for any table
function createCRUDRoutes(
  tableName: string,
  table: any,
  router: Router
) {
  const basePath = `/${tableName}`;

  // GET ALL - List all records
  router.get(basePath, requireAdmin, async (req, res) => {
    try {
      const records = await db.select().from(table);
      res.json(records);
    } catch (error: any) {
      console.error(`Error fetching ${tableName}:`, error);
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
      const updatedRecord = await db
        .update(table)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(table.id, parsedId))
        .returning();
      
      if (updatedRecord.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json(updatedRecord[0]);
    } catch (error: any) {
      console.error(`Error updating ${tableName}:`, error);
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
      res.json({ success: true, deleted: deletedRecord[0] });
    } catch (error: any) {
      console.error(`Error deleting ${tableName}:`, error);
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

// Sessions endpoint (special handling - no update/delete)
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const allSessions = await db.select().from(sessions);
    res.json(allSessions);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📊 Dashboard Stats Endpoint
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      userCount,
      leadCount,
      contactCount,
      campaignCount,
      callLogCount,
      feedbackCount
    ] = await Promise.all([
      db.select().from(users).then(r => r.length),
      db.select().from(leads).then(r => r.length),
      db.select().from(contacts).then(r => r.length),
      db.select().from(campaigns).then(r => r.length),
      db.select().from(callLogs).then(r => r.length),
      db.select().from(feedback).then(r => r.length),
    ]);

    res.json({
      users: userCount,
      leads: leadCount,
      contacts: contactCount,
      campaigns: campaignCount,
      callLogs: callLogCount,
      feedback: feedbackCount
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
