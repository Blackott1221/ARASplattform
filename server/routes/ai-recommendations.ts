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

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Cache TTL in hours
const CACHE_TTL_HOURS = 24;

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
  const { callId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!callId) {
    return res.status(400).json({ message: 'callId required' });
  }

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

    // Check cache - return if fresh
    if (metadata.gemini?.generatedAt) {
      const generatedAt = new Date(metadata.gemini.generatedAt);
      const hoursSinceGenerated = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceGenerated < CACHE_TTL_HOURS) {
        return res.json({
          cached: true,
          recommendations: metadata.gemini,
        });
      }
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
    });

  } catch (error: any) {
    console.error('[AI] Recommendations error:', error);
    res.status(500).json({ 
      message: 'Failed to generate recommendations', 
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// BATCH RECOMMENDATIONS FOR DASHBOARD (top 5 calls)
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard-actions', async (req: Request, res: Response) => {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get recent calls with existing Gemini recommendations
    const recentCalls = await db.select().from(callLogs)
      .where(eq(callLogs.userId, userId))
      .orderBy(callLogs.createdAt)
      .limit(10);

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
    });

  } catch (error: any) {
    console.error('[AI] Dashboard actions error:', error);
    res.status(500).json({ 
      message: 'Failed to get dashboard actions', 
      error: error.message,
    });
  }
});

export default router;
