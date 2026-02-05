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

import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Users, Building2, Briefcase, 
  Info, ChevronLeft, ChevronRight, Star, X, Pencil,
  Trash2, Save, Plus, RefreshCw, Loader2, AlertCircle
} from 'lucide-react';
import { format, addDays, subDays, isToday, isSameDay, startOfDay } from 'date-fns';
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

type EventType = 'team-meeting' | 'verwaltungsrat' | 'aufsichtsrat' | 'feiertag' | 'intern' | 'INTERN' | 'TEAM_MEETING' | 'VERWALTUNGSRAT' | 'AUFSICHTSRAT' | 'FEIERTAG' | 'DEADLINE' | 'EXTERNAL';
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

const EVENT_COLORS: Record<string, string> = {
  'team-meeting': '#ff6a00',
  'verwaltungsrat': '#e9d7c4',
  'aufsichtsrat': '#f5f5f7',
  'feiertag': '#6b7280',
  'intern': '#9ca3af',
  'INTERN': '#3B82F6',
  'TEAM_MEETING': '#22C55E',
  'VERWALTUNGSRAT': '#F59E0B',
  'AUFSICHTSRAT': '#EF4444',
  'FEIERTAG': '#6B7280',
  'DEADLINE': '#8B5CF6',
  'EXTERNAL': '#06B6D4',
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
};

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

interface EventDetailDrawerProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  mode: DrawerMode;
  onClose: () => void;
  onSave: (data: Partial<CalendarEvent>) => void;
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
    }
  }, [event]);
  
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
    
    const data: Partial<CalendarEvent> = {
      title: title.trim(),
      description: description.trim() || undefined,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      eventType,
      internalNotes: internalNotes.trim() || undefined,
      contextTags: selectedTags.length > 0 ? selectedTags : undefined,
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
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [drawerEvent, setDrawerEvent] = useState<CalendarEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Live clock update every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
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
  
  // Fallback to mock data if API fails or no data
  const mockEvents = useMemo(() => generateMockEvents(), []);
  const allEvents = useMemo(() => {
    if (useMockData || (error && !apiEvents.length)) return mockEvents;
    if (apiEvents.length > 0) return apiEvents;
    return mockEvents;
  }, [useMockData, error, apiEvents, mockEvents]);
  
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
      <div className="flex items-start justify-between mb-5">
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
        
        <div className="flex items-center gap-2">
          {/* Add Event Button */}
          <button
            onClick={handleCreateEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #FE9100, #e67e00)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Termin</span>
          </button>
          
          <span 
            className="text-[10px] tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, sans-serif',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {currentMonthYear}
          </span>
          
          {/* Loading/Refresh indicator */}
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
          )}
          
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <button
                className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <Info className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </HoverCardTrigger>
            <HoverCardContent 
              side="bottom" 
              align="end"
              className="w-[260px] p-3 border-0"
              style={{
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,106,0,0.22)',
                borderRadius: '14px',
              }}
            >
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Wählen Sie einen Tag um alle Termine zu sehen. Klicken Sie auf "Termin" um einen neuen Eintrag zu erstellen.
              </p>
            </HoverCardContent>
          </HoverCard>
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
        >
          ZURÜCK ZU HEUTE
        </button>
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
