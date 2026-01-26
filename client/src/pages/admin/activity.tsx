"use client";

import { CommandCenterLayout } from "@/components/admin/CommandCenterLayout";
import { ActivityFeed, ActivityWidget } from "@/components/admin/ActivityFeed";
import { motion } from "framer-motion";
import { Activity, Zap, TrendingUp, Users, Phone, Mail, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Activity Feed Page - Admin Dashboard
// ============================================================================

export default function ActivityPage() {
  // Fetch stats
  const { data: statsData, refetch } = useQuery({
    queryKey: ["admin-activity-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/activity?limit=200", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const stats = statsData?.stats || {};

  return (
    <CommandCenterLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF6A00] to-[#FFB200] bg-clip-text text-transparent">
            Activity Feed
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Real-time platform activity and audit trail
          </p>
        </div>
        <button 
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Today", value: stats.todayCount || 0, icon: Zap, color: "#FF6A00" },
          { label: "Users", value: stats.byType?.user_registered || 0, icon: Users, color: "#10B981" },
          { label: "Leads", value: stats.byType?.lead_created || 0, icon: TrendingUp, color: "#8B5CF6" },
          { label: "Calls", value: stats.byType?.call_made || 0, icon: Phone, color: "#06B6D4" },
          { label: "Emails", value: stats.byType?.email_sent || 0, icon: Mail, color: "#EC4899" },
          { label: "Staff Actions", value: stats.byType?.staff_action || 0, icon: Activity, color: "#F59E0B" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-xs text-white/40">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-white/[0.02] border border-white/5 p-4"
      >
        <ActivityFeed 
          limit={100}
          showFilters={true}
          autoRefresh={true}
          refreshInterval={15000}
        />
      </motion.div>
    </CommandCenterLayout>
  );
}
