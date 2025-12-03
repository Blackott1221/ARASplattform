import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, SubscriptionResponse } from "@shared/schema";

// Import Dashboard Components
import { CommandHeader } from "@/components/dashboard/CommandHeader";
import { HotLeads } from "@/components/dashboard/HotLeads";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { AriaAssistant } from "@/components/dashboard/AriaAssistant";
import { SmartViews } from "@/components/dashboard/SmartViews";
import { ChatView } from "@/components/dashboard/ChatView";
import { Predictions } from "@/components/dashboard/Predictions";
import { HeatMap } from "@/components/dashboard/HeatMap";
import { LeadStory } from "@/components/dashboard/LeadStory";
import { Gamification } from "@/components/dashboard/Gamification";
import { AutoPilot } from "@/components/dashboard/AutoPilot";

// ARAS CI
export const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00',
  black: '#0a0a0a'
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('money');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [autoPilotActive, setAutoPilotActive] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    calls: 0,
    appointments: 0,
    followUps: 0,
    pipeline: 0
  });

  // Fetch subscription
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  const handleSectionChange = (section: string) => {
    window.location.href = section === 'space' ? '/app' : `/app/${section}`;
  };

  // Animate stats on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedStats({
        calls: 10847,
        appointments: 342,
        followUps: 1273,
        pipeline: 473000
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-t-transparent rounded-full" 
          style={{ borderColor: CI.orange, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <Sidebar 
        activeSection="dashboard" 
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar 
          currentSection="dashboard"
          subscriptionData={subscriptionData}
          user={user as User}
          isVisible={true}
        />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Background Gradient */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-5"
              style={{ background: `radial-gradient(circle, ${CI.orange}, transparent)` }}
            />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-5"
              style={{ background: `radial-gradient(circle, ${CI.goldLight}, transparent)` }}
            />
          </div>

          <div className="relative p-6 space-y-6 max-w-[1800px] mx-auto">
            
            {/* Command Header */}
            <CommandHeader 
              animatedStats={animatedStats}
              autoPilotActive={autoPilotActive}
              setAutoPilotActive={setAutoPilotActive}
            />

            {/* Auto-Pilot Modal */}
            {autoPilotActive && (
              <AutoPilot 
                isActive={autoPilotActive}
                onClose={() => setAutoPilotActive(false)}
              />
            )}

            {/* Hot Leads Section */}
            <HotLeads 
              onSelectLead={setSelectedLead}
            />

            {/* Main Stats Bar */}
            <StatsBar 
              animatedStats={animatedStats}
            />

            <div className="grid grid-cols-12 gap-6">
              {/* LEFT: Main Content - 8 columns */}
              <div className="col-span-8 space-y-6">
                
                {/* ARIA AI Assistant */}
                <AriaAssistant />

                {/* Toggle between Smart Views and Chat View */}
                <div className="flex items-center gap-2 mb-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowChatView(false); setShowHeatMap(false); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      !showChatView && !showHeatMap ? 'text-black' : 'text-white'
                    }`}
                    style={{
                      background: !showChatView && !showHeatMap 
                        ? CI.orange 
                        : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    SMART VIEWS
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowChatView(true); setShowHeatMap(false); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      showChatView ? 'text-black' : 'text-white'
                    }`}
                    style={{
                      background: showChatView 
                        ? CI.orange 
                        : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    CHAT-ANSICHT
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowHeatMap(true); setShowChatView(false); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      showHeatMap ? 'text-black' : 'text-white'
                    }`}
                    style={{
                      background: showHeatMap 
                        ? CI.orange 
                        : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    HEAT MAP
                  </motion.button>
                </div>

                {/* Conditional Rendering based on view */}
                {showChatView ? (
                  <ChatView />
                ) : showHeatMap ? (
                  <HeatMap />
                ) : (
                  <SmartViews 
                    activeView={activeView}
                    setActiveView={setActiveView}
                    onSelectLead={setSelectedLead}
                  />
                )}

                {/* Lead Story Timeline */}
                {selectedLead && (
                  <LeadStory 
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                  />
                )}
              </div>

              {/* RIGHT: Predictions & Gamification - 4 columns */}
              <div className="col-span-4 space-y-6">
                {/* Predictions & AI Insights */}
                <Predictions />

                {/* Gamification */}
                <Gamification />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${CI.orange}50;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${CI.orange}80;
        }
      `}</style>

      {/* Orbitron Font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}
