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
  UserPlus, Mail, Building2, Globe, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// ═══════════════════════════════════════════════════════════════
// 🎨 ARAS ADMIN COMMAND CENTER - HIGH-END DESIGN
// ═══════════════════════════════════════════════════════════════

const DB_TABLES = [
  { id: 'users', name: 'Users', icon: Users, color: '#FE9100', gradient: 'from-orange-500/20 to-amber-500/10' },
  { id: 'leads', name: 'Leads', icon: TrendingUp, color: '#10B981', gradient: 'from-emerald-500/20 to-green-500/10' },
  { id: 'calendar_events', name: 'Calendar', icon: Calendar, color: '#F59E0B', gradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'contacts', name: 'Contacts', icon: Building2, color: '#8B5CF6', gradient: 'from-violet-500/20 to-purple-500/10' },
  { id: 'campaigns', name: 'Campaigns', icon: Megaphone, color: '#EC4899', gradient: 'from-pink-500/20 to-rose-500/10' },
  { id: 'chat_sessions', name: 'Chats', icon: MessageSquare, color: '#06B6D4', gradient: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'call_logs', name: 'Calls', icon: Phone, color: '#EF4444', gradient: 'from-red-500/20 to-orange-500/10' },
  { id: 'voice_agents', name: 'Agents', icon: Zap, color: '#F97316', gradient: 'from-orange-500/20 to-red-500/10' },
  { id: 'feedback', name: 'Feedback', icon: Bug, color: '#F43F5E', gradient: 'from-rose-500/20 to-pink-500/10' },
  { id: 'subscription_plans', name: 'Plans', icon: Crown, color: '#0EA5E9', gradient: 'from-sky-500/20 to-blue-500/10' },
  { id: 'sessions', name: 'Sessions', icon: Clock, color: '#78716C', gradient: 'from-stone-500/20 to-gray-500/10' }
];

