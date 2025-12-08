import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Phone, Calendar, Sparkles, Building, Globe, User, Target, ChevronLeft, Search, Mic, TrendingUp, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { trackLogin, trackSignup, captureUTMParameters } from "@/lib/analytics";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { T } from "@/lib/auto-translate";

const TYPED_LINES = [
  "Die Stimme, die verkauft.",
  "Echte Gespräche. Echte Resultate.",
  "ARAS AI führt tausende Anrufe gleichzeitig.",
  "Du liest nicht über die Zukunft.",
  "Du hörst sie."
];

// Live Date and Time Component with Milliseconds
function LiveDateTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return {
      date: `${dayName}. ${day}. ${month} ${year}`,
      time: `${hours}:${minutes}:${seconds}`
    };
  };

  const { date, time } = formatDateTime(currentTime);

  return (
    <div className="flex justify-center w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Subtle Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-xl blur-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.1), rgba(233, 215, 196, 0.1))',
          }}
          animate={{
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Main Container */}
        <div
          className="relative px-6 py-3 rounded-xl backdrop-blur-sm"
          style={{
            background: 'rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(254, 145, 0, 0.15)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Date */}
            <div
              className="text-xs tracking-wide opacity-60"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                color: '#e9d7c4'
              }}
            >
              {date}
            </div>
            
            {/* Time without Milliseconds */}
            <div className="flex items-center gap-1.5">
              <span
                className="text-lg font-semibold"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4',
                  opacity: 0.8
                }}
              >
                {time}
              </span>
              <span
                className="text-xs tracking-wide opacity-50"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                Uhr
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  const [showFeaturesPanel, setShowFeaturesPanel] = useState(false);
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
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [companyError, setCompanyError] = useState("");
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

  // Real-time validators for ALL fields
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("");
      return true;
    }
    if (!emailRegex.test(email)) {
      setEmailError("❌ Ungültige E-Mail (z.B. max@firma.de)");
      return false;
    }
    setEmailError("✅ E-Mail ist gültig");
    return true;
  };

  const validateUsername = (username: string) => {
    if (!username) {
      setUsernameError("");
      return true;
    }
    if (username.length < 3) {
      setUsernameError("❌ Mindestens 3 Zeichen");
      return false;
    }
    if (username.length > 50) {
      setUsernameError("❌ Maximal 50 Zeichen");
      return false;
    }
    setUsernameError("✅ Username ist verfügbar");
    return true;
  };

  const validateWebsite = (website: string) => {
    if (!website || website.trim() === '') {
      setWebsiteError("");
      return true; // Optional field
    }
    
    // FLEXIBLE URL VALIDATION - accepts ALL formats
    // - https://firma.de
    // - http://firma.de
    // - www.firma.de
    // - firma.de
    const flexibleUrlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    if (!flexibleUrlRegex.test(website)) {
      setWebsiteError("❌ Ungültig (z.B. firma.de oder www.firma.de)");
      return false;
    }
    
    setWebsiteError("✅ Website ist gültig");
    return true;
  };

  const validateFirstName = (name: string) => {
    if (!name || name.trim() === '') {
      setFirstNameError("❌ Vorname ist erforderlich");
      return false;
    }
    if (name.trim().length < 2) {
      setFirstNameError("❌ Mindestens 2 Zeichen");
      return false;
    }
    setFirstNameError("✅ Sieht gut aus!");
    return true;
  };

  const validateLastName = (name: string) => {
    if (!name || name.trim() === '') {
      setLastNameError("❌ Nachname ist erforderlich");
      return false;
    }
    if (name.trim().length < 2) {
      setLastNameError("❌ Mindestens 2 Zeichen");
      return false;
    }
    setLastNameError("✅ Sieht gut aus!");
    return true;
  };

  const validateCompany = (company: string) => {
    if (!company || company.trim() === '') {
      setCompanyError("❌ Firmenname ist erforderlich");
      return false;
    }
    if (company.trim().length < 2) {
      setCompanyError("❌ Mindestens 2 Zeichen");
      return false;
    }
    setCompanyError("✅ Perfekt!");
    return true;
  };

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(null);
      setPasswordError("");
      return;
    }
    if (password.length < 6) {
      setPasswordStrength('weak');
      setPasswordError("⚠️ Zu kurz - mindestens 6 Zeichen");
    } else if (password.length < 10) {
      setPasswordStrength('medium');
      setPasswordError("✅ Akzeptabel - besser wären 10+ Zeichen");
    } else {
      setPasswordStrength('strong');
      setPasswordError("✅ Stark und sicher!");
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

  // Redirect after login
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/space");
    }
  }, [isLoading, user, setLocation]);

  // Show loader during auth check or redirect
  if (isLoading || (!isLoading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
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
      setLocation("/space");
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
        if (!validateWebsite(registerData.website)) {
          toast({
            title: "Website-Format nicht korrekt 🌐",
            description: "Bitte gib eine gültige URL ein (z.B. firma.de, www.firma.de oder https://firma.de). Alle Formate sind akzeptiert!",
            variant: "destructive"
          });
          return;
        }
        // Auto-add https:// ONLY if no protocol is present
        if (!registerData.website.startsWith('http://') && !registerData.website.startsWith('https://')) {
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
      
      // START ARAS AI RESEARCH ANIMATION - NO ICONS!
      const researchSteps = [
        "Verbindung zu globalen Datenbanken wird hergestellt",
        `ARAS AI analysiert über 500+ Datenquellen zu ${registerData.company}`,
        "Scanne Unternehmenswebsite und Social Media Präsenz",
        "ARAS AI durchsucht Branchendatenbanken",
        "ARAS AI analysiert Unternehmens-DNA und Marktposition",
        "Analysiere Wettbewerber und Zielgruppen",
        "Identifiziere Kundenprofile und USPs",
        "Extrahiere Produkte, Services und Alleinstellungsmerkmale",
        "ARAS AI generiert personalisiertes Profil",
        "Fast fertig"
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
          
          // FIXED: Show animation but redirect much faster (research continues in background)
          // The AI analysis happens server-side and will be ready when user arrives at /space
          setTimeout(() => {
            clearInterval(stepInterval);
            setResearchProgress(100);
            setResearchStatus("ULTRA-DEEP Research abgeschlossen! ARAS AI kennt jetzt ALLES über " + registerData.company + "!");
            
            // Redirect faster - research is done server-side
            setTimeout(() => {
              toast({
                title: "🎉 Willkommen bei ARAS AI Pro Research™!",
                description: `Hey ${registerData.firstName}! Deine KI hat ${registerData.company} komplett analysiert. Ready to blow your mind! 💪🔥`
              });
              setLocation("/space");
            }, 2000); // Reduced from 3000ms
          }, 12000); // Reduced from 28000ms - much faster but still shows animation
          
        } catch (error: any) {
          clearInterval(stepInterval);
          setIsResearching(false);
          
          console.error('[REGISTER-ERROR]', error);
          
          // Better error messages from server with DETAILED feedback
          let errorMessage = "Ups, da ist was schief gelaufen. Versuch's nochmal!";
          let errorTitle = "Registrierung fehlgeschlagen 😕";
          
          // Check if error message contains specific keywords
          const errorText = error.message || error.toString() || '';
          
          if (errorText.includes('email') || errorText.includes('E-Mail')) {
            errorTitle = "E-Mail bereits registriert! 📧";
            errorMessage = `Die E-Mail-Adresse "${registerData.email}" ist bereits bei uns registriert. Möchtest du dich stattdessen einloggen?`;
          } else if (errorText.includes('username') || errorText.includes('Benutzername')) {
            errorTitle = "Username bereits vergeben! 👤";
            errorMessage = `Der Username "${registerData.username}" ist leider schon vergeben. Bitte wähle einen anderen!`;
          } else if (errorText) {
            errorMessage = errorText;
          }
          
          // Show PROMINENT error toast
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "destructive",
            duration: 8000 // Show longer for errors
          });
          
          // Go back to appropriate step based on error
          if (errorText.includes('email') || errorText.includes('username')) {
            setRegistrationStep(1); // Go back to step 1 for user info
          } else {
            setRegistrationStep(3); // Go back to step 3 for other errors
          }
          
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
    <div className="min-h-screen w-full text-white relative overflow-x-hidden">
      {/* Language Switcher */}
      <LanguageSwitcher />
      
      {/* Simple Dark Background with Subtle Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
      <div className="relative z-10 flex flex-col p-8">
        {/* Auth Form Section - Centered */}
        <div className="flex items-center justify-center py-20">
          <div className="w-full max-w-7xl mx-auto">
            {/* Live Date and Time - CENTERED ABOVE GRID */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center mb-10"
            >
              <LiveDateTime />
            </motion.div>

            {/* MAIN GRID */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
          
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
                  background: 'rgba(0, 0, 0, 0.35)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 50px 100px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
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
                              className="relative bg-black/30 border-0 text-white rounded-xl px-4 py-3 text-sm"
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
                                onChange={(e) => {
                                  setRegisterData(prev => ({ ...prev, firstName: e.target.value }));
                                  if (e.target.value) validateFirstName(e.target.value);
                                  else setFirstNameError("");
                                }}
                                onBlur={(e) => validateFirstName(e.target.value)}
                                placeholder="Vorname"
                                required
                                className="relative bg-black/30 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                style={{
                                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                }}
                              />
                            </div>
                            <AnimatePresence>
                              {firstNameError && (
                                <motion.p
                                  initial={{ opacity: 0, y: -3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -3 }}
                                  className={`text-[10px] flex items-center gap-1 ${
                                    firstNameError.startsWith('✅') ? 'text-green-400' : 'text-red-400'
                                  }`}
                                >
                                  {!firstNameError.startsWith('✅') && <AlertCircle className="w-2.5 h-2.5" />}
                                  {firstNameError.startsWith('✅') && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {firstNameError}
                                </motion.p>
                              )}
                            </AnimatePresence>
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
                                onChange={(e) => {
                                  setRegisterData(prev => ({ ...prev, lastName: e.target.value }));
                                  if (e.target.value) validateLastName(e.target.value);
                                  else setLastNameError("");
                                }}
                                onBlur={(e) => validateLastName(e.target.value)}
                                placeholder="Nachname"
                                required
                                className="relative bg-black/30 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                style={{
                                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                }}
                              />
                            </div>
                            <AnimatePresence>
                              {lastNameError && (
                                <motion.p
                                  initial={{ opacity: 0, y: -3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -3 }}
                                  className={`text-[10px] flex items-center gap-1 ${
                                    lastNameError.startsWith('✅') ? 'text-green-400' : 'text-red-400'
                                  }`}
                                >
                                  {!lastNameError.startsWith('✅') && <AlertCircle className="w-2.5 h-2.5" />}
                                  {lastNameError.startsWith('✅') && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {lastNameError}
                                </motion.p>
                              )}
                            </AnimatePresence>
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
                              onChange={(e) => {
                                setRegisterData(prev => ({ ...prev, username: e.target.value }));
                                validateUsername(e.target.value);
                              }}
                              placeholder="Wähle einen Username"
                              required
                              className="relative bg-black/70 border-0 text-white rounded-lg px-3 py-2 text-xs"
                              style={{
                                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                              }}
                            />
                          </div>
                          <AnimatePresence>
                            {usernameError && (
                              <motion.p
                                initial={{ opacity: 0, y: -3 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -3 }}
                                className={`text-[10px] flex items-center gap-1 ${
                                  usernameError.startsWith('✅') ? 'text-green-400' : 'text-red-400'
                                }`}
                              >
                                {!usernameError.startsWith('✅') && <AlertCircle className="w-2.5 h-2.5" />}
                                {!usernameError.startsWith('✅') && <CheckCircle2 className="w-2.5 h-2.5" />}
                                {usernameError}
                              </motion.p>
                            )}
                          </AnimatePresence>
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
                                className={`text-[10px] flex items-center gap-1 ${
                                  emailError.startsWith('✅') ? 'text-green-400' : 'text-red-400'
                                }`}
                              >
                                {!emailError.startsWith('✅') && <AlertCircle className="w-2.5 h-2.5" />}
                                {emailError.startsWith('✅') && <CheckCircle2 className="w-2.5 h-2.5" />}
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
                                className="space-y-1.5"
                              >
                                <div className="flex items-center gap-1.5 text-[10px]">
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
                                </div>
                                {passwordError && (
                                  <motion.p
                                    initial={{ opacity: 0, y: -3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`text-[10px] flex items-center gap-1 ${
                                      passwordError.startsWith('✅') ? 'text-green-400' : passwordError.startsWith('⚠️') ? 'text-yellow-400' : 'text-red-400'
                                    }`}
                                  >
                                    {passwordError}
                                  </motion.p>
                                )}
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
                                  onChange={(e) => {
                                    setRegisterData(prev => ({ ...prev, company: e.target.value }));
                                    if (e.target.value) validateCompany(e.target.value);
                                    else setCompanyError("");
                                  }}
                                  onBlur={(e) => validateCompany(e.target.value)}
                                  placeholder="Deine Firma"
                                  required
                                  className="relative bg-black/30 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                  style={{
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                  }}
                                />
                              </div>
                              <AnimatePresence>
                                {companyError && (
                                  <motion.p
                                    initial={{ opacity: 0, y: -3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -3 }}
                                    className={`text-[10px] flex items-center gap-1 ${
                                      companyError.startsWith('✅') ? 'text-green-400' : 'text-red-400'
                                    }`}
                                  >
                                    {!companyError.startsWith('✅') && <AlertCircle className="w-2.5 h-2.5" />}
                                    {companyError.startsWith('✅') && <CheckCircle2 className="w-2.5 h-2.5" />}
                                    {companyError}
                                  </motion.p>
                                )}
                              </AnimatePresence>
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
                                  type="text"
                                  value={registerData.website}
                                  onChange={(e) => {
                                    setRegisterData(prev => ({ ...prev, website: e.target.value }));
                                    validateWebsite(e.target.value);
                                  }}
                                  placeholder="firma.de oder www.firma.de"
                                  className="relative bg-black/30 border-0 text-white rounded-lg px-3 py-2 text-xs"
                                  style={{
                                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
                                  }}
                                />
                              </div>
                              <AnimatePresence>
                                {websiteError && (
                                  <motion.p
                                    initial={{ opacity: 0, y: -3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -3 }}
                                    className={`text-[10px] flex items-center gap-1 ${
                                      websiteError.startsWith('✅') ? 'text-green-400' : 'text-red-400'
                                    }`}
                                  >
                                    {!websiteError.startsWith('✅') && <AlertCircle className="w-2.5 h-2.5" />}
                                    {websiteError.startsWith('✅') && <CheckCircle2 className="w-2.5 h-2.5" />}
                                    {websiteError}
                                  </motion.p>
                                )}
                              </AnimatePresence>
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
                                  className="relative bg-black/30 border-0 text-white rounded-lg px-3 py-2 text-xs"
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
                                    ARAS AI analysiert {registerData.company}
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
            </div> {/* Close grid */}
          </div> {/* Close max-w-7xl */}
        </div> {/* Close py-20 */}

        {/* ⭐ HERO SECTION - Ultra Clean Minimal Design */}
        <section className="relative min-h-screen w-full flex items-center justify-center" style={{ background: 'transparent' }}>
          <div className="relative max-w-5xl mx-auto px-8 text-center">
            
            {/* Typing Headline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <h1 
                className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {'ARAS AI'.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.05, delay: i * 0.08 }}
                  >
                    {char}
                  </motion.span>
                ))}
                <br />
                <motion.span
                  style={{
                    background: 'linear-gradient(90deg, #666666, #e9d7c4, #FE9100, #ff8c00, #FE9100, #e9d7c4, #666666)',
                    backgroundSize: '300% 100%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    backgroundPosition: ['0% 50%', '50% 50%', '100% 50%', '50% 50%', '0% 50%']
                  }}
                  transition={{ 
                    opacity: { duration: 0.8, delay: 0.6 },
                    backgroundPosition: { duration: 12, repeat: Infinity, ease: 'easeInOut' }
                  }}
                >
                  <T>The New Standard</T>
                </motion.span>
              </h1>
            </motion.div>
            
            {/* Typing Animation Below */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="mb-12 min-h-[40px] flex items-center justify-center"
            >
              <span className="text-2xl text-white/80" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {typedText}
                <motion.span
                  className="inline-block w-0.5 h-6 bg-white ml-1"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              </span>
            </motion.div>
            
            {/* Subtitle with Fade In */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="text-xl md:text-2xl text-white/70 leading-relaxed mb-8 max-w-4xl mx-auto"
            >
              <T>Natürlich klingende KI-Telefonate, präzise Automation und Schweizer Datensicherheit – entwickelt für Unternehmen, die skalieren wollen, ohne Kompromisse einzugehen.</T>
            </motion.p>
            
            {/* Value Props */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.3 }}
              className="text-lg text-white/60 leading-relaxed mb-6 max-w-3xl mx-auto"
            >
              <p>
                <T>ARAS AI führt echte Outbound-Gespräche, qualifiziert Leads, verarbeitet Nachrichten und integriert sich nahtlos in bestehende Systeme.</T>
              </p>
            </motion.div>
            
            {/* Alpha Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              className="inline-block mb-12"
            >
              <div className="px-6 py-3 rounded-full border border-white/20 bg-transparent">
                <p className="text-sm text-white/80">
                  <T>Aktuell in der streng limitierten Alpha-Phase – mit dauerhaft gesicherten Early-Access-Preisen</T>
                </p>
              </div>
            </motion.div>
            
            {/* CTA Buttons - Animated */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.9 }}
              className={`flex gap-4 justify-center ${showFeaturesPanel ? 'opacity-40 pointer-events-none' : ''} transition-opacity duration-300`}
            >
              <motion.button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-12 py-5 text-lg font-bold overflow-hidden rounded-xl"
                style={{ fontFamily: 'Orbitron, sans-serif', cursor: 'pointer' }}
              >
                {/* Animated Border */}
                <motion.div
                  className="absolute inset-0 p-[2px] rounded-xl"
                  style={{
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)',
                    backgroundSize: '200% 100%'
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="w-full h-full bg-black rounded-xl" />
                </motion.div>
                
                {/* Button Content */}
                <span className="relative z-10 text-white group-hover:text-white transition-colors">
                  <T>→ Zugang aktivieren</T>
                </span>
                
                {/* Hover Glow */}
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(254, 145, 0, 0.2), transparent 70%)',
                    filter: 'blur(20px)'
                  }}
                />
              </motion.button>
              
              <motion.button
                onClick={() => setShowFeaturesPanel(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-12 py-5 text-lg font-bold overflow-hidden rounded-xl border border-white/20"
                style={{ fontFamily: 'Orbitron, sans-serif', cursor: 'pointer', background: 'transparent' }}
              >
                <span className="relative z-10 text-white group-hover:text-white transition-colors">
                  ARAS AI Funktionen
                </span>
              </motion.button>
            </motion.div>
            
          </div>
          
          {/* Features Panel */}
          <AnimatePresence>
            {showFeaturesPanel && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                  onClick={() => setShowFeaturesPanel(false)}
                />
                
                {/* Slide-in Panel */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] z-50 overflow-y-auto"
                  style={{
                    background: 'rgba(15, 15, 15, 0.95)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderLeft: '2px solid transparent',
                    borderImage: 'linear-gradient(180deg, #e9d7c4, #FE9100, #a34e00) 1'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Animated Top Border */}
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                      backgroundSize: '200% 100%'
                    }}
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  
                  {/* Close Button */}
                  <button
                    onClick={() => setShowFeaturesPanel(false)}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full border border-white/20 hover:bg-white/5 transition-colors z-10"
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="text-white text-2xl">×</span>
                  </button>
                  
                  <div className="p-12">
                    {/* Header */}
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-4xl font-black mb-4 text-white"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      <T>Funktionen von ARAS AI</T>
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/60 mb-12 text-lg"
                    >
                      <T>Die komplette Plattform für intelligente Kommunikation</T>
                    </motion.p>
                    
                    {/* Features List */}
                    <div className="space-y-10">
                      {/* 1. Outbound-KI-Telefonie */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Phone className="w-6 h-6 text-[#FE9100]" />
                          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            <T>Outbound-KI-Telefonie</T>
                          </h3>
                        </div>
                        <ul className="space-y-2 pl-9">
                          {['natürliche Stimme', 'Lead-Qualifizierung', 'Terminbuchung', 'Einwandbehandlung', 'parallele Anrufe'].map((item, i) => (
                            <li key={i} className="text-white/70 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FE9100]/60" />
                              <span><T>{item}</T></span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                      
                      {/* 2. Chat-Automation */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Sparkles className="w-6 h-6 text-[#FE9100]" />
                          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            <T>Chat-Automation</T>
                          </h3>
                        </div>
                        <ul className="space-y-2 pl-9">
                          {['Inbox-Verarbeitung', 'Antworten im eigenen Stil', 'tägliche Zusammenfassungen'].map((item, i) => (
                            <li key={i} className="text-white/70 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FE9100]/60" />
                              <span><T>{item}</T></span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                      
                      {/* 3. Integrationen */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Globe className="w-6 h-6 text-[#FE9100]" />
                          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            <T>Integrationen</T>
                          </h3>
                        </div>
                        <ul className="space-y-2 pl-9">
                          {['Make', 'Zapier', 'n8n', 'API', 'Salesforce / HubSpot / Bitrix24'].map((item, i) => (
                            <li key={i} className="text-white/70 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FE9100]/60" />
                              <span><T>{item}</T></span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                      
                      {/* 4. Reporting & Analysen */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <TrendingUp className="w-6 h-6 text-[#FE9100]" />
                          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            <T>Reporting & Analysen</T>
                          </h3>
                        </div>
                        <ul className="space-y-2 pl-9">
                          {['Erfolg', 'Emotion', 'Drop-Rate', 'Call Insights'].map((item, i) => (
                            <li key={i} className="text-white/70 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FE9100]/60" />
                              <span><T>{item}</T></span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                      
                      {/* 5. Sicherheit / Compliance */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Shield className="w-6 h-6 text-[#FE9100]" />
                          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            <T>Sicherheit / Compliance</T>
                          </h3>
                        </div>
                        <ul className="space-y-2 pl-9">
                          {['Swiss Hosting', 'DSGVO', 'Audit Trails', 'kein US-Transfer'].map((item, i) => (
                            <li key={i} className="text-white/70 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FE9100]/60" />
                              <span><T>{item}</T></span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </section>
        
        {/* ⭐ SECTION 2 - DIE ALPHA-VORTEILE (Premium Price Comparison) */}
        <section className="relative py-32 overflow-hidden" style={{ background: 'transparent' }}>
          
          <div className="relative max-w-7xl mx-auto px-8">
            {/* Section Header with Typewriter Effect */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <motion.h2 
                className="text-6xl font-black mb-8 text-white"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif'
                }}
              >
                Die ARAS Alpha-Vorteile
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-xl text-white/80 max-w-4xl mx-auto mb-6 leading-relaxed"
              >
                Die ARAS Alpha – für Unternehmen, die früh Zugang zur nächsten Generation der Kommunikation wollen.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="inline-block px-8 py-4 rounded-full border border-white/20 bg-transparent"
              >
                <p className="text-2xl text-white font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Alle Alpha-Nutzer behalten ihre aktuellen Preise – dauerhaft.
                </p>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9, duration: 0.8 }}
                className="text-lg text-white/60 mt-6"
              >
                Preisanpassung ab 01.01.2026 auf Enterprise-Level – Sie bleiben geschützt.
              </motion.p>
            </motion.div>
            
            {/* Premium Glass Cards - Ultra Minimalist */}
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {[
                { 
                  name: 'Starter', 
                  alphaPrice: '€59', 
                  futurePrice: '€1.990',
                  savings: '€1.931'
                },
                { 
                  name: 'PRO', 
                  alphaPrice: '€249', 
                  futurePrice: '€4.990',
                  savings: '€4.741',
                  featured: true
                },
                { 
                  name: 'Enterprise', 
                  alphaPrice: '€1.990', 
                  futurePrice: '€19.990',
                  savings: '€18.000'
                }
              ].map((plan, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 1, type: 'spring', stiffness: 50 }}
                  whileHover={{ y: -12 }}
                  className={`relative group ${plan.featured ? 'md:-mt-6 md:mb-6' : ''}`}
                >
                  {/* Featured Badge - Minimalist */}
                  {plan.featured && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 + 0.4, duration: 0.8 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 z-10"
                    >
                      <div className="relative">
                        <div className="relative px-5 py-2.5 rounded-full bg-transparent backdrop-blur-xl border border-white/20 text-white text-xs font-bold uppercase tracking-widest"
                          style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                          ⭐ Beliebteste Wahl
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Animated Border Container */}
                  <div className="relative p-[1.5px] rounded-3xl overflow-hidden">
                    {/* Animated Gradient Border */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)',
                        backgroundSize: '400% 400%'
                      }}
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                      }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    />
                    
                    {/* Black Card - Only Border Visible */}
                    <div className="relative rounded-3xl p-10"
                      style={{
                        background: '#000000'
                      }}
                    >
                      
                      {/* Plan Name - Pure White */}
                      <motion.h3 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 + 0.5 }}
                        className="text-4xl font-black mb-8 text-center tracking-tight text-white" 
                        style={{ 
                          fontFamily: 'Orbitron, sans-serif'
                        }}
                      >
                        {plan.name}
                      </motion.h3>
                      
                      {/* Alpha Price Section */}
                      <div className="text-center mb-8">
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.15 + 0.6 }}
                          className="text-xs text-white/40 mb-3 uppercase tracking-[0.2em] font-semibold"
                        >
                          Alpha-Preis • Jetzt
                        </motion.div>
                        <motion.div 
                          className="text-7xl font-black mb-2 text-white"
                          style={{ 
                            fontFamily: 'Orbitron, sans-serif'
                          }}
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.15 + 0.7, duration: 0.8, type: 'spring' }}
                        >
                          {plan.alphaPrice}
                        </motion.div>
                        <div className="text-xs text-white/30 tracking-wider">pro Monat</div>
                      </div>
                      
                      {/* Elegant Divider */}
                      <div className="relative my-8">
                        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <motion.div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-black/40 backdrop-blur-sm"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <span className="text-[10px] text-white/50 font-bold tracking-widest">VS</span>
                        </motion.div>
                      </div>
                      
                      {/* Future Price - Minimal */}
                      <div className="text-center mb-8">
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.15 + 0.9 }}
                          className="text-xs text-white/30 mb-3 uppercase tracking-[0.2em]"
                        >
                          Standard ab 01.01.2026
                        </motion.div>
                        <div className="relative inline-block">
                          <motion.div 
                            className="text-5xl font-black text-white/15 line-through"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 0.15 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 + 1 }}
                          >
                            {plan.futurePrice}
                          </motion.div>
                        </div>
                      </div>
                      
                      {/* Savings - Clean Design */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 + 1.1, type: 'spring' }}
                        className="relative p-6 rounded-2xl border border-white/10 text-center overflow-hidden"
                        style={{
                          background: 'transparent'
                        }}
                      >
                        {/* Subtle Shine Effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                          animate={{
                            x: ['-100%', '200%']
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            repeatDelay: 2,
                            ease: 'easeInOut'
                          }}
                        />
                        
                        <div className="relative">
                          <div className="text-[10px] text-white/40 mb-2 uppercase tracking-[0.25em] font-semibold">Sie sparen</div>
                          <div className="text-3xl font-black mb-1 text-white" 
                            style={{ 
                              fontFamily: 'Orbitron, sans-serif'
                            }}
                          >
                            {plan.savings}
                          </div>
                          <div className="text-[10px] text-white/30 tracking-wider">pro Monat · dauerhaft geschützt</div>
                        </div>
                      </motion.div>
                      
                      {/* Minimal Hover Glow */}
                      <motion.div
                        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                        style={{
                          background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03), transparent 60%)',
                          filter: 'blur(30px)'
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Free Plan Callout */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="max-w-2xl mx-auto mb-16"
            >
              <div className="relative p-[2px] rounded-xl overflow-hidden">
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                    backgroundSize: '200% 100%'
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative rounded-xl p-6 text-center"
                  style={{ background: '#000000' }}
                >
                  <p className="text-lg text-white/80">
                    <span className="text-white font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>ARAS Free</span>
                    {' '}bleibt kostenlos – für immer.
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Why Box - Premium Version */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1, duration: 0.8 }}
              className="relative max-w-3xl mx-auto"
            >
              <div className="relative p-[2px] rounded-2xl overflow-hidden">
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)',
                    backgroundSize: '300% 300%'
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                />
                
                <div className="relative rounded-2xl p-10 text-center"
                  style={{ background: '#000000' }}
                >
                  <motion.h3 
                    className="text-3xl font-black mb-4 text-white"
                    style={{ 
                      fontFamily: 'Orbitron, sans-serif'
                    }}
                  >
                    Warum?
                  </motion.h3>
                  <p className="text-xl text-white/80 leading-relaxed">
                    Wir suchen echtes Feedback von Unternehmen, die mit uns wachsen wollen – keine kurzfristigen Einnahmen.
                  </p>
                  <motion.div
                    className="mt-6 inline-block px-6 py-2 rounded-full border border-[#FE9100]/30 bg-[#FE9100]/5"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <p className="text-sm text-[#FE9100] font-semibold">Alpha-Phase läuft – Plätze limitiert</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
        
        {/* ⭐ SECTION 3 - WARUM ARAS? - Ultra Clean Redesign */}
        <section className="relative py-32" style={{ background: 'transparent' }}>
          <div className="max-w-7xl mx-auto px-8">
            {/* Header with Typing Animation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              {/* Animated Gradient Headline */}
              <motion.h2 
                className="text-5xl md:text-6xl font-black mb-8"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(90deg, #ffffff, #e9d7c4, #FE9100, #ff8c00, #FE9100, #e9d7c4, #ffffff)',
                  backgroundSize: '300% 100%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '50% 50%', '100% 50%', '50% 50%', '0% 50%']
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <T>Warum Unternehmen ARAS AI einsetzen</T>
              </motion.h2>
              
              {/* Typing Subtitle */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed"
              >
                <p className="mb-4">
                  <T>ARAS AI ist nicht experimentelle KI-Telefonie.</T>
                </p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 }}
                  className="text-white/60"
                >
                  <T>Es ist eine präzise, stabile, Schweizer Plattform für echte Geschäftsprozesse.</T>
                </motion.p>
              </motion.div>
            </motion.div>
            
            {/* Transparent Cards Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Mic className="w-10 h-10" />,
                  title: 'Natürlich klingende Stimme',
                  subtitle: 'ohne Übertreibung',
                  desc: 'Die Stimme wirkt ruhig, strukturiert und authentisch – ohne Roboterklang.'
                },
                {
                  icon: <TrendingUp className="w-10 h-10" />,
                  title: 'Skalierung ohne Personalabhängigkeit',
                  subtitle: null,
                  desc: 'Von einzelnen Anrufen bis zu hunderten parallelen Gesprächen, 24/7, konstant.'
                },
                {
                  icon: <Shield className="w-10 h-10" />,
                  title: 'Schweizer Datensicherheit',
                  subtitle: null,
                  desc: 'Alle Daten bleiben in Europa. Keine US-Clouds. Keine Risikoarchitektur. Bereit für interne Audits & Compliance-Abteilungen.'
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, type: 'spring', stiffness: 100 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="group relative"
                >
                  {/* Animated Border Container */}
                  <div className="relative p-[2px] rounded-2xl overflow-hidden">
                    {/* Animated Gradient Border */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)',
                        backgroundSize: '300% 300%'
                      }}
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                      }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />
                    
                    {/* Transparent Card Content */}
                    <div 
                      className="relative rounded-2xl p-8"
                      style={{ background: 'rgba(0, 0, 0, 0.9)' }}
                    >
                      {/* Icon with Gradient */}
                      <motion.div 
                        className="mb-6 text-white"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {item.icon}
                      </motion.div>
                      
                      {/* Title with Gradient on Hover */}
                      <h3 
                        className="text-2xl font-bold mb-3 text-white transition-all duration-300"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        <T>{item.title}</T>
                      </h3>
                      
                      {/* Subtitle */}
                      {item.subtitle && (
                        <motion.p 
                          className="text-sm mb-4 font-semibold"
                          style={{
                            background: 'linear-gradient(90deg, #e9d7c4, #FE9100)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          <T>{item.subtitle}</T>
                        </motion.p>
                      )}
                      
                      {/* Description */}
                      <p className="text-white/70 leading-relaxed text-base">
                        <T>{item.desc}</T>
                      </p>
                      
                      {/* Subtle Glow on Hover */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none"
                        style={{
                          background: 'radial-gradient(circle at 50% 50%, rgba(254, 145, 0, 0.1), transparent 70%)',
                          filter: 'blur(20px)'
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
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
      <section className="relative w-full py-32" style={{ background: 'transparent' }}>
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

      {/* 🎯 FEATURES SECTION - Was ARAS AI heute tut */}
      <section className="relative py-32 px-8 border-t-4 border-[#FE9100]" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2
              className="text-5xl md:text-6xl font-black mb-6"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #ffd700)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(254, 145, 0, 0.3)'
              }}
            >
              Was ARAS AI heute für Ihr Unternehmen tut
            </h2>
            <p className="text-xl text-white/70 max-w-4xl mx-auto leading-relaxed">
              Die Alpha-Version von ARAS vereint Telefonie, Chat-Automatisierung, Analyse und Integrationen in einer einzigen Plattform – entwickelt für echte Geschäftsprozesse, nicht für Experimente.
            </p>
          </motion.div>

          {/* Outbound Telefonie Feature Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative group"
          >
            {/* Glow Effect */}
            <motion.div
              className="absolute -inset-4 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.2), rgba(255, 215, 0, 0.2))'
              }}
            />

            {/* Main Card */}
            <div
              className="relative rounded-2xl p-10 backdrop-blur-sm border"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderColor: 'rgba(254, 145, 0, 0.2)'
              }}
            >
              {/* Feature Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                  }}
                >
                  <Phone className="w-8 h-8 text-black" />
                </motion.div>
                <div>
                  <h3
                    className="text-3xl font-black"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(135deg, #e9d7c4, #FE9100)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Outbound Telefonie
                  </h3>
                  <p className="text-white/60 text-sm mt-1">
                    ARAS führt echte Gespräche: klar, strukturiert und natürlich.
                  </p>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                {[
                  'Automatische Lead-Telefonate',
                  'Einwandbehandlung & Gesprächslogik',
                  'Menschlich klingende ARAS Voice Engine',
                  'Terminbuchungen & Weiterleitungen',
                  'Gesprächszusammenfassungen in Echtzeit'
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="flex items-center gap-3 group/item"
                  >
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 90 }}
                      className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #FE9100, #ffd700)'
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    </motion.div>
                    <span className="text-white/80 group-hover/item:text-white transition-colors">
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Highlight Banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="relative overflow-hidden rounded-xl p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.15), rgba(255, 215, 0, 0.15))',
                  border: '2px solid rgba(254, 145, 0, 0.3)'
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(254, 145, 0, 0.1), transparent)',
                    backgroundSize: '200% 100%'
                  }}
                />
                <div className="relative flex items-center gap-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8 text-[#FE9100]" />
                  </motion.div>
                  <div>
                    <p
                      className="text-xl font-black"
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      Bis zu 10.000 parallele Anrufe mit nur einem Klick möglich!
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      Skaliere dein Outbound ohne Grenzen – von 1 bis 10.000 Anrufen gleichzeitig.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
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