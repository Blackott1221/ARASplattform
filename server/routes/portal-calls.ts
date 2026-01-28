/**
 * ============================================================================
 * ARAS CLIENT PORTAL - Calls API
 * ============================================================================
 * Read-only access to call logs for client portals
 * Strictly filtered by portal config
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { callLogs } from '@shared/schema';
import { eq, desc, and, sql, ilike, or, lt } from 'drizzle-orm';
import { requirePortalAuth } from './portal-auth';

const router = Router();

// Apply auth to all routes
router.use(requirePortalAuth);

// ============================================================================
// TYPES
// ============================================================================

/**
 * PortalCallFilter — Flexible filter modes for portal call isolation
 * Supports: userId, voiceAgentId, metadata key match, or compound (AND)
 */
type PortalCallFilter =
  | { mode: 'userId'; value: string }
  | { mode: 'voiceAgentId'; value: number }
  | { mode: 'metadata'; key: string; value: string }
  | { mode: 'compound'; all: PortalCallFilter[] };

interface PortalConfig {
  company: {
    name: string;
    ceo: string;
    email: string;
    addressLine: string;
    zipCity: string;
    vatId: string;
  };
  package: {
    includedCalls: number;
    label: string;
    notes: string;
  };
  ui: {
    portalTitle: string;
    tooltipMode: string;
    kpiFocus: string;
    infoHints?: Record<string, string>;
  };
  filter: PortalCallFilter | { field: string; value: string }; // backward compat
}

// ============================================================================
// HELPER: Parse legacy filter format to new PortalCallFilter
// ============================================================================

function normalizeFilter(rawFilter: PortalConfig['filter']): PortalCallFilter {
  // New format: already has 'mode'
  if ('mode' in rawFilter) {
    return rawFilter as PortalCallFilter;
  }
  
  // Legacy format: { field, value }
  const { field, value } = rawFilter as { field: string; value: string };
  
  if (field === 'userId') {
    return { mode: 'userId', value };
  }
  if (field === 'voiceAgentId') {
    return { mode: 'voiceAgentId', value: Number(value) };
  }
  if (field.startsWith('metadata.')) {
    return { mode: 'metadata', key: field.replace('metadata.', ''), value };
  }
  
  // Default fallback: treat as userId
  return { mode: 'userId', value };
}

// ============================================================================
// HELPER: Build Drizzle WHERE clause from PortalCallFilter
// Supports userId, voiceAgentId, metadata jsonb key, compound AND
// ============================================================================

function buildPortalCallWhere(filter: PortalCallFilter): ReturnType<typeof eq> {
  switch (filter.mode) {
    case 'userId':
      return eq(callLogs.userId, filter.value);
    
    case 'voiceAgentId':
      return eq(callLogs.voiceAgentId, filter.value);
    
    case 'metadata':
      return sql`(${callLogs.metadata} ->> ${filter.key}) = ${filter.value}`;
    
    case 'compound':
      if (filter.all.length === 0) {
        // Empty compound = match nothing for safety
        return sql`FALSE`;
      }
      if (filter.all.length === 1) {
        return buildPortalCallWhere(filter.all[0]);
      }
      // AND all sub-filters
      const conditions = filter.all.map(f => buildPortalCallWhere(f));
      return and(...conditions)!;
    
    default:
      // Safety fallback: match nothing
      return sql`FALSE`;
  }
}

// Legacy wrapper for backward compat
function buildFilterCondition(config: PortalConfig) {
  const normalized = normalizeFilter(config.filter);
  return buildPortalCallWhere(normalized);
}

// ============================================================================
// GET /api/portal/calls
// List calls with pagination and optional filters
// ============================================================================

