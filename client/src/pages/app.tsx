import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, SubscriptionResponse } from "@shared/schema";

export default function App() {
  const [activeSection, setActiveSection] = useState("space");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, isLoading } = useAuth();

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !isLoading,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE9100]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar
          currentSection={activeSection}
          subscriptionData={subscriptionData}
          user={user as User}
        />
        
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
