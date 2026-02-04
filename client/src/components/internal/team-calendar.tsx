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
 * - Hover Cards für Details
 * - 50+ Mock Events (Meetings, Feiertage, Intern)
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Users, Building2, Briefcase, 
  Info, ChevronLeft, ChevronRight, Star
} from 'lucide-react';
import { format, addDays, subDays, isToday, isSameDay, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

// ============================================================================
// TYPES
// ============================================================================

type EventType = 'team-meeting' | 'verwaltungsrat' | 'aufsichtsrat' | 'feiertag' | 'intern';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  type: EventType;
  recurring?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  participants?: string[];
}

// ============================================================================
// EVENT TYPE COLORS
// ============================================================================

const EVENT_COLORS: Record<EventType, string> = {
  'team-meeting': '#ff6a00',      // Orange
  'verwaltungsrat': '#e9d7c4',    // Gold
  'aufsichtsrat': '#f5f5f7',      // Weiß/Beige
  'feiertag': '#6b7280',          // Grau
  'intern': '#9ca3af',            // Neutral
};

const EVENT_LABELS: Record<EventType, string> = {
  'team-meeting': 'Team Meeting',
  'verwaltungsrat': 'Verwaltungsrat',
  'aufsichtsrat': 'Aufsichtsrat',
  'feiertag': 'Feiertag',
  'intern': 'Intern',
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
        description: 'Wöchentliches Team-Standup mit Statusupdates und Planung der kommenden Woche.',
        date: friday,
        startTime: '10:00',
        endTime: '11:00',
        type: 'team-meeting',
        recurring: 'weekly',
        participants: ['Team'],
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
        description: 'Sitzung des Verwaltungsrats mit strategischen Entscheidungen und Governance.',
        date: friday,
        startTime: '14:00',
        endTime: '16:00',
        type: 'verwaltungsrat',
        recurring: 'biweekly',
        participants: ['Verwaltungsrat', 'CEO', 'CFO'],
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
        description: 'Aufsichtsratssitzung mit Prüfung und Überwachung der Geschäftsführung.',
        date: monday,
        startTime: '09:00',
        endTime: '11:00',
        type: 'aufsichtsrat',
        recurring: 'monthly',
        participants: ['Aufsichtsrat', 'Vorstand'],
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
      description: 'Gesetzlicher Feiertag',
      date: h.date,
      type: 'feiertag',
      recurring: 'yearly',
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
      participants: ['Team'],
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
// MAIN COMPONENT
// ============================================================================

interface TeamCalendarProps {
  className?: string;
  onEventClick?: (event: CalendarEvent) => void;
}

export function TeamCalendar({ className = '', onEventClick }: TeamCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Generate mock events once
  const allEvents = useMemo(() => generateMockEvents(), []);
  
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
          <span 
            className="text-[10px] tracking-wider"
            style={{ 
              fontFamily: 'Orbitron, sans-serif',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {currentMonthYear}
          </span>
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
                Wählen Sie einen Tag um alle Termine zu sehen. Hover über Events zeigt Details.
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
      <div className="flex items-baseline gap-3 mb-4">
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
                  onClick={() => onEventClick?.(event)}
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
    </div>
  );
}

export default TeamCalendar;
