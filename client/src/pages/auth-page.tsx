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
import { GradientText } from "@/components/ui/gradient-text";
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

  // Typing animation
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

  // Redirect if already authenticated
  if (!isLoading && user) {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050607] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FE9100]" />
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
    <div className="min-h-screen bg-[#050607] text-white relative">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0 0, rgba(254,145,0,0.18), transparent 60%), radial-gradient(circle at 100% 100%, rgba(233,215,196,0.12), transparent 55%)"
          }}
        />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
            backgroundSize: "18px 18px"
          }}
        />
      </div>

      <div className="relative w-full max-w-5xl mx-auto px-6 py-10 md:py-16 pb-20 flex flex-col items-center">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center rounded-full border border-[#FE9100]/40 bg-black/60 px-4 py-1 text-xs tracking-[0.16em] uppercase">
            <span className="mr-2 h-1 w-1 rounded-full bg-[#FE9100]" />
            <span className="text-[11px] text-[#f3e2cf]">
              Pre-Launch Phase • Alpha Access
            </span>
          </div>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto mb-10"
        >
          <h1
            className="text-5xl md:text-6xl font-orbitron font-semibold tracking-[0.18em] mb-4"
            style={{
              background:
                "linear-gradient(90deg,#a36a2b,#e9d7c4,#FE9100,#e9d7c4,#a36a2b)",
              backgroundSize: "260% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            <motion.span
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              ARAS AI
            </motion.span>
          </h1>

          <p className="text-xs md:text-sm uppercase tracking-[0.28em] text-[#f0e1cd]/70 mb-6">
            Die Outbound-KI
          </p>

          {/* Typed line */}
          <div className="h-7 mb-5 flex items-center justify-center">
            <span
              className="text-sm md:text-base text-[#f6e5d2]"
              style={{ fontFamily: "Orbitron, system-ui, sans-serif" }}
            >
              {typedText}
              <motion.span
                className="ml-1 inline-block h-[18px] w-[2px] bg-[#FE9100]"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            </span>
          </div>

          <div className="space-y-2 text-[13px] md:text-sm text-zinc-300 leading-relaxed">
            <p>Echte Gespräche. Echte Resultate.</p>
            <p>
              ARAS AI führt tausende Anrufe gleichzeitig – und klingt dabei wie ein
              Mensch.
            </p>
            <p>Du liest nicht über die Zukunft. Du hörst sie.</p>
          </div>

          <div className="mt-6 space-y-1 text-[11px] md:text-xs text-zinc-400">
            <p>Aktuell in der Alpha-Phase.</p>
            <p>
              ARAS AI ist live – aber nur für ausgewählte Nutzer. Jeder Zugang ist
              persönlich vergeben, jede Rückmeldung verbessert das System.
            </p>
            <p>Offizieller globaler Launch: 01.01.2026.</p>
          </div>
        </motion.div>

        {/* Auth surface */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-3xl mb-8"
        >
          <div className="rounded-3xl border border-white/8 bg-black/75 backdrop-blur-xl shadow-[0_22px_80px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Top copy + CTA */}
            <div className="px-6 pt-6 pb-4 md:px-8 md:pt-7">
              <p className="text-[12px] md:text-xs text-zinc-200 mb-1">
                Jetzt kostenlos testen.
              </p>
              <p className="text-[12px] md:text-xs text-zinc-400 mb-4">
                Erstelle deinen kostenlosen Alpha-Account, führe deine ersten zwei
                echten Anrufe durch und teste die ARAS-Chatfunktion. Keine Kosten.
                Keine Verpflichtung. Keine Installation.
              </p>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Alpha access pill – animierter Rahmen */}
                <motion.button
                  type="button"
                  className="relative inline-flex items-center justify-between rounded-full px-[1px] py-[1px]"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  style={{
                    background:
                      "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                    backgroundSize: "260% 100%"
                  }}
                >
                  <div className="flex items-center justify-between rounded-full bg-black/90 px-4 py-2 text-[12px] md:text-xs text-zinc-50 tracking-wide">
                    <span>Kein Zugang? Alpha-Zugang aktivieren</span>
                    <span className="ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-400/80">
                      <span className="block h-2 w-2 border-l border-b border-zinc-300 rotate-45 -translate-y-[1px]" />
                    </span>
                  </div>
                </motion.button>

                <div className="text-[10px] md:text-[11px] text-zinc-500 text-right md:text-left">
                  <p>Entwickelt von der Schwarzott Group</p>
                  <p>
                    Gebaut in der Schweiz. Betrieben von einem eigenen, unabhängigen
                    Sprachmodell.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5" />

            {/* Tabs + forms */}
            <Tabs defaultValue="login" className="w-full">
              <div className="px-6 pt-4 md:px-8">
                <TabsList className="grid w-full grid-cols-2 bg-transparent border border-white/10 rounded-full p-1">
                  <TabsTrigger
                    value="login"
                    className="rounded-full data-[state=active]:bg-white/5 data-[state=active]:text-white text-xs md:text-sm"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-full data-[state=active]:bg-white/5 data-[state=active]:text-white text-xs md:text-sm"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* LOGIN */}
              <TabsContent value="login">
                <Card className="mt-4 border-0 bg-transparent shadow-none">
                  <CardHeader className="px-6 md:px-8 pb-2">
                    <CardTitle className="text-sm md:text-base">
                      Login für ausgewählte Nutzer
                    </CardTitle>
                    <CardDescription className="text-xs md:text-[13px] text-zinc-400">
                      Melde dich mit deinen Zugangsdaten an, um ARAS AI zu
                      verwenden.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 md:px-8 pb-6 md:pb-8">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2 text-xs md:text-sm">
                        <Label htmlFor="login-username">Username</Label>
                        <div className="relative group">
                          <motion.div
                            className="pointer-events-none absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-100"
                            animate={{
                              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                            }}
                            transition={{
                              duration: 8,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            style={{
                              background:
                                "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                              backgroundSize: "260% 100%"
                            }}
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
                            className="relative bg-black/60 border border-white/15 focus:border-[#FE9100]/70 focus:ring-0 text-sm rounded-xl group-hover:border-white/25 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-xs md:text-sm">
                        <Label htmlFor="login-password">Passwort</Label>
                        <div className="relative group">
                          <motion.div
                            className="pointer-events-none absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-100"
                            animate={{
                              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                            }}
                            transition={{
                              duration: 8,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            style={{
                              background:
                                "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                              backgroundSize: "260% 100%"
                            }}
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
                            className="relative bg-black/60 border border-white/15 focus:border-[#FE9100]/70 focus:ring-0 text-sm rounded-xl pr-10 group-hover:border-white/25 transition-colors"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-zinc-400" />
                            )}
                          </Button>
                        </div>
                        {loginMutation.isError && (
                          <p className="text-[11px] text-red-400">
                            Login fehlgeschlagen. Bitte Zugangsdaten prüfen.
                          </p>
                        )}
                      </div>

                      <motion.button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="relative w-full mt-2 rounded-full text-sm font-medium tracking-wide overflow-hidden"
                      >
                        <motion.div
                          className="absolute inset-0"
                          animate={{
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                          }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          style={{
                            background:
                              "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                            backgroundSize: "260% 100%"
                          }}
                        />
                        <div className="relative flex items-center justify-center px-4 py-3 bg-black/20">
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing In...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </div>
                      </motion.button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="register">
                <Card className="mt-4 border-0 bg-transparent shadow-none">
                  <CardHeader className="px-6 md:px-8 pb-2">
                    <CardTitle className="text-sm md:text-base">
                      Alpha-Account erstellen
                    </CardTitle>
                    <CardDescription className="text-xs md:text-[13px] text-zinc-400">
                      Wenn du diese Seite siehst, wurdest du ausgewählt. Du bist
                      Teil der ersten Generation, die die menschlichste KI-Stimme
                      der Welt erlebt.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 md:px-8 pb-6 md:pb-8">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 text-xs md:text-sm">
                          <Label htmlFor="register-firstName">Vorname</Label>
                          <div className="relative group">
                            <motion.div
                              className="pointer-events-none absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-100"
                              animate={{
                                backgroundPosition: [
                                  "0% 50%",
                                  "100% 50%",
                                  "0% 50%"
                                ]
                              }}
                              transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                              style={{
                                background:
                                  "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                                backgroundSize: "260% 100%"
                              }}
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
                              className="relative bg-black/60 border border-white/15 focus:border-[#FE9100]/70 focus:ring-0 text-sm rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-2 text-xs md:text-sm">
                          <Label htmlFor="register-lastName">Nachname</Label>
                          <div className="relative group">
                            <motion.div
                              className="pointer-events-none absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-100"
                              animate={{
                                backgroundPosition: [
                                  "0% 50%",
                                  "100% 50%",
                                  "0% 50%"
                                ]
                              }}
                              transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                              style={{
                                background:
                                  "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                                backgroundSize: "260% 100%"
                              }}
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
                              className="relative bg-black/60 border border-white/15 focus:border-[#FE9100]/70 focus:ring-0 text-sm rounded-xl"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs md:text-sm">
                        <Label htmlFor="register-username">Username</Label>
                        <div className="relative group">
                          <motion.div
                            className="pointer-events-none absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-100"
                            animate={{
                              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                            }}
                            transition={{
                              duration: 8,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            style={{
                              background:
                                "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                              backgroundSize: "260% 100%"
                            }}
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
                            className="relative bg-black/60 border border-white/15 focus:border-[#FE9100]/70 focus:ring-0 text-sm rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-xs md:text-sm">
                        <Label htmlFor="register-email">E-Mail</Label>
                        <div className="relative group">
                          <motion.div
                            className="pointer-events-none absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-100"
                            animate={{
                              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                            }}
                            transition={{
                              duration: 8,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            style={{
                              background:
                                "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                              backgroundSize: "260% 100%"
                            }}
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
                            className="relative bg-black/60 border border-white/15 focus:border-[#FE9100]/70 focus:ring-0 text-sm rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-xs md:text-sm">
                        <Label htmlFor="register-password">Passwort</Label>
                        <div className="relative group">
                          <motion.div
                            className="pointer-events-none absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-60 group-focus-within:opacity-100"
                            animate={{
                              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                            }}
                            transition={{
                              duration: 8,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            style={{
                              background:
                                "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                              backgroundSize: "260% 100%"
                            }}
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
                            className="relative bg-black/60 border border-white/15 focus:border-[#FE9100]/70 focus:ring-0 text-sm rounded-xl pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-zinc-400" />
                            )}
                          </Button>
                        </div>
                        {registerPasswordTooShort && (
                          <p className="text-[11px] text-red-400">
                            Bitte ein längeres Passwort, für deine Sicherheit.
                          </p>
                        )}
                        {registerMutation.isError && (
                          <p className="text-[11px] text-red-400">
                            Registrierung fehlgeschlagen. Bitte Eingaben prüfen.
                          </p>
                        )}
                      </div>

                      <motion.button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="relative w-full mt-2 rounded-full text-sm font-medium tracking-wide overflow-hidden"
                      >
                        <motion.div
                          className="absolute inset-0"
                          animate={{
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                          }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          style={{
                            background:
                              "linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)",
                            backgroundSize: "260% 100%"
                          }}
                        />
                        <div className="relative flex items-center justify-center px-4 py-3 bg-black/20">
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            "Alpha-Account erstellen"
                          )}
                        </div>
                      </motion.button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 mb-10 text-center text-[10px] md:text-[11px] text-zinc-500">
          <p>
            Präzision. Eleganz. Kraft. Das ist ARAS. Willkommen in der nächsten
            Ära der Kommunikation. Willkommen bei ARAS AI.
          </p>
        </div>
      </div>
    </div>
  );
}
