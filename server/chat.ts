import type { Request, Response } from "express";
import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { chatMessages, chatSessions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    googleSearchRetrieval: {}  // 🔥 LIVE DATA GROUNDING
  }],
});

console.log('[GEMINI] 🔥 Using gemini-3.0-flash with Google Search Grounding for LIVE DATA');

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

export default router;
