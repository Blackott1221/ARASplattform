import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Calendar, Phone, MessageSquare, Users, TrendingUp, 
  Clock, Activity, Zap, Target, CheckCircle2, Plus,
  PhoneCall, Mail, BarChart3, FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import type { User } from '@shared/schema';
import { useState } from 'react';

interface DashboardContentProps {
  user: User;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Fetch real data from APIs
  const { data: calendarEvents } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const res = await fetch('/api/calendar/events', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: callLogs } = useQuery({
    queryKey: ['call-logs'],
    queryFn: async () => {
      const res = await fetch('/api/call-logs', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Generate calendar days
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get events for selected date
  const selectedDateEvents = calendarEvents?.filter((event: any) => 
    isSameDay(new Date(event.date), selectedDate)
  ) || [];

  // Recent calls (last 5)
  const recentCalls = callLogs?.slice(0, 5) || [];

  // Stats
  const totalCalls = callLogs?.length || 0;
  const totalContacts = contacts?.length || 0;
  const totalLeads = leads?.length || 0;
  const hotLeads = leads?.filter((l: any) => l.status === 'hot').length || 0;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1 sm:space-y-2"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          <span className="bg-gradient-to-r from-[#FE9100] to-[#ff6b00] bg-clip-text text-transparent">
            Willkommen, {user.firstName}!
          </span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400">Hier ist deine Übersicht für heute</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatsCard
          icon={Phone}
          label="Anrufe"
          value={totalCalls}
          change="+12%"
          color="#FE9100"
        />
        <StatsCard
          icon={Users}
          label="Kontakte"
          value={totalContacts}
          change="+8%"
          color="#4CAF50"
        />
        <StatsCard
          icon={Target}
          label="Leads"
          value={totalLeads}
          change="+23%"
          color="#2196F3"
        />
        <StatsCard
          icon={TrendingUp}
          label="Hot Leads"
          value={hotLeads}
          change="+15%"
          color="#FF5722"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Calendar & Events */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Calendar Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FE9100]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#FE9100]" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Kalender</h3>
                  <p className="text-xs text-gray-400">{format(selectedDate, 'MMMM yyyy', { locale: de })}</p>
                </div>
              </div>
            </div>

            {/* Mini Calendar */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                <div key={day} className="text-center text-xs text-gray-500 font-bold">
                  {day}
                </div>
              ))}
              {daysInMonth.map((day) => {
                const hasEvents = calendarEvents?.some((event: any) => 
                  isSameDay(new Date(event.date), day)
                );
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square rounded-lg text-sm font-medium transition-all
                      ${isSelected ? 'bg-[#FE9100] text-white' : ''}
                      ${isTodayDate && !isSelected ? 'bg-white/10 text-white' : ''}
                      ${!isSelected && !isTodayDate ? 'text-gray-400 hover:bg-white/5' : ''}
                      ${hasEvents && !isSelected ? 'ring-2 ring-[#FE9100]/30' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Events for Selected Date */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-400">
                Termine für {format(selectedDate, 'dd. MMMM', { locale: de })}
              </h4>
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  Keine Termine für diesen Tag
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#FE9100]/30 transition-all"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#FE9100]" />
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm">{event.title}</div>
                        <div className="text-xs text-gray-400">{event.time}</div>
                      </div>
                      {event.type === 'call' && <PhoneCall className="w-4 h-4 text-gray-400" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl p-6"
          >
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FE9100]" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickActionButton
                icon={Phone}
                label="Anruf starten"
                href="/power"
              />
              <QuickActionButton
                icon={MessageSquare}
                label="Chat"
                href="/app"
              />
              <QuickActionButton
                icon={Plus}
                label="Neuer Kontakt"
                href="/contacts"
              />
              <QuickActionButton
                icon={Calendar}
                label="Termin"
                href="/calendar"
              />
            </div>
          </motion.div>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-6">
          {/* Recent Calls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FE9100]/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#FE9100]" />
                </div>
                <h3 className="font-bold text-white">Letzte Anrufe</h3>
              </div>
            </div>

            <div className="space-y-2">
              {recentCalls.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  Noch keine Anrufe
                </div>
              ) : (
                recentCalls.map((call: any) => (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#FE9100]/30 transition-all"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      call.status === 'completed' ? 'bg-green-500' : 
                      call.status === 'failed' ? 'bg-red-500' : 
                      'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">
                        {call.contactName || call.phoneNumber}
                      </div>
                      <div className="text-xs text-gray-400">
                        {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'In Bearbeitung'}
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* AI Assistant Shortcut */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="backdrop-blur-sm bg-black/20 border border-[#FE9100]/30 rounded-2xl p-6 cursor-pointer hover:border-[#FE9100]/50 transition-all group"
            onClick={() => window.location.href = '/app'}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#FE9100]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-[#FE9100]" />
              </div>
              <div>
                <h3 className="font-bold text-white">ARAS AI</h3>
                <p className="text-xs text-gray-400">Dein persönlicher Assistent</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-3">
              Frage mich alles über dein Business, Termine oder Kontakte.
            </p>
            <div className="flex items-center gap-2 text-[#FE9100] text-sm font-medium group-hover:gap-3 transition-all">
              Chat öffnen
              <MessageSquare className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FE9100]/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#FE9100]" />
              </div>
              <h3 className="font-bold text-white">Aktivität</h3>
            </div>

            <div className="space-y-3">
              <ActivityItem
                icon={CheckCircle2}
                text="Profil eingerichtet"
                time="vor 5 Minuten"
                color="green"
              />
              <ActivityItem
                icon={Users}
                text={`${totalContacts} Kontakte importiert`}
                time="heute"
                color="blue"
              />
              <ActivityItem
                icon={Target}
                text={`${totalLeads} Leads erstellt`}
                time="heute"
                color="orange"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* 📊 ULTRA DASHBOARD - Additional Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="backdrop-blur-md bg-black/30 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FE9100]/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#FE9100]" />
            </div>
            <div>
              <h3 className="font-bold text-white">Performance Metriken</h3>
              <p className="text-xs text-gray-400">Letzte 30 Tage</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white mb-1">
                {totalCalls}
              </div>
              <div className="text-xs text-gray-400">Anrufe gesamt</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white mb-1">
                {hotLeads > 0 && totalLeads > 0 ? `${Math.round((hotLeads / totalLeads) * 100)}%` : '0%'}
              </div>
              <div className="text-xs text-gray-400">Hot Lead Rate</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white mb-1">
                {totalContacts}
              </div>
              <div className="text-xs text-gray-400">Kontakte gesamt</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white mb-1">
                {totalLeads}
              </div>
              <div className="text-xs text-gray-400">Leads gesamt</div>
            </div>
          </div>
        </motion.div>

        {/* Top Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="backdrop-blur-md bg-black/30 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FE9100]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#FE9100]" />
            </div>
            <h3 className="font-bold text-white">Top Kontakte</h3>
          </div>

          <div className="space-y-3">
            {contacts?.slice(0, 5).map((contact: any, idx: number) => (
              <div
                key={contact.id || idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#FE9100]/30 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FE9100] to-[#ff6b00] flex items-center justify-center text-white font-bold text-sm">
                  {contact.name?.charAt(0) || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">
                    {contact.name || 'Unbekannt'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {contact.company || 'Keine Firma'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#FE9100] font-medium">
                    #{idx + 1}
                  </div>
                  <div className="text-xs text-gray-400">Top {idx + 1}</div>
                </div>
              </div>
            )) || (
              <div className="text-center py-6 text-gray-500 text-sm">
                Noch keine Kontakte
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* AI Insights Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="backdrop-blur-sm bg-black/20 border border-[#FE9100]/30 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#FE9100]/20 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-[#FE9100]" />
          </div>
          <div>
            <h3 className="font-bold text-white">AI Insights</h3>
            <p className="text-xs text-gray-400">Generiert von ARAS AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-[#FE9100] font-bold mb-2 uppercase tracking-wide">Best Time</div>
            <div className="text-lg font-bold text-white mb-1">14:00 - 16:00</div>
            <div className="text-xs text-gray-400">Höchste Erfolgsrate für Anrufe</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-[#FE9100] font-bold mb-2 uppercase tracking-wide">Top Industry</div>
            <div className="text-lg font-bold text-white mb-1">{user.industry || 'Tech'}</div>
            <div className="text-xs text-gray-400">Beste Conversion in dieser Branche</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-[#FE9100] font-bold mb-2 uppercase tracking-wide">Next Action</div>
            <div className="text-lg font-bold text-white mb-1">{hotLeads > 0 ? `${hotLeads} Hot Leads` : 'Neue Leads'}</div>
            <div className="text-xs text-gray-400">Jetzt nachfassen empfohlen</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helper Components
function StatsCard({ icon: Icon, label, value, change, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <span className="text-xs text-green-500 font-medium">{change}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </motion.div>
  );
}

function QuickActionButton({ icon: Icon, label, href, onClick }: any) {
  const content = (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#FE9100]/50 hover:bg-white/10 transition-all cursor-pointer group">
      <div className="w-10 h-10 rounded-lg bg-[#FE9100]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-[#FE9100]" />
      </div>
      <span className="text-xs text-gray-300 text-center">{label}</span>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return <div onClick={onClick}>{content}</div>;
}

function ActivityItem({ icon: Icon, text, time, color }: any) {
  const colors = {
    green: '#4CAF50',
    blue: '#2196F3',
    orange: '#FE9100',
    red: '#FF5722'
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${colors[color as keyof typeof colors]}20` }}>
        <Icon className="w-4 h-4" style={{ color: colors[color as keyof typeof colors] }} />
      </div>
      <div className="flex-1">
        <div className="text-sm text-white">{text}</div>
        <div className="text-xs text-gray-400">{time}</div>
      </div>
    </div>
  );
}
