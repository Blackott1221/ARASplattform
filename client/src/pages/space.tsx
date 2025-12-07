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
      
      // 🔥 FULL TEXT - NO TRUNCATION FOR HIGH END EXPERIENCE
      const analysisText = `ARAS AI hat dein Unternehmen ${company} analysiert und ist bereit, dich optimal zu unterstützen. ${description}`;
      
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= analysisText.length) {
          setTypedIntroText(analysisText.slice(0, currentIndex));
          currentIndex += 1; // Langsam und elegant (1 char)
        } else {
          clearInterval(typingInterval);
          setIntroPhase('ready');
        }
      }, 50); // Langsame, elegante typing speed

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
            className="fixed inset-0 z-[100] flex items-center justify-center p-8"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* NO PARTICLES - Clean transparent background to see SPACE */}

            {/* HIGH END Structured Container - Smaller */}
            <div className="relative z-10 max-w-4xl mx-auto w-full">
              {/* Phase 1: Elegant Boot Sequence */}
              {introPhase === 'boot' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="text-center"
                >
                  {/* HIGH END Animated Header */}
                  <motion.h1
                    className="text-6xl font-bold mb-4"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(90deg, #FE9100 0%, #ff6b00 50%, #FE9100 100%)',
                      backgroundSize: '200% auto',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '0.05em',
                    }}
                    animate={{
                      backgroundPosition: ['0% 50%', '200% 50%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    ARAS AI
                  </motion.h1>

                  {/* Elegant Subtitle */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="space-y-4"
                  >
                    <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-[#FE9100] to-transparent opacity-50" />
                    <p className="text-gray-400 text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Initialisiere deine persönliche KI-Assistenz
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* Phase 2 & 3: Elegant Structured Analysis */}
              {(introPhase === 'analysis' || introPhase === 'ready') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="space-y-8"
                >
                  {/* HIGH END Welcome Card - Transparent */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="backdrop-blur-md bg-black/20 border border-[#FE9100]/30 rounded-3xl p-8"
                    style={{
                      boxShadow: '0 8px 32px rgba(254, 145, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Animated Header */}
                    <motion.h2 
                      className="text-3xl font-bold mb-4 text-center"
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        background: 'linear-gradient(90deg, #FE9100 0%, #ff6b00 50%, #FE9100 100%)',
                        backgroundSize: '200% auto',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                      animate={{
                        backgroundPosition: ['0% 50%', '200% 50%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      Willkommen, {(user as any)?.firstName || 'dort'}!
                    </motion.h2>
                    
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FE9100]/30 to-transparent mb-6" />
                    
                    {/* FULL Vision Text - NO Truncation */}
                    <motion.div className="text-center space-y-4">
                      <p className="text-gray-200 text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {typedIntroText}
                        {typedIntroText.length > 0 && introPhase === 'analysis' && (
                          <motion.span
                            className="inline-block w-0.5 h-5 bg-[#FE9100] ml-1 align-middle"
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          />
                        )}
                      </p>
                    </motion.div>
                  </motion.div>

                  {/* Analysis Summary - Structured Sections */}
                  {introPhase === 'ready' && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        {/* Company Info - More Transparent */}
                        <div className="backdrop-blur-md bg-black/10 border border-[#FE9100]/20 rounded-2xl p-5">
                          <div className="text-[#FE9100] text-xs font-bold mb-2 tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>UNTERNEHMEN</div>
                          <div className="text-white text-lg font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>{(user as any)?.company || 'Nicht angegeben'}</div>
                        </div>

                        {/* Industry */}
                        <div className="backdrop-blur-md bg-black/10 border border-[#FE9100]/20 rounded-2xl p-5">
                          <div className="text-[#FE9100] text-xs font-bold mb-2 tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>BRANCHE</div>
                          <div className="text-white text-lg font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>{(user as any)?.industry || 'KI-Technologie'}</div>
                        </div>

                        {/* Role */}
                        <div className="backdrop-blur-md bg-black/10 border border-[#FE9100]/20 rounded-2xl p-5">
                          <div className="text-[#FE9100] text-xs font-bold mb-2 tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>POSITION</div>
                          <div className="text-white text-lg font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>{(user as any)?.role || 'Entscheider'}</div>
                        </div>
                      </motion.div>

                      {/* Vision Statement - HIGH END */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="backdrop-blur-md bg-gradient-to-br from-[#FE9100]/5 to-transparent border border-[#FE9100]/30 rounded-3xl p-8"
                      >
                        <motion.h3 
                          className="text-2xl font-bold mb-4"
                          style={{
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #FE9100 0%, #ff6b00 50%, #FE9100 100%)',
                            backgroundSize: '200% auto',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                          animate={{
                            backgroundPosition: ['0% 50%', '200% 50%'],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        >
                          Deine Vision mit ARAS AI
                        </motion.h3>
                        <p className="text-gray-200 text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Ich habe deine Unternehmensdaten analysiert und bin bereit, dich bei der Automatisierung deiner Kundenkommunikation zu unterstützen. 
                          Gemeinsam werden wir deine Effizienz steigern und neue Geschäftsmöglichkeiten erschließen.
                        </p>
                      </motion.div>
                    </>
                  )}

                  {/* HIGH END Round Button with Animated Border */}
                  <AnimatePresence>
                    {showStartButton && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="flex justify-center pt-6"
                      >
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowCinematicIntro(false)}
                          className="relative px-14 py-5 rounded-full font-bold text-lg text-white group overflow-hidden"
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            background: 'transparent',
                          }}
                        >
                          {/* Animated Border */}
                          <motion.div
                            className="absolute inset-0 rounded-full p-[2px]"
                            style={{
                              background: 'linear-gradient(90deg, #FE9100 0%, #ff6b00 50%, #FE9100 100%)',
                              backgroundSize: '200% auto',
                            }}
                            animate={{
                              backgroundPosition: ['0% 50%', '200% 50%'],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                          >
                            <div className="w-full h-full rounded-full bg-black/40 backdrop-blur-sm" />
                          </motion.div>
                          
                          {/* Hover Glow */}
                          <motion.div
                            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              boxShadow: '0 0 40px rgba(254,145,0,0.6), inset 0 0 40px rgba(254,145,0,0.2)'
                            }}
                          />
                          
                          <span className="relative z-10">ARAS AI starten</span>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
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
