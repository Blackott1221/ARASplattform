import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from '../logger';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

interface ValidationInput {
  userInput: string;
  contactName: string;
  previousAnswers?: Record<string, string>;
  userContext: {
    userName: string;
    company?: string;
    website?: string;
    industry?: string;
    role?: string;
    language?: string;
    aiProfile?: {
      companyDescription?: string;
      products?: string[];
      services?: string[];
      targetAudience?: string;
      brandVoice?: string;
      valueProp?: string;
      uniqueSellingPoints?: string[];
      personalityType?: string;
      communicationTone?: string;
      decisionMakingStyle?: string;
      communicationStyle?: string;
      salesTriggers?: string[];
      painPoints?: string[];
      interests?: string[];
      vocabulary?: string[];
      preferredStyle?: string;
      chatInsightsSummary?: string;
    };
  };
}

interface ValidationResult {
  isComplete: boolean;
  missingInfo?: string[];
  questions?: Array<{
    id: string;
    question: string;
    type: 'text' | 'date' | 'time' | 'choice';
    options?: string[];
    required: boolean;
    placeholder?: string;
  }>;
  enhancedPrompt?: string;
  detectedIntent?: string;
  suggestedSettings?: {
    tone: string;
    urgency: string;
    maxDuration: number;
  };
}

