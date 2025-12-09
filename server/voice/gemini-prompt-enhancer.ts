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
  
  // 🔥 BUSINESS INTELLIGENCE - ERWEITERT (Dezember 2025)
  company?: string;       // "ARAS GmbH"
  website?: string;       // "https://aras-ai.com"
  industry?: string;      // "real_estate", "insurance", etc.
  jobRole?: string;       // "CEO", "Sales Manager", etc.
  phone?: string;         // User's phone number
  
  // 🔥 AI PROFILE - ULTRA-DEEP INTELLIGENCE
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
    salesTriggers?: string[];
    painPoints?: string[];
    interests?: string[];
    vocabulary?: string[];
  };
}

// Das Ergebnis, das wir an ElevenLabs senden
export interface EnhancedCallContext {
  contactName: string;
  phoneNumber: string;
  userName: string;
  purpose: string; // z.B. "Terminverschiebung (Restaurant)"
  detailsForAI: string; // Der super-menschliche Prompt
  originalMessage: string; // Die ORIGINAL Nachricht vom User für Dynamic Variables
  
  // 🔥 COMPANY DATA für ElevenLabs Dynamic Variables (Dezember 2025)
  userCompany?: string;          // {{user_company}}
  userIndustry?: string;         // {{user_industry}}
  userWebsite?: string;          // {{user_website}}
  userRole?: string;             // {{user_role}}
  companyDescription?: string;   // {{company_description}}
  companyProducts?: string;      // {{company_products}} - komma-separiert
  companyServices?: string;      // {{company_services}} - komma-separiert
  companyValueProp?: string;     // {{company_value_prop}}
  userPersonality?: string;      // {{user_personality}}
  communicationStyle?: string;   // {{communication_style}}
}

export async function enhanceCallWithGemini(
  input: CallInput, 
  context: UserContext
): Promise<EnhancedCallContext> {
  
  try {
    logger.info('[ARAS-BRAIN] Generiere intelligenten Anruf-Kontext...', {
      hasCompany: !!context.company,
      hasIndustry: !!context.industry,
      hasAiProfile: !!context.aiProfile
    });
    
    // Erstelle einen intelligenten Prompt basierend auf dem Input
    const purpose = determinePurpose(input.message);
    const detailsForAI = generateHumanPrompt(input, context);
    
    // 🔥 Prepare company data for ElevenLabs dynamic variables
    const aiProfile = context.aiProfile || {};
    
    logger.info('[ARAS-BRAIN] Anruf-Kontext erfolgreich generiert', { 
      purpose,
      company: context.company,
      hasAiProfile: !!context.aiProfile
    });
    
    return {
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      userName: context.userName,
      purpose,
      detailsForAI,
      originalMessage: input.message,
      
      // 🔥 COMPANY DATA für ElevenLabs (Dezember 2025)
      userCompany: context.company,
      userIndustry: context.industry,
      userWebsite: context.website,
      userRole: context.jobRole,
      companyDescription: aiProfile.companyDescription,
      companyProducts: aiProfile.products?.join(', '),
      companyServices: aiProfile.services?.join(', '),
      companyValueProp: aiProfile.valueProp,
      userPersonality: aiProfile.personalityType,
      communicationStyle: aiProfile.communicationTone || aiProfile.brandVoice
    };
  } catch (error: any) {
    logger.error('[ARAS-BRAIN] Fehler bei Kontext-Generierung', { error: error.message });
    
    // Fallback: Einfacher aber funktionaler Prompt
    const aiProfile = context.aiProfile || {};
    
    return {
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      userName: context.userName,
      purpose: "Anruf",
      detailsForAI: `Du bist ARAS, der persönliche Assistent von ${context.userName}. Du rufst ${input.contactName} an. Dein Auftrag: ${input.message}. Sei extrem höflich, menschlich und natürlich. Verwende "ähm" und Pausen für mehr Natürlichkeit.`,
      originalMessage: input.message,
      
      // 🔥 COMPANY DATA auch im Fallback
      userCompany: context.company,
      userIndustry: context.industry,
      userWebsite: context.website,
      userRole: context.jobRole,
      companyDescription: aiProfile.companyDescription,
      companyProducts: aiProfile.products?.join(', '),
      companyServices: aiProfile.services?.join(', '),
      companyValueProp: aiProfile.valueProp,
      userPersonality: aiProfile.personalityType,
      communicationStyle: aiProfile.communicationTone || aiProfile.brandVoice
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

// Hilfsfunktion: Generiere menschlichen Prompt (EINFACHE VERSION für Fallback)
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

// HINWEIS: Die ULTRA-PERSONALISIERTE Version wird jetzt vom prompt-validator.ts
// mit generateFinalPrompt() generiert, der ALLE User-Daten nutzt!
