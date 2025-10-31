import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlowButton } from "@/components/ui/glow-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { SubscriptionResponse } from "@shared/schema";
import { loadStripe } from "@stripe/stripe-js";

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
  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 29,
      trialMessages: 0,
      aiMessages: 100,
      voiceCalls: 10,
      features: [
        "100 AI messages/month",
        "10 voice calls/month",
        "Basic AI chat",
        "Email support",
        "Basic analytics",
      ],
      popular: false,
      trialAvailable: false,
    },
    {
      id: "pro",
      name: "Pro", 
      price: 99,
      trialMessages: 0,
      aiMessages: 500,
      voiceCalls: 100,
      features: [
        "500 AI messages/month",
        "100 voice calls/month",
        "Advanced AI features",
        "Priority support",
        "API access",
        "Advanced analytics",
        "Custom integrations",
      ],
      popular: true,
      trialAvailable: false,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 299,
      trialMessages: 0,
      aiMessages: null,
      voiceCalls: null,
      features: [
        "Unlimited AI messages",
        "Unlimited voice calls",
        "All Pro features",
        "24/7 support",
        "Custom integrations",
        "Advanced security",
        "Dedicated account manager",
      ],
      popular: false,
      trialAvailable: false,
    },
  ];

  const handlePlanSelect = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setIsLoading(planId);

    try {

      // Check if upgrading from current plan (only for ACTIVE subscriptions, not trial)
      if (subscription?.plan === planId && subscription?.status === "active") {
        toast({
          title: "Already Subscribed",
          description: `You're already on the ${plan.name} plan.`,
        });
        return;
      }

      // Handle plan upgrade
      if (onPlanUpgrade) {
        onPlanUpgrade(planId);
      } else {
        // Use simple upgrade endpoint
        const response = await apiRequest("POST", "/api/upgrade-plan", {
          planId
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: "Plan Upgraded!",
            description: `Successfully upgraded to ${plan.name} plan!`,
          });
          // Refresh page to show updated subscription
          window.location.reload();
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className={`relative ${plan.popular ? "border-primary" : ""} ${subscription?.plan === plan.id && subscription?.status === "active" ? "border-green-500 bg-green-50/5" : ""}`}>
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                POPULAR
              </div>
            )}
            {/* Only show CURRENT PLAN badge for PAID users (not trial users) */}
            {subscription?.plan === plan.id && subscription?.status === "active" && (
              <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-br-lg">
                CURRENT PLAN
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                ${plan.price}
                <span className="text-sm text-muted-foreground font-normal">
                  /month
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
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {subscription?.plan === plan.id && subscription?.status === "active" ? (
                <Button disabled className="w-full" variant="outline">
                  Current Plan
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
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </GlowButton>
              ) : plan.id === "enterprise" ? (
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading === plan.id}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading === plan.id ? "Processing..." : "Contact Sales"}
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
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Select ${plan.name}`
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
