// ============================================================================
// ARAS Command Center - Activity Feed API
// ============================================================================
// Real-time activity tracking across the entire platform
// ============================================================================

import { Router } from "express";
import { db } from "../db";
import { 
  staffActivityLog, 
  users, 
  leads, 
  callLogs, 
  n8nEmailLogs,
  contacts,
  campaigns
} from "@shared/schema";
import { eq, desc, and, gte, lte, or, sql, isNotNull } from "drizzle-orm";
import { requireAdmin } from "../middleware/admin";
import { logger } from "../logger";

const router = Router();

// ============================================================================
// GET /activity - Unified activity feed from multiple sources
// ============================================================================

router.get("/activity", requireAdmin, async (req: any, res) => {
  try {
    const { 
      limit = "50", 
      offset = "0",
      type,
      dateFrom,
      dateTo,
      userId 
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 200);
    const offsetNum = parseInt(offset as string) || 0;

    // Build activity from multiple sources
    const activities: any[] = [];

    // 1. Staff Activity Log
    const staffActivities = await db
      .select({
        id: staffActivityLog.id,
        type: sql<string>`'staff_action'`,
        action: staffActivityLog.action,
        targetType: staffActivityLog.targetType,
        targetId: staffActivityLog.targetId,
        metadata: staffActivityLog.metadata,
        createdAt: staffActivityLog.createdAt,
        userId: staffActivityLog.userId,
        userName: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(staffActivityLog)
      .leftJoin(users, eq(staffActivityLog.userId, users.id))
      .orderBy(desc(staffActivityLog.createdAt))
      .limit(limitNum);

    activities.push(...staffActivities.map(a => ({
      id: `staff_${a.id}`,
      type: "staff_action",
      action: a.action,
      description: formatStaffAction(a.action, a.targetType, a.metadata),
      targetType: a.targetType,
      targetId: a.targetId,
      metadata: a.metadata,
      timestamp: a.createdAt,
      user: a.userId ? {
        id: a.userId,
        name: a.userFirstName && a.userLastName 
          ? `${a.userFirstName} ${a.userLastName}`
          : a.userName || "System",
      } : null,
      icon: getActionIcon(a.action),
      color: getActionColor(a.action),
    })));

    // 2. Recent User Registrations
    const recentUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        subscriptionPlan: users.subscriptionPlan,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(20);

    activities.push(...recentUsers.map(u => ({
      id: `user_${u.id}`,
      type: "user_registered",
      action: "user_registered",
      description: `New user registered: ${u.firstName || u.username || u.email}`,
      targetType: "user",
      targetId: u.id,
      metadata: { plan: u.subscriptionPlan, email: u.email },
      timestamp: u.createdAt,
      user: {
        id: u.id,
        name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username || "Unknown",
      },
      icon: "user-plus",
      color: "#10B981",
    })));

    // 3. Recent Leads
    const recentLeads = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        status: leads.status,
        createdAt: leads.createdAt,
        userId: leads.userId,
      })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(20);

    activities.push(...recentLeads.map(l => ({
      id: `lead_${l.id}`,
      type: "lead_created",
      action: "lead_created",
      description: `New lead: ${l.name || l.email || "Unknown"}`,
      targetType: "lead",
      targetId: String(l.id),
      metadata: { status: l.status, email: l.email },
      timestamp: l.createdAt,
      user: null,
      icon: "trending-up",
      color: "#8B5CF6",
    })));

    // 4. Recent Calls
    const recentCalls = await db
      .select({
        id: callLogs.id,
        contactName: callLogs.contactName,
        phoneNumber: callLogs.phoneNumber,
        status: callLogs.status,
        duration: callLogs.duration,
        createdAt: callLogs.createdAt,
        userId: callLogs.userId,
      })
      .from(callLogs)
      .orderBy(desc(callLogs.createdAt))
      .limit(20);

    activities.push(...recentCalls.map(c => ({
      id: `call_${c.id}`,
      type: "call_made",
      action: "call_made",
      description: `Call to ${c.contactName || c.phoneNumber}: ${c.status} (${c.duration || 0}s)`,
      targetType: "call",
      targetId: String(c.id),
      metadata: { status: c.status, duration: c.duration },
      timestamp: c.createdAt,
      user: null,
      icon: "phone",
      color: c.status === "completed" ? "#10B981" : "#EF4444",
    })));

    // 5. Recent Emails
    const recentEmails = await db
      .select({
        id: n8nEmailLogs.id,
        recipient: n8nEmailLogs.recipient,
        recipientName: n8nEmailLogs.recipientName,
        subject: n8nEmailLogs.subject,
        status: n8nEmailLogs.status,
        workflowName: n8nEmailLogs.workflowName,
        sentAt: n8nEmailLogs.sentAt,
      })
      .from(n8nEmailLogs)
      .orderBy(desc(n8nEmailLogs.sentAt))
      .limit(20);

    activities.push(...recentEmails.map(e => ({
      id: `email_${e.id}`,
      type: "email_sent",
      action: "email_sent",
      description: `Email to ${e.recipientName || e.recipient}: "${e.subject}"`,
      targetType: "email",
      targetId: String(e.id),
      metadata: { status: e.status, workflow: e.workflowName },
      timestamp: e.sentAt,
      user: null,
      icon: "mail",
      color: e.status === "delivered" ? "#10B981" : "#F59E0B",
    })));

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const paginatedActivities = activities.slice(offsetNum, offsetNum + limitNum);

    // Get stats
    const stats = {
      totalActivities: activities.length,
      todayCount: activities.filter(a => {
        const date = new Date(a.timestamp);
        const today = new Date();
        return date.toDateString() === today.toDateString();
      }).length,
      byType: {
        staff_action: activities.filter(a => a.type === "staff_action").length,
        user_registered: activities.filter(a => a.type === "user_registered").length,
        lead_created: activities.filter(a => a.type === "lead_created").length,
        call_made: activities.filter(a => a.type === "call_made").length,
        email_sent: activities.filter(a => a.type === "email_sent").length,
      },
    };

    logger.info("[ACTIVITY] Fetched activity feed", { 
      total: activities.length, 
      returned: paginatedActivities.length 
    });

    res.json({ 
      data: paginatedActivities,
      stats,
      pagination: {
        total: activities.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < activities.length,
      }
    });
  } catch (error: any) {
    logger.error("[ACTIVITY] Error fetching activity:", error);
    res.status(500).json({ error: "Failed to fetch activity feed" });
  }
});

