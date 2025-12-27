import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Database, Calendar, Phone, MessageSquare, 
  Megaphone, Settings, Bug, Activity, TrendingUp,
  Search, Edit2, Trash2, RefreshCw, Shield, Clock, Key, CreditCard, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const DB_TABLES = [
  { id: 'users', name: 'Users', icon: Users, color: '#4F46E5', endpoint: '/api/admin/users' },
  { id: 'leads', name: 'Leads', icon: TrendingUp, color: '#10B981', endpoint: '/api/admin/leads' },
  { id: 'calendar_events', name: 'Calendar', icon: Calendar, color: '#F59E0B', endpoint: '/api/admin/calendar-events' },
  { id: 'contacts', name: 'Contacts', icon: Users, color: '#8B5CF6', endpoint: '/api/admin/contacts' },
  { id: 'campaigns', name: 'Campaigns', icon: Megaphone, color: '#EC4899', endpoint: '/api/admin/campaigns' },
  { id: 'chat_sessions', name: 'Chats', icon: MessageSquare, color: '#06B6D4', endpoint: '/api/admin/chat-sessions' },
  { id: 'chat_messages', name: 'Messages', icon: MessageSquare, color: '#14B8A6', endpoint: '/api/admin/chat-messages' },
  { id: 'voice_agents', name: 'Agents', icon: Phone, color: '#F97316', endpoint: '/api/admin/voice-agents' },
  { id: 'call_logs', name: 'Calls', icon: Phone, color: '#EF4444', endpoint: '/api/admin/call-logs' },
  { id: 'voice_tasks', name: 'Tasks', icon: Activity, color: '#84CC16', endpoint: '/api/admin/voice-tasks' },
  { id: 'feedback', name: 'Feedback', icon: Bug, color: '#F43F5E', endpoint: '/api/admin/feedback' },
  { id: 'usage_tracking', name: 'Usage', icon: Activity, color: '#6366F1', endpoint: '/api/admin/usage-tracking' },
  { id: 'twilio_settings', name: 'Twilio', icon: Settings, color: '#64748B', endpoint: '/api/admin/twilio-settings' },
  { id: 'subscription_plans', name: 'Plans', icon: Shield, color: '#0EA5E9', endpoint: '/api/admin/subscription-plans' },
  { id: 'sessions', name: 'Sessions', icon: Clock, color: '#78716C', endpoint: '/api/admin/sessions' }
];

