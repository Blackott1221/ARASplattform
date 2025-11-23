import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Phone, Calendar, Sparkles } from "lucide-react";
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
    lastName: ""
  });

  const [typedIndex, setTypedIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

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
    try {
      const result = await registerMutation.mutateAsync(registerData);
      trackSignup('email', result?.id);
      toast({
        title: "Account Created!",
        description: "Welcome to ARAS AI. You are now logged in."
      });
      setLocation("/welcome");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
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
                          ? 'linear-gradient(135deg, #e9d7c4, #FE9100)'
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
                          ? 'linear-gradient(135deg, #e9d7c4, #FE9100)'
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
                      <div className="mb-5">
                        <h2 className="text-xl font-black mb-1" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                          Join Alpha
                        </h2>
                        <p className="text-xs text-gray-500">
                          Du wurdest ausgewählt
                        </p>
                      </div>

                      <form onSubmit={handleRegister} className="space-y-3.5">
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

                        <motion.div className="pt-2">
                          <motion.button
                            type="submit"
                            disabled={registerMutation.isPending}
                            whileHover={{ scale: registerMutation.isPending ? 1 : 1.01 }}
                            whileTap={{ scale: registerMutation.isPending ? 1 : 0.99 }}
                            className="relative w-full py-3 rounded-xl font-black text-sm overflow-hidden flex items-center justify-center gap-2"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                              color: '#000000',
                              boxShadow: '0 10px 30px rgba(254, 145, 0, 0.3)',
                              cursor: registerMutation.isPending ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                CREATING...
                              </>
                            ) : (
                              <>
                                JOIN ALPHA
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </motion.button>
                        </motion.div>
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