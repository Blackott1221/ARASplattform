import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { GlowButton } from "@/components/ui/glow-button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Users, Phone, ArrowRight, Eye, EyeOff, Check, CreditCard, Sparkles, Shield, Clock, Zap, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Plan type for pricing cards
interface Plan {
  id: string;
  name: string;
  price: number;
  aiMessagesLimit: number;
  voiceCallsLimit: number;
  features: string[];
  stripePriceId?: string;
  popular?: boolean;
}

export default function Signup() {
  const [step, setStep] = useState<'plan' | 'details'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Load plans from database (exclude FREE)
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['subscription-plans-signup'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription-plans');
      if (!response.ok) return [];
      const allPlans = await response.json();
      // Filter out FREE plan for new registrations
      return allPlans
        .filter((p: Plan) => p.id !== 'free' && p.stripePriceId)
        .map((p: Plan) => ({
          ...p,
          price: p.price / 100, // Convert cents to euros
          popular: p.id === 'pro' // Mark PRO as recommended
        }));
    },
  });

  const features = [
    {
      icon: <Bot className="w-5 h-5" />,
      title: "Eigenes LLM 'ARAS Core' - Keine Abhängigkeit von externen AI-Anbietern",
      delay: 0,
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "500+ parallele Anrufe mit menschlicher Sprachqualität",
      delay: 0.2,
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: "100% DSGVO-konform aus Schweizer Rechenzentren",
      delay: 0.4,
    },
  ];

  const passwordRequirements = [
    { text: "At least 8 characters", met: password.length >= 8 },
    { text: "One uppercase letter", met: /[A-Z]/.test(password) },
    { text: "One lowercase letter", met: /[a-z]/.test(password) },
    { text: "One number", met: /\d/.test(password) },
  ];

  // Handle plan selection
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setStep('details');
  };

  // Handle form submission - register with plan and redirect to Stripe
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      toast({
        title: "Plan erforderlich",
        description: "Bitte wählen Sie einen Plan aus",
        variant: "destructive",
      });
      setStep('plan');
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein",
        variant: "destructive",
      });
      return;
    }
    
    if (!agreeToTerms) {
      toast({
        title: "Fehler",
        description: "Bitte stimmen Sie den AGB zu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use new register-with-plan endpoint
      const response = await fetch('/api/register-with-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password,
          email,
          firstName,
          lastName,
          company,
          planId: selectedPlan
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registrierung fehlgeschlagen');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        toast({
          title: "Weiterleitung zu Stripe... 🔒",
          description: "Sie werden zur sicheren Zahlungsseite weitergeleitet.",
        });
        
        // Short delay for toast visibility, then redirect
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 500);
      } else {
        throw new Error('Keine Checkout-URL erhalten');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Registrierung fehlgeschlagen",
        description: error.message || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Get selected plan details
  const selectedPlanDetails = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {step === 'plan' ? (
          // STEP 1: Plan Selection
          <motion.div
            key="plan-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen py-12 px-4"
          >
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <GradientText className="text-4xl md:text-5xl font-orbitron font-bold">
                    Wählen Sie Ihren Plan
                  </GradientText>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-muted-foreground max-w-2xl mx-auto"
                >
                  Starten Sie mit einer <span className="text-primary font-semibold">7-tägigen kostenlosen Testphase</span>.
                  Jederzeit kündbar, keine versteckten Kosten.
                </motion.p>

                {/* Trial Benefits */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap justify-center gap-4 mt-6"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>7 Tage kostenlos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span>Kreditkarte erforderlich</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Jederzeit kündbar</span>
                  </div>
                </motion.div>
              </div>

              {/* Plan Cards */}
              {plansLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-muted rounded w-1/2 mb-4" />
                        <div className="h-10 bg-muted rounded w-1/3 mb-6" />
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map(j => <div key={j} className="h-4 bg-muted rounded" />)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card 
                        className={`relative cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                          plan.popular 
                            ? 'border-primary shadow-lg shadow-primary/20' 
                            : 'hover:border-primary/50'
                        } ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => handlePlanSelect(plan.id)}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <div className="bg-gradient-to-r from-primary to-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              EMPFOHLEN
                            </div>
                          </div>
                        )}
                        <CardHeader className="text-center pb-2">
                          <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                          <div className="mt-4">
                            <span className="text-4xl font-bold">€{plan.price}</span>
                            <span className="text-muted-foreground">/Monat</span>
                          </div>
                          <p className="text-sm text-primary mt-2">Nach 7 Tagen Testphase</p>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <ul className="space-y-3">
                            <li className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" />
                              <span className="text-sm">{plan.aiMessagesLimit.toLocaleString()} AI Nachrichten</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-primary" />
                              <span className="text-sm">{plan.voiceCallsLimit.toLocaleString()} Voice Calls</span>
                            </li>
                            {plan.features?.slice(0, 4).map((feature: string, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <GlowButton 
                            className={`w-full mt-6 ${!plan.popular ? 'bg-card border border-primary text-primary hover:bg-primary hover:text-white' : ''}`}
                            onClick={() => handlePlanSelect(plan.id)}
                          >
                            Plan auswählen
                          </GlowButton>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Login Link */}
              <div className="text-center mt-8">
                <p className="text-muted-foreground">
                  Bereits ARAS AI Nutzer?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
                    Zur Anmeldung
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          // STEP 2: Account Details
          <motion.div
            key="account-details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center py-12 px-4"
          >
            <div className="w-full max-w-lg">
              {/* Back Button */}
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setStep('plan')}
                className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Zurück zur Planauswahl</span>
              </motion.button>

              <Card className="border-primary/20">
                <CardContent className="p-8">
                  {/* Selected Plan Info */}
                  {selectedPlanDetails && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Ausgewählter Plan</p>
                          <p className="text-lg font-bold text-primary">{selectedPlanDetails.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">€{selectedPlanDetails.price}</p>
                          <p className="text-xs text-muted-foreground">nach 7 Tagen Trial</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-orbitron font-bold mb-2">
                      <GradientText>Konto erstellen</GradientText>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      7 Tage kostenlos testen, dann €{selectedPlanDetails?.price || 59}/Monat
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Vorname *</Label>
                        <Input 
                          id="firstName" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Max"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Nachname *</Label>
                        <Input 
                          id="lastName" 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Mustermann"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">E-Mail *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="max@firma.de"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="company">Firma (optional)</Label>
                      <Input 
                        id="company" 
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Ihre Firma GmbH"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Passwort *</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mindestens 8 Zeichen"
                          required
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {password && (
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {passwordRequirements.map((req, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs">
                              <Check className={`w-3 h-3 ${req.met ? 'text-green-500' : 'text-muted-foreground'}`} />
                              <span className={req.met ? 'text-green-500' : 'text-muted-foreground'}>{req.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Passwort bestätigen *</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword" 
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Passwort wiederholen"
                          required
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwörter stimmen nicht überein</p>
                      )}
                    </div>
                    
                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox 
                        id="terms"
                        checked={agreeToTerms}
                        onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                        Ich stimme den{" "}
                        <Link href="/terms" className="text-primary hover:text-primary/80">AGB</Link>
                        {" "}und der{" "}
                        <Link href="/privacy" className="text-primary hover:text-primary/80">Datenschutzerklärung</Link>
                        {" "}zu. Ich verstehe, dass nach der 7-tägigen Testphase €{selectedPlanDetails?.price || 59}/Monat berechnet werden.
                      </Label>
                    </div>
                    
                    <GlowButton type="submit" className="w-full mt-4" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Weiterleitung zu Stripe...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>7 Tage kostenlos starten</span>
                        </div>
                      )}
                    </GlowButton>

                    <p className="text-xs text-center text-muted-foreground mt-4">
                      <Shield className="w-3 h-3 inline mr-1" />
                      Sichere Zahlung über Stripe. Ihre Daten sind geschützt.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}