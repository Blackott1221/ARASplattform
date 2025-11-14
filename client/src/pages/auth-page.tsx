import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  if (!isLoading && user) {
    setLocation("/");
    return null;
  }

  // LOADING SCREEN
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(254,145,0,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(233,215,196,0.1) 0%, transparent 50%)",
          }}
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="w-64 h-[2px] bg-white/10 overflow-hidden rounded-full"
        >
          <motion.div
            className="h-full"
            style={{
              background:
                "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00, #FE9100)",
              backgroundSize: "300% 100%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    );
  }

  const handleLogin = async (e: any) => {
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

  const handleRegister = async (e: any) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync(registerData);
      toast({
        title: "Account Created!",
        description: "Welcome to ARAS AI.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  // Glass + Glow style
  const panel = "bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl";

  const inputStyle =
    "w-full bg-black/50 border border-white/10 text-white placeholder-gray-500 rounded-lg px-4 py-3 focus:border-[#FE9100]/40 focus:ring-4 focus:ring-[#FE9100]/10 transition-all";

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center px-6">

      {/* BACKGROUND with ARAS Glow */}
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(254,145,0,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(233,215,196,0.07) 0%, transparent 50%)",
        }}
        animate={{ opacity: [0.25, 0.35, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* CONTAINER */}
      <div className="relative z-10 w-full max-w-2xl text-center">

        {/* TITLE */}
        <motion.h1
          className="text-[54px] font-orbitron font-extrabold mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00, #FE9100)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          transition={{ duration: 0.8 }}
        >
          ARAS AI
        </motion.h1>

        {/* INTRO */}
        <motion.div
          className="text-gray-300 text-sm md:text-[15px] leading-relaxed space-y-2 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <p>Die Outbound-KI. Die Stimme, die verkauft.</p>
          <p>Echte Gespräche. Echte Resultate.</p>
          <p>ARAS AI führt tausende Anrufe gleichzeitig — und klingt wie ein Mensch.</p>

          <motion.p
            className="pt-2 font-semibold"
            style={{ color: "#FE9100" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Du hörst die Zukunft.
          </motion.p>

          <p className="text-gray-400">Aktuell in der Alpha-Phase.</p>
          <p className="text-gray-400">Zugang nur für ausgewählte Nutzer.</p>
          <p className="text-gray-200">Offizieller Launch: 01.01.2026</p>
        </motion.div>

        {/* PANEL */}
        <motion.div
          className={`mx-auto w-full max-w-md p-8 ${panel}`}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-orbitron font-semibold mb-4 text-white">Zugang</h2>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="text-left">
                    <Label className="text-gray-300">Username</Label>
                    <Input
                      className={inputStyle}
                      value={loginData.username}
                      onChange={(e) =>
                        setLoginData({ ...loginData, username: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="text-left">
                    <Label className="text-gray-300">Password</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      className={inputStyle}
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-gray-500 hover:text-gray-300 mt-1"
                    >
                      {showPassword ? "verbergen" : "anzeigen"}
                    </button>
                  </div>

                  <Button
                    className="w-full rounded-full py-3 mt-2"
                    disabled={loginMutation.isPending}
                    style={{
                      background:
                        "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00)",
                      backgroundSize: "220% 100%",
                      fontFamily: "Orbitron",
                    }}
                  >
                    Zugang öffnen
                  </Button>

                  <p className="text-xs text-gray-500 mt-3">
                    Kein Zugang?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-[#FE9100] hover:text-[#E9D7C4]"
                    >
                      Alpha-Zugang aktivieren
                    </button>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-orbitron font-semibold mb-4 text-white">
                  Alpha-Zugang
                </h2>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
                      <Label className="text-gray-300">First Name</Label>
                      <Input
                        className={inputStyle}
                        value={registerData.firstName}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            firstName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="text-left">
                      <Label className="text-gray-300">Last Name</Label>
                      <Input
                        className={inputStyle}
                        value={registerData.lastName}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            lastName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="text-left">
                    <Label className="text-gray-300">Username</Label>
                    <Input
                      className={inputStyle}
                      value={registerData.username}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          username: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="text-left">
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      className={inputStyle}
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="text-left">
                    <Label className="text-gray-300">Password</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      className={inputStyle}
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-gray-500 hover:text-gray-300 mt-1"
                    >
                      {showPassword ? "verbergen" : "anzeigen"}
                    </button>
                  </div>

                  <Button
                    className="w-full rounded-full py-3 mt-2"
                    disabled={registerMutation.isPending}
                    style={{
                      background:
                        "linear-gradient(90deg, #E9D7C4, #FE9100, #A34E00)",
                      backgroundSize: "220% 100%",
                      fontFamily: "Orbitron",
                    }}
                  >
                    Zugang erzeugen
                  </Button>

                  <p className="text-xs text-gray-500 mt-3">
                    Bereits Zugang?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-[#FE9100] hover:text-[#E9D7C4]"
                    >
                      Einloggen
                    </button>
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* FOOTER NOTE */}
        <motion.p
          className="text-xs text-gray-500 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Entwickelt von der Schwarzott Group — Schweiz
        </motion.p>
      </div>
    </div>
  );
}
