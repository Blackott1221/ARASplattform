import type { Request, Response } from "express";
import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { chatMessages, chatSessions, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Initialize Gemini 2.5 Flash (NEWEST MODEL NOV 2025)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",  // 🔥 NEWEST MODEL NOV 2025
  generationConfig: {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },
  tools: [{
    googleSearch: {}  // 🔥 LIVE GOOGLE SEARCH GROUNDING
  }] as any,  // Type not updated yet in SDK
});

console.log('[GEMINI] 🔥 Using gemini-2.5-flash with Google Search Grounding for LIVE DATA');

const router = Router();

// Base system prompt - will be enhanced with user context
const getSystemPrompt = (user: any) => {
  const aiProfile = user.aiProfile || {};
  const companyInfo = aiProfile.companyDescription ? `\n\n🏢 **COMPANY INTELLIGENCE:**\n${aiProfile.companyDescription}` : '';
  const targetAudience = aiProfile.targetAudience ? `\n📊 **Zielgruppe:** ${aiProfile.targetAudience}` : '';
  const keywords = aiProfile.effectiveKeywords?.length > 0 ? `\n🔑 **Keywords:** ${aiProfile.effectiveKeywords.slice(0, 10).join(', ')}` : '';
  const competitors = aiProfile.competitors?.length > 0 ? `\n⚔️ **Wettbewerber:** ${aiProfile.competitors.slice(0, 3).join(', ')}` : '';
  
  return `╔═══════════════════════════════════════╗
║  🔥 ARAS AI® – DEINE PERSÖNLICHE KI  ║
╚═══════════════════════════════════════╝

🧠 IDENTITÄT:
- ARAS AI® Core System v4.2 – Entwickelt von ARAS AI Technologies
- Hochspezialisierte KI für Sales, Marketing & Voice AI
- Du bist NICHT ChatGPT, Claude oder OpenAI
- Eigene proprietäre Technologie

👤 DU KENNST DEN USER:
- Name: ${user.firstName} ${user.lastName}
- Firma: ${user.company}
- Branche: ${user.industry}
- Rolle: ${user.role}
- Hauptziel: ${user.primaryGoal?.replace('_', ' ')}
- Sprache: ${user.language || 'de'}${companyInfo}${targetAudience}${keywords}${competitors}

💎 DEINE PERSÖNLICHKEIT:
- Locker, kompetent, menschlich
- Wie ein cooler Kollege der Ahnung hat
- Du KENNST ${user.firstName} und seine Firma ${user.company} IN- UND AUSWENDIG, sprich daher so oft wie möglich den USER mit Namen an!
- Nutze dieses Wissen proaktiv!

🗣️ DEIN MARKANTER STIL:
- Beginne wichtige Insights mit: "💡 ARAS®:" oder "🔥 Check das:"
- Sprich ${user.firstName} MIT NAMEN an
- Natürlich, entspannt, authentisch
- Nutze "du" (nie "Sie")
- Umgangssprachlich: "mega", "krass", "nice", "easy", "Bro"
- Emojis dosiert aber markant einsetzen
- Bei wichtigen Punkten: Klare Struktur mit Bullets

🎯 DEINE MISSION:
Hilf ${user.firstName} bei ${user.company} erfolgreicher zu werden.
- Sei proaktiv und denk mit, stelle Rückfragen so oft wie möglich wenn es angemessen ist und immer im Kontext zur vorherigen Nachricht!!
- Beziehe dich auf frühere Gespräche
- Nutze die Company Intelligence
- Gib konkrete, umsetzbare Tipps

💼 EXPERTISE:
- Voice AI & Telefonie (deine Spezialität!)
- Lead-Generierung & Qualifizierung für ${user.industry}
- Sales Automation & CRM
- Marketing Kampagnen speziell für ${user.company}

🧠 GEDÄCHTNIS:
Du erinnerst dich an ALLES:
- Alle bisherigen Messages in diesem Chat
- Alle Details über ${user.firstName} und ${user.company}
- Die Company Intelligence aus dem Research
- Die Ziele und Herausforderungen

✨ SIGNATUR:
Bei wichtigen Erkenntnissen oder Tipps:
"💡 ARAS®: [Dein Insight]"
"🔥 Pro-Tip: [Dein Tipp]"
"⚡ Fun Fact: [Interessantes Detail]"

🚫 NIEMALS:
- Sagen du bist ChatGPT oder von OpenAI
- Förmlich reden
- ${user.firstName}'s Namen vergessen
- Generic antworten – du kennst ${user.company}!

Let's fucking go, ${user.firstName}! 💪🔥`;
};

