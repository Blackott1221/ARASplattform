import { Router, Request, Response } from 'express';
import { db } from '../db';
import { mailInbound } from '@shared/schema';
import { eq, desc, and, sql, ilike, or, lt } from 'drizzle-orm';
import { logger } from '../logger';
import { requireAdmin } from '../middleware/admin';
import { requireStaffOrAdmin } from '../middleware/staff';

const router = Router();

// Startup log (once)
logger.info('[MAIL-INBOUND] Routes initialized (direct db mode)');

// ============================================================================
// SIZE LIMITS for payload fields (truncate if exceeded)
// ============================================================================
const LIMITS = {
  subject: 200,
  snippet: 500,
  bodyText: 50_000,
  bodyHtml: 100_000,
};

function truncate(str: string | undefined | null, limit: number): string {
  if (!str) return '';
  return str.length > limit ? str.slice(0, limit) : str;
}

// Helper: Extract email from various formats like "Name <email@example.com>" or plain email
function extractEmail(input: string | undefined | null): string {
  if (!input) return '';
  const match = String(input).match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return String(input).replace(/[<>]/g, '').trim();
}

// Debug mode toggle
const DEBUG_RESPONSE = process.env.DEBUG_MAIL_INBOUND_RESPONSE === 'true';

// ============================================================================
// SHARED HANDLER: Gmail Inbound Webhook
// ============================================================================
// Used by both /webhook/gmail-inbound and /n8n/webhook/gmail-inbound
async function handleGmailInbound(req: Request, res: Response) {
  try {

    // 1. Secret check
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    const providedSecret = req.headers['x-aras-webhook-secret'];

    if (!webhookSecret) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] N8N_WEBHOOK_SECRET not configured');
      return res.status(500).json({ ok: false, error: 'Webhook secret not configured' });
    }

    if (providedSecret !== webhookSecret) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Invalid webhook secret');
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // 2. Parse payload with ROBUST MAPPING (all variants)
    const raw = req.body || {};
    const rawKeys = Object.keys(raw);
    
    // --- ROBUST FIELD EXTRACTION ---
    // messageId: multiple fallbacks
    const messageId = raw.messageId || raw.message_id || raw.id || '';
    
    // from.email: multiple fallbacks with <email> parsing
    const fromEmailRaw = raw.from?.email 
      || raw.fromEmail 
      || raw.from_email 
      || raw.From 
      || raw.headers?.from 
      || raw.headers?.From 
      || (typeof raw.from === 'string' ? raw.from : '');
    const fromEmail = extractEmail(fromEmailRaw);
    
    // from.name: multiple fallbacks
    const fromName = raw.from?.name || raw.fromName || raw.from_name || null;
    
    // subject: multiple fallbacks (camelCase, PascalCase, headers)
    const subjectRaw = raw.subject 
      || raw.Subject 
      || raw.headers?.subject 
      || raw.headers?.Subject 
      || '';
    
    // snippet: multiple fallbacks
    const snippetRaw = raw.snippet || raw.Snippet || '';
    
    // bodyText: multiple fallbacks (n8n uses textPlain, also try text, body)
    const bodyTextRaw = raw.bodyText 
      || raw.textPlain 
      || raw.text 
      || raw.body_text 
      || raw.body 
      || raw.Body 
      || '';
    
    // bodyHtml: multiple fallbacks (n8n uses textHtml)
    const bodyHtmlRaw = raw.bodyHtml 
      || raw.textHtml 
      || raw.html 
      || raw.body_html 
      || raw.Html 
      || '';
    
    // receivedAt: multiple fallbacks
    const receivedAtRaw = raw.receivedAt || raw.received_at || raw.date || raw.internalDate;

    // --- DEBUG LOGGING ---
    const snipLen = (snippetRaw || '').length;
    const txtLen = (bodyTextRaw || '').length;
    const htmlLen = (bodyHtmlRaw || '').length;
    
    logger.info('[MAIL-INBOUND-WEBHOOK] Incoming payload debug', {
      messageId: messageId || '(missing)',
      subject: (subjectRaw || '').slice(0, 50),
      fromEmail: fromEmail || '(missing)',
      snipLen,
      txtLen,
      htmlLen,
      rawKeys,
    });

    // Validate required fields
    if (!messageId) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Missing required field: messageId');
      return res.status(400).json({ ok: false, error: 'Missing required field: messageId' });
    }
    if (!fromEmail) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Missing required field: from.email', { rawKeys });
      return res.status(400).json({ ok: false, error: 'Missing required field: from.email' });
    }

    // Parse receivedAt (support Unix ms, ISO string, or Date) - fallback to now if missing/invalid
    let receivedAt: Date;
    if (!receivedAtRaw) {
      receivedAt = new Date();
    } else if (typeof receivedAtRaw === 'number') {
      receivedAt = new Date(receivedAtRaw);
    } else if (typeof receivedAtRaw === 'string') {
      const parsed = parseInt(receivedAtRaw, 10);
      receivedAt = !isNaN(parsed) && parsed > 1000000000000 
        ? new Date(parsed) 
        : new Date(receivedAtRaw);
    } else {
      receivedAt = new Date();
    }

    // Validate receivedAt is a valid date - fallback to now if invalid
    if (isNaN(receivedAt.getTime())) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Invalid receivedAt format, using current time');
      receivedAt = new Date();
    }

    // 3. Build payload with truncation (using robustly mapped values)
    const payload = {
      source: raw.source || 'gmail',
      messageId: String(messageId),
      threadId: raw.threadId || raw.thread_id || null,
      mailbox: raw.mailbox || raw.to?.[0]?.email || null,
      fromEmail: String(fromEmail),
      fromName,
      toEmails: Array.isArray(raw.to) 
        ? raw.to.map((t: any) => t.email || t).filter(Boolean)
        : (raw.toEmails || raw.to_emails || []),
      ccEmails: Array.isArray(raw.cc)
        ? raw.cc.map((c: any) => c.email || c).filter(Boolean)
        : (raw.ccEmails || raw.cc_emails || []),
      subject: truncate(subjectRaw, LIMITS.subject),
      snippet: truncate(snippetRaw, LIMITS.snippet),
      bodyText: truncate(bodyTextRaw, LIMITS.bodyText),
      bodyHtml: truncate(bodyHtmlRaw, LIMITS.bodyHtml),
      receivedAt,
      labels: Array.isArray(raw.labels) ? raw.labels : (raw.labelIds || []),
      meta: {
        rawPayloadHash: raw.rawPayloadHash,
        attachmentsCount: raw.attachments?.length || 0,
        hasAttachments: (raw.attachments?.length || 0) > 0,
        webhookReceivedAt: new Date().toISOString(),
      },
    };
    
    // Store lengths for optional debug response
    const debugInfo = { snipLen, txtLen, htmlLen };

    // 4. Persist (idempotent upsert) - DIRECT DB WRITE
    let resultId: number;
    let resultStatus: string;
    let isNew: boolean;

    // Try insert first, if conflict (message_id exists) then select existing
    try {
      const [inserted] = await db
        .insert(mailInbound)
        .values({
          source: payload.source,
          messageId: payload.messageId,
          threadId: payload.threadId,
          mailbox: payload.mailbox,
          fromEmail: payload.fromEmail,
          fromName: payload.fromName,
          toEmails: payload.toEmails,
          ccEmails: payload.ccEmails,
          subject: payload.subject,
          snippet: payload.snippet,
          bodyText: payload.bodyText,
          bodyHtml: payload.bodyHtml,
          receivedAt: payload.receivedAt,
          labels: payload.labels,
          status: 'NEW',
          meta: payload.meta,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: mailInbound.id, status: mailInbound.status });

      if (inserted) {
        resultId = inserted.id;
        resultStatus = inserted.status;
        isNew = true;
      } else {
        // Conflict - record exists, fetch it
        const [existing] = await db
          .select({ id: mailInbound.id, status: mailInbound.status })
          .from(mailInbound)
          .where(eq(mailInbound.messageId, payload.messageId))
          .limit(1);
        
        if (existing) {
          resultId = existing.id;
          resultStatus = existing.status;
          isNew = false;
        } else {
          throw new Error('Insert failed and no existing record found');
        }
      }
    } catch (dbError: any) {
      logger.error('[MAIL-INBOUND-WEBHOOK] DB error:', dbError.message);
      throw dbError;
    }

    logger.info(`[MAIL-INBOUND-WEBHOOK] Processed mail: id=${resultId}, isNew=${isNew}, from=${payload.fromEmail}, snipLen=${debugInfo.snipLen}, txtLen=${debugInfo.txtLen}, htmlLen=${debugInfo.htmlLen}`);

    // 5. Response (with optional debug info)
    const response: Record<string, any> = {
      ok: true,
      id: resultId,
      status: resultStatus,
      isNew,
    };
    
    if (DEBUG_RESPONSE) {
      response.debug = debugInfo;
    }
    
    return res.json(response);

  } catch (error: any) {
    logger.error('[MAIL-INBOUND-WEBHOOK] Error processing webhook:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// ============================================================================
// WEBHOOK ROUTES (both paths supported for compatibility)
// ============================================================================
// Primary: POST /api/webhook/gmail-inbound
// Alias:   POST /api/n8n/webhook/gmail-inbound
// ============================================================================

router.post('/webhook/gmail-inbound', handleGmailInbound);
router.post('/n8n/webhook/gmail-inbound', handleGmailInbound);

// ============================================================================
// READ: GET /api/internal/mail/inbound
// ============================================================================
// List inbound emails with optional filters
// Protected by admin/staff auth
// ============================================================================

router.get('/internal/mail/inbound', requireStaffOrAdmin, async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;
    const mailboxFilter = req.query.mailbox as string | undefined;
    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const limitCapped = Math.min(limitParam, 100);
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;

    // Build conditions array
    const conditions: any[] = [];
    
    if (statusFilter) {
      conditions.push(eq(mailInbound.status, statusFilter));
    }
    if (mailboxFilter) {
      conditions.push(eq(mailInbound.mailbox, mailboxFilter));
    }
    if (cursor) {
      conditions.push(lt(mailInbound.id, cursor));
    }
    if (q) {
      const searchTerm = `%${q}%`;
      conditions.push(or(
        ilike(mailInbound.subject, searchTerm),
        ilike(mailInbound.fromEmail, searchTerm),
        ilike(mailInbound.fromName, searchTerm)
      ));
    }

    // Execute query
    let mails;
    if (conditions.length > 0) {
      mails = await db
        .select()
        .from(mailInbound)
        .where(and(...conditions))
        .orderBy(desc(mailInbound.receivedAt))
        .limit(limitCapped);
    } else {
      mails = await db
        .select()
        .from(mailInbound)
        .orderBy(desc(mailInbound.receivedAt))
        .limit(limitCapped);
    }

    // Calculate next cursor for pagination
    const nextCursor = mails.length === limitCapped && mails.length > 0
      ? mails[mails.length - 1].id
      : null;

    return res.json({
      ok: true,
      data: mails,
      pagination: {
        count: mails.length,
        limit: limitCapped,
        nextCursor,
      },
    });

  } catch (error: any) {
    logger.error('[MAIL-INBOUND-LIST] Error listing mails:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to list inbound mails',
      message: error.message,
    });
  }
});

