import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { GlowButton } from "@/components/ui/glow-button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, XCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Get token from URL
  const searchString = useSearch();
  const token = new URLSearchParams(searchString).get("token");

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setTokenValid(false);
        setErrorMessage("Kein Token vorhanden");
        return;
      }

      try {
        const response = await fetch(`/api/verify-reset-token?token=${token}`);
        const data = await response.json();
        
        setTokenValid(data.valid);
        if (!data.valid) {
          setErrorMessage(data.message || "Ungültiger oder abgelaufener Link");
        }
      } catch (error) {
        setTokenValid(false);
        setErrorMessage("Fehler bei der Token-Überprüfung");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Fehler",
        description: "Das Passwort muss mindestens 6 Zeichen haben.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResetSuccess(true);
        toast({
          title: "Erfolg!",
          description: "Dein Passwort wurde erfolgreich geändert.",
        });
      } else {
        toast({
          title: "Fehler",
          description: data.message || "Passwort konnte nicht geändert werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Verbindung zum Server fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Link wird überprüft...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid && !resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <h1 className="text-2xl font-orbitron font-bold mb-2">
                <GradientText>Link ungültig</GradientText>
              </h1>
              
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              
              <div className="space-y-4">
                <GlowButton 
                  onClick={() => setLocation("/forgot-password")}
                  className="w-full"
                >
                  Neuen Link anfordern
                </GlowButton>
                
                <Button
                  variant="outline"
                  onClick={() => setLocation("/auth")}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zur Anmeldung
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              
              <h1 className="text-2xl font-orbitron font-bold mb-2">
                <GradientText>Passwort geändert!</GradientText>
              </h1>
              
              <p className="text-muted-foreground mb-6">
                Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt mit deinem neuen Passwort anmelden.
              </p>
              
              <GlowButton 
                onClick={() => setLocation("/auth")}
                className="w-full"
              >
                Zur Anmeldung
              </GlowButton>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="p-8">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setLocation("/auth")}
                className="p-0 h-auto text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück zur Anmeldung
              </Button>
            </div>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-orbitron font-bold mb-2">
                <GradientText>Neues Passwort</GradientText>
              </h1>
              <p className="text-muted-foreground">
                Gib dein neues Passwort ein.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input 
                  id="confirmPassword" 
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                />
              </div>
              
              <GlowButton type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Wird gespeichert...</span>
                  </div>
                ) : (
                  "Passwort speichern"
                )}
              </GlowButton>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
