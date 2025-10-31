import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { GlowButton } from "@/components/ui/glow-button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Bot, Users, Phone, ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate password reset process for wireframe
    setTimeout(() => {
      setEmailSent(true);
      setIsLoading(false);
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
    }, 1500);
  };

  const handleResendEmail = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Email Resent",
        description: "Password reset email has been sent again.",
      });
    }, 1000);
  };

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
                  className="bg-card/50 p-4 rounded-lg border border-border"
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
                <Link href="/app" className="hover:text-primary transition-colors">
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
      
      {/* Right Panel - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="p-8">
              {/* Back Button */}
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/login")}
                  className="p-0 h-auto text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </div>

              {!emailSent ? (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-orbitron font-bold mb-2">
                      <GradientText>Reset Password</GradientText>
                    </h1>
                    <p className="text-muted-foreground">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
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
                    
                    <GlowButton type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending reset email...</span>
                        </div>
                      ) : (
                        "Send Reset Email"
                      )}
                    </GlowButton>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  
                  <div>
                    <h1 className="text-3xl font-orbitron font-bold mb-2">
                      <GradientText>Check Your Email</GradientText>
                    </h1>
                    <p className="text-muted-foreground">
                      We've sent a password reset link to{" "}
                      <span className="text-primary">{email}</span>
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Didn't receive the email? Check your spam folder or try again.
                    </p>
                    
                    <Button
                      variant="outline"
                      onClick={handleResendEmail}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Resending...</span>
                        </div>
                      ) : (
                        "Resend Email"
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Remember your password?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Mobile Demo Link */}
              <div className="lg:hidden mt-6 pt-6 border-t border-border text-center">
                <Link href="/app" className="text-sm text-primary hover:text-primary/80 transition-colors">
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