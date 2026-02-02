/**
 * ============================================================================
 * ARAS TEAM COMMAND CENTER
 * ============================================================================
 * Modern dashboard with Team Feed, Calendar, Todos, Contracts, Actions
 * Premium ARAS CI - "Apple meets Neuralink"
 * ============================================================================
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  RefreshCw, Send, Plus, Calendar, Users, CheckSquare, FileText, 
  Zap, Clock, MessageSquare, ChevronRight, Check, AlertCircle,
  User, Building2, TrendingUp
} from "lucide-react";
import InternalLayout from "@/components/internal/internal-layout";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, isToday, isTomorrow, addDays, startOfDay } from "date-fns";
import { de } from "date-fns/locale";

// ============================================================================
// TYPES
// ============================================================================

interface FeedItem {
  id: number;
  authorUserId: string;
  authorUsername: string;
  type: string;
  message: string;
  category?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  createdAt: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  location?: string;
  color?: string;
  creatorUsername?: string;
}

interface Todo {
  id: number;
  title: string;
  description?: string;
  dueAt?: string;
  priority: string;
  status: string;
  assignedUsername?: string;
}

interface TeamUser {
  id: string;
  username: string;
  userRole: string;
}

interface Action {
  id: number;
  title: string;
  dueAt?: string;
  priority: string;
  type: string;
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse rounded-lg bg-white/5 ${className}`}
      style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)' }}
    />
  );
}

// ============================================================================
// GLASS CARD COMPONENT
// ============================================================================

function GlassCard({ 
  children, 
  className = "",
  hover = true 
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <div 
      className={`rounded-2xl p-5 transition-all duration-300 ${hover ? 'hover:-translate-y-0.5' : ''} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(233,215,196,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// WIDGET HEADER COMPONENT
// ============================================================================

function WidgetHeader({ 
  icon: Icon, 
  title, 
  count,
  action,
  onAction 
}: { 
  icon: any; 
  title: string; 
  count?: number;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: '#FE9100' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Orbitron, sans-serif' }}>
          {title}
        </h3>
        {typeof count === 'number' && (
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(254,145,0,0.15)', color: '#FE9100' }}>
            {count}
          </span>
        )}
      </div>
      {action && onAction && (
        <button 
          onClick={onAction}
          className="text-xs px-2 py-1 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)' }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="w-8 h-8 mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{message}</p>
    </div>
  );
}

// ============================================================================
// PRIORITY BADGE
// ============================================================================

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#EAB308',
    low: '#6B7280',
  };
  const color = colors[priority] || colors.medium;
  
  return (
    <span 
      className="text-[9px] uppercase px-1.5 py-0.5 rounded font-medium"
      style={{ background: `${color}20`, color }}
    >
      {priority}
    </span>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function InternalDashboard() {
  const [feedMessage, setFeedMessage] = useState("");
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useQuery({
    queryKey: ['command-center-feed'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/team-feed?limit=15', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch feed');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['command-center-calendar'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/team-calendar', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch calendar');
      return res.json();
    },
  });

  const { data: todosData, isLoading: todosLoading, refetch: refetchTodos } = useQuery({
    queryKey: ['command-center-todos'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/team-todos?limit=8', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch todos');
      return res.json();
    },
  });

  const { data: activeUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ['command-center-active-users'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/active-users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['command-center-contracts'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/contracts/pending', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch contracts');
      return res.json();
    },
  });

  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ['command-center-actions'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/action-center', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch actions');
      return res.json();
    },
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const postFeedMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch('/api/internal/command-center/team-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, type: 'note' }),
      });
      if (!res.ok) throw new Error('Failed to post');
      return res.json();
    },
    onSuccess: () => {
      setFeedMessage("");
      queryClient.invalidateQueries({ queryKey: ['command-center-feed'] });
      toast({ title: "✓ Update posted" });
    },
    onError: () => {
      toast({ title: "Failed to post update", variant: "destructive" });
    },
  });

  const createTodoMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch('/api/internal/command-center/team-todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      setNewTodoTitle("");
      setShowAddTodo(false);
      queryClient.invalidateQueries({ queryKey: ['command-center-todos'] });
      toast({ title: "✓ Task created" });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      const res = await fetch(`/api/internal/command-center/team-todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: done ? 'done' : 'pending' }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-center-todos'] });
    },
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatRelativeDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Tomorrow ${format(date, 'HH:mm')}`;
    return format(date, 'dd.MM HH:mm');
  }, []);

  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startOfDay(new Date()), i));
    }
    return days;
  }, []);

  const feedItems: FeedItem[] = feedData?.items || [];
  const calendarEvents: CalendarEvent[] = calendarData?.events || [];
  const todos: Todo[] = todosData?.todos || [];
  const activeUsers: TeamUser[] = activeUsersData?.users || [];
  const pendingContracts = contractsData?.contracts || [];
  const actions: Action[] = actionsData?.actions || [];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <InternalLayout>
      <div className="space-y-6 pb-12">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 
              className="text-2xl font-bold mb-1"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Team Command Center
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Live view of activity, priorities and approvals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)' }}>
              {format(new Date(), 'HH:mm')} CET
            </div>
            <button 
              onClick={() => {
                refetchFeed();
                refetchTodos();
              }}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)' }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* TEAM FEED - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <GlassCard hover={false}>
            <WidgetHeader icon={MessageSquare} title="Team Feed" count={feedItems.length} />
            
            {/* Composer */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={feedMessage}
                onChange={(e) => setFeedMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && feedMessage.trim() && postFeedMutation.mutate(feedMessage.trim())}
                placeholder="Post an update..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              />
              <button
                onClick={() => feedMessage.trim() && postFeedMutation.mutate(feedMessage.trim())}
                disabled={!feedMessage.trim() || postFeedMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ 
                  background: 'linear-gradient(135deg, #FE9100, #a34e00)',
                  color: 'white',
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Feed Items */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              {feedLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : feedItems.length === 0 ? (
                <EmptyState icon={MessageSquare} message="No activity yet — post the first update" />
              ) : (
                feedItems.map((item) => (
                  <div key={item.id} className="flex gap-3 group">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                      style={{ background: 'linear-gradient(135deg, #FE9100, #a34e00)', color: 'white' }}
                    >
                      {item.authorUsername?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {item.authorUsername || 'Unknown'}
                        </span>
                        {item.category && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(254,145,0,0.15)', color: '#FE9100' }}>
                            {item.category}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: de })}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.message}</p>
                      {item.targetName && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          → {item.targetName}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* GRID - Responsive 2-3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* CALENDAR */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="h-full">
              <WidgetHeader icon={Calendar} title="Team Calendar" count={calendarEvents.length} />
              
              {/* Mini Calendar */}
              <div className="flex gap-1 mb-4">
                {next7Days.map((day) => {
                  const isCurrentDay = isToday(day);
                  return (
                    <div 
                      key={day.toISOString()} 
                      className="flex-1 text-center py-2 rounded-lg transition-colors"
                      style={{ 
                        background: isCurrentDay ? 'rgba(254,145,0,0.15)' : 'rgba(255,255,255,0.02)',
                        border: isCurrentDay ? '1px solid rgba(254,145,0,0.3)' : '1px solid transparent',
                      }}
                    >
                      <div className="text-[9px] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {format(day, 'EEE', { locale: de })}
                      </div>
                      <div 
                        className="text-sm font-semibold"
                        style={{ color: isCurrentDay ? '#FE9100' : 'rgba(255,255,255,0.7)' }}
                      >
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Events */}
              <div className="space-y-2">
                {calendarLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)
                ) : calendarEvents.length === 0 ? (
                  <EmptyState icon={Calendar} message="No upcoming events" />
                ) : (
                  calendarEvents.slice(0, 5).map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center gap-3 p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div 
                        className="w-1 h-8 rounded-full"
                        style={{ background: event.color || '#FE9100' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {event.title}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {formatRelativeDate(event.startsAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* ACTIVE EMPLOYEES */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <GlassCard className="h-full">
              <WidgetHeader icon={Users} title="Team Members" count={activeUsers.length} />
              
              <div className="space-y-2">
                {usersLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))
                ) : activeUsers.length === 0 ? (
                  <EmptyState icon={Users} message="No team members found" />
                ) : (
                  activeUsers.slice(0, 8).map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center gap-3 p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: 'linear-gradient(135deg, #FE9100, #a34e00)', color: 'white' }}
                      >
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {user.username}
                        </p>
                        <p className="text-[10px] uppercase" style={{ color: user.userRole === 'admin' ? '#FE9100' : 'rgba(255,255,255,0.4)' }}>
                          {user.userRole}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* TODOS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="h-full">
              <WidgetHeader 
                icon={CheckSquare} 
                title="Team Todos" 
                count={todos.filter(t => t.status !== 'done').length}
                action="+ Add"
                onAction={() => setShowAddTodo(true)}
              />
              
              {/* Quick Add */}
              {showAddTodo && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && newTodoTitle.trim() && createTodoMutation.mutate(newTodoTitle.trim())}
                    placeholder="New task..."
                    autoFocus
                    className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                    style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(254,145,0,0.3)',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  />
                  <button
                    onClick={() => newTodoTitle.trim() && createTodoMutation.mutate(newTodoTitle.trim())}
                    className="px-2 py-1.5 rounded text-xs"
                    style={{ background: '#FE9100', color: 'white' }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {todosLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)
                ) : todos.length === 0 ? (
                  <EmptyState icon={CheckSquare} message="No pending tasks" />
                ) : (
                  todos.slice(0, 6).map((todo) => (
                    <div 
                      key={todo.id} 
                      className="flex items-center gap-3 p-2 rounded-lg group"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <button
                        onClick={() => toggleTodoMutation.mutate({ id: todo.id, done: todo.status !== 'done' })}
                        className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ 
                          borderColor: todo.status === 'done' ? '#10B981' : 'rgba(255,255,255,0.2)',
                          background: todo.status === 'done' ? '#10B981' : 'transparent',
                        }}
                      >
                        {todo.status === 'done' && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm truncate"
                          style={{ 
                            color: todo.status === 'done' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)',
                            textDecoration: todo.status === 'done' ? 'line-through' : 'none',
                          }}
                        >
                          {todo.title}
                        </p>
                        {todo.dueAt && (
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {formatRelativeDate(todo.dueAt)}
                          </p>
                        )}
                      </div>
                      <PriorityBadge priority={todo.priority} />
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* CONTRACTS PENDING */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <GlassCard className="h-full">
              <WidgetHeader icon={FileText} title="Pending Approvals" count={pendingContracts.length} />
              
              <div className="space-y-2">
                {contractsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)
                ) : pendingContracts.length === 0 ? (
                  <EmptyState icon={FileText} message="No pending approvals" />
                ) : (
                  pendingContracts.slice(0, 5).map((contract: any) => (
                    <div 
                      key={contract.id} 
                      className="flex items-center gap-3 p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(254,145,0,0.1)' }}
                      >
                        <FileText className="w-4 h-4" style={{ color: '#FE9100' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {contract.title || contract.filename || 'Contract'}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {contract.assignedUsername || 'Unassigned'}
                        </p>
                      </div>
                      <span 
                        className="text-[9px] px-2 py-1 rounded"
                        style={{ background: 'rgba(234,179,8,0.15)', color: '#EAB308' }}
                      >
                        Pending
                      </span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* ACTION CENTER */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-2 lg:col-span-2"
          >
            <GlassCard className="h-full">
              <WidgetHeader icon={Zap} title="Action Center" count={actions.length} />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {actionsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
                ) : actions.length === 0 ? (
                  <div className="col-span-2">
                    <EmptyState icon={Zap} message="No urgent actions" />
                  </div>
                ) : (
                  actions.slice(0, 6).map((action) => (
                    <div 
                      key={`${action.type}-${action.id}`} 
                      className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/[0.02]"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: action.type === 'event' ? 'rgba(59,130,246,0.1)' : 'rgba(254,145,0,0.1)' }}
                      >
                        {action.type === 'event' ? (
                          <Calendar className="w-5 h-5" style={{ color: '#3B82F6' }} />
                        ) : (
                          <CheckSquare className="w-5 h-5" style={{ color: '#FE9100' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {action.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {action.dueAt ? formatRelativeDate(action.dueAt) : 'No due date'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* FOOTER */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-8"
        >
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Powered by <span style={{ color: 'rgba(254,145,0,0.5)' }}>Schwarzott Group</span>
          </p>
        </motion.div>
      </div>
    </InternalLayout>
  );
}
