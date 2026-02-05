/**
 * ============================================================================
 * TEAM CALENDAR - EXECUTIVE TIME COMMAND CENTER
 * ============================================================================
 * Schwarzott Group · Executive Level · Zeit ist Kapital
 * 
 * - Premium Glassmorphism Container
 * - Timeline Pills Navigation
 * - Day Focus View (nicht Monatschaos)
 * - Event Cards mit Type Markers
 * - Hover Cards für Quick Preview
 * - Event Detail Drawer (Executive Folder)
 * - 50+ Mock Events mit Rich Data
 * ============================================================================
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Users, Building2, Briefcase, 
  Info, ChevronLeft, ChevronRight, Star, X, Pencil,
  Trash2, Save, Plus, RefreshCw, Loader2, AlertCircle
} from 'lucide-react';
import { format, addDays, subDays, isToday, isSameDay, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addWeeks, subWeeks, addMonths, subMonths, isSameMonth, getHours, getMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast-provider';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============================================================================
// TYPES
// ============================================================================

type EventType = 'team-meeting' | 'verwaltungsrat' | 'aufsichtsrat' | 'feiertag' | 'intern' | 'INTERN' | 'TEAM_MEETING' | 'VERWALTUNGSRAT' | 'AUFSICHTSRAT' | 'FEIERTAG' | 'DEADLINE' | 'EXTERNAL' | 'BOARD' | 'FINANCE' | 'PRODUCT' | 'SALES' | 'OPS' | 'HR' | 'LEGAL' | 'HOLIDAY' | 'BIRTHDAY';
type CalendarView = 'day' | 'week' | 'month';
type DrawerMode = 'view' | 'edit' | 'create';
type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
type ContextTag = 'strategie' | 'organisation' | 'finance' | 'board' | 'intern' | 'legal' | 'hr' | 'tech';

interface Participant {
  id: string;
  name: string;
  role: string;
  initials: string;
}

interface CalendarEvent {
  id: string | number;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  startsAt?: Date | string;
  endsAt?: Date | string;
  type: EventType;
  eventType?: string;
  recurring?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  recurrence?: {
    freq?: string;
    byweekday?: string[];
    bysetpos?: number;
  };
  participants?: Participant[];
  contextTags?: ContextTag[] | string[];
  internalNotes?: string;
  isReadOnly?: boolean;
  visibility?: string;
  color?: string;
  createdByUserId?: string;
  creatorUsername?: string;
}

// API Response type
interface APICalendarEvent {
  id: number;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  location?: string;
  color?: string;
  eventType?: string;
  isReadOnly?: boolean;
  visibility?: string;
  recurrence?: any;
  internalNotes?: string;
  contextTags?: string[];
  createdByUserId?: string;
  creatorUsername?: string;
}

// ============================================================================
// MOCK PARTICIPANTS
// ============================================================================

const MOCK_PARTICIPANTS: Record<string, Participant> = {
  'js': { id: 'js', name: 'Justin Schwarzott', role: 'Verwaltungsrat', initials: 'JS' },
  'hs': { id: 'hs', name: 'Herbert Schöttl', role: 'COO', initials: 'HS' },
  'mw': { id: 'mw', name: 'Michael Weber', role: 'CFO', initials: 'MW' },
  'ak': { id: 'ak', name: 'Anna Köhler', role: 'Legal Counsel', initials: 'AK' },
  'team': { id: 'team', name: 'Team Schwarzott Group', role: 'Gesamtes Team', initials: 'SG' },
  'vr': { id: 'vr', name: 'Verwaltungsrat', role: 'Gremium', initials: 'VR' },
  'ar': { id: 'ar', name: 'Aufsichtsrat', role: 'Gremium', initials: 'AR' },
  'vs': { id: 'vs', name: 'Vorstand', role: 'Geschäftsführung', initials: 'VS' },
};

const CONTEXT_TAG_LABELS: Record<ContextTag, string> = {
  'strategie': 'Strategie',
  'organisation': 'Organisation',
  'finance': 'Finance',
  'board': 'Board',
  'intern': 'Intern',
  'legal': 'Legal',
  'hr': 'HR',
  'tech': 'Tech',
}

// ============================================================================
// EVENT TYPE COLORS
// ============================================================================

// ARAS-only color palette (gold-light / orange / gold-dark + whites)
const EVENT_COLORS: Record<string, string> = {
  'team-meeting': '#ff6a00',
  'verwaltungsrat': '#e9d7c4',
  'aufsichtsrat': '#f5f5f7',
  'feiertag': '#6b7280',
  'intern': '#9ca3af',
  'INTERN': '#FE9100',
  'TEAM_MEETING': '#ff6a00',
  'VERWALTUNGSRAT': '#e9d7c4',
  'AUFSICHTSRAT': '#f5f5f7',
  'FEIERTAG': '#6B7280',
  'DEADLINE': '#FE9100',
  'EXTERNAL': '#e9d7c4',
  'BOARD': '#e9d7c4',
  'FINANCE': '#a34e00',
  'PRODUCT': '#ff6a00',
  'SALES': '#FE9100',
  'OPS': '#e9d7c4',
  'HR': '#c4a882',
  'LEGAL': '#a34e00',
  'HOLIDAY': '#6B7280',
  'BIRTHDAY': '#FE9100',
};

const EVENT_LABELS: Record<string, string> = {
  'team-meeting': 'Team Meeting',
  'verwaltungsrat': 'Verwaltungsrat',
  'aufsichtsrat': 'Aufsichtsrat',
  'feiertag': 'Feiertag',
  'intern': 'Intern',
  'INTERN': 'Intern',
  'TEAM_MEETING': 'Team Meeting',
  'VERWALTUNGSRAT': 'Verwaltungsrat',
  'AUFSICHTSRAT': 'Aufsichtsrat',
  'FEIERTAG': 'Feiertag',
  'DEADLINE': 'Deadline',
  'EXTERNAL': 'Extern',
  'BOARD': 'Board',
  'FINANCE': 'Finance',
  'PRODUCT': 'Product',
  'SALES': 'Sales',
  'OPS': 'Operations',
  'HR': 'HR',
  'LEGAL': 'Legal',
  'HOLIDAY': 'Feiertag',
  'BIRTHDAY': 'Geburtstag',
};

// Get event accent classes for stripe gradient
function getEventAccent(eventType: string): { stripe: string; badge: string } {
  const color = EVENT_COLORS[eventType] || '#FE9100';
  return {
    stripe: `linear-gradient(180deg, ${color}, ${color}88)`,
    badge: color,
  };
}

// ============================================================================
// MOCK EVENTS - 50+ Realistic Events (Feb 2026 - Aug 2026)
// ============================================================================

function generateMockEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  // Use Feb 2026 as base for 7-month window
  const baseDate = new Date(2026, 1, 1); // Feb 1, 2026
  const endDate = new Date(2026, 7, 31); // Aug 31, 2026
  
  // Helper to get nth weekday of month
  const getNthWeekdayOfMonth = (year: number, month: number, weekday: number, n: number): Date => {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    const day = 1 + offset + (n - 1) * 7;
    return new Date(year, month, day);
  };
  
  // Helper to get last weekday of month
  const getLastWeekdayOfMonth = (year: number, month: number): Date => {
    let lastDay = new Date(year, month + 1, 0);
    while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
      lastDay = addDays(lastDay, -1);
    }
    return lastDay;
  };

  // ========== A) RECURRING MEETINGS ==========
  
  // 1) Weekly Team Meeting (every Friday) 10:00-10:45, Remote
  for (let month = 1; month <= 7; month++) {
    const m = month; // Feb = 1, Mar = 2, etc. (0-indexed: 1 = Feb)
    for (let week = 0; week < 5; week++) {
      const friday = new Date(2026, m, 1);
      friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7) + (week * 7));
      if (friday.getMonth() === m && friday <= endDate) {
        events.push({
          id: `team-meeting-${m}-${week}`,
          title: 'Wöchentliches Team Meeting',
          description: 'Wöchentliches Team-Alignment zu laufenden Projekten, Prioritäten und offenen Punkten. Statusupdates aller Bereiche und Planung der kommenden Woche. Bitte Agenda-Punkte bis Donnerstag 18:00 einreichen.',
          date: friday,
          startTime: '10:00',
          endTime: '10:45',
          type: 'TEAM_MEETING',
          participants: [MOCK_PARTICIPANTS['team'], MOCK_PARTICIPANTS['js'], MOCK_PARTICIPANTS['hs']],
          contextTags: ['organisation', 'intern'],
          internalNotes: 'Remote via Zoom. Protokoll im Confluence.',
        });
      }
    }
  }
  
  // 2) Verwaltungsrat (every 2nd Friday) 16:30-18:00, Zürich / Remote
  const vrFridays = [
    new Date(2026, 1, 13), new Date(2026, 1, 27), // Feb
    new Date(2026, 2, 13), new Date(2026, 2, 27), // Mar
    new Date(2026, 3, 10), new Date(2026, 3, 24), // Apr
    new Date(2026, 4, 8), new Date(2026, 4, 22), // May
    new Date(2026, 5, 5), new Date(2026, 5, 19), // Jun
    new Date(2026, 6, 3), new Date(2026, 6, 17), new Date(2026, 6, 31), // Jul
    new Date(2026, 7, 14), new Date(2026, 7, 28), // Aug
  ];
  vrFridays.forEach((d, i) => {
    events.push({
      id: `verwaltungsrat-${i}`,
      title: 'Verwaltungsrat',
      description: 'Besprechung strategischer Entscheidungen, laufender Beteiligungen und Governance-Themen. Quartalszahlen, Investitionsentscheidungen und Risikobewertungen. Beschlussprotokoll wird innerhalb 48h versendet.',
      date: d,
      startTime: '16:30',
      endTime: '18:00',
      type: 'VERWALTUNGSRAT',
      participants: [MOCK_PARTICIPANTS['vr'], MOCK_PARTICIPANTS['js']],
      contextTags: ['board', 'strategie', 'finance'],
      internalNotes: 'Zürich / Remote. Vertraulich. Unterlagen nur über sicheren Kanal.',
    });
  });
  
  // 3) Aufsichtsrat (every 3rd Monday of month) 18:00-19:30, Remote
  for (let month = 1; month <= 7; month++) {
    const thirdMonday = getNthWeekdayOfMonth(2026, month, 1, 3);
    events.push({
      id: `aufsichtsrat-${month}`,
      title: 'Aufsichtsrat',
      description: 'Aufsichtsratssitzung mit Prüfung und Überwachung der Geschäftsführung. Bericht des Vorstands, Jahresabschluss-Prüfung und strategische Weichenstellungen. Einladung erfolgt 14 Tage im Voraus.',
      date: thirdMonday,
      startTime: '18:00',
      endTime: '19:30',
      type: 'AUFSICHTSRAT',
      participants: [MOCK_PARTICIPANTS['ar'], MOCK_PARTICIPANTS['vs']],
      contextTags: ['board', 'strategie'],
      internalNotes: 'Streng vertraulich. Nur autorisierte Teilnehmer. Remote.',
      isReadOnly: true,
    });
  }

  // ========== B) FINANCE / OPS ==========
  
  // Monatsabschluss (last business day each month) 18:30-19:30
  for (let month = 1; month <= 7; month++) {
    const lastBizDay = getLastWeekdayOfMonth(2026, month);
    events.push({
      id: `monatsabschluss-${month}`,
      title: 'Monatsabschluss Finance',
      description: 'Finaler Monatsabschluss mit Abstimmung aller Konten, Prüfung offener Posten und Erstellung des Management Reports. Alle Buchungen müssen bis 17:00 abgeschlossen sein.',
      date: lastBizDay,
      startTime: '18:30',
      endTime: '19:30',
      type: 'INTERN',
      contextTags: ['finance'],
      internalNotes: 'Finance Team + CFO. Keine Verschiebung möglich.',
    });
  }
  
  // Payroll Review (1x pro Monat, around 25th)
  for (let month = 1; month <= 7; month++) {
    events.push({
      id: `payroll-${month}`,
      title: 'Payroll Review',
      description: 'Prüfung der Gehaltsabrechnungen, Sonderzahlungen und Abzüge. Abstimmung mit HR zu Neueinstellungen und Austritten.',
      date: new Date(2026, month, 25),
      startTime: '11:30',
      endTime: '12:00',
      type: 'INTERN',
      contextTags: ['finance', 'hr'],
      internalNotes: 'HR + Finance. Vertraulich.',
    });
  }
  
  // Cashflow / Treasury Check (2x pro Monat, ~5th and ~20th)
  for (let month = 1; month <= 7; month++) {
    [5, 20].forEach((day, idx) => {
      events.push({
        id: `cashflow-${month}-${idx}`,
        title: 'Cashflow / Treasury Check',
        description: 'Liquiditätsplanung, Prüfung offener Forderungen und Verbindlichkeiten. Abstimmung Investitionsbudget.',
        date: new Date(2026, month, day),
        startTime: '09:15',
        endTime: '09:45',
        type: 'INTERN',
        contextTags: ['finance'],
        internalNotes: 'CFO + Treasury. Remote.',
      });
    });
  }
  
  // Investor Reporting Draft (1x pro Monat, around 10th)
  for (let month = 1; month <= 7; month++) {
    events.push({
      id: `investor-report-${month}`,
      title: 'Investor Reporting Draft',
      description: 'Erstellung und Review des monatlichen Investor Reports. KPIs, Highlights und Ausblick. Draft-Version zur internen Freigabe.',
      date: new Date(2026, month, 10),
      startTime: '17:00',
      endTime: '18:00',
      type: 'INTERN',
      contextTags: ['finance', 'board'],
      internalNotes: 'IR + Finance. Entwurf wird am Folgetag an CEO weitergeleitet.',
    });
  }

  // ========== C) LEGAL / COMPLIANCE ==========
  
  // Legal Review (2x pro Monat, ~8th and ~22nd)
  for (let month = 1; month <= 7; month++) {
    [8, 22].forEach((day, idx) => {
      events.push({
        id: `legal-review-${month}-${idx}`,
        title: 'Legal Review: Vertragsprüfung',
        description: 'Rechtliche Prüfung laufender Verträge, NDAs, Lieferantenvereinbarungen und Partnerschaftsverträge. Risikobewertung und Handlungsempfehlungen.',
        date: new Date(2026, month, day),
        startTime: '14:00',
        endTime: '15:00',
        type: 'INTERN',
        contextTags: ['legal'],
        internalNotes: 'Legal Team. Alle offenen Verträge vorher im Sharepoint ablegen.',
      });
    });
  }
  
  // Compliance Sync (1x pro Monat, ~15th)
  for (let month = 1; month <= 7; month++) {
    events.push({
      id: `compliance-${month}`,
      title: 'Compliance Sync',
      description: 'Monatliche Abstimmung zu regulatorischen Anforderungen, DSGVO-Status, Audit-Vorbereitung und internen Richtlinien.',
      date: new Date(2026, month, 15),
      startTime: '09:45',
      endTime: '10:15',
      type: 'INTERN',
      contextTags: ['legal', 'organisation'],
      internalNotes: 'Compliance Officer + Legal. Remote.',
    });
  }

  // ========== D) PRODUCT / TECH ==========
  
  // Sprint Planning (1st Monday each month) 10:00-11:00
  for (let month = 1; month <= 7; month++) {
    const firstMonday = getNthWeekdayOfMonth(2026, month, 1, 1);
    events.push({
      id: `sprint-planning-${month}`,
      title: 'Sprint Planning',
      description: 'Planung des kommenden Sprints. Priorisierung des Backlogs, Kapazitätsplanung und Definition der Sprint-Ziele. Story Points werden geschätzt.',
      date: firstMonday,
      startTime: '10:00',
      endTime: '11:00',
      type: 'INTERN',
      contextTags: ['tech', 'organisation'],
      internalNotes: 'Product + Engineering. Jira-Board vorbereiten.',
    });
  }
  
  // Sprint Review (2nd Wednesday each month) 17:30-18:15
  for (let month = 1; month <= 7; month++) {
    const secondWednesday = getNthWeekdayOfMonth(2026, month, 3, 2);
    events.push({
      id: `sprint-review-${month}`,
      title: 'Sprint Review',
      description: 'Präsentation der im Sprint fertiggestellten Features. Demo für Stakeholder, Feedback-Runde und Akzeptanz der User Stories.',
      date: secondWednesday,
      startTime: '17:30',
      endTime: '18:15',
      type: 'INTERN',
      contextTags: ['tech', 'strategie'],
      internalNotes: 'Alle Stakeholder eingeladen. Demo-Environment vorbereiten.',
    });
  }
  
  // Incident Drill (1x in period) 20:00-20:30
  events.push({
    id: 'incident-drill-1',
    title: 'Incident Response Drill',
    description: 'Geplante Übung zur Incident Response. Simulation eines kritischen Systemausfalls zur Überprüfung der Notfallprozesse und Kommunikationswege.',
    date: new Date(2026, 4, 14), // May 14
    startTime: '20:00',
    endTime: '20:30',
    type: 'INTERN',
    contextTags: ['tech', 'organisation'],
    internalNotes: 'Engineering + Ops. Nach Feierabend, aber geplant.',
  });

  // ========== E) PEOPLE / HR ==========
  
  // 1:1 COO Check-in (2x pro Monat, ~3rd and ~18th)
  for (let month = 1; month <= 7; month++) {
    [3, 18].forEach((day, idx) => {
      events.push({
        id: `coo-checkin-${month}-${idx}`,
        title: '1:1 COO Check-in',
        description: 'Bilaterales Gespräch mit dem COO zu operativen Themen, Team-Performance und strategischen Initiativen.',
        date: new Date(2026, month, day),
        startTime: '12:30',
        endTime: '13:00',
        type: 'INTERN',
        contextTags: ['organisation', 'hr'],
        internalNotes: 'Vertraulich. Agenda vorab abstimmen.',
      });
    });
  }
  
  // Recruiting Review (1x pro Monat, ~12th)
  for (let month = 1; month <= 7; month++) {
    events.push({
      id: `recruiting-${month}`,
      title: 'Recruiting Review',
      description: 'Status offener Positionen, Pipeline-Review, Feedback zu Kandidaten und Abstimmung zu Hiring-Prioritäten.',
      date: new Date(2026, month, 12),
      startTime: '15:30',
      endTime: '16:00',
      type: 'INTERN',
      contextTags: ['hr', 'organisation'],
      internalNotes: 'HR + Hiring Manager. Remote.',
    });
  }

  // ========== F) HOLIDAYS (DE/AT/CH) ==========
  
  const holidays2026 = [
    { date: new Date(2026, 3, 3), title: 'Karfreitag' }, // Apr 3, 2026
    { date: new Date(2026, 3, 6), title: 'Ostermontag' }, // Apr 6, 2026
    { date: new Date(2026, 4, 1), title: 'Tag der Arbeit' }, // May 1
    { date: new Date(2026, 4, 14), title: 'Christi Himmelfahrt' }, // May 14, 2026
    { date: new Date(2026, 4, 25), title: 'Pfingstmontag' }, // May 25, 2026
    { date: new Date(2026, 5, 4), title: 'Fronleichnam' }, // Jun 4, 2026
    { date: new Date(2026, 7, 1), title: 'Nationalfeiertag CH' }, // Aug 1
  ];
  
  holidays2026.forEach((h, i) => {
    events.push({
      id: `holiday-2026-${i}`,
      title: h.title,
      description: 'Gesetzlicher Feiertag. Büro geschlossen. Keine regulären Termine.',
      date: h.date,
      type: 'FEIERTAG',
      isReadOnly: true,
      contextTags: ['organisation'],
      internalNotes: 'Feiertag – automatisch blockiert.',
    });
  });

  // ========== G) BIRTHDAYS (Team) ==========
  
  const birthdays = [
    { date: new Date(2026, 1, 14), name: 'Justin Schwarzott', role: 'CEO' },
    { date: new Date(2026, 2, 8), name: 'Herbert Schöttl', role: 'CFO' },
    { date: new Date(2026, 2, 22), name: 'Sarah Anderst', role: 'COO' },
    { date: new Date(2026, 3, 5), name: 'Nina Reiter', role: 'Head of Product' },
    { date: new Date(2026, 3, 18), name: 'Alessandro Vitale', role: 'Lead Engineer' },
    { date: new Date(2026, 4, 11), name: 'Moritz Schwarzmann', role: 'Legal Counsel' },
    { date: new Date(2026, 4, 28), name: 'Lisa Becker', role: 'HR Manager' },
    { date: new Date(2026, 5, 3), name: 'Thomas Huber', role: 'Finance Controller' },
    { date: new Date(2026, 5, 19), name: 'Elena Schmidt', role: 'Marketing Lead' },
    { date: new Date(2026, 6, 7), name: 'Markus Weber', role: 'Sales Director' },
    { date: new Date(2026, 6, 22), name: 'Anna Müller', role: 'Customer Success' },
    { date: new Date(2026, 7, 15), name: 'David Fischer', role: 'Tech Ops' },
  ];
  
  birthdays.forEach((b, i) => {
    events.push({
      id: `birthday-${i}`,
      title: `🎂 Geburtstag: ${b.name}`,
      description: `Heute feiert ${b.name} (${b.role}) Geburtstag. Herzlichen Glückwunsch!`,
      date: b.date,
      startTime: '09:00',
      endTime: '09:15',
      type: 'INTERN',
      contextTags: ['hr', 'intern'],
      internalNotes: 'Erinnerung für das Team. Glückwünsche nicht vergessen!',
    });
  });

  // ========== H) ADDITIONAL BUSINESS EVENTS ==========
  
  // Quarterly Board Prep
  events.push({
    id: 'q1-board-prep',
    title: 'Q1 Board Preparation',
    description: 'Vorbereitung der Q1-Unterlagen für das Board Meeting. Konsolidierung aller Berichte, KPI-Dashboard und Management Summary.',
    date: new Date(2026, 2, 20),
    startTime: '14:00',
    endTime: '16:00',
    type: 'INTERN',
    contextTags: ['board', 'finance'],
    internalNotes: 'Management Team. Deadline für Input: 18.03.',
  });
  
  events.push({
    id: 'q2-board-prep',
    title: 'Q2 Board Preparation',
    description: 'Vorbereitung der Q2-Unterlagen für das Board Meeting. Halbjahresreview und Ausblick H2.',
    date: new Date(2026, 5, 19),
    startTime: '14:00',
    endTime: '16:00',
    type: 'INTERN',
    contextTags: ['board', 'finance'],
    internalNotes: 'Management Team. Wichtig: Forecast H2.',
  });
  
  // Partner Sync Sessions
  events.push({
    id: 'partner-sync-1',
    title: 'Partner Sync: TechVentures',
    description: 'Quartalsabstimmung mit TechVentures zu laufenden Kooperationen, Pipeline und gemeinsamen Projekten.',
    date: new Date(2026, 2, 12),
    startTime: '11:00',
    endTime: '12:00',
    type: 'EXTERNAL',
    contextTags: ['strategie'],
    internalNotes: 'External Partner. NDA aktiv.',
  });
  
  events.push({
    id: 'partner-sync-2',
    title: 'Partner Sync: FinanceHub',
    description: 'Halbjährliche Abstimmung mit FinanceHub zu Reporting-Standards und Integrationen.',
    date: new Date(2026, 5, 10),
    startTime: '15:00',
    endTime: '16:00',
    type: 'EXTERNAL',
    contextTags: ['finance', 'strategie'],
    internalNotes: 'External Partner. Vor Ort in München.',
  });
  
  // Annual Planning
  events.push({
    id: 'annual-planning',
    title: 'Annual Planning Kickoff',
    description: 'Kickoff für die Jahresplanung 2027. Strategische Ziele, Budget-Rahmen und Meilensteine.',
    date: new Date(2026, 6, 15),
    startTime: '09:00',
    endTime: '12:00',
    type: 'INTERN',
    contextTags: ['strategie', 'finance', 'board'],
    internalNotes: 'Management Team + Board. Ganztägiger Workshop.',
  });
  
  // Security Audit
  events.push({
    id: 'security-audit',
    title: 'External Security Audit',
    description: 'Jährlicher externer Security Audit durch zertifizierte Prüfer. Penetration Testing und Compliance-Check.',
    date: new Date(2026, 4, 20),
    startTime: '09:00',
    endTime: '17:00',
    type: 'EXTERNAL',
    contextTags: ['tech', 'legal'],
    internalNotes: 'Externer Auditor. Alle Systeme müssen zugänglich sein.',
    isReadOnly: true,
  });

  // ========== I) ADDITIONAL EVENTS TO REACH 90+ ==========
  
  // Daily Standups (Mon-Fri, 09:00-09:15) - for 2 months
  for (let month = 1; month <= 2; month++) {
    for (let day = 1; day <= 28; day++) {
      const d = new Date(2026, month, day);
      if (d.getDay() !== 0 && d.getDay() !== 6) { // Skip weekends
        events.push({
          id: `standup-${month}-${day}`,
          title: 'Daily Standup',
          description: 'Tägliches 15-Minuten Standup. Status-Updates, Blocker, und Tagesplanung.',
          date: d,
          startTime: '09:00',
          endTime: '09:15',
          type: 'TEAM_MEETING',
          contextTags: ['organisation', 'tech'],
          internalNotes: 'Remote via Slack Huddle.',
        });
      }
    }
  }
  
  // Weekly Sales Pipeline (Tuesdays 14:00-15:00)
  for (let month = 1; month <= 7; month++) {
    for (let week = 0; week < 5; week++) {
      const tuesday = new Date(2026, month, 1);
      tuesday.setDate(tuesday.getDate() + ((2 - tuesday.getDay() + 7) % 7) + (week * 7));
      if (tuesday.getMonth() === month) {
        events.push({
          id: `sales-pipeline-${month}-${week}`,
          title: 'Sales Pipeline Review',
          description: 'Wöchentliche Pipeline Review. Deal-Status, Forecasts, und Win/Loss Analyse.',
          date: tuesday,
          startTime: '14:00',
          endTime: '15:00',
          type: 'INTERN',
          contextTags: ['organisation'],
          internalNotes: 'Sales Team + CEO. CRM Dashboard vorbereiten.',
        });
      }
    }
  }
  
  // Product Sync (Thursdays 16:00-17:00)
  for (let month = 1; month <= 7; month++) {
    for (let week = 0; week < 5; week++) {
      const thursday = new Date(2026, month, 1);
      thursday.setDate(thursday.getDate() + ((4 - thursday.getDay() + 7) % 7) + (week * 7));
      if (thursday.getMonth() === month) {
        events.push({
          id: `product-sync-${month}-${week}`,
          title: 'Product Sync',
          description: 'Wöchentlicher Product Sync. Roadmap Review, Feature Priorisierung, und Stakeholder Updates.',
          date: thursday,
          startTime: '16:00',
          endTime: '17:00',
          type: 'INTERN',
          contextTags: ['tech', 'strategie'],
          internalNotes: 'Product + Engineering + Design.',
        });
      }
    }
  }
  
  // Investor Calls
  events.push({
    id: 'investor-call-1',
    title: 'Investor Call: Series A Update',
    description: 'Quartals-Update für Series A Investoren. KPIs, Runway, und strategische Entwicklung.',
    date: new Date(2026, 2, 25),
    startTime: '17:00',
    endTime: '18:00',
    type: 'EXTERNAL',
    contextTags: ['finance', 'board'],
    internalNotes: 'Vertraulich. Deck vorab versenden.',
  });
  
  events.push({
    id: 'investor-call-2',
    title: 'Investor Call: Board Observer',
    description: 'Monatlicher Austausch mit Board Observer zu operativen Themen.',
    date: new Date(2026, 3, 8),
    startTime: '11:00',
    endTime: '11:45',
    type: 'EXTERNAL',
    contextTags: ['board'],
    internalNotes: 'Remote. Agenda vorab abstimmen.',
  });
  
  // Client Portal Review
  events.push({
    id: 'client-portal-review',
    title: 'Client Portal Review (Leadely)',
    description: 'Review der Leadely Portal Integration. UX Feedback, Bug Triage, und Feature Requests.',
    date: new Date(2026, 2, 18),
    startTime: '10:00',
    endTime: '11:30',
    type: 'EXTERNAL',
    contextTags: ['tech', 'strategie'],
    internalNotes: 'Product + Leadely PM.',
  });
  
  // Cost Reviews
  events.push({
    id: 'twilio-cost-review',
    title: 'Twilio/ElevenLabs Cost Review',
    description: 'Monatliche Kostenanalyse der Voice AI Infrastruktur. Usage Optimization und Budget.',
    date: new Date(2026, 2, 5),
    startTime: '14:30',
    endTime: '15:15',
    type: 'INTERN',
    contextTags: ['finance', 'tech'],
    internalNotes: 'Finance + Engineering. Usage Reports vorbereiten.',
  });
  
  events.push({
    id: 'retell-audit',
    title: 'Retell Prompt Audit',
    description: 'Quartalsmäßige Überprüfung der Retell Prompts. Performance-Metriken und Optimierung.',
    date: new Date(2026, 3, 22),
    startTime: '13:00',
    endTime: '14:30',
    type: 'INTERN',
    contextTags: ['tech'],
    internalNotes: 'AI Team. A/B Test Ergebnisse mitbringen.',
  });
  
  // Demo Days
  events.push({
    id: 'aras-demo-day',
    title: 'ARAS AI Demo Day',
    description: 'Interner Demo Day für alle neuen Features. Präsentation für Stakeholder und Team.',
    date: new Date(2026, 4, 28),
    startTime: '15:00',
    endTime: '17:00',
    type: 'TEAM_MEETING',
    contextTags: ['tech', 'strategie'],
    internalNotes: 'Alle Abteilungen. Demo Environment vorbereiten.',
  });
  
  // Team Events
  events.push({
    id: 'team-offsite-planning',
    title: 'Team Offsite Planning',
    description: 'Planung des Q3 Team Offsites. Location, Agenda, und Budget.',
    date: new Date(2026, 4, 6),
    startTime: '11:00',
    endTime: '12:00',
    type: 'INTERN',
    contextTags: ['hr', 'organisation'],
    internalNotes: 'HR + Office Management.',
  });
  
  events.push({
    id: 'team-offsite',
    title: 'Team Offsite Q3',
    description: 'Zweitägiges Team Offsite. Strategy, Teambuilding, und Workshops.',
    date: new Date(2026, 6, 9),
    startTime: '09:00',
    endTime: '18:00',
    type: 'TEAM_MEETING',
    contextTags: ['organisation', 'strategie'],
    internalNotes: 'Ganzes Team. Location: TBD.',
  });
  
  // Infrastructure
  events.push({
    id: 'db-maintenance-1',
    title: 'Database Maintenance Window',
    description: 'Geplante Datenbankwartung. Index Rebuilds und Performance Tuning.',
    date: new Date(2026, 3, 12),
    startTime: '22:00',
    endTime: '23:30',
    type: 'INTERN',
    contextTags: ['tech'],
    internalNotes: 'DevOps. Downtime: ~30 Min erwartet.',
    isReadOnly: true,
  });
  
  events.push({
    id: 'infra-review',
    title: 'Infrastructure Cost Review',
    description: 'Monatliche Überprüfung der Cloud-Kosten. AWS, Vercel, und Third-Party Services.',
    date: new Date(2026, 2, 28),
    startTime: '10:30',
    endTime: '11:15',
    type: 'INTERN',
    contextTags: ['tech', 'finance'],
    internalNotes: 'DevOps + Finance.',
  });
  
  // Additional Birthdays
  const moreBirthdays = [
    { date: new Date(2026, 1, 28), name: 'Sophia Lehmann', role: 'UX Designer' },
    { date: new Date(2026, 3, 30), name: 'Felix Braun', role: 'Backend Dev' },
    { date: new Date(2026, 5, 25), name: 'Laura Hoffmann', role: 'Account Manager' },
  ];
  
  moreBirthdays.forEach((b, i) => {
    events.push({
      id: `birthday-extra-${i}`,
      title: `🎂 Geburtstag: ${b.name}`,
      description: `Heute feiert ${b.name} (${b.role}) Geburtstag. Herzlichen Glückwunsch!`,
      date: b.date,
      startTime: '09:00',
      endTime: '09:15',
      type: 'INTERN',
      contextTags: ['hr', 'intern'],
      internalNotes: 'Erinnerung für das Team.',
    });
  });
  
  // More Holidays
  const moreHolidays = [
    { date: new Date(2026, 0, 1), title: 'Neujahr' },
    { date: new Date(2026, 0, 6), title: 'Heilige Drei Könige' },
    { date: new Date(2026, 9, 3), title: 'Tag der Deutschen Einheit' },
    { date: new Date(2026, 11, 25), title: 'Weihnachten' },
    { date: new Date(2026, 11, 26), title: '2. Weihnachtstag' },
  ];
  
  moreHolidays.forEach((h, i) => {
    events.push({
      id: `holiday-extra-${i}`,
      title: h.title,
      description: 'Gesetzlicher Feiertag. Büro geschlossen.',
      date: h.date,
      type: 'FEIERTAG',
      isReadOnly: true,
      contextTags: ['organisation'],
    });
  });
  
  // Content & Marketing
  events.push({
    id: 'content-sprint',
    title: 'Content Sprint Kickoff',
    description: 'Start des Q2 Content Sprints. Blog Posts, Case Studies, und Social Media Plan.',
    date: new Date(2026, 3, 1),
    startTime: '10:00',
    endTime: '11:30',
    type: 'INTERN',
    contextTags: ['organisation'],
    internalNotes: 'Marketing + Content Team.',
  });
  
  events.push({
    id: 'website-relaunch',
    title: 'Website Relaunch Review',
    description: 'Final Review vor dem Website Relaunch. Design, Copy, und technische Checks.',
    date: new Date(2026, 4, 15),
    startTime: '14:00',
    endTime: '16:00',
    type: 'INTERN',
    contextTags: ['tech', 'organisation'],
    internalNotes: 'Marketing + Design + Dev.',
  });
  
  // Support & Incidents
  events.push({
    id: 'incident-review',
    title: 'Incident Review: March',
    description: 'Monatliche Review aller Support-Incidents. Root Cause Analysis und Action Items.',
    date: new Date(2026, 3, 7),
    startTime: '11:00',
    endTime: '12:00',
    type: 'INTERN',
    contextTags: ['tech', 'organisation'],
    internalNotes: 'Support + Engineering.',
  });
  
  // Onboarding
  events.push({
    id: 'onboarding-new-hire',
    title: 'Onboarding: New Engineer',
    description: 'Onboarding Session für neuen Engineering Hire. Tech Stack, Processes, und Team Intro.',
    date: new Date(2026, 3, 14),
    startTime: '09:30',
    endTime: '12:00',
    type: 'INTERN',
    contextTags: ['hr', 'tech'],
    internalNotes: 'HR + Engineering Lead.',
  });

  // ========== J) ADDITIONAL 90+ EVENTS FOR COMPREHENSIVE CALENDAR ==========
  
  // Weekly Marketing Sync (Wednesdays 11:00-11:45)
  for (let month = 1; month <= 7; month++) {
    for (let week = 0; week < 5; week++) {
      const wednesday = new Date(2026, month, 1);
      wednesday.setDate(wednesday.getDate() + ((3 - wednesday.getDay() + 7) % 7) + (week * 7));
      if (wednesday.getMonth() === month && wednesday <= endDate) {
        events.push({
          id: `marketing-sync-${month}-${week}`,
          title: 'Marketing Weekly Sync',
          description: 'Wöchentliche Marketing-Abstimmung. Kampagnen, Content, und Performance Review.',
          date: wednesday,
          startTime: '11:00',
          endTime: '11:45',
          type: 'INTERN',
          contextTags: ['organisation'],
          internalNotes: 'Marketing Team. Remote.',
        });
      }
    }
  }
  
  // Design Reviews (Mondays 15:00-16:00)
  for (let month = 1; month <= 7; month++) {
    for (let week = 0; week < 5; week++) {
      const monday = new Date(2026, month, 1);
      monday.setDate(monday.getDate() + ((1 - monday.getDay() + 7) % 7) + (week * 7));
      if (monday.getMonth() === month && monday <= endDate) {
        events.push({
          id: `design-review-${month}-${week}`,
          title: 'Design Review',
          description: 'Wöchentlicher Design Review. UI/UX Feedback, Prototypen, und Design System Updates.',
          date: monday,
          startTime: '15:00',
          endTime: '16:00',
          type: 'INTERN',
          contextTags: ['tech'],
          internalNotes: 'Design + Product. Figma Links vorbereiten.',
        });
      }
    }
  }
  
  // Customer Success Sync (Thursdays 10:00-10:30)
  for (let month = 1; month <= 7; month++) {
    for (let week = 0; week < 5; week++) {
      const thursday = new Date(2026, month, 1);
      thursday.setDate(thursday.getDate() + ((4 - thursday.getDay() + 7) % 7) + (week * 7));
      if (thursday.getMonth() === month && thursday <= endDate) {
        events.push({
          id: `cs-sync-${month}-${week}`,
          title: 'Customer Success Sync',
          description: 'Wöchentliches CS Meeting. Kundenfeedback, NPS, und Churn-Analyse.',
          date: thursday,
          startTime: '10:00',
          endTime: '10:30',
          type: 'INTERN',
          contextTags: ['organisation'],
          internalNotes: 'CS Team + Product.',
        });
      }
    }
  }
  
  // Additional Deadlines & Milestones
  const deadlines = [
    { date: new Date(2026, 1, 15), title: 'Q1 OKR Finalisierung', desc: 'Deadline für Q1 OKR Definition' },
    { date: new Date(2026, 1, 28), title: 'Pitch Deck Update', desc: 'Aktualisiertes Pitch Deck für Investoren' },
    { date: new Date(2026, 2, 1), title: 'DSGVO Audit Vorbereitung', desc: 'Alle Dokumente für DSGVO Audit' },
    { date: new Date(2026, 2, 15), title: 'Steuererklärung Deadline', desc: 'Abgabe Steuererklärung 2025' },
    { date: new Date(2026, 2, 31), title: 'Q1 Abschluss', desc: 'Finaler Q1 Abschluss' },
    { date: new Date(2026, 3, 15), title: 'ISO Zertifizierung Audit', desc: 'Vorbereitung ISO 27001' },
    { date: new Date(2026, 3, 30), title: 'Website Launch', desc: 'Go-Live neue Website' },
    { date: new Date(2026, 4, 15), title: 'Feature Release v2.0', desc: 'Major Release ARAS AI v2.0' },
    { date: new Date(2026, 4, 31), title: 'Halbjahres-Budget Review', desc: 'Budget Review H1' },
    { date: new Date(2026, 5, 15), title: 'Summer Party Planung', desc: 'Deadline Planung Sommerfest' },
    { date: new Date(2026, 5, 30), title: 'Q2 Abschluss', desc: 'Finaler Q2 Abschluss' },
    { date: new Date(2026, 6, 15), title: 'Partner Verträge Renewal', desc: 'Deadline Partner Renewals' },
    { date: new Date(2026, 6, 31), title: 'Mid-Year Review', desc: 'Halbjahres Performance Review' },
    { date: new Date(2026, 7, 15), title: 'Q3 Planung Kickoff', desc: 'Start Q3 Planning' },
    { date: new Date(2026, 7, 31), title: 'August Urlaubs-Planung', desc: 'Finale Urlaubsabstimmung' },
  ];
  
  deadlines.forEach((d, i) => {
    events.push({
      id: `deadline-${i}`,
      title: `📌 ${d.title}`,
      description: d.desc,
      date: d.date,
      startTime: '18:00',
      endTime: '18:30',
      type: 'DEADLINE',
      contextTags: ['organisation'],
      internalNotes: 'Wichtige Deadline. Nicht verschieben.',
      isReadOnly: true,
    });
  });
  
  // Training Sessions
  const trainings = [
    { date: new Date(2026, 1, 20), title: 'Security Awareness Training', time: '14:00' },
    { date: new Date(2026, 2, 10), title: 'DSGVO Schulung', time: '10:00' },
    { date: new Date(2026, 3, 8), title: 'Leadership Workshop', time: '09:00' },
    { date: new Date(2026, 4, 12), title: 'AI Tools Training', time: '14:00' },
    { date: new Date(2026, 5, 9), title: 'Kommunikations-Workshop', time: '10:00' },
    { date: new Date(2026, 6, 14), title: 'Agile Methoden Refresher', time: '14:00' },
    { date: new Date(2026, 7, 11), title: 'Stress Management', time: '15:00' },
  ];
  
  trainings.forEach((t, i) => {
    events.push({
      id: `training-${i}`,
      title: `📚 ${t.title}`,
      description: `Pflichtschulung: ${t.title}. Alle relevanten Mitarbeiter sind eingeladen.`,
      date: t.date,
      startTime: t.time,
      endTime: `${parseInt(t.time.split(':')[0]) + 2}:00`,
      type: 'INTERN',
      contextTags: ['hr', 'organisation'],
      internalNotes: 'HR organisiert. Teilnahme wird dokumentiert.',
    });
  });
  
  // Client Meetings / Demos
  const clientMeetings = [
    { date: new Date(2026, 1, 18), title: 'Demo: Allianz Gruppe', client: 'Allianz' },
    { date: new Date(2026, 1, 25), title: 'Onboarding Call: BMW', client: 'BMW' },
    { date: new Date(2026, 2, 4), title: 'QBR: Deutsche Bank', client: 'Deutsche Bank' },
    { date: new Date(2026, 2, 18), title: 'Demo: Siemens Energy', client: 'Siemens' },
    { date: new Date(2026, 3, 2), title: 'Pilot Kickoff: SAP', client: 'SAP' },
    { date: new Date(2026, 3, 16), title: 'Executive Briefing: Bosch', client: 'Bosch' },
    { date: new Date(2026, 4, 7), title: 'Renewal Gespräch: Daimler', client: 'Daimler' },
    { date: new Date(2026, 4, 21), title: 'Upsell Meeting: BASF', client: 'BASF' },
    { date: new Date(2026, 5, 4), title: 'Success Review: Lufthansa', client: 'Lufthansa' },
    { date: new Date(2026, 5, 18), title: 'New Logo: Deutsche Telekom', client: 'Telekom' },
    { date: new Date(2026, 6, 2), title: 'Enterprise Demo: VW', client: 'Volkswagen' },
    { date: new Date(2026, 6, 16), title: 'POC Review: Adidas', client: 'Adidas' },
    { date: new Date(2026, 7, 6), title: 'Contract Signing: Henkel', client: 'Henkel' },
    { date: new Date(2026, 7, 20), title: 'Integration Workshop: Bayer', client: 'Bayer' },
  ];
  
  clientMeetings.forEach((c, i) => {
    events.push({
      id: `client-meeting-${i}`,
      title: c.title,
      description: `Kundentermin mit ${c.client}. Vorbereitung und Follow-up durch Account Team.`,
      date: c.date,
      startTime: '10:00',
      endTime: '11:30',
      type: 'EXTERNAL',
      contextTags: ['organisation', 'strategie'],
      internalNotes: `Client: ${c.client}. Sales + Product. Meeting Link im CRM.`,
    });
  });
  
  // Company Events & Social
  const companyEvents = [
    { date: new Date(2026, 1, 14), title: 'Valentinstag Team Lunch', type: 'social' },
    { date: new Date(2026, 2, 17), title: 'St. Patricks Day Feier', type: 'social' },
    { date: new Date(2026, 3, 17), title: 'Oster-Brunch', type: 'social' },
    { date: new Date(2026, 4, 8), title: 'Muttertag Appreciation', type: 'social' },
    { date: new Date(2026, 5, 21), title: 'Sommerfest 2026', type: 'party' },
    { date: new Date(2026, 6, 4), title: 'BBQ am Dach', type: 'social' },
    { date: new Date(2026, 7, 7), title: 'Friday Drinks', type: 'social' },
  ];
  
  companyEvents.forEach((e, i) => {
    events.push({
      id: `company-event-${i}`,
      title: `🎉 ${e.title}`,
      description: `Team Event: ${e.title}. Alle sind herzlich eingeladen!`,
      date: e.date,
      startTime: e.type === 'party' ? '16:00' : '12:00',
      endTime: e.type === 'party' ? '22:00' : '14:00',
      type: 'TEAM_MEETING',
      contextTags: ['hr', 'intern'],
      internalNotes: 'Office Management organisiert.',
    });
  });
  
  // More Detailed Events for Current Week (Feb 2026)
  const currentWeekEvents = [
    { date: new Date(2026, 1, 2), title: 'Wochenplanung', start: '08:30', end: '09:00' },
    { date: new Date(2026, 1, 2), title: 'Code Review: Auth Module', start: '14:00', end: '15:00' },
    { date: new Date(2026, 1, 3), title: 'UX Testing Session', start: '10:00', end: '11:30' },
    { date: new Date(2026, 1, 3), title: 'API Integration Call', start: '15:00', end: '16:00' },
    { date: new Date(2026, 1, 4), title: 'Budget Meeting Q1', start: '09:00', end: '10:30' },
    { date: new Date(2026, 1, 4), title: 'PR Review', start: '14:00', end: '14:30' },
    { date: new Date(2026, 1, 5), title: 'Retro Sprint 23', start: '11:00', end: '12:00' },
    { date: new Date(2026, 1, 5), title: 'All-Hands Meeting', start: '16:00', end: '17:00' },
    { date: new Date(2026, 1, 6), title: 'Planning Poker', start: '10:00', end: '11:00' },
    { date: new Date(2026, 1, 6), title: 'Friday Wrap-Up', start: '17:00', end: '17:30' },
  ];
  
  currentWeekEvents.forEach((e, i) => {
    events.push({
      id: `current-week-${i}`,
      title: e.title,
      description: `Termin: ${e.title}`,
      date: e.date,
      startTime: e.start,
      endTime: e.end,
      type: 'INTERN',
      contextTags: ['organisation'],
      internalNotes: 'Team Termin.',
    });
  });
  
  // Industry Events & Conferences
  const conferences = [
    { date: new Date(2026, 2, 23), title: 'Web Summit Dublin (Remote)', days: 3 },
    { date: new Date(2026, 4, 18), title: 'AI Conference Berlin', days: 2 },
    { date: new Date(2026, 5, 15), title: 'SaaS Connect München', days: 1 },
    { date: new Date(2026, 6, 20), title: 'Tech Open Air Berlin', days: 2 },
  ];
  
  conferences.forEach((c, i) => {
    events.push({
      id: `conference-${i}`,
      title: `🌐 ${c.title}`,
      description: `Konferenz: ${c.title}. Dauer: ${c.days} Tag(e). Networking und Learning.`,
      date: c.date,
      startTime: '09:00',
      endTime: '18:00',
      type: 'EXTERNAL',
      contextTags: ['strategie', 'organisation'],
      internalNotes: `${c.days}-tägig. Reisekosten im Budget.`,
    });
  });
  
  // Performance Reviews
  for (let month = 2; month <= 7; month += 3) {
    events.push({
      id: `perf-review-${month}`,
      title: 'Quartals Performance Reviews',
      description: 'Quartalsmäßige Performance Gespräche mit allen Mitarbeitern.',
      date: new Date(2026, month, 20),
      startTime: '09:00',
      endTime: '17:00',
      type: 'INTERN',
      contextTags: ['hr'],
      internalNotes: 'HR koordiniert. Kalender-Slots werden individuell gebucht.',
    });
  }
  
  // Board & Strategy
  events.push({
    id: 'strategy-day-h1',
    title: 'Strategy Day H1',
    description: 'Halbtägiger Strategy Workshop. Vision, Ziele, und Roadmap für H2.',
    date: new Date(2026, 5, 26),
    startTime: '09:00',
    endTime: '15:00',
    type: 'INTERN',
    contextTags: ['strategie', 'board'],
    internalNotes: 'Leadership Team. Offsite Location.',
  });
  
  events.push({
    id: 'board-dinner',
    title: 'Board Dinner',
    description: 'Informelles Board Dinner nach der Verwaltungsratssitzung.',
    date: new Date(2026, 3, 24),
    startTime: '19:00',
    endTime: '22:00',
    type: 'VERWALTUNGSRAT',
    contextTags: ['board'],
    internalNotes: 'Restaurant TBD. Budget: €200/Person.',
  });
  
  return events;
}

// ============================================================================
// DAY PILL COMPONENT
// ============================================================================

interface DayPillProps {
  date: Date;
  isSelected: boolean;
  hasEvents: boolean;
  onClick: () => void;
}

function DayPill({ date, isSelected, hasEvents, onClick }: DayPillProps) {
  const isCurrentDay = isToday(date);
  
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center transition-all duration-150"
      style={{
        height: '52px',
        minWidth: '48px',
        padding: '0 12px',
        borderRadius: '14px',
        background: isSelected 
          ? 'rgba(255,106,0,0.16)' 
          : 'rgba(255,255,255,0.04)',
        border: isSelected 
          ? '1px solid rgba(255,106,0,0.28)' 
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isSelected 
          ? '0 0 20px rgba(255,106,0,0.12)' 
          : 'none',
      }}
    >
      <span 
        className="text-[10px] uppercase tracking-wider"
        style={{ 
          color: isSelected ? '#ff6a00' : 'rgba(255,255,255,0.45)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {format(date, 'EEE', { locale: de })}
      </span>
      <span 
        className="text-[15px] font-semibold"
        style={{ 
          color: isSelected ? '#ff6a00' : 'rgba(255,255,255,0.7)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {format(date, 'd')}
      </span>
      {hasEvents && !isSelected && (
        <div 
          className="w-1 h-1 rounded-full mt-0.5"
          style={{ background: '#FE9100' }}
        />
      )}
    </button>
  );
}

// ============================================================================
// INFO TOOLTIP WITH BACKDROP (Premium z-index + scrim)
// ============================================================================

function InfoTooltipWithBackdrop() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  
  // Calculate position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = () => setIsOpen(false);
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);
  
  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
        style={{ 
          background: isOpen ? 'rgba(254,145,0,0.15)' : 'rgba(255,255,255,0.04)',
          border: isOpen ? '1px solid rgba(254,145,0,0.3)' : '1px solid transparent',
        }}
      >
        <Info className="w-3 h-3" style={{ color: isOpen ? '#FE9100' : 'rgba(255,255,255,0.4)' }} />
      </button>
      
      {/* Portal for backdrop + tooltip */}
      {isOpen && createPortal(
        <>
          {/* Backdrop scrim */}
          <div
            className="fixed inset-0"
            style={{
              zIndex: 9998,
              background: 'rgba(0,0,0,0.46)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />
          
          {/* Tooltip panel */}
          <div
            className="fixed"
            style={{
              zIndex: 9999,
              top: `${position.top}px`,
              right: `${position.right}px`,
              maxWidth: '360px',
              padding: '14px',
              borderRadius: '16px',
              background: 'rgba(10,10,12,0.92)',
              border: '1px solid rgba(233,215,196,0.18)',
              boxShadow: '0 0 0 1px rgba(254,145,0,0.08), 0 18px 60px rgba(0,0,0,0.65)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p 
              className="text-[11px] uppercase tracking-[0.22em] mb-2"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                color: 'rgba(233,215,196,0.9)',
              }}
            >
              KALENDER INFO
            </p>
            <p 
              className="text-[13.2px] leading-[1.55]"
              style={{ 
                fontFamily: 'Inter, sans-serif',
                color: 'rgba(245,245,247,0.86)',
              }}
            >
              Wählen Sie einen Tag um alle Termine zu sehen. Nutzen Sie TAG/WOCHE/MONAT für verschiedene Ansichten. Klicken Sie in eine leere Zelle um direkt einen neuen Termin zu erstellen.
            </p>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ============================================================================
// VIEW SWITCHER COMPONENT (ARAS Premium Segmented Control)
// ============================================================================

interface ViewSwitcherProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views: { id: CalendarView; label: string }[] = [
    { id: 'day', label: 'TAG' },
    { id: 'week', label: 'WOCHE' },
    { id: 'month', label: 'MONAT' },
  ];
  
  return (
    <div 
      className="relative flex items-center"
      style={{
        height: '36px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(233,215,196,0.12)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)',
        padding: '3px',
      }}
    >
      {views.map((view) => {
        const isActive = currentView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className="relative z-10 flex items-center justify-center transition-all duration-150"
            style={{
              height: '30px',
              padding: '0 14px',
              borderRadius: '999px',
              background: isActive 
                ? 'linear-gradient(180deg, rgba(254,145,0,0.18), rgba(255,255,255,0.02))' 
                : 'transparent',
              border: isActive 
                ? '1px solid rgba(254,145,0,0.28)' 
                : '1px solid transparent',
              boxShadow: isActive 
                ? '0 0 16px rgba(254,145,0,0.22)' 
                : 'none',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: isActive ? '#FE9100' : 'rgba(233,215,196,0.72)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'rgba(233,215,196,0.9)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'rgba(233,215,196,0.72)';
              }
            }}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// WEEK VIEW COMPONENT (Time Grid + Side Agenda)
// ============================================================================

interface WeekViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

function WeekView({ selectedDate, events, onEventClick, onDayClick, onSlotClick }: WeekViewProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ day: string; hour: number } | null>(null);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Time slots from 07:00 to 20:00
  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 7);
  
  // Get events for the week
  const weekEvents = useMemo(() => {
    return events.filter(e => {
      const eventDate = startOfDay(e.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });
  }, [events, weekStart, weekEnd]);
  
  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    weekDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      grouped[key] = weekEvents
        .filter(e => isSameDay(e.date, day))
        .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
    });
    return grouped;
  }, [weekEvents, weekDays]);
  
  // Calculate event position in grid
  const getEventPosition = (event: CalendarEvent) => {
    if (!event.startTime) return { top: 0, height: 30 };
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const [endHour, endMin] = (event.endTime || event.startTime).split(':').map(Number);
    
    const startOffset = (startHour - 7) * 60 + startMin;
    const endOffset = (endHour - 7) * 60 + endMin;
    const duration = Math.max(endOffset - startOffset, 15);
    
    return {
      top: (startOffset / 60) * 40, // 40px per hour
      height: Math.max((duration / 60) * 40, 22),
    };
  };
  
  return (
    <div className="flex gap-4">
      {/* Time Grid */}
      <div className="flex-1 min-w-0">
        <div 
          className="overflow-x-auto relative"
          style={{ 
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.06)',
            // Micro grid background
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 20px),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 40px)
            `,
          }}
        >
          {/* Top inner glow */}
          <div 
            className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(254,145,0,0.08), transparent)',
            }}
          />
          {/* Week Header */}
          <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-12 flex-shrink-0" /> {/* Time gutter */}
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className="flex-1 min-w-[80px] py-2 text-center transition-colors"
                style={{
                  borderLeft: '1px solid rgba(233,215,196,0.08)',
                  background: isToday(day) ? 'rgba(254,145,0,0.08)' : 'transparent',
                }}
              >
                <span 
                  className="text-[10px] uppercase block"
                  style={{ 
                    color: isToday(day) ? '#FE9100' : 'rgba(255,255,255,0.45)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {format(day, 'EEE', { locale: de })}
                </span>
                <span 
                  className="text-[14px] font-semibold"
                  style={{ 
                    color: isToday(day) ? '#FE9100' : 'rgba(255,255,255,0.8)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {format(day, 'd')}
                </span>
                {isToday(day) && (
                  <div 
                    className="w-1.5 h-1.5 rounded-full mx-auto mt-1"
                    style={{ background: '#FE9100' }}
                  />
                )}
              </button>
            ))}
          </div>
          
          {/* Time Grid Body */}
          <div className="relative" style={{ height: '560px', overflow: 'hidden' }}>
            <div className="absolute inset-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {/* Hour Lines */}
              {timeSlots.map((hour) => (
                <div 
                  key={hour}
                  className="flex"
                  style={{ height: '40px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div 
                    className="w-12 flex-shrink-0 text-right pr-2 pt-0.5"
                    style={{ 
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.35)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {hour.toString().padStart(2, '0')}
                  </div>
                  {weekDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const isHovered = hoveredSlot?.day === dayKey && hoveredSlot?.hour === hour;
                    return (
                      <div 
                        key={`${hour}-${day.toISOString()}`}
                        className="flex-1 min-w-[80px] relative cursor-pointer group"
                        style={{ 
                          borderLeft: '1px solid rgba(233,215,196,0.08)',
                          background: isHovered ? 'rgba(254,145,0,0.08)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={() => setHoveredSlot({ day: dayKey, hour })}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => onSlotClick?.(day, hour)}
                      >
                        {/* Ghost hint on hover */}
                        {isHovered && (
                          <div 
                            className="absolute inset-1 flex items-center justify-center rounded-md pointer-events-none"
                            style={{
                              border: '1px dashed rgba(254,145,0,0.28)',
                              background: 'rgba(254,145,0,0.04)',
                            }}
                          >
                            <span 
                              className="text-[9px] opacity-60"
                              style={{ color: '#FE9100', fontFamily: 'Inter, sans-serif' }}
                            >
                              + Termin
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {/* Events Overlay */}
              <div className="absolute inset-0 flex pointer-events-none" style={{ left: '48px' }}>
                {weekDays.map((day, dayIndex) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay[dayKey] || [];
                  
                  return (
                    <div 
                      key={day.toISOString()}
                      className="flex-1 min-w-[80px] relative"
                      style={{ borderLeft: dayIndex > 0 ? '1px solid transparent' : 'none' }}
                    >
                      {dayEvents.map((event, idx) => {
                        const pos = getEventPosition(event);
                        const color = EVENT_COLORS[event.type] || '#FE9100';
                        
                        return (
                          <button
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="absolute left-1 right-1 overflow-hidden text-left transition-all pointer-events-auto"
                            style={{
                              top: `${pos.top}px`,
                              height: `${pos.height}px`,
                              background: 'rgba(0,0,0,0.7)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(233,215,196,0.10)',
                              borderLeft: `3px solid ${color}`,
                              borderRadius: '8px',
                              padding: '4px 6px',
                              zIndex: idx + 1,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(0,0,0,0.85)';
                              e.currentTarget.style.borderColor = `${color}40`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                              e.currentTarget.style.borderColor = 'rgba(233,215,196,0.10)';
                            }}
                          >
                            <p 
                              className="text-[11px] font-medium truncate"
                              style={{ color: 'rgba(255,255,255,0.9)' }}
                            >
                              {event.title}
                            </p>
                            {pos.height > 30 && event.startTime && (
                              <p 
                                className="text-[9px] truncate"
                                style={{ color: 'rgba(255,255,255,0.5)' }}
                              >
                                {event.startTime}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Side Agenda */}
      <div 
        className="w-[240px] flex-shrink-0 hidden lg:block"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '12px',
        }}
      >
        <h3 
          className="text-[10px] tracking-[0.18em] mb-3"
          style={{ 
            fontFamily: 'Orbitron, sans-serif',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          DIESE WOCHE
        </h3>
        <div 
          className="space-y-3 overflow-y-auto" 
          style={{ maxHeight: '500px', scrollbarWidth: 'none' }}
        >
          {weekDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay[dayKey] || [];
            if (dayEvents.length === 0) return null;
            
            return (
              <div key={day.toISOString()}>
                <p 
                  className="text-[10px] font-medium mb-1.5 sticky top-0"
                  style={{ 
                    color: isToday(day) ? '#FE9100' : 'rgba(255,255,255,0.5)',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '2px 0',
                  }}
                >
                  {format(day, 'EEE d. MMM', { locale: de })}
                </p>
                <div className="space-y-1.5">
                  {dayEvents.slice(0, 4).map((event) => {
                    const color = EVENT_COLORS[event.type] || '#FE9100';
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="w-full text-left p-2 rounded-lg transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderLeft: `2px solid ${color}`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }}
                      >
                        <p 
                          className="text-[11px] font-medium truncate"
                          style={{ color: 'rgba(255,255,255,0.85)' }}
                        >
                          {event.title}
                        </p>
                        {event.startTime && (
                          <p 
                            className="text-[9px]"
                            style={{ color: 'rgba(255,255,255,0.45)' }}
                          >
                            {event.startTime}
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {dayEvents.length > 4 && (
                    <p 
                      className="text-[9px] pl-2"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      +{dayEvents.length - 4} weitere
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MONTH VIEW COMPONENT (Premium Overview Grid)
// ============================================================================

interface MonthViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  onCellClick?: (date: Date) => void;
}

function MonthView({ selectedDate, events, onEventClick, onDayClick, onCellClick }: MonthViewProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    calendarDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      grouped[key] = events
        .filter(e => isSameDay(e.date, day))
        .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
    });
    return grouped;
  }, [events, calendarDays]);
  
  const weekDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  
  return (
    <div 
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Weekday Headers */}
      <div 
        className="grid grid-cols-7 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {weekDayNames.map((name) => (
          <div 
            key={name}
            className="py-2 text-center"
            style={{
              fontSize: '10px',
              fontFamily: 'Inter, sans-serif',
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
            }}
          >
            {name}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay[dayKey] || [];
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isTodayDate = isToday(day);
          
          const isHovered = hoveredDay === dayKey;
          
          return (
            <div
              key={day.toISOString()}
              className="relative text-left transition-colors group cursor-pointer"
              style={{
                minHeight: '80px',
                padding: '6px',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: isTodayDate 
                  ? 'rgba(254,145,0,0.06)' 
                  : isHovered 
                    ? 'rgba(255,255,255,0.03)' 
                    : 'transparent',
                opacity: isCurrentMonth ? 1 : 0.4,
              }}
              onMouseEnter={() => setHoveredDay(dayKey)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => onCellClick?.(day)}
            >
              {/* Date Number */}
              <span 
                className="text-[12px] font-medium"
                style={{ 
                  color: isTodayDate 
                    ? '#FE9100' 
                    : isCurrentMonth 
                      ? 'rgba(255,255,255,0.8)' 
                      : 'rgba(255,255,255,0.3)',
                }}
              >
                {format(day, 'd')}
              </span>
              
              {/* Today Ring */}
              {isTodayDate && (
                <span 
                  className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ 
                    border: '2px solid #FE9100',
                    background: 'rgba(254,145,0,0.15)',
                  }}
                >
                  <span style={{ color: '#FE9100', fontSize: '12px', fontWeight: 600 }}>
                    {format(day, 'd')}
                  </span>
                </span>
              )}
              
              {/* Event Chips (max 3) */}
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const color = EVENT_COLORS[event.type] || '#FE9100';
                  return (
                    <div
                      key={event.id}
                      className="truncate text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: `${color}20`,
                        color: color,
                        border: `1px solid ${color}30`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div 
                    className="text-[9px] px-1.5"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    +{dayEvents.length - 3} mehr
                  </div>
                )}
              </div>
              
              {/* Ghost + hint on hover (desktop only) */}
              {isHovered && isCurrentMonth && (
                <div 
                  className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'rgba(254,145,0,0.15)',
                    border: '1px dashed rgba(254,145,0,0.4)',
                  }}
                >
                  <Plus className="w-3 h-3" style={{ color: '#FE9100' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// EVENT CARD COMPONENT
// ============================================================================

interface EventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
}

function EventCard({ event, onClick }: EventCardProps) {
  const color = EVENT_COLORS[event.type];
  const label = EVENT_LABELS[event.type];
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className="w-full text-left group transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '14px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          }}
        >
          <div className="flex gap-3">
            {/* Type Marker */}
            <div 
              className="w-[3px] rounded-full flex-shrink-0"
              style={{ 
                background: color,
                minHeight: '40px',
              }}
            />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p 
                className="text-[14px] font-semibold truncate mb-1"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                {event.title}
              </p>
              <div className="flex items-center gap-2">
                {event.startTime && (
                  <span 
                    className="text-[11px]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}
                  </span>
                )}
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ 
                    background: `${color}15`,
                    color: color,
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          </div>
        </button>
      </HoverCardTrigger>
      
      {/* Hover Card Content */}
      <HoverCardContent 
        side="right" 
        sideOffset={12}
        className="w-[320px] p-0 border-0"
        style={{
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,106,0,0.22)',
          borderRadius: '16px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div 
              className="w-1 h-12 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <div>
              <h4 
                className="text-[15px] font-semibold mb-1"
                style={{ color: 'rgba(255,255,255,0.95)' }}
              >
                {event.title}
              </h4>
              <p 
                className="text-[11px]"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {format(event.date, 'EEEE, d. MMMM yyyy', { locale: de })}
              </p>
            </div>
          </div>
          
          {/* Description */}
          {event.description && (
            <p 
              className="text-[12px] leading-relaxed mb-3"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              {event.description}
            </p>
          )}
          
          {/* Meta */}
          <div className="space-y-2">
            {event.startTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}
                </span>
              </div>
            )}
            
            {event.recurring && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {event.recurring === 'weekly' && 'Wöchentlich'}
                  {event.recurring === 'biweekly' && 'Alle 2 Wochen'}
                  {event.recurring === 'monthly' && 'Monatlich'}
                  {event.recurring === 'quarterly' && 'Quartalsweise'}
                  {event.recurring === 'yearly' && 'Jährlich'}
                </span>
              </div>
            )}
            
            {event.participants && event.participants.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {event.participants.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function CalendarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Calendar 
        className="w-10 h-10 mb-3" 
        style={{ color: 'rgba(255,255,255,0.12)' }} 
      />
      <p 
        className="text-[12px]"
        style={{ color: 'rgba(255,255,255,0.45)' }}
      >
        Keine Termine an diesem Tag
      </p>
    </div>
  );
}

// ============================================================================
// EVENT DETAIL DRAWER - EXECUTIVE FOLDER
// ============================================================================

// Team member type for invites
interface TeamMember {
  id: string;
  username: string;
  userRole: string;
}

interface EventDetailDrawerProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  mode: DrawerMode;
  onClose: () => void;
  onSave: (data: Partial<CalendarEvent> & { invitedMembers?: string[]; postToFeed?: boolean }) => void;
  onDelete: (id: number) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

function EventDetailDrawer({ 
  event, 
  isOpen, 
  mode,
  onClose, 
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: EventDetailDrawerProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [eventType, setEventType] = useState<string>('INTERN');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // New: Invites + Feed Post state
  const [invitedMembers, setInvitedMembers] = useState<string[]>([]);
  const [postToFeed, setPostToFeed] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  
  // Fetch team members
  const { data: teamMembersData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/active-users', { credentials: 'include' });
      if (!res.ok) return { users: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const teamMembers: TeamMember[] = teamMembersData?.users || [];
  
  const isEditing = mode === 'edit' || mode === 'create';
  const isCreate = mode === 'create';
  
  // Update local state when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setInternalNotes(event.internalNotes || '');
      setSelectedTags((event.contextTags as string[]) || []);
      setEventType(event.eventType || event.type || 'INTERN');
      setStartDate(event.date ? format(event.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setStartTime(event.startTime || '09:00');
      setEndTime(event.endTime || '10:00');
      // Reset invite/feed state on new event
      setInvitedMembers([]);
      setPostToFeed(false);
      setMemberSearch('');
      setShowMemberDropdown(false);
    }
  }, [event]);
  
  // Filter team members based on search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return teamMembers.filter(m => !invitedMembers.includes(m.id));
    const search = memberSearch.toLowerCase();
    return teamMembers.filter(m => 
      !invitedMembers.includes(m.id) && 
      (m.username.toLowerCase().includes(search) || m.userRole.toLowerCase().includes(search))
    );
  }, [teamMembers, memberSearch, invitedMembers]);
  
  // Get invited member details
  const invitedMemberDetails = useMemo(() => {
    return invitedMembers.map(id => teamMembers.find(m => m.id === id)).filter(Boolean) as TeamMember[];
  }, [invitedMembers, teamMembers]);
  
  // Add/remove invited member
  const toggleInvitedMember = (memberId: string) => {
    setInvitedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
    setMemberSearch('');
    setShowMemberDropdown(false);
  };
  
  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);
  
  const toggleTag = (tag: ContextTag) => {
    if (event?.isReadOnly) return;
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  
  const handleSave = () => {
    if (!title.trim()) return;
    
    // Build date/time
    const startsAt = new Date(`${startDate}T${startTime}:00`);
    const endsAt = new Date(`${startDate}T${endTime}:00`);
    
    const data: Partial<CalendarEvent> & { invitedMembers?: string[]; postToFeed?: boolean } = {
      title: title.trim(),
      description: description.trim() || undefined,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      eventType,
      internalNotes: internalNotes.trim() || undefined,
      contextTags: selectedTags.length > 0 ? selectedTags : undefined,
      // Include invites and feed post option
      invitedMembers: invitedMembers.length > 0 ? invitedMembers : undefined,
      postToFeed: postToFeed || undefined,
    };
    
    if (!isCreate && event?.id) {
      (data as any).id = typeof event.id === 'string' ? parseInt(event.id) : event.id;
    }
    
    onSave(data);
  };
  
  const handleDelete = () => {
    if (event?.id && typeof event.id === 'number') {
      onDelete(event.id);
    } else if (event?.id && typeof event.id === 'string' && event.id !== 'new') {
      onDelete(parseInt(event.id));
    }
    setShowDeleteConfirm(false);
  };
  
  if (!event) return null;
  
  const color = EVENT_COLORS[event.type] || EVENT_COLORS['INTERN'] || '#FE9100';
  const label = (EVENT_LABELS[event.type] || EVENT_LABELS['INTERN'] || 'Intern').toUpperCase();
  
  const allTags: ContextTag[] = ['strategie', 'organisation', 'finance', 'board', 'intern', 'legal', 'hr', 'tech'];
  
  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998]"
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, duration: 0.18 }}
            className="fixed z-[9999] flex flex-col"
            style={{
              top: '12px',
              right: '12px',
              width: 'min(620px, 94vw)',
              height: 'calc(100vh - 24px)',
              background: 'rgba(0,0,0,0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,106,0,0.22)',
              borderRadius: '24px',
              boxShadow: '0 40px 140px rgba(0,0,0,0.9)',
            }}
          >
            {/* Zone 1 - Header (fixed) */}
            <div 
              className="flex-shrink-0 p-6 pb-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Titel eingeben..."
                      className="w-full text-[20px] font-semibold leading-tight mb-2 bg-transparent outline-none"
                      style={{ 
                        color: 'rgba(255,255,255,0.95)',
                        fontFamily: 'Inter, sans-serif',
                        borderBottom: '1px solid rgba(255,255,255,0.2)',
                        paddingBottom: '4px',
                      }}
                      autoFocus
                    />
                  ) : (
                    <h2 
                      className="text-[20px] font-semibold leading-tight mb-2"
                      style={{ 
                        color: 'rgba(255,255,255,0.95)',
                        fontFamily: 'Inter, sans-serif',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {event.title || 'Neuer Termin'}
                    </h2>
                  )}
                  
                  {/* Type Badge / Type Selector */}
                  {isEditing ? (
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="text-[11px] px-3 py-1.5 rounded-full outline-none cursor-pointer"
                      style={{
                        background: 'rgba(254,145,0,0.15)',
                        color: '#FE9100',
                        border: '1px solid rgba(254,145,0,0.3)',
                      }}
                    >
                      <option value="INTERN">Intern</option>
                      <option value="TEAM_MEETING">Team Meeting</option>
                      <option value="VERWALTUNGSRAT">Verwaltungsrat</option>
                      <option value="AUFSICHTSRAT">Aufsichtsrat</option>
                      <option value="DEADLINE">Deadline</option>
                      <option value="EXTERNAL">Extern</option>
                    </select>
                  ) : (
                    <span
                      className="inline-flex items-center text-[10px] tracking-[0.22em] px-3"
                      style={{
                        height: '26px',
                        borderRadius: '999px',
                        background: `${color}18`,
                        color: color,
                        fontFamily: 'Orbitron, sans-serif',
                      }}
                    >
                      {label}
                    </span>
                  )}
                </div>
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  <X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                </button>
              </div>
            </div>
            
            {/* Zone 2 - Body (scroll) */}
            <div 
              className="flex-1 overflow-y-auto p-6 space-y-6"
              style={{ scrollbarWidth: 'none' }}
            >
              {/* Section 1 - Zeit & Datum */}
              <div>
                <label 
                  className="block text-[10px] tracking-[0.18em] mb-3"
                  style={{ 
                    fontFamily: 'Orbitron, sans-serif',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  ZEIT & DATUM
                </label>
                <div
                  className="p-4"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '14px',
                  }}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-transparent outline-none"
                        style={{
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '14px',
                        }}
                      />
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Von</label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-transparent outline-none"
                            style={{
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: 'rgba(255,255,255,0.9)',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Bis</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-transparent outline-none"
                            style={{
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: 'rgba(255,255,255,0.9)',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p 
                        className="text-[15px] font-medium mb-1"
                        style={{ color: 'rgba(255,255,255,0.9)' }}
                      >
                        {format(event.date, 'EEEE, d. MMMM yyyy', { locale: de })}
                      </p>
                      {event.startTime && (
                        <p 
                          className="text-[13px] mb-2"
                          style={{ color: 'rgba(255,255,255,0.6)' }}
                        >
                          {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}
                        </p>
                      )}
                      {event.recurring && (
                        <div className="flex items-center gap-2 mt-2">
                          <RefreshCw className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {event.recurring === 'weekly' && 'Wöchentlich'}
                            {event.recurring === 'biweekly' && 'Alle 2 Wochen'}
                            {event.recurring === 'monthly' && 'Monatlich (jeder 3. Montag)'}
                            {event.recurring === 'quarterly' && 'Quartalsweise'}
                            {event.recurring === 'yearly' && 'Jährlich'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Section 2 - Beschreibung */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label 
                    className="text-[10px] tracking-[0.18em]"
                    style={{ 
                      fontFamily: 'Orbitron, sans-serif',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    BESCHREIBUNG
                  </label>
                  {!event.isReadOnly && (
                    <button
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors"
                      style={{ 
                        color: 'rgba(255,255,255,0.5)',
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                      Ändern
                    </button>
                  )}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschreibung hinzufügen…"
                  disabled={event.isReadOnly && !isEditing}
                  className="w-full resize-none outline-none transition-colors"
                  style={{
                    minHeight: '120px',
                    padding: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '14px',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    opacity: (event.isReadOnly && !isEditing) ? 0.6 : 1,
                  }}
                />
              </div>
              
              {/* Section 3 - Beteiligte */}
              {event.participants && event.participants.length > 0 && (
                <div>
                  <label 
                    className="block text-[10px] tracking-[0.18em] mb-3"
                    style={{ 
                      fontFamily: 'Orbitron, sans-serif',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    BETEILIGTE
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {event.participants.map((participant) => (
                      <HoverCard key={participant.id} openDelay={200}>
                        <HoverCardTrigger asChild>
                          <div
                            className="flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #FE9100, #a34e00)',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'white',
                            }}
                          >
                            {participant.initials}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="top"
                          className="w-auto p-2 border-0"
                          style={{
                            background: 'rgba(0,0,0,0.92)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,106,0,0.22)',
                            borderRadius: '10px',
                          }}
                        >
                          <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            {participant.name}
                          </p>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {participant.role}
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                    {!event.isReadOnly && (
                      <button
                        className="flex items-center justify-center transition-colors"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px dashed rgba(255,255,255,0.15)',
                        }}
                      >
                        <Plus className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Section 4 - Kontext */}
              <div>
                <label 
                  className="block text-[10px] tracking-[0.18em] mb-3"
                  style={{ 
                    fontFamily: 'Orbitron, sans-serif',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  KONTEXT
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const isActive = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        disabled={event.isReadOnly}
                        className="transition-all duration-150"
                        style={{
                          height: '28px',
                          padding: '0 12px',
                          borderRadius: '999px',
                          background: isActive ? 'rgba(255,106,0,0.15)' : 'rgba(255,255,255,0.04)',
                          border: isActive ? '1px solid rgba(255,106,0,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          color: isActive ? '#FE9100' : 'rgba(255,255,255,0.6)',
                          fontSize: '11px',
                          opacity: event.isReadOnly ? 0.5 : 1,
                          cursor: event.isReadOnly ? 'default' : 'pointer',
                        }}
                      >
                        {CONTEXT_TAG_LABELS[tag]}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Section 5 - Interne Notizen */}
              {!event.isReadOnly && (
                <div>
                  <label 
                    className="block text-[10px] tracking-[0.18em] mb-3"
                    style={{ 
                      fontFamily: 'Orbitron, sans-serif',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    INTERNE NOTIZEN
                    <span 
                      className="ml-2 text-[9px] px-2 py-0.5 rounded"
                      style={{ 
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.4)',
                      }}
                    >
                      nur intern sichtbar
                    </span>
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private Notizen hinzufügen…"
                    className="w-full resize-none outline-none"
                    style={{
                      minHeight: '100px',
                      padding: '14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '13px',
                      lineHeight: '1.6',
                    }}
                  />
                </div>
              )}
              
              {/* Section 6 - Mitarbeiter einladen (INLINE EXPANDER - no overlay!) */}
              {isEditing && (
                <div className="flex flex-col gap-3">
                  <label 
                    className="block text-[10px] tracking-[0.18em]"
                    style={{ 
                      fontFamily: 'Orbitron, sans-serif',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    MITARBEITER EINLADEN
                  </label>
                  
                  {/* Input Row: Chips + Search (all in one box) */}
                  <div
                    className="flex flex-wrap items-center gap-2"
                    style={{
                      minHeight: '52px',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: showMemberDropdown ? '1px solid rgba(254,145,0,0.25)' : '1px solid rgba(233,215,196,0.12)',
                      borderRadius: '18px',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    {/* Selected member chips */}
                    {invitedMemberDetails.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 h-[30px] px-2.5 rounded-full"
                        style={{
                          background: 'rgba(254,145,0,0.10)',
                          border: '1px solid rgba(254,145,0,0.22)',
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold"
                          style={{
                            background: 'linear-gradient(135deg, #FE9100, #a34e00)',
                            color: 'white',
                          }}
                        >
                          {member.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[11px]" style={{ color: 'rgba(233,215,196,0.92)' }}>
                          {member.username}
                        </span>
                        <button
                          onClick={() => toggleInvitedMember(member.id)}
                          className="w-4 h-4 flex items-center justify-center rounded-full transition-opacity opacity-70 hover:opacity-100"
                        >
                          <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.6)' }} />
                        </button>
                      </div>
                    ))}
                    
                    {/* Search input */}
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      onBlur={() => setTimeout(() => setShowMemberDropdown(false), 150)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowMemberDropdown(false);
                        if (e.key === 'Backspace' && !memberSearch && invitedMembers.length > 0) {
                          toggleInvitedMember(invitedMembers[invitedMembers.length - 1]);
                        }
                      }}
                      placeholder={invitedMemberDetails.length > 0 ? "Weitere hinzufügen…" : "Name oder Rolle suchen…"}
                      className="flex-1 min-w-[140px] bg-transparent border-none outline-none"
                      style={{
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '14px',
                      }}
                    />
                    <Users className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                  
                  {/* INLINE Expandable List (NOT absolute - takes up space in flow!) */}
                  {showMemberDropdown && (
                    <div
                      className="overflow-y-auto"
                      style={{
                        maxHeight: '220px',
                        padding: '6px',
                        background: 'rgba(10,10,12,0.82)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(233,215,196,0.10)',
                        borderRadius: '18px',
                      }}
                    >
                      {filteredMembers.length > 0 ? (
                        filteredMembers.slice(0, 8).map((member) => {
                          const isSelected = invitedMembers.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              onClick={() => toggleInvitedMember(member.id)}
                              className="w-full flex items-center gap-3 text-left transition-colors rounded-[14px]"
                              style={{
                                height: '56px',
                                padding: '10px 12px',
                                background: isSelected ? 'rgba(254,145,0,0.08)' : 'transparent',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = isSelected ? 'rgba(254,145,0,0.12)' : 'rgba(254,145,0,0.06)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'rgba(254,145,0,0.08)' : 'transparent'}
                            >
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                                style={{
                                  background: 'linear-gradient(135deg, #FE9100, #a34e00)',
                                  color: 'white',
                                }}
                              >
                                {member.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14.6px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                  {member.username}
                                </p>
                                <p className="text-[12px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                  {member.userRole}
                                </p>
                              </div>
                              {isSelected && (
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: 'rgba(254,145,0,0.2)' }}
                                >
                                  <span style={{ color: '#FE9100', fontSize: '14px' }}>✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center">
                          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Keine Treffer</p>
                          <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Versuche: "admin", "staff", "justin" …
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Helper text */}
                  {!showMemberDropdown && invitedMemberDetails.length === 0 && (
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Tippe um Teammitglieder zu suchen. Backspace entfernt den letzten.
                    </p>
                  )}
                </div>
              )}
              
              {/* Section 7 - Im Team Feed posten (only in create mode) */}
              {isCreate && (
                <div
                  className="p-4 rounded-xl"
                  style={{
                    marginTop: '18px',
                    paddingTop: '14px',
                    borderTop: '1px solid rgba(233,215,196,0.10)',
                    background: postToFeed ? 'rgba(254,145,0,0.08)' : 'rgba(255,255,255,0.02)',
                    border: postToFeed ? '1px solid rgba(254,145,0,0.2)' : '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p 
                        className="text-[12px] font-medium mb-1"
                        style={{ color: postToFeed ? '#FE9100' : 'rgba(255,255,255,0.85)' }}
                      >
                        Im Team Feed posten
                      </p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Teilt das Event im Team Feed, damit alle es sehen.
                      </p>
                    </div>
                    
                    {/* Toggle */}
                    <button
                      onClick={() => setPostToFeed(!postToFeed)}
                      className="relative flex-shrink-0"
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        background: postToFeed 
                          ? 'linear-gradient(135deg, #FE9100, #e67e00)' 
                          : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <span
                        className="absolute top-1 w-5 h-5 rounded-full transition-all"
                        style={{
                          left: postToFeed ? '22px' : '2px',
                          background: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        }}
                      />
                    </button>
                  </div>
                  
                  {/* Preview card when active */}
                  {postToFeed && (
                    <div 
                      className="mt-3 p-3 rounded-lg"
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <p className="text-[10px] tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron, sans-serif' }}>
                        FEED PREVIEW
                      </p>
                      <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Neuer Termin: {title || 'Titel eingeben…'}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {startDate ? format(new Date(startDate), 'EEE, d. MMM', { locale: de }) : 'Datum'} · {startTime}–{endTime}
                        {invitedMemberDetails.length > 0 && ` · ${invitedMemberDetails.length} eingeladen`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Zone 3 - Footer (fixed) */}
            <div 
              className="flex-shrink-0 p-6 pt-4 flex items-center justify-between gap-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Left - Delete (only for editable events) */}
              <div>
                {!isCreate && !event.isReadOnly && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 transition-colors"
                    style={{
                      height: '42px',
                      borderRadius: '14px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      color: 'rgba(239,68,68,0.7)',
                      fontSize: '13px',
                      opacity: isDeleting ? 0.6 : 1,
                    }}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Löschen
                  </button>
                )}
              </div>
              
              {/* Right - Close & Save */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 transition-colors"
                  style={{
                    height: '42px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                  }}
                >
                  {isEditing ? 'Abbrechen' : 'Schließen'}
                </button>
                {(isEditing || !event.isReadOnly) && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !title.trim()}
                    className="flex items-center gap-2 px-5 transition-colors"
                    style={{
                      height: '42px',
                      borderRadius: '14px',
                      background: (isSaving || !title.trim()) 
                        ? 'rgba(254,145,0,0.3)' 
                        : 'linear-gradient(135deg, #FE9100, #e67e00)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                      opacity: (isSaving || !title.trim()) ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isCreate ? 'Erstellen' : 'Speichern'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
  
  // Portal render
  if (typeof document !== 'undefined') {
    return (
      <>
        {createPortal(drawerContent, document.body)}
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent
            style={{
              background: 'rgba(0,0,0,0.95)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '16px',
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: 'rgba(255,255,255,0.95)' }}>
                Termin löschen?
              </AlertDialogTitle>
              <AlertDialogDescription style={{ color: 'rgba(255,255,255,0.6)' }}>
                Dieser Termin wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                style={{
                  background: 'rgba(239,68,68,0.8)',
                  color: 'white',
                }}
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface TeamCalendarProps {
  className?: string;
  onEventClick?: (event: CalendarEvent) => void;
}

export function TeamCalendar({ className = '', onEventClick }: TeamCalendarProps) {
  // View state with localStorage persistence - DEFAULT: 'week'
  const [calendarView, setCalendarView] = useState<CalendarView>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aras.teamCalendar.view');
      if (saved === 'day' || saved === 'week' || saved === 'month') {
        return saved;
      }
    }
    return 'week'; // WEEK VIEW IS DEFAULT
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [drawerEvent, setDrawerEvent] = useState<CalendarEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Persist view to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aras.teamCalendar.view', calendarView);
    }
  }, [calendarView]);
  
  // Handle view change
  const handleViewChange = useCallback((view: CalendarView) => {
    setCalendarView(view);
  }, []);
  
  // Handle day click from week/month views - switch to day view
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setCalendarView('day');
    setWeekOffset(0);
  }, []);
  
  // Live clock update every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // Fetch calendar events from API
  const { data: apiData, isLoading, error, refetch } = useQuery({
    queryKey: ['team-calendar'],
    queryFn: async () => {
      const fromDate = subDays(new Date(), 30).toISOString();
      const toDate = addDays(new Date(), 180).toISOString();
      const res = await fetch(`/api/internal/command-center/team-calendar?from=${fromDate}&to=${toDate}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch calendar events');
      return res.json();
    },
    staleTime: 30000,
    retry: 1,
  });
  
  // Transform API events to CalendarEvent format
  const apiEvents: CalendarEvent[] = useMemo(() => {
    if (!apiData?.events) return [];
    return apiData.events.map((e: APICalendarEvent) => {
      const startsAt = new Date(e.startsAt);
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        date: startOfDay(startsAt),
        startTime: format(startsAt, 'HH:mm'),
        endTime: e.endsAt ? format(new Date(e.endsAt), 'HH:mm') : undefined,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        type: (e.eventType || 'INTERN') as EventType,
        eventType: e.eventType,
        isReadOnly: e.isReadOnly,
        visibility: e.visibility,
        color: e.color,
        recurrence: e.recurrence,
        internalNotes: e.internalNotes,
        contextTags: e.contextTags,
        createdByUserId: e.createdByUserId,
        creatorUsername: e.creatorUsername,
      };
    });
  }, [apiData]);
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (event: Partial<CalendarEvent>) => {
      const res = await fetch('/api/internal/command-center/team-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(event),
      });
      if (!res.ok) throw new Error('Failed to create event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
      showToast('Termin erstellt', 'success');
      closeDrawer();
    },
    onError: () => showToast('Fehler beim Erstellen', 'error'),
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<CalendarEvent>) => {
      const res = await fetch(`/api/internal/command-center/team-calendar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
      showToast('Änderungen gespeichert', 'success');
      setDrawerMode('view');
    },
    onError: (err: any) => showToast(err.message || 'Fehler beim Speichern', 'error'),
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/internal/command-center/team-calendar/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete event');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
      showToast('Termin gelöscht', 'success');
      closeDrawer();
    },
    onError: (err: any) => showToast(err.message || 'Fehler beim Löschen', 'error'),
  });
  
  // Fallback to mock data if API fails or returns empty
  const mockEvents = useMemo(() => generateMockEvents(), []);
  const allEvents = useMemo(() => {
    // Use mock data if explicitly enabled, or if API failed, or if API returned no events
    if (useMockData) return mockEvents;
    if (error) return mockEvents;
    if (apiEvents.length === 0 && !isLoading) return mockEvents;
    if (apiEvents.length > 0) return apiEvents;
    return mockEvents;
  }, [useMockData, error, apiEvents, mockEvents, isLoading]);
  
  // Handle event click - open drawer
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setDrawerEvent(event);
    setDrawerMode('view');
    setIsDrawerOpen(true);
    onEventClick?.(event);
  }, [onEventClick]);
  
  // Open create mode
  const handleCreateEvent = useCallback(() => {
    const newEvent: CalendarEvent = {
      id: 'new',
      title: '',
      description: '',
      date: selectedDate,
      startTime: '09:00',
      endTime: '10:00',
      type: 'INTERN',
      eventType: 'INTERN',
      contextTags: [],
      internalNotes: '',
      isReadOnly: false,
    };
    setDrawerEvent(newEvent);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  }, [selectedDate]);
  
  // Close drawer
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setDrawerMode('view');
    setTimeout(() => setDrawerEvent(null), 200);
  }, []);
  
  // Handle slot click in WeekView - create event with prefilled time
  const handleSlotClick = useCallback((date: Date, hour: number) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = Math.min(hour + 1, 20);
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    
    const newEvent: CalendarEvent = {
      id: 'new',
      title: '',
      description: '',
      date: date,
      startTime,
      endTime,
      type: 'INTERN',
      eventType: 'INTERN',
      contextTags: [],
      internalNotes: '',
      isReadOnly: false,
    };
    setDrawerEvent(newEvent);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  }, []);
  
  // Handle cell click in MonthView - create event with prefilled date
  const handleCellClick = useCallback((date: Date) => {
    const newEvent: CalendarEvent = {
      id: 'new',
      title: '',
      description: '',
      date: date,
      startTime: '09:00',
      endTime: '09:30',
      type: 'INTERN',
      eventType: 'INTERN',
      contextTags: [],
      internalNotes: '',
      isReadOnly: false,
    };
    setDrawerEvent(newEvent);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  }, []);
  
  // Get 7 days for navigation
  const days = useMemo(() => {
    const baseDate = addDays(startOfDay(new Date()), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(baseDate, i - 3));
  }, [weekOffset]);
  
  // Get events for selected date
  const selectedDayEvents = useMemo(() => {
    return allEvents
      .filter(e => isSameDay(e.date, selectedDate))
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [allEvents, selectedDate]);
  
  // Check if a day has events
  const hasEventsOnDay = (date: Date) => {
    return allEvents.some(e => isSameDay(e.date, date));
  };
  
  // Current month/year for header
  const currentMonthYear = format(selectedDate, 'MMMM yyyy', { locale: de }).toUpperCase();
  
  return (
    <div 
      className={className}
      style={{
        background: 'rgba(0,0,0,0.46)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '22px',
        padding: '20px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.35)',
      }}
    >
      {/* Header - Executive ruhig */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h2 
            className="text-[13px]"
            style={{ 
              fontFamily: 'Orbitron, sans-serif', 
              letterSpacing: '0.24em',
              color: '#e9d7c4', 
              opacity: 0.95 
            }}
          >
            TEAM CALENDAR
          </h2>
          <p 
            className="text-[12px] mt-1.5" 
            style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif' }}
          >
            Übersicht · Meetings · Feiertage
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <ViewSwitcher currentView={calendarView} onViewChange={handleViewChange} />
          
          {/* Add Event Button */}
          <button
            onClick={handleCreateEvent}
            className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FE9100, #e67e00)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Termin</span>
            {/* Micro shine on hover */}
            <span 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transform: 'translateX(-100%)',
                animation: 'none',
              }}
            />
          </button>
          
          <span 
            className="text-[10px] tracking-wider hidden sm:inline"
            style={{ 
              fontFamily: 'Orbitron, sans-serif',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {currentMonthYear}
          </span>
          
          {/* Loading indicator */}
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
          
          {/* Info Tooltip with Backdrop */}
          <InfoTooltipWithBackdrop />
        </div>
      </div>
      
      {/* Subtle Separator */}
      <div 
        className="h-px mb-5 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div 
          className="absolute left-0 top-0 h-full w-24"
          style={{ background: 'linear-gradient(90deg, rgba(255,106,0,0.3), transparent)' }}
        />
      </div>
      
      {/* ========== DAY VIEW ========== */}
      {calendarView === 'day' && (
        <>
          {/* Day Navigation - Timeline Pills */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ 
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
            
            <div className="flex-1 flex justify-between gap-2 overflow-x-auto py-1">
              {days.map((day) => (
                <DayPill
                  key={day.toISOString()}
                  date={day}
                  isSelected={isSameDay(day, selectedDate)}
                  hasEvents={hasEventsOnDay(day)}
                  onClick={() => setSelectedDate(day)}
                />
              ))}
            </div>
            
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ 
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>
          
          {/* Day Focus Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <span 
                className="text-[22px] font-bold"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4',
                }}
              >
                {format(selectedDate, 'EEE', { locale: de }).toUpperCase()} · {format(selectedDate, 'dd')}
              </span>
              <span 
                className="text-[12px]"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                {format(selectedDate, 'MMMM yyyy', { locale: de })}
              </span>
              {isToday(selectedDate) && (
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ 
                    background: 'rgba(255,106,0,0.15)',
                    color: '#ff6a00',
                  }}
                >
                  HEUTE
                </span>
              )}
            </div>
            
            {/* Live Clock */}
            {isToday(selectedDate) && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
                <span 
                  className="text-[12px] font-medium"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  {format(currentTime, 'HH:mm')}
                </span>
              </div>
            )}
          </div>
          
          {/* Event List */}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
            <AnimatePresence mode="wait">
              {selectedDayEvents.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CalendarEmptyState />
                </motion.div>
              ) : (
                <motion.div
                  key={selectedDate.toISOString()}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-2.5"
                >
                  {selectedDayEvents.map((event) => (
                    <EventCard 
                      key={event.id} 
                      event={event}
                      onClick={() => handleEventClick(event)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Today Button (if not on today) */}
          {!isToday(selectedDate) && (
            <button
              onClick={() => {
                setSelectedDate(startOfDay(new Date()));
                setWeekOffset(0);
              }}
              className="w-full mt-4 py-2.5 text-[11px] font-medium tracking-wider transition-all duration-150"
              style={{
                borderRadius: '10px',
                background: 'rgba(255,106,0,0.08)',
                border: '1px solid rgba(255,106,0,0.15)',
                color: '#FE9100',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,106,0,0.12)';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(254,145,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,106,0,0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ZURÜCK ZU HEUTE
            </button>
          )}
        </>
      )}
      
      {/* ========== WEEK VIEW ========== */}
      {calendarView === 'week' && (
        <>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(d => subWeeks(d, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ 
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <span 
                className="text-[14px] font-medium"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd. MMM', { locale: de })} – {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd. MMM yyyy', { locale: de })}
              </span>
              <button
                onClick={() => setSelectedDate(d => addWeeks(d, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ 
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
            
            {/* Today button */}
            <button
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'rgba(255,106,0,0.08)',
                border: '1px solid rgba(255,106,0,0.15)',
                color: '#FE9100',
              }}
            >
              Heute
            </button>
          </div>
          
          <WeekView
            selectedDate={selectedDate}
            events={allEvents}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
            onSlotClick={handleSlotClick}
          />
        </>
      )}
      
      {/* ========== MONTH VIEW ========== */}
      {calendarView === 'month' && (
        <>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(d => subMonths(d, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ 
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <span 
                className="text-[16px] font-semibold"
                style={{ 
                  color: '#e9d7c4',
                  fontFamily: 'Orbitron, sans-serif',
                  letterSpacing: '0.1em',
                }}
              >
                {format(selectedDate, 'MMMM yyyy', { locale: de }).toUpperCase()}
              </span>
              <button
                onClick={() => setSelectedDate(d => addMonths(d, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ 
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>
            
            {/* Today button */}
            <button
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'rgba(255,106,0,0.08)',
                border: '1px solid rgba(255,106,0,0.15)',
                color: '#FE9100',
              }}
            >
              Heute
            </button>
          </div>
          
          <MonthView
            selectedDate={selectedDate}
            events={allEvents}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
            onCellClick={handleCellClick}
          />
        </>
      )}
      
      {/* Event Detail Drawer */}
      <EventDetailDrawer
        event={drawerEvent}
        isOpen={isDrawerOpen}
        mode={drawerMode}
        onClose={closeDrawer}
        onSave={(data) => {
          if (drawerMode === 'create') {
            createMutation.mutate(data);
          } else if (data.id) {
            const numericId = typeof data.id === 'string' ? parseInt(data.id as string) : (data.id as number);
            const { id: _, ...rest } = data;
            updateMutation.mutate({ id: numericId, ...rest });
          }
        }}
        onDelete={(id) => deleteMutation.mutate(id)}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

export default TeamCalendar;
