import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import type { User, SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

export default function Space() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const { user } = useAuth();
  
  // Fetch user's subscription data
  const { data: userSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });
  
  const subscriptionData = userSubscription || {
    plan: 'starter',
    status: 'active',
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: 100,
    voiceCallsLimit: 10
  };

  const handleSectionChange = (section: string) => {
    if (section !== "space") {
      window.location.href = `/${section}`;
    }
  };

  // Auto-hide welcome banner after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar 
        activeSection="space" 
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col relative">
        <TopBar 
          currentSection="space" 
          subscriptionData={subscriptionData}
          user={user as import("@shared/schema").User}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Modern Auto-Hide Welcome Banner */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative overflow-hidden border-b border-white/5"
              >
                {/* Subtle Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-[#FE9100]/5 to-black/40 backdrop-blur-sm" />
                
                {/* Ambient Glow */}
                <div className="absolute inset-0 bg-[#FE9100]/3 blur-3xl" />

                <div className="relative px-6 py-4">
                  <div className="max-w-4xl mx-auto flex items-center justify-between">
                    {/* Left: Welcome Message */}
                    <div className="flex items-center space-x-4">
                      {/* Animated Logo */}
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-[#FE9100]/20 blur-xl rounded-full" />
                        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#FE9100]/20 to-[#a34e00]/20 border border-[#FE9100]/30 flex items-center justify-center backdrop-blur-sm">
                          <img 
                            src={arasLogo} 
                            alt="ARAS AI" 
                            className="w-5 h-5 object-contain"
                          />
                        </div>
                      </motion.div>

                      {/* Text Content */}
                      <div className="flex flex-col">
                        <motion.h2 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-lg font-semibold text-white flex items-center space-x-2"
                        >
                          <span>Welcome back, {(user as any)?.firstName || (user as any)?.username || "There"}</span>
                          <motion.span
                            animate={{ 
                              rotate: [0, 20, 0],
                            }}
                            transition={{ 
                              duration: 0.6,
                              repeat: 3,
                              repeatDelay: 2
                            }}
                          >
                            👋
                          </motion.span>
                        </motion.h2>
                        <motion.p 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                          className="text-sm text-gray-400 flex items-center space-x-2"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#FE9100]" />
                          <span>What can I help you with today?</span>
                        </motion.p>
                      </div>
                    </div>

                    {/* Right: Close Button */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      onClick={() => setShowWelcome(false)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 group"
                    >
                      <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    </motion.button>
                  </div>

                  {/* Auto-hide Progress Bar */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#FE9100] to-[#a34e00]"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Chat Interface */}
          <div className="flex-1 overflow-hidden relative">
            <ChatInterface />
          </div>
        </div>
      </div>
    </div>
  );
}
