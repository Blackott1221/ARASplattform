import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Database, Calendar, Phone, MessageSquare, 
  Megaphone, Settings, Bug, Activity, TrendingUp,
  Search, Edit2, Trash2, RefreshCw, Shield, Clock, Key, 
  CreditCard, RotateCcw, X, Check, ChevronDown, Eye,
  Zap, Crown, Star, Sparkles, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Filter, Download, MoreVertical,
  UserPlus, Mail, Building2, Globe, AlertCircle, Wifi,
  WifiOff, ChevronRight, LogOut, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ═══════════════════════════════════════════════════════════════
// 🎨 ARAS ADMIN DASHBOARD - CLEAN & FUNCTIONAL
// ═══════════════════════════════════════════════════════════════

const DB_TABLES = [
  { id: 'users', name: 'Users', icon: Users, color: '#FE9100' },
  { id: 'leads', name: 'Leads', icon: TrendingUp, color: '#10B981' },
  { id: 'calendar_events', name: 'Calendar', icon: Calendar, color: '#F59E0B' },
  { id: 'contacts', name: 'Contacts', icon: Building2, color: '#8B5CF6' },
  { id: 'campaigns', name: 'Campaigns', icon: Megaphone, color: '#EC4899' },
  { id: 'chat_sessions', name: 'Chats', icon: MessageSquare, color: '#06B6D4' },
  { id: 'call_logs', name: 'Calls', icon: Phone, color: '#EF4444' },
  { id: 'voice_agents', name: 'Agents', icon: Zap, color: '#F97316' },
  { id: 'feedback', name: 'Feedback', icon: Bug, color: '#F43F5E' },
  { id: 'subscription_plans', name: 'Plans', icon: Crown, color: '#0EA5E9' },
  { id: 'sessions', name: 'Sessions', icon: Clock, color: '#78716C' }
];

const PLAN_CONFIG: Record<string, { name: string; icon: any; color: string }> = {
  'free': { name: 'Free', icon: Star, color: '#6B7280' },
  'starter': { name: 'Starter', icon: Star, color: '#6B7280' },
  'pro': { name: 'Pro', icon: Zap, color: '#FE9100' },
  'professional': { name: 'Pro', icon: Zap, color: '#FE9100' },
  'ultra': { name: 'Ultra', icon: Crown, color: '#8B5CF6' },
  'ultimate': { name: 'Ultimate', icon: Sparkles, color: '#F59E0B' },
  'enterprise': { name: 'Enterprise', icon: Sparkles, color: '#F59E0B' }
};

