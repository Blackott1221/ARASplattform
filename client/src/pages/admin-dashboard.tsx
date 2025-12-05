import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, TrendingUp, Phone, MessageSquare, Crown, Shield, Activity, 
  ArrowUpCircle, ArrowDownCircle, Loader2, Trash2, Key, Eye, X, 
  AlertTriangle, Plus, Search, Mail, Building, Zap, BarChart3, FileText,
  DollarSign, Database, Server, Brain, Sparkles, Bug, Star, Clock,
  CheckCircle, XCircle, AlertCircle, Target, Rocket, Globe, Settings,
  ChevronUp, ChevronDown, RefreshCw, Download, Upload, Filter,
  Calendar, TrendingDown, Award, Cpu, HardDrive, Wifi, PieChart,
  LineChart, BarChart2, UserCheck, UserX, CreditCard, Package,
  GitBranch, Code, Terminal, Layers, Grid, Send, MessageCircle,
  BellRing, Lock, Unlock, ShieldCheck, AlertOctagon, Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 🔥 ARAS CI Colors
const CI = {
  orange: "#FE9100",
  goldLight: "#E9D7C4",
  goldDark: "#A34E00",
  black: "#000000",
  gray: "#1A1A1A",
  green: "#10B981",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  yellow: "#F59E0B"
};

// 🎯 Enhanced Interfaces
interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  website?: string;
  industry?: string;
  role?: string;
  phone?: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  ai_messages_used?: number;
  voice_calls_used?: number;
  voice_calls_limit?: number;
  ai_messages_limit?: number;
  last_login?: string;
  total_spent?: number;
  stripe_customer_id?: string;
  aiProfile?: any;
  profileImageUrl?: string;
  language?: string;
  primaryGoal?: string;
  monthlyResetDate?: string;
  hasPaymentMethod?: boolean;
}

interface ChatMessage {
  id: number;
  message: string;
  is_ai: boolean;
  timestamp: string;
  username: string;
  email: string;
  title: string;
  sessionId?: number;
  sentiment?: string;
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
  score?: number;
  lastContact?: string;
  notes?: string;
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
  budget?: number;
  roi?: number;
  endDate?: string;
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
  sentiment?: string;
  cost?: number;
}

interface Feedback {
  id: number;
  userId: string;
  type: 'feedback' | 'bug';
  rating?: number;
  description: string;
  screenshot?: string;
  pageUrl?: string;
  userAgent?: string;
  browserInfo?: any;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  username?: string;
  email?: string;
}

interface SystemStats {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  apiLatency: number;
  dbConnections: number;
  errorRate: number;
  requestsPerMinute: number;
}

interface Analytics {
  dailyRevenue: number[];
  userGrowth: number[];
  churnRate: number;
  ltv: number;
  cac: number;
  mrr: number;
  arr: number;
  conversionRate: number;
  avgSessionDuration: number;
  topFeatures: { name: string; usage: number }[];
}

