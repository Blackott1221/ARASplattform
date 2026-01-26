// ============================================================================
// ARAS Command Center - AI-Powered Global Search API
// ============================================================================
// Semantic search across all entities with AI understanding
// ============================================================================

import { Router } from "express";
import { db } from "../db";
import { 
  users, 
  leads, 
  contacts, 
  campaigns, 
  callLogs, 
  n8nEmailLogs,
  staffActivityLog
} from "@shared/schema";
import { eq, desc, or, like, sql, ilike } from "drizzle-orm";
import { requireAdmin } from "../middleware/admin";
import { logger } from "../logger";
import OpenAI from "openai";

const router = Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// POST /search - AI-enhanced global search
// ============================================================================

router.post("/search", requireAdmin, async (req: any, res) => {
  try {
    const { query, filters = {}, limit = 20 } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const searchTerm = query.trim().toLowerCase();
    const limitNum = Math.min(parseInt(limit) || 20, 100);

    const results: any = {
      users: [],
      leads: [],
      contacts: [],
      campaigns: [],
      calls: [],
      emails: [],
      ai: null,
    };

    // Parallel search across all entities
    const [
      userResults,
      leadResults,
      contactResults,
      campaignResults,
      callResults,
      emailResults,
    ] = await Promise.all([
      // Users search
      db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: users.company,
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        or(
          ilike(users.email, `%${searchTerm}%`),
          ilike(users.username, `%${searchTerm}%`),
          ilike(users.firstName, `%${searchTerm}%`),
          ilike(users.lastName, `%${searchTerm}%`),
          ilike(users.company, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(users.createdAt))
      .limit(limitNum),

      // Leads search
      db.select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        or(
          ilike(leads.name, `%${searchTerm}%`),
          ilike(leads.email, `%${searchTerm}%`),
          ilike(leads.company, `%${searchTerm}%`),
          ilike(leads.phone, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(leads.createdAt))
      .limit(limitNum),

      // Contacts search
      db.select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        company: contacts.company,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(
        or(
          ilike(contacts.firstName, `%${searchTerm}%`),
          ilike(contacts.lastName, `%${searchTerm}%`),
          ilike(contacts.email, `%${searchTerm}%`),
          ilike(contacts.company, `%${searchTerm}%`),
          ilike(contacts.phone, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(contacts.createdAt))
      .limit(limitNum),

      // Campaigns search
      db.select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(ilike(campaigns.name, `%${searchTerm}%`))
      .orderBy(desc(campaigns.createdAt))
      .limit(limitNum),

      // Calls search
      db.select({
        id: callLogs.id,
        contactName: callLogs.contactName,
        phoneNumber: callLogs.phoneNumber,
        status: callLogs.status,
        duration: callLogs.duration,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .where(
        or(
          ilike(callLogs.contactName, `%${searchTerm}%`),
          ilike(callLogs.phoneNumber, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(callLogs.createdAt))
      .limit(limitNum),

      // Emails search
      db.select({
        id: n8nEmailLogs.id,
        recipient: n8nEmailLogs.recipient,
        recipientName: n8nEmailLogs.recipientName,
        subject: n8nEmailLogs.subject,
        status: n8nEmailLogs.status,
        sentAt: n8nEmailLogs.sentAt,
      })
      .from(n8nEmailLogs)
      .where(
        or(
          ilike(n8nEmailLogs.recipient, `%${searchTerm}%`),
          ilike(n8nEmailLogs.recipientName, `%${searchTerm}%`),
          ilike(n8nEmailLogs.subject, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(n8nEmailLogs.sentAt))
      .limit(limitNum),
    ]);

    // Format results
    results.users = userResults.map(u => ({
      id: u.id,
      type: "user",
      title: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username,
      subtitle: u.email,
      metadata: { plan: u.subscriptionPlan, status: u.subscriptionStatus, company: u.company },
      url: `/admin-dashboard/users?id=${u.id}`,
      icon: "user",
      color: "#FF6A00",
    }));

    results.leads = leadResults.map(l => ({
      id: l.id,
      type: "lead",
      title: l.name || l.email,
      subtitle: l.company || l.phone,
      metadata: { status: l.status, email: l.email },
      url: `/admin-dashboard/leads?id=${l.id}`,
      icon: "trending-up",
      color: "#8B5CF6",
    }));

    results.contacts = contactResults.map(c => ({
      id: c.id,
      type: "contact",
      title: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
      subtitle: c.company || c.phone,
      metadata: { email: c.email, phone: c.phone },
      url: `/admin-dashboard/contacts?id=${c.id}`,
      icon: "building-2",
      color: "#06B6D4",
    }));

    results.campaigns = campaignResults.map(c => ({
      id: c.id,
      type: "campaign",
      title: c.name,
      subtitle: c.status,
      metadata: { status: c.status },
      url: `/admin-dashboard/campaigns?id=${c.id}`,
      icon: "megaphone",
      color: "#EC4899",
    }));

    results.calls = callResults.map(c => ({
      id: c.id,
      type: "call",
      title: c.contactName || c.phoneNumber,
      subtitle: `${c.status} - ${c.duration || 0}s`,
      metadata: { status: c.status, duration: c.duration },
      url: `/admin-dashboard/calls?id=${c.id}`,
      icon: "phone",
      color: "#EF4444",
    }));

    results.emails = emailResults.map(e => ({
      id: e.id,
      type: "email",
      title: e.recipientName || e.recipient,
      subtitle: e.subject,
      metadata: { status: e.status },
      url: `/admin-dashboard/emails?id=${e.id}`,
      icon: "mail",
      color: "#F59E0B",
    }));

    // Total results count
    const totalResults = 
      results.users.length + 
      results.leads.length + 
      results.contacts.length + 
      results.campaigns.length + 
      results.calls.length + 
      results.emails.length;

    // AI Enhancement: Generate smart suggestions if OpenAI is available
    if (process.env.OPENAI_API_KEY && totalResults > 0) {
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant for the ARAS Command Center CRM. Based on search results, provide a brief, helpful insight or suggestion. Be concise (max 2 sentences). Focus on actionable insights.`
            },
            {
              role: "user",
              content: `Search query: "${query}"
Results found: ${totalResults} total
- ${results.users.length} users
- ${results.leads.length} leads
- ${results.contacts.length} contacts
- ${results.campaigns.length} campaigns
- ${results.calls.length} calls
- ${results.emails.length} emails

Provide a brief insight or suggestion based on these results.`
            }
          ],
          max_tokens: 100,
          temperature: 0.7,
        });

        results.ai = {
          insight: aiResponse.choices[0]?.message?.content || null,
          model: "gpt-4o-mini",
        };
      } catch (aiError) {
        logger.warn("[SEARCH] AI enhancement failed:", aiError);
        results.ai = null;
      }
    }

    logger.info("[SEARCH] Global search completed", { 
      query: searchTerm, 
      totalResults 
    });

    res.json({
      query,
      results,
      totalResults,
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error("[SEARCH] Error performing search:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// ============================================================================
// GET /search/suggestions - AI-powered search suggestions
// ============================================================================

router.get("/search/suggestions", requireAdmin, async (req: any, res) => {
  try {
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ suggestions: [] });
    }

    const query = (q as string).toLowerCase();

    // Get quick suggestions from recent data
    const [recentUsers, recentLeads, recentEmails] = await Promise.all([
      db.select({ 
        value: users.email,
        label: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username}, ${users.email})`,
      })
      .from(users)
      .where(
        or(
          ilike(users.email, `${query}%`),
          ilike(users.username, `${query}%`),
          ilike(users.firstName, `${query}%`)
        )
      )
      .limit(5),

      db.select({ 
        value: leads.email,
        label: sql<string>`COALESCE(${leads.name}, ${leads.email})`,
      })
      .from(leads)
      .where(
        or(
          ilike(leads.name, `${query}%`),
          ilike(leads.email, `${query}%`)
        )
      )
      .limit(5),

      db.select({ 
        value: n8nEmailLogs.subject,
        label: n8nEmailLogs.subject,
      })
      .from(n8nEmailLogs)
      .where(ilike(n8nEmailLogs.subject, `%${query}%`))
      .limit(3),
    ]);

    const suggestions = [
      ...recentUsers.map(u => ({ type: "user", ...u })),
      ...recentLeads.map(l => ({ type: "lead", ...l })),
      ...recentEmails.map(e => ({ type: "email", ...e })),
    ].slice(0, 10);

    res.json({ suggestions });
  } catch (error: any) {
    logger.error("[SEARCH] Error getting suggestions:", error);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

// ============================================================================
// POST /search/ai - Pure AI search interpretation
// ============================================================================

router.post("/search/ai", requireAdmin, async (req: any, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "AI search not available" });
    }

    // Use AI to understand the search intent
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for the ARAS CRM Command Center. Parse the user's natural language search query and extract:
1. Intent (what they're looking for)
2. Entity types to search (users, leads, contacts, campaigns, calls, emails)
3. Filters (date ranges, status, plan type, etc.)
4. Keywords to search

Respond in JSON format:
{
  "intent": "string describing what user wants",
  "entities": ["array of entity types"],
  "filters": { "key": "value" },
  "keywords": ["array of search terms"],
  "suggestion": "optional helpful suggestion"
}`
        },
        {
          role: "user",
          content: query
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");

    logger.info("[SEARCH] AI query parsed", { query, parsed });

    res.json({
      query,
      parsed,
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error("[SEARCH] AI search error:", error);
    res.status(500).json({ error: "AI search failed" });
  }
});

export default router;
