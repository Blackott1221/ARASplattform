import { Resend } from 'resend';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Resend Client initialisieren
const resend = new Resend(process.env.RESEND_API_KEY);

// Gemini für personalisierte E-Mails
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Email-Absender - WICHTIG: plattform-aras.ai ist die einzige verifizierte Domain bei Resend!
const FROM_EMAIL = 'ARAS AI <noreply@plattform-aras.ai>';
const FRONTEND_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'https://www.plattform-aras.ai';

// ============================================
// AI PROFILE INTERFACE
// ============================================
interface AIProfile {
  companyDescription?: string;
  products?: string[];
  services?: string[];
  targetAudience?: string;
  brandVoice?: string;
  competitors?: string[];
  uniqueSellingPoints?: string[];
  currentChallenges?: string[];
  opportunities?: string[];
  goals?: string[];
  industry?: string;
  [key: string]: any;
}

interface UserData {
  firstName?: string;
  lastName?: string;
  company?: string;
  industry?: string;
  role?: string;
  primaryGoal?: string;
  aiProfile?: AIProfile | null;
}

// ============================================
// AI-PERSONALISIERTE WILLKOMMENS-EMAIL
// ============================================
async function generatePersonalizedWelcomeContent(userData: UserData): Promise<{
  subject: string;
  greeting: string;
  mainContent: string;
  benefits: string[];
  callToAction: string;
} | null> {
  if (!genAI || !userData.aiProfile) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Du bist ein erstklassiger Marketing-Texter für ARAS AI, eine High-End KI-Plattform für Vertrieb und Kommunikation.

AUFGABE: Erstelle eine ULTRA-PERSONALISIERTE Willkommens-E-Mail für einen neuen Nutzer.

USER DATEN:
- Name: ${userData.firstName} ${userData.lastName || ''}
- Unternehmen: ${userData.company || 'Nicht angegeben'}
- Branche: ${userData.industry || 'Nicht angegeben'}
- Position: ${userData.role || 'Nicht angegeben'}
- Hauptziel: ${userData.primaryGoal?.replace(/_/g, ' ') || 'Geschäftswachstum'}

RECHERCHE-ERGEBNISSE ZUM UNTERNEHMEN:
${userData.aiProfile.companyDescription ? `Beschreibung: ${userData.aiProfile.companyDescription}` : ''}
${userData.aiProfile.products?.length ? `Produkte: ${userData.aiProfile.products.join(', ')}` : ''}
${userData.aiProfile.services?.length ? `Services: ${userData.aiProfile.services.join(', ')}` : ''}
${userData.aiProfile.targetAudience ? `Zielgruppe: ${userData.aiProfile.targetAudience}` : ''}
${userData.aiProfile.uniqueSellingPoints?.length ? `USPs: ${userData.aiProfile.uniqueSellingPoints.join(', ')}` : ''}
${userData.aiProfile.currentChallenges?.length ? `Aktuelle Herausforderungen: ${userData.aiProfile.currentChallenges.join(', ')}` : ''}
${userData.aiProfile.opportunities?.length ? `Chancen: ${userData.aiProfile.opportunities.join(', ')}` : ''}
${userData.aiProfile.competitors?.length ? `Wettbewerber: ${userData.aiProfile.competitors.join(', ')}` : ''}

ANFORDERUNGEN:
1. Beziehe dich KONKRET auf das Unternehmen und die Branche
2. Zeige, wie ARAS AI bei den spezifischen Herausforderungen helfen kann
3. Sei begeisternd aber professionell
4. Nutze die Recherche-Daten, um relevante Vorteile hervorzuheben
5. Sprich den User mit Vornamen an
6. Maximal 3-4 kurze Absätze für mainContent

AUSGABE FORMAT (JSON):
{
  "subject": "Persönlicher, spannender Betreff mit Bezug zum Unternehmen (max 60 Zeichen)",
  "greeting": "Personalisierte Begrüßung",
  "mainContent": "2-3 Absätze personalisierter Inhalt mit Bezug auf Branche/Unternehmen/Ziele. HTML erlaubt für <p> und <strong>.",
  "benefits": ["3-4 spezifische Vorteile für DIESEN User/Branche, kurz und knackig"],
  "callToAction": "Motivierender, personalisierter Call-to-Action"
}

NUR JSON AUSGEBEN, KEIN WEITERER TEXT!`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Email-AI] Could not parse JSON from Gemini response');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[Email-AI] ✅ Generated personalized welcome content for', userData.company);
    return parsed;
    
  } catch (error: any) {
    console.error('[Email-AI] Error generating personalized content:', error?.message);
    return null;
  }
}

// ============================================
// 1. WILLKOMMENS-EMAIL bei Registrierung
// ============================================
export async function sendWelcomeEmail(
  to: string,
  userName: string,
  userData?: UserData
) {
  try {
    // Try to generate AI-personalized content
    let personalizedContent = null;
    if (userData?.aiProfile) {
      personalizedContent = await generatePersonalizedWelcomeContent(userData);
    }

    const subject = personalizedContent?.subject || '🎉 Willkommen bei ARAS AI!';
    const greeting = personalizedContent?.greeting || `Hallo ${userName},`;
    
    const mainContent = personalizedContent?.mainContent || `
      <p>vielen Dank für deine Registrierung! Wir freuen uns, dich an Bord zu haben.</p>
      <p>ARAS AI ist deine persönliche KI-Plattform für intelligente Vertriebskommunikation. 
      Ab sofort steht dir die volle Power von künstlicher Intelligenz zur Verfügung.</p>
    `;
    
    const benefits = personalizedContent?.benefits || [
      '🤖 AI-gestützte Voice Agents für automatisierte Gespräche',
      '📅 Intelligente Terminplanung mit Kalender-Sync',
      '📞 Automatisierte Anrufe mit persönlicher Note',
      '📊 Detaillierte Analytics & Insights'
    ];
    
    const callToAction = personalizedContent?.callToAction || 
      'Starte jetzt und erlebe die Zukunft der KI-Kommunikation!';

    const benefitsHtml = benefits.map(b => `<li>${b}</li>`).join('\n');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(to bottom, #0a0a0a, #151515);
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(20, 20, 20, 0.98));
                border: 2px solid transparent;
                background-image: 
                  linear-gradient(135deg, rgba(10,10,10,0.98), rgba(20,20,20,0.98)), 
                  linear-gradient(135deg, #FE9100, #E9D7C4);
                background-origin: border-box;
                background-clip: padding-box, border-box;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 0 40px rgba(254, 145, 0, 0.2);
              }
              h1 {
                background: linear-gradient(135deg, #E9D7C4, #FE9100, #A34E00);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 28px;
                margin: 0 0 20px 0;
              }
              p {
                color: #E9D7C4;
                font-size: 16px;
                line-height: 1.7;
                margin: 0 0 16px 0;
              }
              ul {
                color: #E9D7C4;
                padding-left: 0;
                list-style: none;
              }
              li {
                padding: 8px 0;
                border-bottom: 1px solid rgba(254, 145, 0, 0.1);
              }
              li:last-child {
                border-bottom: none;
              }
              .button {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #FE9100, #A34E00);
                color: #000 !important;
                text-decoration: none;
                border-radius: 12px;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 0 20px rgba(254, 145, 0, 0.4);
                margin: 20px 0;
              }
              .cta-text {
                font-size: 18px;
                font-weight: 600;
                color: #FE9100;
                margin: 24px 0 16px 0;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid rgba(233, 215, 196, 0.2);
                color: #A34E00;
                font-size: 14px;
              }
              .highlight {
                color: #FE9100;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Willkommen bei ARAS AI! 🚀</h1>
              <p>${greeting}</p>
              
              ${mainContent}
              
              <p style="margin-top: 24px;"><strong>Was dich erwartet:</strong></p>
              <ul>
                ${benefitsHtml}
              </ul>
              
              <p class="cta-text">${callToAction}</p>
              
              <a href="${FRONTEND_URL}/space" class="button">Jetzt ARAS AI starten →</a>
              
              <div class="footer">
                <p>Bei Fragen: support@plattform-aras.ai</p>
                <p>ARAS AI - Die Zukunft der KI-Kommunikation</p>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">
                  Entwickelt von der Schwarzott Group
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('[Email] Welcome email error:', error);
      return { success: false, error };
    }

    console.log('[Email] ✅ Welcome email sent:', data?.id, personalizedContent ? '(AI-personalized)' : '(standard)');
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Welcome email failed:', error);
    return { success: false, error };
  }
}

// ============================================
// 2. PASSWORT-RESET EMAIL
// ============================================
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  resetToken: string
) {
  try {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '🔐 Passwort zurücksetzen - ARAS AI',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(to bottom, #0a0a0a, #151515);
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(20, 20, 20, 0.98));
                border: 2px solid transparent;
                background-image: 
                  linear-gradient(135deg, rgba(10,10,10,0.98), rgba(20,20,20,0.98)), 
                  linear-gradient(135deg, #FE9100, #E9D7C4);
                background-origin: border-box;
                background-clip: padding-box, border-box;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 0 40px rgba(254, 145, 0, 0.2);
              }
              h1 {
                background: linear-gradient(135deg, #E9D7C4, #FE9100, #A34E00);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 32px;
                margin: 0 0 20px 0;
              }
              p {
                color: #E9D7C4;
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 20px 0;
              }
              .button {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #FE9100, #A34E00);
                color: #000;
                text-decoration: none;
                border-radius: 12px;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 0 15px rgba(254, 145, 0, 0.4);
                margin: 20px 0;
              }
              .warning {
                background: rgba(254, 145, 0, 0.1);
                border: 1px solid rgba(254, 145, 0, 0.3);
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #FE9100;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid rgba(233, 215, 196, 0.2);
                color: #A34E00;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Passwort zurücksetzen</h1>
              <p>Hallo ${userName},</p>
              <p>du hast angefragt, dein Passwort zurückzusetzen.</p>
              
              <p>Klicke auf den folgenden Button, um ein neues Passwort zu setzen:</p>
              <a href="${resetLink}" class="button">Passwort zurücksetzen</a>
              
              <p style="font-size: 14px; color: #888;">
                Oder kopiere diesen Link: ${resetLink}
              </p>
              
              <div class="warning">
                ⚠️ <strong>Wichtig:</strong><br>
                • Dieser Link ist 1 Stunde gültig<br>
                • Falls du diese Anfrage nicht gestellt hast, ignoriere diese Email<br>
                • Dein aktuelles Passwort bleibt bis zum Reset aktiv
              </div>
              
              <div class="footer">
                <p>Bei Fragen: support@plattform-aras.ai</p>
                <p>ARAS AI - Die Zukunft der KI-Kommunikation</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('[Email] Password reset error:', error);
      return { success: false, error };
    }

    console.log('[Email] Password reset sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Password reset failed:', error);
    return { success: false, error };
  }
}

// ============================================
// 3. PASSWORT WURDE GEÄNDERT (Bestätigung)
// ============================================
export async function sendPasswordChangedEmail(
  to: string,
  userName: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '✅ Passwort erfolgreich geändert - ARAS AI',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(to bottom, #0a0a0a, #151515);
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(20, 20, 20, 0.98));
                border: 2px solid transparent;
                background-image: 
                  linear-gradient(135deg, rgba(10,10,10,0.98), rgba(20,20,20,0.98)), 
                  linear-gradient(135deg, #FE9100, #E9D7C4);
                background-origin: border-box;
                background-clip: padding-box, border-box;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 0 40px rgba(254, 145, 0, 0.2);
              }
              h1 {
                background: linear-gradient(135deg, #E9D7C4, #FE9100, #A34E00);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 32px;
                margin: 0 0 20px 0;
              }
              p {
                color: #E9D7C4;
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 20px 0;
              }
              .success {
                background: rgba(0, 255, 0, 0.1);
                border: 1px solid rgba(0, 255, 0, 0.3);
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #4ade80;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid rgba(233, 215, 196, 0.2);
                color: #A34E00;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Passwort geändert</h1>
              <p>Hallo ${userName},</p>
              
              <div class="success">
                ✅ Dein Passwort wurde erfolgreich geändert!
              </div>
              
              <p>Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
              
              <p><strong>Falls du diese Änderung nicht durchgeführt hast:</strong></p>
              <ul style="color: #E9D7C4;">
                <li>Kontaktiere sofort unseren Support: support@plattform-aras.ai</li>
                <li>Setze dein Passwort erneut zurück</li>
              </ul>
              
              <div class="footer">
                <p>Bei Fragen: support@plattform-aras.ai</p>
                <p>ARAS AI - Die Zukunft der KI-Kommunikation</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    if (error) {
      console.error('[Email] Password changed email error:', error);
      return { success: false, error };
    }

    console.log('[Email] Password changed email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Password changed email failed:', error);
    return { success: false, error };
  }
}
