import axios from 'axios';
import { logger } from '../logger';
import { EnhancedCallContext } from './gemini-prompt-enhancer'; // Importiere vom Gehirn

// Diese Funktion nimmt den perfekten Prompt von Gemini und ruft an
export async function makeHumanCall(callContext: EnhancedCallContext) {
  try {
    logger.info('[ARAS-VOICE] Starte ultra-menschlichen Anruf...', { 
      to: callContext.phoneNumber,
      purpose: callContext.purpose 
    });
    
    // Prüfe ob alle ElevenLabs Keys da sind
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID || !process.env.ELEVENLABS_PHONE_NUMBER_ID) {
      throw new Error('ElevenLabs API Keys fehlen in Render! (API_KEY, AGENT_ID, PHONE_NUMBER_ID)');
    }

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/conversation/phone_call',
      {
        // Statische IDs aus Render
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        
        // Dynamische Daten pro Anruf
        to_phone_number: callContext.phoneNumber,
        
        // DER MAGISCHE TEIL: Wir überschreiben den System-Prompt
        // mit dem, was unser Gemini-Gehirn generiert hat!
        custom_llm_extra_body: {
          system_prompt_override: callContext.detailsForAI
        },

        // Metadaten für die Logs
        metadata: {
          user_name: callContext.userName,
          contact_name: callContext.contactName,
          purpose: callContext.purpose,
          timestamp: new Date().toISOString()
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 Sekunden Timeout
      }
    );

    logger.info('[ARAS-VOICE] Anruf erfolgreich gestartet!', { 
      callId: response.data.call_id, 
      status: response.data.status 
    });

    return {
      success: true,
      callId: response.data.call_id,
      status: response.data.status,
      message: `ARAS AI ruft ${callContext.contactName} an...`
    };

  } catch (error: any) {
    logger.error('[ARAS-VOICE] ElevenLabs Anruf-Fehler!', { 
      error: error.response?.data || error.message,
      status: error.response?.status 
    });
    throw new Error(
      error.response?.data?.detail?.message || 
      error.response?.data?.detail ||
      error.message || 
      'Failed to initiate call at ElevenLabs'
    );
  }
}