// 🔥 ULTRA HIGH-END ADMIN DASHBOARD v3.0
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [aiPredictions, setAiPredictions] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [churnAnalysis, setChurnAnalysis] = useState<any>(null);
  const [apiMetrics, setApiMetrics] = useState<any>(null);
  const [liveMode, setLiveMode] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState<User | null>(null);
  const [showChatModal, setShowChatModal] = useState<ChatMessage | null>(null);
  const [showCallModal, setShowCallModal] = useState<CallLog | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", subscription_plan: "free" });
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() });
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'users' | 'activity'>('revenue');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [usersRes, statsRes, chatsRes, callsRes, leadsRes, campaignsRes, feedbackRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/chats?limit=100"),
        fetch("/api/admin/calls"),
        fetch("/api/admin/leads"),
        fetch("/api/admin/campaigns"),
        fetch("/api/admin/feedback").catch(() => ({ ok: false }))
      ]);
      
      const [usersData, statsData, chatsData, callsData, leadsData, campaignsData] = await Promise.all([
        usersRes.json(),
        statsRes.json(),
        chatsRes.json(),
        callsRes.json(),
        leadsRes.json(),
        campaignsRes.json()
      ]);
      
      // Feedback data
      if (feedbackRes && 'ok' in feedbackRes && feedbackRes.ok && 'json' in feedbackRes) {
        const feedbackData = await feedbackRes.json();
        setFeedback(feedbackData.feedback || []);
      }
      
      let enhancedUsers: User[] = [];
      if (usersData.success) {
        // Enhance user data with additional calculations
        enhancedUsers = usersData.users.map((user: User) => ({
          ...user,
          usage_percentage: user.voice_calls_limit ? 
            Math.round((user.voice_calls_used || 0) / user.voice_calls_limit * 100) : 0
        }));
        setUsers(enhancedUsers);
      }
      if (statsData.success) setStats(statsData.stats);
      if (chatsData.success) setChats(chatsData.messages);
      if (callsData.success) setCalls(callsData.calls);
      if (leadsData.success) setLeads(leadsData.leads);
      if (campaignsData.success) setCampaigns(campaignsData.campaigns);
      
      // Generate mock data for new features
      generateSystemMetrics();
      generateAnalytics(enhancedUsers);
      generateAIPredictions(enhancedUsers);
      generateHeatmapData(enhancedUsers);
      generateChurnAnalysis(enhancedUsers);
      generateAPIMetrics();
      generateAuditLogs();
      generateTeamMembers();
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // 🤖 AI PREDICTIONS GENERATOR
  const generateAIPredictions = (users: User[]) => {
    const predictions = {
      nextMonthRevenue: users.length * 89 * 1.15,
      nextQuarterRevenue: users.length * 89 * 3 * 1.25,
      userGrowth: Math.floor(users.length * 1.12),
      churnProbability: 0.032,
      upsellOpportunities: users.filter(u => u.subscription_plan === 'starter').length * 0.15,
      revenueBySegment: [
        { segment: 'Enterprise', current: users.length * 299 * 0.1, predicted: users.length * 299 * 0.12 },
        { segment: 'Professional', current: users.length * 99 * 0.3, predicted: users.length * 99 * 0.35 },
        { segment: 'Starter', current: users.length * 29 * 0.6, predicted: users.length * 29 * 0.65 }
      ],
      bestPerformingFeatures: ['AI Assistant', 'Voice Calls', 'Lead Management'],
      riskFactors: ['Payment failures', 'Low engagement', 'Support tickets']
    };
    setAiPredictions(predictions);
  };
  
  // 🌍 HEATMAP DATA GENERATOR
  const generateHeatmapData = (users: User[]) => {
    const countries = [
      { code: 'DE', name: 'Deutschland', users: Math.floor(users.length * 0.4), revenue: users.length * 89 * 0.4 },
      { code: 'AT', name: 'Österreich', users: Math.floor(users.length * 0.2), revenue: users.length * 89 * 0.2 },
      { code: 'CH', name: 'Schweiz', users: Math.floor(users.length * 0.15), revenue: users.length * 89 * 0.15 },
      { code: 'US', name: 'USA', users: Math.floor(users.length * 0.15), revenue: users.length * 89 * 0.15 },
      { code: 'UK', name: 'UK', users: Math.floor(users.length * 0.05), revenue: users.length * 89 * 0.05 },
      { code: 'FR', name: 'France', users: Math.floor(users.length * 0.05), revenue: users.length * 89 * 0.05 }
    ];
    setHeatmapData(countries);
  };
  
  // 📉 CHURN ANALYSIS
  const generateChurnAnalysis = (users: User[]) => {
    const analysis = {
      currentChurnRate: 3.2,
      predictedChurnRate: 2.8,
      atRiskUsers: users.filter(u => Math.random() > 0.8).slice(0, 10),
      churnReasons: [
        { reason: 'Price sensitivity', percentage: 35 },
        { reason: 'Feature gaps', percentage: 25 },
        { reason: 'Poor onboarding', percentage: 20 },
        { reason: 'Competition', percentage: 15 },
        { reason: 'Other', percentage: 5 }
      ],
      retentionStrategies: [
        { strategy: 'Personalized onboarding', impact: 'High', implementation: 'In Progress' },
        { strategy: 'Usage-based discounts', impact: 'Medium', implementation: 'Planned' },
        { strategy: 'Feature education', impact: 'High', implementation: 'Active' }
      ]
    };
    setChurnAnalysis(analysis);
  };
  
  // 📡 SYSTEM METRICS GENERATOR
  const generateSystemMetrics = () => {
    const metrics: SystemStats = {
      cpu: Math.random() * 40 + 30,
      memory: Math.random() * 30 + 50,
      disk: Math.random() * 20 + 60,
      uptime: 99.99,
      apiLatency: Math.random() * 50 + 20,
      dbConnections: Math.floor(Math.random() * 50 + 100),
      errorRate: Math.random() * 0.5,
      requestsPerMinute: Math.floor(Math.random() * 1000 + 2000)
    };
    setSystemMetrics(metrics);
  };
  
  // 📊 ANALYTICS GENERATOR
  const generateAnalytics = (users: User[]) => {
    const analytics: Analytics = {
      dailyRevenue: Array.from({ length: 30 }, (_, i) => Math.random() * 10000 + 5000),
      userGrowth: Array.from({ length: 30 }, (_, i) => Math.floor(Math.random() * 50 + 100)),
      churnRate: 3.2,
      ltv: 2500,
      cac: 150,
      mrr: users.length * 89,
      arr: users.length * 89 * 12,
      conversionRate: 12.5,
      avgSessionDuration: 720,
      topFeatures: [
        { name: 'AI Assistant', usage: 89 },
        { name: 'Voice Calls', usage: 67 },
        { name: 'Lead Management', usage: 54 }
      ]
    };
    setAnalytics(analytics);
  };
  
  // 🔄 API METRICS
  const generateAPIMetrics = () => {
    const metrics = {
      totalRequests: Math.floor(Math.random() * 1000000 + 5000000),
      avgResponseTime: Math.random() * 100 + 50,
      errorRate: Math.random() * 0.5,
      endpoints: [
        { name: '/api/chat', calls: Math.floor(Math.random() * 100000 + 200000), avgTime: Math.random() * 50 + 30 },
        { name: '/api/voice', calls: Math.floor(Math.random() * 50000 + 100000), avgTime: Math.random() * 100 + 80 },
        { name: '/api/leads', calls: Math.floor(Math.random() * 30000 + 50000), avgTime: Math.random() * 40 + 20 },
        { name: '/api/users', calls: Math.floor(Math.random() * 20000 + 40000), avgTime: Math.random() * 30 + 15 }
      ],
      statusCodes: [
        { code: 200, count: Math.floor(Math.random() * 900000 + 4000000), percentage: 95 },
        { code: 400, count: Math.floor(Math.random() * 10000 + 50000), percentage: 2 },
        { code: 401, count: Math.floor(Math.random() * 5000 + 20000), percentage: 1 },
        { code: 500, count: Math.floor(Math.random() * 2000 + 10000), percentage: 0.5 },
        { code: 503, count: Math.floor(Math.random() * 1000 + 5000), percentage: 0.3 }
      ]
    };
    setApiMetrics(metrics);
  };
  
  // 📋 AUDIT LOGS
  const generateAuditLogs = () => {
    const logs = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: ['admin@aras.ai', 'support@aras.ai', 'system'][Math.floor(Math.random() * 3)],
      action: ['User Created', 'Plan Upgraded', 'Password Reset', 'Data Export', 'Settings Changed'][Math.floor(Math.random() * 5)],
      target: `user_${Math.floor(Math.random() * 1000)}`,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      status: Math.random() > 0.1 ? 'success' : 'failed',
      details: 'Action completed successfully'
    }));
    setAuditLogs(logs);
  };
  
  // 👥 TEAM MEMBERS
  const generateTeamMembers = () => {
    const members = [
      { id: 1, name: 'Justin Admin', role: 'Super Admin', email: 'justin@aras.ai', lastActive: new Date().toISOString(), permissions: ['all'] },
      { id: 2, name: 'Sarah Support', role: 'Support Manager', email: 'sarah@aras.ai', lastActive: new Date(Date.now() - 3600000).toISOString(), permissions: ['users', 'support'] },
      { id: 3, name: 'Mike Developer', role: 'Tech Lead', email: 'mike@aras.ai', lastActive: new Date(Date.now() - 7200000).toISOString(), permissions: ['system', 'api'] },
      { id: 4, name: 'Lisa Marketing', role: 'Marketing Manager', email: 'lisa@aras.ai', lastActive: new Date(Date.now() - 10800000).toISOString(), permissions: ['analytics', 'campaigns'] }
    ];
    setTeamMembers(members);
  };
  
  // ⏰ REAL-TIME UPDATES
  useEffect(() => {
    if (liveMode && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchAllData();
        console.log('🔄 Live data refreshed at', new Date().toLocaleTimeString());
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [liveMode, refreshInterval]); 

  const fetchUserDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/details`);
      const data = await res.json();
      if (data.success) {
        setUserDetails(data);
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
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

  const handleUpgrade = async (userId: string, plan: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/upgrade`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        setShowUpgradeModal(null);
        await fetchAllData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDowngrade = async (userId: string) => {
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users/${userId}/downgrade`, { method: "POST" });
      await fetchAllData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetUsage = async (userId: string) => {
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users/${userId}/reset-usage`, { method: "POST" });
      await fetchAllData();
    } finally {
      setActionLoading(null);
    }
  };

  // 💾 EXPORT/IMPORT FUNCTIONS
  const exportData = (type: string) => {
    let data: any[] = [];
    let filename = '';
    
    switch(type) {
      case 'users':
        data = users;
        filename = exportFormat === 'csv' ? 'aras-users-export.csv' : 'aras-users-export.json';
        break;
      case 'calls':
        data = calls;
        filename = exportFormat === 'csv' ? 'aras-calls-export.csv' : 'aras-calls-export.json';
        break;
      case 'chats':
        data = chats;
        filename = exportFormat === 'csv' ? 'aras-chats-export.csv' : 'aras-chats-export.json';
        break;
      case 'feedback':
        data = feedback;
        filename = exportFormat === 'csv' ? 'aras-feedback-export.csv' : 'aras-feedback-export.json';
        break;
      case 'audit':
        data = auditLogs;
        filename = exportFormat === 'csv' ? 'aras-audit-export.csv' : 'aras-audit-export.json';
        break;
      case 'all':
        data = { users, calls, chats, feedback, campaigns, leads } as any;
        filename = `aras-complete-export-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }
    
    let content: string;
    let mimeType: string;
    
    if (exportFormat === 'csv' && type !== 'all') {
      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(item => Object.values(item).join(','));
      content = [headers, ...rows].join('\n');
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const importData = async () => {
    if (!importFile) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        console.log('📥 Imported data:', data);
        // Process imported data based on structure
        if (data.users) setUsers(data.users);
        if (data.calls) setCalls(data.calls);
        if (data.chats) setChats(data.chats);
        alert('✅ Data imported successfully!');
      } catch (error) {
        console.error('Import failed:', error);
        alert('❌ Import failed. Please check the file format.');
      }
    };
    reader.readAsText(importFile);
  };

  const handleResetPassword = async () => {
    if (!showPasswordModal || !newPassword) return;
    setActionLoading(showPasswordModal.id);
    try {
      await fetch(`/api/admin/users/${showPasswordModal.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
      });
      setShowPasswordModal(null);
      setNewPassword("");
      await fetchAllData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    setActionLoading(showDeleteModal.id);
    try {
      await fetch(`/api/admin/users/${showDeleteModal.id}`, { method: "DELETE" });
      setShowDeleteModal(null);
      await fetchAllData();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen text-white p-4 md:p-8">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Total Users", value: totalUsers },
            { icon: Crown, label: "PRO Users", value: proUsers },
            { icon: Phone, label: "Total Calls", value: totalCalls },
            { icon: MessageSquare, label: "Messages", value: chats.length }
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

        {/* 🔥 ENHANCED TABS */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview", icon: BarChart3, badge: null },
            { id: "users", label: "Users", icon: Users, badge: users.length },
            { id: "revenue", label: "Revenue & AI", icon: DollarSign, badge: 'AI' },
            { id: "feedback", label: "Feedback", icon: Bug, badge: feedback.filter(f => f.status === 'new').length || null },
            { id: "heatmap", label: "Geo Heatmap", icon: Globe, badge: null },
            { id: "churn", label: "Churn Analysis", icon: TrendingDown, badge: null },
            { id: "api", label: "API Monitor", icon: Server, badge: null },
            { id: "team", label: "Team", icon: Shield, badge: teamMembers.length },
            { id: "audit", label: "Audit Logs", icon: FileText, badge: null },
            { id: "system", label: "System", icon: Cpu, badge: null }
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
              {tab.badge !== null && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 
                  tab.badge === 'AI' ? 'bg-purple-500/20 text-purple-400' : 
                  'bg-[#fe9100]/20 text-[#fe9100]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#fe9100]" />
                  Neueste User
                </h3>
                <div className="space-y-3">
                  {users.slice(0, 8).map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fe9100] to-[#ff6b00] flex items-center justify-center text-white font-bold text-sm">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{user.username}</p>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${user.subscription_plan === "pro" ? "bg-[#fe9100]/20 text-[#fe9100]" : "bg-gray-500/20 text-gray-400"}`}>
                        {user.subscription_plan}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#fe9100]" />
                  Letzte Calls
                </h3>
                <div className="space-y-3">
                  {calls.slice(0, 8).map((call) => (
                    <div key={call.id} className="p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-medium">{call.username}</p>
                        <span className="text-gray-500 text-xs">{call.duration}s</span>
                      </div>
                      <p className="text-gray-400 text-sm">{call.phone_number}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">User</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Email</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Plan</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Messages</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Calls</th>
                      <th className="text-center py-4 px-4 text-gray-500 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fe9100] to-[#ff6b00] flex items-center justify-center text-white font-bold text-sm">
                              {user.username[0].toUpperCase()}
                            </div>
                            <span className="text-white font-medium">{user.username}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-400 text-sm">{user.email}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.subscription_plan === "pro" ? "bg-[#fe9100]/20 text-[#fe9100] border border-[#fe9100]/30" : "bg-gray-500/20 text-gray-400 border border-gray-500/30"}`}>
                            {user.subscription_plan.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.subscription_status === "active" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                            {user.subscription_status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-300 text-sm">{user.ai_messages_used || 0}</td>
                        <td className="py-4 px-4 text-gray-300 text-sm">{user.voice_calls_used || 0}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setShowUpgradeModal(user)} 
                              disabled={actionLoading === user.id} 
                              className="p-2 bg-[#fe9100]/20 hover:bg-[#fe9100]/30 border border-[#fe9100]/30 rounded-lg transition-all group"
                              title="Plan ändern"
                            >
                              <ArrowUpCircle className="w-4 h-4 text-[#fe9100] group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                              onClick={() => handleResetUsage(user.id)} 
                              disabled={actionLoading === user.id}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all group"
                              title="Usage zurücksetzen"
                            >
                              <Activity className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                              onClick={() => setShowPasswordModal(user)} 
                              className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg transition-all group"
                              title="Passwort ändern"
                            >
                              <Key className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                              onClick={() => setShowDeleteModal(user)} 
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all group"
                              title="User löschen"
                            >
                              <Trash2 className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "chats" && (
            <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#fe9100]" />
                Live Chat Monitor ({filteredChats.length})
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredChats.map((chat) => (
                  <div key={chat.id} onClick={() => setShowChatModal(chat)} className="p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${chat.is_ai ? "bg-[#fe9100]/20" : "bg-blue-500/20"}`}>
                          {chat.is_ai ? "🤖" : chat.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{chat.is_ai ? "ARAS AI" : chat.username}</p>
                          <p className="text-gray-500 text-xs">{chat.email}</p>
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs">{new Date(chat.timestamp).toLocaleString("de-DE")}</span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2 group-hover:text-gray-300 transition-colors">{chat.message}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "calls" && (
            <motion.div key="calls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#fe9100]" />
                Call Logs ({calls.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">User</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Phone</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Lead</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Duration</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-4 text-gray-500 font-medium text-sm">Date</th>
                      <th className="text-center py-4 px-4 text-gray-500 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <tr key={call.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-4 text-white">{call.username}</td>
                        <td className="py-4 px-4 text-gray-400">{call.phone_number}</td>
                        <td className="py-4 px-4 text-gray-400">{call.lead_name || "-"}</td>
                        <td className="py-4 px-4 text-gray-400">{call.duration ? `${call.duration}s` : "-"}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${call.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400 text-sm">{new Date(call.created_at).toLocaleDateString("de-DE")}</td>
                        <td className="py-4 px-4">
                          <button onClick={() => setShowCallModal(call)} className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all mx-auto block">
                            <FileText className="w-4 h-4 text-blue-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "leads" && (
            <motion.div key="leads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-[#fe9100]" />
                Leads Manager ({leads.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-5 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-all border border-gray-700/50 hover:border-[#fe9100]/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-bold">{lead.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${lead.status === "hot" ? "bg-red-500/20 text-red-400" : lead.status === "warm" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {lead.email && (
                        <p className="text-gray-400 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {lead.email}
                        </p>
                      )}
                      {lead.phone && (
                        <p className="text-gray-400 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </p>
                      )}
                      {lead.company && (
                        <p className="text-gray-400 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          {lead.company}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-3">Owner: {lead.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "campaigns" && (
            <motion.div key="campaigns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#fe9100]" />
                Campaigns Overview ({campaigns.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/50 hover:border-[#fe9100]/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-bold text-white">{campaign.name}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${campaign.status === "active" ? "bg-green-500/20 text-green-400" : campaign.status === "paused" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {campaign.status}
                      </span>
                    </div>
                    {campaign.description && <p className="text-gray-400 text-sm mb-4">{campaign.description}</p>}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{campaign.total_leads}</p>
                        <p className="text-gray-500 text-xs">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-400">{campaign.contacted}</p>
                        <p className="text-gray-500 text-xs">Contacted</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">{campaign.converted}</p>
                        <p className="text-gray-500 text-xs">Converted</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <p className="text-gray-500 text-xs">Owner: {campaign.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* 🤖 AI PREDICTIONS & REVENUE TAB */}
          {activeTab === "revenue" && (
            <motion.div key="revenue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-[#8B5CF6]" />
                    AI Revenue Predictions
                  </h3>
                  {aiPredictions && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-800/30 rounded-xl">
                          <p className="text-gray-500 text-sm mb-1">Next Month Revenue</p>
                          <p className="text-2xl font-bold text-white">€{Math.round(aiPredictions.nextMonthRevenue).toLocaleString()}</p>
                          <p className="text-green-400 text-sm mt-1">↑ +15%</p>
                        </div>
                        <div className="p-4 bg-gray-800/30 rounded-xl">
                          <p className="text-gray-500 text-sm mb-1">Next Quarter</p>
                          <p className="text-2xl font-bold text-white">€{Math.round(aiPredictions.nextQuarterRevenue).toLocaleString()}</p>
                          <p className="text-green-400 text-sm mt-1">↑ +25%</p>
                        </div>
                      </div>
                      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                        <p className="text-purple-400 font-medium mb-2">🎯 Best Performing Features</p>
                        <div className="flex gap-2 flex-wrap">
                          {aiPredictions.bestPerformingFeatures?.map((feature: string) => (
                            <span key={feature} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">{feature}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                    AI Insights
                  </h3>
                  <button 
                    onClick={() => generateAIPredictions(users)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white rounded-lg hover:scale-105 transition-all"
                  >
                    Generate New Insights
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* 🌍 GEO HEATMAP TAB */}
          {activeTab === "heatmap" && (
            <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#14B8A6]" />
                  Geographic User Distribution
                </h3>
                {heatmapData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {heatmapData.map((country: any) => (
                      <div key={country.code} className="p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">{country.code === 'DE' ? '🇩🇪' : country.code === 'AT' ? '🇦🇹' : country.code === 'CH' ? '🇨🇭' : country.code === 'US' ? '🇺🇸' : country.code === 'UK' ? '🇬🇧' : '🇫🇷'}</span>
                          <span className="px-2 py-1 bg-[#14B8A6]/20 text-[#14B8A6] rounded-full text-xs font-bold">
                            {Math.round((country.users / users.length) * 100)}%
                          </span>
                        </div>
                        <h4 className="text-white font-bold mb-1">{country.name}</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-400">Users: <span className="text-white font-medium">{country.users}</span></p>
                          <p className="text-gray-400">Revenue: <span className="text-green-400 font-medium">€{Math.round(country.revenue).toLocaleString()}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* 📉 CHURN ANALYSIS TAB */}
          {activeTab === "churn" && (
            <motion.div key="churn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {churnAnalysis && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-[#EF4444]" />
                        Churn Metrics
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-gray-500 text-sm">Current Rate</p>
                          <p className="text-3xl font-bold text-red-400">{churnAnalysis.currentChurnRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Predicted Rate</p>
                          <p className="text-3xl font-bold text-orange-400">{churnAnalysis.predictedChurnRate}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4">Churn Reasons</h3>
                      <div className="space-y-2">
                        {churnAnalysis.churnReasons?.slice(0, 3).map((reason: any) => (
                          <div key={reason.reason} className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{reason.reason}</span>
                            <span className="text-white font-bold">{reason.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                      <h3 className="text-xl font-bold mb-4">At Risk Users</h3>
                      <p className="text-4xl font-bold text-orange-400">{churnAnalysis.atRiskUsers?.length || 0}</p>
                      <p className="text-gray-500 text-sm mt-2">Require immediate attention</p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
          
          {/* 🔄 API MONITOR TAB */}
          {activeTab === "api" && (
            <motion.div key="api" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {apiMetrics && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Server className="w-5 h-5 text-[#10B981]" />
                        <span className="text-green-400 text-xs">HEALTHY</span>
                      </div>
                      <p className="text-gray-500 text-sm">Total Requests</p>
                      <p className="text-2xl font-bold text-white">{(apiMetrics.totalRequests / 1000000).toFixed(1)}M</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                      <p className="text-gray-500 text-sm mb-1">Avg Response</p>
                      <p className="text-2xl font-bold text-white">{Math.round(apiMetrics.avgResponseTime)}ms</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                      <p className="text-gray-500 text-sm mb-1">Error Rate</p>
                      <p className="text-2xl font-bold text-red-400">{apiMetrics.errorRate.toFixed(2)}%</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                      <p className="text-gray-500 text-sm mb-1">Uptime</p>
                      <p className="text-2xl font-bold text-green-400">99.99%</p>
                    </div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Endpoint Performance</h3>
                    <div className="space-y-3">
                      {apiMetrics.endpoints?.map((endpoint: any) => (
                        <div key={endpoint.name} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                          <span className="text-white font-mono">{endpoint.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-400">{(endpoint.calls / 1000).toFixed(0)}k calls</span>
                            <span className="text-green-400">{endpoint.avgTime.toFixed(0)}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
          
          {/* 👥 TEAM MANAGEMENT TAB */}
          {activeTab === "team" && (
            <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#fe9100]" />
                    Team Members
                  </h3>
                  <button className="px-4 py-2 bg-gradient-to-r from-[#fe9100] to-[#ff6b00] text-white rounded-lg hover:scale-105 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Member
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map((member: any) => (
                    <div key={member.id} className="p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fe9100] to-[#ff6b00] flex items-center justify-center text-white font-bold">
                          {member.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="text-white font-bold">{member.name}</h4>
                          <p className="text-gray-500 text-sm">{member.role}</p>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{member.email}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">Last active: {new Date(member.lastActive).toLocaleTimeString()}</span>
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* 📋 AUDIT LOGS TAB */}
          {activeTab === "audit" && (
            <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#fe9100]" />
                    Audit Logs
                  </h3>
                  <button 
                    onClick={() => exportData('audit')}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-500 text-sm">Time</th>
                        <th className="text-left py-3 px-4 text-gray-500 text-sm">User</th>
                        <th className="text-left py-3 px-4 text-gray-500 text-sm">Action</th>
                        <th className="text-left py-3 px-4 text-gray-500 text-sm">Target</th>
                        <th className="text-left py-3 px-4 text-gray-500 text-sm">IP</th>
                        <th className="text-left py-3 px-4 text-gray-500 text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.slice(0, 10).map((log: any) => (
                        <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 text-gray-400 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-3 px-4 text-white text-sm">{log.user}</td>
                          <td className="py-3 px-4 text-gray-300 text-sm">{log.action}</td>
                          <td className="py-3 px-4 text-gray-400 text-sm font-mono">{log.target}</td>
                          <td className="py-3 px-4 text-gray-500 text-sm font-mono">{log.ipAddress}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* 💎 FEEDBACK & BUGS TAB */}
          {activeTab === "feedback" && (
            <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Bug className="w-5 h-5 text-[#fe9100]" />
                  Feedback & Bug Reports ({feedback.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {feedback.map((item) => (
                    <div key={item.id} className="p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {item.type === 'bug' ? (
                            <Bug className="w-5 h-5 text-red-400" />
                          ) : (
                            <Star className="w-5 h-5 text-yellow-400" />
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                            item.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.priority || 'normal'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                            item.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                            item.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        {item.rating && (
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < (item.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-white mb-2">{item.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{item.username || 'Anonymous'}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
          {/* SYSTEM TAB - Keep existing */}
          {activeTab === "system" && systemMetrics && (
            <motion.div key="system" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#fe9100]" />
                  System Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-800/30 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">CPU Usage</p>
                    <p className="text-2xl font-bold text-white">{systemMetrics.cpu.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-gray-800/30 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">Memory</p>
                    <p className="text-2xl font-bold text-white">{systemMetrics.memory.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-gray-800/30 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">Disk</p>
                    <p className="text-2xl font-bold text-white">{systemMetrics.disk.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-gray-800/30 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">Uptime</p>
                    <p className="text-2xl font-bold text-green-400">{systemMetrics.uptime}%</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals - Create User */}
      <AnimatePresence>
        {showCreateUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateUser(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-white mb-6">Neuen User erstellen</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#fe9100]" />
                <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#fe9100]" />
                <input type="password" placeholder="Password (min. 8 Zeichen)" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#fe9100]" />
                <select value={newUser.subscription_plan} onChange={(e) => setNewUser({...newUser, subscription_plan: e.target.value})} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#fe9100]">
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreateUser(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 font-medium transition-colors">Abbrechen</button>
                <button onClick={handleCreateUser} disabled={!newUser.username || !newUser.email || !newUser.password || newUser.password.length < 8 || !!actionLoading} className="flex-1 bg-gradient-to-r from-[#fe9100] to-[#ff6b00] text-white rounded-xl px-6 py-3 font-medium transition-all disabled:opacity-50">
                  {actionLoading === "create" ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Erstellen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgradeModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Crown className="w-6 h-6 text-[#fe9100]" />
                Plan ändern
              </h2>
              <p className="text-gray-400 mb-6">User: <span className="text-white font-medium">{showUpgradeModal.username}</span></p>
              <p className="text-gray-500 text-sm mb-4">Aktueller Plan: <span className="text-[#fe9100] font-medium">{showUpgradeModal.subscription_plan.toUpperCase()}</span></p>
              
              <div className="space-y-3 mb-6">
                {['free', 'pro', 'ultra', 'ultimate'].map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === plan
                        ? 'border-[#fe9100] bg-[#fe9100]/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-lg">{plan.toUpperCase()}</p>
                        <p className="text-gray-400 text-sm">
                          {plan === 'free' && '50 Nachrichten, 10 Anrufe'}
                          {plan === 'pro' && '500 Nachrichten, 100 Anrufe'}
                          {plan === 'ultra' && '2000 Nachrichten, 500 Anrufe'}
                          {plan === 'ultimate' && 'Unbegrenzt'}
                        </p>
                      </div>
                      {selectedPlan === plan && (
                        <div className="w-6 h-6 rounded-full bg-[#fe9100] flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setShowUpgradeModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 font-medium transition-colors">Abbrechen</button>
                <button 
                  onClick={() => handleUpgrade(showUpgradeModal.id, selectedPlan)} 
                  disabled={!!actionLoading}
                  className="flex-1 bg-gradient-to-r from-[#fe9100] to-[#ff6b00] text-white rounded-xl px-6 py-3 font-medium transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Plan ändern'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Key className="w-6 h-6 text-[#fe9100]" />
                Passwort zurücksetzen
              </h2>
              <p className="text-gray-400 mb-4">Neues Passwort für: <span className="text-white font-medium">{showPasswordModal.username}</span></p>
              <input type="text" placeholder="Neues Passwort (min. 8 Zeichen)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#fe9100] mb-6" />
              <div className="flex gap-3">
                <button onClick={() => setShowPasswordModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 font-medium transition-colors">Abbrechen</button>
                <button onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 8 || !!actionLoading} className="flex-1 bg-gradient-to-r from-[#fe9100] to-[#ff6b00] text-white rounded-xl px-6 py-3 font-medium transition-all disabled:opacity-50">
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Zurücksetzen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">User löschen</h2>
              </div>
              <p className="text-gray-400 mb-2">Wirklich löschen:</p>
              <p className="text-white font-bold text-lg mb-4">{showDeleteModal.username}</p>
              <p className="text-red-400 text-sm mb-6">⚠️ Alle Daten werden permanent gelöscht!</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 font-medium transition-colors">Abbrechen</button>
                <button onClick={handleDeleteUser} disabled={!!actionLoading} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-3 font-medium transition-all disabled:opacity-50">
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Löschen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowChatModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${showChatModal.is_ai ? "bg-[#fe9100]/20" : "bg-blue-500/20"}`}>
                    {showChatModal.is_ai ? "🤖" : showChatModal.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{showChatModal.is_ai ? "ARAS AI" : showChatModal.username}</h3>
                    <p className="text-gray-500 text-sm">{showChatModal.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowChatModal(null)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-6">
                <p className="text-white leading-relaxed whitespace-pre-wrap">{showChatModal.message}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Session: {showChatModal.title}</span>
                <span>{new Date(showChatModal.timestamp).toLocaleString("de-DE")}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Modal */}
      <AnimatePresence>
        {showCallModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowCallModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Phone className="w-6 h-6 text-[#fe9100]" />
                  Call Details
                </h3>
                <button onClick={() => setShowCallModal(null)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">User</p>
                  <p className="text-white font-medium">{showCallModal.username}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Phone</p>
                  <p className="text-white font-medium">{showCallModal.phone_number}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Duration</p>
                  <p className="text-white font-medium">{showCallModal.duration}s</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <p className="text-white font-medium">{showCallModal.status}</p>
                </div>
              </div>
              {showCallModal.transcript && (
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h4 className="text-white font-bold mb-3">Transcript</h4>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{showCallModal.transcript}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
