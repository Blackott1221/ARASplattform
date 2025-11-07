import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Phone, MessageSquare, Crown, Shield, Activity, ArrowUpCircle, ArrowDownCircle, Loader2, Trash2, Key, Eye, X, AlertTriangle } from "lucide-react";

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

interface UserDetails {
  user: User;
  calls: any[];
  messageCount: number;
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
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

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

  const fetchUserDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/details`);
      const data = await res.json();
      if (data.success) {
        setSelectedUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
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

  const handleResetPassword = async () => {
    if (!showPasswordModal || !newPassword) return;
    
    setActionLoading(showPasswordModal.id);
    try {
      const res = await fetch(`/api/admin/users/${showPasswordModal.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      
      const data = await res.json();
      if (data.success) {
        setShowPasswordModal(null);
        setNewPassword("");
        await fetchData();
      }
    } catch (error) {
      console.error('Password reset failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    
    setActionLoading(showDeleteModal.id);
    try {
      const res = await fetch(`/api/admin/users/${showDeleteModal.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setShowDeleteModal(null);
        await fetchData();
      }
    } catch (error) {
      console.error('Delete failed:', error);
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
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fe9100] to-[#ff6b00] flex items-center justify-center shadow-lg shadow-[#fe9100]/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-[#fe9100] to-[#ff6b00] bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Activity className="w-4 h-4 text-[#fe9100]" />
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
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-3xl font-bold text-white">{totalUsers}</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#fe9100]/10 to-[#ff6b00]/10 backdrop-blur-xl border border-[#fe9100]/20 rounded-2xl p-6 hover:border-[#fe9100]/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <Crown className="w-8 h-8 text-[#fe9100]" />
              <span className="text-3xl font-bold text-white">{proUsers}</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">PRO Users</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-xl border border-green-500/20 rounded-2xl p-6 hover:border-green-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <Phone className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{totalCalls}</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Total Calls</h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <span className="text-3xl font-bold text-white">{totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(0) : 0}%</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Conversion Rate</h3>
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
            <Users className="w-6 h-6 text-[#fe9100]" />
            <h2 className="text-2xl font-bold text-white">User Management</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">User</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Email</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Plan</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Status</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Messages</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Calls</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Created</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-medium text-sm">Actions</th>
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fe9100] to-[#ff6b00] flex items-center justify-center text-white font-bold text-sm">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-400 text-sm">{user.email}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.subscription_plan === 'pro' 
                          ? 'bg-[#fe9100]/20 text-[#fe9100] border border-[#fe9100]/30' 
                          : user.subscription_plan === 'enterprise'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
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
                    <td className="py-4 px-4 text-gray-300 text-sm">{user.ai_messages_used || 0}</td>
                    <td className="py-4 px-4 text-gray-300 text-sm">{user.voice_calls_used || 0}</td>
                    <td className="py-4 px-4 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => fetchUserDetails(user.id)}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all group"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        </button>
                        
                        {user.subscription_plan !== 'pro' && (
                          <button
                            onClick={() => handleUpgrade(user.id)}
                            disabled={actionLoading === user.id}
                            className="p-2 bg-[#fe9100]/20 hover:bg-[#fe9100]/30 border border-[#fe9100]/30 rounded-lg transition-all disabled:opacity-50 group"
                            title="Upgrade to PRO"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="w-4 h-4 text-[#fe9100] animate-spin" />
                            ) : (
                              <ArrowUpCircle className="w-4 h-4 text-[#fe9100] group-hover:scale-110 transition-transform" />
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
                        
                        <button
                          onClick={() => setShowPasswordModal(user)}
                          className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg transition-all group"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                        </button>
                        
                        <button
                          onClick={() => setShowDeleteModal(user)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all group"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fe9100] to-[#ff6b00] flex items-center justify-center text-white font-bold">
                    {selectedUser.user.username[0].toUpperCase()}
                  </div>
                  {selectedUser.user.username}
                </h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Email</p>
                  <p className="text-white font-medium">{selectedUser.user.email}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Plan</p>
                  <p className="text-white font-medium">{selectedUser.user.subscription_plan}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Total Messages</p>
                  <p className="text-white font-medium text-2xl">{selectedUser.messageCount}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 text-sm mb-1">Total Calls</p>
                  <p className="text-white font-medium text-2xl">{selectedUser.calls.length}</p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#fe9100]" />
                  Recent Calls
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedUser.calls.slice(0, 10).map((call: any, idx: number) => (
                    <div key={idx} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm">{call.phone_number || 'N/A'}</span>
                        <span className="text-gray-400 text-xs">
                          {new Date(call.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      {call.duration && (
                        <p className="text-gray-400 text-xs mt-1">Duration: {call.duration}s</p>
                      )}
                    </div>
                  ))}
                  {selectedUser.calls.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No calls yet</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Key className="w-6 h-6 text-[#fe9100]" />
                Reset Password
              </h2>
              
              <p className="text-gray-400 mb-4">
                Reset password for: <span className="text-white font-medium">{showPasswordModal.username}</span>
              </p>

              <input
                type="text"
                placeholder="New Password (min. 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#fe9100] transition-colors mb-6"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={!newPassword || newPassword.length < 8 || !!actionLoading}
                  className="flex-1 bg-gradient-to-r from-[#fe9100] to-[#ff6b00] hover:from-[#ff6b00] hover:to-[#fe9100] text-white rounded-xl px-6 py-3 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Reset Password'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-gray-950 border border-red-500/30 rounded-3xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Delete User</h2>
              </div>
              
              <p className="text-gray-400 mb-2">
                Are you sure you want to delete:
              </p>
              <p className="text-white font-bold text-lg mb-4">{showDeleteModal.username}</p>
              <p className="text-red-400 text-sm mb-6">
                ⚠️ This will permanently delete all user data including messages, calls, campaigns, and leads. This action cannot be undone!
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={!!actionLoading}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-3 font-medium transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Delete Forever'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}