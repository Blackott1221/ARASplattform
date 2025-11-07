import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Phone, MessageSquare, Crown, Shield, Activity, ArrowUpCircle, ArrowDownCircle, Loader2, Trash2, Key, Eye, X, AlertTriangle, Plus, Search, Filter, Download, Mail, Building, Calendar, Hash, FileText, Zap, BarChart3 } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  ai_messages_used?: number;
  voice_calls_used?: number;
}

interface ChatMessage {
  id: number;
  message: string;
  is_ai: boolean;
  timestamp: string;
  username: string;
  email: string;
  title: string;
}

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  username: string;
  created_at: string;
}

interface Campaign {
  id: number;
  name: string;
  description: string;
  status: string;
  total_leads: number;
  contacted: number;
  converted: number;
  username: string;
  created_at: string;
}

interface CallLog {
  id: number;
  phone_number: string;
  username: string;
  duration: number;
  transcript: string;
  status: string;
  created_at: string;
  lead_name?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "chats" | "calls" | "leads" | "campaigns">("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null);
  const [showChatModal, setShowChatModal] = useState<ChatMessage | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", subscription_plan: "starter" });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [usersRes, statsRes, chatsRes, callsRes, leadsRes, campaignsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/chats?limit=50"),
        fetch("/api/admin/calls"),
        fetch("/api/admin/leads"),
        fetch("/api/admin/campaigns")
      ]);
      
      const [usersData, statsData, chatsData, callsData, leadsData, campaignsData] = await Promise.all([
        usersRes.json(),
        statsRes.json(),
        chatsRes.json(),
        callsRes.json(),
        leadsRes.json(),
        campaignsRes.json()
      ]);
      
      if (usersData.success) setUsers(usersData.users);
      if (statsData.success) setStats(statsData.stats);
      if (chatsData.success) setChats(chatsData.messages);
      if (callsData.success) setCalls(callsData.calls);
      if (leadsData.success) setLeads(leadsData.leads);
      if (campaignsData.success) setCampaigns(campaignsData.campaigns);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setActionLoading("create");
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateUser(false);
        setNewUser({ username: "", email: "", password: "", subscription_plan: "starter" });
        await fetchAllData();
      }
    } catch (error) {
      console.error("Create user failed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgrade = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/upgrade`, { method: "POST" });
      const data = await res.json();
      if (data.success) await fetchAllData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDowngrade = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/downgrade`, { method: "POST" });
      const data = await res.json();
      if (data.success) await fetchAllData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!showPasswordModal || !newPassword) return;
    setActionLoading(showPasswordModal.id);
    try {
      const res = await fetch(`/api/admin/users/${showPasswordModal.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
      });
      if ((await res.json()).success) {
        setShowPasswordModal(null);
        setNewPassword("");
        await fetchAllData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    setActionLoading(showDeleteModal.id);
    try {
      const res = await fetch(`/api/admin/users/${showDeleteModal.id}`, { method: "DELETE" });
      if ((await res.json()).success) {
        setShowDeleteModal(null);
        await fetchAllData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#fe9100]" />
      </div>
    );
  }

  const totalUsers = parseInt(stats?.total_users || "0");
  const proUsers = parseInt(stats?.pro_users || "0");
  const totalCalls = parseInt(stats?.total_calls || "0");

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChats = chats.filter(c =>
    c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-[2000px] mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fe9100] to-[#ff6b00] flex items-center justify-center shadow-lg shadow-[#fe9100]/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-[#fe9100] to-[#ff6b00] bg-clip-text text-transparent">
                  Admin Command Center
                </h1>
                <p className="text-gray-500 flex items-center gap-2 mt-1">
                  <Zap className="w-4 h-4 text-[#fe9100]" />
                  Volle Kontrolle über die Plattform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="text"
                  placeholder="Suche..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#fe9100] transition-colors w-64"
                />
              </div>
              <button onClick={() => setShowCreateUser(true)} className="bg-gradient-to-r from-[#fe9100] to-[#ff6b00] hover:from-[#ff6b00] hover:to-[#fe9100] text-white rounded-xl px-6 py-2.5 font-medium transition-all flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Neuer User
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Total Users", value: totalUsers, color: "blue" },
            { icon: Crown, label: "PRO Users", value: proUsers, color: "[#fe9100]" },
            { icon: Phone, label: "Total Calls", value: totalCalls, color: "green" },
            { icon: MessageSquare, label: "Messages", value: chats.length, color: "purple" }
          ].map((kpi, idx) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 hover:border-[#fe9100]/30 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <kpi.icon className="w-8 h-8 text-[#fe9100] group-hover:scale-110 transition-transform" />
                <span className="text-3xl font-bold text-white">{kpi.value}</span>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">{kpi.label}</h3>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "users", label: "Users", icon: Users },
            { id: "chats", label: "Chats", icon: MessageSquare },
            { id: "calls", label: "Calls", icon: Phone },
            { id: "leads", label: "Leads", icon: Building },
            { id: "campaigns", label: "Campaigns", icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id ? "bg-gradient-to-r from-[#fe9100] to-[#ff6b00] text-white" : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6">
          <p className="text-gray-400 text-center">Content for {activeTab} tab - Implementation continues in next part</p>
        </div>
      </div>
    </div>
  );
}