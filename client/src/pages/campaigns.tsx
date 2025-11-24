import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { CampaignStats } from "@/components/campaigns/campaign-stats";
import { CampaignList } from "@/components/campaigns/campaign-list";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, Campaign, SubscriptionResponse } from "@shared/schema";

export default function Campaigns() {
  const { user, isLoading: authLoading } = useAuth();

  // Fetch user's campaigns and token balance when authenticated
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Fetch user's subscription data
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeSection="campaigns" onSectionChange={() => {}} />
      <div className="flex-1 flex flex-col content-zoom">
        <TopBar 
          currentSection="campaigns" 
          subscriptionData={subscriptionData} 
          user={user as User} 
          isVisible={true}
        />
        <div className="flex-1 p-6 overflow-y-auto">
          <CampaignStats campaigns={campaigns} />
          <CampaignList campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}
