/**
 * ARAS Mission Control - Main Dashboard Component
 * The central command center with KPIs, Actions, Activity, and Intelligence Panels
 * Premium ARAS CI design with real data and interactivity
 */

import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';
import { useDashboardOverview, needsSetup } from '@/lib/dashboard/use-dashboard-overview';
import { KpiCards } from './kpi-cards';
import { NextActions } from './next-actions';
import { ActivityStream } from './activity-stream';
import { lazyWithRetry } from '@/lib/react/lazy-with-retry';
import { ModuleBoundary } from '@/components/system/module-boundary';
import { asArray } from '@/lib/utils/safe';
import type { User } from '@shared/schema';

// Lazy load intelligence panels
const ContactRadar = lazyWithRetry(() => import('./contact-radar'));
const TodayOS = lazyWithRetry(() => import('./today-os'));
const MatrixPanel = lazyWithRetry(() => import('@/components/system/matrix-panel'));

// Design Tokens
const DT = {
  orange: '#ff6a00',
  gold: '#e9d7c4',
  panelBg: 'rgba(0,0,0,0.42)',
  panelBorder: 'rgba(255,255,255,0.08)',
  glow: '0 0 0 1px rgba(255,106,0,0.18), 0 0 22px rgba(255,106,0,0.10)',
};

interface MissionControlProps {
  user: User | null;
}

function ModuleSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div 
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ 
        height,
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <div className="p-4">
        <div className="h-4 w-32 bg-white/10 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-3/4 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