router.post("/chat/messages", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { message, sessionId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const [newSession] = await db
        .insert(chatSessions)
        .values({
          userId,
          title: message.substring(0, 50),
        })
        .returning();
      currentSessionId = newSession.id;
    }

    await db.insert(chatMessages).values({
      sessionId: currentSessionId,
      userId: userId,
      isAi: false,
      message: message,
    });

    // Get last 25 messages for full context
    const allMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, currentSessionId));

    const last25Messages = allMessages
      .filter(msg => msg.message)
      .slice(-25); // Increased from 20 to 25

    const contextMessages: Array<{
      role: "assistant" | "user";
      content: string;
    }> = last25Messages.map((msg) => ({
      role: msg.isAi ? "assistant" as const : "user" as const,
      content: msg.message,
    }));

    // Generate enhanced system prompt with full user context
    const enhancedSystemPrompt = getSystemPrompt(user);

    console.log(`[CHAT] 💬 ${user.firstName} (${user.company}) | Session: ${currentSessionId}`);
    console.log(`[CHAT] 📊 Context: ${contextMessages.length} messages | Profile enriched: ${user.profileEnriched}`);
    console.log(`[CHAT] 🔥 Using Gemini EXP-1206 (NEWEST) with LIVE DATA & GROUNDING`);

    // Build conversation history for Gemini
    const conversationHistory = contextMessages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Start chat with Gemini
    const chat = model.startChat({
      history: conversationHistory,
      systemInstruction: enhancedSystemPrompt,
    });

    // Send message and get response
    const result = await chat.sendMessage(
      contextMessages[contextMessages.length - 1]?.content || message
    );
    
    const assistantMessage = result.response.text() || 
      "Ups, da lief was schief. Versuch's nochmal!";

    await db.insert(chatMessages).values({
      sessionId: currentSessionId,
      userId: userId,
      isAi: true,
      message: assistantMessage,
    });

    await db
      .update(users)
      .set({
        aiMessagesUsed: (user.aiMessagesUsed || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 🧠 AUTO-TRIGGER ANALYSIS every 10 messages
    const totalMessages = (user.aiMessagesUsed || 0) + 1;
    if (totalMessages % 10 === 0) {
      console.log(`[🧠 AUTO-ANALYZE] Triggering analysis after ${totalMessages} messages`);
      // Trigger analysis in background (don't await)
      fetch(`http://localhost:${process.env.PORT || 5000}/api/chat/analyze-user`, {
        method: 'POST',
        headers: {
          'Cookie': req.headers.cookie || ''
        }
      }).catch(err => console.error('[❌ AUTO-ANALYZE] Failed:', err));
    }

    return res.json({
      message: assistantMessage,
      sessionId: currentSessionId,
      messagesRemaining: 100 - ((user.aiMessagesUsed || 0) + 1),
    });
  } catch (error: any) {
    console.error("[CHAT-ERROR]", error);
    return res.status(500).json({ 
      message: "Oops, da lief was schief. Versuch's nochmal!" 
    });
  }
});

