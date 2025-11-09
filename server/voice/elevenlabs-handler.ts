import axios from 'axios';
import { logger } from '../logger';
import { EnhancedCallContext } from './gemini-prompt-enhancer';

// ARAS Neural Voice System - ElevenLabs Agents Platform Integration
export async function makeHumanCall(callContext: EnhancedCallContext) {
  try {
    logger.info('[ARAS-VOICE] Initialisiere Neural Voice System...', { 
      to: callContext.phoneNumber,
      purpose: callContext.purpose 
    });
    
    // Validiere API Keys
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
      throw new Error('ElevenLabs API Keys fehlen! (API_KEY, AGENT_ID erforderlich)');
    }

    // Nutze Twilio Integration für Outbound Calls
    // Da der direkte phone_call endpoint deprecated ist
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/convai/agents/${process.env.ELEVENLABS_AGENT_ID}/conversation`,
      {
        // Erstelle eine neue Conversation mit dem Agent
        conversation_config_override: {
          agent: {
            prompt: {
              prompt: callContext.detailsForAI
            },
            first_message: `Hallo ${callContext.contactName}, ich bin ARAS, der persönliche Assistent von ${callContext.userName}.`,
            language: "de"
          }
        },
        
        // Zusätzliche Metadaten
        custom_llm_data: {
          user_name: callContext.userName,
          contact_name: callContext.contactName,
          purpose: callContext.purpose,
          phone_number: callContext.phoneNumber
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json'
        },
        timeout: 30000
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
