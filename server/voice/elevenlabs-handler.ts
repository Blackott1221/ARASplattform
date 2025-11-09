import axios from 'axios';
import { logger } from '../logger';
import { EnhancedCallContext } from './gemini-prompt-enhancer';

// ARAS Neural Voice System - ElevenLabs Twilio Integration
export async function makeHumanCall(callContext: EnhancedCallContext) {
  try {
    logger.info('[ARAS-VOICE] Initialisiere Telefon-Anruf...', { 
      to: callContext.phoneNumber,
      purpose: callContext.purpose 
    });
    
    // Validiere ALLE benötigten API Keys
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY fehlt in Environment Variables!');
    }
    if (!process.env.ELEVENLABS_AGENT_ID) {
      throw new Error('ELEVENLABS_AGENT_ID fehlt in Environment Variables!');
    }
    if (!process.env.ELEVENLABS_PHONE_NUMBER_ID) {
      throw new Error('ELEVENLABS_PHONE_NUMBER_ID fehlt in Environment Variables!');
    }

    // Verwende den KORREKTEN Twilio Outbound Call Endpoint
    const apiUrl = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';
    
    logger.info('[ARAS-VOICE] Calling ElevenLabs API...', {
      url: apiUrl,
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: callContext.phoneNumber
    });
    
    const response = await axios.post(
      apiUrl,
      {
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: callContext.phoneNumber,
        
        // Nutze NUR Dynamic Variables - behalte ElevenLabs Dashboard Config
        conversation_initiation_client_data: {
          // KEIN conversation_config_override! Behalte die Dashboard-Konfiguration!
          // Nur Dynamic Variables übergeben
          dynamic_variables: {
            user_name: callContext.userName,           // {{user_name}} = "ADMIN" / "Manuel"
            contact_name: callContext.contactName,     // {{contact_name}} = "Justin Schwarzott"
            purpose: callContext.purpose,               // {{purpose}} = "Terminverschiebung"
            original_message: callContext.originalMessage || "Kein spezifischer Auftrag",  // Die ORIGINAL Nachricht vom User
            call_reason: callContext.purpose,           // Nochmal für Klarheit
            phone_number: callContext.phoneNumber       // Falls benötigt im Gespräch
          }
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    logger.info('[ARAS-VOICE] Anruf erfolgreich initiiert!', { 
      success: response.data.success,
      conversation_id: response.data.conversation_id,
      callSid: response.data.callSid,
      message: response.data.message
    });

    return {
      success: response.data.success || true,
      callId: response.data.conversation_id || response.data.callSid,
      status: response.data.success ? 'initiated' : 'pending',
      message: response.data.message || `ARAS AI ruft ${callContext.contactName} an...`
    };

  } catch (error: any) {
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      requestData: error.config?.data,
      agentId: process.env.ELEVENLABS_AGENT_ID,
      phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID
    };
    
    logger.error('[ARAS-VOICE] ElevenLabs API Fehler!', errorDetails);
    
    // Detaillierte Fehleranalyse
    if (error.response?.status === 404) {
      throw new Error(
        `ElevenLabs 404: Ressource nicht gefunden.\n` +
        `Agent ID: ${process.env.ELEVENLABS_AGENT_ID}\n` +
        `Phone Number ID: ${process.env.ELEVENLABS_PHONE_NUMBER_ID}\n\n` +
        `Prüfe bitte:\n` +
        `1. Ist die Agent ID korrekt?\n` +
        `2. Ist die Phone Number ID mit diesem Agent verbunden?\n` +
        `3. Ist Twilio Integration im ElevenLabs Dashboard aktiviert?\n` +
        `4. Hat dein API Key Telefonie-Berechtigungen?`
      );
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error(
        `ElevenLabs Authentifizierung fehlgeschlagen (${error.response.status}).\n` +
        `Prüfe deinen API Key in den Environment Variables.`
      );
    }
    
    if (error.response?.status === 422) {
      throw new Error(
        `ElevenLabs Validierungsfehler: ${JSON.stringify(error.response.data)}\n` +
        `Die Request-Parameter sind ungültig.`
      );
    }
    
    // Allgemeiner Fehler
    throw new Error(
      error.response?.data?.detail?.message || 
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message || 
      'Unbekannter ElevenLabs API Fehler'
    );
  }
}
