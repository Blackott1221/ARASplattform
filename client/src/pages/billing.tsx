import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { CurrentPlan } from "@/components/billing/current-plan";
import { PricingCards } from "@/components/billing/pricing-cards";
import { PaymentSetup } from "@/components/billing/payment-setup";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Sparkles } from "lucide-react";
import type { User, SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

export default function Billing() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: userSubscription, refetch: refetchSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <img src={arasLogo} alt="Loading" className="w-16 h-16 object-contain" />
        </motion.div>
      </div>
    );
  }

  const subscriptionData: SubscriptionResponse = userSubscription || {
    plan: 'free',
    status: 'active',
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: 10,
    voiceCallsLimit: 2,
    renewalDate: null,
    trialMessagesUsed: 0,
    trialEndDate: null,
    hasPaymentMethod: false,
    requiresPaymentSetup: false,
    isTrialActive: false,
    canUpgrade: true
  };

  const handlePaymentSetup = (planId?: string) => {
    if (planId) {
      setSelectedPlanId(planId);
    } else {
      setSelectedPlanId(null);
    }
    setShowPaymentSetup(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentSetup(false);
    
    if (selectedPlanId) {
      try {
        const response = await fetch("/api/upgrade-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: selectedPlanId }),
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: "Plan erfolgreich aktualisiert",
            description: `Willkommen beim ${selectedPlanId.toUpperCase()} Plan!`,
          });
        } else {
          try {
            const errorData = await response.json();
            toast({
              title: "Upgrade fehlgeschlagen",
              description: errorData.message || "Das Upgrade konnte nicht abgeschlossen werden",
              variant: "destructive",
            });
          } catch (jsonError) {
            toast({
              title: "Upgrade fehlgeschlagen",
              description: "Das Upgrade konnte nicht abgeschlossen werden",
              variant: "destructive",
            });
          }
        }
      } catch (error: any) {
        console.error("Payment completion error:", error);
        toast({
          title: "Fehler",
          description: "Das Upgrade konnte nach der Zahlungseinrichtung nicht abgeschlossen werden",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Zahlungsmethode hinzugefügt",
        description: "Ihre Zahlungsmethode wurde erfolgreich gespeichert",
      });
    }
    
    setSelectedPlanId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
  };

  const handlePlanUpgrade = async (planId: string) => {
    try {
      const response = await fetch("/api/upgrade-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Plan erfolgreich aktualisiert",
          description: `Willkommen beim ${planId.toUpperCase()} Plan!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
      } else if (response.status === 402) {
        handlePaymentSetup(planId);
        return;
      } else {
        let title = "Upgrade fehlgeschlagen";
        let description = "Das Abonnement konnte nicht aktualisiert werden";

        try {
          const errorData = await response.json();
          description = errorData.message || description;

          switch (response.status) {
            case 401:
              title = "Authentifizierung erforderlich";
              description = "Bitte melden Sie sich erneut an, um fortzufahren";
              break;
            case 403:
              title = "Zugriff verweigert";
              description = "Sie haben keine Berechtigung für diese Aktion";
              break;
            case 404:
              title = "Plan nicht gefunden";
              description = "Der ausgewählte Plan ist nicht mehr verfügbar. Bitte aktualisieren Sie die Seite";
              break;
            case 409:
              title = "Upgrade-Konflikt";
              description = "Ihr Abonnementstatus hat sich geändert. Bitte aktualisieren Sie die Seite";
              break;
            case 422:
              title = "Ungültige Plan-Auswahl";
              description = errorData.message || "Der ausgewählte Plan kann nicht aktiviert werden";
              break;
            case 429:
              title = "Zu viele Anfragen";
              description = "Bitte warten Sie einen Moment und versuchen Sie es erneut";
              break;
            case 500:
              title = "Serverfehler";
              description = "Ein Problem ist aufgetreten. Bitte versuchen Sie es in einigen Momenten erneut";
              break;
            case 503:
              title = "Service nicht verfügbar";
              description = "Der Abrechnungsservice ist vorübergehend nicht verfügbar";
              break;
            default:
              title = "Upgrade fehlgeschlagen";
              description = errorData.message || `Upgrade fehlgeschlagen mit Fehler ${response.status}`;
          }
        } catch (jsonError) {
          if (response.status === 0 || !navigator.onLine) {
            title = "Verbindungsfehler";
            description = "Bitte überprüfen Sie Ihre Internetverbindung";
          } else {
            title = "Upgrade fehlgeschlagen";
            description = `Server-Fehler ${response.status}. Bitte kontaktieren Sie den Support`;
          }
        }

        toast({
          title,
          description,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Plan upgrade error:', error);
      
      let title = "Upgrade-Fehler";
      let description = "Plan-Upgrade fehlgeschlagen";

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        title = "Verbindungsfehler";
        description = "Verbindung zum Server nicht möglich. Bitte überprüfen Sie Ihre Internetverbindung";
      } else if (error.name === 'AbortError') {
        title = "Zeitüberschreitung";
        description = "Die Anfrage wurde unterbrochen. Bitte versuchen Sie es erneut";
      } else if (!navigator.onLine) {
        title = "Keine Internetverbindung";
        description = "Sie scheinen offline zu sein. Bitte überprüfen Sie Ihre Verbindung";
      } else {
        description = error.message || "Ein unerwarteter Fehler ist aufgetreten";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/10 via-transparent to-[#a34e00]/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(254, 145, 0, 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(163, 78, 0, 0.06) 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, rgba(233, 215, 196, 0.04) 0%, transparent 70%)`
        }} />
      </div>

      <Sidebar 
        activeSection="billing" 
        onSectionChange={() => {}}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative z-10 content-zoom">
        <TopBar 
          currentSection="billing" 
          subscriptionData={subscriptionData}
          user={user as User}
          isVisible={true}
        />

        <div className="flex-1 overflow-y-auto premium-scroll">
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
              className="text-center mb-16"
            >
              <motion.div
                className="inline-flex items-center gap-3 mb-4"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(254, 145, 0, 0.2)',
                    '0 0 30px rgba(254, 145, 0, 0.4)',
                    '0 0 20px rgba(254, 145, 0, 0.2)'
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '16px',
                  background: 'rgba(254, 145, 0, 0.1)',
                  border: '1px solid rgba(254, 145, 0, 0.2)'
                }}
              >
                <CreditCard className="w-6 h-6 text-[#FE9100]" />
                <h1 
                  className="text-4xl font-black tracking-tight"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  ABONNEMENT
                </h1>
              </motion.div>
              <p className="text-gray-400 text-lg">
                Verwalten Sie Ihr ARAS AI Abonnement und wählen Sie den perfekten Plan
              </p>
            </motion.div>

            {/* Current Plan */}
            <CurrentPlan user={user} subscription={subscriptionData} />

            {/* Pricing Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-[#FE9100]" />
                  <h2 
                    className="text-3xl font-black tracking-tight"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Verfügbare Pläne
                  </h2>
                </div>
                <p className="text-gray-400 mb-8">
                  Wählen Sie den Plan, der am besten zu Ihren Anforderungen passt
                </p>
              </div>

              <PricingCards 
                subscription={subscriptionData}
                onPaymentSetup={handlePaymentSetup}
                onPlanUpgrade={handlePlanUpgrade}
              />
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-16 text-center"
            >
              <div 
                className="inline-flex items-center gap-6 px-8 py-4 rounded-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-400">DSGVO-konform</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-400">Swiss Hosting</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-sm text-gray-400">24/7 Support</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <PaymentSetup
          isOpen={showPaymentSetup}
          onClose={() => {
            setShowPaymentSetup(false);
            setSelectedPlanId(null);
          }}
          onSuccess={handlePaymentSuccess}
          selectedPlan={selectedPlanId}
        />
      </div>

      {/* ARAS Font */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" 
        rel="stylesheet" 
      />

      {/* Premium Scrollbar */}
      <style>{`
        .premium-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .premium-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .premium-scroll::-webkit-scrollbar-thumb {
          background: rgba(254, 145, 0, 0.3);
          border-radius: 10px;
        }
        .premium-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(254, 145, 0, 0.5);
        }
      `}</style>
    </div>
  );
}