export default function AdminDashboard() {
  const [selectedTable, setSelectedTable] = useState(DB_TABLES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewDetailsId, setViewDetailsId] = useState<string | number | null>(null);
  const [editMode, setEditMode] = useState<{id: string | number, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch table data
  const { data: tableData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', selectedTable.id],
    queryFn: async () => {
      console.log(`🔵 Fetching ${selectedTable.endpoint}...`);
      const res = await fetch(selectedTable.endpoint, {
        credentials: 'include', // Important for cookies
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log(`🔵 Response status: ${res.status}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`🔴 Failed to fetch:`, errorText);
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      console.log(`✅ Fetched ${data.length} records from ${selectedTable.name}`);
      return data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      console.log(`🔵 Deleting item ${id} from ${selectedTable.endpoint}...`);
      const res = await fetch(`${selectedTable.endpoint}/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        console.error(`🔴 Delete failed: ${res.status}`);
        throw new Error('Delete failed');
      }
      const data = await res.json();
      console.log(`✅ Deleted successfully:`, data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      toast({ title: "✅ Deleted successfully!" });
    },
    onError: (error) => {
      console.error('🔴 Delete error:', error);
      toast({ title: "❌ Delete failed", description: String(error), variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string | number; field: string; value: any }) => {
      console.log(`🔵 Updating ${field} for item ${id}...`);
      const res = await fetch(`${selectedTable.endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        console.error(`🔴 Update failed: ${res.status}`);
        throw new Error('Update failed');
      }
      const data = await res.json();
      console.log(`✅ Updated successfully:`, data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      toast({ title: "✅ Updated successfully!" });
      setEditMode(null);
    },
    onError: (error) => {
      console.error('🔴 Update error:', error);
      toast({ title: "❌ Update failed", description: String(error), variant: "destructive" });
    }
  });

  // USER SPECIFIC ACTIONS

  // Change Password
  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      console.log(`🔵 Changing password for user ${id}...`);
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
      toast({ title: "✅ Password changed!" });
    },
    onError: (error) => {
      toast({ title: "❌ Failed to change password", description: String(error), variant: "destructive" });
    }
  });

  // Change Plan
  const changePlanMutation = useMutation({
    mutationFn: async ({ id, plan, status }: { id: string; plan: string; status?: string }) => {
      console.log(`🔵 Changing plan for user ${id} to ${plan}...`);
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
      toast({ title: "✅ Plan changed!" });
    },
    onError: (error) => {
      toast({ title: "❌ Failed to change plan", description: String(error), variant: "destructive" });
    }
  });

  // Reset Usage
  const resetUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log(`🔵 Resetting usage for user ${id}...`);
      const res = await fetch(`/api/admin/users/${id}/reset-usage`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Reset failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: "✅ Usage reset!" });
    },
    onError: (error) => {
      toast({ title: "❌ Reset failed", description: String(error), variant: "destructive" });
    }
  });

  const filteredData = tableData?.filter((item: any) =>
    Object.values(item).some(val =>
      String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const handleDelete = (id: string | number) => {
    if (confirm('⚠️ Are you sure? This cannot be undone!')) {
      deleteMutation.mutate(id);
    }
  };

  const handleQuickEdit = (id: string | number, field: string, currentValue: any) => {
    setEditMode({ id, field });
    setEditValue(String(currentValue || ''));
  };

  const handleSaveEdit = () => {
    if (editMode) {
      updateMutation.mutate({ 
        id: editMode.id, 
        field: editMode.field, 
        value: editValue 
      });
    }
  };

  const handleChangePassword = (id: string) => {
    const password = prompt('Enter new password (min 6 characters):');
    if (password && password.length >= 6) {
      changePasswordMutation.mutate({ id, password });
    } else if (password) {
      toast({ title: "❌ Password too short", variant: "destructive" });
    }
  };

  const handleChangePlan = (id: string, currentPlan: string) => {
    const plans = ['free', 'pro', 'ultra', 'ultimate'];
    const plan = prompt(`Change plan to (${plans.join(', ')}):`, currentPlan || 'free');
    if (plan && plans.includes(plan.toLowerCase())) {
      changePlanMutation.mutate({ id, plan: plan.toLowerCase(), status: 'active' });
    } else if (plan) {
      toast({ title: "❌ Invalid plan", description: `Valid plans: ${plans.join(', ')}`, variant: "destructive" });
    }
  };

  const handleResetUsage = (id: string) => {
    if (confirm('Reset usage counters to 0?')) {
      resetUsageMutation.mutate(id);
    }
  };

  const renderValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 30) + '...';
    if (String(value).length > 40) return String(value).substring(0, 40) + '...';
    return String(value);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 
          className="text-3xl font-black mb-1"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            background: 'linear-gradient(135deg, #e9d7c4, #FE9100, #ffd700)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          ARAS ADMIN
        </h1>
        <p className="text-white/60 text-sm">Database Management - {DB_TABLES.length} Tables | Sorted: Newest First</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-2">
          <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
            {DB_TABLES.map((table) => {
              const Icon = table.icon;
              const isActive = selectedTable.id === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => {
                    console.log(`🔵 Switching to table: ${table.name}`);
                    setSelectedTable(table);
                    setViewDetailsId(null);
                    setEditMode(null);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition ${
                    isActive
                      ? 'bg-[#FE9100] text-black font-bold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: isActive ? '#000' : table.color }} />
                    <span className="truncate">{table.name}</span>
                    {tableData && (
                      <span className={`ml-auto text-[10px] ${isActive ? 'text-black/60' : 'text-white/40'}`}>
                        {tableData.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-10">
          {/* Toolbar */}
          <div className="bg-white/5 rounded-lg p-3 mb-3 flex flex-wrap gap-3 items-center text-sm">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 bg-white/10 border-white/20 text-white text-sm h-8"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                console.log('🔵 Refreshing data...');
                refetch();
              }}
              className="bg-white/10 hover:bg-white/20 text-white h-8 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <div className="text-xs text-white/60">
              {filteredData.length} of {tableData?.length || 0}
            </div>
            {error && (
              <div className="text-red-400 text-xs">
                ❌ Error loading data
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white/5 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center">
                <RefreshCw className="w-6 h-6 text-[#FE9100] animate-spin mx-auto" />
                <p className="text-white/40 text-sm mt-2">Loading...</p>
              </div>
            ) : error ? (
              <div className="p-16 text-center">
                <p className="text-red-400 mb-4">Failed to load data</p>
                <Button onClick={() => refetch()} className="bg-[#FE9100] text-black">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-white/60 font-semibold text-[11px]">ID</th>
                      {filteredData[0] && Object.keys(filteredData[0])
                        .filter(key => key !== 'id' && key !== 'password')
                        .slice(0, 4)
                        .map(key => (
                          <th key={key} className="text-left p-2 text-white/60 font-semibold text-[11px]">
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))
                      }
                      <th className="text-right p-2 text-white/60 font-semibold text-[11px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-2 text-white/80 font-mono text-[10px]">{item.id}</td>
                        {Object.keys(item)
                          .filter(key => key !== 'id' && key !== 'password')
                          .slice(0, 4)
                          .map(key => (
                            <td key={key} className="p-2 text-white/60">
                              {editMode?.id === item.id && editMode?.field === key ? (
                                <div className="flex gap-1">
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white text-xs p-1 h-6 w-32"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    className="bg-green-500 hover:bg-green-600 text-white h-6 px-2 text-[10px]"
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setEditMode(null)}
                                    className="bg-gray-500 hover:bg-gray-600 text-white h-6 px-2 text-[10px]"
                                  >
                                    ✗
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleQuickEdit(item.id, key, item[key])}
                                  className="text-left hover:text-white transition w-full"
                                >
                                  {renderValue(item[key])}
                                </button>
                              )}
                            </td>
                          ))
                        }
                        <td className="p-2">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {/* USER SPECIFIC BUTTONS */}
                            {selectedTable.id === 'users' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleChangePassword(item.id)}
                                  title="Change Password"
                                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 h-6 px-1.5 text-[10px]"
                                >
                                  <Key className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleChangePlan(item.id, item.subscriptionPlan)}
                                  title="Change Plan"
                                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 h-6 px-1.5 text-[10px]"
                                >
                                  <CreditCard className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleResetUsage(item.id)}
                                  title="Reset Usage"
                                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 h-6 px-1.5 text-[10px]"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {/* GENERAL BUTTONS */}
                            <Button
                              size="sm"
                              onClick={() => setViewDetailsId(viewDetailsId === item.id ? null : item.id)}
                              title="View All Details"
                              className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 h-6 px-1.5 text-[10px]"
                            >
                              <Database className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteMutation.isPending}
                              title="Delete"
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 h-6 px-1.5 text-[10px]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredData.length === 0 && (
                  <div className="p-16 text-center text-white/40 text-sm">
                    No data found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Panel */}
          {viewDetailsId && (
            <div className="mt-3 bg-white/5 rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Full Record Details</h3>
                <Button
                  size="sm"
                  onClick={() => setViewDetailsId(null)}
                  className="bg-white/10 hover:bg-white/20 h-6 text-xs"
                >
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(filteredData.find((i: any) => i.id === viewDetailsId) || {}).map(([key, value]) => (
                  <div key={key} className="bg-white/5 rounded p-2">
                    <div className="text-[10px] text-white/40 mb-1">{key}</div>
                    <div className="text-white/80 break-all text-xs">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '-')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
