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
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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

  useEffect(() => {
    const current = TYPED_LINES[typedIndex];
    const speed = isDeleting ? 25 : 70;

    const timer = setTimeout(() => {
      if (!isDeleting && typedText.length < current.length) {
        setTypedText(current.slice(0, typedText.length + 1));
      } else if (!isDeleting && typedText.length === current.length) {
        setTimeout(() => setIsDeleting(true), 1000);
      } else if (isDeleting && typedText.length > 0) {
        setTypedText(current.slice(0, typedText.length - 1));
      } else if (isDeleting && typedText.length === 0) {
        setIsDeleting(false);
        setTypedIndex((prev) => (prev + 1) % TYPED_LINES.length);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, typedIndex]);

  if (!isLoading && user) {
    setLocation("/");
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
      await loginMutation.mutateAsync(loginData);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in."
      });
      setLocation("/");
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
      await registerMutation.mutateAsync(registerData);
      toast({
        title: "Account Created!",
        description: "Welcome to ARAS AI. You are now logged in."
      });
      setLocation("/");
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/10 via-transparent to-[#a34e00]/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(254, 145, 0, 0.08) 0%, transparent 50%),
                           radial-gradient(circle at 80% 70%, rgba(233, 215, 196, 0.06) 0%, transparent 50%),
                           radial-gradient(circle at 50% 50%, rgba(163, 78, 0, 0.04) 0%, transparent 60%)`
        }} />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(#333 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center">
        {/* Pre-Launch Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
          className="mb-12"
        >
          <div className="relative">
            <motion.div
              className="absolute -inset-[1px] rounded-full opacity-75"
              style={{
                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                backgroundSize: '300% 100%',
                filter: 'blur(6px)'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative flex items-center gap-2 px-5 py-2 rounded-full bg-black/80 backdrop-blur-xl border border-white/10">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-[#FE9100]"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] tracking-[0.2em] uppercase text-gray-300 font-medium">
                Pre-Launch Phase
              </span>
              <div className="w-px h-3 bg-white/20" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-gray-400">
                Alpha Access
              </span>
            </div>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          {/* Main Title with Premium Animation */}
          <motion.h1
            className="text-7xl md:text-8xl font-black mb-8 tracking-tight"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
          >
            <motion.span
              className="inline-block relative"
              style={{
                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                backgroundSize: '300% 100%',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            >
              ARAS AI
              <motion.div
                className="absolute -inset-4 blur-3xl opacity-20"
                style={{
                  background: 'linear-gradient(90deg, #FE9100, #a34e00, #FE9100)',
                  zIndex: -1
                }}
                animate={{
                  opacity: [0.15, 0.3, 0.15]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-10 font-medium"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Die Outbound-KI
          </motion.p>

          {/* Typewriter Effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="h-10 mb-12 flex items-center justify-center"
          >
            <span
              className="text-xl md:text-2xl font-medium"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                color: '#e9d7c4'
              }}
            >
              {typedText}
              <motion.span
                className="inline-block w-[3px] h-[26px] bg-[#FE9100] ml-2 align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </span>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="space-y-4 text-sm md:text-base text-gray-300 leading-relaxed max-w-2xl mx-auto mb-8"
          >
            <p>Echte Gespräche. Echte Resultate.</p>
            <p>
              ARAS AI führt tausende Anrufe gleichzeitig – und klingt dabei wie ein Mensch.
            </p>
            <p>Du liest nicht über die Zukunft. Du hörst sie.</p>
          </motion.div>

          {/* Alpha Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="space-y-2 text-xs text-gray-500 max-w-xl mx-auto"
          >
            <p>Aktuell in der Alpha-Phase.</p>
            <p>
              ARAS AI ist live – aber nur für ausgewählte Nutzer. Jeder Zugang ist
              persönlich vergeben, jede Rückmeldung verbessert das System.
            </p>
            <p className="text-[#FE9100]">Offizieller globaler Launch: 01.01.2026.</p>
          </motion.div>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
          className="w-full max-w-2xl"
        >
          <div className="relative group">
            {/* Animated Glow Border */}
            <motion.div
              className="absolute -inset-[2px] rounded-3xl opacity-60"
              style={{
                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                backgroundSize: '300% 100%',
                filter: 'blur(12px)'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />

            {/* Card Container */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Top Section */}
              <div className="px-8 py-8 border-b border-white/5">
                <p className="text-sm text-gray-200 mb-2 font-medium">
                  Jetzt kostenlos testen.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Erstelle deinen kostenlosen Alpha-Account, führe deine ersten zwei
                  echten Anrufe durch und teste die ARAS-Chatfunktion. Keine Kosten.
                  Keine Verpflichtung. Keine Installation.
                </p>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Alpha Access Button */}
                  <motion.button
                    type="button"
                    className="relative inline-flex items-center rounded-full overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                        backgroundSize: '300% 100%'
                      }}
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="relative flex items-center gap-3 px-6 py-3 m-[1px] rounded-full bg-black/90">
                      <span className="text-xs font-medium tracking-wide text-gray-100">
                        Kein Zugang? Alpha-Zugang aktivieren
                      </span>
                      <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center">
                        <div className="w-2 h-2 border-l-2 border-b-2 border-gray-300 rotate-[-45deg] translate-x-[-1px]" />
                      </div>
                    </div>
                  </motion.button>

                  {/* Info Text */}
                  <div className="text-[10px] text-gray-500 text-right space-y-0.5">
                    <p>Entwickelt von der Schwarzott Group</p>
                    <p>
                      Gebaut in der Schweiz. Betrieben von einem eigenen, unabhängigen
                      Sprachmodell.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs Section */}
              <Tabs defaultValue="login" className="w-full">
                <div className="px-8 pt-6">
                  <TabsList className="grid w-full grid-cols-2 bg-transparent border border-white/10 rounded-full p-1">
                    <TabsTrigger
                      value="login"
                      className="rounded-full data-[state=active]:bg-white/5 data-[state=active]:text-white text-sm font-medium transition-all"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="register"
                      className="rounded-full data-[state=active]:bg-white/5 data-[state=active]:text-white text-sm font-medium transition-all"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* LOGIN TAB */}
                <TabsContent value="login">
                  <Card className="border-0 bg-transparent shadow-none">
                    <CardHeader className="px-8 pb-4">
                      <CardTitle className="text-base font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        Login für ausgewählte Nutzer
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-400">
                        Melde dich mit deinen Zugangsdaten an, um ARAS AI zu verwenden.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <form onSubmit={handleLogin} className="space-y-5">
                        {/* Username Field */}
                        <div className="space-y-2">
                          <Label htmlFor="login-username" className="text-xs font-semibold text-gray-300">
                            Username
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-50 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
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
                              className="relative bg-black/40 border border-white/10 focus:border-[#FE9100]/50 focus:ring-0 text-sm rounded-xl px-4 py-3 transition-all"
                            />
                          </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                          <Label htmlFor="login-password" className="text-xs font-semibold text-gray-300">
                            Passwort
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-50 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
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
                              className="relative bg-black/40 border border-white/10 focus:border-[#FE9100]/50 focus:ring-0 text-sm rounded-xl px-4 py-3 pr-12 transition-all"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-white/5"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                          {loginMutation.isError && (
                            <p className="text-[10px] text-red-400 mt-1">
                              Login fehlgeschlagen. Bitte Zugangsdaten prüfen.
                            </p>
                          )}
                        </div>

                        {/* Submit Button */}
                        <motion.div className="relative pt-2">
                          <motion.div
                            className="absolute -inset-[2px] rounded-full opacity-75"
                            style={{
                              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                              backgroundSize: '300% 100%',
                              filter: 'blur(8px)'
                            }}
                            animate={{
                              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                              opacity: [0.5, 0.8, 0.5]
                            }}
                            transition={{
                              backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
                              opacity: { duration: 2, repeat: Infinity }
                            }}
                          />
                          <motion.button
                            type="submit"
                            disabled={loginMutation.isPending}
                            whileHover={{ scale: loginMutation.isPending ? 1 : 1.02 }}
                            whileTap={{ scale: loginMutation.isPending ? 1 : 0.98 }}
                            className="relative w-full py-3.5 rounded-full font-bold text-sm tracking-wide overflow-hidden"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                              backgroundSize: '200% 100%',
                              color: '#ffffff',
                              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {!loginMutation.isPending && (
                              <motion.div
                                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                                }}
                                animate={{
                                  x: ['-100%', '100%']
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'linear'
                                }}
                              />
                            )}
                            <span className="relative flex items-center justify-center gap-2">
                              {loginMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
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
                    <CardHeader className="px-8 pb-4">
                      <CardTitle className="text-base font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        Alpha-Account erstellen
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-400 leading-relaxed">
                        Wenn du diese Seite siehst, wurdest du ausgewählt. Du bist
                        Teil der ersten Generation, die die menschlichste KI-Stimme
                        der Welt erlebt.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <form onSubmit={handleRegister} className="space-y-5">
                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="register-firstName" className="text-xs font-semibold text-gray-300">
                              Vorname
                            </Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-50 group-focus-within:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                  backgroundSize: '300% 100%'
                                }}
                                animate={{
                                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
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
                                className="relative bg-black/40 border border-white/10 focus:border-[#FE9100]/50 focus:ring-0 text-sm rounded-xl px-4 py-3 transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="register-lastName" className="text-xs font-semibold text-gray-300">
                              Nachname
                            </Label>
                            <div className="relative group">
                              <motion.div
                                className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-50 group-focus-within:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                  backgroundSize: '300% 100%'
                                }}
                                animate={{
                                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
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
                                className="relative bg-black/40 border border-white/10 focus:border-[#FE9100]/50 focus:ring-0 text-sm rounded-xl px-4 py-3 transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Username Field */}
                        <div className="space-y-2">
                          <Label htmlFor="register-username" className="text-xs font-semibold text-gray-300">
                            Username
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-50 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
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
                              className="relative bg-black/40 border border-white/10 focus:border-[#FE9100]/50 focus:ring-0 text-sm rounded-xl px-4 py-3 transition-all"
                            />
                          </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                          <Label htmlFor="register-email" className="text-xs font-semibold text-gray-300">
                            E-Mail
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-50 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                            />
                            <Input
                              id="register-email"
                              type="email"
                              value={registerData.email}
                              onChange={(e) =>
                                setRegisterData((prev) => ({
                                  ...prev,
                                  email: e.target.value
                                }))
                              }
                              placeholder="name@example.com"
                              required
                              className="relative bg-black/40 border border-white/10 focus:border-[#FE9100]/50 focus:ring-0 text-sm rounded-xl px-4 py-3 transition-all"
                            />
                          </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                          <Label htmlFor="register-password" className="text-xs font-semibold text-gray-300">
                            Passwort
                          </Label>
                          <div className="relative group">
                            <motion.div
                              className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-50 group-focus-within:opacity-100 transition-opacity"
                              style={{
                                background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                                backgroundSize: '300% 100%'
                              }}
                              animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                              }}
                              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                            />
                            <Input
                              id="register-password"
                              type={showPassword ? "text" : "password"}
                              value={registerData.password}
                              onChange={(e) =>
                                setRegisterData((prev) => ({
                                  ...prev,
                                  password: e.target.value
                                }))
                              }
                              placeholder="Sicheres Passwort erstellen"
                              required
                              minLength={6}
                              className="relative bg-black/40 border border-white/10 focus:border-[#FE9100]/50 focus:ring-0 text-sm rounded-xl px-4 py-3 pr-12 transition-all"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-white/5"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                          {registerPasswordTooShort && (
                            <p className="text-[10px] text-red-400 mt-1">
                              Bitte ein längeres Passwort, für deine Sicherheit.
                            </p>
                          )}
                          {registerMutation.isError && (
                            <p className="text-[10px] text-red-400 mt-1">
                              Registrierung fehlgeschlagen. Bitte Eingaben prüfen.
                            </p>
                          )}
                        </div>

                        {/* Submit Button */}
                        <motion.div className="relative pt-2">
                          <motion.div
                            className="absolute -inset-[2px] rounded-full opacity-75"
                            style={{
                              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                              backgroundSize: '300% 100%',
                              filter: 'blur(8px)'
                            }}
                            animate={{
                              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                              opacity: [0.5, 0.8, 0.5]
                            }}
                            transition={{
                              backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
                              opacity: { duration: 2, repeat: Infinity }
                            }}
                          />
                          <motion.button
                            type="submit"
                            disabled={registerMutation.isPending}
                            whileHover={{ scale: registerMutation.isPending ? 1 : 1.02 }}
                            whileTap={{ scale: registerMutation.isPending ? 1 : 0.98 }}
                            className="relative w-full py-3.5 rounded-full font-bold text-sm tracking-wide overflow-hidden"
                            style={{
                              fontFamily: 'Orbitron, sans-serif',
                              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                              backgroundSize: '200% 100%',
                              color: '#ffffff',
                              cursor: registerMutation.isPending ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {!registerMutation.isPending && (
                              <motion.div
                                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                                }}
                                animate={{
                                  x: ['-100%', '100%']
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'linear'
                                }}
                              />
                            )}
                            <span className="relative flex items-center justify-center gap-2">
                              {registerMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
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

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-12 text-center text-[10px] text-gray-600 max-w-2xl"
        >
          <p>
            Präzision. Eleganz. Kraft. Das ist ARAS. Willkommen in der nächsten
            Ära der Kommunikation. Willkommen bei ARAS AI.
          </p>
        </motion.div>
      </div>

      {/* Load Orbitron Font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}