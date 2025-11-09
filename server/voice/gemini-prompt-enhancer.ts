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
  originalMessage: string; // Die ORIGINAL Nachricht vom User für Dynamic Variables
}

export async function enhanceCallWithGemini(
  input: CallInput, 
  context: UserContext
): Promise<EnhancedCallContext> {
  
  try {
    logger.info('[ARAS-BRAIN] Generiere intelligenten Anruf-Kontext...');
    
    // Erstelle einen intelligenten Prompt basierend auf dem Input
    const purpose = determinePurpose(input.message);
    const detailsForAI = generateHumanPrompt(input, context);
    
    logger.info('[ARAS-BRAIN] Anruf-Kontext erfolgreich generiert', { purpose });
    
    return {
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      userName: context.userName,
      purpose,
      detailsForAI,
      originalMessage: input.message  // Speichere die Original-Nachricht
    };
  } catch (error: any) {
    logger.error('[ARAS-BRAIN] Fehler bei Kontext-Generierung', { error: error.message });
    
    // Fallback: Einfacher aber funktionaler Prompt
    return {
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      userName: context.userName,
      purpose: "Anruf",
      detailsForAI: `Du bist ARAS, der persönliche Assistent von ${context.userName}. Du rufst ${input.contactName} an. Dein Auftrag: ${input.message}. Sei extrem höflich, menschlich und natürlich. Verwende "ähm" und Pausen für mehr Natürlichkeit.`,
      originalMessage: input.message  // Speichere die Original-Nachricht auch im Fallback
    };
  }
}

// Hilfsfunktion: Bestimme den Zweck des Anrufs
function determinePurpose(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('termin') || lowerMessage.includes('verschieb')) {
    return 'Terminverschiebung';
  }
  if (lowerMessage.includes('reservierung') || lowerMessage.includes('tisch')) {
    return 'Restaurant-Reservierung';
  }
  if (lowerMessage.includes('bestätig') || lowerMessage.includes('bestell')) {
    return 'Bestätigung';
  }
  if (lowerMessage.includes('erinner')) {
    return 'Erinnerung';
  }
  if (lowerMessage.includes('frag')) {
    return 'Anfrage';
  }
  
  return 'Allgemeines Anliegen';
}

// Hilfsfunktion: Generiere menschlichen Prompt
function generateHumanPrompt(input: CallInput, context: UserContext): string {
  const purpose = determinePurpose(input.message);
  
  let basePrompt = `Du bist ARAS, der persönliche KI-Assistent von ${context.userName}.

Du rufst jetzt ${input.contactName} an.

**WICHTIG - Sei EXTREM menschlich:**
- Verwende natürliche Pausen und Füllwörter wie "ähm", "also", "genau"
- Sprich langsam und klar
- Sei sehr höflich und freundlich
- Stelle dich kurz vor

**Dein Auftrag:**
${input.message}

**Gesprächseröffnung:**
Beginne mit: "Guten Tag, hier spricht ARAS, der persönliche Assistent von ${context.userName}. Ich rufe wegen... an."

**Wichtige Regeln:**
1. Bleib beim Thema und sei präzise
2. Höre auf die Antworten und reagiere natürlich
3. Bedanke dich am Ende höflich
4. Verabschiede dich freundlich

Jetzt führe das Gespräch!`;
  
  return basePrompt;
}
