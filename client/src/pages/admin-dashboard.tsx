import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Database, Calendar, Phone, MessageSquare, 
  Megaphone, FileText, Settings, Bug, Activity,
  Search, Plus, Edit2, Trash2, X, Check, AlertCircle,
  Download, Upload, RefreshCw, Filter, ChevronDown,
  Eye, EyeOff, Shield, TrendingUp, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// 🎨 ARAS CI Colors
const ARAS_COLORS = {
  primary: '#FE9100',
  secondary: '#e9d7c4',
  dark: '#0f0f0f',
  gradient: 'linear-gradient(135deg, #e9d7c4, #FE9100, #ffd700)'
};

// 📊 Database Table Configurations
const DB_TABLES = [
  {
    id: 'users',
    name: 'Users',
    icon: Users,
    color: '#4F46E5',
    endpoint: '/api/admin/users',
    fields: ['username', 'email', 'firstName', 'lastName', 'subscriptionPlan', 'subscriptionStatus']
  },
  {
    id: 'leads',
    name: 'Leads',
    icon: TrendingUp,
    color: '#10B981',
    endpoint: '/api/admin/leads',
    fields: ['name', 'email', 'phone', 'company', 'status']
  },
  {
    id: 'calendar_events',
    name: 'Calendar Events',
    icon: Calendar,
    color: '#F59E0B',
    endpoint: '/api/admin/calendar-events',
    fields: ['title', 'date', 'time', 'type', 'status']
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    color: '#8B5CF6',
    endpoint: '/api/admin/contacts',
    fields: ['company', 'firstName', 'lastName', 'phone', 'email']
  },
  {
    id: 'campaigns',
    name: 'Campaigns',
    icon: Megaphone,
    color: '#EC4899',
    endpoint: '/api/admin/campaigns',
    fields: ['name', 'status', 'totalLeads', 'contacted', 'converted']
  },
  {
    id: 'chat_sessions',
    name: 'Chat Sessions',
    icon: MessageSquare,
    color: '#06B6D4',
    endpoint: '/api/admin/chat-sessions',
    fields: ['userId', 'title', 'isActive']
  },
  {
    id: 'chat_messages',
    name: 'Chat Messages',
    icon: MessageSquare,
    color: '#14B8A6',
    endpoint: '/api/admin/chat-messages',
    fields: ['userId', 'message', 'isAi', 'timestamp']
  },
  {
    id: 'voice_agents',
    name: 'Voice Agents',
    icon: Phone,
    color: '#F97316',
    endpoint: '/api/admin/voice-agents',
    fields: ['name', 'voice', 'language', 'isSystemAgent', 'isActive']
  },
  {
    id: 'call_logs',
    name: 'Call Logs',
    icon: Phone,
    color: '#EF4444',
    endpoint: '/api/admin/call-logs',
    fields: ['phoneNumber', 'contactName', 'status', 'duration', 'createdAt']
  },
  {
    id: 'voice_tasks',
    name: 'Voice Tasks',
    icon: Activity,
    color: '#84CC16',
    endpoint: '/api/admin/voice-tasks',
    fields: ['taskName', 'phoneNumber', 'status', 'createdAt']
  },
  {
    id: 'feedback',
    name: 'Feedback & Bugs',
    icon: Bug,
    color: '#F43F5E',
    endpoint: '/api/admin/feedback',
    fields: ['type', 'rating', 'title', 'description', 'status', 'priority']
  },
  {
    id: 'usage_tracking',
    name: 'Usage Tracking',
    icon: Activity,
    color: '#6366F1',
    endpoint: '/api/admin/usage-tracking',
    fields: ['userId', 'type', 'description', 'createdAt']
  },
  {
    id: 'twilio_settings',
    name: 'Twilio Settings',
    icon: Settings,
    color: '#64748B',
    endpoint: '/api/admin/twilio-settings',
    fields: ['userId', 'phoneNumber', 'configured']
  },
  {
    id: 'subscription_plans',
    name: 'Subscription Plans',
    icon: Shield,
    color: '#0EA5E9',
    endpoint: '/api/admin/subscription-plans',
    fields: ['name', 'price', 'aiMessagesLimit', 'voiceCallsLimit', 'isActive']
  },
  {
    id: 'sessions',
    name: 'Active Sessions',
    icon: Clock,
    color: '#78716C',
    endpoint: '/api/admin/sessions',
    fields: ['sid', 'expire']
  }
];

