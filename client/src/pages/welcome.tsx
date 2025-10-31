import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GradientText } from "@/components/ui/gradient-text";
import { GlowButton } from "@/components/ui/glow-button";
import { motion } from "framer-motion";
import { Bot, Users, Phone, Zap, MessageSquare, CreditCard, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Welcome() {
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "SPACE",
      subtitle: "AI Chat Assistant",
      description: "Get strategic sales advice and campaign optimization from your AI assistant.",
      delay: 0,
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "POWER",
      subtitle: "Voice Call Automation",
      description: "Launch AI-powered voice campaigns with personalized agents and bulk processing.",
      delay: 0.2,
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Lead Management",
      subtitle: "Smart Pipeline",
      description: "Organize, track, and convert leads with intelligent status management.",
      delay: 0.4,
    },
    {
      icon: <Bot className="w-8 h-8" />,
      title: "Campaign Automation",
      subtitle: "Multi-Channel Outreach",
      description: "Create and manage automated campaigns across voice and email channels.",
      delay: 0.6,
    },
  ];

  const stats = [
    { value: "60%", label: "Increase in Productivity" },
    { value: "45%", label: "Higher Conversion Rates" },
    { value: "80%", label: "Time Savings" },
    { value: "10x", label: "Faster Lead Processing" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-4xl"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-12">
            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="mb-6"
              >
                <h1 className="text-5xl font-orbitron font-bold mb-4">
                  <GradientText>Welcome to ARAS AI</GradientText>
                </h1>
                <p className="text-xl text-muted-foreground">
                  The future of AI-powered sales automation is here
                </p>
              </motion.div>

              {/* Animated Logo/Icon */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <Bot className="w-10 h-10 text-white" />
              </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  className="text-center p-4 bg-card/30 rounded-lg border border-border/50"
                >
                  <div className="text-3xl font-orbitron font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Features Showcase */}
            <div className="mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-orbitron font-semibold mb-4">
                  <GradientText>Powerful Features</GradientText>
                </h2>
                <p className="text-muted-foreground">
                  Everything you need to transform your sales process
                </p>
              </motion.div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: feature.delay }}
                    className={`p-6 rounded-lg border transition-all duration-300 ${
                      currentFeature === index 
                        ? 'bg-primary/5 border-primary/20 shadow-lg' 
                        : 'bg-card/30 border-border/50 hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg transition-colors ${
                        currentFeature === index 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-card text-muted-foreground'
                      }`}>
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-orbitron font-semibold mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-primary mb-2">
                          {feature.subtitle}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-orbitron font-semibold">
                  Ready to get started?
                </h3>
                <p className="text-muted-foreground">
                  Begin your journey with ARAS AI and transform your sales process today.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <GlowButton
                  className="sm:w-auto w-full"
                  onClick={() => window.location.href = "/app"}
                >
                  <span className="flex items-center space-x-2">
                    <span>Enter ARAS AI</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </GlowButton>
                
                <Link href="/app">
                  <button className="px-6 py-3 border border-border rounded-lg bg-card/30 hover:bg-card/50 transition-colors text-muted-foreground hover:text-primary w-full sm:w-auto">
                    Try Demo First
                  </button>
                </Link>
              </div>

              <div className="pt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  No credit card required • Free trial available • Enterprise support
                </p>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}