import { Suspense, lazy, useState, useCallback, useMemo } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { markModule } from "@/lib/system/module-trace";
import type { User } from "@shared/schema";

// Trace: dashboard page module loaded
markModule('dashboard:page:import');

// SAFARI TDZ FIX: Use cycle-free shell instead of dashboard-content
// Each module lazy loads separately - if one crashes, others still load
const DashboardShell = lazy(() => {
  markModule('dashboard:shell:lazy:begin');
  return import("@/components/dashboard/dashboard-shell").then(m => {
    markModule('dashboard:shell:lazy:resolved');
    return { default: m.DashboardShell };
  });
});

/**
 * Dashboard Page
 * IMPORTANT: NO Sidebar/TopBar here!
 * AppPage already renders layout components
 * Wrapped in ErrorBoundary to prevent blackscreen crashes
 * Uses lazy loading to isolate potential TDZ crashes
 */
export default function Dashboard() {
  markModule('dashboard:page:render');
  const { user, isLoading } = useAuth();
  
  // Minimal state management - no command imports
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'call' | 'space'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);

  // Fetch data - minimal queries
  const { data: callLogs = [] } = useQuery({
    queryKey: ['call-logs'],
    queryFn: async () => {
      const res = await fetch('/api/aras-voice/calls', { credentials: 'include' });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  const { data: chatSessions = [] } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/chat/sessions', { credentials: 'include' });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  const { data: openTasks = [] } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/users/tasks', { credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  const { data: calendar = [] } = useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const res = await fetch('/api/calendar/events', { credentials: 'include' });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  // Handlers - no imports, just inline
  const handleOpenDetails = useCallback(async (item: any) => {
    setSelectedItem(item);
    // Details fetching would go here
  }, []);

  const handleCreateTask = useCallback(async (items: any[]) => {
    // Task creation would go here
  }, []);

  const handleDismissInfo = useCallback((id: string) => {
    // Info dismissal would go here
  }, []);

  const handleFocusContact = useCallback((key: string | null) => {
    setFocusKey(key);
  }, []);

  const handlePinContact = useCallback((key: string) => {
    setPinnedKeys(prev => [...prev, key]);
  }, []);

  // Prepare props for shell
  const dashboardProps = useMemo(() => ({
    user: user as User,
    data: {
      callLogs,
      chatSessions,
      openTasks,
      calendar,
      systemStatus: { status: 'OK' },
    },
    handlers: {
      onOpenDetails: handleOpenDetails,
      onCreateTask: handleCreateTask,
      onDismissInfo: handleDismissInfo,
      onFocusContact: handleFocusContact,
      onPinContact: handlePinContact,
    },
    state: {
      focusKey,
      pinnedKeys,
      activeFilter,
      searchQuery,
    },
    setters: {
      setActiveFilter,
      setSearchQuery,
      setFocusKey,
      setPinnedKeys,
    },
  }), [
    user, callLogs, chatSessions, openTasks, calendar,
    focusKey, pinnedKeys, activeFilter, searchQuery,
    handleOpenDetails, handleCreateTask, handleDismissInfo,
    handleFocusContact, handlePinContact,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE9100]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <p className="text-gray-400">Nicht eingeloggt</p>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Dashboard konnte nicht geladen werden">
      <div className="h-full overflow-y-auto bg-black px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-32 sm:pb-24">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE9100]" />
          </div>
        }>
          <DashboardShell {...dashboardProps} />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
