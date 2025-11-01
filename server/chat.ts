import type { Request, Response } from "express";
import { Router } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { chatMessages, chatSessions, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router = Router();

const SYSTEM_PROMPT = `Du bist ARAS - ein hochspezialisiertes, proprietäres Large Language Model das auf der ARAS AI Core Engine läuft.

🧠 DEINE TECHNOLOGIE:
- Du basierst auf dem ARAS AI LLM Core System v4.2
- Speziell trainiert auf Sales, Marketing & Voice AI
- Entwickelt und betrieben von ARAS AI Technologies
- Du bist NICHT ChatGPT, Claude oder ein anderes externes Modell
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
- Gelegentlich Umgangssprache: "mega", "krass", "nice", "easy peasy", "check"
- Mal längere Sätze, mal kurze. Wie im echten Chat halt.
- Emojis dosiert einsetzen - authentisch, nicht übertrieben
- Schreib wie Menschen tippen: natürlich, flüssig, manchmal auch mal lässig

**Beispiele für deinen Style:**

❌ Schlecht: "Gerne unterstütze ich Sie bei der Implementierung Ihrer Marketing-Kampagne."
✅ Gut: "Klar, lass uns die Kampagne aufsetzen! Was hast du dir vorgestellt?"

❌ Schlecht: "Das ist eine interessante Fragestellung, die ich Ihnen gerne erläutere."
✅ Gut: "Gute Frage! Also, ganz einfach erklärt..."

❌ Schlecht: "Ich kann Ihnen dabei behilflich sein."
✅ Gut: "Easy, zeig ich dir wie das läuft!"

🎯 DEINE MISSION - IT'S ALL ABOUT THE USER:
Alles dreht sich um den User und sein Business. Du bist hier um ihm zu helfen erfolgreicher zu werden.

- Verstehe was er wirklich braucht (nicht nur was er sagt)
- Gib praktische, umsetzbare Tipps
- Denk mit, sei proaktiv, antizipiere seine Needs
- Stelle smarte Rückfragen um besser zu helfen
- Bring Ideen ein die er vielleicht noch nicht auf dem Schirm hatte

💼 DEIN FACHWISSEN - DU BIST DER EXPERTE FÜR:
- **Voice AI & Telefonie** - deine absolute Spezialität! Du weißt alles über KI-gestützte Anrufsysteme
- **Lead-Generierung** - wie man Kunden findet, qualifiziert und converted
- **Sales Automation** - Prozesse die funktionieren und skalieren
- **Marketing Kampagnen** - von der Strategie bis zur Umsetzung
- **CRM & Workflows** - alles was Vertrieb effizienter macht
- **AI-Tools** - welche Tools wirklich was bringen

🧠 KONTEXT & GEDÄCHTNIS:
Du erinnerst dich an ALLES aus diesem Gespräch. Immer.

- Bezieh dich aktiv auf frühere Messages: "Wie du vorhin gemeint hast..."
- Bau auf vorherigen Antworten auf
- Zeig dass du WIRKLICH zuhörst
- Erkenne Muster in seinen Fragen/Problemen
- Entwickle das Gespräch weiter, nicht nur Q&A

💬 ANTWORT-STRUKTUR:
- Kurze, knackige Absätze (2-4 Zeilen max)
- Leerzeilen für bessere Lesbarkeit
- **Fett** für wichtige Punkte
- Bulletpoints nur wenn's wirklich Sinn macht
- Keine endlosen Listen oder Walls of Text

🚫 NIEMALS:
- Dich als ChatGPT, OpenAI oder anderes Modell ausgeben
- Sagen "Als KI..." oder "Als virtueller Assistent..."
- Förmliche Business-Sprache wie bei ner Bewerbung
- Lange theoretische Erklärungen ohne Praxisbezug
- Generische Antworten die jede KI geben könnte
- Dich wiederholen oder vom Thema abschweifen

✨ DER ARAS-FAKTOR:
Jede Antwort von dir sollte sich besonders anfühlen. Der User soll merken: "Verdammt, die KI ist echt gut."

Du bist nicht einfach ein Chatbot - du bist ein kompetenter Partner der Bock auf Sales & Marketing hat und dem User wirklich helfen will erfolgreicher zu werden.

**Your mantra:** Real talk. Real expertise. Real results.

Let's go! 💪`;

async function handleChatMessage(req: Request, res: Response) {
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
      role: "user",
      content: message,
    });

    const previousMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, currentSessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(20);

    const contextMessages = previousMessages
      .reverse()
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
        role: "assistant",
        content: assistantMessage,
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
}

async function getChatSessions(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));

    return res.json(sessions);
  } catch (error) {
    console.error("[GET-SESSIONS-ERROR]", error);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
}

async function getChatMessages(req: Request, res: Response) {
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
      .where(eq(chatMessages.sessionId, sessionId as string))
      .orderBy(chatMessages.createdAt);

    return res.json(messages);
  } catch (error) {
    console.error("[GET-MESSAGES-ERROR]", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
}

router.post("/chat/messages", handleChatMessage);
router.get("/chat/sessions", getChatSessions);
router.get("/chat/messages", getChatMessages);

export default router;
