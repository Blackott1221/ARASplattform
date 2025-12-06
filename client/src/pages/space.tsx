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
  
  // 🔥 CINEMATIC INTRO STATE
  const [showCinematicIntro, setShowCinematicIntro] = useState(false);
  const [introPhase, setIntroPhase] = useState<'boot' | 'analysis' | 'ready'>('boot');
  const [typedIntroText, setTypedIntroText] = useState("");
  const [showStartButton, setShowStartButton] = useState(false);
  
  const { user, isLoading: authLoading } = useAuth();
  
  // Get AI Profile from user
  const aiProfile = (user as any)?.aiProfile || {};
  const companyName = (user as any)?.company || "dein Unternehmen";
  const companyDescription = aiProfile?.companyDescription || "";
  
  const fullText = companyDescription || "Womit kann ich dir heute helfen?";
  
  // Fetch user's subscription data
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });
  
  const subscriptionData: SubscriptionResponse | undefined = userSubscription || undefined;
  
  // 🔥 LOADING STATE - Prevent black screen
  const isPageLoading = authLoading || (!!user && subscriptionLoading);

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
    
    // CRITICAL: Only show cinematic intro if we have required data
    // Relaxed validation - just check if description exists and has some content
    const hasValidData = firstName && company && aiProfile?.companyDescription && aiProfile.companyDescription.length > 20;
    
    console.log('[CINEMATIC-INTRO-DEBUG] Check:', {
      userId,
      firstName,
      company,
      hasProfile: !!aiProfile,
      descLength: aiProfile?.companyDescription?.length || 0,
      hasSeenIntro,
      hasValidData
    });
    
    if (!hasSeenIntro && hasValidData) {
      console.log('[CINEMATIC-INTRO] ✅ STARTING INTRO for:', firstName, company);
      setShowCinematicIntro(true);
      setShowWelcome(false); // Hide normal welcome
      
      // Mark as seen
      localStorage.setItem(`aras_intro_seen_${userId}`, 'true');
    } else if (!hasSeenIntro && !hasValidData) {
      console.log('[CINEMATIC-INTRO] ⚠️ Skipping - waiting for data...');
      // Don't mark as seen yet - wait for data to load
      // User will see intro on next render when data arrives
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
      
      // 🔥 VIEL KÜRZER - nur erste 120 Zeichen + "..."
      const shortDescription = description.length > 120 
        ? description.substring(0, 120).trim() + '...' 
        : description;
      
      // 🔥 KOMPAKTER TEXT - Fokus auf NAME und COMPANY
      const analysisText = `${firstName.toUpperCase()}, ARAS AI analysiert ${company.toUpperCase()}: ${shortDescription}`;
      
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= analysisText.length) {
          setTypedIntroText(analysisText.slice(0, currentIndex));
          currentIndex += 3; // Schneller (3 chars)
        } else {
          clearInterval(typingInterval);
          setIntroPhase('ready');
        }
      }, 20); // Schnellere typing speed

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

  // 🔥 SHOW LOADING SCREEN - Prevents black screen
  if (isPageLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            className="w-16 h-16 border-4 border-[#FE9100] border-t-transparent rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            ARAS AI lädt...
          </p>
        </div>
      </div>
    );
  }

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
              {/* Phase 1: Boot Sequence - NO ICONS, PURE WOW */}
              {introPhase === 'boot' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* 🔥 MASSIVE ARAS AI TEXT - NO ICONS */}
                  <motion.h1
                    className="text-[12rem] font-black mb-8 leading-none"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(135deg, #FE9100 0%, #ff6b00 50%, #FE9100 100%)',
                      backgroundSize: '200% auto',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.05em',
                      textShadow: '0 0 80px rgba(254,145,0,0.5)',
                      filter: 'drop-shadow(0 0 30px rgba(254,145,0,0.8))'
                    }}
                    animate={{
                      backgroundPosition: ['0% 50%', '200% 50%'],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    ARAS AI
                  </motion.h1>

                  {/* Glitch Line Effect */}
                  <motion.div
                    className="h-1 w-96 mx-auto mb-6"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, #FE9100 50%, transparent 100%)',
                    }}
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scaleX: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />

                  {/* Minimalist Status Text */}
                  <motion.p
                    className="text-xl text-[#FE9100] font-bold tracking-widest"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                    animate={{
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  >
                    INITIALISIERUNG...
                  </motion.p>
                </motion.div>
              )}

              {/* Phase 2 & 3: Analysis & Ready - NO ICONS, BIGGER TEXT */}
              {(introPhase === 'analysis' || introPhase === 'ready') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* 🔥 HUGE TEXT - NO ICONS */}
                  <motion.div
                    className="mb-10"
                  >
                    <p
                      className="text-5xl md:text-6xl font-black leading-tight max-w-5xl mx-auto"
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        color: '#FFFFFF',
                        textShadow: '0 0 40px rgba(254,145,0,0.4), 0 0 80px rgba(254,145,0,0.2)',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {typedIntroText}
                      {typedIntroText.length > 0 && introPhase === 'analysis' && (
                        <motion.span
                          className="inline-block w-2 h-12 bg-[#FE9100] ml-3 align-middle"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        />
                      )}
                    </p>
                  </motion.div>

                  {/* System Ready - NO ICONS */}
                  {introPhase === 'ready' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="mb-10"
                    >
                      <motion.p 
                        className="text-3xl font-black mb-6"
                        style={{
                          fontFamily: 'Orbitron, sans-serif',
                          background: 'linear-gradient(90deg, #FE9100 0%, #ff6b00 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                        }}
                      >
                        SYSTEME BEREIT
                      </motion.p>
                      
                      {/* Glitch Progress Bar */}
                      <div className="w-[500px] mx-auto h-2 bg-white/5 rounded-full overflow-hidden relative">
                        <motion.div
                          className="h-full"
                          style={{
                            background: 'linear-gradient(90deg, #FE9100 0%, #ff6b00 50%, #FE9100 100%)',
                            boxShadow: '0 0 20px rgba(254,145,0,0.8)'
                          }}
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Start Button - NO ICONS */}
                  <AnimatePresence>
                    {showStartButton && (
                      <motion.button
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        whileHover={{ 
                          scale: 1.05, 
                          boxShadow: '0 30px 80px rgba(254,145,0,0.6)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCinematicIntro(false)}
                        className="px-16 py-6 rounded-2xl font-black text-3xl text-white mx-auto relative overflow-hidden group"
                        style={{
                          background: 'linear-gradient(135deg, #FE9100 0%, #ff6b00 100%)',
                          boxShadow: '0 20px 60px rgba(254,145,0,0.5)',
                          fontFamily: 'Orbitron, sans-serif',
                          letterSpacing: '0.05em'
                        }}
                      >
                        {/* Glitch overlay on hover */}
                        <motion.div
                          className="absolute inset-0 bg-white/10"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.6 }}
                        />
                        <span className="relative z-10">STARTEN</span>
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
