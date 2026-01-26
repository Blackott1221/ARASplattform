// ============================================================================
// ARAS Command Center - Activity Service
// ============================================================================
// Real-time activity logging with AI enrichment via EventEmitter + SSE
// ============================================================================

import { db } from "../db";
import { adminActivityLog } from "@shared/schema";
import { desc, eq, gte, sql, and } from "drizzle-orm";
import { EventEmitter } from "events";
import { logger } from "../logger";

// Event Emitter for Real-time Updates
export const activityEmitter = new EventEmitter();
activityEmitter.setMaxListeners(100); // Support many SSE connections

// ============================================================================
// Action Definitions
// ============================================================================

export const ACTIONS = {
  // User Actions
  USER_VIEWED: { action: "user_viewed", category: "user", icon: "Eye", color: "#6366F1", title: "User angesehen" },
  USER_UPDATED: { action: "user_updated", category: "user", icon: "UserCog", color: "#F59E0B", title: "User aktualisiert" },
  USER_DELETED: { action: "user_deleted", category: "user", icon: "UserX", color: "#EF4444", title: "User gelöscht" },
  USER_CREATED: { action: "user_created", category: "user", icon: "UserPlus", color: "#10B981", title: "User erstellt" },
  
  // Billing Actions
  PLAN_CHANGED: { action: "plan_changed", category: "billing", icon: "CreditCard", color: "#FF6A00", title: "Plan geändert" },
  SUBSCRIPTION_CANCELED: { action: "subscription_canceled", category: "billing", icon: "XCircle", color: "#EF4444", title: "Abo gekündigt" },
  
  // Security Actions
  PASSWORD_RESET: { action: "password_reset", category: "security", icon: "Key", color: "#8B5CF6", title: "Passwort zurückgesetzt" },
  ROLE_CHANGED: { action: "role_changed", category: "security", icon: "Shield", color: "#F59E0B", title: "Rolle geändert" },
  LOGIN_ADMIN: { action: "login_admin", category: "security", icon: "LogIn", color: "#10B981", title: "Admin Login" },
  
  // Automation Actions
  WORKFLOW_TOGGLED: { action: "workflow_toggled", category: "automation", icon: "Zap", color: "#10B981", title: "Workflow umgeschaltet" },
  WORKFLOW_EXECUTED: { action: "workflow_executed", category: "automation", icon: "Play", color: "#06B6D4", title: "Workflow ausgeführt" },
  
  // Communication Actions
  EMAIL_SENT: { action: "email_sent", category: "communication", icon: "Mail", color: "#06B6D4", title: "Email gesendet" },
  SMS_SENT: { action: "sms_sent", category: "communication", icon: "MessageSquare", color: "#8B5CF6", title: "SMS gesendet" },
  
  // Data Actions
  EXPORT_CREATED: { action: "export_created", category: "data", icon: "Download", color: "#78716C", title: "Export erstellt" },
  IMPORT_COMPLETED: { action: "import_completed", category: "data", icon: "Upload", color: "#10B981", title: "Import abgeschlossen" },
  
  // Team Actions
  STAFF_INVITED: { action: "staff_invited", category: "team", icon: "UserPlus", color: "#EC4899", title: "Staff eingeladen" },
  STAFF_REMOVED: { action: "staff_removed", category: "team", icon: "UserMinus", color: "#EF4444", title: "Staff entfernt" },
  
  // Lead Actions
  LEAD_CREATED: { action: "lead_created", category: "leads", icon: "TrendingUp", color: "#8B5CF6", title: "Lead erstellt" },
  LEAD_CONVERTED: { action: "lead_converted", category: "leads", icon: "CheckCircle", color: "#10B981", title: "Lead konvertiert" },
  
  // Call Actions
  CALL_COMPLETED: { action: "call_completed", category: "calls", icon: "Phone", color: "#EF4444", title: "Anruf beendet" },
  CALL_FAILED: { action: "call_failed", category: "calls", icon: "PhoneOff", color: "#EF4444", title: "Anruf fehlgeschlagen" },
} as const;

export type ActionKey = keyof typeof ACTIONS;

// ============================================================================
// Log Parameters Interface
// ============================================================================

