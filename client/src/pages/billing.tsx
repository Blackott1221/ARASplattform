import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { CurrentPlan } from "@/components/billing/current-plan";
import { PricingCards } from "@/components/billing/pricing-cards";
import { PaymentSetup } from "@/components/billing/payment-setup";

import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, SubscriptionResponse } from "@shared/schema";

export default function Billing() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Fetch user's subscription status only when user is authenticated
  const { data: userSubscription, refetch: refetchSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <div className="flex h-screen bg-space space-pattern circuit-pattern items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const subscriptionData: SubscriptionResponse = userSubscription || {
    plan: 'starter',
    status: 'trialing', // Changed from 'trial_pending' to match other components
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: 100,
    voiceCallsLimit: 10,
    renewalDate: null,
    trialMessagesUsed: 0,
    trialEndDate: null,
    hasPaymentMethod: false,
    requiresPaymentSetup: true,
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
    
    // If we have a selected plan, complete the upgrade now
    if (selectedPlanId) {
      try {
        // Use raw fetch instead of apiRequest for consistency
        const response = await fetch("/api/upgrade-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: selectedPlanId }),
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: "Plan Upgraded!",
            description: `Successfully upgraded to ${selectedPlanId} plan!`,
          });
        } else {
          try {
            const errorData = await response.json();
            toast({
              title: "Upgrade Failed",
              description: errorData.message || "Failed to complete plan upgrade",
              variant: "destructive",
            });
          } catch (jsonError) {
            toast({
              title: "Upgrade Failed",
              description: "Failed to complete plan upgrade",
              variant: "destructive",
            });
          }
        }
      } catch (error: any) {
        console.error("Payment completion error:", error);
        toast({
          title: "Error",
          description: "Failed to complete plan upgrade after payment setup",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Payment Method Added!",
        description: "Your payment method has been saved successfully!",
      });
    }
    
    // Reset selected plan and refresh subscription data
    setSelectedPlanId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
  };

  const handlePlanUpgrade = async (planId: string) => {
    try {
      // Use raw fetch instead of apiRequest to handle 402 responses properly
      const response = await fetch("/api/upgrade-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Plan Upgraded!",
          description: `Successfully upgraded to ${planId} plan!`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
      } else if (response.status === 402) {
        // Payment method required - open payment setup dialog
        handlePaymentSetup(planId);
        return; // Important: return early to avoid showing error toast
      } else {
        // Handle different HTTP error statuses with specific messages
        let title = "Upgrade Failed";
        let description = "Failed to upgrade subscription";

        try {
          const errorData = await response.json();
          description = errorData.message || description;

          // Handle specific error scenarios
          switch (response.status) {
            case 401:
              title = "Authentication Required";
              description = "Please log in again to continue with your upgrade.";
              break;
            case 403:
              title = "Access Denied";
              description = "You don't have permission to perform this action.";
              break;
            case 404:
              title = "Plan Not Found";
              description = "The selected plan is no longer available. Please refresh the page and try again.";
              break;
            case 409:
              title = "Upgrade Conflict";
              description = "Your subscription status has changed. Please refresh the page and try again.";
              break;
            case 422:
              title = "Invalid Plan Selection";
              description = errorData.message || "The selected plan cannot be activated. Please contact support.";
              break;
            case 429:
              title = "Too Many Requests";
              description = "You're making requests too quickly. Please wait a moment and try again.";
              break;
            case 500:
              title = "Server Error";
              description = "There was an issue on our end. Please try again in a few moments.";
              break;
            case 503:
              title = "Service Unavailable";
              description = "The billing service is temporarily unavailable. Please try again later.";
              break;
            default:
              title = "Upgrade Failed";
              description = errorData.message || `Upgrade failed with error ${response.status}. Please try again.`;
          }
        } catch (jsonError) {
          // If we can't parse the error response, provide a generic network error message
          if (response.status === 0 || !navigator.onLine) {
            title = "Connection Error";
            description = "Please check your internet connection and try again.";
          } else {
            title = "Upgrade Failed";
            description = `Server returned error ${response.status}. Please try again or contact support.`;
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
      
      // Handle different types of network/request errors
      let title = "Upgrade Error";
      let description = "Failed to upgrade plan";

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        title = "Connection Error";
        description = "Unable to connect to our servers. Please check your internet connection and try again.";
      } else if (error.name === 'AbortError') {
        title = "Request Timeout";
        description = "The request timed out. Please try again.";
      } else if (!navigator.onLine) {
        title = "No Internet Connection";
        description = "You appear to be offline. Please check your internet connection and try again.";
      } else {
        description = error.message || "An unexpected error occurred. Please try again or contact support.";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar activeSection="billing" onSectionChange={() => {}} />
      <div className="flex-1 flex flex-col">
        <TopBar 
          currentSection="billing" 
          subscriptionData={subscriptionData}
          user={user as User}
        />
        <div className="flex-1 p-6 overflow-y-auto">
          <CurrentPlan user={user} subscription={subscriptionData} />
          <div className="mb-8">
            <h2 className="text-2xl font-orbitron font-bold mb-6">
              <span className="gradient-text">Subscription Plans</span>
            </h2>
            <PricingCards 
              subscription={subscriptionData}
              onPaymentSetup={handlePaymentSetup}
              onPlanUpgrade={handlePlanUpgrade}
            />
          </div>
        </div>

        <PaymentSetup
          isOpen={showPaymentSetup}
          onClose={() => {
            setShowPaymentSetup(false);
            setSelectedPlanId(null); // Clear selected plan when closing dialog
          }}
          onSuccess={handlePaymentSuccess}
          selectedPlan={selectedPlanId}
        />
      </div>
    </div>
  );
}
