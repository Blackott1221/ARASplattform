import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlowButton } from "@/components/ui/glow-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { SubscriptionResponse } from "@shared/schema";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PricingCardsProps {
  subscription?: SubscriptionResponse;
  onPaymentSetup?: (planId?: string) => void;
  onPlanUpgrade?: (planId: string) => void;
}

export function PricingCards({ subscription, onPaymentSetup, onPlanUpgrade }: PricingCardsProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  // Load plans from database
  const { data: dbPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription-plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return response.json();
    }
  });

  // Map database plans to UI format with proper pricing
  const plans = dbPlans ? dbPlans.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price / 100, // Convert cents to euros
    trialMessages: 0,
    aiMessages: plan.aiMessagesLimit,
    voiceCalls: plan.voiceCallsLimit,
    features: plan.features || [],
    popular: plan.id === 'ultra', // Mark Ultra as popular
    trialAvailable: false,
    stripePriceId: plan.stripePriceId, // Include Stripe info
    available: plan.id === 'free' || !!plan.stripePriceId // Available if free or has Stripe config
  })) : [
    // Fallback plans if API fails
    {
      id: "free",
      name: "ARAS Free – Discover Mode",
      price: 0,
      trialMessages: 0,
      aiMessages: 10,
      voiceCalls: 2,
      features: [
        "2 kostenlose Outbound Calls",
        "10 freie Chatnachrichten",
        "Zugriff auf die ARAS-Konsole (Basic)"
      ],
      popular: false,
      trialAvailable: false,
    },
    {
      id: "pro",
      name: "ARAS Pro – Growth Mode",
      price: 59,
      trialMessages: 0,
      aiMessages: 500,
      voiceCalls: 100,
      features: [
        "100 Outbound Calls pro Monat",
        "500 Chatnachrichten pro Monat",
        "E-Mail-Support"
      ],
      popular: false,
      trialAvailable: false,
    },
    {
      id: "ultra",
      name: "ARAS Ultra – Performance Mode",
      price: 249,
      trialMessages: 0,
      aiMessages: 10000,
      voiceCalls: 1000,
      features: [
        "1.000 Outbound Calls pro Monat",
        "10.000 Chatnachrichten pro Monat",
        "Priorisierter Support"
      ],
      popular: true,
      trialAvailable: false,
    },
    {
      id: "ultimate",
      name: "ARAS Ultimate – Enterprise Mode",
      price: 1990,
      trialMessages: 0,
      aiMessages: null,
      voiceCalls: 10000,
      features: [
        "10.000 Outbound Calls pro Monat",
        "Unbegrenzte Chatnachrichten",
        "24/7 Premium-Support"
      ],
      popular: false,
      trialAvailable: false,
    },
  ];

  const handlePlanSelect = async (planId: string) => {
    const plan = plans.find((p: any) => p.id === planId);
    if (!plan) return;

    setIsLoading(planId);

    try {
      // Check if already on this plan
      if (subscription?.plan === planId && subscription?.status === "active") {
        toast({
          title: "Already Subscribed",
          description: `You're already on the ${plan.name} plan.`,
        });
        setIsLoading(null);
        return;
      }

      // Handle free plan - direct upgrade without payment
      if (planId === 'free') {
        const response = await apiRequest("POST", "/api/upgrade-plan", { planId });
        if (response.ok) {
          toast({
            title: "Plan Updated",
            description: "Switched to Free plan",
          });
          window.location.reload();
        }
        setIsLoading(null);
        return;
      }

      // Check if plan is available for purchase
      if (!plan.available && planId !== 'free') {
        toast({
          title: "Noch nicht verfügbar",
          description: "Dieser Plan wird bald verfügbar sein. Stripe-Konfiguration steht aus.",
          variant: "default"
        });
        setIsLoading(null);
        return;
      }

      // For paid plans, create Stripe checkout session
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        planId
      });

        if (response.ok) {
          const data = await response.json();
          
          // Redirect to Stripe Checkout
          if (data.url) {
            window.location.href = data.url;
          } else {
            toast({
              title: "Plan Upgraded!",
              description: `Successfully upgraded to ${plan.name} plan!`,
            });
            window.location.reload();
          }
        } else if (response.status === 402) {
          const errorData = await response.json();
          
          // Handle SCA (3D Secure) authentication requirement
          if (errorData.requiresAction && errorData.clientSecret) {
            toast({
              title: "Payment Authentication Required",
              description: "Please complete payment verification...",
            });
            
            try {
              const stripe = await stripePromise;
              if (!stripe) {
                throw new Error("Stripe failed to load");
              }
              
              // Confirm the payment with 3D Secure
              const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                errorData.clientSecret
              );
              
              if (confirmError) {
                toast({
                  title: "Payment Authentication Failed",
                  description: confirmError.message || "Failed to verify payment",
                  variant: "destructive",
                });
              } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                toast({
                  title: "Payment Verified!",
                  description: `Successfully upgraded to ${plan.name} plan!`,
                });
                // Refresh to show updated subscription
                setTimeout(() => window.location.reload(), 1000);
              }
            } catch (scaError: any) {
              toast({
                title: "Authentication Error",
                description: scaError.message || "Failed to complete payment verification",
                variant: "destructive",
              });
            }
          } 
          // Handle payment method required (user needs to add card)
          else if (errorData.requiresPaymentSetup || errorData.message?.includes("Payment method")) {
            if (onPaymentSetup) {
              toast({
                title: "Payment Method Required",
                description: "Please add a payment method to upgrade to paid plans.",
              });
              onPaymentSetup(planId);
            } else {
              toast({
                title: "Payment Method Required",
                description: "Please add a payment method before upgrading to paid plans.",
                variant: "destructive",
              });
            }
          }
          // Handle other payment failures
          else {
            toast({
              title: "Payment Failed",
              description: errorData.message || "Payment could not be processed",
              variant: "destructive",
            });
          }
        } else {
          const errorData = await response.json();
          toast({
            title: "Upgrade Failed",
            description: errorData.message || "Failed to upgrade subscription",
            variant: "destructive",
          });
        }
    } catch (error: any) {
      console.error('Plan selection error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process plan selection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  if (plansLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1,2,3].map(j => <div key={j} className="h-4 bg-muted rounded" />)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan: any, index: number) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className={`relative ${plan.popular ? "border-primary shadow-lg" : ""} ${subscription?.plan === plan.id && subscription?.status === "active" ? "border-green-500 bg-green-50/5" : ""} ${plan.id === 'free' ? "border-gray-300" : ""}`}>
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                BELIEBT
              </div>
            )}
            {plan.id === 'free' && (
              <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                KOSTENLOS
              </div>
            )}
            {/* Only show CURRENT PLAN badge for PAID users (not trial users) */}
            {subscription?.plan === plan.id && subscription?.status === "active" && (
              <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-br-lg">
                CURRENT PLAN
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                €{plan.price}
                <span className="text-sm text-muted-foreground font-normal">
                  {plan.price === 0 ? '' : '/Monat'}
                </span>
              </div>
              {plan.trialAvailable && subscription?.requiresPaymentSetup && (
                <div className="flex items-center space-x-2 text-orange-500 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Card required for trial</span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {subscription?.plan === plan.id && subscription?.status === "active" ? (
                <Button disabled className="w-full" variant="outline">
                  Aktueller Plan
                </Button>
              ) : plan.id === 'free' ? (
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id || subscription?.plan === 'free'}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading === plan.id ? "Wird geladen..." : 
                   subscription?.plan === 'free' ? "Aktueller Plan" : "Zu Free wechseln"}
                </Button>
              ) : !plan.available ? (
                <Button
                  disabled
                  variant="outline"
                  className="w-full opacity-60"
                >
                  Bald verfügbar
                </Button>
              ) : plan.trialAvailable && subscription?.requiresPaymentSetup ? (
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading === plan.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Setting up...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Start Trial (Card Required)</span>
                    </div>
                  )}
                </Button>
              ) : plan.popular ? (
                <GlowButton
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id}
                  className="w-full"
                >
                  {isLoading === plan.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Wird geladen...</span>
                    </div>
                  ) : (
                    <>Jetzt upgraden</>
                  )}
                </GlowButton>
              ) : plan.id === "ultimate" ? (
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  {isLoading === plan.id ? "Wird geladen..." : "Jetzt upgraden"}
                </Button>
              ) : (
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading === plan.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      <span>Wird geladen...</span>
                    </div>
                  ) : (
                    <>Jetzt upgraden</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
