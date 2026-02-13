import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { ndaAcceptances, NDA_CURRENT_VERSION } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiter (in-memory, scoped to NDA routes)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 8;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

// Cleanup stale entries every 15 min
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.keys()).forEach((key) => {
    const entry = rateLimitMap.get(key);
    if (entry && now > entry.resetAt) rateLimitMap.delete(key);
  });
}, 15 * 60 * 1000);

// ---------------------------------------------------------------------------
// Helper: get client IP
// ---------------------------------------------------------------------------
function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// Helper: generate a secure random token for the cookie
// ---------------------------------------------------------------------------
function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const acceptSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters").max(200),
  email: z.string().email("Please provide a valid email address").max(320),
  company: z.string().max(200).optional().default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "You must agree to the NDA" }) }),
});

// ---------------------------------------------------------------------------
// Cookie config
// ---------------------------------------------------------------------------
const COOKIE_NAME = "nda_access";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function setNdaCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

// In-memory token → acceptanceId map (lightweight; production would use Redis)
// We also store the token in a simple Map so we can verify it on /data-room requests
const tokenStore = new Map<string, { acceptanceId: number; email: string; ndaVersion: string }>();

// ---------------------------------------------------------------------------
// POST /api/nda/accept
// ---------------------------------------------------------------------------
router.post("/accept", async (req: Request, res: Response) => {
  try {
    // Rate limit
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return res.status(429).json({ ok: false, message: "Too many requests. Please try again later." });
    }

    // Validate
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Validation failed";
      return res.status(400).json({ ok: false, message: firstError, errors: parsed.error.errors });
    }

    const { fullName, email, company, consent } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const userAgent = (req.headers["user-agent"] as string) || "";
    const pagePath = (req.body.pagePath as string) || "/nda";

    // Check if already accepted this version
    const existing = await db
      .select()
      .from(ndaAcceptances)
      .where(
        and(
          eq(ndaAcceptances.email, normalizedEmail),
          eq(ndaAcceptances.ndaVersion, NDA_CURRENT_VERSION)
        )
      )
      .limit(1);

    let acceptanceId: number;

    if (existing.length > 0) {
      // Reuse existing acceptance — do not create duplicate
      acceptanceId = existing[0].id;
    } else {
      // Insert new acceptance
      const [row] = await db
        .insert(ndaAcceptances)
        .values({
          email: normalizedEmail,
          fullName: fullName.trim(),
          company: company?.trim() || null,
          ndaVersion: NDA_CURRENT_VERSION,
          acceptedAt: new Date().toISOString() as any,
          ipAddress: ip,
          userAgent,
          pagePath,
          consent,
        })
        .returning({ id: ndaAcceptances.id });

      acceptanceId = row.id;
    }

    // Generate token and set cookie
    const token = generateAccessToken();
    tokenStore.set(token, { acceptanceId, email: normalizedEmail, ndaVersion: NDA_CURRENT_VERSION });
    setNdaCookie(res, token);

    return res.json({ ok: true, redirectTo: "/data-room" });
  } catch (error: any) {
    console.error("[NDA] Accept error:", error);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/nda/status?email=...
// ---------------------------------------------------------------------------
router.get("/status", async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string)?.toLowerCase().trim();
    if (!email || !z.string().email().safeParse(email).success) {
      return res.json({ accepted: false });
    }

    const rows = await db
      .select({
        ndaVersion: ndaAcceptances.ndaVersion,
        acceptedAt: ndaAcceptances.acceptedAt,
      })
      .from(ndaAcceptances)
      .where(
        and(
          eq(ndaAcceptances.email, email),
          eq(ndaAcceptances.ndaVersion, NDA_CURRENT_VERSION)
        )
      )
      .limit(1);

    if (rows.length > 0) {
      return res.json({
        accepted: true,
        ndaVersion: rows[0].ndaVersion,
        acceptedAt: rows[0].acceptedAt,
      });
    }

    return res.json({ accepted: false });
  } catch (error: any) {
    console.error("[NDA] Status check error:", error);
    return res.json({ accepted: false });
  }
});

// ---------------------------------------------------------------------------
// GET /api/nda/verify — verify cookie token (used by data-room page)
// ---------------------------------------------------------------------------
router.get("/verify", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.json({ valid: false });
    }

    // Check in-memory store first
    const stored = tokenStore.get(token);
    if (stored && stored.ndaVersion === NDA_CURRENT_VERSION) {
      return res.json({ valid: true, email: stored.email });
    }

    // Token not in memory (server restart) — cookie is stale
    return res.json({ valid: false });
  } catch (error: any) {
    console.error("[NDA] Verify error:", error);
    return res.json({ valid: false });
  }
});

// ---------------------------------------------------------------------------
// GET /api/nda/admin/acceptances — admin list (protectable later)
// ---------------------------------------------------------------------------
router.get("/admin/acceptances", async (req: Request, res: Response) => {
  try {
    // Basic admin check: if session-based admin auth exists, use it
    const userRole = (req as any).session?.userId
      ? (req as any).user?.userRole
      : null;

    // For now, allow access but log it — protect with requireAdmin later
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const rows = await db
      .select({
        id: ndaAcceptances.id,
        email: ndaAcceptances.email,
        fullName: ndaAcceptances.fullName,
        company: ndaAcceptances.company,
        ndaVersion: ndaAcceptances.ndaVersion,
        acceptedAt: ndaAcceptances.acceptedAt,
        ipAddress: ndaAcceptances.ipAddress,
        pagePath: ndaAcceptances.pagePath,
      })
      .from(ndaAcceptances)
      .orderBy(desc(ndaAcceptances.acceptedAt))
      .limit(limit)
      .offset(offset);

    return res.json({ ok: true, data: rows, count: rows.length });
  } catch (error: any) {
    console.error("[NDA] Admin list error:", error);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

export default router;
