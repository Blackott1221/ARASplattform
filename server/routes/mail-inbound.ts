import { Router } from 'express';
import { storage } from '../storage';
import { logger } from '../logger';
import { requireAdmin } from '../middleware/admin';
import { requireStaffOrAdmin } from '../middleware/staff';

const router = Router();

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

// ============================================================================
// WEBHOOK: POST /api/n8n/webhook/gmail-inbound
// ============================================================================
// Receives incoming Gmail messages from n8n workflow
// Protected by x-aras-webhook-secret header
// ============================================================================

router.post('/webhook/gmail-inbound', async (req, res) => {
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

    // 2. Parse payload (tolerant extraction)
    const body = req.body || {};
    
    // Extract required fields
    const messageId = body.messageId || body.message_id || body.id;
    const fromEmail = body.from?.email || body.fromEmail || body.from_email;
    const receivedAtRaw = body.receivedAt || body.received_at || body.date || body.internalDate;

    // Validate required fields
    if (!messageId) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Missing required field: messageId');
      return res.status(400).json({ ok: false, error: 'Missing required field: messageId' });
    }
    if (!fromEmail) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Missing required field: from.email');
      return res.status(400).json({ ok: false, error: 'Missing required field: from.email' });
    }
    if (!receivedAtRaw) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Missing required field: receivedAt');
      return res.status(400).json({ ok: false, error: 'Missing required field: receivedAt' });
    }

    // Parse receivedAt (support Unix ms, ISO string, or Date)
    let receivedAt: Date;
    if (typeof receivedAtRaw === 'number') {
      // Unix timestamp in milliseconds
      receivedAt = new Date(receivedAtRaw);
    } else if (typeof receivedAtRaw === 'string') {
      // Try parsing as number first (string of ms), then as ISO
      const parsed = parseInt(receivedAtRaw, 10);
      receivedAt = !isNaN(parsed) && parsed > 1000000000000 
        ? new Date(parsed) 
        : new Date(receivedAtRaw);
    } else {
      receivedAt = new Date();
    }

    // Validate receivedAt is a valid date
    if (isNaN(receivedAt.getTime())) {
      logger.warn('[MAIL-INBOUND-WEBHOOK] Invalid receivedAt format');
      return res.status(400).json({ ok: false, error: 'Invalid receivedAt format' });
    }

    // 3. Build payload with truncation
    const payload = {
      source: body.source || 'gmail',
      messageId: String(messageId),
      threadId: body.threadId || body.thread_id || null,
      mailbox: body.mailbox || body.to?.[0]?.email || null,
      fromEmail: String(fromEmail),
      fromName: body.from?.name || body.fromName || body.from_name || null,
      toEmails: Array.isArray(body.to) 
        ? body.to.map((t: any) => t.email || t).filter(Boolean)
        : (body.toEmails || body.to_emails || []),
      ccEmails: Array.isArray(body.cc)
        ? body.cc.map((c: any) => c.email || c).filter(Boolean)
        : (body.ccEmails || body.cc_emails || []),
      subject: truncate(body.subject, LIMITS.subject),
      snippet: truncate(body.snippet, LIMITS.snippet),
      bodyText: truncate(body.text || body.bodyText || body.body_text || body.body, LIMITS.bodyText),
      bodyHtml: truncate(body.html || body.bodyHtml || body.body_html, LIMITS.bodyHtml),
      receivedAt,
      labels: Array.isArray(body.labels) ? body.labels : (body.labelIds || []),
      meta: {
        rawPayloadHash: body.rawPayloadHash,
        attachmentsCount: body.attachments?.length || 0,
        hasAttachments: (body.attachments?.length || 0) > 0,
        webhookReceivedAt: new Date().toISOString(),
      },
    };

    // 4. Persist (idempotent upsert)
    const result = await storage.upsertInboundMail(payload);

    logger.info(`[MAIL-INBOUND-WEBHOOK] Processed mail: id=${result.id}, isNew=${result.isNew}, from=${payload.fromEmail}`);

    // 5. Response
    return res.json({
      ok: true,
      id: result.id,
      status: result.status,
      isNew: result.isNew,
    });

  } catch (error: any) {
    logger.error('[MAIL-INBOUND-WEBHOOK] Error processing webhook:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================================================
// READ: GET /api/internal/mail/inbound
// ============================================================================
// List inbound emails with optional filters
// Protected by admin/staff auth
// ============================================================================

router.get('/internal/mail/inbound', requireStaffOrAdmin, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;

    const mails = await storage.listInboundMail({ status, q, limit, cursor });

    // Calculate next cursor for pagination
    const nextCursor = mails.length === limit && mails.length > 0
      ? mails[mails.length - 1].id
      : null;

    return res.json({
      ok: true,
      data: mails,
      pagination: {
        count: mails.length,
        limit,
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

    const mail = await storage.getInboundMailById(id);

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

export default router;
