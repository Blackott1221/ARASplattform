import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Zap, Database, Brain, Rocket } from "lucide-react";
import type { User, SubscriptionResponse } from "@shared/schema";

export default function Space() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const [typedResearchIndex, setTypedResearchIndex] = useState(0);
  
  // 🔥 CINEMATIC INTRO STATE
  const [showCinematicIntro, setShowCinematicIntro] = useState(false);
  const [introPhase, setIntroPhase] = useState<'boot' | 'analysis' | 'ready'>('boot');
  const [typedIntroText, setTypedIntroText] = useState("");
  const [showStartButton, setShowStartButton] = useState(false);
  
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

  // 🔥 CHECK IF THIS IS FIRST VISIT (SHOW CINEMATIC INTRO)
  useEffect(() => {
    if (!user) return;
    
    const userId = (user as any)?.id;
    const firstName = (user as any)?.firstName;
    const company = (user as any)?.company;
    
    if (!userId) return;
    
    const hasSeenIntro = localStorage.getItem(`aras_intro_seen_${userId}`);
    
    // CRITICAL: Only show cinematic intro if we have ALL required data
    // This prevents black screen issues after registration
    const hasValidData = firstName && company && aiProfile?.companyDescription && aiProfile.companyDescription.length > 50;
    
    if (!hasSeenIntro && hasValidData) {
      console.log('[CINEMATIC-INTRO] Showing intro for:', firstName, company);
      setShowCinematicIntro(true);
      setShowWelcome(false); // Hide normal welcome
      
      // Mark as seen
      localStorage.setItem(`aras_intro_seen_${userId}`, 'true');
    } else if (!hasSeenIntro && !hasValidData) {
      console.log('[CINEMATIC-INTRO] Skipping - insufficient data. HasProfile:', !!aiProfile, 'DescLength:', aiProfile?.companyDescription?.length || 0);
      // If user just registered but profile not ready yet, mark as seen to show normal welcome
      // They'll see the welcome banner instead
      localStorage.setItem(`aras_intro_seen_${userId}`, 'true');
    }
  }, [user, aiProfile]);

  // 🔥 CINEMATIC INTRO SEQUENCE
  useEffect(() => {
    if (!showCinematicIntro) return;
    
    // Safety check: If we somehow get here without data, abort
    if (!user || !aiProfile?.companyDescription) {
      console.error('[CINEMATIC-INTRO] Aborting - missing required data');
      setShowCinematicIntro(false);
      return;
    }

    // Phase 1: Boot sequence (0-1.5s)
    const bootTimer = setTimeout(() => {
      setIntroPhase('analysis');
    }, 1500);

    // Phase 2: Start typing analysis (1.5s)
    const typingStartTimer = setTimeout(() => {
      const firstName = (user as any)?.firstName || 'dort';
      const company = (user as any)?.company || 'dein Unternehmen';
      const description = aiProfile?.companyDescription || 'Innovatives Unternehmen mit großem Potenzial.';
      
      const analysisText = `Hallo ${firstName}, ARAS AI hat soeben folgende Daten über ${company} analysiert: "${description}"`;
      
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= analysisText.length) {
          setTypedIntroText(analysisText.slice(0, currentIndex));
          currentIndex += 2; // Faster typing (2 chars at a time)
        } else {
          clearInterval(typingInterval);
          setIntroPhase('ready');
        }
      }, 30); // Fast typing speed

      return () => clearInterval(typingInterval);
    }, 1500);

    // Phase 3: Show start button (4s total)
    const buttonTimer = setTimeout(() => {
      setShowStartButton(true);
    }, 4000);

    return () => {
      clearTimeout(bootTimer);
      clearTimeout(typingStartTimer);
      clearTimeout(buttonTimer);
    };
  }, [showCinematicIntro, user, aiProfile]);

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
    <div className="flex h-screen overflow-hidden">
      {/* 🔥 CINEMATIC INTRO OVERLAY */}
      <AnimatePresence>
        {showCinematicIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #000000 0%, #0A0A0A 50%, #000000 100%)',
              backdropFilter: 'blur(40px)'
            }}
          >
            {/* Animated Background Particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-[#FE9100]"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            {/* Central Glow Effect */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(254,145,0,0.15) 0%, transparent 70%)',
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Content Container */}
            <div className="relative z-10 max-w-5xl mx-auto px-8 text-center">
              {/* Phase 1: Boot Sequence */}
              {introPhase === 'boot' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  {/* ARAS AI Logo Animation */}
                  <motion.div
                    className="mb-12 flex items-center justify-center gap-4"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <motion.div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #FE9100 0%, #ff6b00 100%)',
                        boxShadow: '0 20px 60px rgba(254,145,0,0.6)'
                      }}
                      animate={{
                        boxShadow: [
                          '0 20px 60px rgba(254,145,0,0.6)',
                          '0 25px 80px rgba(254,145,0,0.8)',
                          '0 20px 60px rgba(254,145,0,0.6)'
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    >
                      <Brain className="w-10 h-10 text-white" />
                    </motion.div>
                  </motion.div>

                  {/* Boot Text */}
                  <motion.h1
                    className="text-7xl font-black mb-6"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(90deg, #FFFFFF 0%, #FE9100 50%, #FFFFFF 100%)',
                      backgroundSize: '200% auto',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.02em',
                    }}
                    animate={{
                      backgroundPosition: ['0% center', '200% center'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    ARAS AI
                  </motion.h1>

                  {/* System Status */}
                  <div className="space-y-3">
                    {['Neuronales Netzwerk initialisiert', 'Systeme hochgefahren', 'Analysemodul bereit'].map((text, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.3, duration: 0.4 }}
                        className="flex items-center justify-center gap-3"
                      >
                        <Zap className="w-4 h-4 text-[#FE9100]" />
                        <span className="text-gray-400 text-sm font-mono">{text}</span>
                        <motion.div
                          className="w-2 h-2 rounded-full bg-green-400"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Phase 2 & 3: Analysis & Ready */}
              {(introPhase === 'analysis' || introPhase === 'ready') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Icon with Pulse */}
                  <motion.div
                    className="mb-8 flex items-center justify-center"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    <div
                      className="w-24 h-24 rounded-3xl flex items-center justify-center relative"
                      style={{
                        background: 'linear-gradient(135deg, #FE9100 0%, #ff6b00 100%)',
                        boxShadow: '0 30px 80px rgba(254,145,0,0.5)'
                      }}
                    >
                      <Sparkles className="w-12 h-12 text-white" />
                      <motion.div
                        className="absolute inset-0 rounded-3xl border-2 border-[#FE9100]"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.8, 0, 0.8],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                      />
                    </div>
                  </motion.div>

                  {/* Typing Text */}
                  <motion.div
                    className="mb-12 min-h-[180px] flex items-center justify-center"
                  >
                    <p
                      className="text-3xl md:text-4xl font-bold leading-relaxed max-w-4xl"
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        color: '#FFFFFF',
                        textShadow: '0 0 30px rgba(254,145,0,0.3)',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {typedIntroText}
                      {typedIntroText.length > 0 && introPhase === 'analysis' && (
                        <motion.span
                          className="inline-block w-1 h-8 bg-[#FE9100] ml-2 align-middle"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      )}
                    </p>
                  </motion.div>

                  {/* System Status - "Hochfahren" */}
                  {introPhase === 'ready' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="mb-8"
                    >
                      <p className="text-[#FE9100] text-lg font-bold mb-4 flex items-center justify-center gap-2">
                        <Database className="w-5 h-5 animate-pulse" />
                        ARAS AI fährt gerade die Systeme hoch
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="w-96 mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#FE9100] to-[#ff6b00]"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2, ease: "easeInOut" }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Start Button */}
                  <AnimatePresence>
                    {showStartButton && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(254,145,0,0.5)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCinematicIntro(false)}
                        className="px-12 py-5 rounded-2xl font-black text-xl text-white flex items-center gap-3 mx-auto"
                        style={{
                          background: 'linear-gradient(135deg, #FE9100 0%, #ff6b00 100%)',
                          boxShadow: '0 20px 50px rgba(254,145,0,0.4)',
                          fontFamily: 'Orbitron, sans-serif',
                        }}
                      >
                        <Rocket className="w-6 h-6" />
                        ARAS AI starten
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          →
                        </motion.span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-[#FE9100]/30" />
            <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-[#FE9100]/30" />
            <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-[#FE9100]/30" />
            <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-[#FE9100]/30" />
          </motion.div>
        )}
      </AnimatePresence>

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
                {/* Subtle Gradient Background - very transparent, no blur */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-[#FE9100]/3 to-black/15" />
                
                {/* Ambient Glow - minimal */}
                <div className="absolute inset-0 bg-[#FE9100]/2 blur-3xl" />

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
