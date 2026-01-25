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
      try {
        const response = await apiRequest('GET', '/api/subscription-plans');
        if (!response.ok) {
          console.warn('[PricingCards] Failed to fetch plans:', response.status);
          return null;
        }
        return await response.json();
      } catch (err) {
        console.error('[PricingCards] Error fetching plans:', err);
        return null;
      }
    },
    retry: false
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
  })) : [];

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
      {plans.map((plan: any, index: number) => {
        const isCurrentPlan = subscription?.plan === plan.id && subscription?.status === "active";
        const isFree = plan.id === 'free';
        
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.8, 0.25, 1] }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative group"
          >
            {/* Animated Border */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity"
              style={{
                background: plan.popular 
                  ? 'linear-gradient(135deg, #FE9100, #ffd700, #FE9100)' 
                  : isCurrentPlan
                    ? 'linear-gradient(135deg, #22c55e, #10b981, #22c55e)'
                    : 'linear-gradient(135deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)',
                backgroundSize: '300% 300%',
                padding: '1.5px',
                borderRadius: '16px'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              <div className="w-full h-full rounded-2xl" style={{ background: '#0a0a0a' }} />
            </motion.div>

            {/* Card Content */}
            <div 
              className="relative rounded-2xl p-6 h-full flex flex-col"
              style={{ 
                background: plan.popular 
                  ? 'linear-gradient(135deg, rgba(254, 145, 0, 0.08), rgba(10, 10, 10, 0.95))'
                  : 'rgba(10, 10, 10, 0.9)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Badges */}
              {plan.popular && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <div
                    className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: 'linear-gradient(135deg, #FE9100, #ffd700)',
                      color: '#000',
                      boxShadow: '0 4px 20px rgba(254, 145, 0, 0.4)'
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    BELIEBT
                  </div>
                </motion.div>
              )}
              
              {isFree && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white">
                    KOSTENLOS
                  </div>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div 
                    className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e, #10b981)',
                      color: '#fff',
                      boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    <Check className="w-3 h-3" />
                    AKTUELL
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6 pt-4">
                <h3 
                  className="text-xl font-black mb-2"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#e9d7c4'
                  }}
                >
                  {plan.name}
                </h3>
                
                {/* Price Display - CHF */}
                <motion.div
                  animate={{
                    textShadow: plan.popular ? [
                      '0 0 0px rgba(254, 145, 0, 0)',
                      '0 0 10px rgba(254, 145, 0, 0.4)',
                      '0 0 0px rgba(254, 145, 0, 0)'
                    ] : undefined
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex items-baseline gap-2"
                >
                  <span 
                    className="text-3xl font-black"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      color: isFree ? '#22c55e' : '#FE9100'
                    }}
                  >
                    {isFree ? 'Kostenlos' : `CHF ${plan.price}`}
                  </span>
                  {!isFree && (
                    <span className="text-sm text-gray-500">/ Monat</span>
                  )}
                </motion.div>
              </div>

              {/* Features */}
              <div className="flex-grow mb-6">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Enthalten
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#FE9100] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              {isCurrentPlan ? (
                <motion.button
                  disabled
                  className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider border border-green-500/50 text-green-400 bg-green-500/10"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Aktueller Plan
                </motion.button>
              ) : isFree ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id || subscription?.plan === 'free'}
                  className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider border border-white/20 text-white/80 hover:border-white/40 hover:bg-white/5 transition-all disabled:opacity-50"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {isLoading === plan.id ? "Wird geladen..." : 
                   subscription?.plan === 'free' ? "Aktueller Plan" : "Zu Free wechseln"}
                </motion.button>
              ) : !plan.available ? (
                <motion.button
                  disabled
                  className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider border border-white/10 text-white/40 bg-white/5"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Bald verfügbar
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id}
                  className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: plan.popular 
                      ? 'linear-gradient(135deg, #FE9100, #ffd700)'
                      : plan.id === 'ultimate'
                        ? 'linear-gradient(135deg, #a855f7, #3b82f6)'
                        : 'linear-gradient(135deg, #FE9100, #a34e00)',
                    color: '#000',
                    boxShadow: plan.popular 
                      ? '0 4px 20px rgba(254, 145, 0, 0.3)'
                      : '0 4px 16px rgba(254, 145, 0, 0.2)'
                  }}
                >
                  {isLoading === plan.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                      <span>Wird geladen...</span>
                    </div>
                  ) : (
                    "Jetzt upgraden"
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
