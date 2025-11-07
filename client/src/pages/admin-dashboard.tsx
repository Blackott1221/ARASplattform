import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Phone, MessageSquare, Crown, Shield, Activity, ArrowUpCircle, ArrowDownCircle, Loader2, CheckCircle2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
}

interface Stats {
  total_users: string;
  free_users: string;
  pro_users: string;
  enterprise_users: string;
  total_calls: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats')
      ]);
      
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      
      if (usersData.success) setUsers(usersData.users);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/upgrade`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDowngrade = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/downgrade`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Downgrade failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#fe9100]" />
      </div>
    );
  }

  const totalUsers = parseInt(stats?.total_users || "0");
  const proUsers = parseInt(stats?.pro_users || "0");
  const totalCalls = parseInt(stats?.total_calls || "0");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Activity className="w-4 h-4 text-purple-400" />
                Plattform-Verwaltung & Analytics
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{totalUsers}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Total Users</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Crown className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">{proUsers}</span>
            </div>
            <h3 className="text-gray-400 text-sm">PRO Users</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-xl border border-green-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Phone className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">{totalCalls}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Total Calls</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-white">{((proUsers / totalUsers) * 100).toFixed(0)}%</span>
            </div>
            <h3 className="text-gray-400 text-sm">Conversion Rate</h3>
          </motion.div>
        </div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">User Management</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">User</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Plan</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Created</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-400">{user.email}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.subscription_plan === 'pro' 
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                          : user.subscription_plan === 'enterprise'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {user.subscription_plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.subscription_status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {user.subscription_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {user.subscription_plan !== 'pro' && (
                          <button
                            onClick={() => handleUpgrade(user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-all disabled:opacity-50 group"
                            title="Upgrade to PRO"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                            ) : (
                              <ArrowUpCircle className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                            )}
                          </button>
                        )}
                        {user.subscription_plan === 'pro' && (
                          <button
                            onClick={() => handleDowngrade(user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 rounded-lg transition-all disabled:opacity-50 group"
                            title="Downgrade to FREE"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            ) : (
                              <ArrowDownCircle className="w-4 h-4 text-gray-400 group-hover:scale-110 transition-transform" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}