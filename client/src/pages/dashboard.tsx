import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { CI } from '@/lib/constants';
import '@/styles/glassmorphism.css';

// Import Dashboard Components
import {
  CommandHeader,
  HotLeads,
  StatsBar,
  AriaAssistant,
  SmartViews,
  ChatView,
  Predictions,
  HeatMap,
  LeadStory,
  Gamification,
  AutoPilot,
  DemoModal
} from "@/components/dashboard";

export default function DashboardPage() {
  const [showDemoModal, setShowDemoModal] = useState(() => {
    // Check if user has seen demo modal before
    const hasSeenDemo = localStorage.getItem('aras_demo_modal_seen');
    return !hasSeenDemo;
  });
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

  const handleCloseDemoModal = () => {
    localStorage.setItem('aras_demo_modal_seen', 'true');
    setShowDemoModal(false);
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

  return (
    <>
      {/* Demo Modal */}
      {showDemoModal && <DemoModal onClose={handleCloseDemoModal} />}

      <div className="flex-1 h-full overflow-y-auto custom-scrollbar relative" style={{ background: '#000000' }}>
        {/* Enhanced Background with Animated Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Animated Gradient Orbs */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${CI.orange}15, transparent 70%)`,
              top: '-10%',
              left: '10%',
              filter: 'blur(60px)'
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${CI.goldLight}10, transparent 70%)`,
              bottom: '-5%',
              right: '15%',
              filter: 'blur(80px)'
            }}
            animate={{
              x: [0, -30, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${CI.orange}08, transparent 70%)`,
              top: '40%',
              right: '5%',
              filter: 'blur(70px)'
            }}
            animate={{
              x: [0, 40, 0],
              y: [0, -40, 0],
              scale: [1, 1.15, 1]
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
          
          {/* Grid Overlay */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(${CI.orange}40 1px, transparent 1px), linear-gradient(90deg, ${CI.orange}40 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
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
    </>
  );
}
