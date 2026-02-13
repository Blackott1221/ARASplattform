/**
 * ============================================================================
 * NEWS API ROUTES — /api/news/daily
 * ============================================================================
 * GET /api/news/daily?mode=top|breaking&scopes=global,AT,DE,CH
 * Auth: session middleware (same as all /app APIs)
 * ============================================================================
 */

import { Router, Request, Response } from "express";
import { generateNewsDigest, deriveDefaultScopes } from "../services/news.service";
import { storage } from "../storage";
import { logger } from "../logger";

const router = Router();

// Rate limit: max 10 requests per user per 5 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

/**
 * GET /api/news/daily
 * Query params:
 *   mode: "top" | "breaking" (default: "top")
 *   scopes: comma-separated scope list (default: derived from user profile)
 */
router.get("/daily", async (req: Request, res: Response) => {
  try {
    // Auth check
    const userId =
      (req as any).user?.id || (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Rate limit
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: "Zu viele Anfragen. Bitte warten Sie einige Minuten.",
      });
    }

    // Parse params
    const mode = req.query.mode === "breaking" ? "breaking" : "top";
    const scopesParam = typeof req.query.scopes === "string" ? req.query.scopes : "";

    // Get user for industry + scope derivation
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User nicht gefunden." });
    }

    const industry = (user as any).industry || "general";
    const company = (user as any).company || undefined;
    const aiProfile = (user as any).aiProfile || {};

    // Derive scopes
    let scopes: string[];
    if (scopesParam) {
      scopes = scopesParam
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
    } else {
      scopes = deriveDefaultScopes(user);
    }

    if (scopes.length === 0) scopes = ["global"];

    // Generate digest
    const digest = await generateNewsDigest({
      userId,
      industry,
      company,
      aiProfile,
      mode,
      scopes,
    });

    return res.json(digest);
  } catch (error: any) {
    logger.error("[NEWS ROUTE] Error:", error?.message?.slice(0, 200));
    return res.status(500).json({
      error: "News konnten nicht geladen werden.",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
});

/**
 * GET /api/news/scopes
 * Returns the user's default scopes (derived from profile)
 */
router.get("/scopes", async (req: Request, res: Response) => {
  try {
    const userId =
      (req as any).user?.id || (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User nicht gefunden." });
    }

    const scopes = deriveDefaultScopes(user);
    const industry = (user as any).industry || "general";

    return res.json({ scopes, industry });
  } catch (error: any) {
    logger.error("[NEWS ROUTE] Scopes error:", error?.message?.slice(0, 200));
    return res.status(500).json({ error: "Fehler beim Laden der Scopes." });
  }
});

export default router;