// ============================================================================
// GET /activity/live - Server-Sent Events for real-time updates
// ============================================================================

router.get("/activity/live", requireAdmin, async (req: any, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date() })}\n\n`);

  // Heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date() })}\n\n`);
  }, 30000);

  // Cleanup on close
  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

// ============================================================================
// POST /activity - Log custom activity
// ============================================================================

router.post("/activity", requireAdmin, async (req: any, res) => {
  try {
    const { action, targetType, targetId, metadata } = req.body;
    const userId = req.session.userId;

    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    const [activity] = await db
      .insert(staffActivityLog)
      .values({
        userId,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        metadata: metadata || {},
      })
      .returning();

    logger.info("[ACTIVITY] Logged activity", { action, userId });
    res.status(201).json({ data: activity });
  } catch (error: any) {
    logger.error("[ACTIVITY] Error logging activity:", error);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatStaffAction(action: string, targetType: string | null, metadata: any): string {
  const actions: Record<string, string> = {
    login: "Logged in",
    logout: "Logged out",
    user_created: "Created a new user",
    user_updated: "Updated user profile",
    user_deleted: "Deleted a user",
    plan_changed: `Changed subscription plan${metadata?.plan ? ` to ${metadata.plan}` : ""}`,
    password_reset: "Reset user password",
    invitation_sent: `Sent staff invitation${metadata?.email ? ` to ${metadata.email}` : ""}`,
    invitation_revoked: "Revoked staff invitation",
    channel_created: `Created chat channel${metadata?.name ? `: ${metadata.name}` : ""}`,
    message_sent: "Sent a message in team chat",
    export_started: `Started data export${metadata?.entityType ? ` (${metadata.entityType})` : ""}`,
    settings_updated: "Updated system settings",
  };

  return actions[action] || action.replace(/_/g, " ");
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    login: "log-in",
    logout: "log-out",
    user_created: "user-plus",
    user_updated: "user-check",
    user_deleted: "user-minus",
    plan_changed: "credit-card",
    password_reset: "key",
    invitation_sent: "send",
    invitation_revoked: "x-circle",
    channel_created: "message-circle",
    message_sent: "message-square",
    export_started: "download",
    settings_updated: "settings",
  };
  return icons[action] || "activity";
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    login: "#10B981",
    logout: "#6B7280",
    user_created: "#10B981",
    user_updated: "#3B82F6",
    user_deleted: "#EF4444",
    plan_changed: "#F59E0B",
    password_reset: "#8B5CF6",
    invitation_sent: "#06B6D4",
    invitation_revoked: "#EF4444",
    channel_created: "#10B981",
    message_sent: "#3B82F6",
    export_started: "#6B7280",
    settings_updated: "#F59E0B",
  };
  return colors[action] || "#6B7280";
}

export default router;
