import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { CampaignStats } from "@/components/campaigns/campaign-stats";
import { CampaignList } from "@/components/campaigns/campaign-list";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User, TokenResponse, Campaign } from "@shared/schema";

export default function Campaigns() {
  const { user, isLoading: authLoading } = useAuth();

  // Fetch user's campaigns and token balance when authenticated
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  const { data: userTokens } = useQuery<TokenResponse>({
    queryKey: ["/api/user/tokens"],
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

  const tokenBalance = userTokens?.balance || 0;

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar activeSection="campaigns" onSectionChange={() => {}} />
      <div className="flex-1 flex flex-col">
        <TopBar 
          currentSection="campaigns" 
          tokenBalance={tokenBalance}
          user={user as User}
        />
        <div className="flex-1 p-6 overflow-y-auto">
          <CampaignStats campaigns={campaigns} />
          <CampaignList campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
}