const PLAN_OPTIONS = [
  { id: 'free', name: 'Free', icon: Star, color: '#6B7280' },
  { id: 'pro', name: 'Pro', icon: Zap, color: '#FE9100' },
  { id: 'ultra', name: 'Ultra', icon: Crown, color: '#8B5CF6' },
  { id: 'ultimate', name: 'Ultimate', icon: Sparkles, color: '#F59E0B' }
];

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active', color: '#10B981' },
  { id: 'trialing', name: 'Trial', color: '#F59E0B' },
  { id: 'canceled', name: 'Canceled', color: '#EF4444' },
  { id: 'past_due', name: 'Past Due', color: '#F97316' }
];

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const [selectedTable, setSelectedTable] = useState(DB_TABLES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Map table id to endpoint
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

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    }
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
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast({ title: "✅ Erfolgreich gelöscht!" });
    },
    onError: () => {
      toast({ title: "❌ Löschen fehlgeschlagen", variant: "destructive" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/admin/users/${id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: password }),
      });
      if (!res.ok) throw new Error('Password change failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Passwort geändert!" });
      setShowPasswordModal(false);
      setNewPassword("");
    },
    onError: () => {
      toast({ title: "❌ Passwort ändern fehlgeschlagen", variant: "destructive" });
    }
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, plan, status }: { id: string; plan: string; status?: string }) => {
      const res = await fetch(`/api/admin/users/${id}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, status }),
      });
      if (!res.ok) throw new Error('Plan change failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: "✅ Plan geändert!" });
      setShowPlanModal(false);
    },
    onError: () => {
      toast({ title: "❌ Plan ändern fehlgeschlagen", variant: "destructive" });
    }
  });

  const resetUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}/reset-usage`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Reset failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: "✅ Usage zurückgesetzt!" });
    },
    onError: () => {
      toast({ title: "❌ Reset fehlgeschlagen", variant: "destructive" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 🎨 HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  const filteredData = tableData?.filter((item: any) =>
    Object.values(item).some(val =>
      String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const getPlanBadge = (plan: string) => {
    const planConfig = PLAN_OPTIONS.find(p => p.id === plan) || PLAN_OPTIONS[0];
    const Icon = planConfig.icon;
    return (
      <span 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ 
          background: `${planConfig.color}20`,
          color: planConfig.color,
          border: `1px solid ${planConfig.color}40`
        }}
      >
        <Icon className="w-3 h-3" />
        {planConfig.name}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.id === status) || { name: status, color: '#6B7280' };
    return (
      <span 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ 
          background: `${statusConfig.color}20`,
          color: statusConfig.color
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusConfig.color }} />
        {statusConfig.name}
      </span>
    );
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // 🖼️ RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FE9100]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-6">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 🎯 HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 
                className="text-4xl font-black mb-2"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #ffd700)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                ARAS COMMAND CENTER
              </h1>
              <p className="text-white/40 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FE9100]" />
                Admin Dashboard • Full Database Access
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium"
              style={{
                background: 'rgba(254, 145, 0, 0.1)',
                border: '1px solid rgba(254, 145, 0, 0.3)'
              }}
            >
              <RefreshCw className="w-4 h-4 text-[#FE9100]" />
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 📊 STATS CARDS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
        >
          {[
            { label: 'Users', value: stats?.users || 0, icon: Users, color: '#FE9100', change: '+12%' },
            { label: 'Leads', value: stats?.leads || 0, icon: TrendingUp, color: '#10B981', change: '+8%' },
            { label: 'Contacts', value: stats?.contacts || 0, icon: Building2, color: '#8B5CF6', change: '+5%' },
            { label: 'Campaigns', value: stats?.campaigns || 0, icon: Megaphone, color: '#EC4899', change: '+3%' },
            { label: 'Calls', value: stats?.callLogs || 0, icon: Phone, color: '#06B6D4', change: '+15%' },
            { label: 'Feedback', value: stats?.feedback || 0, icon: Bug, color: '#F43F5E', change: '+2%' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="relative group"
            >
              <div 
                className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-[1.02]"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${stat.color}15` }}
                  >
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <span className="text-xs font-medium text-green-400 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-white/40">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 🗂️ MAIN CONTENT */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Table Selection */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-12 lg:col-span-2"
          >
            <div 
              className="rounded-2xl p-4 sticky top-6"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 px-2">
                Database Tables
              </h3>
              <div className="space-y-1">
                {DB_TABLES.map((table, idx) => {
                  const Icon = table.icon;
                  const isActive = selectedTable.id === table.id;
                  const count = selectedTable.id === table.id ? tableData?.length : null;
                  
                  return (
                    <motion.button
                      key={table.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.03 }}
                      onClick={() => {
                        setSelectedTable(table);
                        setSearchQuery("");
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-3 group ${
                        isActive ? '' : 'hover:bg-white/5'
                      }`}
                      style={isActive ? {
                        background: `linear-gradient(135deg, ${table.color}20, ${table.color}10)`,
                        border: `1px solid ${table.color}40`
                      } : {}}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{ 
                          background: isActive ? `${table.color}30` : 'rgba(255,255,255,0.05)'
                        }}
                      >
                        <Icon 
                          className="w-4 h-4 transition-colors" 
                          style={{ color: isActive ? table.color : '#6B7280' }} 
                        />
                      </div>
                      <span className={`flex-1 font-medium ${isActive ? 'text-white' : 'text-white/60'}`}>
                        {table.name}
                      </span>
                      {count !== null && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            background: `${table.color}20`,
                            color: table.color
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Main Table Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-12 lg:col-span-10"
          >
            {/* Toolbar */}
            <div 
              className="rounded-2xl p-4 mb-4 flex flex-wrap gap-4 items-center"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in table..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#FE9100]/50 transition-colors"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Database className="w-4 h-4" />
                <span>{filteredData.length} records</span>
              </div>
            </div>

            {/* Table */}
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              {isLoading ? (
                <div className="p-20 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-8 h-8 text-[#FE9100] mx-auto" />
                  </motion.div>
                  <p className="text-white/40 text-sm mt-4">Loading data...</p>
                </div>
              ) : error ? (
                <div className="p-20 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-400 mb-4">Failed to load data</p>
                  <Button onClick={() => refetch()} className="bg-[#FE9100] hover:bg-[#FE9100]/80 text-black">
                    Retry
                  </Button>
                </div>
              ) : selectedTable.id === 'users' ? (
                // ═══════════════════════════════════════════════════════════════
                // 👥 USERS TABLE - SPECIAL DESIGN
                // ═══════════════════════════════════════════════════════════════
                <div className="divide-y divide-white/5">
                  {filteredData.map((user: any, idx: number) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="p-4 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${PLAN_OPTIONS.find(p => p.id === user.subscriptionPlan)?.color || '#6B7280'}30, transparent)`,
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white truncate">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </span>
                            {getPlanBadge(user.subscriptionPlan)}
                            {getStatusBadge(user.subscriptionStatus)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/40">
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
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(user.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Usage Stats */}
                        <div className="hidden md:flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="text-white font-semibold">{user.aiMessagesUsed || 0}</div>
                            <div className="text-white/30 text-xs">Messages</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-semibold">{user.voiceCallsUsed || 0}</div>
                            <div className="text-white/30 text-xs">Calls</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedPlan(user.subscriptionPlan || 'free');
                              setSelectedStatus(user.subscriptionStatus || 'active');
                              setShowPlanModal(true);
                            }}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                            title="Change Plan"
                          >
                            <CreditCard className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPasswordModal(true);
                            }}
                            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors"
                            title="Change Password"
                          >
                            <Key className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => resetUsageMutation.mutate(user.id)}
                            className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                            title="Reset Usage"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              if (confirm('⚠️ User wirklich löschen?')) {
                                deleteMutation.mutate(user.id);
                              }
                            }}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                // ═══════════════════════════════════════════════════════════════
                // 📋 GENERIC TABLE
                // ═══════════════════════════════════════════════════════════════
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left p-4 text-white/40 font-medium text-xs uppercase tracking-wider">ID</th>
                        {filteredData[0] && Object.keys(filteredData[0])
                          .filter(key => !['id', 'password', 'sess'].includes(key))
                          .slice(0, 5)
                          .map(key => (
                            <th key={key} className="text-left p-4 text-white/40 font-medium text-xs uppercase tracking-wider">
                              {key.replace(/_/g, ' ')}
                            </th>
                          ))
                        }
                        <th className="text-right p-4 text-white/40 font-medium text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredData.map((item: any, idx: number) => (
                        <motion.tr 
                          key={item.id || idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="p-4 text-white/60 font-mono text-sm">
                            {String(item.id).substring(0, 8)}...
                          </td>
                          {Object.entries(item)
                            .filter(([key]) => !['id', 'password', 'sess'].includes(key))
                            .slice(0, 5)
                            .map(([key, value]) => (
                              <td key={key} className="p-4 text-white/80 text-sm max-w-[200px] truncate">
                                {value === null || value === undefined ? (
                                  <span className="text-white/20">-</span>
                                ) : typeof value === 'boolean' ? (
                                  value ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />
                                ) : typeof value === 'object' ? (
                                  <span className="text-white/40 text-xs">JSON</span>
                                ) : key.includes('At') || key.includes('Date') ? (
                                  formatDate(String(value))
                                ) : (
                                  String(value).substring(0, 40) + (String(value).length > 40 ? '...' : '')
                                )}
                              </td>
                            ))
                          }
                          <td className="p-4">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  if (confirm('⚠️ Wirklich löschen?')) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredData.length === 0 && (
                    <div className="p-20 text-center">
                      <Database className="w-12 h-12 text-white/10 mx-auto mb-4" />
                      <p className="text-white/40">No data found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🔲 MODALS */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(10,10,10,0.95))',
                border: '1px solid rgba(254, 145, 0, 0.2)'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  User Details
                </h2>
                <button onClick={() => setShowUserModal(false)} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedUser)
                  .filter(([key]) => key !== 'password')
                  .map(([key, value]) => (
                    <div key={key} className="p-3 rounded-xl bg-white/5">
                      <div className="text-xs text-white/40 mb-1">{key}</div>
                      <div className="text-sm text-white break-all">
                        {typeof value === 'object' 
                          ? JSON.stringify(value, null, 2)
                          : String(value || '-')}
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Plan Modal */}
      <AnimatePresence>
        {showPlanModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(10,10,10,0.95))',
                border: '1px solid rgba(254, 145, 0, 0.2)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Plan ändern
              </h2>

              <div className="mb-6">
                <label className="text-sm text-white/60 mb-2 block">User</label>
                <div className="text-white font-medium">{selectedUser.username}</div>
              </div>

              <div className="mb-6">
                <label className="text-sm text-white/60 mb-3 block">Plan auswählen</label>
                <div className="grid grid-cols-2 gap-3">
                  {PLAN_OPTIONS.map((plan) => {
                    const Icon = plan.icon;
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <motion.button
                        key={plan.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPlan(plan.id)}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                          background: isSelected ? `${plan.color}20` : 'rgba(255,255,255,0.05)',
                          border: `2px solid ${isSelected ? plan.color : 'transparent'}`
                        }}
                      >
                        <Icon className="w-5 h-5 mb-2" style={{ color: plan.color }} />
                        <div className="font-semibold text-white">{plan.name}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm text-white/60 mb-3 block">Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {STATUS_OPTIONS.map((status) => {
                    const isSelected = selectedStatus === status.id;
                    return (
                      <motion.button
                        key={status.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedStatus(status.id)}
                        className="p-3 rounded-xl text-center transition-all"
                        style={{
                          background: isSelected ? `${status.color}20` : 'rgba(255,255,255,0.05)',
                          border: `2px solid ${isSelected ? status.color : 'transparent'}`
                        }}
                      >
                        <span style={{ color: isSelected ? status.color : '#fff' }}>{status.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => changePlanMutation.mutate({ 
                    id: selectedUser.id, 
                    plan: selectedPlan,
                    status: selectedStatus 
                  })}
                  disabled={changePlanMutation.isPending}
                  className="flex-1 bg-[#FE9100] hover:bg-[#FE9100]/80 text-black font-semibold"
                >
                  {changePlanMutation.isPending ? 'Speichern...' : 'Speichern'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(10,10,10,0.95))',
                border: '1px solid rgba(139, 92, 246, 0.2)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Passwort ändern
              </h2>

              <div className="mb-6">
                <label className="text-sm text-white/60 mb-2 block">User</label>
                <div className="text-white font-medium">{selectedUser.username}</div>
              </div>

              <div className="mb-6">
                <label className="text-sm text-white/60 mb-2 block">Neues Passwort</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword("");
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => {
                    if (newPassword.length >= 6) {
                      changePasswordMutation.mutate({ id: selectedUser.id, password: newPassword });
                    } else {
                      toast({ title: "❌ Passwort zu kurz", variant: "destructive" });
                    }
                  }}
                  disabled={changePasswordMutation.isPending || newPassword.length < 6}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold"
                >
                  {changePasswordMutation.isPending ? 'Speichern...' : 'Speichern'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orbitron Font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}