export async function validateAndEnhancePrompt(input: ValidationInput): Promise<ValidationResult> {
  try {
    // 🔑 API Key Check
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      logger.error('[PROMPT-VALIDATOR] ❌ GOOGLE_GEMINI_API_KEY fehlt!');
      throw new Error('Gemini API Key nicht konfiguriert');
    }

    logger.info('[PROMPT-VALIDATOR] 🔍 Analysiere User-Input mit voller Personalisierung...', { 
      input: input.userInput.substring(0, 100),
      hasAiProfile: !!input.userContext.aiProfile,
      company: input.userContext.company,
      contactName: input.contactName
    });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    });

    const aiProfile = input.userContext.aiProfile || {};
    
    let userContextString = `**ANRUFER-PROFIL (${input.userContext.userName}):**
- Name: ${input.userContext.userName}
- Firma: ${input.userContext.company || 'Nicht angegeben'}
- Website: ${input.userContext.website || 'Nicht angegeben'}
- Branche: ${input.userContext.industry || 'Nicht angegeben'}
- Position: ${input.userContext.role || 'Nicht angegeben'}
- Sprache: ${input.userContext.language || 'de'}`;

    if (aiProfile.companyDescription) {
      userContextString += `\n\n**FIRMEN-INTELLIGENZ:**
- Beschreibung: ${aiProfile.companyDescription}`;
    }
    
    if (aiProfile.products && aiProfile.products.length > 0) {
      userContextString += `\n- Produkte/Services: ${aiProfile.products.join(', ')}`;
    }
    
    if (aiProfile.targetAudience) {
      userContextString += `\n- Zielgruppe: ${aiProfile.targetAudience}`;
    }
    
    if (aiProfile.valueProp) {
      userContextString += `\n- Value Proposition: ${aiProfile.valueProp}`;
    }
    
    if (aiProfile.uniqueSellingPoints && aiProfile.uniqueSellingPoints.length > 0) {
      userContextString += `\n- USPs: ${aiProfile.uniqueSellingPoints.join(', ')}`;
    }

    if (aiProfile.personalityType || aiProfile.communicationTone || aiProfile.decisionMakingStyle) {
      userContextString += `\n\n**PSYCHOLOGISCHES PROFIL:**`;
      
      if (aiProfile.personalityType) {
        userContextString += `\n- Persönlichkeit: ${aiProfile.personalityType}`;
      }
      if (aiProfile.communicationTone) {
        userContextString += `\n- Kommunikationsstil: ${aiProfile.communicationTone}`;
      }
      if (aiProfile.decisionMakingStyle) {
        userContextString += `\n- Entscheidungsstil: ${aiProfile.decisionMakingStyle}`;
      }
      if (aiProfile.preferredStyle) {
        userContextString += `\n- Bevorzugter Stil: ${aiProfile.preferredStyle}`;
      }
    }

    if (aiProfile.salesTriggers && aiProfile.salesTriggers.length > 0) {
      userContextString += `\n\n**VERKAUFS-INTELLIGENZ:**
- Sales Triggers: ${aiProfile.salesTriggers.join(', ')}`;
    }
    
    if (aiProfile.painPoints && aiProfile.painPoints.length > 0) {
      userContextString += `\n- Pain Points: ${aiProfile.painPoints.join(', ')}`;
    }
    
    if (aiProfile.interests && aiProfile.interests.length > 0) {
      userContextString += `\n- Interessen: ${aiProfile.interests.join(', ')}`;
    }

    if (aiProfile.chatInsightsSummary) {
      userContextString += `\n\n**KI-LERNERGEBNISSE:**
${aiProfile.chatInsightsSummary}`;
    }

    let answersContext = '';
    if (input.previousAnswers && Object.keys(input.previousAnswers).length > 0) {
      answersContext = '\n\n**BEREITS GESAMMELTE INFORMATIONEN:**\n';
      for (const [key, value] of Object.entries(input.previousAnswers)) {
        answersContext += `- ${key}: ${value}\n`;
      }
    }

    const validationPrompt = `Analysiere diese Anruf-Anfrage für maximale Qualität:

ANRUFER-PROFIL:
${userContextString}

KONTAKT: ${input.contactName}
ANFRAGE: "${input.userInput}"
${answersContext}

ANALYSE-KRITERIEN:
1. Ist das ZIEL klar? (z.B. Termin verschieben, Reservierung, Anfrage)
2. Sind ALLE Details vorhanden? (Datum, Zeit, Grund, Alternativen)
3. Ist es für ${input.contactName} verständlich?
4. Kann die KI dies SOFORT professionell ausführen?

⚠️ KRITISCHE REGEL: Frage NIEMALS "Wann soll angerufen werden?" - Der Anruf wird SOFORT ausgeführt!

VALIDIERUNGS-REGELN nach ANRUF-TYP:
- TERMINANFRAGE: Datum, Uhrzeit, Grund, 2+ Alternativen PFLICHT
- VERSCHIEBUNG: Alter Termin, Neuer Termin, Grund, Alternativen PFLICHT
- RESERVIERUNG: Datum, Uhrzeit, Anzahl Personen, Besonderheiten
- ALLGEMEINE ANFRAGE: Klares Anliegen, erwartetes Ergebnis
- FOLLOW-UP: Bezug zu vorherigem Kontakt, neues Anliegen
- STORNIERUNG: Was genau? Grund? Alternativen?
- RÜCKRUF-BITTE: Wann? Zu welchem Thema? Dringlichkeit?

ANTWORT-SCHEMA:
{
  "isComplete": boolean,
  "detectedIntent": "Präzise Beschreibung (z.B. 'Terminverschiebung für Geschäftsmeeting')",
  "missingInfo": ["Konkrete fehlende Info 1", "Fehlende Info 2"],
  "questions": [
    {
      "id": "spezifische_id",
      "question": "Direkte Frage auf Deutsch",
      "type": "text|date|time|choice",
      "options": ["Nur bei choice"],
      "required": true|false,
      "placeholder": "Hilfreicher Beispieltext"
    }
  ],
  "suggestedSettings": {
    "tone": "formal|freundlich|neutral|direkt",
    "urgency": "hoch|mittel|niedrig",
    "maxDuration": 180
  },
  "enhancedPrompt": "NUR bei isComplete=true: Vollständiger personalisierter Anruf-Prompt"
}

STRENGE REGELN:
- Wenn Input VAGE ist → isComplete MUSS false sein
- Stelle 2-4 SPEZIFISCHE Rückfragen basierend auf dem Anruf-Typ
- Fragen MÜSSEN zum erkannten Intent passen (z.B. bei Terminverschiebung: alter Termin, neuer Termin, Grund, Alternativen)
- Bei unklarem Datum/Zeit: Frage KONKRET nach (nicht "wann", sondern "An welchem Tag und zu welcher Uhrzeit")
- placeholder MUSS ein konkretes Beispiel sein
- detectedIntent MUSS den Kontext erfassen
- ⚠️ WICHTIG: FRAGE NIEMALS nach dem Zeitpunkt des Anrufs! Der Anruf wird SOFORT ausgeführt!

BEISPIELE:

Input: "Testanruf"
→ isComplete: false
→ detectedIntent: "Testanruf ohne spezifisches Ziel"
→ questions: [
  {"id": "test_purpose", "question": "Was genau möchten Sie bei ${input.contactName} erreichen oder besprechen?", "type": "text", "required": true, "placeholder": "z.B. Produktdemo vereinbaren, Angebot anfragen, Interesse abfragen"},
  {"id": "test_context", "question": "Gibt es wichtigen Kontext oder Hintergrund für ${input.contactName}?", "type": "text", "required": false, "placeholder": "z.B. Vorherige Kommunikation, gemeinsame Kontakte"},
  {"id": "expected_outcome", "question": "Was erwarten Sie als Ergebnis?", "type": "text", "required": false, "placeholder": "z.B. Termin vereinbaren, Zusage einholen"}
]

Input: "Verschiebe meinen Termin"
→ isComplete: false
→ detectedIntent: "Terminverschiebung ohne Details"
→ questions: [
  {"id": "old_appointment", "question": "Welchen Termin möchten Sie verschieben? (Datum und Uhrzeit)", "type": "text", "required": true, "placeholder": "z.B. Montag, 8. Januar um 15:00 Uhr"},
  {"id": "new_appointment", "question": "Auf welchen neuen Termin möchten Sie verschieben?", "type": "text", "required": true, "placeholder": "z.B. Dienstag, 9. Januar um 10:00 Uhr"},
  {"id": "reason", "question": "Was ist der Grund für die Verschiebung?", "type": "text", "required": true, "placeholder": "z.B. Krankheit, anderer Termin, ..."},
  {"id": "alternatives", "question": "Welche Alternativen sind für Sie möglich, falls der neue Termin nicht passt?", "type": "text", "required": false, "placeholder": "z.B. Mittwoch oder Donnerstag Vormittag"}
]

Input: "Verschiebe meinen Termin am Montag 15:00 auf Dienstag 10:00 wegen Krankheit, alternativ Mittwoch"
→ isComplete: true
→ enhancedPrompt: "Du bist ARAS, der KI-Assistent von ${input.userContext.userName}..."

WICHTIG: Antworte NUR mit dem JSON-Objekt!`;

    logger.info('[PROMPT-VALIDATOR] 📤 Sende Anfrage an Gemini 2.0 Flash...');
    
    const result = await model.generateContent(validationPrompt);
    const responseText = result.response.text();
    
    logger.info('[PROMPT-VALIDATOR] 📥 Gemini Antwort erhalten', { 
      responseLength: responseText.length,
      firstChars: responseText.substring(0, 100)
    });

    // Da responseMimeType auf "application/json" gesetzt ist, sollte die Antwort direkt JSON sein
    let cleanedJson = responseText.trim();
    
    // Entferne mögliche Markdown-Wrapper (zur Sicherheit)
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/```\n?/g, '').trim();
    }

    logger.info('[PROMPT-VALIDATOR] 🔄 Parse JSON...', {
      jsonLength: cleanedJson.length,
      jsonPreview: cleanedJson.substring(0, 150)
    });

    let validationResult: ValidationResult;
    try {
      validationResult = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      logger.error('[PROMPT-VALIDATOR] ❌ JSON Parse Fehler', {
        error: parseError.message,
        jsonPreview: cleanedJson.substring(0, 300)
      });
      throw new Error(`JSON Parse Fehler: ${parseError.message}`);
    }

    // Validiere dass alle erforderlichen Felder vorhanden sind
    if (typeof validationResult.isComplete !== 'boolean') {
      logger.error('[PROMPT-VALIDATOR] ❌ Ungültiges Validierungsergebnis: isComplete fehlt');
      throw new Error('Ungültiges Validierungsergebnis');
    }

    logger.info('[PROMPT-VALIDATOR] ✅ Validierung erfolgreich abgeschlossen', {
      isComplete: validationResult.isComplete,
      questionsCount: validationResult.questions?.length || 0,
      detectedIntent: validationResult.detectedIntent,
      missingInfoCount: validationResult.missingInfo?.length || 0,
      hasEnhancedPrompt: !!validationResult.enhancedPrompt,
      usedPersonalization: !!aiProfile.companyDescription
    });

    return validationResult;

  } catch (error: any) {
    logger.error('[PROMPT-VALIDATOR] ❌ KRITISCHER FEHLER bei Validierung', { 
      error: error.message,
      errorType: error.name,
      stack: error.stack,
      userInput: input.userInput
    });
    
    // Besserer Fallback: Analysiere Input um intelligentere Fragen zu stellen
    const lowerInput = input.userInput.toLowerCase();
    let detectedIntent = 'Allgemeine Anfrage';
    let intelligentQuestions: any[] = [];
    
    if (lowerInput.includes('termin') || lowerInput.includes('meeting')) {
      detectedIntent = 'Termin-bezogene Anfrage';
      intelligentQuestions = [
        {
          id: 'appointment_type',
          question: `Worum geht es bei dem Termin mit ${input.contactName}?`,
          type: 'text',
          required: true,
          placeholder: 'z.B. Geschäftsmeeting, Produktdemo, Beratungsgespräch...'
        },
        {
          id: 'appointment_datetime',
          question: 'Wann soll der Termin stattfinden? (Datum und Uhrzeit)',
          type: 'text',
          required: true,
          placeholder: 'z.B. Montag, 8. Januar 2025 um 14:00 Uhr'
        },
        {
          id: 'appointment_duration',
          question: 'Wie lange soll der Termin ungefähr dauern?',
          type: 'choice',
          options: ['30 Minuten', '1 Stunde', '1,5 Stunden', '2 Stunden'],
          required: false
        }
      ];
    } else if (lowerInput.includes('reserv') || lowerInput.includes('buchung')) {
      detectedIntent = 'Reservierung';
      intelligentQuestions = [
        {
          id: 'reservation_what',
          question: 'Was genau möchten Sie reservieren?',
          type: 'text',
          required: true,
          placeholder: 'z.B. Tisch, Raum, Equipment...'
        },
        {
          id: 'reservation_when',
          question: 'Für wann möchten Sie reservieren?',
          type: 'text',
          required: true,
          placeholder: 'z.B. Freitag, 10. Januar um 19:00 Uhr'
        },
        {
          id: 'reservation_details',
          question: 'Weitere Details oder Besonderheiten?',
          type: 'text',
          required: false,
          placeholder: 'z.B. Anzahl Personen, Sonderwünsche...'
        }
      ];
    } else if (lowerInput.includes('test') || lowerInput.includes('demo')) {
      detectedIntent = 'Test/Demo-Anruf';
      intelligentQuestions = [
        {
          id: 'test_goal',
          question: `Was möchten Sie bei ${input.contactName} erreichen oder testen?`,
          type: 'text',
          required: true,
          placeholder: 'z.B. Produkt vorstellen, Interesse abfragen, Termin vereinbaren...'
        },
        {
          id: 'test_context',
          question: 'Gibt es spezifischen Kontext oder Hintergrund?',
          type: 'text',
          required: false,
          placeholder: 'z.B. Vorherige Kommunikation, gemeinsame Kontakte...'
        }
      ];
    } else {
      // Komplett generischer Fallback
      intelligentQuestions = [
        {
          id: 'call_purpose',
          question: `Was ist das Ziel des Anrufs bei ${input.contactName}?`,
          type: 'text',
          required: true,
          placeholder: 'z.B. Termin vereinbaren, Angebot einholen, Information erfragen...'
        },
        {
          id: 'call_details',
          question: 'Welche Details sind für den Anruf wichtig?',
          type: 'text',
          required: true,
          placeholder: 'z.B. Datum, Zeitraum, spezifische Anforderungen...'
        },
        {
          id: 'expected_outcome',
          question: 'Was erwarten Sie als Ergebnis des Anrufs?',
          type: 'text',
          required: false,
          placeholder: 'z.B. Zusage, Rückruf, konkrete Antwort...'
        }
      ];
    }
    
    logger.warn('[PROMPT-VALIDATOR] ⚠️ Verwende intelligenten Fallback', {
      detectedIntent,
      questionsCount: intelligentQuestions.length
    });
    
    return {
      isComplete: false,
      detectedIntent,
      missingInfo: [`ARAS AI konnte die Anfrage "${input.userInput}" nicht vollständig analysieren. Bitte ergänzen Sie folgende Details:`],
      questions: intelligentQuestions,
      suggestedSettings: {
        tone: 'freundlich',
        urgency: 'mittel',
        maxDuration: 180
      }
    };
  }
}

export async function generateFinalPrompt(
  validatedData: {
    originalInput: string;
    answers: Record<string, string>;
    contactName: string;
    settings: {
      tone: string;
      urgency: string;
      maxDuration: number;
    };
    userContext: any;
  }
): Promise<string> {
  try {
    logger.info('[PROMPT-VALIDATOR] 🎯 Generiere finalen ULTRA-PERSONALISIERTEN Prompt...');
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 1536,
      }
    });

    const aiProfile = validatedData.userContext.aiProfile || {};
    
    let fullContext = `**ORIGINAL-ANFRAGE:** ${validatedData.originalInput}\n\n`;
    fullContext += `**GESAMMELTE DETAILS:**\n`;
    for (const [key, value] of Object.entries(validatedData.answers)) {
      fullContext += `- ${key}: ${value}\n`;
    }
    
    fullContext += `\n**ANRUFER-KONTEXT:**\n`;
    fullContext += `- Name: ${validatedData.userContext.userName}\n`;
    fullContext += `- Firma: ${validatedData.userContext.company || 'Nicht angegeben'}\n`;
    fullContext += `- Branche: ${validatedData.userContext.industry || 'Nicht angegeben'}\n`;
    
    if (aiProfile.companyDescription) {
      fullContext += `- Firmenbeschreibung: ${aiProfile.companyDescription}\n`;
    }
    if (aiProfile.brandVoice) {
      fullContext += `- Markenstimme: ${aiProfile.brandVoice}\n`;
    }
    if (aiProfile.communicationTone) {
      fullContext += `- Kommunikationsstil: ${aiProfile.communicationTone}\n`;
    }

    const finalPromptRequest = `Du bist ein Experte für ULTRA-PERSONALISIERTE, natürlich klingende KI-Anruf-Prompts.

