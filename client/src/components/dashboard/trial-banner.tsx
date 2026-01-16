import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, CreditCard, Sparkles, X, AlertTriangle } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface TrialBannerProps {
  trialEndDate: string | Date | null;
  subscriptionStatus: string;
  planName?: string;
}

export function TrialBanner({ trialEndDate, subscriptionStatus, planName }: TrialBannerProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  // Only show for trialing users
  const isTrialing = subscriptionStatus === "trialing";
  
  useEffect(() => {
    if (!trialEndDate || !isTrialing) return;

    const calculateTimeLeft = () => {
      const endDate = new Date(trialEndDate);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [trialEndDate, isTrialing]);

  if (!isTrialing || dismissed || !timeLeft) return null;

  const isUrgent = timeLeft.days <= 2;
  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative overflow-hidden rounded-lg border p-4 mb-6 ${
        isExpired
          ? "bg-red-500/10 border-red-500/50"
          : isUrgent
          ? "bg-orange-500/10 border-orange-500/50"
          : "bg-primary/10 border-primary/30"
      }`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      
      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${
            isExpired ? "bg-red-500/20" : isUrgent ? "bg-orange-500/20" : "bg-primary/20"
          }`}>
            {isExpired ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <Clock className={`w-5 h-5 ${isUrgent ? "text-orange-500" : "text-primary"}`} />
            )}
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              {isExpired ? (
                "Trial abgelaufen"
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  {planName || "PRO"} Trial aktiv
                </>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isExpired ? (
                "Ihr Trial ist abgelaufen. Upgrade jetzt, um weiter Zugriff zu haben."
              ) : (
                <>
                  Noch <span className="font-mono font-bold text-white">
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                  </span> verbleibend
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlowButton
            onClick={() => setLocation("/billing")}
            className="text-sm"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {isExpired ? "Jetzt upgraden" : "Plan verwalten"}
          </GlowButton>
          
          {!isExpired && !isUrgent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Countdown boxes for urgent state */}
      {isUrgent && !isExpired && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-orange-500/30"
        >
          <div className="flex justify-center gap-4">
            {[
              { value: timeLeft.days, label: "Tage" },
              { value: timeLeft.hours, label: "Stunden" },
              { value: timeLeft.minutes, label: "Minuten" },
              { value: timeLeft.seconds, label: "Sekunden" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="bg-card/80 border border-orange-500/30 rounded-lg px-3 py-2 min-w-[60px]">
                  <span className="text-2xl font-mono font-bold text-orange-500">
                    {String(item.value).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