const STATUS_CONFIG: Record<string, { name: string; color: string }> = {
  'active': { name: 'Active', color: '#10B981' },
  'trialing': { name: 'Trial', color: '#F59E0B' },
  'trial_pending': { name: 'Trial Pending', color: '#F97316' },
  'canceled': { name: 'Canceled', color: '#EF4444' },
  'past_due': { name: 'Past Due', color: '#F97316' },
  'requires_payment': { name: 'Needs Payment', color: '#EF4444' }
};

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const [selectedTable, setSelectedTable] = useState(DB_TABLES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalType, setModalType] = useState<'details' | 'plan' | 'password' | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get API endpoint for table
  const getEndpoint = (tableId: string) => {
    const endpoints: Record<string, string> = {
      'users': '/api/admin/users',
      'leads': '/api/admin/leads',
      'calendar_events': '/api/admin/calendar-events',
      'contacts': '/api/admin/contacts',
      'campaigns': '/api/admin/campaigns',
      'chat_sessions': '/api/admin/chat-sessions',
      'chat_messages': '/api/admin/chat-messages',
      'voice_agents': '/api/admin/voice-agents',
      'call_logs': '/api/admin/call-logs',
      'voice_tasks': '/api/admin/voice-tasks',
      'feedback': '/api/admin/feedback',
      'usage_tracking': '/api/admin/usage-tracking',
      'twilio_settings': '/api/admin/twilio-settings',
      'subscription_plans': '/api/admin/subscription-plans',
      'sessions': '/api/admin/sessions'
    };
    return endpoints[tableId] || `/api/admin/${tableId}`;
  };

  // ═══════════════════════════════════════════════════════════════
  // 📊 DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: onlineData, refetch: refetchOnline } = useQuery({
    queryKey: ['admin', 'online-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/online-users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch online users');
      return res.json();
    },
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  const { data: tableData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', selectedTable.id],
    queryFn: async () => {
      const endpoint = getEndpoint(selectedTable.id);
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    }
  });

  // Check if user is online
  const isUserOnline = (userId: string) => {
    return onlineData?.onlineUserIds?.includes(userId) || false;
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔄 MUTATIONS
  // ═══════════════════════════════════════════════════════════════

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const endpoint = getEndpoint(selectedTable.id);
      const res = await fetch(`${endpoint}/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Delete failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast({ title: "✅ Erfolgreich gelöscht!" });
    },
    onError: (err: any) => {
      toast({ title: "❌ Fehler", description: err.message, variant: "destructive" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      console.log('[ADMIN] Changing password for user:', id);
      const res = await fetch(`/api/admin/users/${id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: password }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Password change failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Passwort geändert!" });
      closeModal();
    },
    onError: (err: any) => {
      toast({ title: "❌ Fehler", description: err.message, variant: "destructive" });
    }
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, plan, status }: { id: string; plan: string; status?: string }) => {
      console.log('[ADMIN] Changing plan for user:', id, 'to:', plan, status);
      const res = await fetch(`/api/admin/users/${id}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, status }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Plan change failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast({ title: "✅ Plan geändert!" });
      closeModal();
    },
    onError: (err: any) => {
      toast({ title: "❌ Fehler", description: err.message, variant: "destructive" });
    }
  });

  const resetUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[ADMIN] Resetting usage for user:', id);
      const res = await fetch(`/api/admin/users/${id}/reset-usage`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Reset failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: "✅ Usage zurückgesetzt!" });
    },
    onError: (err: any) => {
      toast({ title: "❌ Fehler", description: err.message, variant: "destructive" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 🎨 HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setNewPassword("");
    setSelectedPlan("");
    setSelectedStatus("");
  };

  const openPlanModal = (user: any) => {
    setSelectedUser(user);
    setSelectedPlan(user.subscriptionPlan || 'free');
    setSelectedStatus(user.subscriptionStatus || 'active');
    setModalType('plan');
  };

  const openPasswordModal = (user: any) => {
    setSelectedUser(user);
    setNewPassword("");
    setModalType('password');
  };

  const openDetailsModal = (user: any) => {
    setSelectedUser(user);
    setModalType('details');
  };

  const filteredData = tableData?.filter((item: any) =>
    Object.values(item).some(val =>
      String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getPlanBadge = (plan: string) => {
    const config = PLAN_CONFIG[plan?.toLowerCase()] || PLAN_CONFIG.free;
    const Icon = config.icon;
    return (
      <span 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
        style={{ background: `${config.color}20`, color: config.color }}
      >
        <Icon className="w-3 h-3" />
        {config.name}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status?.toLowerCase()] || { name: status, color: '#6B7280' };
    return (
      <span 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
        style={{ background: `${config.color}15`, color: config.color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
        {config.name}
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // 🖼️ RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#FE9100]/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-violet-500/[0.02] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto p-6">
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 🎯 HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FE9100] to-[#FF6B00] flex items-center justify-center">
                <Shield className="w-5 h-5 text-black" />
              </div>
              Admin Dashboard
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Manage users, view analytics, control your platform
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Online indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/70">
                <span className="text-emerald-400 font-semibold">{stats?.onlineUsers || 0}</span> online
              </span>
            </div>
            
            <button
              onClick={() => { refetch(); refetchStats(); refetchOnline(); }}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 📊 STATS OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Users', value: stats?.users || 0, icon: Users, color: '#FE9100' },
            { label: 'Online Now', value: stats?.onlineUsers || 0, icon: Wifi, color: '#10B981' },
            { label: 'Leads', value: stats?.leads || 0, icon: TrendingUp, color: '#8B5CF6' },
            { label: 'Calls', value: stats?.callLogs || 0, icon: Phone, color: '#06B6D4' },
            { label: 'AI Messages', value: stats?.totalAiMessages || 0, icon: MessageSquare, color: '#EC4899' },
            { label: 'Feedback', value: stats?.feedback || 0, icon: Bug, color: '#F43F5E' },
          ].map((stat) => (
            <div 
              key={stat.label}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs text-white/40">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 🗂️ MAIN LAYOUT */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* Sidebar - Table Selection */}
          <div className="col-span-12 lg:col-span-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 sticky top-6">
              <div className="text-xs text-white/30 uppercase tracking-wider font-medium mb-3 px-2">
                Tables
              </div>
              <div className="space-y-1">
                {DB_TABLES.map((table) => {
                  const Icon = table.icon;
                  const isActive = selectedTable.id === table.id;
                  return (
                    <button
                      key={table.id}
                      onClick={() => { setSelectedTable(table); setSearchQuery(""); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive 
                          ? 'bg-white/10 text-white' 
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" style={{ color: isActive ? table.color : 'inherit' }} />
                      <span className="flex-1 text-left">{table.name}</span>
                      {isActive && tableData && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">{tableData.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-10">
            
            {/* Search Bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search in ${selectedTable.name}...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#FE9100]/50"
                />
              </div>
              <div className="text-sm text-white/40 flex items-center gap-2">
                <Database className="w-4 h-4" />
                {filteredData.length} records
              </div>
            </div>

            {/* Table Content */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
              {isLoading ? (
                <div className="p-16 text-center">
                  <RefreshCw className="w-6 h-6 text-[#FE9100] mx-auto animate-spin" />
                  <p className="text-white/40 text-sm mt-3">Loading...</p>
                </div>
              ) : error ? (
                <div className="p-16 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  <p className="text-red-400">Failed to load data</p>
                  <button onClick={() => refetch()} className="mt-3 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20">
                    Retry
                  </button>
                </div>
              ) : selectedTable.id === 'users' ? (
                /* ═══════════════════════════════════════════════════════════════ */
                /* 👥 USERS TABLE - SPECIAL LAYOUT */
                /* ═══════════════════════════════════════════════════════════════ */
                <div className="divide-y divide-white/5">
                  {filteredData.length === 0 ? (
                    <div className="p-16 text-center text-white/40">No users found</div>
                  ) : filteredData.map((user: any) => {
                    const online = isUserOnline(user.id);
                    return (
                      <div key={user.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-4">
                          {/* Avatar with online indicator */}
                          <div className="relative">
                            <div 
                              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold"
                              style={{ 
                                background: `linear-gradient(135deg, ${PLAN_CONFIG[user.subscriptionPlan?.toLowerCase()]?.color || '#6B7280'}40, transparent)`,
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}
                            >
                              {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
                            </div>
                            {/* Online dot */}
                            <div 
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0B] ${
                                online ? 'bg-emerald-400' : 'bg-zinc-600'
                              }`}
                              title={online ? 'Online' : 'Offline'}
                            />
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}`
                                  : user.username}
                              </span>
                              {getPlanBadge(user.subscriptionPlan)}
                              {getStatusBadge(user.subscriptionStatus)}
                              {online && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">
                                  <Wifi className="w-2.5 h-2.5" /> LIVE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/40 mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email || user.username}
                              </span>
                              {user.company && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {user.company}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Usage Stats */}
                          <div className="hidden lg:flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <div className="font-semibold text-white">{user.aiMessagesUsed || 0}</div>
                              <div className="text-[10px] text-white/30">AI Msgs</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-white">{user.voiceCallsUsed || 0}</div>
                              <div className="text-[10px] text-white/30">Calls</div>
                            </div>
                          </div>

                          {/* ALWAYS VISIBLE Action Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openDetailsModal(user)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                              title="Details anzeigen"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openPlanModal(user)}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                              title="Plan ändern"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openPasswordModal(user)}
                              className="p-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 transition-all"
                              title="Passwort ändern"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Usage für ${user.username} zurücksetzen?`)) {
                                  resetUsageMutation.mutate(user.id);
                                }
                              }}
                              className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all"
                              title="Usage zurücksetzen"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`⚠️ User "${user.username}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden!`)) {
                                  deleteMutation.mutate(user.id);
                                }
                              }}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                              title="User löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ═══════════════════════════════════════════════════════════════ */
                /* 📋 GENERIC TABLE */
                /* ═══════════════════════════════════════════════════════════════ */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left p-3 text-xs text-white/40 font-medium">ID</th>
                        {filteredData[0] && Object.keys(filteredData[0])
                          .filter(key => !['id', 'password', 'sess'].includes(key))
                          .slice(0, 5)
                          .map(key => (
                            <th key={key} className="text-left p-3 text-xs text-white/40 font-medium">
                              {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                            </th>
                          ))
                        }
                        <th className="text-right p-3 text-xs text-white/40 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-16 text-center text-white/40">No data found</td>
                        </tr>
                      ) : filteredData.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="hover:bg-white/[0.02]">
                          <td className="p-3 text-white/50 font-mono text-xs">
                            {String(item.id).length > 10 ? String(item.id).substring(0, 10) + '...' : item.id}
                          </td>
                          {Object.entries(item)
                            .filter(([key]) => !['id', 'password', 'sess'].includes(key))
                            .slice(0, 5)
                            .map(([key, value]) => (
                              <td key={key} className="p-3 text-white/70 text-sm max-w-[200px] truncate">
                                {value === null || value === undefined ? (
                                  <span className="text-white/20">-</span>
                                ) : typeof value === 'boolean' ? (
                                  value ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-red-400" />
                                ) : typeof value === 'object' ? (
                                  <span className="text-white/30 text-xs bg-white/5 px-1.5 py-0.5 rounded">JSON</span>
                                ) : key.toLowerCase().includes('at') || key.toLowerCase().includes('date') ? (
                                  formatDate(String(value))
                                ) : (
                                  String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value)
                                )}
                              </td>
                            ))
                          }
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm('Diesen Eintrag wirklich löschen?')) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🔲 MODALS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      
      <AnimatePresence>
        {modalType && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-[#111113] border border-white/10 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white">
                  {modalType === 'details' && 'User Details'}
                  {modalType === 'plan' && 'Plan ändern'}
                  {modalType === 'password' && 'Passwort ändern'}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5">
                
                {/* DETAILS MODAL */}
                {modalType === 'details' && (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {Object.entries(selectedUser)
                      .filter(([key]) => key !== 'password')
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-3 p-3 rounded-lg bg-white/5">
                          <div className="text-xs text-white/40 w-32 flex-shrink-0">{key}</div>
                          <div className="text-sm text-white break-all flex-1">
                            {typeof value === 'object' 
                              ? <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                              : String(value ?? '-')}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* PLAN MODAL */}
                {modalType === 'plan' && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-sm text-white/50 mb-1">User</div>
                      <div className="text-white font-medium">{selectedUser.username}</div>
                    </div>

                    <div>
                      <div className="text-sm text-white/50 mb-3">Plan auswählen</div>
                      <div className="grid grid-cols-2 gap-2">
                        {['free', 'pro', 'ultra', 'ultimate'].map((plan) => {
                          const config = PLAN_CONFIG[plan];
                          const Icon = config.icon;
                          const isSelected = selectedPlan === plan;
                          return (
                            <button
                              key={plan}
                              onClick={() => setSelectedPlan(plan)}
                              className={`p-3 rounded-xl text-left transition-all border-2 ${
                                isSelected ? '' : 'border-transparent bg-white/5 hover:bg-white/10'
                              }`}
                              style={isSelected ? { 
                                background: `${config.color}15`,
                                borderColor: config.color 
                              } : {}}
                            >
                              <Icon className="w-5 h-5 mb-2" style={{ color: config.color }} />
                              <div className="font-medium text-white">{config.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-white/50 mb-3">Status</div>
                      <div className="grid grid-cols-2 gap-2">
                        {['active', 'trialing', 'canceled', 'past_due'].map((status) => {
                          const config = STATUS_CONFIG[status];
                          const isSelected = selectedStatus === status;
                          return (
                            <button
                              key={status}
                              onClick={() => setSelectedStatus(status)}
                              className={`p-2.5 rounded-xl text-center transition-all border-2 ${
                                isSelected ? '' : 'border-transparent bg-white/5 hover:bg-white/10'
                              }`}
                              style={isSelected ? { 
                                background: `${config.color}15`,
                                borderColor: config.color 
                              } : {}}
                            >
                              <span className="text-sm" style={{ color: isSelected ? config.color : 'white' }}>
                                {config.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => {
                          if (!selectedPlan) {
                            toast({ title: "❌ Bitte Plan auswählen", variant: "destructive" });
                            return;
                          }
                          changePlanMutation.mutate({ 
                            id: selectedUser.id, 
                            plan: selectedPlan,
                            status: selectedStatus 
                          });
                        }}
                        disabled={changePlanMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl bg-[#FE9100] hover:bg-[#FF7A00] text-black font-semibold transition-colors disabled:opacity-50"
                      >
                        {changePlanMutation.isPending ? 'Speichern...' : 'Speichern'}
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSWORD MODAL */}
                {modalType === 'password' && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-sm text-white/50 mb-1">User</div>
                      <div className="text-white font-medium">{selectedUser.username}</div>
                    </div>

                    <div>
                      <div className="text-sm text-white/50 mb-2">Neues Passwort</div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mindestens 6 Zeichen"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                        autoFocus
                      />
                      {newPassword && newPassword.length < 6 && (
                        <p className="text-xs text-red-400 mt-2">Mindestens 6 Zeichen erforderlich</p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => {
                          if (newPassword.length < 6) {
                            toast({ title: "❌ Passwort zu kurz", description: "Mindestens 6 Zeichen", variant: "destructive" });
                            return;
                          }
                          changePasswordMutation.mutate({ id: selectedUser.id, password: newPassword });
                        }}
                        disabled={changePasswordMutation.isPending || newPassword.length < 6}
                        className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold transition-colors disabled:opacity-50"
                      >
                        {changePasswordMutation.isPending ? 'Speichern...' : 'Speichern'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
