import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

/**
 * Dashboard Page
 * IMPORTANT: NO Sidebar/TopBar here!
 * AppPage already renders layout components
 */
export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE9100]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <p className="text-gray-400">Nicht eingeloggt</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-black px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-32 sm:pb-24">
      <DashboardContent user={user as User} />
    </div>
  );
}
