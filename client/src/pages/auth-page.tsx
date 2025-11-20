import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
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

  // Email validation
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

  // Password strength checker
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
      
      // Track successful login
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
      
      // Track successful signup with UTM parameters
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

  const registerPasswordTooShort =
    registerData.password.length > 0 && registerData.password.length < 6;

  return (
    <div className="h-screen overflow-y-auto bg-black text-white relative flex content-zoom">
      {/* Ultra Premium Background */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/12 via-transparent to-[#a34e00]/12" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 15% 20%, rgba(254, 145, 0, 0.12) 0%, transparent 45%),
                           radial-gradient(circle at 85% 80%, rgba(233, 215, 196, 0.08) 0%, transparent 50%),
                           radial-gradient(circle at 50% 50%, rgba(163, 78, 0, 0.06) 0%, transparent 65%)`
        }} />
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: "radial-gradient(#444 1px, transparent 1px)",
          backgroundSize: "25px 25px"
        }} />
      </div>

      {/* LEFT SIDE - Hero Content */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-12 xl:px-20 py-16">
        {/* Pre-Launch Badge */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
          className="mb-12"
        >
          <div className="relative">
            <motion.div
              className="absolute -inset-[2px] rounded-full opacity-60"
              style={{
                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                backgroundSize: '300% 100%',
                filter: 'blur(10px)'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/10"
              style={{
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-[#FE9100]"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [1, 0.6, 1]
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <span className="text-xs tracking-[0.25em] uppercase font-medium" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                Pre-Launch Phase
              </span>
            </div>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
          className="mb-12"
        >
          {/* Main Title - Transparent with Animated Border */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.25, 0.8, 0.25, 1] }}
            className="mb-6 inline-block"
          >
            <div className="relative">
              {/* Animated Border */}
              <motion.div
                className="absolute -inset-[2px] rounded-3xl"
                style={{
                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                  backgroundSize: '300% 100%'
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />
              
              {/* Subtle Glow */}
              <motion.div
                className="absolute -inset-[3px] rounded-3xl opacity-40"
                style={{
                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                  filter: 'blur(12px)'
                }}
                animate={{
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              {/* Transparent Container */}
              <div
                className="relative px-12 py-6 rounded-3xl"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: 'none'
                }}
              >
                <h1
                  className="relative text-6xl xl:text-7xl font-black tracking-tight"
                  style={{ 
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#e9d7c4'
                  }}
                >
                  ARAS AI
                </h1>
              </div>
            </div>
          </motion.div>

          {/* Subtitle - Below Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mb-8"
          >
            <p
              className="text-sm uppercase tracking-[0.35em] font-semibold"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                color: '#e9d7c4'
              }}
            >
              Die Outbound-KI
            </p>
          </motion.div>

          {/* Typewriter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="h-10 mb-10 flex items-center"
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
                className="inline-block w-[2px] h-[24px] bg-[#FE9100] ml-2 align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            </span>
          </motion.div>

          {/* Alpha Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-10 p-6 rounded-xl border border-white/10"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ fontFamily: 'Orbitron, sans-serif', color: '#FE9100' }}>
              Aktuell in der Alpha-Phase
            </h3>
            <div className="space-y-2 text-sm text-gray-400 leading-relaxed">
              <p>
                ARAS AI ist live – aber nur für ausgewählte Nutzer. Jeder Zugang ist
                persönlich vergeben.
              </p>
              <p className="text-[#FE9100] font-bold">
                Offizieller Launch: 01.01.2026
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-10 text-xs text-gray-600 leading-relaxed"
          >
            <p>Entwickelt von der Schwarzott Group</p>
            <p>Gebaut in der Schweiz. Betrieben von einem eigenen, unabhängigen Sprachmodell.</p>
            <p className="mt-2">Präzision. Eleganz. Kraft. Das ist ARAS.</p>
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT SIDE - Auth Forms */}
      <div className="w-full lg:w-1/2 relative z-10 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
          className="w-full max-w-2xl mx-auto mb-16"
        >
          <div className="relative group">
            {/* Outer Glow */}
            <motion.div
              className="absolute -inset-[3px] rounded-3xl opacity-50"
              style={{
                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                backgroundSize: '300% 100%',
                filter: 'blur(15px)'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />

            {/* Card */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(50px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)'
              }}
            >
              {/* Tabs */}
              <Tabs defaultValue="login" className="w-full">
                <div className="px-10 pt-8 pb-2">
                  <TabsList className="grid w-full grid-cols-2 bg-transparent border border-white/10 rounded-full p-1.5">
                    <TabsTrigger
                      value="login"
                      className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#e9d7c4] data-[state=active]:to-[#FE9100] data-[state=active]:text-black text-sm font-bold transition-all"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="register"
                      className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#e9d7c4] data-[state=active]:to-[#FE9100] data-[state=active]:text-black text-sm font-bold transition-all"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* LOGIN TAB */}
                <TabsContent value="login">
                  <Card className="border-0 bg-transparent shadow-none">
                    <CardHeader className="px-10 pb-4">
                      <CardTitle className="text-lg font-black" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                        Login für ausgewählte Nutzer
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-400 leading-relaxed">
                        Melde dich mit deinen Zugangsdaten an, um ARAS AI zu verwenden.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 pb-10">
                      <form onSubmit={handleLogin} className="space-y-6">
                        {/* Username */}
                        <div className="space-y-3">
                          <Label htmlFor="login-username" className="text-sm font-bold text-gray-200">
                            Username
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                            />
                            <Input
                              id="login-username"
                              type="text"
                              value={loginData.username}
                              onChange={(e) =>
                                setLoginData((prev) => ({
                                  ...prev,
                                  username: e.target.value
                                }))
                              }
                              placeholder="Dein Username"
                              required
                              className="relative bg-black/50 border-0 focus:ring-2 focus:ring-[#FE9100]/30 text-base rounded-xl px-5 py-4 transition-all"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-3">
                          <Label htmlFor="login-password" className="text-sm font-bold text-gray-200">
                            Passwort
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                            />
                            <Input
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              value={loginData.password}
                              onChange={(e) =>
                                setLoginData((prev) => ({
                                  ...prev,
                                  password: e.target.value
                                }))
                              }
                              placeholder="Passwort eingeben"
                              required
                              className="relative bg-black/50 border-0 focus:ring-2 focus:ring-[#FE9100]/30 text-base rounded-xl px-5 py-4 pr-14 transition-all"
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
                              {showPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                              )}
                            </Button>
                          </div>
                          <AnimatePresence>
                            {loginMutation.isError && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 p-3 rounded-xl"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <p className="text-xs text-red-400 font-medium">
                                  Login fehlgeschlagen. Bitte Zugangsdaten prüfen.
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Submit */}
                        <motion.div className="relative pt-3">
                          <motion.div
                            className="absolute -inset-[2px] rounded-full opacity-60"
                            style={{
                              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                              backgroundSize: '300% 100%',
                              filter: 'blur(12px)'
                            }}
                            animate={{
                              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                              opacity: [0.4, 0.7, 0.4]
                            }}
                            transition={{
                              backgroundPosition: { duration: 4, repeat: Infinity, ease: 'linear' },
                              opacity: { duration: 2.5, repeat: Infinity }
                            }}
                          />
                          <motion.button
                            type="submit"
                            disabled={loginMutation.isPending}
                            whileHover={{ scale: loginMutation.isPending ? 1 : 1.02 }}
                            whileTap={{ scale: loginMutation.isPending ? 1 : 0.97 }}
                            className="relative w-full py-4 rounded-full font-black text-base tracking-wide overflow-hidden"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                              color: '#000000',
                              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                              boxShadow: '0 10px 30px rgba(254, 145, 0, 0.3)'
                            }}
                          >
                            {!loginMutation.isPending && (
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                                }}
                                animate={{
                                  x: ['-100%', '100%']
                                }}
                                transition={{
                                  duration: 2.5,
                                  repeat: Infinity,
                                  ease: 'linear'
                                }}
                              />
                            )}
                            <span className="relative flex items-center justify-center gap-2">
                              {loginMutation.isPending ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Signing In...
                                </>
                              ) : (
                                "Sign In"
                              )}
                            </span>
                          </motion.button>
                        </motion.div>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* REGISTER TAB */}
                <TabsContent value="register">
                  <Card className="border-0 bg-transparent shadow-none">
                    <CardHeader className="px-10 pb-4">
                      <CardTitle className="text-lg font-black" style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}>
                        Alpha-Account erstellen
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-400 leading-relaxed">
                        Wenn du diese Seite siehst, wurdest du ausgewählt. Du bist
                        Teil der ersten Generation, die die menschlichste KI-Stimme
                        der Welt erlebt.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 pb-10">
                      <form onSubmit={handleRegister} className="space-y-5">
                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <Label htmlFor="register-firstName" className="text-sm font-bold text-gray-200">
                              Vorname
                            </Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1.5px] rounded-xl opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                  backgroundSize: '300% 100%'
                                }}
                                animate={{
                                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                              />
                              <Input
                                id="register-firstName"
                                type="text"
                                value={registerData.firstName}
                                onChange={(e) =>
                                  setRegisterData((prev) => ({
                                    ...prev,
                                    firstName: e.target.value
                                  }))
                                }
                                placeholder="Vorname"
                                required
                                className="relative bg-black/50 border-0 focus:ring-2 focus:ring-[#FE9100]/30 text-base rounded-xl px-5 py-4 transition-all"
                                style={{
                                  boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="register-lastName" className="text-sm font-bold text-gray-200">
                              Nachname
                            </Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1.5px] rounded-xl opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                  backgroundSize: '300% 100%'
                                }}
                                animate={{
                                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                              />
                              <Input
                                id="register-lastName"
                                type="text"
                                value={registerData.lastName}
                                onChange={(e) =>
                                  setRegisterData((prev) => ({
                                    ...prev,
                                    lastName: e.target.value
                                  }))
                                }
                                placeholder="Nachname"
                                required
                                className="relative bg-black/50 border-0 focus:ring-2 focus:ring-[#FE9100]/30 text-base rounded-xl px-5 py-4 transition-all"
                                style={{
                                  boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Username */}
                        <div className="space-y-3">
                          <Label htmlFor="register-username" className="text-sm font-bold text-gray-200">
                            Username
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                            />
                            <Input
                              id="register-username"
                              type="text"
                              value={registerData.username}
                              onChange={(e) =>
                                setRegisterData((prev) => ({
                                  ...prev,
                                  username: e.target.value
                                }))
                              }
                              placeholder="Wähle einen Username"
                              required
                              className="relative bg-black/50 border-0 focus:ring-2 focus:ring-[#FE9100]/30 text-base rounded-xl px-5 py-4 transition-all"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-3">
                          <Label htmlFor="register-email" className="text-sm font-bold text-gray-200">
                            E-Mail
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                            />
                            <Input
                              id="register-email"
                              type="email"
                              value={registerData.email}
                              onChange={(e) => {
                                setRegisterData((prev) => ({
                                  ...prev,
                                  email: e.target.value
                                }));
                                validateEmail(e.target.value);
                              }}
                              placeholder="name@example.com"
                              required
                              className="relative bg-black/50 border-0 focus:ring-2 focus:ring-[#FE9100]/30 text-base rounded-xl px-5 py-4 transition-all"
                              style={{
                                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)'
                              }}
                            />
                          </div>
                          <AnimatePresence>
                            {emailError && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 p-3 rounded-xl"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <p className="text-xs text-red-400 font-medium">{emailError}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Password */}
                        <div className="space-y-3">
                          <Label htmlFor="register-password" className="text-sm font-bold text-gray-200">
                            Passwort
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1.5px] rounded-xl opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                            />
                            <Input
                              id="register-password"
                              type={showPassword ? "text" : "password"}
                              value={registerData.password}
                              onChange={(e) => {
                                setRegisterData((prev) => ({
                                  ...prev,
                                  password: e.target.value
                                }));
                                checkPasswordStrength(e.target.value);
                              }}
                              placeholder="Sicheres Passwort erstellen"
                              required
                              minLength={6}
                              className="relative bg-black/50 border-0 focus:ring-2 focus:ring-[#FE9100]/30 text-base rounded-xl px-5 py-4 pr-14 transition-all"
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
                              {showPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                              )}
                            </Button>
                          </div>
                          
                          {/* Password Strength Indicator */}
                          <AnimatePresence>
                            {passwordStrength && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{
                                  background: passwordStrength === 'weak' ? 'rgba(239, 68, 68, 0.1)' :
                                             passwordStrength === 'medium' ? 'rgba(245, 158, 11, 0.1)' :
                                             'rgba(34, 197, 94, 0.1)',
                                  border: `1px solid ${
                                    passwordStrength === 'weak' ? 'rgba(239, 68, 68, 0.3)' :
                                    passwordStrength === 'medium' ? 'rgba(245, 158, 11, 0.3)' :
                                    'rgba(34, 197, 94, 0.3)'
                                  }`
                                }}
                              >
                                {passwordStrength === 'strong' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : (
                                  <AlertCircle className="w-4 h-4" style={{
                                    color: passwordStrength === 'weak' ? '#f87171' : '#fbbf24'
                                  }} />
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-medium" style={{
                                    color: passwordStrength === 'weak' ? '#f87171' :
                                           passwordStrength === 'medium' ? '#fbbf24' :
                                           '#4ade80'
                                  }}>
                                    {passwordStrength === 'weak' ? 'Schwaches Passwort - mindestens 6 Zeichen' :
                                     passwordStrength === 'medium' ? 'Mittleres Passwort - mindestens 10 Zeichen empfohlen' :
                                     'Starkes Passwort'}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <AnimatePresence>
                            {registerMutation.isError && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 p-3 rounded-xl"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <p className="text-xs text-red-400 font-medium">
                                  Registrierung fehlgeschlagen. Bitte Eingaben prüfen.
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Submit */}
                        <motion.div className="relative pt-3">
                          <motion.div
                            className="absolute -inset-[2px] rounded-full opacity-60"
                            style={{
                              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                              backgroundSize: '300% 100%',
                              filter: 'blur(12px)'
                            }}
                            animate={{
                              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                              opacity: [0.4, 0.7, 0.4]
                            }}
                            transition={{
                              backgroundPosition: { duration: 4, repeat: Infinity, ease: 'linear' },
                              opacity: { duration: 2.5, repeat: Infinity }
                            }}
                          />
                          <motion.button
                            type="submit"
                            disabled={registerMutation.isPending}
                            whileHover={{ scale: registerMutation.isPending ? 1 : 1.02 }}
                            whileTap={{ scale: registerMutation.isPending ? 1 : 0.97 }}
                            className="relative w-full py-4 rounded-full font-black text-base tracking-wide overflow-hidden"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00)',
                              color: '#000000',
                              cursor: registerMutation.isPending ? 'not-allowed' : 'pointer',
                              boxShadow: '0 10px 30px rgba(254, 145, 0, 0.3)'
                            }}
                          >
                            {!registerMutation.isPending && (
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                                }}
                                animate={{
                                  x: ['-100%', '100%']
                                }}
                                transition={{
                                  duration: 2.5,
                                  repeat: Infinity,
                                  ease: 'linear'
                                }}
                              />
                            )}
                            <span className="relative flex items-center justify-center gap-2">
                              {registerMutation.isPending ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Creating Account...
                                </>
                              ) : (
                                "Alpha-Account erstellen"
                              )}
                            </span>
                          </motion.button>
                        </motion.div>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}