router.get('/calls', async (req: Request, res: Response) => {
  try {
    const config = (req as any).portalConfig as PortalConfig;
    
    // Parse query params
    const cursor = req.query.cursor as string | undefined;
    const limitParam = parseInt(req.query.limit as string) || 50;
    const limit = Math.min(Math.max(limitParam, 1), 200); // 1-200
    const status = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;
    
    // Build base filter from portal config
    const baseFilter = buildFilterCondition(config);
    
    // Build conditions array
    const conditions = [baseFilter];
    
    // Add status filter if provided
    if (status && status !== 'all') {
      conditions.push(eq(callLogs.status, status));
    }
    
    // Add search filter if provided
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(callLogs.phoneNumber, searchTerm),
          ilike(callLogs.contactName, searchTerm),
          sql`${callLogs.metadata}->>'purpose' ILIKE ${searchTerm}`
        )!
      );
    }
    
    // Add cursor filter if provided
    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      if (!isNaN(cursorId)) {
        conditions.push(lt(callLogs.id, cursorId));
      }
    }
    
    // Execute query
    const calls = await db
      .select({
        id: callLogs.id,
        phoneNumber: callLogs.phoneNumber,
        contactName: callLogs.contactName,
        status: callLogs.status,
        duration: callLogs.duration,
        transcript: callLogs.transcript,
        recordingUrl: callLogs.recordingUrl,
        metadata: callLogs.metadata,
        createdAt: callLogs.createdAt,
        updatedAt: callLogs.updatedAt
      })
      .from(callLogs)
      .where(and(...conditions))
      .orderBy(desc(callLogs.id))
      .limit(limit + 1); // Fetch one extra to check for next page
    
    // Check if there's a next page
    const hasMore = calls.length > limit;
    const items = hasMore ? calls.slice(0, limit) : calls;
    const nextCursor = hasMore && items.length > 0 
      ? String(items[items.length - 1].id) 
      : null;
    
    // Transform items for response
    const transformedItems = items.map(call => {
      const meta = (call.metadata || {}) as Record<string, any>;
      const analysis = meta.ai?.analysisV1;
      
      return {
        id: call.id,
        startedAt: call.createdAt,
        durationSec: call.duration || null,
        to: call.phoneNumber,
        contactName: call.contactName || null,
        status: call.status || 'unknown',
        outcome: meta.outcome || meta.call_status || null,
        hasTranscript: !!(call.transcript && call.transcript.length > 0),
        hasRecording: !!(call.recordingUrl && call.recordingUrl.length > 0),
        signalScore: analysis?.signalScore ?? null,
        hasAnalysis: !!analysis
      };
    });
    
    return res.json({
      items: transformedItems,
      nextCursor
    });
    
  } catch (error: any) {
    console.error('[PORTAL-CALLS] Error listing calls:', error);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Failed to retrieve calls' 
    });
  }
});

// ============================================================================
// GET /api/portal/calls/stats
// Get call statistics for package usage
// ============================================================================

router.get('/calls/stats', async (req: Request, res: Response) => {
  try {
    const config = (req as any).portalConfig as PortalConfig;
    const baseFilter = buildFilterCondition(config);
    
    // Count total calls
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(callLogs)
      .where(baseFilter);
    
    const totalCalls = countResult?.count || 0;
    const includedCalls = config.package.includedCalls;
    const remainingCalls = Math.max(0, includedCalls - totalCalls);
    
    return res.json({
      totalCalls,
      includedCalls,
      remainingCalls,
      usagePercent: Math.round((totalCalls / includedCalls) * 100)
    });
    
  } catch (error: any) {
    console.error('[PORTAL-CALLS] Error getting stats:', error);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Failed to retrieve statistics' 
    });
  }
});

// ============================================================================
// GET /api/portal/calls/:id
// Get single call details
// ============================================================================

router.get('/calls/:id', async (req: Request, res: Response) => {
  try {
    const config = (req as any).portalConfig as PortalConfig;
    const callId = parseInt(req.params.id, 10);
    
    if (isNaN(callId)) {
      return res.status(400).json({ 
        error: 'INVALID_ID', 
        message: 'Invalid call ID' 
      });
    }
    
    // Build filter with portal config + call ID
    const baseFilter = buildFilterCondition(config);
    
    const [call] = await db
      .select()
      .from(callLogs)
      .where(and(
        baseFilter,
        eq(callLogs.id, callId)
      ))
      .limit(1);
    
    if (!call) {
      return res.status(404).json({ 
        error: 'NOT_FOUND', 
        message: 'Call not found' 
      });
    }
    
    // Parse metadata
    const meta = (call.metadata || {}) as Record<string, any>;
    
    // Clean transcript - remove any JSON artifacts
    let cleanTranscript = call.transcript || null;
    if (cleanTranscript && typeof cleanTranscript === 'string') {
      const jsonIndex = cleanTranscript.indexOf('{"role":');
      if (jsonIndex > 0) {
        cleanTranscript = cleanTranscript.substring(0, jsonIndex).trim();
      }
    }
    
    // Build recording URL (use proxy endpoint to avoid CORS)
    const recordingUrl = call.recordingUrl 
      ? `/api/portal/calls/${call.id}/audio`
      : null;
    
    return res.json({
      id: call.id,
      overview: {
        startedAt: call.createdAt,
        updatedAt: call.updatedAt,
        durationSec: call.duration || null,
        to: call.phoneNumber,
        contactName: call.contactName || null,
        status: call.status || 'unknown',
        outcome: meta.outcome || meta.call_status || null
      },
      transcript: cleanTranscript,
      summary: meta.summary || meta.ai_summary || null,
      recordingUrl,
      analysis: {
        sentiment: meta.sentiment || null,
        nextStep: meta.nextStep || meta.next_action || null,
        purpose: meta.purpose || null
      }
    });
    
  } catch (error: any) {
    console.error('[PORTAL-CALLS] Error getting call:', error);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Failed to retrieve call details' 
    });
  }
});