export default function AdminDashboardNew() {
  const [selectedTable, setSelectedTable] = useState(DB_TABLES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data for selected table
  const { data: tableData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', selectedTable.id],
    queryFn: async () => {
      const response = await fetch(selectedTable.endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${selectedTable.name}`);
      }
      return response.json();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string | number) => {
      const response = await fetch(`${selectedTable.endpoint}/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      toast({
        title: "Deleted!",
        description: `${selectedTable.name} item deleted successfully.`,
      });
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const response = await fetch(`${selectedTable.endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Update failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', selectedTable.id] });
      toast({
        title: "Updated!",
        description: `${selectedTable.name} item updated successfully.`,
      });
      setShowEditModal(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    }
  });

  // Filter data based on search
  const filteredData = tableData?.filter((item: any) =>
    selectedTable.fields.some(field =>
      String(item[field] || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Stats calculation
  const stats = {
    total: tableData?.length || 0,
    filtered: filteredData?.length || 0
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f' }}>
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 
                className="text-3xl font-black mb-2"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: ARAS_COLORS.gradient,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                ARAS AI ADMIN DASHBOARD
              </h1>
              <p className="text-white/60">Complete Database Management System</p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => refetch()}
                className="bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                className="bg-[#FE9100] hover:bg-[#ff8c00] text-black font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Table Selection */}
          <div className="col-span-3">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-[#FE9100]" />
                Database Tables ({DB_TABLES.length})
              </h3>
              <div className="space-y-2">
                {DB_TABLES.map((table) => {
                  const Icon = table.icon;
                  const isActive = selectedTable.id === table.id;
                  return (
                    <motion.button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#FE9100] text-black font-bold'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" style={{ color: isActive ? '#000' : table.color }} />
                        <div className="flex-1">
                          <div className="font-semibold">{table.name}</div>
                          <div className={`text-xs ${isActive ? 'text-black/60' : 'text-white/40'}`}>
                            {table.id}
                          </div>
                        </div>
                        {tableData && (
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            isActive ? 'bg-black/20' : 'bg-white/10'
                          }`}>
                            {tableData.length}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Data Table */}
          <div className="col-span-9">
            {/* Table Header */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {selectedTable.name}
                  </h2>
                  <p className="text-white/60 text-sm">
                    {stats.filtered} of {stats.total} records
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 w-64"
                    />
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 text-[#FE9100] animate-spin" />
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-white/60">Failed to load data</p>
                    <Button
                      onClick={() => refetch()}
                      className="mt-4 bg-[#FE9100] hover:bg-[#ff8c00] text-black"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Data Table */}
              {!isLoading && !error && filteredData && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-white/60 text-sm font-semibold">ID</th>
                        {selectedTable.fields.map((field) => (
                          <th key={field} className="text-left py-3 px-4 text-white/60 text-sm font-semibold">
                            {field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                          </th>
                        ))}
                        <th className="text-right py-3 px-4 text-white/60 text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredData.map((item: any, index: number) => (
                          <motion.tr
                            key={item.id || index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.02 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 text-white/80 text-sm font-mono">
                              {item.id}
                            </td>
                            {selectedTable.fields.map((field) => (
                              <td key={field} className="py-3 px-4 text-white/60 text-sm">
                                {typeof item[field] === 'boolean' 
                                  ? (item[field] ? '✓' : '✗')
                                  : typeof item[field] === 'object'
                                  ? JSON.stringify(item[field])
                                  : String(item[field] || '-')
                                }
                              </td>
                            ))}
                            <td className="py-3 px-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowEditModal(true);
                                  }}
                                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setDeletingItem(item);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>

                  {filteredData.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-white/40">No data found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#151515] border border-white/10 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Edit {selectedTable.name}</h3>
                <Button
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="bg-white/5 hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {selectedTable.fields.map((field) => (
                  <div key={field}>
                    <label className="text-white/60 text-sm mb-2 block">
                      {field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <Input
                      value={editingItem[field] || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, [field]: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  onClick={() => updateMutation.mutate({ id: editingItem.id, data: editingItem })}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-[#FE9100] hover:bg-[#ff8c00] text-black font-bold"
                >
                  {updateMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  onClick={() => setShowEditModal(false)}
                  className="bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && deletingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#151515] border border-red-500/30 rounded-2xl p-8 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Confirm Delete</h3>
                <p className="text-white/60">
                  Are you sure you want to delete this {selectedTable.name} record?
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => deleteMutation.mutate(deletingItem.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                >
                  {deleteMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
