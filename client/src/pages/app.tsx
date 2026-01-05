import { useState, useEffect, Suspense, useMemo } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { NewYearOverlay } from "@/components/overlays/new-year-overlay";
import { AppErrorBoundary } from "@/components/system/app-error-boundary";
import { CommandPalette } from "@/components/system/command-palette";
import { useRegisterCommands } from "@/lib/commands/use-register-commands";
import { lazyWithRetry } from "@/lib/react/lazy-with-retry";
import { checkBuildIdAndReload } from "@/lib/system/build-id";
import type { Command } from "@/lib/commands/command-types";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import type { User, SubscriptionResponse } from "@shared/schema";

// ARAS CI Colors for loading states
const COLORS = {
  orange: '#ff6a00',
  gold: '#e9d7c4',
};

// Check for build ID mismatch and reload if needed (cache protection)
checkBuildIdAndReload();

// Lazy load pages with retry for chunk loading failures
const Dashboard = lazyWithRetry(() => import("@/pages/dashboard"), { retries: 2 });
const PowerPage = lazyWithRetry(() => import("@/pages/power"), { retries: 2 });
const CampaignsPage = lazyWithRetry(() => import("@/pages/campaigns"), { retries: 2 });
const Contacts = lazyWithRetry(() => import('./contacts'), { retries: 2 });
const Calendar = lazyWithRetry(() => import('./calendar'), { retries: 2 });
const LeadsPage = lazyWithRetry(() => import("@/pages/leads"), { retries: 2 });
const BillingPage = lazyWithRetry(() => import("@/pages/billing"), { retries: 2 });
const SettingsPage = lazyWithRetry(() => import("@/pages/settings"), { retries: 2 });