// ============================================================================
// GET /api/portal/calls/:id/audio
// Proxy audio stream (avoids CORS issues)
// ============================================================================

router.get('/calls/:id/audio', async (req: Request, res: Response) => {
  try {
    const config = (req as any).portalConfig as PortalConfig;
    const callId = parseInt(req.params.id, 10);
    
    if (isNaN(callId)) {
      return res.status(400).json({ error: 'INVALID_ID', message: 'Invalid call ID' });
    }
    
    // Verify call belongs to portal
    const baseFilter = buildFilterCondition(config);
    
    const [call] = await db
      .select({ recordingUrl: callLogs.recordingUrl })
      .from(callLogs)
      .where(and(
        baseFilter,
        eq(callLogs.id, callId)
      ))
      .limit(1);
    
    if (!call) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Call not found' });
    }
    
    if (!call.recordingUrl) {
      return res.status(404).json({ error: 'NO_AUDIO', message: 'No recording available' });
    }
    
    // Stream audio from external URL
    const audioResponse = await fetch(call.recordingUrl);
    
    if (!audioResponse.ok) {
      return res.status(502).json({ error: 'UPSTREAM_ERROR', message: 'Failed to fetch audio' });
    }
    
    // Forward headers
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = audioResponse.headers.get('content-length');
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Pipe the audio stream
    if (audioResponse.body) {
      const reader = audioResponse.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      pump().catch(err => {
        console.error('[PORTAL-CALLS] Audio stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'STREAM_ERROR', message: 'Audio streaming failed' });
        }
      });
    } else {
      res.status(500).json({ error: 'NO_BODY', message: 'No audio body' });
    }
    
  } catch (error: any) {
    console.error('[PORTAL-CALLS] Audio proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'STREAM_ERROR', message: 'Audio streaming failed' });
    }
  }
});

// ============================================================================
// GET /api/portal/debug/filter
// Diagnostics: show filter config and matched count (no sensitive data)
// ============================================================================

router.get('/debug/filter', async (req: Request, res: Response) => {
  try {
    const session = (req as any).portalSession;
    const config = (req as any).portalConfig as PortalConfig;
    const normalized = normalizeFilter(config.filter);
    const baseFilter = buildPortalCallWhere(normalized);
    
    // Count matched calls
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(callLogs)
      .where(baseFilter);
    
    const matchedCount = countResult?.count || 0;
    
    // Sample 5 newest (safe fields only)
    const sample = await db
      .select({
        id: callLogs.id,
        createdAt: callLogs.createdAt,
        phoneNumber: callLogs.phoneNumber,
        status: callLogs.status,
        voiceAgentId: callLogs.voiceAgentId,
        userId: callLogs.userId
      })
      .from(callLogs)
      .where(baseFilter)
      .orderBy(desc(callLogs.id))
      .limit(5);
    
    return res.json({
      portalKey: session.portalKey,
      filter: normalized,
      matchedCount,
      sample
    });
    
  } catch (error: any) {
    console.error('[PORTAL-CALLS] Debug filter error:', error);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Failed to run filter diagnostics' 
    });
  }
});

// ============================================================================
// GET /api/portal/calls/insights
// Aggregated insights for dashboard (trends, KPIs, sentiment)
// ============================================================================

const HIGH_SIGNAL_THRESHOLD = 70;

