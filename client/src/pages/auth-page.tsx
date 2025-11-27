import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Phone, Calendar, Sparkles, Building, Globe, User, Target, ChevronLeft, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { trackLogin, trackSignup, captureUTMParameters } from "@/lib/analytics";

const TYPED_LINES = [
  "Die Stimme, die verkauft.",
  "Echte Gespräche. Echte Resultate.",
  "ARAS AI führt tausende Anrufe gleichzeitig.",
  "Du liest nicht über die Zukunft.",
  "Du hörst sie."
];

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    // 🔥 BUSINESS INTELLIGENCE FIELDS
    company: "",
    website: "",
    industry: "",
    role: "",
    phone: "",
    language: "de",
    primaryGoal: ""
  });

  const [typedIndex, setTypedIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [registrationStep, setRegistrationStep] = useState(1); // 1: Personal, 2: Business, 3: AI Config, 4: Live Research
  const [isResearching, setIsResearching] = useState(false);
  const [researchStatus, setResearchStatus] = useState<string>("");
  const [researchProgress, setResearchProgress] = useState<number>(0);
  
  // Industry & Goal Options
  const industries = [
    { value: "real_estate", label: "Immobilien" },
    { value: "insurance", label: "Versicherungen" },
    { value: "b2b_services", label: "B2B Services" },
    { value: "healthcare", label: "Healthcare" },
    { value: "finance", label: "Finanzwesen" },
    { value: "ecommerce", label: "E-Commerce" },
    { value: "technology", label: "Technologie" },
    { value: "consulting", label: "Beratung" },
    { value: "other", label: "Andere" }
  ];
  
  const primaryGoals = [
    { value: "lead_generation", label: "Lead Generierung" },
    { value: "appointment_booking", label: "Terminbuchung" },
    { value: "customer_support", label: "Kundensupport" },
    { value: "sales_outreach", label: "Vertrieb" },
    { value: "market_research", label: "Marktforschung" },
    { value: "follow_up", label: "Nachfassen" }
  ];
  
  const roles = [
    { value: "ceo", label: "CEO / Geschäftsführer" },
    { value: "sales_manager", label: "Sales Manager" },
    { value: "marketing", label: "Marketing Manager" },
    { value: "founder", label: "Founder" },
    { value: "freelancer", label: "Freelancer" },
    { value: "other", label: "Andere" }
  ];

  // Animated counter for stats
  const [callsCount, setCallsCount] = useState(0);
  const [accuracyCount, setAccuracyCount] = useState(0);

  useEffect(() => {
    // Count up animation for calls
    const callsTimer = setInterval(() => {
      setCallsCount(prev => {
        if (prev >= 10000) {
          clearInterval(callsTimer);
          return 10000;
        }
        return prev + 150;
      });
    }, 20);

    // Count up animation for accuracy
    const accuracyTimer = setInterval(() => {
      setAccuracyCount(prev => {
        if (prev >= 99) {
          clearInterval(accuracyTimer);
          return 99;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      clearInterval(callsTimer);
      clearInterval(accuracyTimer);
    };
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("");
      return true;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Ungültige E-Mail-Adresse");
      return false;
    }
    setEmailError("");
    return true;
  };

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }
    if (password.length < 6) {
      setPasswordStrength('weak');
    } else if (password.length < 10) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  useEffect(() => {
    captureUTMParameters();
  }, []);

  useEffect(() => {
    const current = TYPED_LINES[typedIndex];
    const speed = isDeleting ? 50 : 100;

    const timer = setTimeout(() => {
      const currentLine = TYPED_LINES[typedIndex];

      if (!isDeleting && typedText === currentLine) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (!isDeleting) {
        setTypedText(currentLine.substring(0, typedText.length + 1));
      } else if (typedText.length > 0) {
        setTypedText(currentLine.substring(0, typedText.length - 1));
      } else {
        setIsDeleting(false);
        setTypedIndex((prev) => (prev + 1) % TYPED_LINES.length);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, typedIndex]);

  if (!isLoading && user) {
    setLocation("/welcome");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-[#FE9100]" />
        </motion.div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync(loginData);
      trackLogin('email', result?.id);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in."
      });
      setLocation("/welcome");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // STEP 1 VALIDATION - Personal Data
    if (registrationStep === 1) {
      // Check required fields
      if (!registerData.firstName) {
        toast({
          title: "Hey, wir brauchen deinen Vornamen! 😊",
          description: "Damit deine KI dich persönlich ansprechen kann.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.lastName) {
        toast({
          title: "Und deinen Nachnamen bitte! 👤",
          description: "Das macht's offizieller und persönlicher.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.email) {
        toast({
          title: "E-Mail fehlt noch! 📧",
          description: "Wir brauchen sie für wichtige Updates und Login.",
          variant: "destructive"
        });
        return;
      }
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerData.email)) {
        toast({
          title: "Hmm, die E-Mail sieht komisch aus 🤔",
          description: "Bitte gib eine gültige E-Mail-Adresse ein (z.B. max@firma.de)",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.username) {
        toast({
          title: "Username vergessen! 💭",
          description: "Wähle einen coolen Usernamen für dein Login.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.password) {
        toast({
          title: "Passwort fehlt! 🔐",
          description: "Ein sicheres Passwort schützt deinen Account.",
          variant: "destructive"
        });
        return;
      }
      // Password strength check
      if (registerData.password.length < 6) {
        toast({
          title: "Passwort zu kurz! ⚠️",
          description: "Mindestens 6 Zeichen sind nötig für deine Sicherheit.",
          variant: "destructive"
        });
        return;
      }
      
      setRegistrationStep(2);
      return;
    }
    
    // STEP 2 VALIDATION - Business Intelligence
    if (registrationStep === 2) {
      if (!registerData.company) {
        toast({
          title: "Firmenname fehlt! 🏢",
          description: "Damit deine KI weiß, für wen sie arbeitet.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.industry) {
        toast({
          title: "Branche wählen! 🎯",
          description: "Das hilft der KI, sich auf deine Branche zu spezialisieren.",
          variant: "destructive"
        });
        return;
      }
      if (!registerData.role) {
        toast({
          title: "Deine Position fehlt! 👔",
          description: "Sag uns, welche Rolle du im Unternehmen hast.",
          variant: "destructive"
        });
        return;
      }
      
      // Website validation (optional, but if provided must be valid)
      if (registerData.website && registerData.website.trim() !== '') {
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/{0-9a-zA-Z\.-]*)*\/?$/;
        if (!urlRegex.test(registerData.website)) {
          toast({
            title: "Website-Format nicht korrekt 🌐",
            description: "Bitte gib eine gültige URL ein (z.B. firma.de oder https://firma.de)",
            variant: "destructive"
          });
          return;
        }
        // Auto-add https:// if missing
        if (!registerData.website.startsWith('http')) {
          setRegisterData(prev => ({ 
            ...prev, 
            website: `https://${prev.website}` 
          }));
        }
      }
      
      setRegistrationStep(3);
      return;
    }
    
    // STEP 3 - Move to Live Research
    if (registrationStep === 3) {
      if (!registerData.primaryGoal) {
        toast({
          title: "Was ist dein Hauptziel?",
          description: "Wähle aus, wobei die KI dir am meisten helfen soll.",
          variant: "destructive"
        });
        return;
      }
      
      // Move to Step 4: Live Research
      setRegistrationStep(4);
      setIsResearching(true);
      
      // 🚀 START LIVE RESEARCH ANIMATION
      const researchSteps = [
        "🔍 Verbindung zu globalen Datenbanken wird hergestellt...",
        `📊 Analysiere über 500+ Datenquellen zu ${registerData.company}...`,
        "🌐 Scanne Unternehmenswebsite und Social Media Präsenz...",
        "🤖 KI-Agenten durchsuchen Branchendatenbanken...",
        "🧠 Gemini 3.0 Flash analysiert Unternehmens-DNA...",
        "📈 Analysiere Marktposition und Wettbewerber...",
        "🎯 Identifiziere Zielgruppen und Kundenprofile...",
        "💼 Extrahiere Produkte, Services und USPs...",
        "👔 Identifiziere Entscheidungsträger und Key Contacts...",
        "💰 Analysiere Budget-Zyklen und Kaufentscheidungen...",
        "🔮 Erstelle psychologisches Unternehmensprofil...",
        "🌍 Live-Daten über Google Search werden integriert...",
        "📊 Wettbewerber-Intelligence wird finalisiert...",
        "✨ Generiere personalisierte KI-Strategie...",
        "🚀 ARAS AI wird mit deinen Daten trainiert...",
        "✅ Finalisiere Intelligence Report..."
      ];
      
      let currentStep = 0;
      const stepInterval = setInterval(() => {
        if (currentStep < researchSteps.length) {
          setResearchStatus(researchSteps[currentStep]);
          setResearchProgress(Math.min(((currentStep + 1) / researchSteps.length) * 100, 95));
          currentStep++;
        }
      }, 2000);
      
      // Start actual registration after animation starts
      setTimeout(async () => {
        try {
          const result = await registerMutation.mutateAsync(registerData);
          trackSignup('email', result?.id);
          
          // Wait for REAL backend research to complete (30+ seconds)
          setTimeout(() => {
            clearInterval(stepInterval);
            setResearchProgress(100);
            setResearchStatus("✅ ULTRA-DEEP Research abgeschlossen! ARAS AI kennt jetzt ALLES über " + registerData.company + "! 🔥");
            
            setTimeout(() => {
              toast({
                title: "🎉 Willkommen bei ARAS AI Pro Research™!",
                description: `Hey ${registerData.firstName}! Deine KI hat ${registerData.company} komplett analysiert. Ready to blow your mind! 💪🔥`
              });
              setLocation("/welcome");
            }, 3000);
          }, Math.max(28000, (researchSteps.length * 2000) - 2000));
          
        } catch (error: any) {
          clearInterval(stepInterval);
          setIsResearching(false);
          
          // Better error messages from server
          let errorMessage = "Ups, da ist was schief gelaufen. Versuch's nochmal!";
          
          if (error.message?.includes('email')) {
            errorMessage = "Diese E-Mail ist schon bei uns registriert. Willst du dich einloggen?";
          } else if (error.message?.includes('username') || error.message?.includes('Benutzername')) {
            errorMessage = "Dieser Username ist leider schon vergeben. Wähle einen anderen!";
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          toast({
            title: "Registrierung fehlgeschlagen 😕",
            description: errorMessage,
            variant: "destructive"
          });
          
          // Go back to step 3 on error
          setRegistrationStep(3);
          setResearchStatus("");
          setResearchProgress(0);
        }
      }, 2000); // Start registration after 2 seconds of animation
      
      return;
    }
  };

  const goToPreviousStep = () => {
    if (registrationStep > 1) {
      setRegistrationStep(registrationStep - 1);
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Simple Dark Background with Subtle Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Film Grain Texture for Premium Look */}
        <div 
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/80" />
        
        {/* Subtle Radial Glow */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 100%, rgba(254, 145, 0, 0.15) 0%, transparent 60%)'
          }}
        />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* LEFT SIDE - Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-10"
          >
            {/* Pre-Launch Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative inline-block">
                <motion.div
                  className="absolute -inset-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                    backgroundSize: '300% 100%',
                    filter: 'blur(6px)',
                    opacity: 0.5
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative flex items-center gap-2.5 px-4 py-2 rounded-full"
                  style={{
                    background: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(254, 145, 0, 0.25)',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-[#FE9100]"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.6, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[10px] tracking-[0.25em] uppercase font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                    PRE-LAUNCH PHASE
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Main Logo */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <h1
                className="text-7xl font-black tracking-tight mb-3"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 60px rgba(254, 145, 0, 0.2)'
                }}
              >
                ARAS AI
              </h1>
              <p
                className="text-xs uppercase tracking-[0.3em] font-bold text-[#e9d7c4] opacity-80"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Die Outbound-KI
              </p>
            </motion.div>

            {/* Typewriter Effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="min-h-[50px] flex items-center"
            >
              <span
                className="text-xl font-bold"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                {typedText}
                <motion.span
                  className="inline-block w-[2px] h-[22px] bg-[#FE9100] ml-1.5 align-middle"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </span>
            </motion.div>

            {/* 🔥 SPEKTAKULÄRE FEATURE CARDS - BENTO GRID STYLE */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Card 1 - Simultane Anrufe */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="col-span-2 relative overflow-hidden rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.08), rgba(163, 78, 0, 0.05))',
                  border: '1px solid rgba(254, 145, 0, 0.2)',
                  backdropFilter: 'blur(30px)'
                }}
              >
                {/* Floating Icon */}
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-6 -top-6 w-28 h-28 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, rgba(254, 145, 0, 0.15), transparent)',
                    filter: 'blur(20px)'
                  }}
                >
                  <Phone className="w-12 h-12 text-[#FE9100] opacity-30" />
                </motion.div>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.2), rgba(163, 78, 0, 0.15))',
                        boxShadow: '0 0 20px rgba(254, 145, 0, 0.2)'
                      }}
                    >
                      <Phone className="w-5 h-5 text-[#FE9100]" />
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold text-gray-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      CALL CAPACITY
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-1">
                    <motion.span
                      className="text-5xl font-black"
                      style={{ 
                        fontFamily: 'Orbitron, sans-serif',
                        background: 'linear-gradient(135deg, #e9d7c4, #FE9100)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {callsCount.toLocaleString()}+
                    </motion.span>
                    <span className="text-sm text-gray-500 font-semibold">calls</span>
                  </div>
                  
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Simultane Anrufe parallel ausführen
                  </p>
                </div>
              </motion.div>

              {/* Card 2 - KI-Stimme */}
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative overflow-hidden rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(233, 215, 196, 0.06), rgba(254, 145, 0, 0.03))',
                  border: '1px solid rgba(233, 215, 196, 0.15)',
                  backdropFilter: 'blur(30px)'
                }}
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(233, 215, 196, 0.3), transparent)',
                    filter: 'blur(15px)'
                  }}
                />

                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(233, 215, 196, 0.15), rgba(233, 215, 196, 0.08))',
                      boxShadow: '0 0 15px rgba(233, 215, 196, 0.15)'
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-[#e9d7c4]" />
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-1">
                    <motion.span
                      className="text-3xl font-black"
                      style={{ 
                        fontFamily: 'Orbitron, sans-serif',
                        color: '#e9d7c4'
                      }}
                    >
                      {accuracyCount}%
                    </motion.span>
                  </div>
                  
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Menschlichste KI-Stimme
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Launch Date */}
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative overflow-hidden rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(163, 78, 0, 0.08), rgba(254, 145, 0, 0.05))',
                  border: '1px solid rgba(163, 78, 0, 0.2)',
                  backdropFilter: 'blur(30px)'
                }}
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 360]
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -left-4 -top-4 w-20 h-20 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(163, 78, 0, 0.3), transparent)',
                    filter: 'blur(20px)'
                  }}
                />

                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(163, 78, 0, 0.2), rgba(163, 78, 0, 0.1))',
                      boxShadow: '0 0 15px rgba(163, 78, 0, 0.2)'
                    }}
                  >
                    <Calendar className="w-5 h-5 text-[#a34e00]" />
                  </div>
                  
                  <div className="mb-1">
                    <motion.span
                      className="text-2xl font-black block"
                      style={{ 
                        fontFamily: 'Orbitron, sans-serif',
                        color: '#FE9100'
                      }}
                    >
                      01.01.26
                    </motion.span>
                  </div>
                  
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Offizieller Launch
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-[10px] text-gray-700 leading-relaxed space-y-0.5 pt-6"
            >
              <p>Entwickelt von der Schwarzott Group</p>
              <p>Gebaut in der Schweiz. Betrieben von einem eigenen Sprachmodell.</p>
              <p className="text-[#e9d7c4] font-semibold opacity-60">Präzision. Eleganz. Kraft.</p>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE - Auth Form */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-full max-w-md mx-auto"
          >
            {/* Card Container */}
            <div className="relative">
              {/* Ambient Glow */}
              <motion.div
                className="absolute -inset-[2px] rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                  filter: 'blur(25px)',
                  opacity: 0.3
                }}
                animate={{
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              {/* Main Card */}
              <div
                className="relative rounded-3xl p-8"
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(60px)',
                  WebkitBackdropFilter: 'blur(60px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 50px 100px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                {/* Tab Switcher */}
                <div className="mb-7">
                  <div className="flex gap-1.5 p-1 rounded-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setActiveTab('login')}
                      className={`flex-1 py-2.5 rounded-full font-bold text-xs transition-all ${
                        activeTab === 'login'
                          ? 'text-black'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        background: activeTab === 'login'
                          ? 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)'
                          : 'transparent',
                        boxShadow: activeTab === 'login' ? '0 4px 15px rgba(254, 145, 0, 0.3)' : 'none'
                      }}
                    >
                      SIGN IN
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setActiveTab('register')}
                      className={`flex-1 py-2.5 rounded-full font-bold text-xs transition-all ${
                        activeTab === 'register'
                          ? 'text-black'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        background: activeTab === 'register'
                          ? 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)'
                          : 'transparent',
                        boxShadow: activeTab === 'register' ? '0 4px 15px rgba(254, 145, 0, 0.3)' : 'none'
                      }}
                    >
                      SIGN UP
                    </motion.button>
                  </div>
                </div>

                {/* Forms */}
                <AnimatePresence mode="wait">
                  {activeTab === 'login' ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-6">
                        <h2 className="text-xl font-black mb-1" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                          Welcome Back
                        </h2>
                        <p className="text-xs text-gray-500">
                          Melde dich mit deinen Zugangsdaten an
                        </p>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-400">Username</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                backgroundSize: '200% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                            <Input
                              type="text"
                              value={loginData.username}
                              onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                              placeholder="Dein Username"
                              required
                              className="relative bg-black/70 border-0 text-white rounded-xl px-4 py-3 text-sm"
                              style={{
                                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-400">Passwort</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                backgroundSize: '200% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={loginData.password}
                              onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Passwort eingeben"
                              required
                              className="relative bg-black/70 border-0 text-white rounded-xl px-4 py-3 pr-12 text-sm"
                              style={{
                                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-white/10 rounded-lg"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                            </Button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {loginMutation.isError && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex items-center gap-2 p-2.5 rounded-lg"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                              <p className="text-xs text-red-400 font-medium">
                                Login fehlgeschlagen
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.div className="pt-3">
                          <motion.button
                            type="submit"
                            disabled={loginMutation.isPending}
                            whileHover={{ scale: loginMutation.isPending ? 1 : 1.01 }}
                            whileTap={{ scale: loginMutation.isPending ? 1 : 0.99 }}
                            className="relative w-full py-3.5 rounded-xl font-black text-sm overflow-hidden flex items-center justify-center gap-2"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                              color: '#000000',
                              boxShadow: '0 10px 30px rgba(254, 145, 0, 0.3)',
                              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                SIGNING IN...
                              </>
                            ) : (
                              <>
                                SIGN IN
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </motion.button>
                        </motion.div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* 🔥 PROGRESS INDICATOR */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          {[1, 2, 3, 4].map((step) => (
                            <div key={step} className="flex items-center">
                              <motion.div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{
                                  background: registrationStep >= step 
                                    ? 'linear-gradient(135deg, #e9d7c4, #FE9100)' 
                                    : 'rgba(255, 255, 255, 0.1)',
                                  color: registrationStep >= step ? '#000' : '#666',
                                  fontFamily: 'Orbitron, sans-serif'
                                }}
                                animate={{
                                  scale: registrationStep === step ? [1, 1.1, 1] : 1
                                }}
                                transition={{ duration: 0.3 }}
                              >
                                {step}
                              </motion.div>
                              {step < 4 && (
                                <div 
                                  className="w-12 h-0.5 mx-1" 
                                  style={{
                                    background: registrationStep > step 
                                      ? 'linear-gradient(90deg, #FE9100, #e9d7c4)'
                                      : 'rgba(255, 255, 255, 0.1)'
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 text-center">
                          {registrationStep === 1 && "Persönliche Daten"}
                          {registrationStep === 2 && "Business Intelligence"}
                          {registrationStep === 3 && "AI Konfiguration"}
                          {registrationStep === 4 && "Live Research"}
                        </div>
                      </div>
                      
                      <div className="mb-5">
                        <h2 className="text-xl font-black mb-1" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                          {registrationStep === 1 && "Join Alpha"}
                          {registrationStep === 2 && "Dein Business"}
                          {registrationStep === 3 && "KI personalisieren"}
                          {registrationStep === 4 && "Live Research"}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {registrationStep === 1 && "Du wurdest ausgewählt"}
                          {registrationStep === 2 && "Erzähle uns von deinem Unternehmen"}
                          {registrationStep === 3 && "Konfiguriere deine persönliche KI"}
                          {registrationStep === 4 && "Wir analysieren dein Unternehmen"}
                        </p>
                      </div>

                      <form onSubmit={handleRegister} className="space-y-3.5">
                        {registrationStep === 1 && (
                          <>
                            {/* STEP 1: Personal Information */}
                            <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400">Vorname</Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                  backgroundSize: '200% 100%'
                                }}
                                animate={{
                                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                              />
                              <Input
                                type="text"
                                value={registerData.firstName}
                                onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                                placeholder="Vorname"
                                required
                                className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                style={{
                                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400">Nachname</Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                  backgroundSize: '200% 100%'
                                }}
                                animate={{
                                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                              />
                              <Input
                                type="text"
                                value={registerData.lastName}
                                onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                                placeholder="Nachname"
                                required
                                className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                style={{
                                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-400">Username</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                backgroundSize: '200% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                            <Input
                              type="text"
                              value={registerData.username}
                              onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                              placeholder="Wähle einen Username"
                              required
                              className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                              style={{
                                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-400">E-Mail</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                backgroundSize: '200% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                            <Input
                              type="email"
                              value={registerData.email}
                              onChange={(e) => {
                                setRegisterData(prev => ({ ...prev, email: e.target.value }));
                                validateEmail(e.target.value);
                              }}
                              placeholder="name@example.com"
                              required
                              className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                              style={{
                                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                              }}
                            />
                          </div>
                          <AnimatePresence>
                            {emailError && (
                              <motion.p
                                initial={{ opacity: 0, y: -3 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -3 }}
                                className="text-[10px] text-red-400 flex items-center gap-1"
                              >
                                <AlertCircle className="w-2.5 h-2.5" />
                                {emailError}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-400">Passwort</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                backgroundSize: '200% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={registerData.password}
                              onChange={(e) => {
                                setRegisterData(prev => ({ ...prev, password: e.target.value }));
                                checkPasswordStrength(e.target.value);
                              }}
                              placeholder="Sicheres Passwort"
                              required
                              minLength={6}
                              className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 pr-10 text-xs"
                              style={{
                                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-white/10 rounded"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-3.5 w-3.5 text-gray-500" /> : <Eye className="h-3.5 w-3.5 text-gray-500" />}
                            </Button>
                          </div>
                          
                          <AnimatePresence>
                            {passwordStrength && (
                              <motion.div
                                initial={{ opacity: 0, y: -3 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -3 }}
                                className="flex items-center gap-1.5 text-[10px]"
                              >
                                <div className="flex gap-0.5 flex-1">
                                  {[1, 2, 3].map((i) => (
                                    <div
                                      key={i}
                                      className="h-0.5 flex-1 rounded-full"
                                      style={{
                                        background: i <= (passwordStrength === 'weak' ? 1 : passwordStrength === 'medium' ? 2 : 3)
                                          ? passwordStrength === 'weak' ? '#ef4444' : passwordStrength === 'medium' ? '#f59e0b' : '#22c55e'
                                          : 'rgba(255,255,255,0.1)'
                                      }}
                                    />
                                  ))}
                                </div>
                                <span
                                  className="font-semibold"
                                  style={{
                                    color: passwordStrength === 'weak' ? '#ef4444' : passwordStrength === 'medium' ? '#f59e0b' : '#22c55e'
                                  }}
                                >
                                  {passwordStrength === 'weak' ? 'Schwach' : passwordStrength === 'medium' ? 'Mittel' : 'Stark'}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                          </>
                        )}
                        
                        {registrationStep === 2 && (
                          <>
                            {/* STEP 2: Business Intelligence 🚀 */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-gray-400">Firma</Label>
                              <div className="relative group">
                                <motion.div
                                  className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                  style={{
                                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                    backgroundSize: '200% 100%'
                                  }}
                                  animate={{
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                  }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                />
                                <Input
                                  type="text"
                                  value={registerData.company}
                                  onChange={(e) => setRegisterData(prev => ({ ...prev, company: e.target.value }))}
                                  placeholder="Deine Firma"
                                  required
                                  className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                  style={{
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                  }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-gray-400">Website (optional)</Label>
                              <div className="relative group">
                                <motion.div
                                  className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                  style={{
                                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                    backgroundSize: '200% 100%'
                                  }}
                                  animate={{
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                  }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                />
                                <Input
                                  type="url"
                                  value={registerData.website}
                                  onChange={(e) => setRegisterData(prev => ({ ...prev, website: e.target.value }))}
                                  placeholder="https://www.example.com"
                                  className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                  style={{
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-400">Branche</Label>
                                <div className="relative group">
                                  <motion.div
                                    className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                    style={{
                                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                      backgroundSize: '200% 100%'
                                    }}
                                    animate={{
                                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                  />
                                  <select
                                    value={registerData.industry}
                                    onChange={(e) => setRegisterData(prev => ({ ...prev, industry: e.target.value }))}
                                    required
                                    className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs w-full appearance-none"
                                    style={{
                                      boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                    }}
                                  >
                                    <option value="" className="bg-black">Wähle Branche...</option>
                                    {industries.map(ind => (
                                      <option key={ind.value} value={ind.value} className="bg-black">
                                        {ind.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-400">Position</Label>
                                <div className="relative group">
                                  <motion.div
                                    className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                    style={{
                                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                      backgroundSize: '200% 100%'
                                    }}
                                    animate={{
                                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                  />
                                  <select
                                    value={registerData.role}
                                    onChange={(e) => setRegisterData(prev => ({ ...prev, role: e.target.value }))}
                                    required
                                    className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs w-full appearance-none"
                                    style={{
                                      boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                    }}
                                  >
                                    <option value="" className="bg-black">Deine Rolle...</option>
                                    {roles.map(role => (
                                      <option key={role.value} value={role.value} className="bg-black">
                                        {role.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-gray-400">Telefon (optional)</Label>
                              <div className="relative group">
                                <motion.div
                                  className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                  style={{
                                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                    backgroundSize: '200% 100%'
                                  }}
                                  animate={{
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                  }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                />
                                <Input
                                  type="tel"
                                  value={registerData.phone}
                                  onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))}
                                  placeholder="+49 123 456789"
                                  className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                  style={{
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                  }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                        
                        {registrationStep === 3 && (
                          <>
                            {/* STEP 3: AI Configuration 🤖 */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-gray-400">Primäres Ziel</Label>
                              <div className="relative group">
                                <motion.div
                                  className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                  style={{
                                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                    backgroundSize: '200% 100%'
                                  }}
                                  animate={{
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                  }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                />
                                <select
                                  value={registerData.primaryGoal}
                                  onChange={(e) => setRegisterData(prev => ({ ...prev, primaryGoal: e.target.value }))}
                                  required
                                  className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs w-full appearance-none"
                                  style={{
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                  }}
                                >
                                  <option value="" className="bg-black">Was ist dein Hauptziel?</option>
                                  {primaryGoals.map(goal => (
                                    <option key={goal.value} value={goal.value} className="bg-black">
                                      {goal.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-gray-400">Sprache</Label>
                              <div className="relative group">
                                <motion.div
                                  className="absolute -inset-[1px] rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity"
                                  style={{
                                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                                    backgroundSize: '200% 100%'
                                  }}
                                  animate={{
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                  }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                />
                                <select
                                  value={registerData.language}
                                  onChange={(e) => setRegisterData(prev => ({ ...prev, language: e.target.value }))}
                                  className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs w-full appearance-none"
                                  style={{
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                  }}
                                >
                                  <option value="de" className="bg-black">Deutsch</option>
                                  <option value="en" className="bg-black">English</option>
                                  <option value="fr" className="bg-black">Français</option>
                                </select>
                              </div>
                            </div>

                            {isResearching && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-gradient-to-r from-[#FE9100]/10 to-[#e9d7c4]/10 border border-[#FE9100]/20"
                              >
                                <div className="flex items-center gap-3">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Search className="w-5 h-5 text-[#FE9100]" />
                                  </motion.div>
                                  <div>
                                    <p className="text-xs font-bold text-[#e9d7c4]">KI wird personalisiert...</p>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                      Analysiere {registerData.company} in Echtzeit
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </>
                        )}
                        
                        {registrationStep === 4 && (
                          <>
                            {/* STEP 4: LIVE RESEARCH */}
                            <div className="text-center space-y-4">
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">LIVE INTELLIGENCE RESEARCH</div>
                                <div className="text-2xl font-black">
                                  <motion.span
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{ 
                                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)', 
                                      backgroundClip: 'text', 
                                      WebkitBackgroundClip: 'text', 
                                      WebkitTextFillColor: 'transparent' 
                                    }}
                                  >
                                    AI trainiert auf {registerData.company}
                                  </motion.span>
                                </div>
                              </div>
                              
                              {isResearching ? (
                                <div className="space-y-4 py-4">
                                  {/* Progress Bar */}
                                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-[#e9d7c4] to-[#FE9100]"
                                      initial={{ width: "0%" }}
                                      animate={{ width: `${researchProgress}%` }}
                                      transition={{ duration: 0.5 }}
                                    />
                                  </div>
                                  
                                  {/* Live Status */}
                                  <motion.div
                                    key={researchStatus}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-gray-300 min-h-[60px] flex items-center justify-center"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 justify-center">
                                        <motion.div
                                          animate={{ rotate: 360 }}
                                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                          className="w-4 h-4 border-2 border-[#FE9100] border-t-transparent rounded-full"
                                        />
                                        <span className="font-medium">{researchStatus}</span>
                                      </div>
                                      {researchProgress > 30 && (
                                        <div className="text-xs text-gray-400 text-center">
                                          {researchProgress > 70 ? "🚀 Fast fertig..." : researchProgress > 50 ? "🤖 Deep Learning aktiviert..." : "🔥 Analyse läuft..."}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                  
                                  {/* Research Facts */}
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-black/40 p-2 rounded border border-gray-800">
                                      <div className="text-[#FE9100] font-bold">500+</div>
                                      <div className="text-gray-500">Datenquellen</div>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded border border-gray-800">
                                      <div className="text-[#FE9100] font-bold">LIVE</div>
                                      <div className="text-gray-500">Echtzeit Analyse</div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-300 space-y-2">
                                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                    <p className="text-green-400 font-bold">✓ Research abgeschlossen!</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      AI-Profil wurde erfolgreich erstellt
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="font-semibold text-white">{registerData.firstName} {registerData.lastName}</p>
                                    <p>{registerData.company}</p>
                                    <p className="text-xs text-gray-400">{registerData.email}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <AnimatePresence>
                          {registerMutation.isError && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex items-center gap-2 p-2 rounded-lg"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <p className="text-[10px] text-red-400 font-medium">
                                Registrierung fehlgeschlagen
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="pt-3 space-y-2">
                          {/* Back Button for Step 2 & 3 */}
                          {registrationStep > 1 && (
                            <motion.button
                              type="button"
                              onClick={goToPreviousStep}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="relative w-full py-2.5 rounded-xl font-bold text-xs overflow-hidden flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300"
                              style={{
                                fontFamily: 'Orbitron, sans-serif',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              Zurück
                            </motion.button>
                          )}
                          
                          {/* Submit/Next Button */}
                          <motion.button
                            type="submit"
                            disabled={registerMutation.isPending || isResearching}
                            whileHover={{ scale: (registerMutation.isPending || isResearching) ? 1 : 1.01 }}
                            whileTap={{ scale: (registerMutation.isPending || isResearching) ? 1 : 0.99 }}
                            className="relative w-full py-3.5 rounded-xl font-black text-sm overflow-hidden flex items-center justify-center gap-2"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                              color: '#000000',
                              boxShadow: '0 10px 30px rgba(254, 145, 0, 0.3)',
                              cursor: (registerMutation.isPending || isResearching) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isResearching ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Search className="w-4 h-4" />
                                </motion.div>
                                PERSONALISIERE KI...
                              </>
                            ) : registerMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                CREATING...
                              </>
                            ) : (
                              <>
                                {registrationStep === 1 && "WEITER"}
                                {registrationStep === 2 && "WEITER"}
                                {registrationStep === 3 && "ACCOUNT ERSTELLEN"}
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </motion.button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}

// 🔥 ARAS LANDING PAGE CONTENT - Complete Sections
function ArasLandingContent() {
  return (
    <div className="w-full" style={{ background: '#0A0A0C' }}>
      {/* Section 1 - Hero */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Glow */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 65% 50%, rgba(255, 106, 0, 0.15) 0%, transparent 50%)'
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-8 py-32">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-10"
            >
              <h1 
                className="text-7xl font-black mb-6"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #fff 0%, #ff6a00 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1
                }}
              >
                ARAS AI
              </h1>
              <p className="text-3xl text-white/90 font-light leading-relaxed">
                Die neue Generation der KI-Telefonie.
              </p>
              <p className="text-xl text-white/70 leading-relaxed">
                Natürlich klingende Outbound-Calls, intelligente Chat-Automation und ein Schweizer Sicherheitsstandard, dem Unternehmen vertrauen.
              </p>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#ff6a00]/10 border border-[#ff6a00]/30">
                <motion.div
                  className="w-2 h-2 rounded-full bg-[#ff6a00]"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-sm font-bold text-[#ff6a00]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  ALPHA-PHASE • BEGRENZTE PLÄTZE • LEBENSLANGE PREISE
                </span>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-4 pt-6">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 rounded-lg font-bold text-white"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(135deg, #ff6a00, #ff4500)',
                    boxShadow: '0 0 20px rgba(255, 106, 0, 0.4)'
                  }}
                >
                  → Zugang aktivieren
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, background: 'rgba(255, 106, 0, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 rounded-lg font-bold border-2 border-[#ff6a00] text-[#ff6a00]"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  → Dokumentation öffnen
                </motion.button>
              </div>
            </motion.div>

            {/* Right - Waveform */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative h-96"
            >
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {[...Array(40)].map((_, i) => (
                  <motion.line
                    key={i}
                    x1={i * 10}
                    x2={i * 10}
                    y1={100}
                    y2={100}
                    stroke="#ff6a00"
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    animate={{
                      y2: [100, 100 - Math.random() * 40 - 10, 100 + Math.random() * 40 + 10, 100]
                    }}
                    transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "easeInOut", delay: i * 0.03 }}
                  />
                ))}
              </svg>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2 - Warum ARAS */}
      <section className="relative w-full py-32" style={{ background: '#070709' }}>
        <div className="max-w-7xl mx-auto px-8">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-black mb-20 text-center"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Warum Unternehmen ARAS AI einsetzen
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Menschliche Gesprächsqualität",
                subtitle: "ohne Übertreibung",
                desc: "ARAS AI führt natürliche, kontextbezogene Dialoge. Keine Roboter-Floskeln, keine starren Skripte."
              },
              {
                icon: <Phone className="w-8 h-8" />,
                title: "Skalierbare Telefonie",
                subtitle: "24/7 einsatzbereit",
                desc: "Von Einzelanrufen bis zu parallelen Outbound-Kampagnen. Eine Plattform, die mit deinem Unternehmen mitwächst."
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: "Schweizer Datensicherheit",
                subtitle: "DSGVO-Konformität",
                desc: "Hosting in zertifizierten EU-Rechenzentren + Schweizer Rechtsrahmen. Keine US-Datenübertragung."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="p-8 rounded-2xl"
                style={{
                  background: '#000',
                  border: '2px solid #ff6a00',
                  boxShadow: '0 4px 20px rgba(255, 106, 0, 0.1)'
                }}
              >
                <div className="mb-6 text-[#ff6a00]">{item.icon}</div>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {item.title}
                </h3>
                <p className="text-sm text-[#ff6a00] mb-4 font-semibold">{item.subtitle}</p>
                <p className="text-white/70 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 - Alpha Features */}
      <section className="relative w-full py-32" style={{ background: '#0A0A0C' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Bulletpoints */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-5xl font-black mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Die ARAS Alpha-Version
              </h2>
              <p className="text-xl text-white/90 mb-8">
                voll funktionsfähig, jeden Tag besser.
              </p>
              <p className="text-white/70 leading-relaxed mb-8">
                Wir entwickeln ARAS seit 2021 – jetzt öffnen wir die Plattform erstmals für ausgewählte Unternehmen.
              </p>

              <div className="space-y-4">
                {[
                  "Outbound Calls mit natürlich klingender Stimme",
                  "Chat-Automation (500–10.000 Nachrichten je nach Plan)",
                  "Telefon-Workflows über Make, Zapier oder n8n",
                  "Live-Metriken: Drop-Rate, STT-Qualität, Emotion, Erfolg",
                  "Automatische Gesprächszusammenfassungen",
                  "Erste Version der ARAS Voice Engine"
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6 text-[#ff6a00] flex-shrink-0 mt-1" />
                    <p className="text-white/80">{feature}</p>
                  </motion.div>
                ))}
              </div>

              <div className="pt-8">
                <div className="p-6 rounded-xl bg-[#ff6a00]/10 border border-[#ff6a00]/30">
                  <p className="text-xl font-bold text-[#ff6a00] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Dein Vorteil:
                  </p>
                  <p className="text-white/90">
                    Alle Alpha-Nutzer behalten ihre jetzigen Preise – dauerhaft.
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                className="px-8 py-4 rounded-lg font-bold text-white"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #ff6a00, #ff4500)',
                  boxShadow: '0 0 20px rgba(255, 106, 0, 0.4)'
                }}
              >
                Alpha-Zugang sichern
              </motion.button>
            </motion.div>

            {/* Right - Dashboard Screenshot Placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative h-[600px] rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.1), rgba(0, 0, 0, 0.5))',
                border: '1px solid rgba(255, 106, 0, 0.3)',
                boxShadow: '0 20px 60px rgba(255, 106, 0, 0.2)'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-32 h-32 text-[#ff6a00]/20" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 4 - Pricing */}
      <section className="relative w-full py-32" style={{ background: '#070709' }}>
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-black mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Alpha-Phase: Du behältst deine Preise
            </h2>
            <p className="text-xl text-white/70">
              auch wenn wir 2026 erhöhen.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { name: "Starter", finalPrice: "€1.990", alphaPrice: "€59", calls: "1.000", features: ["Zusammenfassungen", "Voller Plattformzugang"] },
              { name: "Pro", finalPrice: "€4.990", alphaPrice: "€249", calls: "2.500", features: ["200 parallel", "CRM-Integration", "Individuelle Stimme"] },
              { name: "Enterprise", finalPrice: "€19.990", alphaPrice: "€1.990", calls: "30.000", features: ["500 parallel", "Eigene Instanz", "24/7 Onboarding"] }
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="relative p-8 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.05), rgba(0, 0, 0, 0.8))',
                  border: '2px solid #ff6a00',
                  boxShadow: '0 10px 40px rgba(255, 106, 0, 0.15)'
                }}
              >
                <div className="inline-block px-4 py-1 rounded-full bg-[#ff6a00] text-xs font-bold mb-6">
                  FINALER PREIS 2026
                </div>
                <h3 className="text-3xl font-black mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {plan.name}
                </h3>
                <p className="text-4xl font-black text-white/40 line-through mb-2">{plan.finalPrice}</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <p className="text-5xl font-black text-[#ff6a00]">{plan.alphaPrice}</p>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-white/60 mb-6">{plan.calls} Anrufe pro Monat</p>
                <div className="space-y-3">
                  {plan.features.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[#ff6a00]" />
                      <p className="text-sm text-white/70">{f}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center p-10 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.1), transparent)',
              border: '1px solid rgba(255, 106, 0, 0.3)'
            }}
          >
            <p className="text-2xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Warum?
            </p>
            <p className="text-xl text-white/80">
              Wir suchen ehrliches Feedback, keine kurzfristigen Einnahmen.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Section 5 - Platform Features */}
      <section className="relative w-full py-32" style={{ background: '#0A0A0C' }}>
        <div className="max-w-7xl mx-auto px-8">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-black mb-20 text-center"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Was ARAS AI heute kann
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Left - Features */}
            <div className="space-y-8">
              {[
                { title: "Outbound Telefonie", items: ["bis 500 parallele Calls", "menschliche Stimme (ARAS Voice)", "Einwandbehandlung", "Terminbuchung", "Gesprächszusammenfassungen"] },
                { title: "Chat-Automation", items: ["Inbox-Verarbeitung", "Antworten im eigenen Sprachstil", "automatische Kategorisierung", "tägliche Zusammenfassungen"] },
                { title: "Integrationen", items: ["Make", "Zapier", "n8n", "CRM-Sync (Salesforce, HubSpot, Bitrix24)"] },
                { title: "Compliance", items: ["DSGVO", "Schweizer Datenschutz", "EU-Rechenzentren", "Protokollierung & Audit Trails"] }
              ].map((category, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="mb-4">
                    <div className="h-px w-12 bg-[#ff6a00] mb-3" />
                    <h3 className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {category.title}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-white/70">
                        <ArrowRight className="w-4 h-4 text-[#ff6a00]" />
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Right - Demo Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative h-[700px] rounded-2xl p-8 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.05), rgba(0, 0, 0, 0.8))',
                border: '1px solid rgba(255, 106, 0, 0.3)',
                boxShadow: '0 0 60px rgba(255, 106, 0, 0.3)'
              }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Phone className="w-24 h-24 text-[#ff6a00] mx-auto mb-6" />
                </motion.div>
                <p className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Call läuft...
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 6 - Call Flow */}
      <section className="relative w-full py-32" style={{ background: '#070709' }}>
        <div className="max-w-5xl mx-auto px-8">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-black mb-20 text-center"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            So telefoniert ARAS AI für dich
          </motion.h2>

          <div className="space-y-16">
            {[
              { step: "1", title: "Du gibst einen Auftrag ein", desc: "„Ruf alle Leads aus der Kampagne X an und qualifiziere sie nach Y.“" },
              { step: "2", title: "ARAS analysiert Kontext & Daten", desc: "System erkennt Branche, Position, CRM-Einträge, Priorität." },
              { step: "3", title: "Der Anruf startet automatisch", desc: "Natürlich klingende Stimme, dynamischer Dialog, Einwandbehandlung." },
              { step: "4", title: "Ergebnis in Sekunden", desc: "Gesprächszusammenfassung • Gesprächston • Empfehlung für nächste Schritte" }
            ].map((stage, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex items-start gap-8"
              >
                <div 
                  className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #ff6a00, #ff4500)',
                    fontFamily: 'Orbitron, sans-serif',
                    boxShadow: '0 0 30px rgba(255, 106, 0, 0.4)'
                  }}
                >
                  {stage.step}
                </div>
                <div className="flex-1 pt-3">
                  <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {stage.title}
                  </h3>
                  <p className="text-lg text-white/70">{stage.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 - Compliance */}
      <section className="relative w-full py-32" style={{ background: '#0A0A0C' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div 
            className="p-12 rounded-2xl"
            style={{
              background: '#000',
              borderTop: '3px solid #ff6a00'
            }}
          >
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl font-black mb-6 text-center"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Warum ARAS AI für Compliance-Abteilungen akzeptabel ist
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xl text-center text-white/70 mb-16 max-w-4xl mx-auto"
            >
              ARAS AI wird vollständig durch eine Schweizer Aktiengesellschaft betrieben. Alle Daten werden in zertifizierten europäischen Rechenzentren verarbeitet.
            </motion.p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "DSGVO-konform", desc: "Datensparsamkeit, Zweckbindung, Löschkonzept." },
                { title: "Swiss Data Hosting", desc: "ISO-27001 • SOC2 • End-to-End verschlüsselt." },
                { title: "Keine US-Datenübertragung", desc: "Kein Transfer in amerikanische Clouds (Schrems II)." },
                { title: "Revisionssichere Protokollierung", desc: "Zugriffe, Anrufe, Ereignisse – alles dokumentiert." },
                { title: "Individuelles Einwilligungs-Management", desc: "Auf Wunsch mit Opt-in-Hinweis & Gesprächsmarkierung." }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-xl bg-white/5 border border-white/10"
                >
                  <h3 className="text-xl font-bold mb-3 text-[#ff6a00]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {item.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 - Final CTA */}
      <section className="relative w-full py-32" style={{ background: '#070709' }}>
        <div className="max-w-5xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <h2 
              className="text-6xl font-black mb-8"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #fff, #ff6a00)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Teste ARAS AI jetzt in der Alpha
            </h2>
            <p className="text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Sichere dir lebenslange Early-Access-Preise.
            </p>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Echte Technologie, reale Telefonate, sofort einsetzbar.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-6 rounded-xl font-black text-xl text-white mt-8"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #ff6a00, #ff4500)',
                boxShadow: '0 0 40px rgba(255, 106, 0, 0.5)'
              }}
            >
              → JETZT ALPHA-ZUGANG SICHERN
            </motion.button>

            <p className="text-sm text-white/40 mt-8">
              Begrenzte Plätze • Lebenslange Preise • Keine Vertragsbindung
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// 🚀 ARAS AI HERO SECTION - Ultra Premium Design
export function ArasHeroSection() {
  const [currentText, setCurrentText] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [cursorBlink, setCursorBlink] = useState(true);
  const [particleCount] = useState(8);
  
  const typewriterTexts = [
    "a Software",
    "a Token", 
    "an Agent",
    "an Ecosystem",
    "a Revolution"
  ];

  // Typewriter Effect
  useEffect(() => {
    const currentWord = typewriterTexts[currentText];
    const typingSpeed = isDeleting ? 50 : 100;
    
    const timer = setTimeout(() => {
      if (!isDeleting && displayedText === currentWord) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (!isDeleting) {
        setDisplayedText(currentWord.substring(0, displayedText.length + 1));
      } else if (displayedText.length > 0) {
        setDisplayedText(currentWord.substring(0, displayedText.length - 1));
      } else {
        setIsDeleting(false);
        setCurrentText((prev) => (prev + 1) % typewriterTexts.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentText]);

  // Cursor Blink
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorBlink(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: '#0f0f0f' }}>
      {/* Radial Glow Background */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at 65% 75%, rgba(254, 145, 0, 0.2) 0%, transparent 50%)',
          filter: 'blur(100px)'
        }}
      />

      {/* Subtle Particles */}
      <div className="absolute inset-0">
        {[...Array(particleCount)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: i % 2 === 0 ? '#FE9100' : '#e9d7c4',
              opacity: 0.3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              x: [0, Math.random() * 50 - 25, 0],
              y: [0, Math.random() * 50 - 25, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          />
        ))}
      </div>

      {/* Main Container with Animated Border */}
      <div className="relative mx-auto max-w-[1600px] px-[180px] py-[120px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative rounded-lg p-[1px]"
          style={{
            background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
            backgroundSize: '400% 100%'
          }}
        >
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
              backgroundSize: '400% 100%',
              filter: 'blur(1px)'
            }}
          />

          <div className="relative rounded-lg" style={{ background: '#0f0f0f' }}>
            <div className="grid grid-cols-2 gap-20 items-center px-16 py-20">
              
              {/* Left Content */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="space-y-8"
              >
                {/* Main Headline with Gold Gradient */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <h1 
                    className="font-black mb-4"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                      fontWeight: 700,
                      lineHeight: 1.1,
                      background: 'linear-gradient(135deg, #e9d7c4 0%, #FE9100 50%, #a34e00 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundSize: '200% 200%',
                      animation: 'gradientShift 8s ease infinite',
                      textShadow: '0 0 30px rgba(254, 145, 0, 0.2)'
                    }}
                  >
                    ARAS AI
                  </h1>
                  <style dangerouslySetInnerHTML={{
                    __html: `
                      @keyframes gradientShift {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                      }
                    `
                  }} />
                  <p className="text-2xl text-white/90 font-light mt-2">
                    The New Standard of Intelligent Communication
                  </p>
                </motion.div>

                {/* Typewriter Subheadline */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="h-12 flex items-center"
                >
                  <span
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: '1.25rem',
                      fontWeight: 500,
                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    ARAS is {displayedText}
                    <span 
                      className="inline-block ml-1 w-[3px] h-[24px] bg-[#FE9100] align-middle"
                      style={{ opacity: cursorBlink ? 1 : 0 }}
                    />
                  </span>
                </motion.div>

                {/* Main Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="space-y-4 text-white/80 leading-relaxed"
                >
                  <p className="text-lg">
                    Natürlich klingende KI-Telefonate, präzise Automation und Schweizer Datensicherheit.
                  </p>
                  <p className="text-base text-white/60">
                    Eine Plattform für Unternehmen, die modern skalieren – nicht experimentieren.
                  </p>
                </motion.div>

                {/* Alpha Phase Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, type: 'spring' }}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-full"
                  style={{
                    background: 'rgba(254, 145, 0, 0.1)',
                    border: '1px solid rgba(254, 145, 0, 0.3)'
                  }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#FE9100]"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm font-bold text-[#FE9100]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    ALPHA PHASE • LEBENSLANGE BESTPREISE
                  </span>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                  className="flex gap-4 pt-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-9 py-4 rounded-lg font-semibold text-white transition-all"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(90deg, #FE9100, #a34e00)',
                      border: '1px solid #FE9100',
                      boxShadow: '0 0 12px rgba(254, 145, 0, 0.35)',
                      letterSpacing: '1px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(254, 145, 0, 0.45)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(254, 145, 0, 0.35)';
                    }}
                  >
                    → Zugang aktivieren
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-9 py-4 rounded-lg font-semibold text-[#FE9100] transition-all"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'transparent',
                      border: '1px solid #FE9100'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(254, 145, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    → Funktionen ansehen
                  </motion.button>
                </motion.div>

                {/* Value Statement */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="pt-8 space-y-2"
                >
                  <p className="text-sm text-white/50 leading-relaxed">
                    ARAS AI führt echte Outbound-Gespräche, qualifiziert Leads, liest E-Mails,<br/>
                    versteht Kontext und verbindet sich nahtlos mit CRM- und Automatisierungs-Systemen.
                  </p>
                  <p className="text-xs text-[#FE9100]/60 font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Jetzt in der Alpha-Phase. Early Access. Dauerhaft günstige Preise.
                  </p>
                </motion.div>
              </motion.div>

              {/* Right Side - Animated Waveform */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="relative h-[500px] flex items-center justify-center"
              >
                {/* Waveform Container */}
                <div className="relative w-full h-64">
                  {/* Voice Active Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full" 
                      style={{ 
                        border: '1px solid rgba(254, 145, 0, 0.3)',
                        background: 'rgba(254, 145, 0, 0.05)'
                      }}
                    >
                      <motion.div
                        className="w-2 h-2 rounded-full bg-[#FE9100]"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [1, 0.6, 1]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-xs font-bold text-[#FE9100] uppercase tracking-wider" 
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        VOICE ACTIVE
                      </span>
                    </div>
                  </motion.div>

                  {/* Animated Waveform Lines */}
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    {[...Array(40)].map((_, i) => (
                      <motion.line
                        key={i}
                        x1={i * 10}
                        x2={i * 10}
                        y1={100}
                        y2={100}
                        stroke={i % 3 === 0 ? '#FE9100' : '#e9d7c4'}
                        strokeWidth="2"
                        strokeOpacity={i % 3 === 0 ? 0.6 : 0.3}
                        animate={{
                          y2: [
                            100,
                            100 - Math.random() * 60 - 20,
                            100 + Math.random() * 60 + 20,
                            100
                          ]
                        }}
                        transition={{
                          duration: 2 + Math.random() * 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.05
                        }}
                      />
                    ))}
                  </svg>

                  {/* Pulse Effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(254, 145, 0, 0.1) 0%, transparent 70%)',
                      filter: 'blur(40px)'
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fine horizontal lines animation */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-full h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, #FE9100, transparent)',
              top: `${30 + i * 20}%`
            }}
            animate={{
              x: [-200, 200, -200]
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
    </div>
  );
}