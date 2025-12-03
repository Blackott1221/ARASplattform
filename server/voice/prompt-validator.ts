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
    logger.info('[PROMPT-VALIDATOR] 🔍 Analysiere User-Input mit voller Personalisierung...', { 
      input: input.userInput.substring(0, 50),
      hasAiProfile: !!input.userContext.aiProfile,
      company: input.userContext.company
    });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
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

    const validationPrompt = `Du bist ein ULTRA-INTELLIGENTER Anruf-Qualitäts-Assistent für ARAS AI.

**DEINE AUFGABE:**
Analysiere die folgende Anruf-Anfrage und stelle sicher, dass ALLE notwendigen Informationen vorhanden sind, bevor ein HOCHPERSONALISIERTER, professioneller Anruf durchgeführt wird.

${userContextString}

**KONTAKT-PERSON:** ${input.contactName}

**ANRUF-ANFRAGE:**
"${input.userInput}"
${answersContext}

**KRITISCHE ANALYSE-KRITERIEN:**
1. **Zweck/Ziel**: Ist klar, WAS erreicht werden soll?
2. **Details**: Sind alle relevanten Details vorhanden (Datum, Zeit, Grund, Alternativen, etc.)?
3. **Kontext**: Ist der Kontext für den Empfänger verständlich und ausreichend?
4. **Ausführbarkeit**: Kann die KI die Aufgabe ohne zusätzliche Infos professionell ausführen?
5. **Personalisierung**: Können die Firmen- und Persönlichkeitsdaten optimal genutzt werden?

**INTELLIGENTE VALIDIERUNGS-REGELN:**
- Bei Terminanfragen: Datum, Uhrzeit, Grund, Alternative-Optionen ZWINGEND
- Bei Verschiebungen: Alter Termin, Neuer Termin, Grund, Alternativen ZWINGEND
- Bei Reservierungen: Datum, Uhrzeit, Personenzahl, Besonderheiten
- Bei Anfragen: Klares Anliegen, erwartete Antwort, Deadline falls relevant
- Bei Follow-ups: Bezug zum vorherigen Kontakt, neues Anliegen
- IMMER: Klarer Call-to-Action oder erwartetes Ergebnis

**DEINE ANTWORT (als VALIDES JSON):**
{
  "isComplete": true/false,
  "detectedIntent": "Kurze präzise Beschreibung des erkannten Ziels",
  "missingInfo": ["Liste fehlender kritischer Informationen"],
  "questions": [
    {
      "id": "unique_id",
      "question": "Konkrete, klare Rückfrage",
      "type": "text/date/time/choice",
      "options": ["Option 1", "Option 2"],
      "required": true/false,
      "placeholder": "Hilfreicher Platzhalter"
    }
  ],
  "suggestedSettings": {
    "tone": "formal/freundlich/neutral/direkt",
    "urgency": "hoch/mittel/niedrig",
    "maxDuration": 180
  },
  "enhancedPrompt": "Nur wenn isComplete=true: Der vollständige HOCHPERSONALISIERTE Prompt"
}

**WICHTIGE REGELN:**
- Wenn Datum/Zeit erwähnt wird aber unklar ist: Frage SPEZIFISCH nach
- Wenn Grund unklar ist: Frage nach dem genauen Anliegen
- Wenn Alternativen fehlen: Frage nach Backup-Optionen
- Sei STRENG aber hilfreich
- Bei vagen Inputs: IMMER als INCOMPLETE markieren

**BEISPIEL UNVOLLSTÄNDIG:**
Input: "Verschiebe meinen Termin"
→ isComplete: false
→ Fragen: Welcher Termin? Auf wann? Grund? Alternativen?

**BEISPIEL VOLLSTÄNDIG:**
Input: "Verschiebe meinen Termin am Montag 15:00 Uhr auf Dienstag 10:00 Uhr wegen Krankheit. Falls nicht möglich, alternativ Mittwoch."
→ isComplete: true
→ Erstelle vollständigen personalisierten Prompt

Antworte NUR mit dem JSON-Objekt, nichts anderes!`;

    const result = await model.generateContent(validationPrompt);
    const responseText = result.response.text();
    
    logger.info('[PROMPT-VALIDATOR] 🤖 Gemini Rohausgabe:', { 
      response: responseText.substring(0, 200) 
    });

    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/```\n?/g, '');
    }

    const validationResult: ValidationResult = JSON.parse(cleanedJson);

    logger.info('[PROMPT-VALIDATOR] ✅ Validierung abgeschlossen', {
      isComplete: validationResult.isComplete,
      questionsCount: validationResult.questions?.length || 0,
      detectedIntent: validationResult.detectedIntent,
      usedPersonalization: !!aiProfile.companyDescription
    });

    return validationResult;

  } catch (error: any) {
    logger.error('[PROMPT-VALIDATOR] ❌ Fehler bei Validierung', { 
      error: error.message,
      stack: error.stack
    });
    
    return {
      isComplete: false,
      detectedIntent: 'Unbekanntes Anliegen',
      missingInfo: ['Die Anfrage konnte nicht analysiert werden. Bitte versuchen Sie es erneut.'],
      questions: [{
        id: 'fallback_details',
        question: 'Bitte beschreiben Sie Ihr Anliegen genauer mit allen relevanten Details (Datum, Zeit, Grund, Alternativen, etc.)',
        type: 'text',
        required: true,
        placeholder: 'Beispiel: Verschiebe meinen Termin am Montag 15:00 auf Dienstag 10:00 wegen...'
      }],
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
