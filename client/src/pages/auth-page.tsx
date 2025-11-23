import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  Calendar, 
  Sparkles, 
  Building, 
  Globe, 
  User, 
  Target, 
  ChevronLeft, 
  Search,
  Plus,
  Minus,
  X,
  Check,
  Edit,
  Trash,
  Info,
  HelpCircle,
  Briefcase,
  Book,
  CreditCard,
  ShoppingCart,
  MapPin,
  Compass,
  Paperclip,
  Link,
  Unlock,
  Lock,
  Star,
  Heart,
  Smile,
  Frown,
  Meh,
  Hand,
  FingerPrint,
  Id,
  Database,
  Server,
  Cloud,
  Sun,
  Moon,
  Wind,
  Rain,
  Snow,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudWind,
  Droplet,
  Puzzle,
  Layers,
  Sliders,
  Settings,
  Paintbrush,
  DropletHalf,
  GitCommit,
  GitPullRequest,
  GitMerge,
  GitBranch,
  GitFork,
  GitTag,
  GitRepo,
  GitCompare,
  GitDiff,
  GitStatus,
  GitLog,
  GitGraph,
  GitCommitClosed,
  GitCommitOpen,
  GitPullRequestClosed,
  GitPullRequestOpen,
  GitMergeClosed,
  GitMergeOpen,
  GitBranchClosed,
  GitBranchOpen,
  GitTagClosed,
  GitTagOpen,
  GitRepoClosed,
  GitRepoOpen,
  GitCompareClosed,
  GitCompareOpen,
  GitDiffClosed,
  GitDiffOpen,
  GitStatusClosed,
  GitStatusOpen,
  GitLogClosed,
  GitLogOpen,
  GitGraphClosed,
  GitGraphOpen
} from "lucide-react";
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
      <div className="min-h-screen bg-black flex items-center justify-center">
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
        "📈 Analysiere Marktposition und Wettbewerber...",
        "🎯 Identifiziere Zielgruppen und Kundenprofile...",
        "💼 Extrahiere Produkte, Services und USPs...",
        "🔮 Erstelle psychologisches Unternehmensprofil...",
        "✨ Generiere personalisierte KI-Strategie...",
        "🚀 Finalisiere ARAS AI Konfiguration..."
      ];
      
      let currentStep = 0;
      const stepInterval = setInterval(() => {
        if (currentStep < researchSteps.length) {
          setResearchStatus(researchSteps[currentStep]);
          setResearchProgress((currentStep + 1) * 10);
          currentStep++;
        }
      }, 1500);
      
      // Start actual registration after animation starts
      setTimeout(async () => {
        try {
          const result = await registerMutation.mutateAsync(registerData);
          trackSignup('email', result?.id);
          
          // Wait for animation to finish
          setTimeout(() => {
            clearInterval(stepInterval);
            setResearchProgress(100);
            setResearchStatus("✅ Research abgeschlossen! AI-Profil wurde erfolgreich erstellt.");
            
            setTimeout(() => {
              toast({
                title: "Willkommen bei ARAS AI! 🎉",
                description: `Hey ${registerData.firstName}! Deine persönliche KI ist jetzt bereit für ${registerData.company}!`
              });
              setLocation("/welcome");
            }, 2000);
          }, Math.max(0, (researchSteps.length * 1500) - 2000));
          
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 🌊 ULTRA-SMOOTH WAVE BACKGROUND - SMALLER & MORE DISTANT */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Film Grain Texture for Premium Look */}
        <div 
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Smooth Animated Wave - Lower Third Only */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <svg
            className="absolute w-full h-full"
            viewBox="0 0 1920 1080"
            preserveAspectRatio="xMidYMax slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Ultra-Premium Gradient */}
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#e9d7c4', stopOpacity: 0.15 }} />
                <stop offset="40%" style={{ stopColor: '#FE9100', stopOpacity: 0.25 }} />
                <stop offset="70%" style={{ stopColor: '#a34e00', stopOpacity: 0.2 }} />
                <stop offset="100%" style={{ stopColor: '#e9d7c4', stopOpacity: 0.15 }} />
              </linearGradient>
              
              {/* Soft Glow Filter */}
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="40" result="coloredBlur"/>
                <feBlend in="coloredBlur" in2="SourceGraphic" mode="normal"/>
              </filter>
            </defs>

            {/* Layer 1 - Background Wave (Most Distant) */}
            <motion.path
              d="M0,800 C480,720 960,880 1440,800 C1920,720 2400,840 2880,800 L2880,1080 L0,1080 Z"
              fill="url(#waveGradient)"
              opacity="0.3"
              filter="url(#softGlow)"
              animate={{
                d: [
                  "M0,800 C480,720 960,880 1440,800 C1920,720 2400,840 2880,800 L2880,1080 L0,1080 Z",
                  "M0,820 C480,740 960,860 1440,820 C1920,740 2400,820 2880,820 L2880,1080 L0,1080 Z",
                  "M0,800 C480,720 960,880 1440,800 C1920,720 2400,840 2880,800 L2880,1080 L0,1080 Z"
                ]
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Layer 2 - Middle Wave */}
            <motion.path
              d="M0,850 C400,780 800,920 1200,850 C1600,780 2000,890 2400,850 L2400,1080 L0,1080 Z"
              fill="url(#waveGradient)"
              opacity="0.4"
              filter="url(#softGlow)"
              animate={{
                d: [
                  "M0,850 C400,780 800,920 1200,850 C1600,780 2000,890 2400,850 L2400,1080 L0,1080 Z",
                  "M0,870 C400,800 800,900 1200,870 C1600,800 2000,870 2400,870 L2400,1080 L0,1080 Z",
                  "M0,850 C400,780 800,920 1200,850 C1600,780 2000,890 2400,850 L2400,1080 L0,1080 Z"
                ]
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 3
              }}
            />

            {/* Layer 3 - Foreground Wave (Closest) */}
            <motion.path
              d="M0,900 C320,840 640,960 960,900 C1280,840 1600,940 1920,900 L1920,1080 L0,1080 Z"
              fill="url(#waveGradient)"
              opacity="0.5"
              filter="url(#softGlow)"
              animate={{
                d: [
                  "M0,900 C320,840 640,960 960,900 C1280,840 1600,940 1920,900 L1920,1080 L0,1080 Z",
                  "M0,920 C320,860 640,940 960,920 C1280,860 1600,920 1920,920 L1920,1080 L0,1080 Z",
                  "M0,900 C320,840 640,960 960,900 C1280,840 1600,940 1920,900 L1920,1080 L0,1080 Z"
                ]
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
          </svg>
        </motion.div>

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