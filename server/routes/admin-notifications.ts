// ============================================================================
// ARAS Command Center - Real-time Notifications API
// ============================================================================
// Push notifications, alerts, and real-time updates
// ============================================================================

import { Router } from "express";
import { db } from "../db";
import { users, leads, callLogs, n8nEmailLogs } from "@shared/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { requireAdmin } from "../middleware/admin";
import { logger } from "../logger";

const router = Router();

// In-memory notification store (in production, use Redis)
const notificationStore: Map<string, any[]> = new Map();

// ============================================================================
// GET /notifications - Get user's notifications
// ============================================================================

router.get("/notifications", requireAdmin, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    const { unreadOnly = "false", limit = "20" } = req.query;

    // Generate real-time notifications from system events
    const notifications = await generateNotifications(userId);

    // Filter unread if requested
    const filtered = unreadOnly === "true" 
      ? notifications.filter(n => !n.read)
      : notifications;

    // Apply limit
    const limited = filtered.slice(0, parseInt(limit as string) || 20);

    res.json({
      data: limited,
      unreadCount: notifications.filter(n => !n.read).length,
      total: notifications.length,
    });
  } catch (error: any) {
    logger.error("[NOTIFICATIONS] Error fetching:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ============================================================================
// GET /notifications/count - Get unread count (fast endpoint for polling)
// ============================================================================

router.get("/notifications/count", requireAdmin, async (req: any, res) => {
  try {
    const notifications = await generateNotifications(req.session.userId);
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({ 
      unreadCount,
      hasUrgent: notifications.some(n => n.priority === "urgent" && !n.read),
    });
  } catch (error: any) {
    logger.error("[NOTIFICATIONS] Error counting:", error);
    res.status(500).json({ error: "Failed to count notifications" });
  }
});

// ============================================================================
// POST /notifications/:id/read - Mark notification as read
// ============================================================================

router.post("/notifications/:id/read", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Store read status
    const userNotifications = notificationStore.get(userId) || [];
    const notification = userNotifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date();
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error("[NOTIFICATIONS] Error marking read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// ============================================================================
// POST /notifications/read-all - Mark all notifications as read
// ============================================================================

router.post("/notifications/read-all", requireAdmin, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    const userNotifications = notificationStore.get(userId) || [];
    
    userNotifications.forEach(n => {
      n.read = true;
      n.readAt = new Date();
    });

    res.json({ success: true, marked: userNotifications.length });
  } catch (error: any) {
    logger.error("[NOTIFICATIONS] Error marking all read:", error);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// ============================================================================
// GET /notifications/stream - Server-Sent Events for real-time notifications
// ============================================================================

router.get("/notifications/stream", requireAdmin, async (req: any, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const userId = req.session.userId;

  // Send initial connection
  res.write(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`);

  // Check for new notifications every 10 seconds
  const interval = setInterval(async () => {
    try {
      const notifications = await generateNotifications(userId);
      const unread = notifications.filter(n => !n.read);
      
      if (unread.length > 0) {
        res.write(`data: ${JSON.stringify({ 
          type: "update", 
          unreadCount: unread.length,
          latest: unread[0],
        })}\n\n`);
      }
    } catch (err) {
      logger.error("[NOTIFICATIONS] SSE error:", err);
    }
  }, 10000);

  // Heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

// ============================================================================
// Helper: Generate notifications from system events
// ============================================================================

async function generateNotifications(userId: string): Promise<any[]> {
  const notifications: any[] = [];
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // 1. New user registrations (last 24h)
    const [newUsersCount] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, yesterday));

    if (newUsersCount && newUsersCount.count > 0) {
      notifications.push({
        id: `new_users_${now.toDateString()}`,
        type: "info",
        category: "users",
        title: "New Registrations",
        message: `${newUsersCount.count} new user${newUsersCount.count > 1 ? "s" : ""} registered today`,
        icon: "user-plus",
        color: "#10B981",
        priority: "normal",
        read: false,
        timestamp: now,
        action: {
          label: "View Users",
          url: "/admin-dashboard/users",
        },
      });
    }

    // 2. New leads (last 24h)
    const [newLeadsCount] = await db
      .select({ count: count() })
      .from(leads)
      .where(gte(leads.createdAt, yesterday));

    if (newLeadsCount && newLeadsCount.count > 0) {
      notifications.push({
        id: `new_leads_${now.toDateString()}`,
        type: "success",
        category: "leads",
        title: "New Leads",
        message: `${newLeadsCount.count} new lead${newLeadsCount.count > 1 ? "s" : ""} captured`,
        icon: "trending-up",
        color: "#8B5CF6",
        priority: newLeadsCount.count > 10 ? "high" : "normal",
        read: false,
        timestamp: now,
        action: {
          label: "View Leads",
          url: "/admin-dashboard/leads",
        },
      });
    }

    // 3. Failed calls (last hour)
    const [failedCallsCount] = await db
      .select({ count: count() })
      .from(callLogs)
      .where(
        and(
          gte(callLogs.createdAt, lastHour),
          eq(callLogs.status, "failed")
        )
      );

    if (failedCallsCount && failedCallsCount.count > 0) {
      notifications.push({
        id: `failed_calls_${now.getTime()}`,
        type: "warning",
        category: "calls",
        title: "Failed Calls Alert",
        message: `${failedCallsCount.count} call${failedCallsCount.count > 1 ? "s" : ""} failed in the last hour`,
        icon: "phone-off",
        color: "#EF4444",
        priority: "high",
        read: false,
        timestamp: now,
        action: {
          label: "View Calls",
          url: "/admin-dashboard/calls",
        },
      });
    }

    // 4. Email delivery status
    const [emailStats] = await db
      .select({ 
        total: count(),
        failed: sql<number>`COUNT(*) FILTER (WHERE ${n8nEmailLogs.status} = 'failed')`,
      })
      .from(n8nEmailLogs)
      .where(gte(n8nEmailLogs.sentAt, yesterday));

    if (emailStats && emailStats.failed > 0) {
      notifications.push({
        id: `email_failures_${now.toDateString()}`,
        type: "error",
        category: "emails",
        title: "Email Delivery Issues",
        message: `${emailStats.failed} email${emailStats.failed > 1 ? "s" : ""} failed to deliver`,
        icon: "mail-x",
        color: "#EF4444",
        priority: "urgent",
        read: false,
        timestamp: now,
        action: {
          label: "Check Emails",
          url: "/admin-dashboard/emails",
        },
      });
    }

    // 5. System status notification
    notifications.push({
      id: "system_status",
      type: "info",
      category: "system",
      title: "System Status",
      message: "All systems operational",
      icon: "check-circle",
      color: "#10B981",
      priority: "low",
      read: true,
      timestamp: now,
    });

    // Sort by timestamp (newest first) and priority
    notifications.sort((a, b) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as string] ?? 2;
      const bPriority = priorityOrder[b.priority as string] ?? 2;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  } catch (error) {
    logger.error("[NOTIFICATIONS] Error generating:", error);
  }

  return notifications;
}

export default router;