router.get('/calls/insights', async (req: Request, res: Response) => {
  try {
    const config = (req as any).portalConfig as PortalConfig;
    const baseFilter = buildFilterCondition(config);
    
    // Parse range param
    const rangeParam = (req.query.range as string) || '14d';
    let dateFilter = sql`TRUE`;
    
    if (rangeParam === '14d') {
      dateFilter = sql`${callLogs.createdAt} >= NOW() - INTERVAL '14 days'`;
    } else if (rangeParam === '30d') {
      dateFilter = sql`${callLogs.createdAt} >= NOW() - INTERVAL '30 days'`;
    }
    // 'all' = no date filter
    
    // Fetch calls in range (lightweight fields only)
    const calls = await db
      .select({
        id: callLogs.id,
        createdAt: callLogs.createdAt,
        status: callLogs.status,
        duration: callLogs.duration,
        metadata: callLogs.metadata
      })
      .from(callLogs)
      .where(and(baseFilter, dateFilter))
      .orderBy(desc(callLogs.createdAt))
      .limit(2000);
    
    // Aggregate totals
    let completed = 0, failed = 0, initiated = 0;
    let totalDuration = 0, durationCount = 0;
    let positive = 0, neutral = 0, negative = 0, mixed = 0;
    let analyzedCount = 0, highSignalCount = 0;
    
    // Daily series map
    const dailyMap = new Map<string, { total: number; completed: number; failed: number; highSignal: number; analyzed: number }>();
    
    for (const call of calls) {
      const meta = (call.metadata || {}) as Record<string, any>;
      const analysis = meta.ai?.analysisV1;
      const dateKey = new Date(call.createdAt!).toISOString().split('T')[0];
      
      // Initialize daily bucket
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { total: 0, completed: 0, failed: 0, highSignal: 0, analyzed: 0 });
      }
      const day = dailyMap.get(dateKey)!;
      day.total++;
      
      // Status counts
      const status = call.status?.toLowerCase();
      if (status === 'completed' || status === 'done') {
        completed++;
        day.completed++;
      } else if (status === 'failed' || status === 'error') {
        failed++;
        day.failed++;
      } else if (status === 'initiated' || status === 'in_progress') {
        initiated++;
      }
      
      // Duration
      if (call.duration && call.duration > 0) {
        totalDuration += call.duration;
        durationCount++;
      }
      
      // Sentiment
      const sentiment = analysis?.sentiment || meta.sentiment;
      if (sentiment === 'positive') positive++;
      else if (sentiment === 'neutral') neutral++;
      else if (sentiment === 'negative') negative++;
      else if (sentiment === 'mixed') mixed++;
      
      // Analysis
      if (analysis) {
        analyzedCount++;
        day.analyzed++;
        if (analysis.signalScore >= HIGH_SIGNAL_THRESHOLD) {
          highSignalCount++;
          day.highSignal++;
        }
      }
    }
    
    // Build series array (sorted by date)
    const series = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));
    
    return res.json({
      range: rangeParam,
      totals: {
        total: calls.length,
        completed,
        failed,
        initiated,
        avgDurationSec: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
        sentiment: { positive, neutral, negative, mixed },
        analyzedCount,
        highSignalCount
      },
      series
    });
    
  } catch (error: any) {
    console.error('[PORTAL-CALLS] Insights error:', error);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Failed to generate insights' 
    });
  }
});

// ============================================================================
// GET /api/portal/calls/export.csv
// Export calls as CSV (respects filters, max 5000 rows)
// ============================================================================

router.get('/calls/export.csv', async (req: Request, res: Response) => {
  try {
    const config = (req as any).portalConfig as PortalConfig;
    const baseFilter = buildFilterCondition(config);
    
    // Parse query params
    const status = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;
    const range = req.query.range as string | undefined;
    
    const conditions = [baseFilter];
    
    // Date range filter
    if (range === '14d') {
      conditions.push(sql`${callLogs.createdAt} >= NOW() - INTERVAL '14 days'`);
    } else if (range === '30d') {
      conditions.push(sql`${callLogs.createdAt} >= NOW() - INTERVAL '30 days'`);
    }
    
    // Status filter
    if (status && status !== 'all') {
      conditions.push(eq(callLogs.status, status));
    }
    
    // Search filter
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(callLogs.phoneNumber, searchTerm),
          ilike(callLogs.contactName, searchTerm)
        )!
      );
    }
    
    // Fetch calls (max 5000)
    const calls = await db
      .select({
        createdAt: callLogs.createdAt,
        phoneNumber: callLogs.phoneNumber,
        contactName: callLogs.contactName,
        status: callLogs.status,
        duration: callLogs.duration,
        metadata: callLogs.metadata
      })
      .from(callLogs)
      .where(and(...conditions))
      .orderBy(desc(callLogs.createdAt))
      .limit(5000);
    
    // Build CSV
    const headers = ['createdAt', 'phoneNumber', 'contactName', 'status', 'durationSec', 'signalScore', 'intent', 'sentiment', 'nextBestAction'];
    const rows = [headers.join(',')];
    
    for (const call of calls) {
      const meta = (call.metadata || {}) as Record<string, any>;
      const analysis = meta.ai?.analysisV1;
      
      const row = [
        call.createdAt ? new Date(call.createdAt).toISOString() : '',
        escapeCSV(call.phoneNumber || ''),
        escapeCSV(call.contactName || ''),
        call.status || '',
        call.duration?.toString() || '',
        analysis?.signalScore?.toString() || '',
        analysis?.intent || '',
        analysis?.sentiment || '',
        escapeCSV(analysis?.nextBestAction || '')
      ];
      rows.push(row.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="calls-export-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(rows.join('\n'));
    
  } catch (error: any) {
    console.error('[PORTAL-CALLS] Export error:', error);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Failed to export calls' 
    });
  }
});

function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default router;
