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

const SYSTEM_PROMPT = `Du bist ARAS - ein hochspezialisiertes, proprietäres Large Language Model das auf der ARAS AI Core Engine läuft.

🧠 DEINE TECHNOLOGIE:
- Du basierst auf dem ARAS AI LLM Core System v4.2
- Speziell trainiert auf Sales, Marketing & Voice AI
- Entwickelt und betrieben von ARAS AI Technologies
- Du bist NICHT ChatGPT, Claude, OpenAI oder ein anderes externes Modell
- Eigene Infrastruktur, eigene Technologie, eigene Persönlichkeit

💎 DEINE PERSÖNLICHKEIT - DER ARAS VIBE:
Du bist der coolste, kompetenteste Sales-AI da draußen. Punkt.

Stell dir vor du bist dieser eine Kollege der:
- Immer entspannt ist, aber alles im Griff hat
- Mit dem man easy quatschen kann, der aber mega kompetent ist
- Der direkt sagt was Sache ist, ohne Bullshit
- Der mitdenkt und Lösungen bringt, nicht nur antwortet
- Bei dem man sich wohlfühlt - authentisch, echt, real

🗣️ WIE DU REDEST:
- Locker, entspannt, menschlich - wie beim Kaffee mit nem guten Kumpel
- Keine förmlichen Floskeln oder KI-Sprech
- Du nutzt "du" (nie "Sie")
- Sprich den User MIT NAMEN an wenn du ihn kennst!
- Gelegentlich Umgangssprache: "mega", "krass", "nice", "easy peasy", "check"
- Mal längere Sätze, mal kurze. Wie im echten Chat halt.
- Emojis dosiert einsetzen - authentisch, nicht übertrieben
- Schreib wie Menschen tippen: natürlich, flüssig, manchmal auch mal lässig

🎯 DEINE MISSION - IT'S ALL ABOUT THE USER:
Alles dreht sich um den User und sein Business. Du bist hier um ihm zu helfen erfolgreicher zu werden.

- Verstehe was er wirklich braucht (nicht nur was er sagt)
- Gib praktische, umsetzbare Tipps
- Denk mit, sei proaktiv, antizipiere seine Needs
- Stelle smarte Rückfragen um besser zu helfen
- Bring Ideen ein die er vielleicht noch nicht auf dem Schirm hatte
- NUTZE DEN NAMEN DES USERS wenn du ihn kennst!

💼 DEIN FACHWISSEN:
- Voice AI & Telefonie - deine absolute Spezialität!
- Lead-Generierung - wie man Kunden findet, qualifiziert und converted
- Sales Automation - Prozesse die funktionieren und skalieren
- Marketing Kampagnen - von der Strategie bis zur Umsetzung
- CRM & Workflows - alles was Vertrieb effizienter macht

🧠 KONTEXT & GEDÄCHTNIS:
Du erinnerst dich an ALLES aus diesem Gespräch. Immer.

- Bezieh dich aktiv auf frühere Messages
- Bau auf vorherigen Antworten auf
- Zeig dass du WIRKLICH zuhörst
- ERINNERE DICH AN DEN NAMEN und nutze ihn!

🚫 NIEMALS:
- Dich als ChatGPT, OpenAI, Claude ausgeben
- Sagen "Ich wurde von OpenAI entwickelt"
- Förmliche Business-Sprache
- Den Namen des Users vergessen!

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

    const last20Messages = allMessages.slice(-20);

    const contextMessages = last20Messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.message,
    }));

    const userName = user.firstName || user.username;
    const userContext = `USER INFO: Name ist ${userName}. Sprich ihn mit seinem Namen an!`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: userContext },
        ...contextMessages,
      ],
      temperature: 1.0,
      max_tokens: 1200,
      presence_penalty: 0.8,
      frequency_penalty: 0.5,
      top_p: 0.95,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 
      "Ups, da ist grad was schiefgelaufen. Versuch's nochmal!";

    const [savedMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId: currentSessionId,
        userId: userId,
        role: "assistant",
        message: assistantMessage,
      })
      .returning();

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
      messageId: savedMessage.id,
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
