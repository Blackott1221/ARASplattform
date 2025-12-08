import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Database, Calendar, Phone, MessageSquare, 
  Megaphone, Settings, Bug, Activity, TrendingUp,
  Search, Edit2, Trash2, RefreshCw, Shield, Clock,
  ChevronLeft, ChevronRight, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Database Tables Configuration
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
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [viewDetailsId, setViewDetailsId] = useState<string | number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch table data
  const { data: tableData, isLoading, refetch } = useQuery({
    queryKey: ['admin', selectedTable.id],
    queryFn: async () => {
      const res = await fetch(selectedTable.endpoint);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await fetch(`${selectedTable.endpoint}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      toast({ title: "Deleted successfully!" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const res = await fetch(`${selectedTable.endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      toast({ title: "Updated successfully!" });
      setEditingId(null);
      setEditFormData({});
    }
  });

  const filteredData = tableData?.filter((item: any) =>
    Object.values(item).some(val =>
      String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditFormData({ ...item });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: editFormData });
    }
  };

  const handleDelete = (id: string | number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  const renderFieldValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    if (String(value).length > 50) return String(value).substring(0, 50) + '...';
    return String(value);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      {/* Header */}
      <div className="mb-8">
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
          ARAS ADMIN DASHBOARD
        </h1>
        <p className="text-white/60">Complete Database Management - {DB_TABLES.length} Tables</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-2">
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            {DB_TABLES.map((table) => {
              const Icon = table.icon;
              const isActive = selectedTable.id === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => {
                    setSelectedTable(table);
                    setEditingId(null);
                    setViewDetailsId(null);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                    isActive
                      ? 'bg-[#FE9100] text-black font-bold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: isActive ? '#000' : table.color }} />
                    <span className="truncate">{table.name}</span>
                    {tableData && (
                      <span className={`ml-auto text-xs ${isActive ? 'text-black/60' : 'text-white/40'}`}>
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
          <div className="bg-white/5 rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-10 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <Button
              onClick={() => refetch()}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <div className="text-sm text-white/60">
              {filteredData.length} of {tableData?.length || 0} records
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-20 text-center">
                <RefreshCw className="w-8 h-8 text-[#FE9100] animate-spin mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left p-3 text-white/60 font-semibold">ID</th>
                      {filteredData[0] && Object.keys(filteredData[0])
                        .filter(key => key !== 'id' && key !== 'password')
                        .slice(0, 5)
                        .map(key => (
                          <th key={key} className="text-left p-3 text-white/60 font-semibold">
                            {key}
                          </th>
                        ))
                      }
                      <th className="text-right p-3 text-white/60 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item: any) => (
                      <tr key={item.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-3 text-white/80 font-mono text-xs">{item.id}</td>
                        {Object.keys(item)
                          .filter(key => key !== 'id' && key !== 'password')
                          .slice(0, 5)
                          .map(key => (
                            <td key={key} className="p-3 text-white/60">
                              {editingId === item.id ? (
                                <Input
                                  value={editFormData[key] || ''}
                                  onChange={(e) => setEditFormData({
                                    ...editFormData,
                                    [key]: e.target.value
                                  })}
                                  className="bg-white/10 border-white/20 text-white text-xs p-1 h-8"
                                />
                              ) : (
                                renderFieldValue(item[key])
                              )}
                            </td>
                          ))
                        }
                        <td className="p-3">
                          <div className="flex gap-2 justify-end">
                            {editingId === item.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={handleSave}
                                  disabled={updateMutation.isPending}
                                  className="bg-green-500 hover:bg-green-600 text-white h-8 px-3 text-xs"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditFormData({});
                                  }}
                                  className="bg-gray-500 hover:bg-gray-600 text-white h-8 px-3 text-xs"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setViewDetailsId(viewDetailsId === item.id ? null : item.id)}
                                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 h-8 px-3 text-xs"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleEdit(item)}
                                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 h-8 px-3 text-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={deleteMutation.isPending}
                                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 h-8 px-3 text-xs"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredData.length === 0 && (
                  <div className="p-20 text-center text-white/40">
                    No data found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Panel */}
          {viewDetailsId && (
            <div className="mt-4 bg-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Full Details</h3>
                <Button
                  size="sm"
                  onClick={() => setViewDetailsId(null)}
                  className="bg-white/10 hover:bg-white/20"
                >
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(filteredData.find((i: any) => i.id === viewDetailsId) || {}).map(([key, value]) => (
                  <div key={key} className="bg-white/5 rounded p-3">
                    <div className="text-xs text-white/40 mb-1">{key}</div>
                    <div className="text-white/80 break-all text-sm">
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
