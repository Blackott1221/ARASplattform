import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, SubscriptionResponse } from "@shared/schema";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("@/pages/dashboard"));
const PowerPage = lazy(() => import("@/pages/power"));
const CampaignsPage = lazy(() => import("@/pages/campaigns"));
const Contacts = lazy(() => import('./contacts'));
const Calendar = lazy(() => import('./calendar'));
const LeadsPage = lazy(() => import("@/pages/leads"));
const BillingPage = lazy(() => import("@/pages/billing"));
const SettingsPage = lazy(() => import("@/pages/settings"));

export default function App() {
  const [location, setLocation] = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE9100]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setLocation(`/app/${section}`);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar
          currentSection={activeSection}
          subscriptionData={subscriptionData}
          user={user as User}
          isVisible={true}
        />
        
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
    </div>
  );
}
