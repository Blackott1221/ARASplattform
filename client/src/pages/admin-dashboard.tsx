import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Database, Calendar, Phone, MessageSquare, 
  Megaphone, Bug, TrendingUp, Search, Trash2, RefreshCw, 
  Shield, Clock, Key, CreditCard, RotateCcw, X, Check, Eye,
  Zap, Crown, Star, Sparkles, Mail, Building2, AlertCircle, Wifi
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ═══════════════════════════════════════════════════════════════
// ARAS ADMIN DASHBOARD v3.0 - SIMPLE & WORKING
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

export default function AdminDashboard() {
  const [selectedTable, setSelectedTable] = useState(DB_TABLES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<{type: string; user: any} | null>(null);
  const [formData, setFormData] = useState({ plan: '', status: '', password: '' });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getEndpoint = (tableId: string) => {
    const map: Record<string, string> = {
      'users': '/api/admin/users',
      'leads': '/api/admin/leads',
      'calendar_events': '/api/admin/calendar-events',
      'contacts': '/api/admin/contacts',
      'campaigns': '/api/admin/campaigns',
      'chat_sessions': '/api/admin/chat-sessions',
      'voice_agents': '/api/admin/voice-agents',
      'call_logs': '/api/admin/call-logs',
      'feedback': '/api/admin/feedback',
      'subscription_plans': '/api/admin/subscription-plans',
      'sessions': '/api/admin/sessions'
    };
    return map[tableId] || `/api/admin/${tableId}`;
  };

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      return res.ok ? res.json() : {};
    },
    refetchInterval: 30000
  });

  // Fetch online users
  const { data: onlineData } = useQuery({
    queryKey: ['admin-online'],
    queryFn: async () => {
      const res = await fetch('/api/admin/online-users', { credentials: 'include' });
      return res.ok ? res.json() : { onlineUserIds: [] };
    },
    refetchInterval: 10000
  });

  // Fetch table data
  const { data: tableData = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-table', selectedTable.id],
    queryFn: async () => {
      const res = await fetch(getEndpoint(selectedTable.id), { credentials: 'include' });
      return res.ok ? res.json() : [];
    }
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getEndpoint(selectedTable.id)}/${id}`, { 
        method: 'DELETE', credentials: 'include' 
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-table'] });
      toast({ title: "✅ Gelöscht!" });
    },
    onError: () => toast({ title: "❌ Fehler", variant: "destructive" })
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, plan, status }: { id: string; plan: string; status: string }) => {
      const res = await fetch(`/api/admin/users/${id}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, status })
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-table'] });
      toast({ title: "✅ Plan geändert!" });
      setModal(null);
    },
    onError: () => toast({ title: "❌ Fehler", variant: "destructive" })
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/admin/users/${id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: password })
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Passwort geändert!" });
      setModal(null);
    },
    onError: () => toast({ title: "❌ Fehler", variant: "destructive" })
  });

  const resetUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}/reset-usage`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-table'] });
      toast({ title: "✅ Usage reset!" });
    },
    onError: () => toast({ title: "❌ Fehler", variant: "destructive" })
  });

  const isOnline = (id: string) => onlineData?.onlineUserIds?.includes(id);
  
  const filteredData = tableData.filter((item: any) =>
    Object.values(item).some(v => String(v || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openModal = (type: string, user: any) => {
    console.log('Opening modal:', type, user.username);
    setFormData({
      plan: user.subscriptionPlan || 'free',
      status: user.subscriptionStatus || 'active',
      password: ''
    });
    setModal({ type, user });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FE9100] flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard v3</h1>
            <p className="text-sm text-white/40">Manage everything</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
            {onlineData?.onlineUserIds?.length || 0} online
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Users', value: stats?.users || 0, color: '#FE9100' },
          { label: 'Online', value: onlineData?.onlineUserIds?.length || 0, color: '#10B981' },
          { label: 'Leads', value: stats?.leads || 0, color: '#8B5CF6' },
          { label: 'Calls', value: stats?.callLogs || 0, color: '#06B6D4' },
          { label: 'Messages', value: stats?.totalAiMessages || 0, color: '#EC4899' },
          { label: 'Feedback', value: stats?.feedback || 0, color: '#F43F5E' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-white/40 mb-1">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main Layout */}
      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <div className="rounded-xl bg-white/5 p-3 space-y-1">
            {DB_TABLES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTable(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  selectedTable.id === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
                }`}
              >
                <t.icon className="w-4 h-4" style={{ color: selectedTable.id === t.id ? t.color : '' }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Search */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <span className="text-sm text-white/40">{filteredData.length} items</span>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-white/40">Loading...</div>
            ) : selectedTable.id === 'users' ? (
              <div className="divide-y divide-white/10">
                {filteredData.map((user: any) => (
                  <div key={user.id} className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
                        {(user.username?.[0] || '?').toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0b] ${
                        isOnline(user.id) ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#FE9100]/20 text-[#FE9100]">
                          {user.subscriptionPlan || 'free'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          {user.subscriptionStatus || 'active'}
                        </span>
                        {isOnline(user.id) && (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40">{user.email}</div>
                    </div>

                    {/* Stats */}
                    <div className="text-center px-4">
                      <div className="font-bold">{user.aiMessagesUsed || 0}</div>
                      <div className="text-[10px] text-white/30">AI</div>
                    </div>
                    <div className="text-center px-4">
                      <div className="font-bold">{user.voiceCallsUsed || 0}</div>
                      <div className="text-[10px] text-white/30">Calls</div>
                    </div>

                    {/* BUTTONS - SIMPLE ONCLICK */}
                    <div className="flex gap-1">
                      <button
                        className="p-2 rounded bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => openModal('details', user)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                        onClick={() => openModal('plan', user)}
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-400"
                        onClick={() => openModal('password', user)}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
                        onClick={() => {
                          if (confirm('Reset usage?')) resetUsageMutation.mutate(user.id);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400"
                        onClick={() => {
                          if (confirm('Delete user?')) deleteMutation.mutate(user.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-xs text-white/40">ID</th>
                    {filteredData[0] && Object.keys(filteredData[0]).filter(k => k !== 'id' && k !== 'password').slice(0, 4).map(k => (
                      <th key={k} className="text-left p-3 text-xs text-white/40">{k}</th>
                    ))}
                    <th className="text-right p-3 text-xs text-white/40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item: any) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-xs text-white/50 font-mono">{String(item.id).slice(0, 8)}</td>
                      {Object.entries(item).filter(([k]) => k !== 'id' && k !== 'password').slice(0, 4).map(([k, v]) => (
                        <td key={k} className="p-3 text-sm text-white/70 max-w-[150px] truncate">
                          {v === null ? '-' : typeof v === 'object' ? 'JSON' : String(v).slice(0, 30)}
                        </td>
                      ))}
                      <td className="p-3 text-right">
                        <button
                          className="p-1.5 rounded bg-red-500/20 text-red-400"
                          onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS - SIMPLE CONDITIONAL RENDERING */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      
      {modal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={() => setModal(null)}
        >
          <div 
            className="bg-[#1a1a1c] rounded-2xl w-full max-w-lg border border-white/20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold">
                {modal.type === 'plan' && 'Plan ändern'}
                {modal.type === 'password' && 'Passwort ändern'}
                {modal.type === 'details' && 'User Details'}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* PLAN MODAL */}
              {modal.type === 'plan' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-white/50 mb-1">User</div>
                    <div className="text-lg font-bold">{modal.user.username}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-white/50 mb-2">Plan</div>
                    <div className="grid grid-cols-4 gap-2">
                      {['free', 'pro', 'ultra', 'ultimate'].map(p => (
                        <button
                          key={p}
                          onClick={() => setFormData(d => ({ ...d, plan: p }))}
                          className={`p-3 rounded-xl text-center capitalize ${
                            formData.plan === p 
                              ? 'bg-[#FE9100] text-black font-bold' 
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-white/50 mb-2">Status</div>
                    <div className="grid grid-cols-2 gap-2">
                      {['active', 'trialing', 'canceled', 'past_due'].map(s => (
                        <button
                          key={s}
                          onClick={() => setFormData(d => ({ ...d, status: s }))}
                          className={`p-2 rounded-xl text-center text-sm ${
                            formData.status === s 
                              ? 'bg-emerald-500 text-black font-bold' 
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setModal(null)}
                      className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => {
                        changePlanMutation.mutate({
                          id: modal.user.id,
                          plan: formData.plan,
                          status: formData.status
                        });
                      }}
                      disabled={changePlanMutation.isPending}
                      className="flex-1 py-3 rounded-xl bg-[#FE9100] text-black font-bold hover:bg-[#ff8000] disabled:opacity-50"
                    >
                      {changePlanMutation.isPending ? 'Saving...' : 'Speichern'}
                    </button>
                  </div>
                </div>
              )}

              {/* PASSWORD MODAL */}
              {modal.type === 'password' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-white/50 mb-1">User</div>
                    <div className="text-lg font-bold">{modal.user.username}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-white/50 mb-2">Neues Passwort</div>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData(d => ({ ...d, password: e.target.value }))}
                      placeholder="Min. 6 Zeichen"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-lg"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setModal(null)}
                      className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => {
                        if (formData.password.length >= 6) {
                          changePasswordMutation.mutate({
                            id: modal.user.id,
                            password: formData.password
                          });
                        } else {
                          alert('Mindestens 6 Zeichen!');
                        }
                      }}
                      disabled={changePasswordMutation.isPending}
                      className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-600 disabled:opacity-50"
                    >
                      {changePasswordMutation.isPending ? 'Saving...' : 'Speichern'}
                    </button>
                  </div>
                </div>
              )}

              {/* DETAILS MODAL */}
              {modal.type === 'details' && (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {Object.entries(modal.user)
                    .filter(([k]) => k !== 'password')
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2 p-2 rounded-lg bg-white/5">
                        <div className="w-32 text-xs text-white/40 flex-shrink-0">{k}</div>
                        <div className="text-sm break-all flex-1">
                          {v === null ? <span className="text-white/30">null</span> : 
                           typeof v === 'object' ? <pre className="text-xs">{JSON.stringify(v, null, 2)}</pre> : 
                           String(v)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
