/**
 * ============================================================================
 * MY TASKS BOARD - Kanban-Style Task Management
 * ============================================================================
 * Premium drag-and-drop task board for the Team Command Center
 * - 4 columns: Eingang, Heute, Diese Woche, Erledigt
 * - Drag & Drop status changes
 * - Task details drawer
 * - Quick add functionality
 * ============================================================================
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Filter, MoreHorizontal, Check, Edit3, Info,
  GripVertical, Calendar, Clock, CheckCircle2, Inbox,
  ChevronRight, X, Loader2
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface InternalTask {
  id: string;
  title: string;
  description?: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  dueDate?: string | null;
  assignedUserId?: string | null;
  relatedContactId?: string | null;
  relatedDealId?: string | null;
  createdAt: string;
  updatedAt: string;
}

type ColumnId = 'inbox' | 'today' | 'week' | 'done';

interface Column {
  id: ColumnId;
  title: string;
  icon: React.ElementType;
  description: string;
}

const COLUMNS: Column[] = [
  { id: 'inbox', title: 'EINGANG', icon: Inbox, description: 'Neue Aufgaben ohne Termin' },
  { id: 'today', title: 'HEUTE', icon: Clock, description: 'Alles, was heute erledigt werden sollte' },
  { id: 'week', title: 'DIESE WOCHE', icon: Calendar, description: 'Aufgaben für die nächsten 7 Tage' },
  { id: 'done', title: 'ERLEDIGT', icon: CheckCircle2, description: 'Abgeschlossene Aufgaben' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTaskColumn(task: InternalTask): ColumnId {
  if (task.status === 'DONE' || task.status === 'CANCELLED') {
    return 'done';
  }
  
  if (!task.dueDate) {
    return 'inbox';
  }
  
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const weekFromNow = addDays(startOfDay(now), 7);
  
  if (isToday(dueDate) || isBefore(dueDate, startOfDay(now))) {
    return 'today';
  }
  
  if (isBefore(dueDate, weekFromNow)) {
    return 'week';
  }
  
  return 'inbox';
}

function getPriorityFromColumn(columnId: ColumnId): string | undefined {
  // Map columns to implicit priority for sorting
  switch (columnId) {
    case 'today': return 'high';
    case 'week': return 'medium';
    default: return undefined;
  }
}

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================

interface TaskCardProps {
  task: InternalTask;
  onComplete: (taskId: string) => void;
  onClick: (task: InternalTask) => void;
  isDragging?: boolean;
}

function TaskCard({ task, onComplete, onClick, isDragging }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Priority dot color
  const getPriorityColor = () => {
    if (task.status === 'DONE') return 'rgba(107,114,128,0.6)';
    if (!task.dueDate) return 'rgba(107,114,128,0.6)';
    
    const dueDate = new Date(task.dueDate);
    if (isBefore(dueDate, startOfDay(new Date()))) return '#EF4444'; // Overdue
    if (isToday(dueDate)) return '#F97316'; // Today
    if (isTomorrow(dueDate)) return '#EAB308'; // Tomorrow
    return 'rgba(107,114,128,0.6)'; // Default
  };
  
  const formatDueDate = () => {
    if (!task.dueDate) return 'Kein Termin';
    const date = new Date(task.dueDate);
    if (isToday(date)) return `Heute, ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Morgen, ${format(date, 'HH:mm')}`;
    return format(date, 'EEE, dd.MM', { locale: de });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.65 : 1, y: 0, scale: isDragging ? 0.98 : 1 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
      draggable
      onDragStart={(e: any) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(task)}
      className="group cursor-pointer rounded-xl p-3 transition-all duration-150"
      style={{
        background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Title Row */}
      <div className="flex items-start gap-2 mb-2">
        <p 
          className="flex-1 text-[14px] font-semibold leading-tight line-clamp-2"
          style={{ 
            color: task.status === 'DONE' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)',
            textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        <div 
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
          style={{ background: getPriorityColor() }}
        />
      </div>
      
      {/* Meta Row */}
      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
        <span>Fällig: {formatDueDate()}</span>
      </div>
      
      {/* Action Row - visible on hover */}
      <AnimatePresence>
        {isHovered && task.status !== 'DONE' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 mt-2 pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors"
              style={{ 
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,106,0,0.10)';
                e.currentTarget.style.color = '#FE9100';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Erledigen</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick(task);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors"
              style={{ 
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,106,0,0.10)';
                e.currentTarget.style.color = '#FE9100';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Notiz</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// COLUMN COMPONENT
// ============================================================================

interface ColumnProps {
  column: Column;
  tasks: InternalTask[];
  onTaskComplete: (taskId: string) => void;
  onTaskClick: (task: InternalTask) => void;
  onDrop: (taskId: string, columnId: ColumnId) => void;
  onAddTask: () => void;
}

function KanbanColumn({ column, tasks, onTaskComplete, onTaskClick, onDrop, onAddTask }: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDrop(taskId, column.id);
    }
  };

  const Icon = column.icon;

  return (
    <div 
      className="flex flex-col min-w-[240px] rounded-2xl p-3 h-full"
      style={{
        background: 'rgba(0,0,0,0.38)',
        border: isDragOver ? '1px solid rgba(255,106,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
        transition: 'border-color 0.15s ease',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: '#FE9100' }} />
          <h3 
            className="text-[11px] tracking-[0.18em]"
            style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4', opacity: 0.92 }}
          >
            {column.title}
          </h3>
          <span 
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(254,145,0,0.15)', color: '#FE9100' }}
          >
            {tasks.length}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          
          {/* Tooltip */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 top-full mt-2 z-50 w-[220px] p-2.5 rounded-xl"
                style={{
                  background: 'rgba(0,0,0,0.85)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,106,0,0.22)',
                  boxShadow: '0 18px 50px rgba(0,0,0,0.7)',
                }}
              >
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {column.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Drop Indicator */}
      {isDragOver && (
        <div 
          className="h-0.5 rounded-full mb-2 mx-2"
          style={{ background: '#FE9100' }}
        />
      )}
      
      {/* Tasks */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-[100px] max-h-[400px] pr-1 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icon className="w-6 h-6 mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Keine Aufgaben
            </p>
            {column.id !== 'done' && (
              <button
                onClick={onAddTask}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors"
                style={{ 
                  background: 'rgba(255,106,0,0.1)',
                  color: '#FE9100',
                }}
              >
                <Plus className="w-3 h-3" />
                <span>Aufgabe</span>
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={onTaskComplete}
                onClick={onTaskClick}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TASK DETAILS DRAWER
// ============================================================================

interface TaskDetailsDrawerProps {
  task: InternalTask | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  onUpdate: (taskId: string, data: Partial<InternalTask>) => void;
}

function TaskDetailsDrawer({ task, isOpen, onClose, onComplete, onUpdate }: TaskDetailsDrawerProps) {
  const [notes, setNotes] = useState(task?.description || '');
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync notes when task changes
  useEffect(() => {
    if (task) {
      setNotes(task.description || '');
    }
  }, [task?.id, task?.description]);
  
  // Auto-save notes with debounce
  useEffect(() => {
    if (!task || notes === (task.description || '')) return;
    
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    
    notesTimeoutRef.current = setTimeout(() => {
      onUpdate(task.id, { description: notes });
    }, 600);
    
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, [notes, task, onUpdate]);
  
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      setTimeout(() => {
        drawerRef.current?.focus();
      }, 100);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      
      if (previousActiveElement.current && !isOpen) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Eingang';
      case 'IN_PROGRESS': return 'In Bearbeitung';
      case 'DONE': return 'Erledigt';
      case 'CANCELLED': return 'Abgebrochen';
      default: return status;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' };
      case 'IN_PROGRESS': return { bg: 'rgba(234,179,8,0.15)', color: '#EAB308' };
      case 'DONE': return { bg: 'rgba(16,185,129,0.15)', color: '#10B981' };
      case 'CANCELLED': return { bg: 'rgba(107,114,128,0.15)', color: '#6B7280' };
      default: return { bg: 'rgba(255,255,255,0.1)', color: 'white' };
    }
  };

  if (!task) return null;

  const statusStyle = getStatusColor(task.status);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ 
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
            }}
          />
          
          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] z-50 flex flex-col outline-none"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,22,0.98) 0%, rgba(12,12,14,0.99) 100%)',
              borderLeft: '1px solid rgba(233,215,196,0.1)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex-1">
                <h2 
                  className="text-lg font-semibold mb-1"
                  style={{ color: 'rgba(255,255,255,0.95)' }}
                >
                  {task.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Due Date */}
              <div>
                <label 
                  className="text-[11px] uppercase tracking-wider mb-2 block"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  Fälligkeitsdatum
                </label>
                <div 
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Calendar className="w-4 h-4" style={{ color: '#FE9100' }} />
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {task.dueDate ? format(new Date(task.dueDate), 'EEEE, dd. MMMM yyyy, HH:mm', { locale: de }) : 'Kein Termin festgelegt'}
                  </span>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label 
                  className="text-[11px] uppercase tracking-wider mb-2 block"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  Notizen
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notiz hinzufügen…"
                  rows={6}
                  className="w-full p-3 rounded-lg resize-none outline-none transition-colors"
                  style={{ 
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.9)',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(254,145,0,0.3)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              
              {/* Activity */}
              <div>
                <label 
                  className="text-[11px] uppercase tracking-wider mb-2 block"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  Aktivität
                </label>
                <div 
                  className="space-y-2 p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-center justify-between text-[12px]">
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Erstellt</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {format(new Date(task.createdAt), 'dd.MM.yyyy, HH:mm', { locale: de })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Zuletzt geändert</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {format(new Date(task.updatedAt), 'dd.MM.yyyy, HH:mm', { locale: de })}
                    </span>
                  </div>
                  {task.assignedUserId && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>Zugewiesen an</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{task.assignedUserId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div 
              className="flex items-center justify-end gap-3 p-4 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[13px] transition-colors"
                style={{ 
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Schließen
              </button>
              {task.status !== 'DONE' && (
                <button
                  onClick={() => {
                    onComplete(task.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, #ff6a00, #a34e00)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(255,106,0,0.25)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Erledigen
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// QUICK ADD MODAL
// ============================================================================

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

function QuickAddModal({ isOpen, onClose, onCreate }: QuickAddModalProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setTitle('');
    }
  }, [isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate(title.trim());
      setTitle('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4"
          >
            <form 
              onSubmit={handleSubmit}
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(20,20,22,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              }}
            >
              <h3 
                className="text-[13px] tracking-[0.15em] mb-3"
                style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}
              >
                NEUE AUFGABE
              </h3>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Was muss erledigt werden?"
                className="w-full px-3 py-2.5 rounded-lg outline-none text-[14px] mb-3"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,106,0,0.3)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-lg text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #ff6a00, #a34e00)',
                    color: 'white',
                  }}
                >
                  Erstellen
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MY TASKS SIDEBAR
// ============================================================================

interface MyTasksSidebarProps {
  tasks: InternalTask[];
  onAddTask: () => void;
  showCompleted: boolean;
  onToggleCompleted: () => void;
}

export function MyTasksSidebar({ tasks, onAddTask, showCompleted, onToggleCompleted }: MyTasksSidebarProps) {
  const todayCount = tasks.filter(t => {
    if (t.status === 'DONE') return false;
    if (!t.dueDate) return false;
    return isToday(new Date(t.dueDate));
  }).length;
  
  const overdueCount = tasks.filter(t => {
    if (t.status === 'DONE') return false;
    if (!t.dueDate) return false;
    return isBefore(new Date(t.dueDate), startOfDay(new Date()));
  }).length;

  return (
    <div className="space-y-3">
      {/* Quick Guide */}
      <div 
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(233,215,196,0.08)',
        }}
      >
        <h4 
          className="text-[11px] tracking-[0.15em] mb-3"
          style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4', opacity: 0.9 }}
        >
          KURZANLEITUNG
        </h4>
        <ul className="space-y-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
          <li className="flex items-start gap-2">
            <span style={{ color: '#FE9100' }}>•</span>
            <span>+ Aufgabe erstellt eine neue Aufgabe.</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: '#FE9100' }}>•</span>
            <span>Drag & Drop ändert den Status.</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: '#FE9100' }}>•</span>
            <span>Klick öffnet Details & Notizen.</span>
          </li>
        </ul>
      </div>
      
      {/* Focus Today */}
      <div 
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(233,215,196,0.08)',
        }}
      >
        <h4 
          className="text-[11px] tracking-[0.15em] mb-3"
          style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4', opacity: 0.9 }}
        >
          FOKUS HEUTE
        </h4>
        {todayCount === 0 && overdueCount === 0 ? (
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Heute ist alles im grünen Bereich.
          </p>
        ) : (
          <div className="space-y-2">
            {todayCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Heute fällig</span>
                <span 
                  className="text-[13px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(254,145,0,0.15)', color: '#FE9100' }}
                >
                  {todayCount}
                </span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Überfällig</span>
                <span 
                  className="text-[13px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                >
                  {overdueCount}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div 
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(233,215,196,0.08)',
        }}
      >
        <h4 
          className="text-[11px] tracking-[0.15em] mb-3"
          style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4', opacity: 0.9 }}
        >
          SCHNELLAKTIONEN
        </h4>
        <div className="space-y-2">
          <button
            onClick={onAddTask}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors"
            style={{ 
              background: 'rgba(255,106,0,0.1)',
              color: '#FE9100',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Aufgabe erstellen</span>
          </button>
          <button
            onClick={onToggleCompleted}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors"
            style={{ 
              background: showCompleted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{showCompleted ? 'Erledigte ausblenden' : 'Erledigte anzeigen'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN BOARD COMPONENT
// ============================================================================

interface MyTasksBoardProps {
  className?: string;
}

export function MyTasksBoard({ className = '' }: MyTasksBoardProps) {
  const [selectedTask, setSelectedTask] = useState<InternalTask | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ['internal-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/internal/tasks', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const tasks: InternalTask[] = tasksData || [];

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch('/api/internal/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
      toast({ title: '✓ Aufgabe erstellt' });
    },
    onError: () => {
      toast({ title: 'Fehler beim Erstellen', variant: 'destructive' });
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InternalTask> }) => {
      const res = await fetch(`/api/internal/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
    },
    onError: () => {
      toast({ title: 'Änderung konnte nicht gespeichert werden.', variant: 'destructive' });
    },
  });

  // Complete task
  const handleComplete = useCallback((taskId: string) => {
    updateMutation.mutate({ id: taskId, data: { status: 'DONE' } });
    toast({ title: '✓ Aufgabe erledigt' });
  }, [updateMutation, toast]);

  // Update task
  const handleUpdate = useCallback((taskId: string, data: Partial<InternalTask>) => {
    updateMutation.mutate({ id: taskId, data });
  }, [updateMutation]);

  // Handle drop
  const handleDrop = useCallback((taskId: string, columnId: ColumnId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    let newData: Partial<InternalTask> = {};
    
    switch (columnId) {
      case 'inbox':
        newData = { status: 'OPEN', dueDate: null };
        break;
      case 'today':
        newData = { 
          status: 'OPEN',
          dueDate: endOfDay(new Date()).toISOString(),
        };
        break;
      case 'week':
        newData = { 
          status: 'OPEN',
          dueDate: addDays(endOfDay(new Date()), 3).toISOString(),
        };
        break;
      case 'done':
        newData = { status: 'DONE' };
        break;
    }
    
    updateMutation.mutate({ id: taskId, data: newData });
  }, [tasks, updateMutation]);

  // Open task details
  const handleTaskClick = useCallback((task: InternalTask) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  }, []);

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedTask(null), 200);
  }, []);

  // Organize tasks into columns
  const columnTasks = useMemo(() => {
    const organized: Record<ColumnId, InternalTask[]> = {
      inbox: [],
      today: [],
      week: [],
      done: [],
    };
    
    for (const task of tasks) {
      if (!showCompleted && (task.status === 'DONE' || task.status === 'CANCELLED')) {
        continue;
      }
      const column = getTaskColumn(task);
      organized[column].push(task);
    }
    
    // Sort each column
    for (const columnId of Object.keys(organized) as ColumnId[]) {
      organized[columnId].sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    
    return organized;
  }, [tasks, showCompleted]);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${className}`}>
      {/* Main Board - 8 columns */}
      <div className="lg:col-span-8">
        <div 
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(233,215,196,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}
        >
          {/* Board Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 
                className="text-[13px] tracking-[0.22em]"
                style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4', opacity: 0.92 }}
              >
                MEINE AUFGABEN
              </h2>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Drag & Drop, um den Status zu ändern.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg text-[12px] transition-colors"
                style={{ 
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Filter className="w-3.5 h-3.5 inline mr-1.5" />
                Filter
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{ 
                  background: 'linear-gradient(135deg, #ff6a00, #a34e00)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(255,106,0,0.2)',
                }}
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Aufgabe
              </button>
            </div>
          </div>
          
          {/* Glow Line */}
          <div 
            className="h-px mb-4 relative"
            style={{ background: 'rgba(255,106,0,0.22)' }}
          >
            <div 
              className="absolute inset-0"
              style={{ 
                background: 'rgba(255,106,0,0.15)',
                filter: 'blur(6px)',
              }}
            />
          </div>
          
          {/* Board Columns */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#FE9100' }} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Aufgaben konnten nicht geladen werden.
              </p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['internal-tasks'] })}
                className="text-[12px]"
                style={{ color: '#FE9100' }}
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 overflow-x-auto pb-2">
              {COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks[column.id]}
                  onTaskComplete={handleComplete}
                  onTaskClick={handleTaskClick}
                  onDrop={handleDrop}
                  onAddTask={() => setIsAddModalOpen(true)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar - 4 columns */}
      <div className="lg:col-span-4">
        <MyTasksSidebar
          tasks={tasks}
          onAddTask={() => setIsAddModalOpen(true)}
          showCompleted={showCompleted}
          onToggleCompleted={() => setShowCompleted(!showCompleted)}
        />
      </div>
      
      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onComplete={handleComplete}
        onUpdate={handleUpdate}
      />
      
      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={(title) => createMutation.mutate(title)}
      />
    </div>
  );
}

export default MyTasksBoard;
