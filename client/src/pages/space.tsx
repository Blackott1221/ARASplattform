import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { User, SubscriptionResponse } from "@shared/schema";

export default function Space() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const [typedResearchIndex, setTypedResearchIndex] = useState(0);
  const { user } = useAuth();
  
  // Get AI Profile from user
  const aiProfile = (user as any)?.aiProfile || {};
  const companyName = (user as any)?.company || "dein Unternehmen";
  const companyDescription = aiProfile?.companyDescription || "";
  
  const fullText = companyDescription || "Womit kann ich dir heute helfen?";
  
  // Fetch user's subscription data
  const { data: userSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });
  
  const subscriptionData: SubscriptionResponse | undefined = userSubscription || undefined;

  const handleSectionChange = (section: string) => {
    if (section !== "space") {
      window.location.href = `/${section}`;
    }
  };

  // Typewriter effect for subtitle
  useEffect(() => {
    if (!showWelcome) return;
    
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [showWelcome]);

  // Auto-hide welcome banner after 15 seconds (longer for research display)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-hide topbar after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTopBar(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Show topbar on mouse hover at top
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 50) {
        setShowTopBar(true);
      } else if (e.clientY > 100) {
        setShowTopBar(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern overflow-hidden">
      <Sidebar 
        activeSection="space" 
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col relative content-zoom">
        <TopBar 
          currentSection="space" 
          subscriptionData={subscriptionData}
          user={user as import("@shared/schema").User}
          isVisible={showTopBar}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Modern Auto-Hide Welcome Banner */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative overflow-hidden border-b border-white/5"
              >
                {/* Subtle Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-[#FE9100]/5 to-black/40 backdrop-blur-sm" />
                
                {/* Ambient Glow */}
                <div className="absolute inset-0 bg-[#FE9100]/3 blur-3xl" />

                <div className="relative px-6 py-6">
                  <div className="max-w-6xl mx-auto">
                    {/* Header with Close */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#FE9100]/20 to-[#a34e00]/10 border border-[#FE9100]/30 mb-3"
                        >
                          <span className="text-xs font-black text-[#FE9100]" style={{ fontFamily: 'Orbitron, sans-serif' }}>SYSTEM</span>
                          <div className="w-1 h-1 rounded-full bg-[#FE9100] animate-pulse" />
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest">Initialisierung Abgeschlossen</span>
                        </motion.div>
                        
                        <motion.h2 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                          className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400 flex items-center gap-3 mb-2"
                          style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '-0.02em' }}
                        >
                          <span>Hey {(user as any)?.firstName},</span>
                        </motion.h2>
                        
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.25 }}
                          className="text-base text-gray-300 font-medium max-w-3xl leading-relaxed"
                        >
                          Ich bin <span className="font-black text-[#FE9100]">ARAS AI®</span> – deine persönliche Intelligenz. 
                          Ich habe die letzten Sekunden damit verbracht, <span className="text-white font-semibold">{(user as any)?.company}</span> zu analysieren.
                          <br />
                          <span className="text-sm text-gray-500 mt-1 inline-block">
                            Hier ist, was ich herausgefunden habe →
                          </span>
                        </motion.p>
                      </div>

                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        onClick={() => setShowWelcome(false)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 group"
                      >
                        <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                      </motion.button>
                    </div>

                    {/* MEGA RESEARCH RESULTS GRID */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Company Info */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="col-span-2 p-4 rounded-xl bg-gradient-to-br from-[#FE9100]/10 to-[#a34e00]/5 border border-[#FE9100]/20"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-[#FE9100]/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">🏢</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#FE9100] mb-1">{companyName}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                              {displayedText}
                              {displayedText.length < fullText.length && displayedText.length > 0 && (
                                <motion.span
                                  animate={{ opacity: [1, 0, 1] }}
                                  transition={{ duration: 0.6, repeat: Infinity }}
                                  className="inline-block w-[2px] h-[12px] bg-[#FE9100] ml-0.5 align-middle"
                                />
                              )}
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Goal */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">🎯</span>
                          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hauptziel</h3>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {(user as any)?.primaryGoal?.replace('_', ' ') || 'Lead Generation'}
                        </p>
                      </motion.div>

                      {/* Services */}
                      {aiProfile?.services && aiProfile.services.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">💼</span>
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Services</h3>
                          </div>
                          <ul className="text-xs text-gray-400 space-y-1">
                            {aiProfile.services.slice(0, 3).map((service: string, i: number) => (
                              <li key={i} className="line-clamp-1">• {service}</li>
                            ))}
                            {aiProfile.services.length > 3 && (
                              <li className="text-[#FE9100] font-semibold">+{aiProfile.services.length - 3} mehr</li>
                            )}
                          </ul>
                        </motion.div>
                      )}

                      {/* Target Audience */}
                      {aiProfile?.targetAudience && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">👥</span>
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Zielgruppe</h3>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                            {aiProfile.targetAudience}
                          </p>
                        </motion.div>
                      )}

                      {/* Keywords */}
                      {aiProfile?.effectiveKeywords && aiProfile.effectiveKeywords.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">🔑</span>
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Top Keywords</h3>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {aiProfile.effectiveKeywords.slice(0, 6).map((keyword: string, i: number) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FE9100]/10 text-[#FE9100] font-medium">
                                {keyword}
                              </span>
                            ))}
                            {aiProfile.effectiveKeywords.length > 6 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">
                                +{aiProfile.effectiveKeywords.length - 6}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Auto-hide Progress Bar */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#FE9100] to-[#a34e00]"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 15, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Chat Interface */}
          <div className="flex-1 overflow-hidden relative">
            <ChatInterface />
          </div>
        </div>
      </div>
    </div>
  );
}