export default function App() {
  const [location, setLocation] = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  
  // Determine active section from URL
  const getActiveSectionFromUrl = () => {
    if (location.includes('/dashboard')) return 'dashboard';
    if (location.includes('/power')) return 'power';
    if (location.includes('/campaigns')) return 'campaigns';
    if (location.includes('/contacts')) return 'contacts';
    if (location.includes('/calendar')) return 'calendar';
    if (location.includes('/leads')) return 'leads';
    if (location.includes('/billing')) return 'billing';
    if (location.includes('/settings')) return 'settings';
    return 'space';
  };
  
  const [activeSection, setActiveSection] = useState(getActiveSectionFromUrl());
  
  // Update active section when URL changes
  useEffect(() => {
    const section = getActiveSectionFromUrl();
    setActiveSection(section);
  }, [location]);
  
  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeSection]);

  // Navigation commands for Command Palette
  const navigationCommands = useMemo<Command[]>(() => [
    {
      id: 'nav-dashboard',
      group: 'Navigation',
      title: 'Dashboard öffnen',
      keywords: ['mission control', 'übersicht', 'home'],
      perform: () => { setActiveSection('dashboard'); setLocation('/app/dashboard'); },
    },
    {
      id: 'nav-space',
      group: 'Navigation',
      title: 'Space öffnen',
      keywords: ['chat', 'ai', 'assistent'],
      perform: () => { setActiveSection('space'); setLocation('/app/space'); },
    },
    {
      id: 'nav-power',
      group: 'Navigation',
      title: 'Power öffnen',
      keywords: ['analyse', 'recherche', 'deep'],
      perform: () => { setActiveSection('power'); setLocation('/app/power'); },
    },
    {
      id: 'nav-campaigns',
      group: 'Navigation',
      title: 'Kampagnen öffnen',
      keywords: ['outbound', 'sequenz', 'automation'],
      perform: () => { setActiveSection('campaigns'); setLocation('/app/campaigns'); },
    },
    {
      id: 'nav-contacts',
      group: 'Navigation',
      title: 'Kontakte öffnen',
      keywords: ['crm', 'leads', 'personen'],
      perform: () => { setActiveSection('contacts'); setLocation('/app/contacts'); },
    },
    {
      id: 'nav-calendar',
      group: 'Navigation',
      title: 'Kalender öffnen',
      keywords: ['termine', 'events', 'schedule'],
      perform: () => { setActiveSection('calendar'); setLocation('/app/calendar'); },
    },
    {
      id: 'nav-leads',
      group: 'Navigation',
      title: 'Wissensdatenbank öffnen',
      keywords: ['knowledge', 'daten', 'quellen'],
      perform: () => { setActiveSection('leads'); setLocation('/app/leads'); },
    },
    {
      id: 'nav-settings',
      group: 'Navigation',
      title: 'Einstellungen öffnen',
      keywords: ['profil', 'account', 'config'],
      perform: () => { setActiveSection('settings'); setLocation('/app/settings'); },
    },
  ], [setLocation]);

  // Register navigation commands
  useRegisterCommands('app-navigation', navigationCommands);

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/subscription', { credentials: 'include' });
        if (!res.ok) {
          console.warn('[App] Subscription API Error:', res.status);
          return null as any;
        }
        return await res.json();
      } catch (err) {
        console.error('[App] Subscription fetch error:', err);
        return null as any;
      }
    },
    enabled: !!user && !isLoading,
    retry: false,
  });

  // Render the active section content
  const renderActiveSection = () => {
    switch (activeSection) {
      case "space":
        return <ChatInterface />;
      case "dashboard":
        return <Dashboard />;
      case "power":
        return <PowerPage />;
      case "campaigns":
        return <CampaignsPage />;
      case "contacts":
        return <Contacts />;
      case "calendar":
        return <Calendar />;
      case "leads":
        return <LeadsPage />;
      case "billing":
        return <BillingPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ChatInterface />;
    }
  };

  // Cinematic loading state - never shows black screen
  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(12,12,12,0.96) 0%, rgba(0,0,0,0.99) 100%)',
        }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 mx-auto mb-4 rounded-full"
            style={{
              background: `conic-gradient(${COLORS.orange}, ${COLORS.gold}, ${COLORS.orange})`,
              animation: 'spin 1.5s linear infinite',
            }}
          >
            <div className="w-10 h-10 m-1 rounded-full bg-black" />
          </div>
          <p className="text-sm text-neutral-500">Wird geladen...</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Redirect to login if no user after loading complete
  if (!user) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(12,12,12,0.96) 0%, rgba(0,0,0,0.99) 100%)',
        }}
      >
        <p className="text-sm text-neutral-500">Weiterleitung zur Anmeldung...</p>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
    <div className="flex min-h-screen h-screen bg-transparent overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            setLocation(`/app/${section}`);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>
      
      {/* Mobile Sidebar Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            setLocation(`/app/${section}`);
            setIsMobileSidebarOpen(false);
          }}
          isCollapsed={false}
          onToggleCollapse={() => setIsMobileSidebarOpen(false)}
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden flex items-center gap-3 px-3 py-2 bg-black/20 backdrop-blur-xl border-b border-white/5">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            {isMobileSidebarOpen ? (
              <X className="w-5 h-5 text-white/70" />
            ) : (
              <Menu className="w-5 h-5 text-white/70" />
            )}
          </button>
          <span className="text-sm font-medium text-white/80 capitalize">{activeSection}</span>
        </div>
        
        {/* Desktop TopBar - hidden on mobile */}
        <div className="hidden lg:block">
          <TopBar
            currentSection={activeSection}
            subscriptionData={subscriptionData}
            user={user as User}
            isVisible={true}
          />
        </div>
        
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full bg-black">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE9100]" />
            </div>
          }>
            {renderActiveSection()}
          </Suspense>
        </div>
      </div>

      {/* Feedback Widget - Always visible for Alpha users */}
      <FeedbackWidget />

      {/* New Year 2026 Overlay - Global, one-time per user */}
      {user && <NewYearOverlay userId={String((user as User).id)} />}

      {/* Command Palette - Global (Cmd/Ctrl+K) */}
      <CommandPalette userId={user ? String((user as User).id) : undefined} />
    </div>
    </AppErrorBoundary>
  );
}