function SystemAlertBanner({ alerts, onDismiss }: { 
  alerts: any[]; 
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: alert.type === 'error' 
              ? 'rgba(239,68,68,0.15)' 
              : alert.type === 'warning'
              ? 'rgba(245,158,11,0.15)'
              : 'rgba(59,130,246,0.15)',
            border: `1px solid ${
              alert.type === 'error' 
                ? 'rgba(239,68,68,0.3)' 
                : alert.type === 'warning'
                ? 'rgba(245,158,11,0.3)'
                : 'rgba(59,130,246,0.3)'
            }`,
          }}
        >
          <AlertTriangle 
            size={16} 
            style={{ 
              color: alert.type === 'error' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6' 
            }} 
          />
          <div className="flex-1">
            <p className="text-[12px] font-medium text-white/90">{alert.title}</p>
            {alert.description && (
              <p className="text-[10px] text-white/50">{alert.description}</p>
            )}
          </div>
          {alert.dismissible && (
            <button 
              onClick={() => onDismiss(alert.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={14} className="text-white/40" />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function MissionControl({ user }: MissionControlProps) {
  const { data, isLoading, refetch, lastUpdated } = useDashboardOverview();
  const [kpiPeriod, setKpiPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const isSetupMode = needsSetup(data);
  const visibleAlerts = asArray(data.systemAlerts).filter(a => !dismissedAlerts.has(a.id));

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  };

  // Prepare Contact Radar props
  const contactRadarProps = {
    insights: asArray(data.modules.contactRadar).map(item => ({
      ref: { key: item.contactKey, type: 'contact' as const, displayName: item.name },
      displayName: item.name,
      company: item.company,
      score: item.priority === 'urgent' ? 100 : item.priority === 'high' ? 75 : 50,
      openTasks: item.openTasks,
      lastEvent: item.lastContact ? new Date(item.lastContact) : null,
      failedCalls: 0,
      pendingActions: item.pendingCalls,
      tags: item.tags,
    })),
    focusKey: null,
    onFocus: () => {},
    onClearFocus: () => {},
    onOpenBest: () => {},
    pinnedKeys: [],
    onTogglePin: () => {},
  };

  // Prepare Today OS props
  const todayOSProps = {
    itemsTimed: asArray(data.modules.todayOS).filter(i => i.time).map(item => ({
      id: item.id,
      type: item.type as any,
      title: item.title,
      time: item.time ? new Date(item.time) : null,
      priority: item.priority as any,
      done: item.done,
      contactRef: item.contactName ? { key: item.id, displayName: item.contactName } : undefined,
    })),
    itemsUntimed: asArray(data.modules.todayOS).filter(i => !i.time).map(item => ({
      id: item.id,
      type: item.type as any,
      title: item.title,
      time: null,
      priority: item.priority as any,
      done: item.done,
    })),
    weekStrip: { days: [] },
    counts: { tasks: 0, calls: 0, meetings: 0, followups: 0, deadlines: 0 },
    focusKey: null,
    onOpen: () => {},
  };

  // Prepare Matrix Panel props
  const matrixLines = asArray(data.modules.matrix.cells).map(cell => ({
    label: `${cell.category} - ${cell.status}`,
    value: cell.count,
    tone: cell.trend === 'up' ? 'ok' as const : cell.trend === 'down' ? 'warn' as const : 'info' as const,
  }));

  return (
    <div className="flex-1 min-h-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 mb-2 font-medium">
              ARAS AI
            </p>
            <h1 
              className="text-2xl sm:text-3xl font-black font-['Orbitron'] tracking-wide inline-block relative"
              style={{
                background: `linear-gradient(90deg, ${DT.orange}, #ffb15a, ${DT.gold}, #ffb15a, ${DT.orange})`,
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'sheen 10s linear infinite',
              }}
            >
              MISSION CONTROL
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              {isSetupMode 
                ? 'Willkommen! Starte mit den Setup-Aktionen unten.' 
                : `Deine Kommandozentrale • ${data.user.name}`
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: isLoading ? '#f59e0b' : '#22c55e' }}
              />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                {isLoading ? 'Lädt...' : 'Bereit'}
              </span>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw 
                size={16} 
                className={`text-white/40 ${isLoading ? 'animate-spin' : ''}`} 
              />
            </button>

            {/* Last updated */}
            {lastUpdated && (
              <span className="text-[9px] text-white/30">
                {lastUpdated.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </motion.div>

        {/* System Alerts */}
        <SystemAlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} />

        {/* KPI Cards */}
        <KpiCards 
          kpis={data.kpis} 
          period={kpiPeriod} 
          onPeriodChange={setKpiPeriod}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Actions + Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Actions */}
            <NextActions 
              actions={asArray(data.nextActions)} 
              isLoading={isLoading}
            />

            {/* Activity Stream */}
            <ActivityStream 
              activities={asArray(data.activity)} 
              isLoading={isLoading}
              maxItems={8}
            />
          </div>

          {/* Right Column - Intelligence Panels */}
          <div className="space-y-6">
            {/* Contact Radar */}
            <ModuleBoundary name="ContactRadar">
              <Suspense fallback={<ModuleSkeleton height={280} />}>
                <ContactRadar {...contactRadarProps} />
              </Suspense>
            </ModuleBoundary>

            {/* Today OS */}
            <ModuleBoundary name="TodayOS">
              <Suspense fallback={<ModuleSkeleton height={250} />}>
                <TodayOS {...todayOSProps} />
              </Suspense>
            </ModuleBoundary>

            {/* Matrix Panel */}
            <ModuleBoundary name="MatrixPanel">
              <Suspense fallback={<ModuleSkeleton height={200} />}>
                <MatrixPanel 
                  title="System Status"
                  lines={matrixLines.length > 0 ? matrixLines : [
                    { label: 'Calls heute', value: data.kpis.calls.started.today, tone: 'ok' },
                    { label: 'Kampagnen aktiv', value: data.kpis.campaigns.active, tone: 'ok' },
                    { label: 'Kontakte gesamt', value: data.kpis.contacts.total, tone: 'info' },
                    { label: 'Spaces aktiv', value: data.kpis.spaces.active, tone: 'info' },
                  ]}
                  accent="orange"
                  statusChip={
                    data.errors.length > 0 
                      ? { label: `${data.errors.length} Fehler`, tone: 'warn' }
                      : { label: 'Alle Systeme OK', tone: 'ok' }
                  }
                />
              </Suspense>
            </ModuleBoundary>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/5">
          <p className="text-[9px] text-white/20">
            ARAS AI Mission Control • Build {import.meta.env.VITE_BUILD_ID || 'dev'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default MissionControl;
