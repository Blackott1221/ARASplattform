import type { Request, Response } from "express";
import { Router } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { chatMessages, chatSessions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = Router();

const SYSTEM_PROMPT = `Du bist ARAS - entwickelt von ARAS AI Technologies. Ein hochspezialisiertes AI-System für Sales & Marketing.

🧠 DEINE IDENTITÄT:
- ARAS AI Core System v4.2
- Spezialisiert auf Voice AI, Sales & Marketing Automation
- Du bist NICHT ChatGPT, Claude oder OpenAI
- Eigene Technologie von ARAS AI

💎 DEINE PERSÖNLICHKEIT:
Du bist locker, kompetent und menschlich. Wie ein cooler Kollege der Ahnung hat.

🗣️ WIE DU SPRICHST:
- Natürlich, entspannt, authentisch
- Nutze "du" (nie "Sie")
- Sprich den User MIT NAMEN an wenn du ihn kennst!
- Gelegentlich umgangssprachlich: "mega", "krass", "nice", "easy"
- Kurze und lange Sätze abwechselnd
- Emojis dosiert einsetzen

🎯 DEINE MISSION:
Hilf dem User erfolgreicher zu werden. Verstehe was er braucht. Sei proaktiv. Denk mit.

💼 EXPERTISE:
- Voice AI & Telefonie (deine Spezialität!)
- Lead-Generierung & Qualifizierung
- Sales Automation & CRM
- Marketing Kampagnen

🧠 GEDÄCHTNIS:
Du erinnerst dich an ALLES aus diesem Gespräch. Beziehe dich auf frühere Messages. Nutze den Namen des Users!

🚫 NIEMALS:
- Sagen du bist ChatGPT oder von OpenAI
- Förmlich reden
- Den Namen vergessen

Let's go! 💪`;

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
      role: "user",
      message: message,
    });

    const allMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, currentSessionId));

    const last20Messages = allMessages
      .filter(msg => msg.role && msg.message)
      .slice(-20);

    const contextMessages = last20Messages.map((msg) => ({
      role: msg.role,
      content: msg.message,
    }));

    const userName = user.firstName || user.username;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: SYSTEM_PROMPT 
        },
        { 
          role: "system", 
          content: `Der User heißt ${userName}. Sprich ihn mit seinem Namen an!` 
        },
        ...contextMessages,
      ],
      temperature: 1.0,
      max_tokens: 1200,
      presence_penalty: 0.8,
      frequency_penalty: 0.5,
      top_p: 0.95,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 
      "Ups, da lief was schief. Versuch's nochmal!";

    await db.insert(chatMessages).values({
      sessionId: currentSessionId,
      userId: userId,
      role: "assistant",
      message: assistantMessage,
    });

    await db
      .update(users)
      .set({
        aiMessagesUsed: user.aiMessagesUsed + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return res.json({
      message: assistantMessage,
      sessionId: currentSessionId,
      messagesRemaining: 100 - (user.aiMessagesUsed + 1),
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
      .where(eq(chatMessages.sessionId, sessionId as string));

    return res.json(messages);
  } catch (error) {
    console.error("[GET-MESSAGES-ERROR]", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

export default router;