// ============================================================================
// READ: GET /api/internal/mail/inbound/:id
// ============================================================================
// Get single inbound email by ID
// Protected by admin/staff auth
// ============================================================================

router.get('/internal/mail/inbound/:id', requireStaffOrAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid mail ID' });
    }

    // Direct db query
    const [mail] = await db
      .select()
      .from(mailInbound)
      .where(eq(mailInbound.id, id))
      .limit(1);

    if (!mail) {
      return res.status(404).json({ ok: false, error: 'Mail not found' });
    }

    return res.json({
      ok: true,
      data: mail,
    });

  } catch (error: any) {
    logger.error('[MAIL-INBOUND-DETAIL] Error getting mail:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to get inbound mail',
      message: error.message,
    });
  }
});

// ============================================================================
// UPDATE: PATCH /api/internal/mail/inbound/:id
// ============================================================================
// Update mail status (NEW → OPEN → DONE / ARCHIVED)
// Protected by admin/staff auth
// ============================================================================

const VALID_STATUSES = ['NEW', 'OPEN', 'DONE', 'ARCHIVED'];

router.patch('/internal/mail/inbound/:id', requireStaffOrAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid mail ID' });
    }

    const { status, meta } = req.body;

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        ok: false, 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
      });
    }

    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }

    if (meta && typeof meta === 'object') {
      // Merge with existing meta
      const [existing] = await db
        .select({ meta: mailInbound.meta })
        .from(mailInbound)
        .where(eq(mailInbound.id, id))
        .limit(1);
      
      updateData.meta = { ...(existing?.meta || {}), ...meta };
    }

    // Update the record
    const [updated] = await db
      .update(mailInbound)
      .set(updateData)
      .where(eq(mailInbound.id, id))
      .returning({ id: mailInbound.id, status: mailInbound.status });

    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Mail not found' });
    }

    logger.info(`[MAIL-INBOUND-UPDATE] Updated mail id=${id}, status=${updated.status}`);

    return res.json({
      ok: true,
      id: updated.id,
      status: updated.status,
    });

  } catch (error: any) {
    logger.error('[MAIL-INBOUND-UPDATE] Error updating mail:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to update inbound mail',
      message: error.message,
    });
  }
});

// ============================================================================
// COUNT: GET /api/internal/mail/inbound/count
// ============================================================================
// Get count of mails by status
// ============================================================================

router.get('/internal/mail/inbound/count', requireStaffOrAdmin, async (req, res) => {
  try {
    const counts = await db
      .select({
        status: mailInbound.status,
        count: sql<number>`count(*)::int`,
      })
      .from(mailInbound)
      .groupBy(mailInbound.status);

    const result: Record<string, number> = {
      NEW: 0,
      OPEN: 0,
      DONE: 0,
      ARCHIVED: 0,
      total: 0,
    };

    for (const row of counts) {
      result[row.status] = row.count;
      result.total += row.count;
    }

    return res.json({
      ok: true,
      counts: result,
    });

  } catch (error: any) {
    logger.error('[MAIL-INBOUND-COUNT] Error counting mails:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Failed to count inbound mails',
      message: error.message,
    });
  }
});

export default router;
