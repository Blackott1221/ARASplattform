import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { GlowButton } from "@/components/ui/glow-button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Bot, Users, Phone, Mail, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  const features = [
    {
      icon: <Bot className="w-5 h-5" />,
      title: "AI-Powered Voice Agents",
      delay: 0,
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Smart Lead Generation",
      delay: 0.2,
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: "Automated Campaigns",
      delay: 0.4,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
      
      if (!agreeToTerms) {
        toast({
          title: "Error",
          description: "Please agree to the terms and conditions",
          variant: "destructive",
        });
        return;
      }
    }

    // Redirect to Replit Auth
    window.location.href = "/api/login";
  };

  const handleForgotPassword = () => {
    toast({
      title: "Password Reset",
      description: "Password reset functionality will be available soon.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Dynamic Content */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background"></div>
        <div className="relative z-10 p-12 flex flex-col justify-center">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-orbitron font-bold"
            >
              <GradientText>ARAS AI</GradientText>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground"
            >
              The future of AI-powered sales automation
            </motion.div>
            
            <div className="space-y-4 mt-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: feature.delay }}
                  className="bg-card/50 p-4 rounded-lg border border-border slide-in-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse-glow"></div>
                    <span className="text-muted-foreground">{feature.title}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8 pt-8 border-t border-border"
            >
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <Link href="/demo" className="hover:text-primary transition-colors">
                  <span className="flex items-center space-x-1">
                    <span>Try Demo</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
                <span>•</span>
                <span>No credit card required</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-8">
                  <img 
                    src={arasLogo} 
                    alt="ARAS AI" 
                    className="w-24 h-24"
                  />
                </div>
                <h1 className="text-2xl font-orbitron font-bold mb-2">
                  <GradientText>
                    {isSignUp ? "Join the Platform" : "Welcome Back"}
                  </GradientText>
                </h1>
                <p className="text-muted-foreground">
                  {isSignUp 
                    ? "Create your ARAS AI account" 
                    : "Sign in to your ARAS AI account"
                  }
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                
                {isSignUp && (
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={isSignUp ? "terms" : "remember"}
                      checked={isSignUp ? agreeToTerms : rememberMe}
                      onCheckedChange={(checked) => 
                        isSignUp 
                          ? setAgreeToTerms(checked as boolean)
                          : setRememberMe(checked as boolean)
                      }
                    />
                    <Label htmlFor={isSignUp ? "terms" : "remember"} className="text-sm">
                      {isSignUp ? "I agree to the terms and conditions" : "Remember me"}
                    </Label>
                  </div>
                  {!isSignUp && (
                    <Button 
                      type="button"
                      variant="link" 
                      className="p-0 h-auto text-primary"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </Button>
                  )}
                </div>
                
                <GlowButton type="submit" className="w-full">
                  {isSignUp ? "Create Account" : "Sign In"}
                </GlowButton>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </div>

              {/* Mobile Demo Link */}
              <div className="lg:hidden mt-6 pt-6 border-t border-border text-center">
                <Link href="/demo" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  <span className="flex items-center justify-center space-x-1">
                    <span>Try Demo</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