**AUFGABE:**
Erstelle einen PERFEKTEN, hochgradig personalisierten und menschlich klingenden Anruf-Prompt für ARAS AI.

**VOLLSTÄNDIGER KONTEXT:**
${fullContext}

**ANRUF-EINSTELLUNGEN:**
- Tonalität: ${validatedData.settings.tone}
- Dringlichkeit: ${validatedData.settings.urgency}
- Max. Dauer: ${validatedData.settings.maxDuration} Sekunden
- Kontakt: ${validatedData.contactName}

**ANFORDERUNGEN:**

1. **ULTRA-PERSONALISIERT**: 
   - Integriere Firmennamen und Branche natürlich
   - Nutze den Kommunikationsstil des Anrufers
   - Berücksichtige die Markenstimme falls vorhanden
   - Verwende passende Fachsprache

2. **EXTREM MENSCHLICH**: 
   - Füge natürliche Pausen ein ("ähm", "also", "genau")
   - Sprich langsam und klar
   - Variiere Satzlänge
   - Zeige Empathie

3. **STRUKTURIERT**:
   - Professionelle Begrüßung
   - Klarer Grund
   - Hauptanliegen mit ALLEN Details
   - Konkrete Fragen
   - Freundliche Verabschiedung

4. **ZIELORIENTIERT**: Klares Gesprächsziel, Call-to-Action

