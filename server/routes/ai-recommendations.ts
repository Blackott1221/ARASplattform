/**
 * ARAS AI Recommendations API
 * Gemini-powered call analysis and action recommendations
 * Caches results in callLogs.metadata.gemini
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { callLogs, contacts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Gemini (may be disabled if no API key)
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_API_KEY || '';
const genAI = GOOGLE_AI_KEY ? new GoogleGenerativeAI(GOOGLE_AI_KEY) : null;
const GEMINI_ENABLED = Boolean(genAI && GOOGLE_AI_KEY.length > 10);

// Cache TTL in hours
const CACHE_TTL_HOURS = 24;

// Check if Gemini is available
function checkGeminiAvailable(res: Response): boolean {
  if (!GEMINI_ENABLED) {
    res.status(503).json({ 
      error: 'GEMINI_DISABLED', 
      message: 'Gemini AI ist für diese Umgebung nicht konfiguriert',
      enabled: false,
    });
    return false;
  }
  return true;
}

interface GeminiRecommendations {
  actions: string[];
  priority: number;
  suggestedMessage: string;
  riskFlags: string[];
  reasoning: string;
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE RECOMMENDATIONS FOR A CALL
// ═══════════════════════════════════════════════════════════════

router.post('/recommendations', async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  const { callId, forceRefresh } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  if (!callId) {
    return res.status(400).json({ error: 'MISSING_CALL_ID', message: 'callId required' });
  }
  
  // Check Gemini availability (but still allow cached results)
  const geminiAvailable = GEMINI_ENABLED;

  try {
    // Fetch call from DB
    const [call] = await db.select().from(callLogs)
      .where(eq(callLogs.id, parseInt(callId, 10)))
      .limit(1);

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    if (call.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Parse existing metadata
    let metadata: Record<string, any> = {};
    if (call.metadata) {
      if (typeof call.metadata === 'string') {
        try { metadata = JSON.parse(call.metadata); } catch {}
      } else if (typeof call.metadata === 'object') {
        metadata = call.metadata as Record<string, any>;
      }
    }

    // Check cache - return if fresh (unless forceRefresh)
    if (metadata.gemini?.generatedAt && !forceRefresh) {
      const generatedAt = new Date(metadata.gemini.generatedAt);
      const hoursSinceGenerated = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceGenerated < CACHE_TTL_HOURS) {
        return res.json({
          cached: true,
          cacheAge: Math.round(hoursSinceGenerated * 10) / 10,
          recommendations: metadata.gemini,
          geminiEnabled: geminiAvailable,
        });
      }
    }
    
    // If Gemini is disabled and no cache, return error
    if (!geminiAvailable) {
      return res.status(503).json({ 
        error: 'GEMINI_DISABLED', 
        message: 'Gemini AI ist nicht verfügbar und keine gecachten Empfehlungen vorhanden',
        cached: false,
        geminiEnabled: false,
      });
    }

    // Prepare context for Gemini
    const transcript = call.transcript || '';
    const summary = metadata.summary || metadata.ai_summary || '';
    const contactName = call.contactName || 'Unbekannt';
    const status = call.status || 'unknown';
    const duration = call.duration || 0;

    // Fetch contact info if available
    let contactInfo = '';
    if (call.leadId) {
      try {
        const [contact] = await db.select().from(contacts)
          .where(eq(contacts.id, String(call.leadId)))
          .limit(1);
        if (contact) {
          contactInfo = `Firma: ${contact.company || 'N/A'}, Position: ${(contact as any).position || 'N/A'}`;
        }
      } catch {}
    }

    // Build Gemini prompt
    const prompt = `Du bist ein Sales-Intelligence-Assistent für ARAS AI, eine B2B-Vertriebsplattform.

Analysiere diesen Anruf und generiere konkrete Handlungsempfehlungen:

ANRUF-DATEN:
- Kontakt: ${contactName}
- Status: ${status}
- Dauer: ${Math.round(duration / 60)} Minuten
${contactInfo ? `- Kontaktinfo: ${contactInfo}` : ''}

${summary ? `ZUSAMMENFASSUNG:\n${summary}\n` : ''}

${transcript ? `TRANSKRIPT (Auszug):\n${transcript.substring(0, 2000)}\n` : ''}

Generiere eine JSON-Antwort mit:
1. "actions": Array von 3-5 konkreten nächsten Schritten (z.B. "Follow-up E-Mail senden", "Termin für Demo vereinbaren")
2. "priority": Prioritätsscore 0-100 (wie wichtig ist schnelles Handeln?)
3. "suggestedMessage": Ein kurzer Vorschlag für die nächste Nachricht/E-Mail an den Kontakt
4. "riskFlags": Array von erkannten Risiken/Einwänden (z.B. "Preisbedenken", "Konkurrenzdruck", "Zeitdruck")
5. "reasoning": Kurze Begründung deiner Empfehlungen (1-2 Sätze)

Antworte NUR mit validem JSON, keine Erklärungen.`;

    // Call Gemini
    const model = genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse Gemini response
    let recommendations: GeminiRecommendations;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      
      recommendations = {
        actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 7) : [],
        priority: typeof parsed.priority === 'number' ? Math.min(100, Math.max(0, parsed.priority)) : 50,
        suggestedMessage: typeof parsed.suggestedMessage === 'string' ? parsed.suggestedMessage : '',
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
        generatedAt: new Date().toISOString(),
      };
    } catch (parseError) {
      console.error('[AI] Failed to parse Gemini response:', parseError);
      
      // Fallback recommendations
      recommendations = {
        actions: ['Follow-up planen', 'Notizen vervollständigen', 'Nächsten Kontakt terminieren'],
        priority: 50,
        suggestedMessage: `Hallo ${contactName}, vielen Dank für unser Gespräch. Ich melde mich wie besprochen.`,
        riskFlags: [],
        reasoning: 'Automatische Empfehlungen basierend auf Anrufstatus.',
        generatedAt: new Date().toISOString(),
      };
    }

    // Cache in metadata
    metadata.gemini = recommendations;
    
    await db.update(callLogs)
      .set({ 
        metadata: metadata,
        updatedAt: new Date(),
      })
      .where(eq(callLogs.id, call.id));

    res.json({
      cached: false,
      recommendations,
      geminiEnabled: true,
    });

  } catch (error: any) {
    console.error('[AI] Recommendations error:', error);
    
    // Check if it's a Gemini API error
    const isGeminiError = error.message?.includes('API') || error.message?.includes('quota') || error.message?.includes('key');
    
    res.status(isGeminiError ? 503 : 500).json({ 
      error: isGeminiError ? 'GEMINI_API_ERROR' : 'GENERATION_FAILED',
      message: 'Empfehlungen konnten nicht generiert werden', 
      detail: error.message,
      geminiEnabled: GEMINI_ENABLED,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// BATCH RECOMMENDATIONS FOR DASHBOARD (top 5 calls)
// ═══════════════════════════════════════════════════════════════

// Status endpoint - check if Gemini is available
router.get('/status', async (_req: Request, res: Response) => {
  res.json({
    geminiEnabled: GEMINI_ENABLED,
    cacheTtlHours: CACHE_TTL_HOURS,
  });
});

router.get('/dashboard-actions', async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  const range = req.query.range as string || '7d';

  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  try {
    // Calculate date range
    const now = new Date();
    let rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === 'today') rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (range === '30d') rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get recent calls with existing Gemini recommendations
    const recentCalls = await db.select().from(callLogs)
      .where(eq(callLogs.userId, userId))
      .orderBy(callLogs.createdAt)
      .limit(20);

    const topActions: Array<{
      callId: number;
      contactName: string;
      action: string;
      priority: number;
      reasoning: string;
    }> = [];

    for (const call of recentCalls) {
      let metadata: Record<string, any> = {};
      if (call.metadata) {
        if (typeof call.metadata === 'string') {
          try { metadata = JSON.parse(call.metadata); } catch {}
        } else if (typeof call.metadata === 'object') {
          metadata = call.metadata as Record<string, any>;
        }
      }

      if (metadata.gemini?.actions?.length > 0) {
        topActions.push({
          callId: call.id,
          contactName: call.contactName || call.phoneNumber || 'Unbekannt',
          action: metadata.gemini.actions[0],
          priority: metadata.gemini.priority || 50,
          reasoning: metadata.gemini.reasoning || '',
        });
      }
    }

    // Sort by priority descending
    topActions.sort((a, b) => b.priority - a.priority);

    res.json({
      actions: topActions.slice(0, 5),
      totalCalls: recentCalls.length,
      callsWithGemini: topActions.length,
      geminiEnabled: GEMINI_ENABLED,
      range,
    });

  } catch (error: any) {
    console.error('[AI] Dashboard actions error:', error);
    res.status(500).json({ 
      error: 'FETCH_ERROR',
      message: 'Dashboard-Aktionen konnten nicht geladen werden', 
      detail: error.message,
      geminiEnabled: GEMINI_ENABLED,
    });
  }
});

export default router;