interface LogParams {
  actorId: string;
  actorName?: string;
  actorRole?: string;
  actionKey: ActionKey;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  targetUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Activity Service Class
// ============================================================================

class ActivityService {
  /**
   * Log an activity - never throws, activity logging should never block main function
   */
  async log(params: LogParams): Promise<void> {
    try {
      const actionDef = ACTIONS[params.actionKey];
      
      const [activity] = await db
        .insert(adminActivityLog)
        .values({
          actorId: params.actorId,
          actorName: params.actorName || null,
          actorRole: params.actorRole || null,
          action: actionDef.action,
          actionCategory: actionDef.category,
          actionIcon: actionDef.icon,
          actionColor: actionDef.color,
          targetType: params.targetType || null,
          targetId: params.targetId || null,
          targetName: params.targetName || null,
          targetUrl: params.targetUrl || null,
          title: actionDef.title,
          description: params.description || null,
          metadata: params.metadata || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        })
        .returning();

      logger.info("[ACTIVITY] Logged:", { action: actionDef.action, actorId: params.actorId });

      // Emit real-time event
      activityEmitter.emit("new-activity", activity);

      // AI Enrichment async (non-blocking)
      this.enrichWithAI(activity.id, params).catch((err) => {
        logger.warn("[ACTIVITY] AI enrichment failed:", err.message);
      });

    } catch (error) {
      logger.error("[ACTIVITY] Error logging:", error);
      // Never throw - activity logging should never block main function
    }
  }

  /**
   * AI Enrichment - adds insights, priority, and suggestions
   */
  private async enrichWithAI(activityId: number, params: LogParams): Promise<void> {
    try {
      if (!process.env.GOOGLE_GEMINI_API_KEY) {
        return;
      }

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analysiere diese Admin-Aktion und gib einen kurzen Business-Insight.

Aktion: ${params.actionKey}
Ziel: ${params.targetType || "N/A"} - ${params.targetName || params.targetId || "N/A"}
Details: ${JSON.stringify(params.metadata || {})}
Beschreibung: ${params.description || "N/A"}

Antworte NUR in JSON (kein Markdown):
{
  "insight": "Ein Satz Insight (max 100 Zeichen)",
  "priority": "low|medium|high|critical",
  "suggestion": "Empfohlene Folgeaktion oder null"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      const parsed = JSON.parse(text);

      await db
        .update(adminActivityLog)
        .set({
          aiInsight: parsed.insight || null,
          aiPriority: parsed.priority || "low",
          aiSuggestion: parsed.suggestion || null,
          aiProcessedAt: new Date(),
        })
        .where(eq(adminActivityLog.id, activityId));

      // Emit update event for real-time AI insights
      activityEmitter.emit("activity-updated", { 
        id: activityId, 
        aiInsight: parsed.insight,
        aiPriority: parsed.priority,
        aiSuggestion: parsed.suggestion,
      });

      logger.info("[ACTIVITY] AI enriched:", { activityId, priority: parsed.priority });

    } catch (error: any) {
      logger.warn("[ACTIVITY] AI enrichment failed:", error.message);
    }
  }

  /**
   * Get activities with filtering and pagination
   */
  async getActivities(options: {
    limit?: number;
    offset?: number;
    category?: string;
    since?: Date;
    actorId?: string;
  } = {}) {
    const { limit = 50, offset = 0, category, since, actorId } = options;

    const conditions = [];
    if (category && category !== "all") {
      conditions.push(eq(adminActivityLog.actionCategory, category));
    }
    if (since) {
      conditions.push(gte(adminActivityLog.createdAt, since));
    }
    if (actorId) {
      conditions.push(eq(adminActivityLog.actorId, actorId));
    }

    const activities = await db
      .select()
      .from(adminActivityLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(adminActivityLog.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminActivityLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return { 
      data: activities, 
      total: countResult?.count || 0,
      limit,
      offset,
    };
  }

  /**
   * Get activity statistics for dashboard
   */
  async getStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        users: sql<number>`count(*) filter (where action_category = 'user')::int`,
        billing: sql<number>`count(*) filter (where action_category = 'billing')::int`,
        security: sql<number>`count(*) filter (where action_category = 'security')::int`,
        automation: sql<number>`count(*) filter (where action_category = 'automation')::int`,
        communication: sql<number>`count(*) filter (where action_category = 'communication')::int`,
        critical: sql<number>`count(*) filter (where ai_priority = 'critical')::int`,
        high: sql<number>`count(*) filter (where ai_priority = 'high')::int`,
        medium: sql<number>`count(*) filter (where ai_priority = 'medium')::int`,
        low: sql<number>`count(*) filter (where ai_priority = 'low')::int`,
      })
      .from(adminActivityLog)
      .where(gte(adminActivityLog.createdAt, since));

    return stats || {
      total: 0, users: 0, billing: 0, security: 0, 
      automation: 0, communication: 0,
      critical: 0, high: 0, medium: 0, low: 0,
    };
  }

  /**
   * Get categories with counts
   */
  async getCategories(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const categories = await db
      .select({
        category: adminActivityLog.actionCategory,
        count: sql<number>`count(*)::int`,
      })
      .from(adminActivityLog)
      .where(gte(adminActivityLog.createdAt, since))
      .groupBy(adminActivityLog.actionCategory)
      .orderBy(desc(sql`count(*)`));

    return categories;
  }
}

export const activityService = new ActivityService();
