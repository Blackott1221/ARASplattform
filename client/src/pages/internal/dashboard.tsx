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
import { TrendingUp, Users, CheckSquare, Phone, Building2, DollarSign, Clock, Sparkles } from "lucide-react";
import InternalLayout from "@/components/internal/internal-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InternalDashboard() {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Fetch Dashboard Stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/internal/dashboard/stats'],
    queryFn: async () => {
      const res = await fetch('/api/internal/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30s
  });

  const kpiCards = [
    {
      title: "Companies",
      value: stats?.companies || 0,
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      description: "Total registered"
    },
    {
      title: "Active Contacts",
      value: stats?.contacts || 0,
      icon: Users,
      color: "from-green-500 to-green-600",
      description: "In database"
    },
    {
      title: "Active Deals",
      value: stats?.activeDeals || 0,
      icon: TrendingUp,
      color: "from-orange-500 to-orange-600",
      description: "In pipeline"
    },
    {
      title: "Tasks Due Today",
      value: stats?.tasksDueToday || 0,
      icon: CheckSquare,
      color: "from-purple-500 to-purple-600",
      description: "Require attention"
    },
    {
      title: "Recent Calls (24h)",
      value: stats?.recentCalls || 0,
      icon: Phone,
      color: "from-pink-500 to-pink-600",
      description: "Last 24 hours"
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            ARAS COMMAND CENTER
          </h1>
          <p className="text-gray-400 text-lg">
            Alles hier ist ARAS AI – Interne Steuerzentrale für Leads, Investoren, Projekte und Calls
          </p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${kpi.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {isLoading ? '...' : kpi.value}
                    </div>
                    <div className="text-sm text-gray-400 mb-1">{kpi.title}</div>
                    <div className="text-xs text-gray-500">{kpi.description}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Pipeline Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                Sales Pipeline Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {pipelineStages.map((stage) => {
                  const stageStats = stats?.pipeline?.[stage.key] || { count: 0, value: 0 };
                  return (
                    <div key={stage.key} className="text-center">
                      <div className={`${stage.color} text-white px-4 py-3 rounded-lg mb-2`}>
                        <div className="text-2xl font-bold">{stageStats.count}</div>
                        <div className="text-xs opacity-80">{stage.label}</div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {((stageStats.value || 0) / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                ARAS AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm">
                KI-gestützte Analyse deiner CRM-Aktivitäten der letzten Woche
              </p>
              
              {aiInsights ? (
                <div className="bg-black/20 rounded-lg p-4 text-gray-200 whitespace-pre-wrap">
                  {aiInsights}
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setLoadingAI(true);
                    try {
                      const res = await fetch('/api/internal/ai/weekly-summary', { method: 'POST' });
                      const data = await res.json();
                      setAiInsights(data.summary || 'Keine Insights verfügbar');
                    } catch (error) {
                      setAiInsights('Fehler beim Laden der AI-Insights');
                    }
                    setLoadingAI(false);
                  }}
                  disabled={loadingAI}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  {loadingAI ? 'Analysiere...' : '🧠 Wöchentliche Analyse starten'}
                </button>
              )}
              
              <p className="text-xs text-gray-500 text-center">
                Generiert von ARAS AI (intern) • Alle Daten bleiben vertraulich
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </InternalLayout>
  );
}
