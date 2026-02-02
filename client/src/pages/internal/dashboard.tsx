/**
 * ============================================================================
 * ARAS COMMAND CENTER - DASHBOARD
 * ============================================================================
 * Zentrale Übersicht über alle CRM-Aktivitäten
 * ============================================================================
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Users, CheckSquare, Phone, Building2, Sparkles } from "lucide-react";
import InternalLayout from "@/components/internal/internal-layout";
import { OnboardingTour } from "@/components/internal/onboarding-tour";
import { HintButton, HINT_CONTENT } from "@/components/internal/hint-button";
import { ActivityFeed } from "@/components/internal/activity-feed";
import { useArasDebug, useArasDebugMount } from "@/hooks/useArasDebug";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { AStatePanel, AGlassCard, AKPICard, AGradientTitle, AButton, ASkeleton } from "@/components/ui/aras-primitives";
import { useLocation } from "wouter";

export default function InternalDashboard() {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Dev-only debug mount tracking
  useArasDebugMount('InternalDashboard', '/internal/dashboard');

  const [, navigate] = useLocation();
  
  // Fetch Dashboard Stats using centralized API helper
  const { data: stats, isLoading, error, status, refetch } = useQuery({
    queryKey: ['/api/internal/dashboard/stats'],
    queryFn: async () => {
      const result = await apiGet<any>('/api/internal/dashboard/stats');
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    refetchInterval: 30000
  });
  
  // Check if debug mode is enabled
  const showDebug = typeof window !== 'undefined' && localStorage.getItem('aras_debug') === '1';

  // Dev-only debug logging
  useArasDebug({
    route: '/internal/dashboard',
    queryKey: '/api/internal/dashboard/stats',
    status: status as any,
    data: stats,
    error,
    componentName: 'InternalDashboard'
  });

  const kpiCards: { title: string; value: number; icon: any; color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' }[] = [
    {
      title: "Companies",
      value: stats?.companies || 0,
      icon: Building2,
      color: "blue"
    },
    {
      title: "Active Contacts",
      value: stats?.contacts || 0,
      icon: Users,
      color: "green"
    },
    {
      title: "Active Deals",
      value: stats?.activeDeals || 0,
      icon: TrendingUp,
      color: "orange"
    },
    {
      title: "Tasks Due",
      value: stats?.tasksDueToday || 0,
      icon: CheckSquare,
      color: "purple"
    },
    {
      title: "Calls (24h)",
      value: stats?.recentCalls || 0,
      icon: Phone,
      color: "pink"
    },
  ];

  const pipelineStages = [
    { key: 'IDEA', label: 'Idea', color: 'bg-gray-600' },
    { key: 'CONTACTED', label: 'Contacted', color: 'bg-blue-600' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-yellow-600' },
    { key: 'COMMITTED', label: 'Committed', color: 'bg-green-600' },
    { key: 'CLOSED_WON', label: 'Won', color: 'bg-emerald-600' },
    { key: 'CLOSED_LOST', label: 'Lost', color: 'bg-red-600' },
  ];

  return (
    <InternalLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        {/* Onboarding Tour */}
        <OnboardingTour />

        {/* Hero Section - Premium */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute top-0 right-0">
            <HintButton content={HINT_CONTENT.dashboard} />
          </div>
          
          <AGradientTitle as="h1" size="xl" className="mb-1">
            Dashboard
          </AGradientTitle>
          <p className="text-sm" style={{ color: 'var(--aras-soft)' }}>
            Übersicht aller CRM-Aktivitäten
          </p>
        </motion.div>

        {/* Error State - Premium */}
        {error && (
          <AStatePanel
            state="error"
            error={(error as unknown as ApiError)?.status ? (error as unknown as ApiError) : { status: 500, message: (error as Error).message, url: '/api/internal/dashboard/stats' }}
            onRetry={() => refetch()}
            onLogin={() => navigate('/auth')}
            showDebug={showDebug}
          />
        )}

        {/* KPI Cards - Premium */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <ASkeleton key={i} variant="card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiCards.map((kpi, index) => (
              <AKPICard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                color={kpi.color}
              />
            ))}
          </div>
        )}

        {/* Pipeline Preview - Premium */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <AGlassCard>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--aras-orange)' }} />
              <h3 className="text-base font-semibold" style={{ color: 'var(--aras-text)' }}>
                Sales Pipeline
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {pipelineStages.map((stage) => {
                const stageStats = stats?.pipeline?.[stage.key] || { count: 0, value: 0 };
                return (
                  <div 
                    key={stage.key} 
                    className="text-center p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--aras-text)' }}>
                      {stageStats.count}
                    </div>
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--aras-muted)' }}>
                      {stage.label}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--aras-soft)' }}>
                      {((stageStats.value || 0) / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </AGlassCard>
        </motion.div>

        {/* AI Insights - Premium */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AGlassCard variant="elevated">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--aras-orange)' }} />
              <h3 className="text-base font-semibold" style={{ color: 'var(--aras-text)' }}>
                ARAS AI Insights
              </h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--aras-muted)' }}>
              KI-gestützte Analyse deiner CRM-Aktivitäten
            </p>
            
            {aiInsights ? (
              <div 
                className="rounded-xl p-4 mb-3 whitespace-pre-wrap text-sm"
                style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--aras-text)' }}
              >
                {aiInsights}
              </div>
            ) : (
              <AButton
                variant="primary"
                icon={Sparkles}
                loading={loadingAI}
                onClick={async () => {
                  setLoadingAI(true);
                  try {
                    const result = await apiPost<{summary?: string}>('/api/internal/ai/weekly-summary');
                    if (result.ok && result.data) {
                      setAiInsights(result.data.summary || 'Keine Insights verfügbar');
                    } else {
                      setAiInsights('Fehler beim Laden der AI-Insights');
                    }
                  } catch (error) {
                    setAiInsights('Fehler beim Laden der AI-Insights');
                  }
                  setLoadingAI(false);
                }}
                className="w-full justify-center"
              >
                Wöchentliche Analyse starten
              </AButton>
            )}
            
            <p className="text-[10px] text-center mt-3" style={{ color: 'var(--aras-soft)' }}>
              Generiert von ARAS AI • Alle Daten bleiben vertraulich
            </p>
          </AGlassCard>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <ActivityFeed limit={10} />
        </motion.div>
      </div>
    </InternalLayout>
  );
}
