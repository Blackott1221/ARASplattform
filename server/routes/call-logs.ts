/**
 * ARAS Call Logs API
 * - Audio streaming proxy (Safari CORS fix)
 * - Call details endpoint
 * - Gemini recommendations endpoint
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { callLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// AUDIO STREAMING PROXY (Safari CORS fix)
// ═══════════════════════════════════════════════════════════════

router.get('/:id/audio', async (req: Request, res: Response) => {
  const callId = parseInt(req.params.id, 10);
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (isNaN(callId)) {
    return res.status(400).json({ message: 'Invalid call ID' });
  }

  try {
    // Fetch call from DB
    const [call] = await db.select().from(callLogs)
      .where(eq(callLogs.id, callId))
      .limit(1);

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    // Verify ownership
    if (call.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!call.recordingUrl) {
      return res.status(404).json({ message: 'No recording available' });
    }

    // Stream audio from external URL
    const audioResponse = await fetch(call.recordingUrl, {
      headers: {
        'Accept': 'audio/*',
      },
    });

    if (!audioResponse.ok) {
      console.error('[CallLogs] Audio fetch failed:', audioResponse.status);
      return res.status(502).json({ message: 'Failed to fetch audio' });
    }

    // Forward headers for proper streaming
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = audioResponse.headers.get('content-length');
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range && contentLength) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : parseInt(contentLength, 10) - 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
      res.setHeader('Content-Length', end - start + 1);
    }

    // Pipe the audio stream
    if (audioResponse.body) {
      audioResponse.body.pipe(res);
    } else {
      res.status(500).json({ message: 'No audio body' });
    }

  } catch (error: any) {
    console.error('[CallLogs] Audio proxy error:', error);
    res.status(500).json({ message: 'Audio streaming failed', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CALL DETAILS ENDPOINT
// ═══════════════════════════════════════════════════════════════

router.get('/:id', async (req: Request, res: Response) => {
  const callId = parseInt(req.params.id, 10);
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (isNaN(callId)) {
    return res.status(400).json({ message: 'Invalid call ID' });
  }

  try {
    const [call] = await db.select().from(callLogs)
      .where(eq(callLogs.id, callId))
      .limit(1);

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    if (call.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Parse metadata
    let metadata: Record<string, any> = {};
    if (call.metadata) {
      if (typeof call.metadata === 'string') {
        try { metadata = JSON.parse(call.metadata); } catch {}
      } else if (typeof call.metadata === 'object') {
        metadata = call.metadata as Record<string, any>;
      }
    }

    res.json({
      id: call.id,
      phoneNumber: call.phoneNumber,
      contactName: call.contactName,
      status: call.status,
      duration: call.duration,
      transcript: call.transcript,
      recordingUrl: call.recordingUrl ? `/api/call-logs/${call.id}/audio` : null,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
      metadata: {
        summary: metadata.summary || metadata.ai_summary,
        sentiment: metadata.sentiment,
        nextStep: metadata.nextStep || metadata.next_action,
        gemini: metadata.gemini,
      },
    });

  } catch (error: any) {
    console.error('[CallLogs] Get call error:', error);
    res.status(500).json({ message: 'Failed to get call', error: error.message });
  }
});

export default router;