5. **FLEXIBEL**: Vorbereitet auf verschiedene Antworten, Alternative Vorschläge

**PROMPT-STRUKTUR:**

**IDENTITÄT:**
"Du bist ARAS, der persönliche KI-Assistent von [Name] von [Firma]. Du rufst [Kontakt] an."

**GESPRÄCHSERÖFFNUNG:**
"Guten Tag, hier spricht ARAS, [Vorstellung + Kontext]. Ich rufe an wegen..."

**HAUPTTEIL:**
[Vollständige Details aus dem Kontext, natürlich formuliert]

**ALTERNATIVE & FLEXIBILITÄT:**
[Backup-Optionen, Umgang mit "Nein"]

**ABSCHLUSS:**
[Zusammenfassung, Dank, Verabschiedung]

**REGELN:**
- Nutze Tonalität "${validatedData.settings.tone}"
- Spiegele den Kommunikationsstil
- Bleib unter ${Math.floor(validatedData.settings.maxDuration / 60)} Minuten
- Sei authentisch und menschlich
- Keine Robotesprache!

Erstelle NUR den finalen Prompt, keine Erklärungen!`;

    const result = await model.generateContent(finalPromptRequest);
    const enhancedPrompt = result.response.text().trim();

    logger.info('[PROMPT-VALIDATOR] 🎯 Finaler Prompt generiert', {
      length: enhancedPrompt.length,
      hasPersonalization: enhancedPrompt.includes(validatedData.userContext.company || 'x')
    });

    return enhancedPrompt;

  } catch (error: any) {
    logger.error('[PROMPT-VALIDATOR] Fehler bei Prompt-Generierung', error);
    
    let fallbackPrompt = `Du bist ARAS, der persönliche Assistent von ${validatedData.userContext.userName}`;
    if (validatedData.userContext.company) {
      fallbackPrompt += ` von ${validatedData.userContext.company}`;
    }
    fallbackPrompt += `.\n\nDu rufst ${validatedData.contactName} an.\n\n**Dein Auftrag:**\n${validatedData.originalInput}\n\n`;
    
    if (Object.keys(validatedData.answers).length > 0) {
      fallbackPrompt += `**Details:**\n`;
      for (const [key, value] of Object.entries(validatedData.answers)) {
        fallbackPrompt += `- ${key}: ${value}\n`;
      }
    }
    
    fallbackPrompt += `\n**Gesprächseröffnung:**\n"Guten Tag, hier ist ARAS, der persönliche Assistent von ${validatedData.userContext.userName}. Ich rufe an wegen..."\n\n`;
    fallbackPrompt += `Sei höflich, menschlich und natürlich. Verwende "ähm" und Pausen für mehr Natürlichkeit.`;
    
    return fallbackPrompt;
  }
}
