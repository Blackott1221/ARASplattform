// ============================================================================
// ARAS Command Center - User Deep-Dive API
// ============================================================================
// Complete user data for the Deep-Dive Panel
// ============================================================================

import { Router } from "express";
import { db } from "../db";
import { 
  users, 
  leads, 
  contacts, 
  callLogs, 
  chatSessions,
  campaigns,
  staffActivityLog
} from "@shared/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { requireAdmin } from "../middleware/admin";
import { logger } from "../logger";

const router = Router();

// ============================================================================
// GET /users/:userId/deep-dive - Complete user data
// ============================================================================

router.get("/users/:userId/deep-dive", requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;

    // Parallel fetch all user data for performance
    const [
      userResult,
      callsResult,
      chatSessionsResult,
      leadsResult,
      contactsResult,
    ] = await Promise.all([
      // User with all fields
      db.select().from(users).where(eq(users.id, userId)).limit(1),
      
      // Last 20 calls
      db.select({
        id: callLogs.id,
        phoneNumber: callLogs.phoneNumber,
        contactName: callLogs.contactName,
        status: callLogs.status,
        duration: callLogs.duration,
        createdAt: callLogs.createdAt,
        metadata: callLogs.metadata,
      })
      .from(callLogs)
      .where(eq(callLogs.userId, userId))
      .orderBy(desc(callLogs.createdAt))
      .limit(20),
      
      // Last 10 chat sessions
      db.select({
        id: chatSessions.id,
        title: chatSessions.title,
        createdAt: chatSessions.createdAt,
      })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.createdAt))
      .limit(10),
      
      // User's leads
      db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt)).limit(20),
      
      // User's contacts
      db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt)).limit(20),
    ]);

    if (!userResult[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult[0];

    // Fetch Stripe data if customer ID exists
    let stripeData = null;
    if (user.stripeCustomerId) {
      stripeData = await fetchStripeCustomer(user.stripeCustomerId);
    }

    // Calculate stats
    const stats = {
      totalCalls: callsResult.length,
      totalChats: chatSessionsResult.length,
      totalLeads: leadsResult.length,
      totalContacts: contactsResult.length,
      avgCallDuration: callsResult.length > 0 
        ? Math.round(callsResult.reduce((sum, c) => sum + (c.duration || 0), 0) / callsResult.length) 
        : 0,
    };

    // Log activity
    await db.insert(staffActivityLog).values({
      userId: req.session.userId,
      action: "user_viewed",
      targetType: "user",
      targetId: userId,
      metadata: { viewedUser: user.username },
    }).catch(() => {}); // Non-blocking

    logger.info("[ADMIN] User deep-dive fetched", { userId, by: req.session.userId });

    res.json({
      user: {
        ...user,
        // Remove sensitive fields
        password: undefined,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      },
      calls: callsResult,
      chatSessions: chatSessionsResult.map(cs => ({
        ...cs,
        messageCount: 0, // Would need separate query
      })),
      leads: leadsResult,
      contacts: contactsResult,
      stripe: stripeData ? {
        customerId: stripeData.id,
        email: stripeData.email,
        balance: stripeData.balance,
        currency: stripeData.currency,
        created: stripeData.created,
        subscriptions: stripeData.subscriptions?.data || [],
        paymentMethods: stripeData.sources?.total_count || 0,
      } : null,
      stats,
    });

  } catch (error: any) {
    logger.error("[ADMIN] Error fetching user deep-dive:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// ============================================================================
// GET /users/:userId/ai-insight - AI-generated user analysis
// ============================================================================

router.get("/users/:userId/ai-insight", requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;

    // Fetch user data
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch activity counts
    const [callCount] = await db.select({ count: count() }).from(callLogs).where(eq(callLogs.userId, userId));
    const [chatCount] = await db.select({ count: count() }).from(chatSessions).where(eq(chatSessions.userId, userId));

    // Generate AI insight
    const insight = await generateUserInsight(user, callCount?.count || 0, chatCount?.count || 0);

    if (!insight) {
      return res.status(503).json({ error: "AI insight generation failed" });
    }

    res.json(insight);

  } catch (error: any) {
    logger.error("[ADMIN] Error generating AI insight:", error);
    res.status(500).json({ error: "Failed to generate AI insight" });
  }
});

// ============================================================================
// POST /users/:userId/password - Reset user password
// ============================================================================

router.post("/users/:userId/password", requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Hash password
    const { scrypt, randomBytes } = await import("crypto");
    const { promisify } = await import("util");
    const scryptAsync = promisify(scrypt);
    
    const salt = randomBytes(16).toString("hex");
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    const hashedPassword = `${salt}.${derivedKey.toString("hex")}`;

    // Update user
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    // Log activity
    await db.insert(staffActivityLog).values({
      userId: req.session.userId,
      action: "password_reset",
      targetType: "user",
      targetId: userId,
    });

    logger.info("[ADMIN] Password reset", { userId, by: req.session.userId });
    res.json({ success: true, message: "Password has been reset" });

  } catch (error: any) {
    logger.error("[ADMIN] Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ============================================================================
// PATCH /users/:userId/role - Update user role
// ============================================================================

router.patch("/users/:userId/role", requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "staff", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Prevent self-demotion
    if (userId === req.session.userId && role !== "admin") {
      return res.status(400).json({ error: "Cannot demote yourself" });
    }

    await db
      .update(users)
      .set({ userRole: role })
      .where(eq(users.id, userId));

    // Log activity
    await db.insert(staffActivityLog).values({
      userId: req.session.userId,
      action: "role_changed",
      targetType: "user",
      targetId: userId,
      metadata: { newRole: role },
    });

    logger.info("[ADMIN] Role updated", { userId, role, by: req.session.userId });
    res.json({ success: true });

  } catch (error: any) {
    logger.error("[ADMIN] Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ============================================================================
// DELETE /users/:userId - Delete user
// ============================================================================

router.delete("/users/:userId", requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (userId === req.session.userId) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    // Get user info for logging
    const [user] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user (cascade should handle related data)
    await db.delete(users).where(eq(users.id, userId));

    // Log activity
    await db.insert(staffActivityLog).values({
      userId: req.session.userId,
      action: "user_deleted",
      targetType: "user",
      targetId: userId,
      metadata: { deletedUsername: user.username },
    });

    logger.info("[ADMIN] User deleted", { userId, username: user.username, by: req.session.userId });
    res.json({ success: true });

  } catch (error: any) {
    logger.error("[ADMIN] Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ============================================================================
// Helper: Fetch Stripe Customer
// ============================================================================

async function fetchStripeCustomer(customerId: string): Promise<any> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["subscriptions"],
    });
    
    // Check if customer is deleted
    if ((customer as any).deleted) return null;
    
    return customer;
  } catch (error) {
    logger.error("[STRIPE] Error fetching customer:", error);
    return null;
  }
}

// ============================================================================
// Helper: Generate AI User Insight with Gemini
// ============================================================================

async function generateUserInsight(user: any, callCount: number, chatCount: number) {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      logger.warn("[AI] Gemini API key not configured");
      return getDefaultInsight(user);
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Du bist ein Business Intelligence Analyst für ein SaaS CRM. Analysiere diesen User und gib actionable Insights.

USER DATA:
- Name: ${user.firstName || ""} ${user.lastName || ""}
- Username: ${user.username}
- Company: ${user.company || "Unbekannt"}
- Industry: ${user.industry || "Unbekannt"}
- Job Role: ${user.jobRole || "Unbekannt"}
- Plan: ${user.subscriptionPlan || "free"}
- Status: ${user.subscriptionStatus || "unknown"}
- AI Messages Used: ${user.aiMessagesUsed || 0}
- Voice Calls Used: ${user.voiceCallsUsed || 0}
- Total Calls Made: ${callCount}
- Total Chat Sessions: ${chatCount}
- Member since: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString("de-DE") : "Unknown"}

Antworte NUR mit diesem JSON (kein Markdown, keine Erklärung):
{
  "healthScore": [0-100 Zahl],
  "healthLabel": "[Excellent|Good|At Risk|Critical]",
  "churnRisk": "[low|medium|high]",
  "upsellPotential": "[low|medium|high]",
  "keyInsight": "[Ein prägnanter Satz über den wichtigsten Insight]",
  "recommendations": ["[Empfehlung 1]", "[Empfehlung 2]", "[Empfehlung 3]"],
  "nextBestAction": "[Die eine konkrete Aktion die jetzt am wichtigsten ist]"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const parsed = JSON.parse(text);
    
    // Validate response structure
    if (typeof parsed.healthScore !== "number" || !parsed.healthLabel) {
      throw new Error("Invalid AI response structure");
    }

    return parsed;

  } catch (error) {
    logger.error("[AI] Error generating user insight:", error);
    return getDefaultInsight(user);
  }
}

// Fallback insight when AI fails
function getDefaultInsight(user: any) {
  const isActive = user.subscriptionStatus === "active";
  const hasUsage = (user.aiMessagesUsed || 0) + (user.voiceCallsUsed || 0) > 0;
  
  let healthScore = 50;
  let healthLabel = "Good";
  let churnRisk = "medium";
  let upsellPotential = "medium";

  if (isActive && hasUsage) {
    healthScore = 75;
    healthLabel = "Good";
    churnRisk = "low";
  } else if (!isActive) {
    healthScore = 30;
    healthLabel = "At Risk";
    churnRisk = "high";
    upsellPotential = "low";
  }

  if (user.subscriptionPlan === "free" && hasUsage) {
    upsellPotential = "high";
  }

  return {
    healthScore,
    healthLabel,
    churnRisk,
    upsellPotential,
    keyInsight: hasUsage 
      ? "User zeigt aktive Nutzung der Plattform."
      : "User hat die Plattform noch nicht aktiv genutzt.",
    recommendations: [
      "Engagement-Email senden",
      "Persönlichen Onboarding-Call anbieten",
      "Feature-Highlights teilen",
    ],
    nextBestAction: hasUsage 
      ? "Feedback zur Nutzung einholen"
      : "Onboarding-Reminder senden",
  };
}

export default router;
