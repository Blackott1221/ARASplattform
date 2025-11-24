import { useEffect } from "react";
import backgroundVideo from "@/assets/background-video.mp4";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EarlyAccessBanner } from "@/components/ui/early-access-banner";
import { useAuth } from "@/hooks/useAuth";
import { initializeAnalytics } from "@/lib/analytics";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Welcome from "@/pages/welcome";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Demo from "@/pages/demo";
import Checkout from "@/pages/checkout";
import CheckoutSuccess from "@/pages/checkout-success";
import Space from "@/pages/space";
import VoiceCalls from "./pages/voice-calls";
import AdminDashboard from "./pages/admin-dashboard";
import Power from "@/pages/power";
import VoiceAgents from "@/pages/voice-agents";
import Leads from "@/pages/leads";
import Campaigns from "@/pages/campaigns";
import Billing from "@/pages/billing";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import ArasMailingPage from "@/pages/aras-mailing";

function Router() {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/demo" component={Demo} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout-success" component={CheckoutSuccess} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/welcome" component={Welcome} />
      
      {!user ? (
        <>
          {/* Unauthenticated - show auth page */}
          <Route path="/" component={AuthPage} />
          {/* Redirect protected routes to auth */}
          <Route path="/app" component={AuthPage} />
          <Route path="/space" component={AuthPage} />
          <Route path="/power" component={AuthPage} />
          <Route path="/voice-agents" component={AuthPage} />
          <Route path="/leads" component={AuthPage} />
          <Route path="/campaigns" component={AuthPage} />
          <Route path="/billing" component={AuthPage} />
          <Route path="/settings" component={AuthPage} />
        </>
      ) : (
        <>
          {/* Authenticated routes */}
          <Route path="/" component={Space} />
          <Route path="/app" component={Space} />
          <Route path="/app/voice" component={VoiceCalls} />
          <Route path="/space" component={Space} />
          <Route path="/app/space" component={Space} />
          <Route path="/power" component={Power} />
          <Route path="/app/power" component={Power} />
          <Route path="/voice-agents" component={VoiceAgents} />
          <Route path="/app/voice-agents" component={VoiceAgents} />
          <Route path="/leads" component={Leads} />
          <Route path="/app/leads" component={Leads} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/app/admin" component={AdminDashboard} />
          <Route path="/app/admin-dashboard" component={AdminDashboard} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/app/campaigns" component={Campaigns} />
          <Route path="/billing" component={Billing} />
          <Route path="/app/billing" component={Billing} />
          <Route path="/settings" component={Settings} />
          <Route path="/app/settings" component={Settings} />
          <Route path="/aras-mailing" component={ArasMailingPage} />
          <Route path="/app/aras-mailing" component={ArasMailingPage} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics on app mount
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark aras-bg-animated relative min-h-screen">
          {/* Video Background - TESTING: Full opacity to verify video loads */}
          <div className="fixed inset-0 z-0 overflow-hidden">
            <video
              autoPlay
              loop
              muted
              playsInline
              src={backgroundVideo}
              className="absolute inset-0 w-full h-full object-cover opacity-100"
            />
            {/* Overlay temporarily removed for testing */}
            {/* <div className="absolute inset-0 bg-black/40"></div> */}
          </div>

          {/* Content Wrapper - positioned above video */}
          <div className="relative z-10">
            {/* Early Access Banner - Ganz oben fixiert */}
            <div className="fixed top-0 left-0 right-0 z-[9999]">
              <EarlyAccessBanner />
            </div>
            
            {/* Main Content - mit Padding-Top für Banner */}
            <div className="pt-10">
              <Toaster />
              <Router />
            </div>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
