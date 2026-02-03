/**
 * ============================================================================
 * ARAS COMMAND CENTER - Team Command Center Routes
 * ============================================================================
 * Endpoints for the Team Command Center dashboard:
 * - Team Feed (activity stream + posts)
 * - Team Calendar (shared events)
 * - Team Todos (shared tasks)
 * - Active Users (online staff/admin)
 * - Action Center (next best actions)
 * - Contracts Pending (awaiting approval)
 * ============================================================================
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { 
  teamFeed, teamCalendar, teamTodos, users,
  internalDeals, internalTasks, internalCallLogs, internalContacts,
  InsertTeamFeed, InsertTeamCalendar, InsertTeamTodo
} from '../../../shared/schema';
import { eq, desc, and, gte, lte, or, ne, sql, isNull } from 'drizzle-orm';
import { logger } from '../../logger';
import { requireInternal } from '../../middleware/role-guard';
import * as contractService from '../../services/contract.service';
import * as geminiAI from '../../services/gemini-ai.service';

const router = Router();

// ============================================================================
// TEAM FEED - Activity stream + post updates
// ============================================================================

router.get('/team-feed', requireInternal, async (req: any, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    // Use EXACT DB schema columns:
    // id, actor_user_id, actor_name, author_user_id, author_name, action_type, entity_type, entity_id, title, body, message, type, meta, created_at
    const items = await db.execute(sql`
      SELECT 
        tf.id,
        tf.actor_user_id as "actorUserId",
        tf.actor_name as "actorName",
        tf.author_user_id as "authorUserId",
        COALESCE(tf.author_name, u.username) as "authorUsername",
        tf.action_type as "actionType",
        tf.entity_type as "entityType",
        tf.entity_id as "entityId",
        tf.title,
        tf.body,
        tf.message,
        tf.type,
        tf.meta,
        tf.created_at as "createdAt"
      FROM team_feed tf
      LEFT JOIN users u ON tf.author_user_id = u.id
      ORDER BY tf.created_at DESC
      LIMIT ${limit}
    `);
    
    res.json({ items: (items as any) || [], total: ((items as any) || []).length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching team feed:', error.message);
    if (error.message?.includes('does not exist') || error.code === '42P01' || error.code === '42703') {
      return res.json({ items: [], total: 0, _warning: 'Schema error - check DB columns' });
    }
    res.status(500).json({ error: 'Failed to fetch team feed' });
  }
});

router.post('/team-feed', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    const username = req.user?.username || req.session?.username || 'Unknown';
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Validate input - matches actual DB schema
    const schema = z.object({
      message: z.string().min(1).max(2000).optional(),
      body: z.string().optional(),
      title: z.string().min(1).max(500).optional(),
      type: z.enum(['post', 'note', 'update', 'announcement', 'system']).default('post'),
      action_type: z.string().default('post'),
      entity_type: z.string().optional(),
      entity_id: z.string().optional(),
      meta: z.record(z.any()).optional(),
    });

    const data = schema.parse(req.body);
    
    // Build payload matching EXACT DB schema:
    // actor_user_id, actor_name, author_user_id, author_name, action_type, entity_type, entity_id, title, body, message, type, meta, created_at
    const payload = {
      actor_user_id: userId,
      actor_name: username,
      author_user_id: userId,
      author_name: username,
      action_type: data.action_type || 'post',
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      title: data.title || data.message?.substring(0, 100) || 'Update',
      body: data.body || data.message || null,
      message: data.message || data.body || null,
      type: data.type || 'post',
      meta: JSON.stringify(data.meta || {}),
    };

    // Debug logging
    console.log('[TEAM-FEED] INSERT payload:', JSON.stringify(payload, null, 2));

    // Execute INSERT with EXPLICIT column list matching DB schema
    const result = await db.execute(sql`
      INSERT INTO team_feed (
        actor_user_id,
        actor_name,
        author_user_id,
        author_name,
        action_type,
        entity_type,
        entity_id,
        title,
        body,
        message,
        type,
        meta,
        created_at
      ) VALUES (
        ${payload.actor_user_id},
        ${payload.actor_name},
        ${payload.author_user_id},
        ${payload.author_name},
        ${payload.action_type},
        ${payload.entity_type},
        ${payload.entity_id},
        ${payload.title},
        ${payload.body},
        ${payload.message},
        ${payload.type},
        ${payload.meta}::jsonb,
        NOW()
      )
      RETURNING 
        id,
        actor_user_id as "actorUserId",
        actor_name as "actorName",
        author_user_id as "authorUserId",
        author_name as "authorName",
        action_type as "actionType",
        entity_type as "entityType",
        entity_id as "entityId",
        title,
        body,
        message,
        type,
        meta,
        created_at as "createdAt"
    `);

    console.log('[TEAM-FEED] INSERT success, result:', result);

    const item = (result as any)[0] || result;
    
    res.status(201).json({ 
      ...item, 
      authorUsername: username 
    });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error creating feed post:', { message: error.message, error });
    if (error.code === '42703' || error.code === '42P01' || error.message?.includes('does not exist')) {
      return res.status(503).json({ 
        error: `Schema mismatch: ${error.message}`,
        code: 'SCHEMA_ERROR'
      });
    }
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// TEAM FEED SEED - One-time historical data population
// ============================================================================

router.post('/team-feed/seed', requireInternal, async (req: any, res) => {
  try {
    // Extended team members - 30 people
    const TEAM = [
      { id: 'user_justin', name: 'Justin Schwarzott' },
      { id: 'user_herbert', name: 'Herbert Schöttl' },
      { id: 'user_sarah', name: 'Sarah Anderst' },
      { id: 'user_michael', name: 'Michael Gruber' },
      { id: 'user_anna', name: 'Anna Hofer' },
      { id: 'user_thomas', name: 'Thomas Maier' },
      { id: 'user_lisa', name: 'Lisa Weber' },
      { id: 'user_markus', name: 'Markus Bauer' },
      { id: 'user_julia', name: 'Julia Steiner' },
      { id: 'user_andreas', name: 'Andreas Huber' },
      { id: 'user_sandra', name: 'Sandra Koch' },
      { id: 'user_peter', name: 'Peter Wagner' },
      { id: 'user_maria', name: 'Maria Berger' },
      { id: 'user_florian', name: 'Florian Eder' },
      { id: 'user_stefanie', name: 'Stefanie Fuchs' },
      { id: 'user_max', name: 'Max Lehner' },
      { id: 'user_katharina', name: 'Katharina Wimmer' },
      { id: 'user_christoph', name: 'Christoph Pichler' },
      { id: 'user_nina', name: 'Nina Reiter' },
      { id: 'user_david', name: 'David Moser' },
      { id: 'user_laura', name: 'Laura Brunner' },
      { id: 'user_simon', name: 'Simon Haas' },
      { id: 'user_melanie', name: 'Melanie Stadler' },
      { id: 'user_patrick', name: 'Patrick Winkler' },
      { id: 'user_sabrina', name: 'Sabrina Egger' },
      { id: 'user_daniel', name: 'Daniel Aigner' },
      { id: 'user_martina', name: 'Martina Holzer' },
      { id: 'user_tobias', name: 'Tobias Lang' },
      { id: 'user_claudia', name: 'Claudia Schwarz' },
      { id: 'user_alexander', name: 'Alexander Kern' },
    ];

    // 200+ ultra-realistic messages with typos, casual language, conversations
    const MESSAGES = [
      // ============ JUSTIN - CEO, sehr locker, casual, tippfehler ============
      { msg: 'Deal mit Müller AG abgeschlossen! 🎉 250k ARR, starker Q3-Start.', type: 'announcement', author: 0 },
      { msg: 'Mega Woche! Danke an alle fürs Gas geben 💪', type: 'post', author: 0 },
      { msg: 'Partnerschaft mit TechVenture ist fix! 🎉', type: 'announcement', author: 0 },
      { msg: 'Investorengespräch lief mega gut. Update folgt im Führungskreis.', type: 'post', author: 0 },
      { msg: 'Q3 war unser bestes Quartal! Danke an alle 🙏', type: 'announcement', author: 0 },
      { msg: 'Super Teamwork diese Woche! 🙌', type: 'post', author: 0 },
      { msg: 'Wir wachsen! 5 neue Stellen offen. Bitte teilen!', type: 'announcement', author: 0 },
      { msg: 'hab grad den neuen pitch deck reviewed - sieht hammer aus!', type: 'post', author: 0 },
      { msg: 'Leute, wichtig: morgen 10:00 All-Hands, bitte alle dabei sein', type: 'update', author: 0 },
      { msg: 'kurzes update: kunde hat unterschrieben, 180k deal 🔥', type: 'post', author: 0 },
      { msg: 'bin ab 14 uhr im meeting, danach erreichbar', type: 'post', author: 0 },
      { msg: 'wer kommt mit mittagessen? geh zum asiaten', type: 'post', author: 0 },
      { msg: 'sorry für späte antwort, war im flieger', type: 'post', author: 0 },
      { msg: 'mega proud auf das team, echt stark was wir geschafft haben', type: 'post', author: 0 },
      { msg: 'jemand lust auf after work drinks heute?', type: 'post', author: 0 },
      { msg: 'der neue kunde is total begeistert, die demo war perfekt 👌', type: 'post', author: 0 },
      { msg: 'btw hab grad gehört dass der wettbewerb struggles hat lol', type: 'post', author: 0 },
      { msg: 'meeting war lang aber produktiv, bin jetzt platt', type: 'post', author: 0 },
      { msg: 'wer hat mein ladekabel gesehen? lag aufm schreibtisch', type: 'post', author: 0 },
      { msg: 'nice arbeit @markus, der fix war genau richtig', type: 'post', author: 0 },
      
      // ============ HERBERT - CFO, formeller, korrekt, wenig emojis ============
      { msg: 'Quartalsabschluss fertig. Report im Shared Drive.', type: 'announcement', author: 1 },
      { msg: 'Budget für Q4 genehmigt. Details im Meeting morgen.', type: 'announcement', author: 1 },
      { msg: 'Bitte alle KPIs bis Freitag aktualisieren.', type: 'update', author: 1 },
      { msg: 'Jahresplanung 2025 startet. Input willkommen.', type: 'post', author: 1 },
      { msg: 'Reisekostenabrechnung bitte bis Ende der Woche einreichen.', type: 'update', author: 1 },
      { msg: 'Audit-Vorbereitung läuft. Dokumente bis Freitag.', type: 'update', author: 1 },
      { msg: 'Forecast Q1 muss noch angepasst werden. Bitte prüfen.', type: 'update', author: 1 },
      { msg: 'Die Zahlen für Oktober sind sehr erfreulich.', type: 'post', author: 1 },
      { msg: 'Bitte Belege vollständig einreichen, nicht nur Teilbelege.', type: 'update', author: 1 },
      { msg: 'Cashflow-Prognose zeigt positiven Trend.', type: 'post', author: 1 },
      
      // ============ SARAH - COO, sachlich aber freundlich ============
      { msg: 'Server-Wartung Samstag 02:00-04:00 Uhr. Kurze Downtime möglich.', type: 'announcement', author: 2 },
      { msg: 'Prozessoptimierung Phase 2 startet nächste Woche.', type: 'post', author: 2 },
      { msg: 'Wochenstart-Call heute 09:00. Kurzes Update von jedem Team.', type: 'update', author: 2 },
      { msg: 'Neue Büroräume werden bezogen. Timeline im Wiki.', type: 'update', author: 2 },
      { msg: 'Wochenende steht vor der Tür! Allen einen guten Feierabend 🌅', type: 'post', author: 2 },
      { msg: 'Status Meeting auf 14:30 vershoben', type: 'update', author: 2 },
      { msg: 'OKRs für Q4 sind finalisiert und im Confluence.', type: 'announcement', author: 2 },
      { msg: 'die neuen prozesse laufen gut, danke an alle fürs feedback', type: 'post', author: 2 },
      { msg: 'bitte meeting notes immer direkt nach dem call teilen', type: 'update', author: 2 },
      { msg: 'Projektplan wurde aktualisiert, bitte alle checken', type: 'update', author: 2 },
      
      // ============ MICHAEL - Head of Sales, hyped, viele emojis ============
      { msg: 'Pipeline Review heute um 14:00. Bitte alle Deals aktualisieren.', type: 'update', author: 3 },
      { msg: 'Q2 Zahlen sehen gut aus, 15% über Plan 💪', type: 'announcement', author: 3 },
      { msg: 'Neuer Rekord! 12 Demos diese Woche 🚀', type: 'post', author: 3 },
      { msg: 'Wichtig: Preislsite wurde aktualisiert. Neue Version im Drive.', type: 'update', author: 3 },
      { msg: 'hat jemand die präsentation von gestern? brauch die asap', type: 'post', author: 3 },
      { msg: 'Deal mit Huber & Co fast durch, nur noch Legal 🤞', type: 'post', author: 3 },
      { msg: 'leute der monat läuft mega, weiter so!!', type: 'post', author: 3 },
      { msg: 'YESSSS der deal is durch!!! 🎉🎉🎉', type: 'post', author: 3 },
      { msg: 'wer kann bei ner demo um 15 uhr einspringen? bin doppelt gebucht', type: 'post', author: 3 },
      { msg: 'kunde will nächste woche unterschreiben, fingers crossed', type: 'post', author: 3 },
      { msg: 'crm bitte updaten leute, brauch aktuelle zahlen', type: 'update', author: 3 },
      { msg: 'sales call war mega, die wollen definitiv kaufen', type: 'post', author: 3 },
      
      // ============ ANNA - Sales Manager, professionell aber locker ============
      { msg: 'Demo bei Weber & Partner war super! Proposal geht heute raus.', type: 'post', author: 4 },
      { msg: 'Neuer Lead reinbekommen, sieht vielversprechend aus', type: 'post', author: 4 },
      { msg: 'kunde möchte termin verschieben auf nächste woche', type: 'post', author: 4 },
      { msg: 'CRM ist geupdated, alle deals sind drin', type: 'post', author: 4 },
      { msg: 'wer kann morgen bei der demo supporten?', type: 'post', author: 4 },
      { msg: 'habs geschafft! vertrag unterschrieben 🙌', type: 'post', author: 4 },
      { msg: 'der kunde war echt skeptisch aber konnte ihn überzeugen', type: 'post', author: 4 },
      { msg: 'sorry bin 5 min später im call, stau', type: 'post', author: 4 },
      
      // ============ THOMAS - Key Account, ruhiger, sachlich ============
      { msg: 'Neuer Lead: Schneider GmbH, sehr interessiert an Enterprise-Paket.', type: 'post', author: 5 },
      { msg: 'Neukunde Bauer Holding ist onboard! Großes Potenzial.', type: 'post', author: 5 },
      { msg: 'Vertrag mit Meier AG verlängert, 3 Jahre 🎉', type: 'announcement', author: 5 },
      { msg: 'meeting mit großkunde war super, follow up ist scheduled', type: 'post', author: 5 },
      { msg: 'brauche unterstützung beim angebot für fischer gmbh', type: 'post', author: 5 },
      { msg: 'kunde hat budget erst nächstes quartal, aber interesse is da', type: 'post', author: 5 },
      { msg: 'war heut beim kunden vor ort, sehr positives gespräch', type: 'post', author: 5 },
      
      // ============ LISA - Marketing, kreativ, casual ============
      { msg: 'Neue Kampagne startet Montag. Content ist ready.', type: 'announcement', author: 6 },
      { msg: 'Webinar nächsten Donnerstag. Bitte weiterleiten!', type: 'update', author: 6 },
      { msg: 'LinkedIn-Post hat 5000+ Views! 🎉', type: 'post', author: 6 },
      { msg: 'Newsletter wurde versendet. 42% Open Rate!', type: 'post', author: 6 },
      { msg: 'neue landingpage ist live, feedback wilkommen', type: 'post', author: 6 },
      { msg: 'social media report ist im drive, sieht gut aus diesen monat', type: 'post', author: 6 },
      { msg: 'Branding Update kommt näcshte Woche, stay tuned', type: 'update', author: 6 },
      { msg: 'wer hat bock auf content brainstorming? ☕', type: 'post', author: 6 },
      { msg: 'der neue blog artikel performt mega gut', type: 'post', author: 6 },
      { msg: 'hab grad die ads optimiert, cpc is runter gegangen', type: 'post', author: 6 },
      { msg: 'brauche noch n paar quotes für die case study', type: 'post', author: 6 },
      
      // ============ MARKUS - Developer, tech-speak, casual ============
      { msg: 'Bug im Export-Modul gefixt. Bitte testen.', type: 'update', author: 7 },
      { msg: 'API-Performance um 40% verbessert 🚀', type: 'announcement', author: 7 },
      { msg: 'Datenbank-Migration erfolgreich abgeschlossen.', type: 'post', author: 7 },
      { msg: 'hotfix ist deployed, sollte jetz gehen', type: 'post', author: 7 },
      { msg: 'neue API doku ist online', type: 'post', author: 7 },
      { msg: 'CI/CD pipeline läuft wieder', type: 'post', author: 7 },
      { msg: 'wer hat zeit für code review? ist dringend', type: 'post', author: 7 },
      { msg: 'der memory leak is gefixt, war n blöder fehler', type: 'post', author: 7 },
      { msg: 'prod is stable, monitoring zeigt keine issues', type: 'post', author: 7 },
      { msg: 'muss noch den PR mergen dann is das feature done', type: 'post', author: 7 },
      { msg: 'kann mal jmd auf staging schauen? verhält sich komisch', type: 'post', author: 7 },
      { msg: 'refactoring hat länger gedauert aber code is jetzt viel cleaner', type: 'post', author: 7 },
      
      // ============ JULIA - HR, freundlich, social ============
      { msg: 'Zwei neue Kollegen starten nächste Woche!', type: 'announcement', author: 8 },
      { msg: 'Team-Event nächsten Freitag. Bitte anmelden!', type: 'post', author: 8 },
      { msg: 'Bitte Urlaubsanträge rechtzeitig einreichen.', type: 'update', author: 8 },
      { msg: 'Team-Lunch morgen 12:30. Alle dabei?', type: 'post', author: 8 },
      { msg: 'Neue Kaffeemaschine ist da! ☕', type: 'post', author: 8 },
      { msg: 'Geburstag heute: Alles Gute an Thomas! 🎂', type: 'post', author: 8 },
      { msg: 'onboarding für die neuen ist vorbereitet', type: 'post', author: 8 },
      { msg: 'wer hat lust auf n afterwork am freitag?', type: 'post', author: 8 },
      { msg: 'die neuen kollegen sind super nett, passt gut ins team', type: 'post', author: 8 },
      { msg: 'reminder: feedback gespräche diese woche', type: 'update', author: 8 },
      { msg: 'hat jemand den schlüssel für meetingraum 3?', type: 'post', author: 8 },
      
      // ============ ANDREAS - Legal, korrekt aber menschlich ============
      { msg: 'Neue Datenschutzrichtlinien ab 01. des Monats.', type: 'update', author: 9 },
      { msg: 'Verträge für Huber Projekt sind unterschrieben.', type: 'post', author: 9 },
      { msg: 'Compliance-Schulung für alle Mitarbeiter geplant.', type: 'announcement', author: 9 },
      { msg: 'NDA ist freigegeben, kann rausgeschickt werden', type: 'post', author: 9 },
      { msg: 'vertrag ist geprüft, keine einwände', type: 'post', author: 9 },
      { msg: 'die neue DSGVO regelung betrifft uns nicht direkt', type: 'post', author: 9 },
      { msg: 'bitte keine verträge ohne mein ok rausschicken', type: 'update', author: 9 },
      
      // ============ SANDRA - Finance, präzise ============
      { msg: 'Rechnungen für September sind raus.', type: 'post', author: 10 },
      { msg: 'Bitte Timesheets bis Freitag eintragen.', type: 'update', author: 10 },
      { msg: 'Spesenabrechnung bitte mit Belegen einreichen', type: 'update', author: 10 },
      { msg: 'Zahlungseingänge von diese Woche sind verbucht', type: 'post', author: 10 },
      { msg: 'hat jemand die rechnung von dem caterer?', type: 'post', author: 10 },
      { msg: 'budget ist freigegeben, könnt bestellen', type: 'post', author: 10 },
      
      // ============ PETER - Operations, praktisch ============
      { msg: 'Neues Onboarding-Template ist live. Bitte nutzen!', type: 'update', author: 11 },
      { msg: 'Parkplatz 5 ist diese Woche gesperrt.', type: 'update', author: 11 },
      { msg: 'Office-Renovierung startet am Wochenende.', type: 'update', author: 11 },
      { msg: 'meetingraum 2 ist diese woche nicht verfügbar', type: 'update', author: 11 },
      { msg: 'drucker im 2. stock funktioniert wieder', type: 'post', author: 11 },
      { msg: 'klopapier is wieder aufgefüllt lol', type: 'post', author: 11 },
      { msg: 'wer wars der die klimaanlage verstellt hat? 😅', type: 'post', author: 11 },
      { msg: 'neuer wasserspender steht in der küche', type: 'post', author: 11 },
      
      // ============ MARIA - Customer Success, empathisch ============
      { msg: 'Support-Tickets heute alle bearbeitet ✅', type: 'post', author: 12 },
      { msg: 'NPS gestiegen auf 72! Danke an alle 💪', type: 'announcement', author: 12 },
      { msg: 'Onboarding für Meier AG erfolgreich abgeschlossen.', type: 'post', author: 12 },
      { msg: 'Churn Rate auf Rekordtief! 0.8% 🎯', type: 'announcement', author: 12 },
      { msg: 'kunde hat 5 sterne bewertung gegeben 🌟', type: 'post', author: 12 },
      { msg: 'neues help center artikel ist live', type: 'post', author: 12 },
      { msg: 'der kunde war anfangs sauer aber jetzt total zufrieden', type: 'post', author: 12 },
      { msg: 'hab heut 3 kunden calls gehabt, alle positiv', type: 'post', author: 12 },
      { msg: 'wer kann beim onboarding morgen helfen?', type: 'post', author: 12 },
      
      // ============ FLORIAN - Product Manager, strukturiert ============
      { msg: 'Release 2.4 ist live! Neue Dashboard-Features.', type: 'announcement', author: 13 },
      { msg: 'Sprint Review heute 15:00. Alle willkommen.', type: 'update', author: 13 },
      { msg: 'roadmap für Q1 ist fertig, review morgen', type: 'post', author: 13 },
      { msg: 'user research ergebnisse sind da, sehr interessant', type: 'post', author: 13 },
      { msg: 'backlog grooming um 14 uhr, bitte teilnehmen', type: 'update', author: 13 },
      { msg: 'das neue feature kommt gut an bei den usern', type: 'post', author: 13 },
      { msg: 'müssen nochmal über die priorisierung reden', type: 'post', author: 13 },
      { msg: 'hab feedback von 5 kunden eingeholt, sehr hilfreich', type: 'post', author: 13 },
      
      // ============ STEFANIE - UX Designer, kreativ ============
      { msg: 'Neue UI-Designs für Mobile sind fertig. Feedback willkommen!', type: 'post', author: 14 },
      { msg: 'Dark Mode ist jetzt verfügbar!', type: 'announcement', author: 14 },
      { msg: 'Prototyp für neues Feature ist in Figma', type: 'post', author: 14 },
      { msg: 'usability test war erfolgreich, paar kleine änderungen kommen', type: 'post', author: 14 },
      { msg: 'design system update kommt diese woche', type: 'update', author: 14 },
      { msg: 'die farben sind jetzt konsistenter im ganzen produkt', type: 'post', author: 14 },
      { msg: 'hab user interviews gemacht, spannende insights', type: 'post', author: 14 },
      { msg: 'wer schaut sich mal den neuen flow an?', type: 'post', author: 14 },
      
      // ============ MAX - Junior Dev, lernend, unsicher ============
      { msg: 'hab den bug gefunden, war ein typo im code 😅', type: 'post', author: 15 },
      { msg: 'tests laufen alle durch jetzt', type: 'post', author: 15 },
      { msg: 'kann jemand bei dem merge conflict helfen?', type: 'post', author: 15 },
      { msg: 'dokumentation für die API ist aktualisiert', type: 'post', author: 15 },
      { msg: 'sorry der fehler war von mir, hab ihn gefixt', type: 'post', author: 15 },
      { msg: 'versteh den code noch nicht ganz, kann mir jmd erklären?', type: 'post', author: 15 },
      { msg: 'danke @markus für die hilfe!', type: 'post', author: 15 },
      { msg: 'mein erster PR wurde gemerged! 🎉', type: 'post', author: 15 },
      
      // ============ KATHARINA - Senior Sales, selbstbewusst ============
      { msg: 'großer deal ist signed! 300k ARR 🎉🎉', type: 'announcement', author: 16 },
      { msg: 'kunde ist super happy mit der lösung', type: 'post', author: 16 },
      { msg: 'nächste woche 3 wichtige termine, drückt mir die daumen', type: 'post', author: 16 },
      { msg: 'wer hat erfahrung mit enterprise kunden im healthcare bereich?', type: 'post', author: 16 },
      { msg: 'hab grad nen 400k deal in der pipeline 🔥', type: 'post', author: 16 },
      { msg: 'die verhandlungen waren hart aber erfolgreich', type: 'post', author: 16 },
      { msg: 'freu mich auf die provision haha', type: 'post', author: 16 },
      
      // ============ CHRISTOPH - DevOps, technisch, trocken ============
      { msg: 'deployment war erfolgreich, keine issues', type: 'post', author: 17 },
      { msg: 'monitoring alerts sind angepasst', type: 'post', author: 17 },
      { msg: 'kubernetes cluster läuft stabil', type: 'post', author: 17 },
      { msg: 'backup von letzte nacht war erfolgreich', type: 'post', author: 17 },
      { msg: 'die server sind alle grün', type: 'post', author: 17 },
      { msg: 'hab die logs gecheckt, sieht sauber aus', type: 'post', author: 17 },
      { msg: 'uptime 99.99% diesen monat 💪', type: 'post', author: 17 },
      
      // ============ NINA - Content, kreativ ============
      { msg: 'blogpost ist online, bitte teilen!', type: 'post', author: 18 },
      { msg: 'case study mit Müller AG ist fertig', type: 'post', author: 18 },
      { msg: 'content kalender für näcshten monat steht', type: 'update', author: 18 },
      { msg: 'video testimonial ist geschnitten, sieht super aus', type: 'post', author: 18 },
      { msg: 'wer kann mir beim korrekturlesen helfen?', type: 'post', author: 18 },
      { msg: 'der artikel is viral gegangen 🚀', type: 'post', author: 18 },
      { msg: 'hab 3 neue blogpost ideen, feedback?', type: 'post', author: 18 },
      
      // ============ DAVID - Data Analyst, präzise ============
      { msg: 'monatlicher report ist fertig, im drive', type: 'post', author: 19 },
      { msg: 'interessante insights aus den nutzerdaten', type: 'post', author: 19 },
      { msg: 'dashboard ist geupdated mit neuen metriken', type: 'post', author: 19 },
      { msg: 'conversion rate ist um 15% gestiegen 📈', type: 'announcement', author: 19 },
      { msg: 'die zahlen zeigen dass feature X gut ankommt', type: 'post', author: 19 },
      { msg: 'hab ne anomalie in den daten gefunden, schau ich mir an', type: 'post', author: 19 },
      
      // ============ LAURA - Account Manager, beziehungsorientiert ============
      { msg: 'kunde möchte upgraden auf enterprise paket!', type: 'post', author: 20 },
      { msg: 'quarterly review mit Schneider AG war positiv', type: 'post', author: 20 },
      { msg: 'churn risiko bei einem kunden, brauche support', type: 'post', author: 20 },
      { msg: 'hab heut mit 5 kunden telefoniert, alle happy', type: 'post', author: 20 },
      { msg: 'der kunde feiert sein 1-jähriges mit uns 🎉', type: 'post', author: 20 },
      { msg: 'upsell opportunity bei der Meier GmbH', type: 'post', author: 20 },
      
      // ============ SIMON - Backend Dev, fokussiert ============
      { msg: 'neue API endpoints sind deployed', type: 'post', author: 21 },
      { msg: 'performance optimization ist live', type: 'post', author: 21 },
      { msg: 'cache layer funktoiniert jetzt richtig', type: 'post', author: 21 },
      { msg: 'der query is jetzt 10x schneller', type: 'post', author: 21 },
      { msg: 'hab die datenbank optimiert, läuft smooth', type: 'post', author: 21 },
      
      // ============ MELANIE - QA, gründlich ============
      { msg: 'alle testfälle sind grün ✅', type: 'post', author: 22 },
      { msg: 'hab noch 2 bugs gefunden, tickets sind erstellt', type: 'post', author: 22 },
      { msg: 'regression tests laufen durch', type: 'post', author: 22 },
      { msg: 'edge case gefunden, @markus kannst du dir anschauen?', type: 'post', author: 22 },
      { msg: 'release ist getestet und approved 👍', type: 'post', author: 22 },
      { msg: 'hab 47 testfälle geschrieben für das neue feature', type: 'post', author: 22 },
      
      // ============ PATRICK - SDR, motiviert ============
      { msg: 'hab heute 15 calls gemacht, 3 interessenten', type: 'post', author: 23 },
      { msg: 'neuer lead sieht sehr vielversprechend aus', type: 'post', author: 23 },
      { msg: 'outbound kampagne läuft gut diese woche', type: 'post', author: 23 },
      { msg: 'endlich durchgekommen bei dem großen account!', type: 'post', author: 23 },
      { msg: 'meine pipeline wächst 📈', type: 'post', author: 23 },
      { msg: 'cold calling is tough aber es lohnt sich', type: 'post', author: 23 },
      
      // ============ SABRINA - Support, hilfsbereit ============
      { msg: 'ticket queue ist leer, alles bearbeitet 🎉', type: 'post', author: 24 },
      { msg: 'häufige fragen FAQ ist aktualisiert', type: 'post', author: 24 },
      { msg: 'kunde hatte technisches problem, ist gelöst', type: 'post', author: 24 },
      { msg: 'heute war viel los, 30+ tickets', type: 'post', author: 24 },
      { msg: 'der bug den kunde gemeldet hat is wichtig', type: 'post', author: 24 },
      { msg: 'kunden sind heute echt freundlich gewesen ❤️', type: 'post', author: 24 },
      
      // ============ DANIEL - Frontend Dev, detailiert ============
      { msg: 'neue komponente ist fertig, PR ist offen', type: 'post', author: 25 },
      { msg: 'responsive design fix ist deployed', type: 'post', author: 25 },
      { msg: 'lighthouse score ist jetzt bei 95 🚀', type: 'post', author: 25 },
      { msg: 'die animation is jetzt smooth', type: 'post', author: 25 },
      { msg: 'css bug gefixt der mich wahnsinnig gemacht hat', type: 'post', author: 25 },
      { msg: 'hab die bundle size um 20% reduziert', type: 'post', author: 25 },
      
      // ============ MARTINA - Office Manager, organisiert ============
      { msg: 'paket von amazon ist angekommen, liegt am empfang', type: 'post', author: 26 },
      { msg: 'küche wird morgen gereinigt, bitte aufräumen', type: 'update', author: 26 },
      { msg: 'meetingraum buchungen bitte über den kalender', type: 'update', author: 26 },
      { msg: 'post is da, wer erwartet was?', type: 'post', author: 26 },
      { msg: 'die pflanzen wurden gegossen 🌱', type: 'post', author: 26 },
      { msg: 'wer hat meinen kugelschreiber genommen? 😤', type: 'post', author: 26 },
      { msg: 'snacks sind wieder aufgefüllt', type: 'post', author: 26 },
      
      // ============ TOBIAS - Project Manager, organisiert ============
      { msg: 'projekt timeline ist aktualisiert', type: 'update', author: 27 },
      { msg: 'milestone erreicht! 🎯', type: 'post', author: 27 },
      { msg: 'sprint planning morgen um 10', type: 'update', author: 27 },
      { msg: 'ressourcenplanung für Q1 ist fertig', type: 'post', author: 27 },
      { msg: 'projekt läuft im zeitplan 👍', type: 'post', author: 27 },
      { msg: 'müssen deadline nochmal besprechen', type: 'post', author: 27 },
      { msg: 'retro hat gute insights gebracht', type: 'post', author: 27 },
      
      // ============ CLAUDIA - BizDev, strategisch ============
      { msg: 'neuer partner ist interessiert, meeting next week', type: 'post', author: 28 },
      { msg: 'marktanalyse ist fertig, ergebnisse im meeting', type: 'post', author: 28 },
      { msg: 'konkurrenz hat neues produkt gelaunched, fyi', type: 'post', author: 28 },
      { msg: 'partnership gespräche laufen gut', type: 'post', author: 28 },
      { msg: 'hab interessanten kontakt auf der messe gemacht', type: 'post', author: 28 },
      
      // ============ ALEXANDER - Security, vorsichtig ============
      { msg: 'security audit bestanden! keine kritischen findings', type: 'announcement', author: 29 },
      { msg: 'passwort policy wurde verschärft', type: 'update', author: 29 },
      { msg: 'phishing simulation nächste woche, bitte nicht weitersagen 😉', type: 'post', author: 29 },
      { msg: 'alle systeme gepatcht, wir sind secure', type: 'post', author: 29 },
      { msg: 'bitte keine passwörter per slack schicken!', type: 'update', author: 29 },
      { msg: '2FA ist jetzt pflicht für alle', type: 'update', author: 29 },
    ];

    // Shuffle messages for natural distribution across all team members
    const shuffledMessages = [...MESSAGES].sort(() => Math.random() - 0.5);
    
    // Generate timestamps over last 7 months
    const now = new Date();
    const insertedItems: any[] = [];
    
    for (let i = 0; i < shuffledMessages.length; i++) {
      const msgData = shuffledMessages[i];
      const author = TEAM[msgData.author];
      
      // Spread across 7 months (210 days)
      const daysAgo = Math.floor((i / shuffledMessages.length) * 210);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      
      // Working hours: 09:00 - 18:00
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
      
      // Skip weekends
      const day = date.getDay();
      if (day === 0) date.setDate(date.getDate() + 1);
      if (day === 6) date.setDate(date.getDate() + 2);

      await db.execute(sql`
        INSERT INTO team_feed (
          actor_user_id, actor_name, author_user_id, author_name,
          action_type, entity_type, entity_id, title, body, message, type, meta, created_at
        ) VALUES (
          ${author.id}, ${author.name}, ${author.id}, ${author.name},
          'post', NULL, NULL, ${msgData.msg.substring(0, 100)}, ${msgData.msg}, ${msgData.msg},
          ${msgData.type}, '{}'::jsonb, ${date.toISOString()}
        )
      `);
      
      insertedItems.push({ date: date.toISOString(), author: author.name, msg: msgData.msg.substring(0, 40) + '...' });
    }

    logger.info(`[TEAM-FEED] Seeded ${insertedItems.length} historical messages`);
    res.json({ success: true, count: insertedItems.length, items: insertedItems });
  } catch (error: any) {
    logger.error('[TEAM-FEED] Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TEAM CALENDAR - Shared calendar events
// ============================================================================

router.get('/team-calendar', requireInternal, async (req: any, res) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const events = await db
      .select({
        id: teamCalendar.id,
        title: teamCalendar.title,
        description: teamCalendar.description,
        startsAt: teamCalendar.startsAt,
        endsAt: teamCalendar.endsAt,
        allDay: teamCalendar.allDay,
        location: teamCalendar.location,
        color: teamCalendar.color,
        createdByUserId: teamCalendar.createdByUserId,
        creatorUsername: users.username,
      })
      .from(teamCalendar)
      .leftJoin(users, eq(teamCalendar.createdByUserId, users.id))
      .where(gte(teamCalendar.startsAt, now))
      .orderBy(teamCalendar.startsAt)
      .limit(20);

    res.json({ events, total: events.length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching calendar:', error.message);
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return res.json({ events: [], total: 0, _warning: 'Table not yet created - run migration' });
    }
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

router.post('/team-calendar', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      startsAt: z.string().transform(s => new Date(s)),
      endsAt: z.string().optional().transform(s => s ? new Date(s) : undefined),
      allDay: z.boolean().optional().default(false),
      location: z.string().optional(),
      color: z.string().optional().default('#FE9100'),
    });

    const data = schema.parse(req.body);
    
    const [event] = await db
      .insert(teamCalendar)
      .values({
        title: data.title,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        allDay: data.allDay,
        location: data.location,
        color: data.color,
        createdByUserId: userId,
      })
      .returning();

    res.status(201).json(event);
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error creating calendar event:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// TEAM TODOS - Shared task list
// ============================================================================

router.get('/team-todos', requireInternal, async (req: any, res) => {
  try {
    const status = req.query.status as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    let query = db
      .select({
        id: teamTodos.id,
        title: teamTodos.title,
        description: teamTodos.description,
        dueAt: teamTodos.dueAt,
        priority: teamTodos.priority,
        status: teamTodos.status,
        assignedToUserId: teamTodos.assignedToUserId,
        assignedUsername: users.username,
        createdByUserId: teamTodos.createdByUserId,
        completedAt: teamTodos.completedAt,
        createdAt: teamTodos.createdAt,
      })
      .from(teamTodos)
      .leftJoin(users, eq(teamTodos.assignedToUserId, users.id))
      .orderBy(teamTodos.dueAt, teamTodos.createdAt)
      .limit(limit);

    // Filter by status if provided
    const todos = status && status !== 'all'
      ? await query.where(eq(teamTodos.status, status))
      : await query.where(ne(teamTodos.status, 'done'));

    res.json({ todos, total: todos.length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching todos:', error.message);
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return res.json({ todos: [], total: 0, _warning: 'Table not yet created - run migration' });
    }
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

router.post('/team-todos', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      dueAt: z.string().optional().transform(s => s ? new Date(s) : undefined),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
      assignedToUserId: z.string().optional(),
    });

    const data = schema.parse(req.body);
    
    const [todo] = await db
      .insert(teamTodos)
      .values({
        title: data.title,
        description: data.description,
        dueAt: data.dueAt,
        priority: data.priority,
        assignedToUserId: data.assignedToUserId,
        createdByUserId: userId,
        status: 'pending',
      })
      .returning();

    res.status(201).json(todo);
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error creating todo:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.patch('/team-todos/:id', requireInternal, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status, title, dueAt, priority } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (title) updates.title = title;
    if (dueAt) updates.dueAt = new Date(dueAt);
    if (priority) updates.priority = priority;
    if (status === 'done') updates.completedAt = new Date();
    if (status === 'pending' || status === 'in_progress') updates.completedAt = null;

    const [todo] = await db
      .update(teamTodos)
      .set(updates)
      .where(eq(teamTodos.id, parseInt(id)))
      .returning();

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(todo);
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error updating todo:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// ACTIVE USERS - Online staff/admin
// ============================================================================

router.get('/active-users', requireInternal, async (req: any, res) => {
  try {
    // Get all staff/admin users - actual online status tracked via sessions
    const staffUsers = await db
      .select({
        id: users.id,
        username: users.username,
        userRole: users.userRole,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        or(
          eq(users.userRole, 'staff'),
          eq(users.userRole, 'admin')
        )
      )
      .orderBy(desc(users.updatedAt));

    res.json({ 
      users: staffUsers, 
      count: staffUsers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching active users:', error.message);
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return res.json({ users: [], count: 0, timestamp: new Date().toISOString(), _warning: 'Table not yet created' });
    }
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
});

// ============================================================================
// CONTRACTS PENDING - Awaiting approval
// ============================================================================

router.get('/contracts/pending', requireInternal, async (req: any, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    const userRole = req.user?.userRole || req.session?.userRole;
    
    // Get all pending contracts (for admins) or assigned contracts (for staff)
    const allContracts = contractService.getAllContracts?.() || [];
    
    const pendingContracts = allContracts.filter((c: any) => {
      if (c.status !== 'pending_approval' && c.status !== 'pending') return false;
      // Admin sees all, staff sees only their assigned
      if (userRole === 'admin') return true;
      return c.assignedUserId === userId;
    });

    res.json({ 
      contracts: pendingContracts.slice(0, 10),
      total: pendingContracts.length 
    });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching pending contracts:', error.message);
    // Always return empty array on error - contracts are file-based
    res.json({ contracts: [], total: 0 });
  }
});

// ============================================================================
// ACTION CENTER - Next best actions
// ============================================================================

router.get('/action-center', requireInternal, async (req: any, res) => {
  try {
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get overdue and upcoming todos
    const urgentTodos = await db
      .select({
        id: teamTodos.id,
        title: teamTodos.title,
        dueAt: teamTodos.dueAt,
        priority: teamTodos.priority,
        type: sql<string>`'todo'`.as('type'),
      })
      .from(teamTodos)
      .where(
        and(
          ne(teamTodos.status, 'done'),
          or(
            lte(teamTodos.dueAt, endOfWeek),
            isNull(teamTodos.dueAt)
          )
        )
      )
      .orderBy(teamTodos.dueAt)
      .limit(5);

    // Get upcoming calendar events
    const upcomingEvents = await db
      .select({
        id: teamCalendar.id,
        title: teamCalendar.title,
        dueAt: teamCalendar.startsAt,
        priority: sql<string>`'medium'`.as('priority'),
        type: sql<string>`'event'`.as('type'),
      })
      .from(teamCalendar)
      .where(
        and(
          gte(teamCalendar.startsAt, now),
          lte(teamCalendar.startsAt, endOfWeek)
        )
      )
      .orderBy(teamCalendar.startsAt)
      .limit(5);

    // Combine and sort actions
    const actions = [...urgentTodos, ...upcomingEvents]
      .sort((a, b) => {
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      })
      .slice(0, 8);

    res.json({ actions, total: actions.length });
  } catch (error: any) {
    logger.error('[COMMAND-CENTER] Error fetching action center:', error.message);
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return res.json({ actions: [], total: 0, _warning: 'Tables not yet created - run migration' });
    }
    res.status(500).json({ error: 'Failed to fetch action center' });
  }
});

// ============================================================================
// AI INTELLIGENCE - Computed insights from CRM data
// ============================================================================

router.get('/ai-intelligence', async (req: any, res) => {
  try {
    const range = (req.query.range as string) || '24h';
    
    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Gather data for insights
    const [
      recentDeals,
      recentTasks,
      recentCalls,
      pendingContracts,
      recentContacts,
      recentFeed,
    ] = await Promise.all([
      // Deals with stage info
      db.select()
        .from(internalDeals)
        .where(gte(internalDeals.updatedAt, startDate))
        .orderBy(desc(internalDeals.updatedAt))
        .limit(50),
      
      // Tasks
      db.select()
        .from(internalTasks)
        .where(gte(internalTasks.updatedAt, startDate))
        .orderBy(desc(internalTasks.updatedAt))
        .limit(50),
      
      // Call logs
      db.select()
        .from(internalCallLogs)
        .where(gte(internalCallLogs.createdAt, startDate))
        .orderBy(desc(internalCallLogs.createdAt))
        .limit(50),
      
      // Pending contracts - use file-based service
      Promise.resolve(
        contractService.getAllContracts()
          .filter(c => c.status === 'pending_approval')
          .slice(0, 20)
      ),
      
      // New contacts
      db.select()
        .from(internalContacts)
        .where(gte(internalContacts.createdAt, startDate))
        .limit(30),
      
      // Recent feed activity
      db.select()
        .from(teamFeed)
        .where(gte(teamFeed.createdAt, startDate))
        .orderBy(desc(teamFeed.createdAt))
        .limit(30),
    ]);

    // Compute insights
    const highlights: Array<{
      id: string;
      title: string;
      severity: 'info' | 'warning' | 'success';
      tag: string;
      entityType?: string;
      entityId?: string;
      text: string;
    }> = [];

    const risks: Array<{
      id: string;
      title: string;
      severity: 'low' | 'medium' | 'high';
      entityType?: string;
      entityId?: string;
      text: string;
    }> = [];

    const actions: Array<{
      id: string;
      title: string;
      dueAt?: string;
      entityType?: string;
      entityId?: string;
      ctaLabel: string;
    }> = [];

    // === HIGHLIGHTS ===
    
    // New contacts
    if (recentContacts.length > 0) {
      highlights.push({
        id: 'new-contacts',
        title: `${recentContacts.length} neue Kontakte`,
        severity: 'success',
        tag: 'CRM',
        text: `${recentContacts.length} neue Kontakte wurden in den letzten ${range === 'today' ? 'heute' : range === '7d' ? '7 Tagen' : '24 Stunden'} erstellt.`,
      });
    }

    // Deals won
    const dealsWon = recentDeals.filter(d => d.stage === 'CLOSED_WON');
    if (dealsWon.length > 0) {
      const totalValue = dealsWon.reduce((sum, d) => sum + (d.value || 0), 0);
      highlights.push({
        id: 'deals-won',
        title: `${dealsWon.length} Deal${dealsWon.length > 1 ? 's' : ''} gewonnen`,
        severity: 'success',
        tag: 'Sales',
        text: `Gewonnene Deals mit einem Gesamtwert von €${(totalValue / 100).toLocaleString('de-DE')}.`,
      });
    }

    // Tasks completed
    const tasksCompleted = recentTasks.filter(t => t.status === 'DONE');
    if (tasksCompleted.length > 0) {
      highlights.push({
        id: 'tasks-completed',
        title: `${tasksCompleted.length} Tasks erledigt`,
        severity: 'success',
        tag: 'Productivity',
        text: `Das Team hat ${tasksCompleted.length} Aufgaben abgeschlossen.`,
      });
    }

    // Calls made
    if (recentCalls.length > 0) {
      const positiveCalls = recentCalls.filter(c => c.sentiment === 'POSITIVE');
      highlights.push({
        id: 'calls-summary',
        title: `${recentCalls.length} Anrufe`,
        severity: 'info',
        tag: 'Calls',
        text: `${recentCalls.length} Anrufe durchgeführt, davon ${positiveCalls.length} mit positivem Ergebnis.`,
      });
    }

    // === RISKS ===

    // Overdue tasks
    const overdueTasks = recentTasks.filter(t => 
      t.status !== 'DONE' && 
      t.status !== 'CANCELLED' && 
      t.dueDate && 
      new Date(t.dueDate) < now
    );
    if (overdueTasks.length > 0) {
      risks.push({
        id: 'overdue-tasks',
        title: `${overdueTasks.length} überfällige Tasks`,
        severity: overdueTasks.length > 5 ? 'high' : overdueTasks.length > 2 ? 'medium' : 'low',
        text: `${overdueTasks.length} Aufgaben sind überfällig und benötigen Aufmerksamkeit.`,
      });
    }

    // Pending contracts
    if (pendingContracts.length > 0) {
      risks.push({
        id: 'pending-contracts',
        title: `${pendingContracts.length} Verträge warten auf Freigabe`,
        severity: pendingContracts.length > 3 ? 'high' : 'medium',
        text: `${pendingContracts.length} Vertrag${pendingContracts.length > 1 ? 'e' : ''} benötigt Genehmigung.`,
      });
    }

    // Stuck deals (in same stage for too long)
    const stuckDeals = recentDeals.filter(d => {
      if (d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST') return false;
      const daysSinceUpdate = (now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    });
    if (stuckDeals.length > 0) {
      risks.push({
        id: 'stuck-deals',
        title: `${stuckDeals.length} stagnierende Deals`,
        severity: stuckDeals.length > 3 ? 'high' : 'medium',
        entityType: 'deal',
        entityId: stuckDeals[0]?.id,
        text: `${stuckDeals.length} Deal${stuckDeals.length > 1 ? 's' : ''} hatte seit über 7 Tagen keine Aktivität.`,
      });
    }

    // Negative call outcomes
    const negativeCalls = recentCalls.filter(c => c.sentiment === 'NEGATIVE');
    if (negativeCalls.length > 2) {
      risks.push({
        id: 'negative-calls',
        title: `${negativeCalls.length} negative Anrufe`,
        severity: 'medium',
        text: `${negativeCalls.length} Anrufe mit negativem Ergebnis - Gesprächsstrategie prüfen.`,
      });
    }

    // === ACTIONS ===

    // Oldest overdue task
    if (overdueTasks.length > 0) {
      const oldestOverdue = overdueTasks.sort((a, b) => 
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )[0];
      actions.push({
        id: 'action-overdue-task',
        title: oldestOverdue.title,
        dueAt: oldestOverdue.dueDate?.toISOString(),
        entityType: 'task',
        entityId: oldestOverdue.id,
        ctaLabel: 'Task öffnen',
      });
    }

    // Pending contract to approve
    if (pendingContracts.length > 0) {
      const oldestContract = pendingContracts[0];
      actions.push({
        id: 'action-approve-contract',
        title: `Vertrag freigeben: ${(oldestContract as any).title || 'Unbenannt'}`,
        entityType: 'contract',
        entityId: (oldestContract as any).id,
        ctaLabel: 'Freigeben',
      });
    }

    // Deal needing follow-up
    if (stuckDeals.length > 0) {
      const priorityDeal = stuckDeals.sort((a, b) => (b.value || 0) - (a.value || 0))[0];
      actions.push({
        id: 'action-followup-deal',
        title: `Follow-up: ${priorityDeal.title}`,
        entityType: 'deal',
        entityId: priorityDeal.id,
        ctaLabel: 'Deal öffnen',
      });
    }

    // Open tasks to complete
    const openTasks = recentTasks.filter(t => t.status === 'OPEN').slice(0, 2);
    for (const task of openTasks) {
      actions.push({
        id: `action-task-${task.id}`,
        title: task.title,
        dueAt: task.dueDate?.toISOString(),
        entityType: 'task',
        entityId: task.id,
        ctaLabel: 'Erledigen',
      });
    }

    res.json({
      range,
      generatedAt: now.toISOString(),
      stats: {
        deals: recentDeals.length,
        tasks: recentTasks.length,
        calls: recentCalls.length,
        contacts: recentContacts.length,
        feedItems: recentFeed.length,
      },
      highlights: highlights.slice(0, 5),
      risks: risks.slice(0, 5),
      actions: actions.slice(0, 5),
    });

  } catch (error: any) {
    console.error('[AI-INTELLIGENCE] Error:', error);
    // Return graceful fallback instead of 500
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return res.json({
        range: req.query.range || '24h',
        generatedAt: new Date().toISOString(),
        stats: { deals: 0, tasks: 0, calls: 0, contacts: 0, feedItems: 0 },
        highlights: [],
        risks: [],
        actions: [],
        _warning: 'Some tables not yet created - run migration for full insights'
      });
    }
    res.json({
      range: req.query.range || '24h',
      generatedAt: new Date().toISOString(),
      stats: { deals: 0, tasks: 0, calls: 0, contacts: 0, feedItems: 0 },
      highlights: [],
      risks: [{ id: 'error', title: 'AI temporarily unavailable', severity: 'low', text: 'Could not generate insights at this time.' }],
      actions: [],
      _error: error.message
    });
  }
});

// ============================================================================
// AI SUMMARY - Gemini-powered executive summaries
// ============================================================================

router.get('/ai-summary', requireInternal, async (req: any, res) => {
  try {
    const range = (req.query.range as string) || '24h';
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Gather data with graceful fallbacks
    let deals: any[] = [];
    let tasks: any[] = [];
    let calls: any[] = [];
    let contacts: any[] = [];
    let feedItems: any[] = [];
    let pendingContracts: any[] = [];

    try {
      deals = await db.select().from(internalDeals).where(gte(internalDeals.updatedAt, startDate)).limit(50);
    } catch (e) { /* table may not exist */ }

    try {
      tasks = await db.select().from(internalTasks).where(gte(internalTasks.updatedAt, startDate)).limit(50);
    } catch (e) { /* table may not exist */ }

    try {
      calls = await db.select().from(internalCallLogs).where(gte(internalCallLogs.createdAt, startDate)).limit(50);
    } catch (e) { /* table may not exist */ }

    try {
      contacts = await db.select().from(internalContacts).where(gte(internalContacts.createdAt, startDate)).limit(30);
    } catch (e) { /* table may not exist */ }

    try {
      feedItems = await db.select().from(teamFeed).where(gte(teamFeed.createdAt, startDate)).limit(30);
    } catch (e) { /* table may not exist */ }

    try {
      pendingContracts = contractService.getAllContracts().filter(c => c.status === 'pending_approval');
    } catch (e) { /* service may fail */ }

    // Generate AI insights
    const insights = await geminiAI.generateInsights({
      range: range as '24h' | '7d' | 'today',
      data: { deals, tasks, calls, contacts, feedItems, pendingContracts }
    });

    res.json({
      ...insights,
      aiConfigured: geminiAI.isAIConfigured(),
      provider: geminiAI.getAIProvider(),
    });

  } catch (error: any) {
    logger.error('[AI-SUMMARY] Error:', error.message);
    res.json({
      summary: 'KI-Analyse vorübergehend nicht verfügbar.',
      keyChanges: [],
      risksAndBlockers: [],
      nextBestActions: ['Dashboard manuell prüfen'],
      whoShouldDoWhat: [],
      generatedAt: new Date().toISOString(),
      provider: 'error',
      cached: false,
      aiConfigured: geminiAI.isAIConfigured(),
      _error: error.message,
    });
  }
});

// AI status endpoint
router.get('/ai-status', requireInternal, async (req: any, res) => {
  res.json({
    configured: geminiAI.isAIConfigured(),
    provider: geminiAI.getAIProvider(),
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  });
});

export default router;