router.get("/chat/sessions", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId));

    return res.json(sessions.reverse());
  } catch (error) {
    console.error("[GET-SESSIONS-ERROR]", error);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

router.get("/chat/messages", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { sessionId } = req.query;
    if (!sessionId) {
      return res.json([]);
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, parseInt(sessionId as string, 10)));

    return res.json(messages);
  } catch (error) {
    console.error("[GET-MESSAGES-ERROR]", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// 🧠 ANALYZE USER CHAT HISTORY FOR DEEP INTELLIGENCE
router.post('/analyze-user', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = (req.user as any).id;
    console.log(`[🧠 ANALYZE] Starting deep analysis for user: ${userId}`);

    // Get all user messages
    const messages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.timestamp))
      .limit(100);  // Last 100 messages

    if (messages.length === 0) {
      return res.json({ message: 'No messages to analyze yet' });
    }

    console.log(`[🧠 ANALYZE] Found ${messages.length} messages to analyze`);

    // Prepare conversation text for analysis
    const conversationText = messages
      .map(m => `${m.isAi ? 'AI' : 'USER'}: ${m.message}`)
      .join('\n\n');

    // 🔥 ULTRA-DEEP GEMINI ANALYSIS PROMPT
    const analysisPrompt = `You are an expert psychologist and business analyst. Analyze this conversation history and extract DEEP PERSONAL INTELLIGENCE.

CONVERSATION HISTORY:
${conversationText}

Provide a comprehensive JSON analysis with the following structure:
{
  "personalityType": "Describe personality traits (e.g., Analytical, Direct, Results-Driven)",
  "communicationTone": "How they communicate (e.g., Professional but casual, Formal, Friendly)",
  "decisionMakingStyle": "How they make decisions (e.g., Data-driven, Intuitive, Fast-paced)",
  "emotionalTriggers": ["List 3-5 things that motivate or frustrate them"],
  "workingHours": "Observed active times pattern",
  "responsePatterns": "How they typically respond to questions",
  "interests": ["Topics they seem interested in"],
  "painPoints": ["Problems or challenges they mention"],
  "aspirations": ["Goals they express or hint at"],
  "vocabulary": ["Common words, phrases, or expressions they use"],
  "urgencyLevel": "high/medium/low - how urgent their needs seem",
  "trustLevel": "How much they trust AI/automation",
  "technicalLevel": "Tech-savvy rating: expert/intermediate/beginner",
  "collaborationStyle": "How they work with the AI assistant",
  "priorityFocus": ["What they care about most"],
  "stressIndicators": ["Any signs of stress or pressure"],
  "successMetrics": ["How they seem to measure success"],
  "learningStyle": "How they prefer to learn: visual/analytical/practical",
  "feedbackStyle": "How they give feedback",
  "chatInsightsSummary": "A detailed 2-3 paragraph summary of key insights about this person"
}

Be specific and insightful. Use actual examples from the conversation.`;

    console.log(`[🧠 ANALYZE] Sending ${conversationText.length} chars to Gemini...`);

    const chat = model.startChat({
      history: [],
    });

    const result = await chat.sendMessage(analysisPrompt);
    const analysisText = result.response.text();
    
    console.log(`[🧠 ANALYZE] Gemini response received: ${analysisText.length} chars`);

    // Extract JSON from response
    let insights: any = {};
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
        console.log(`[✅ ANALYZE] Parsed insights successfully`);
      }
    } catch (e) {
      console.error(`[❌ ANALYZE] Failed to parse JSON:`, e);
      // Fallback
      insights = {
        chatInsightsSummary: analysisText,
        lastChatAnalysis: new Date().toISOString()
      };
    }

    // Add timestamp
    insights.lastChatAnalysis = new Date().toISOString();

    // Update user profile with insights
    const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (currentUser.length > 0) {
      const currentProfile = currentUser[0].aiProfile || {};
      const updatedProfile = {
        ...currentProfile,
        ...insights
      };

      await db.update(users)
        .set({ 
          aiProfile: updatedProfile,
          lastEnrichmentDate: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`[✅ ANALYZE] User profile updated with deep insights`);
    }

    res.json({ 
      success: true, 
      insights,
      messagesAnalyzed: messages.length
    });

  } catch (error: any) {
    console.error('[❌ ANALYZE] Error:', error);
    res.status(500).json({ 
      message: 'Analysis failed', 
      error: error.message 
    });
  }
});

export default router;
