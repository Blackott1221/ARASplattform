import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from '../logger';

// Interface für die Rohdaten vom Formular
export interface CallInput {
  contactName: string;    // "Justin Schwarzott"
  phoneNumber: string;    // "+49..."
  message: string;        // "Verschiebe mein Abendessen..."
}

// Interface für die Daten aus unserer Datenbank
export interface UserContext {
  userName: string;       // "Manuel" (Dein Nutzer)
}

// Das Ergebnis, das wir an ElevenLabs senden
export interface EnhancedCallContext {
  contactName: string;
  phoneNumber: string;
  userName: string;
  purpose: string; // z.B. "Terminverschiebung (Restaurant)"
  detailsForAI: string; // Der super-menschliche Prompt
}

export async function enhanceCallWithGemini(
  input: CallInput, 
  context: UserContext
): Promise<EnhancedCallContext> {
  
  try {
    logger.info('[ARAS-BRAIN] Gemini-Gehirn (Flash) wird aktiviert...');
    // Prüfe, ob der Key geladen ist
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY fehlt in Render!');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const rawPrompt = `
    Du bist ein intelligenter "Call-Vorbereiter" für ARAS AI, die menschlichste KI-Assistenz der Welt.
    Deine Aufgabe ist es, einen einfachen Nutzer-Befehl in einen perfekten, menschlichen Anruf-Kontext für die ElevenLabs-Anruf-KI umzuwandeln.

    OBERSTE REGELN:
    1.  **MENSCHLICH:** Der generierte Prompt MUSS die Anruf-KI anweisen, extrem menschlich zu klingen (Pausen, "ähm", "also", "genau").
    2.  **KLAR:** Identifiziere den *Zweck* (Intent) des Anrufs.
    3.  **KONTEXT:** Baue ALLE Informationen (Nutzername, Kontaktname) natürlich ein.

    ---
    INPUT-DATEN:
    1.  **DEIN NUTZER (ruft an):** ${context.userName}
    2.  **KONTAKT (wird angerufen):** ${input.contactName}
    3.  **NUTZER-BEFEHL (was zu tun ist):** "${input.message}"
    ---

    DEINE AUFGABE:
    Gib ein JSON-Objekt zurück, das *nur* die folgenden zwei Felder enthält:
    1.  "purpose": Eine kurze Zusammenfassung des Anliegens (z.B. "Terminverschiebung Restaurant", "Bestätigung Arzttermin", "Allgemeine Anfrage Business").
    2.  "detailsForAI": Ein detaillierter System-Prompt für die ElevenLabs KI, der *exakt* beschreibt, was sie tun soll. Dieser Prompt MUSS den 'context.userName' und 'input.contactName' natürlich einbauen.

    BEISPIEL:
    INPUT-BEFEHL: "Verschiebe mein Abendessen auf morgen 06.00 Uhr"
    JSON-AUSGABE:
    {
      "purpose": "Terminverschiebung (Restaurant)",
      "detailsForAI": "Du rufst ${input.contactName} an. Dein Nutzer, ${context.userName}, hat dich gebeten, seine Reservierung zu verschieben. Sag, dass ${context.userName} leider verhindert ist und frage höflich, ob es möglich ist, den Tisch auf 'morgen um 6 Uhr früh' zu verlegen. Sei extrem freundlich und natürlich, benutze Pausen und Füllwörter wie 'ähm' und 'genau'. Starte mit: 'Guten Tag, hier spricht ARAS, der persönliche Assistent von ${context.userName}... ich rufe wegen der Reservierung für heute Abend an...'"
    }
    
    WICHTIG: Antworte IMMER NUR mit dem rohen JSON-Objekt, ohne Markdown (\`\`\`json) oder sonstiges.
    `;

    const result = await model.generateContent(rawPrompt);
    const response = await result.response;
    const text = response.text();

    logger.info('[ARAS-BRAIN] Gemini hat den perfekten Prompt generiert.');
    
    // Parse den JSON-Text von Gemini
    const parsedJson = JSON.parse(text);

    return {
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      userName: context.userName,
      purpose: parsedJson.purpose,
      detailsForAI: parsedJson.detailsForAI
    };

  } catch (error: any) {
    logger.error('[ARAS-BRAIN] Gemini-Fehler!', { error: error.message });
    // Fallback: Wenn Gemini fehlschlägt, machen wir einen "dummen" Anruf
    return {
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      userName: context.userName,
      purpose: "Allgemeine Anfrage",
      detailsForAI: `Du rufst ${input.contactName} im Namen von ${context.userName} an. Dein Auftrag ist: ${input.message}. Bitte sei menschlich.`
    };
  }
}
