import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin,
  User,
  FileText,
  Sparkles,
  X,
  Edit,
  Trash2,
  Phone,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday, isTomorrow, isPast, addHours, setHours, setMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import type { SubscriptionResponse } from "@shared/schema";

// ARAS CI
const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00',
  black: '#0a0a0a'
};

// Event Type
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: number; // minutes
  location?: string;
  attendees?: string;
  type: 'call' | 'meeting' | 'reminder' | 'other';
  status: 'scheduled' | 'completed' | 'cancelled';
  callId?: string; // Reference to call if created from call
  createdAt: string;
  updatedAt: string;
}

// Calendar Grid Component
const CalendarGrid = ({ days, currentMonth, selectedDate, onSelectDate, getEventsForDay, getTypeColor }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="rounded-2xl p-6"
    style={{
      background: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(16px)'
    }}
  >
    {/* Weekday Headers */}
    <div className="grid grid-cols-7 gap-2 mb-4">
      {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day) => (
        <div key={day} className="text-center text-xs font-semibold text-gray-500">
          {day}
        </div>
      ))}
    </div>

    {/* Days Grid */}
    <div className="grid grid-cols-7 gap-2">
      {days.map((day: Date, idx: number) => {
        const dayEvents = getEventsForDay(day);
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isToday_ = isToday(day);
        const isPastDay = isPast(day) && !isToday_;

        return (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelectDate(day)}
            className="aspect-square p-2 rounded-xl cursor-pointer transition-all relative overflow-hidden"
            style={{
              background: isSelected
                ? `linear-gradient(135deg, ${CI.orange}20, ${CI.goldLight}15)`
                : isToday_
                ? 'rgba(254, 145, 0, 0.08)'
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${
                isSelected
                  ? `${CI.orange}40`
                  : isToday_
                  ? `${CI.orange}20`
                  : 'rgba(255,255,255,0.06)'
              }`,
              opacity: isCurrentMonth ? 1 : 0.3
            }}
          >
            <div className="flex flex-col h-full">
              <div className={`text-xs font-semibold mb-1 ${
                isToday_ ? 'text-orange-400' : 
                isPastDay ? 'text-gray-600' : 
                'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>

              {/* Event Indicators */}
              <div className="flex-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event: any, i: number) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="text-[9px] px-1 py-0.5 rounded truncate"
                    style={{
                      background: `${getTypeColor(event.type)}15`,
                      color: getTypeColor(event.type),
                      border: `1px solid ${getTypeColor(event.type)}30`
                    }}
                    title={event.title}
                  >
                    {event.time} {event.title}
                  </motion.div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[8px] text-gray-500 text-center">
                    +{dayEvents.length - 3} mehr
                  </div>
                )}
              </div>

              {/* AI Indicator */}
              {dayEvents.some((e: any) => e.callId) && (
                <motion.div 
                  className="absolute top-1 right-1"
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: CI.orange }} />
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  </motion.div>
);

// Day Events List Component
const DayEventsList = ({ selectedDate, events, onEditEvent, onDeleteEvent, onAddEvent, getTypeColor }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="mt-6 rounded-2xl p-6"
    style={{
      background: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(16px)'
    }}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white">
        {format(selectedDate, 'EEEE, d. MMMM', { locale: de })}
      </h3>
      {isToday(selectedDate) && (
        <span className="px-2 py-1 rounded-lg text-xs font-semibold"
          style={{
            background: `${CI.orange}20`,
            color: CI.orange
          }}>
          Heute
        </span>
      )}
    </div>

    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Termine für diesen Tag</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddEvent}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: CI.goldLight
            }}
          >
            Termin hinzufügen
          </motion.button>
        </div>
      ) : (
        events.map((event: any) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: 4 }}
            className="p-4 rounded-xl cursor-pointer group"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
            onClick={() => onEditEvent(event)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" 
                    style={{ background: getTypeColor(event.type) }} 
                  />
                  <h4 className="font-semibold text-white">{event.title}</h4>
                  {event.callId && (
                    <span title="AI erstellt">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: CI.orange }} />
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{event.time} ({event.duration} Min)</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.attendees && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      <span>{event.attendees}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditEvent(event);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                >
                  <Edit className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Termin löschen?')) {
                      onDeleteEvent(event.id);
                    }
                  }}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  </motion.div>
);

