import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradientText } from "@/components/ui/gradient-text";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  // Redirect if already authenticated (unverändert)
  if (!isLoading && user) {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Dezente ARAS-Verlaufsfläche */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 20%, rgba(254,145,0,.10) 0%, transparent 60%), radial-gradient(60% 60% at 80% 80%, rgba(163,78,0,.08) 0%, transparent 60%), radial-gradient(50% 50% at 50% 50%, rgba(233,215,196,.06) 0%, transparent 60%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        {/* Schlanke Lade-Line statt Icon */}
        <div className="w-64 h-[2px] bg-white/10 overflow-hidden rounded">
          <motion.div
            className="h-full"
            style={{
              background:
                "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00, #FE9100, #E9D7C4)",
              backgroundSize: "300% 100%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync(loginData);
      toast({ title: "Welcome back!", description: "You have been successfully logged in." });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync(registerData);
      toast({ title: "Account Created!", description: "Welcome to ARAS AI. You are now logged in." });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  // Hilfs-Styles für ARAS-CI
  const glass = "bg-white/[0.03] backdrop-blur-sm border border-white/10";
  const focusRing =
    "focus:outline-none focus:ring-4 focus:ring-[#FE9100]/10 focus:border-[#FE9100]/50";

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* ARAS Hintergrund – dezent & edel */}
      <motion.div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 30%, rgba(254,145,0,.12) 0%, transparent 60%), radial-gradient(60% 60% at 80% 70%, rgba(163,78,0,.10) 0%, transparent 60%), radial-gradient(50% 50% at 50% 50%, rgba(233,215,196,.06) 0%, transparent 60%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.20 }}
        transition={{ duration: 0.8 }}
      />

      {/* Inhalt */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* LEFT: Hero-Panel mit Copy (WOW, keine Icons/Emojis) */}
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
          className="order-2 lg:order-1"
        >
          <div className="space-y-6">
            <h1 className="font-orbitron font-extrabold tracking-tight leading-none">
              <span
                className="text-[44px] md:text-[56px]"
                style={{
                  background:
                    "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00, #FE9100, #E9D7C4)",
                  backgroundSize: "300% 100%",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ARAS AI — Die Outbound-KI
              </span>
            </h1>

            <div className="space-y-2 text-[15px] leading-relaxed text-gray-300">
              <p className="font-semibold">Die Stimme, die verkauft.</p>
              <p>Echte Gespräche. Echte Resultate.</p>
              <p>ARAS AI führt tausende Anrufe gleichzeitig — und klingt dabei wie ein Mensch.</p>

              {/* Typing-Line: „Du liest … / Du hörst sie.“ */}
              <div className="pt-2">
                <motion.span
                  className="inline-block text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Du liest nicht über die Zukunft.
                </motion.span>
                <motion.div
                  className="text-[16px] font-medium"
                  style={{ color: "#FE9100" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  Du hörst sie.
                </motion.div>
              </div>
            </div>

            <div className={`${glass} rounded-xl p-5`}>
              <div className="text-sm text-gray-400">
                <div className="mb-1">
                  <span className="text-gray-200">Aktuell in der Alpha-Phase.</span>
                </div>
                <p>ARAS AI ist live — aber nur für ausgewählte Nutzer. Jeder Zugang ist persönlich vergeben, jede Rückmeldung verbessert das System.</p>
                <p className="mt-2">Offizieller globaler Launch: <span className="text-gray-200">01.01.2026</span>.</p>
              </div>
            </div>

            <div className="space-y-3 text-[15px] text-gray-300">
              <p className="font-semibold">Jetzt kostenlos testen.</p>
              <p>Erlebe, was bisher keine Software geschafft hat. Erstelle deinen kostenlosen Alpha-Account, führe deine ersten zwei echten Anrufe durch und teste die ARAS-Chatfunktion.</p>
              <p className="text-gray-400">Keine Kosten. Keine Verpflichtung. Keine Installation.</p>
              <div>
                <Button
                  className="mt-2 px-6 py-5 text-sm font-semibold rounded-full transition-all"
                  onClick={() => setActiveTab("register")}
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    background:
                      "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00)",
                    backgroundSize: "220% 100%",
                    color: "#fff",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundPosition = "100% 50%")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundPosition = "0% 50%")}
                >
                  Alpha-Zugang aktivieren
                </Button>
              </div>
            </div>

            <div className="pt-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Entwickelt von der Schwarzott Group</div>
              <div className="text-sm text-gray-300">
                Gebaut in der Schweiz. Betrieben von einem eigenen, unabhängigen Sprachmodell. Entworfen, um Kommunikation völlig neu zu definieren.
              </div>
              <div className="text-sm text-gray-300 mt-1">Präzision. Eleganz. Kraft. Das ist ARAS.</div>
            </div>

            <div className={`${glass} rounded-xl p-5`}>
              <div className="text-sm text-gray-200 font-medium">Wenn du diese Seite siehst, wurdest du ausgewählt.</div>
              <div className="text-sm text-gray-400 mt-1">
                Der Zugang zur Plattform ist nur auf persönliche Einladung möglich. Du bist Teil der ersten Generation, die die menschlichste KI-Stimme der Welt erlebt.
              </div>
              <div className="text-sm text-gray-200 mt-2">Willkommen in der nächsten Ära der Kommunikation. Willkommen bei ARAS AI.</div>
            </div>
          </div>
        </motion.section>

        {/* RIGHT: Auth-Karte (Tabs) */}
        <motion.section
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
          className="order-1 lg:order-2"
        >
          <div className="w-full max-w-md ml-auto">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-orbitron font-bold mb-1">
                <GradientText>ARAS AI</GradientText>
              </h2>
              <p className="text-gray-400 text-sm">AI-Powered Sales Automation</p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
              <TabsList className={`grid w-full grid-cols-2 mb-6 ${glass} rounded-full`}>
                <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-white/5">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="rounded-full data-[state=active]:bg-white/5">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login">
                <Card className={`${glass} bg-black/40`}>
                  <CardHeader>
                    <CardTitle className="tracking-tight">Welcome Back</CardTitle>
                    <CardDescription>Sign in to your ARAS AI account to continue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                          id="login-username"
                          type="text"
                          value={loginData.username}
                          onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter your username"
                          className={focusRing}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            value={loginData.password}
                            onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter your password"
                            className={focusRing}
                            required
                          />
                          {/* Toggler ohne Icon */}
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            {showPassword ? "verbergen" : "anzeigen"}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full rounded-full" disabled={loginMutation.isPending}
                        style={{
                          fontFamily: "Orbitron, sans-serif",
                          background: "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00)",
                          backgroundSize: "220% 100%",
                          color: "#fff",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundPosition = "100% 50%")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundPosition = "0% 50%")}
                      >
                        {loginMutation.isPending ? "Signing In…" : "Sign In"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="register">
                <Card className={`${glass} bg-black/40`}>
                  <CardHeader>
                    <CardTitle className="tracking-tight">Create Account</CardTitle>
                    <CardDescription>Join ARAS AI and start automating your sales process</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstName">First Name</Label>
                          <Input
                            id="register-firstName"
                            type="text"
                            value={registerData.firstName}
                            onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="John"
                            className={focusRing}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-lastName">Last Name</Label>
                          <Input
                            id="register-lastName"
                            type="text"
                            value={registerData.lastName}
                            onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Doe"
                            className={focusRing}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-username">Username</Label>
                        <Input
                          id="register-username"
                          type="text"
                          value={registerData.username}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Choose a username"
                          className={focusRing}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="john@example.com"
                          className={focusRing}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            value={registerData.password}
                            onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Create a strong password"
                            className={focusRing}
                            required
                            minLength={6}
                          />
                          {/* Toggler ohne Icon */}
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            {showPassword ? "verbergen" : "anzeigen"}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full rounded-full" disabled={registerMutation.isPending}
                        style={{
                          fontFamily: "Orbitron, sans-serif",
                          background: "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00)",
                          backgroundSize: "220% 100%",
                          color: "#fff",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundPosition = "100% 50%")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundPosition = "0% 50%")}
                      >
                        {registerMutation.isPending ? "Creating Account…" : "Create Account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
