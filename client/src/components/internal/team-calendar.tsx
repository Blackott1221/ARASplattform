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
// MOCK EVENTS - 50+ Events
// ============================================================================

function generateMockEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const today = startOfDay(new Date());
  const year = today.getFullYear();
  
  // ========== RECURRING MEETINGS ==========
  
  // Every Friday - Team Meeting 10:00-11:00
  for (let i = 0; i < 52; i++) {
    const friday = new Date(year, 0, 1);
    friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7) + (i * 7));
    if (friday >= subDays(today, 30) && friday <= addDays(today, 90)) {
      events.push({
        id: `team-meeting-${i}`,
        title: 'Team Meeting',
        description: 'Wöchentliches Team-Alignment zu laufenden Projekten, Prioritäten und offenen Punkten. Statusupdates aller Bereiche und Planung der kommenden Woche.',
        date: friday,
        startTime: '10:00',
        endTime: '11:00',
        type: 'team-meeting',
        recurring: 'weekly',
        participants: [MOCK_PARTICIPANTS['team'], MOCK_PARTICIPANTS['js'], MOCK_PARTICIPANTS['hs']],
        contextTags: ['organisation', 'intern'],
        internalNotes: 'Agenda wird donnerstags verschickt. Protokoll im Confluence.',
      });
    }
  }
  
  // Every 2nd Friday - Verwaltungsrat 14:00-16:00
  for (let i = 0; i < 26; i++) {
    const friday = new Date(year, 0, 1);
    friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7) + (i * 14));
    if (friday >= subDays(today, 30) && friday <= addDays(today, 90)) {
      events.push({
        id: `verwaltungsrat-${i}`,
        title: 'Verwaltungsrat',
        description: 'Besprechung strategischer Entscheidungen, laufender Beteiligungen und Governance-Themen. Quartalszahlen, Investitionsentscheidungen und Risikobewertungen.',
        date: friday,
        startTime: '14:00',
        endTime: '16:00',
        type: 'verwaltungsrat',
        recurring: 'biweekly',
        participants: [MOCK_PARTICIPANTS['vr'], MOCK_PARTICIPANTS['js'], MOCK_PARTICIPANTS['mw']],
        contextTags: ['board', 'strategie', 'finance'],
        internalNotes: 'Vertraulich. Unterlagen nur über sicheren Kanal.',
      });
    }
  }
  
  // Every 3rd Monday - Aufsichtsrat 09:00-11:00
  for (let i = 0; i < 12; i++) {
    const monday = new Date(year, 0, 1);
    monday.setDate(monday.getDate() + ((1 - monday.getDay() + 7) % 7) + (i * 21));
    if (monday >= subDays(today, 30) && monday <= addDays(today, 90)) {
      events.push({
        id: `aufsichtsrat-${i}`,
        title: 'Aufsichtsrat',
        description: 'Aufsichtsratssitzung mit Prüfung und Überwachung der Geschäftsführung. Bericht des Vorstands, Jahresabschluss-Prüfung und strategische Weichenstellungen.',
        date: monday,
        startTime: '09:00',
        endTime: '11:00',
        type: 'aufsichtsrat',
        recurring: 'monthly',
        participants: [MOCK_PARTICIPANTS['ar'], MOCK_PARTICIPANTS['vs']],
        contextTags: ['board', 'strategie'],
        internalNotes: 'Streng vertraulich. Nur autorisierte Teilnehmer.',
        isReadOnly: true,
      });
    }
  }
  
  // ========== HOLIDAYS (DACH + CH) ==========
  
  const holidays: { date: Date; title: string }[] = [
    { date: new Date(year, 0, 1), title: 'Neujahr' },
    { date: new Date(year, 0, 6), title: 'Heilige Drei Könige' },
    { date: new Date(year, 3, 18), title: 'Karfreitag' }, // 2026 approx
    { date: new Date(year, 3, 21), title: 'Ostermontag' }, // 2026 approx
    { date: new Date(year, 4, 1), title: 'Tag der Arbeit' },
    { date: new Date(year, 4, 29), title: 'Christi Himmelfahrt' }, // 2026 approx
    { date: new Date(year, 5, 8), title: 'Pfingstmontag' }, // 2026 approx
    { date: new Date(year, 7, 1), title: 'Nationalfeiertag CH' },
    { date: new Date(year, 9, 3), title: 'Tag der Deutschen Einheit' },
    { date: new Date(year, 9, 26), title: 'Nationalfeiertag AT' },
    { date: new Date(year, 10, 1), title: 'Allerheiligen' },
    { date: new Date(year, 11, 25), title: 'Weihnachten' },
    { date: new Date(year, 11, 26), title: 'Stephanstag' },
  ];
  
  holidays.forEach((h, i) => {
    events.push({
      id: `holiday-${i}`,
      title: h.title,
      description: 'Gesetzlicher Feiertag. Büro geschlossen.',
      date: h.date,
      type: 'feiertag',
      recurring: 'yearly',
      isReadOnly: true,
    });
  });
  
  // ========== INTERNAL FIXED EVENTS ==========
  
  const internalEvents: { dayOffset: number; title: string; time: string; desc: string }[] = [
    { dayOffset: 1, title: 'Strategy Workshop', time: '09:00-12:00', desc: 'Quartalsstrategie und Roadmap-Planung' },
    { dayOffset: 2, title: 'Board Preparation', time: '14:00-15:00', desc: 'Vorbereitung der Unterlagen für Board Meeting' },
    { dayOffset: 3, title: 'Quarterly Review', time: '10:00-12:00', desc: 'Quartalsrückblick mit KPI-Analyse' },
    { dayOffset: 5, title: 'Monatsabschluss Finance', time: '09:00-11:00', desc: 'Finanzabschluss und Reporting' },
    { dayOffset: 7, title: 'Investor Update Call', time: '16:00-17:00', desc: 'Investoren-Update zur Geschäftsentwicklung' },
    { dayOffset: 8, title: 'Legal Review Window', time: '14:00-16:00', desc: 'Rechtliche Prüfung laufender Verträge' },
    { dayOffset: 10, title: 'Internal Audit Check', time: '09:00-12:00', desc: 'Interne Revision und Compliance-Check' },
    { dayOffset: 12, title: 'HR Review', time: '11:00-12:00', desc: 'Personalentwicklung und Recruiting-Status' },
    { dayOffset: 14, title: 'IT Maintenance Window', time: '18:00-22:00', desc: 'Geplante Systemwartung' },
    { dayOffset: 15, title: 'Reporting Deadline', time: '23:59', desc: 'Abgabefrist Monatsreporting' },
    { dayOffset: -2, title: 'Client Presentation', time: '15:00-16:30', desc: 'Kundenpräsentation Q1 Results' },
    { dayOffset: -5, title: 'Team Offsite', time: '09:00-17:00', desc: 'Team-Event und Strategieworkshop' },
    { dayOffset: 0, title: 'Daily Standup', time: '09:00-09:15', desc: 'Tägliches Kurz-Standup' },
    { dayOffset: 4, title: 'Product Demo', time: '14:00-15:00', desc: 'Demo neuer Features für Stakeholder' },
    { dayOffset: 6, title: 'Partner Meeting', time: '11:00-12:00', desc: 'Abstimmung mit externen Partnern' },
    { dayOffset: 9, title: 'Budget Planning', time: '10:00-12:00', desc: 'Budgetplanung nächstes Quartal' },
    { dayOffset: 11, title: 'Security Review', time: '14:00-15:30', desc: 'Sicherheitsüberprüfung und Penetration Tests' },
    { dayOffset: 13, title: 'Marketing Sync', time: '10:00-11:00', desc: 'Marketing-Abstimmung und Kampagnenplanung' },
    { dayOffset: 16, title: 'Sales Pipeline Review', time: '15:00-16:00', desc: 'Vertriebspipeline und Forecast' },
    { dayOffset: 18, title: 'Tech Debt Review', time: '11:00-12:00', desc: 'Priorisierung technischer Schulden' },
    { dayOffset: 20, title: 'OKR Check-in', time: '10:00-11:00', desc: 'OKR-Fortschritt und Anpassungen' },
    { dayOffset: 22, title: 'Compliance Training', time: '14:00-16:00', desc: 'Pflichtschulung Compliance' },
    { dayOffset: 25, title: 'Architecture Review', time: '09:00-11:00', desc: 'Technische Architektur-Entscheidungen' },
    { dayOffset: 28, title: 'Customer Success Sync', time: '15:00-16:00', desc: 'Kundenzufriedenheit und Retention' },
    { dayOffset: 30, title: 'Month End Review', time: '16:00-17:00', desc: 'Monatsabschluss-Besprechung' },
  ];
  
  // Context tags for internal events
  const internalContextMap: Record<string, ContextTag[]> = {
    'Strategy Workshop': ['strategie', 'board'],
    'Board Preparation': ['board', 'organisation'],
    'Quarterly Review': ['finance', 'strategie'],
    'Monatsabschluss Finance': ['finance'],
    'Investor Update Call': ['finance', 'board'],
    'Legal Review Window': ['legal'],
    'Internal Audit Check': ['finance', 'legal'],
    'HR Review': ['hr', 'organisation'],
    'IT Maintenance Window': ['tech'],
    'Reporting Deadline': ['finance'],
    'Client Presentation': ['strategie'],
    'Team Offsite': ['organisation', 'intern'],
    'Daily Standup': ['intern', 'organisation'],
    'Product Demo': ['tech', 'strategie'],
    'Partner Meeting': ['strategie'],
    'Budget Planning': ['finance'],
    'Security Review': ['tech', 'legal'],
    'Marketing Sync': ['strategie'],
    'Sales Pipeline Review': ['finance', 'strategie'],
    'Tech Debt Review': ['tech'],
    'OKR Check-in': ['organisation', 'strategie'],
    'Compliance Training': ['legal', 'hr'],
    'Architecture Review': ['tech'],
    'Customer Success Sync': ['strategie'],
    'Month End Review': ['finance', 'organisation'],
  };

  internalEvents.forEach((e, i) => {
    const eventDate = addDays(today, e.dayOffset);
    const [start, end] = e.time.includes('-') ? e.time.split('-') : [e.time, undefined];
    events.push({
      id: `internal-${i}`,
      title: e.title,
      description: e.desc,
      date: eventDate,
      startTime: start,
      endTime: end,
      type: 'intern',
      participants: [MOCK_PARTICIPANTS['team']],
      contextTags: internalContextMap[e.title] || ['intern'],
    });
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