// Event Modal Component
const EventModal = ({ show, onClose, eventForm, setEventForm, editingEvent, onSave }: any) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-2xl rounded-2xl p-6 relative"
          style={{
            background: 'rgba(10, 10, 10, 0.98)',
            border: `1px solid ${CI.orange}30`,
            backdropFilter: 'blur(20px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold" style={{ 
              background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {editingEvent ? 'Termin bearbeiten' : 'Neuer Termin'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">
                Titel <span style={{ color: CI.orange }}>*</span>
              </label>
              <input
                type="text"
                value={eventForm.title}
                onChange={(e: any) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="z.B. Meeting mit Max Mustermann"
                className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Datum</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e: any) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-white focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Zeit</label>
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={(e: any) => setEventForm({ ...eventForm, time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-white focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Dauer (Min)</label>
                <input
                  type="number"
                  value={eventForm.duration}
                  onChange={(e: any) => setEventForm({ ...eventForm, duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl text-white focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Typ</label>
              <select
                value={eventForm.type}
                onChange={(e: any) => setEventForm({ ...eventForm, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-white focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <option value="meeting">Meeting</option>
                <option value="call">Anruf</option>
                <option value="reminder">Erinnerung</option>
                <option value="other">Andere</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Ort</label>
              <input
                type="text"
                value={eventForm.location}
                onChange={(e: any) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Teilnehmer</label>
              <input
                type="text"
                value={eventForm.attendees}
                onChange={(e: any) => setEventForm({ ...eventForm, attendees: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Beschreibung</label>
              <textarea
                value={eventForm.description}
                onChange={(e: any) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Optional"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all resize-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onSave}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                  color: '#000'
                }}
              >
                {editingEvent ? 'Speichern' : 'Termin erstellen'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9ca3af'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function CalendarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Calendar States
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // Event Form State
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    duration: 60,
    location: '',
    attendees: '',
    type: 'meeting' as 'call' | 'meeting' | 'reminder' | 'other'
  });

  // Fetch Events
  const { data: events = [], isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events', currentMonth],
    queryFn: async () => {
      try {
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
        const res = await fetch(`/api/calendar/events?start=${start}&end=${end}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          console.warn('[Calendar] API Error:', res.status, res.statusText);
          return []; // Return empty array on error
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('[Calendar] Fetch error:', err);
        return []; // Return empty array on exception
      }
    },
    enabled: !!user,
    retry: false,
    staleTime: 30000
  });

  // Create/Update Event
  const eventMutation = useMutation({
    mutationFn: async (data: Partial<CalendarEvent>) => {
      const url = editingEvent 
        ? `/api/calendar/events/${editingEvent.id}`
        : '/api/calendar/events';
      
      const res = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        console.error('[Calendar] Failed to save event');
        return null;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: editingEvent ? 'Termin aktualisiert' : 'Termin erstellt',
        description: `${eventForm.title} wurde ${editingEvent ? 'aktualisiert' : 'hinzugefügt'}.`
      });
      resetForm();
      setShowEventModal(false);
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Termin konnte nicht gespeichert werden.',
        variant: 'destructive'
      });
    }
  });

  // Delete Event
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        console.error('[Calendar] Failed to delete event');
        return null;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: 'Termin gelöscht',
        description: 'Der Termin wurde entfernt.'
      });
      setEditingEvent(null);
      setShowEventModal(false);
    }
  });

  // Calendar Days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateStr);
  };

  // Navigation
  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Form Handlers
  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      duration: 60,
      location: '',
      attendees: '',
      type: 'meeting'
    });
    setEditingEvent(null);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEventForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time,
      duration: event.duration,
      location: event.location || '',
      attendees: event.attendees || '',
      type: event.type
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) {
      toast({
        title: 'Titel erforderlich',
        description: 'Bitte geben Sie einen Titel ein.',
        variant: 'destructive'
      });
      return;
    }

    eventMutation.mutate({
      ...eventForm,
      status: 'scheduled'
    });
  };

  // Subscription data
  const { data: subscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/subscription', {
          credentials: 'include'
        });
        if (!res.ok) {
          console.warn('[Calendar] Subscription API Error:', res.status);
          return null as any;
        }
        return await res.json();
      } catch (err) {
        console.error('[Calendar] Subscription fetch error:', err);
        return null as any;
      }
    },
    enabled: !!user,
    retry: false
  });

  const subscriptionData = subscription || {
    plan: 'pro',
    status: 'active',
    renewalDate: new Date().toISOString()
  } as any;

  // Type colors
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call': return CI.orange;
      case 'meeting': return CI.goldLight;
      case 'reminder': return CI.goldDark;
      default: return '#6b7280';
    }
  };

  // Quick Actions
  const quickActions = [
    { label: 'Meeting', type: 'meeting', icon: User, time: '10:00', duration: 60 },
    { label: 'Call', type: 'call', icon: Phone, time: '14:00', duration: 30 },
    { label: 'Reminder', type: 'reminder', icon: AlertCircle, time: '09:00', duration: 15 }
  ];

  // Check for recent calls and suggest AI processing
  useEffect(() => {
    const checkRecentCalls = async () => {
      try {
        const res = await fetch('/api/calendar/check-recent-calls', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.hasUnprocessedCalls) {
            toast({
              title: 'AI Terminvorschläge verfügbar',
              description: 'Es gibt neue Anrufe. Möchten Sie Termine daraus erstellen?',
              action: (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => processCallsWithAI()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: CI.orange,
                    color: '#000'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  Verarbeiten
                </motion.button>
              )
            });
          }
        }
      } catch (error) {
        console.error('Failed to check recent calls:', error);
      }
    };

    if (user) {
      checkRecentCalls();
    }
  }, [user]);

  // Process calls with AI
  const processCallsWithAI = async () => {
    setIsProcessingAI(true);
    try {
      const res = await fetch('/api/calendar/ai-process-calls', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!res.ok) {
        console.error('[Calendar] Failed to process calls');
        const errorText = await res.text();
        toast({
          title: 'Fehler',
          description: errorText || 'AI Verarbeitung fehlgeschlagen.',
          variant: 'destructive'
        });
        return;
      }
      
      const data = await res.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      
      toast({
        title: 'AI Verarbeitung erfolgreich',
        description: `${data.eventsCreated} Termine wurden aus ${data.callsProcessed} Anrufen erstellt.`
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'AI Verarbeitung fehlgeschlagen.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Loading State
  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <CalendarDays className="w-12 h-12" style={{ color: CI.orange }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/10 via-transparent to-[#E9D7C4]/10" />
      </div>

      <Sidebar
        activeSection="calendar"
        onSectionChange={(section) => window.location.href = `/app/${section}`}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar
          currentSection="calendar"
          subscriptionData={subscriptionData}
          user={user as any}
          isVisible={true}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ 
                      background: `linear-gradient(135deg, ${CI.orange}20, ${CI.goldLight}15)`,
                      border: `1px solid ${CI.orange}30`
                    }}>
                      <CalendarDays className="w-6 h-6" style={{ color: CI.orange }} />
                    </div>
                    <span style={{ 
                      background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Kalender
                    </span>
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">Intelligente Terminverwaltung mit AI</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {isProcessingAI && (
                    <div className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
                      style={{
                        background: `${CI.orange}15`,
                        border: `1px solid ${CI.orange}30`,
                        color: CI.orange
                      }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI verarbeitet...
                    </div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      resetForm();
                      setShowEventModal(true);
                    }}
                    className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                      color: '#000'
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Neuer Termin
                  </motion.button>
                </div>
              </div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-4 gap-4 mt-6"
              >
                {[
                  { label: 'Gesamt', value: events.length, icon: CalendarIcon, color: CI.goldLight },
                  { label: 'Heute', value: getEventsForDay(new Date()).length, icon: Clock, color: CI.orange },
                  { label: 'AI Events', value: events.filter(e => e.callId).length, icon: Sparkles, color: CI.orange },
                  { label: 'Anstehend', value: events.filter(e => e.status === 'scheduled').length, icon: CalendarDays, color: CI.goldLight }
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="p-4 rounded-xl"
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: `1px solid ${stat.color}20`,
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                      </div>
                      <stat.icon className="w-8 h-8 opacity-30" style={{ color: stat.color }} />
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mt-8">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePreviousMonth}
                    className="p-2.5 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </motion.button>
                  
                  <h2 className="text-2xl font-bold text-white min-w-[200px] text-center">
                    {format(currentMonth, 'MMMM yyyy', { locale: de })}
                  </h2>
                  
                  <motion.button
                    whileHover={{ scale: 1.1, x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNextMonth}
                    className="p-2.5 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleToday}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: CI.goldLight
                    }}
                  >
                    Heute
                  </motion.button>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 mr-2">Schnellaktionen:</span>
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.label}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEventForm({
                          ...eventForm,
                          type: action.type as any,
                          time: action.time,
                          duration: action.duration,
                          date: format(selectedDate || new Date(), 'yyyy-MM-dd')
                        });
                        setShowEventModal(true);
                      }}
                      className="p-2 rounded-lg transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}
                      title={action.label}
                    >
                      <action.icon className="w-4 h-4" style={{ color: getTypeColor(action.type) }} />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Calendar Grid */}
            <CalendarGrid
              days={days}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              getEventsForDay={getEventsForDay}
              getTypeColor={getTypeColor}
            />

            {/* Selected Day Events */}
            {selectedDate && (
              <DayEventsList
                selectedDate={selectedDate}
                events={getEventsForDay(selectedDate)}
                onEditEvent={handleEditEvent}
                onDeleteEvent={(id: string) => deleteMutation.mutate(id)}
                onAddEvent={() => {
                  setEventForm({
                    ...eventForm,
                    date: format(selectedDate, 'yyyy-MM-dd')
                  });
                  setShowEventModal(true);
                }}
                getTypeColor={getTypeColor}
              />
            )}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        show={showEventModal}
        onClose={() => setShowEventModal(false)}
        eventForm={eventForm}
        setEventForm={setEventForm}
        editingEvent={editingEvent}
        onSave={handleSaveEvent}
      />
    </div>
  );
}
