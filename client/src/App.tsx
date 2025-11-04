import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark aras-bg-animated">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
