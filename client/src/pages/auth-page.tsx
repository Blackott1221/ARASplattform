import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Sparkles, Zap } from "lucide-react";
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
      {/* 🔥 ANIMATED WAVE BACKGROUND - LIKE RETELL AI BUT BETTER */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated SVG Wave */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <svg
            className="absolute w-full h-full"
            viewBox="0 0 1440 800"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradient Definition */}
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#e9d7c4', stopOpacity: 0.3 }} />
                <stop offset="50%" style={{ stopColor: '#FE9100', stopOpacity: 0.4 }} />
                <stop offset="100%" style={{ stopColor: '#a34e00', stopOpacity: 0.3 }} />
              </linearGradient>
              
              {/* Blur Filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="30" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Wave Shape with Animation */}
            <motion.path
              d="M0,300 C360,100 720,500 1080,300 C1440,100 1800,400 2160,300 L2160,800 L0,800 Z"
              fill="url(#waveGradient)"
              filter="url(#glow)"
              animate={{
                d: [
                  "M0,300 C360,100 720,500 1080,300 C1440,100 1800,400 2160,300 L2160,800 L0,800 Z",
                  "M0,350 C360,150 720,450 1080,350 C1440,150 1800,350 2160,350 L2160,800 L0,800 Z",
                  "M0,300 C360,100 720,500 1080,300 C1440,100 1800,400 2160,300 L2160,800 L0,800 Z"
                ]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Second Wave Layer for Depth */}
            <motion.path
              d="M0,400 C300,200 600,600 900,400 C1200,200 1500,500 1800,400 L1800,800 L0,800 Z"
              fill="url(#waveGradient)"
              opacity="0.5"
              filter="url(#glow)"
              animate={{
                d: [
                  "M0,400 C300,200 600,600 900,400 C1200,200 1500,500 1800,400 L1800,800 L0,800 Z",
                  "M0,450 C300,250 600,550 900,450 C1200,250 1500,450 1800,450 L1800,800 L0,800 Z",
                  "M0,400 C300,200 600,600 900,400 C1200,200 1500,500 1800,400 L1800,800 L0,800 Z"
                ]
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
            />
          </svg>
        </motion.div>

        {/* Gradient Overlay for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        
        {/* Subtle Dot Grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(#FE9100 1px, transparent 1px)",
          backgroundSize: "30px 30px"
        }} />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT SIDE - Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-8"
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
                    filter: 'blur(8px)',
                    opacity: 0.6
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative flex items-center gap-3 px-5 py-2 rounded-full"
                  style={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(254, 145, 0, 0.3)',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#FE9100]"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-xs tracking-[0.2em] uppercase font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
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
                className="text-8xl font-black tracking-tight mb-4"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 80px rgba(254, 145, 0, 0.3)'
                }}
              >
                ARAS AI
              </h1>
              <p
                className="text-sm uppercase tracking-[0.3em] font-bold text-[#e9d7c4] mb-8"
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
              className="min-h-[60px] flex items-center"
            >
              <span
                className="text-2xl font-bold"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  color: '#e9d7c4'
                }}
              >
                {typedText}
                <motion.span
                  className="inline-block w-[3px] h-[28px] bg-[#FE9100] ml-2 align-middle"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </span>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="space-y-4"
            >
              {[
                { icon: Zap, text: "Tausende simultane Anrufe" },
                { icon: Sparkles, text: "Menschlichste KI-Stimme der Welt" },
                { icon: CheckCircle2, text: "Launch: 01.01.2026" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.2), rgba(163, 78, 0, 0.2))',
                      border: '1px solid rgba(254, 145, 0, 0.3)'
                    }}
                  >
                    <item.icon className="w-5 h-5 text-[#FE9100]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-xs text-gray-600 leading-relaxed space-y-1 pt-8"
            >
              <p>Entwickelt von der Schwarzott Group</p>
              <p>Gebaut in der Schweiz. Betrieben von einem eigenen Sprachmodell.</p>
              <p className="text-[#e9d7c4] font-medium">Präzision. Eleganz. Kraft.</p>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE - Auth Form */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-full max-w-lg mx-auto"
          >
            {/* Card Container */}
            <div className="relative">
              {/* Glow Effect */}
              <motion.div
                className="absolute -inset-[3px] rounded-3xl opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                  filter: 'blur(20px)'
                }}
                animate={{
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              {/* Main Card */}
              <div
                className="relative rounded-3xl p-10"
                style={{
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(50px)',
                  WebkitBackdropFilter: 'blur(50px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 40px 100px rgba(0, 0, 0, 0.8)'
                }}
              >
                {/* Tab Switcher */}
                <div className="mb-8">
                  <div className="flex gap-2 p-1.5 rounded-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('login')}
                      className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
                        activeTab === 'login'
                          ? 'text-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        background: activeTab === 'login'
                          ? 'linear-gradient(135deg, #e9d7c4, #FE9100)'
                          : 'transparent'
                      }}
                    >
                      SIGN IN
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('register')}
                      className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
                        activeTab === 'register'
                          ? 'text-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        background: activeTab === 'register'
                          ? 'linear-gradient(135deg, #e9d7c4, #FE9100)'
                          : 'transparent'
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
                      transition={{ duration: 0.3 }}
                    >
                      <div className="mb-6">
                        <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                          Welcome Back
                        </h2>
                        <p className="text-sm text-gray-400">
                          Melde dich mit deinen Zugangsdaten an
                        </p>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-5">
                        {/* Username */}
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-gray-300">Username</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
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
                              className="relative bg-black/60 border-0 text-white rounded-xl px-5 py-4 text-base"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-gray-300">Passwort</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
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
                              className="relative bg-black/60 border-0 text-white rounded-xl px-5 py-4 pr-14 text-base"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-white/10 rounded-lg"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                            </Button>
                          </div>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                          {loginMutation.isError && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 p-3 rounded-xl"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)'
                              }}
                            >
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <p className="text-xs text-red-400 font-medium">
                                Login fehlgeschlagen. Bitte Zugangsdaten prüfen.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.div className="pt-4">
                          <motion.button
                            type="submit"
                            disabled={loginMutation.isPending}
                            whileHover={{ scale: loginMutation.isPending ? 1 : 1.02 }}
                            whileTap={{ scale: loginMutation.isPending ? 1 : 0.98 }}
                            className="relative w-full py-4 rounded-xl font-black text-base overflow-hidden flex items-center justify-center gap-3"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                              color: '#000000',
                              boxShadow: '0 10px 40px rgba(254, 145, 0, 0.4)',
                              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                SIGNING IN...
                              </>
                            ) : (
                              <>
                                SIGN IN
                                <ArrowRight className="w-5 h-5" />
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
                      transition={{ duration: 0.3 }}
                    >
                      <div className="mb-6">
                        <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                          Join Alpha
                        </h2>
                        <p className="text-sm text-gray-400">
                          Du wurdest ausgewählt. Erlebe die Zukunft.
                        </p>
                      </div>

                      <form onSubmit={handleRegister} className="space-y-4">
                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-300">Vorname</Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1.5px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
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
                                className="relative bg-black/60 border-0 text-white rounded-xl px-4 py-3 text-sm"
                                style={{
                                  boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-300">Nachname</Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1.5px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
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
                                className="relative bg-black/60 border-0 text-white rounded-xl px-4 py-3 text-sm"
                                style={{
                                  boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-300">Username</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
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
                              className="relative bg-black/60 border-0 text-white rounded-xl px-5 py-3 text-sm"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-300">E-Mail</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
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
                              className="relative bg-black/60 border-0 text-white rounded-xl px-5 py-3 text-sm"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                          </div>
                          <AnimatePresence>
                            {emailError && (
                              <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-xs text-red-400 flex items-center gap-1"
                              >
                                <AlertCircle className="w-3 h-3" />
                                {emailError}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-300">Passwort</Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"
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
                              placeholder="Sicheres Passwort erstellen"
                              required
                              minLength={6}
                              className="relative bg-black/60 border-0 text-white rounded-xl px-5 py-3 pr-14 text-sm"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-white/10 rounded-lg"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                            </Button>
                          </div>
                          
                          {/* Password Strength */}
                          <AnimatePresence>
                            {passwordStrength && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="flex items-center gap-2 text-xs"
                              >
                                <div className="flex gap-1 flex-1">
                                  {[1, 2, 3].map((i) => (
                                    <div
                                      key={i}
                                      className="h-1 flex-1 rounded-full"
                                      style={{
                                        background: i <= (passwordStrength === 'weak' ? 1 : passwordStrength === 'medium' ? 2 : 3)
                                          ? passwordStrength === 'weak' ? '#ef4444' : passwordStrength === 'medium' ? '#f59e0b' : '#22c55e'
                                          : 'rgba(255,255,255,0.1)'
                                      }}
                                    />
                                  ))}
                                </div>
                                <span
                                  className="font-medium"
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

                        {/* Error Message */}
                        <AnimatePresence>
                          {registerMutation.isError && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 p-3 rounded-xl"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)'
                              }}
                            >
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <p className="text-xs text-red-400 font-medium">
                                Registrierung fehlgeschlagen. Bitte Eingaben prüfen.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.div className="pt-4">
                          <motion.button
                            type="submit"
                            disabled={registerMutation.isPending}
                            whileHover={{ scale: registerMutation.isPending ? 1 : 1.02 }}
                            whileTap={{ scale: registerMutation.isPending ? 1 : 0.98 }}
                            className="relative w-full py-4 rounded-xl font-black text-base overflow-hidden flex items-center justify-center gap-3"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                              color: '#000000',
                              boxShadow: '0 10px 40px rgba(254, 145, 0, 0.4)',
                              cursor: registerMutation.isPending ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                CREATING ACCOUNT...
                              </>
                            ) : (
                              <>
                                JOIN ALPHA
                                <ArrowRight className="w-5 h-5" />
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