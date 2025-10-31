import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { User, SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

export default function Space() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    // Navigate to different sections
    if (section !== "space") {
      window.location.href = `/${section}`;
    }
  };

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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Personalized Welcome Message */}
          <div className="p-6 border-b border-border/20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center space-x-3"
            >
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20"
                >
                  <img 
                    src={arasLogo} 
                    alt="ARAS AI" 
                    className="w-6 h-6 object-contain"
                  />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-orbitron font-bold text-foreground">
                    Welcome back, {(user as any)?.firstName || (user as any)?.username || "There"} 👋
                  </h1>
                  <p className="text-muted-foreground mt-1 text-lg">
                    What can I take care of today?
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            <ChatInterface />
          </div>
        </div>
      </div>
    </div>
  );
}
