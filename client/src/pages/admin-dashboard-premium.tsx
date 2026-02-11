/**
 * ============================================================================
 * ARAS ADMIN DASHBOARD — PREMIUM REBUILD
 * ============================================================================
 * Clean + Premium (Apple-meets-Neuralink, ARAS CI)
 * State-Perfektion (Loading/Empty/Error)
 * Voll funktional: Users list, Disable/Enable, Audit, System Health
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Search, Shield, Crown, RefreshCw, X, Check,
  Key, CreditCard, RotateCcw, Eye, Trash2, Loader2,
  UserCog, ChevronDown, ChevronUp, Activity, AlertCircle,
  LayoutGrid, Copy, ArrowUpDown, Filter, UserX, UserCheck,
  History, Heart, Zap, Database, ChevronLeft, ChevronRight,
  Ban, CheckCircle2, Clock, Info
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { createPortal } from "react-dom";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PLAN_OPTIONS = [
  { key: "free", label: "Free", color: "#6B7280" },
  { key: "pro", label: "Pro", color: "#3B82F6" },
  { key: "ultra", label: "Ultra", color: "#8B5CF6" },
  { key: "ultimate", label: "Ultimate", color: "#FE9100" },
] as const;

const STATUS_OPTIONS = ["active", "trialing", "canceled", "past_due"] as const;

const ROLE_OPTIONS = [
  { key: "user", label: "User", color: "#6B7280", icon: Users },
  { key: "staff", label: "Staff", color: "#8B5CF6", icon: Shield },
  { key: "admin", label: "Admin", color: "#FE9100", icon: Crown },
] as const;

type TabId = "users" | "audit" | "health";
type ModalType = "plan" | "password" | "details" | "role" | null;
type SortField = "username" | "email" | "createdAt" | "subscriptionPlan" | "userRole";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "disabled";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.users && Array.isArray(data.users)) return data.users;
  return [];
}

function snakeToCamel(arr: any[]): any[] {
  return arr.map((obj) => {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      out[camel] = v;
      if (camel !== k) out[k] = v; // keep snake too for compat
    }
    return out;
  });
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `vor ${days}d`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" });
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { user: authUser } = useAuth() as { user: any };

  // UI State
  const [activeTab, setActiveTab] = useState<TabId>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formPlan, setFormPlan] = useState("free");
  const [formStatus, setFormStatus] = useState("active");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("user");

  // Deep Dive State
  const [deepDiveUserId, setDeepDiveUserId] = useState<string | null>(null);

  // Reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const transitionClass = prefersReducedMotion ? "" : "transition-all duration-200";

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  const { data: usersRaw = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      return snakeToCamel(extractArray(raw));
    },
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) return {};
      const data = await res.json();
      return data.stats || data;
    },
    refetchInterval: 30000,
  });

  const { data: onlineData } = useQuery({
    queryKey: ["admin-online"],
    queryFn: async () => {
      const res = await fetch("/api/admin/online-users", { credentials: "include" });
      return res.ok ? res.json() : { onlineUserIds: [] };
    },
    refetchInterval: 15000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit", activeTab],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit?limit=50", { credentials: "include" });
      if (!res.ok) return { entries: [], pagination: {} };
      return res.json();
    },
    enabled: activeTab === "audit",
  });

  // Deep Dive
  const { data: deepDiveData, isLoading: deepDiveLoading } = useQuery({
    queryKey: ["admin-deep-dive", deepDiveUserId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${deepDiveUserId}/deep-dive`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!deepDiveUserId,
  });

  const isOnline = useCallback(
    (id: string) => onlineData?.onlineUserIds?.includes(id),
    [onlineData]
  );

  // ═══════════════════════════════════════════════════════════════
  // DERIVED DATA: Filter + Sort + Paginate
  // ═══════════════════════════════════════════════════════════════

  const filteredUsers = useMemo(() => {
    let result = [...usersRaw];

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((u: any) => (u.subscriptionStatus || u.subscription_status) !== "disabled");
    } else if (statusFilter === "disabled") {
      result = result.filter((u: any) => (u.subscriptionStatus || u.subscription_status) === "disabled");
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u: any) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.firstName || "").toLowerCase().includes(q) ||
        (u.lastName || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a: any, b: any) => {
      const aVal = (a[sortField] || "").toString().toLowerCase();
      const bVal = (b[sortField] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [usersRaw, statusFilter, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, sortField, sortDir]);

  // Computed stats
  const totalUsers = usersRaw.length;
  const activeUsers = usersRaw.filter((u: any) => (u.subscriptionStatus || u.subscription_status) !== "disabled").length;
  const disabledUsers = totalUsers - activeUsers;
  const onlineCount = onlineData?.onlineUserIds?.length || 0;

  // ═══════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════

  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Disable failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "User deaktiviert", description: "Login gesperrt. Daten bleiben erhalten." });
    },
    onError: (error: any) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const enableMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}/enable`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Enable failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      toast({ title: "User reaktiviert", description: "Login wieder möglich." });
    },
    onError: (error: any) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, plan, status }: { id: string; plan: string; status: string }) => {
      const res = await fetch(`/api/admin/users/${id}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Plan change failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      toast({ title: "Plan geändert" });
      closeModal();
    },
    onError: (error: any) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/admin/users/${id}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword: password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Password change failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Passwort geändert" });
      closeModal();
    },
    onError: (error: any) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Role change failed");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      toast({ title: "Rolle geändert", description: `${data.user?.username || "User"} → ${(data.user?.role || "").toUpperCase()}` });
      closeModal();
    },
    onError: (error: any) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const resetUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}/reset-usage`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      toast({ title: "Usage zurückgesetzt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  // ═══════════════════════════════════════════════════════════════
  // MODAL HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const openModal = useCallback((type: ModalType, user: any) => {
    setSelectedUser(user);
    if (user) {
      setFormPlan(user.subscriptionPlan || user.subscription_plan || "free");
      setFormStatus(user.subscriptionStatus || user.subscription_status || "active");
      setFormRole((user.userRole || user.user_role || "user").toLowerCase());
    }
    setFormPassword("");
    setModalType(type);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setTimeout(() => { setModalType(null); setSelectedUser(null); setFormPassword(""); }, 150);
  }, []);

  // ESC + scroll lock
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deepDiveUserId) setDeepDiveUserId(null);
        else if (modalOpen) closeModal();
      }
    };
    window.addEventListener("keydown", handleEsc);
    if (modalOpen || deepDiveUserId) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { window.removeEventListener("keydown", handleEsc); document.body.style.overflow = ""; };
  }, [modalOpen, deepDiveUserId, closeModal]);

  // Sort handler
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-white/20" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-[var(--aras-orange)]" />
      : <ChevronDown className="w-3 h-3 text-[var(--aras-orange)]" />;
  };

  // Check if user can be disabled
  const canDisable = (user: any) => {
    const role = (user.userRole || user.user_role || "user").toLowerCase();
    const isSelf = user.id === authUser?.id;
    return !isSelf && role !== "admin";
  };

  const getDisableTooltip = (user: any) => {
    const role = (user.userRole || user.user_role || "user").toLowerCase();
    if (user.id === authUser?.id) return "Du kannst dich nicht selbst deaktivieren.";
    if (role === "admin") return "Admin-Accounts können nicht deaktiviert werden.";
    return "User deaktivieren — Login wird sofort blockiert.";
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen text-white" style={{ background: "var(--aras-bg)" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-6 max-md:px-4">

        {/* ── TOPBAR ── */}
        <header
          className={`sticky top-0 z-40 -mx-6 px-6 max-md:-mx-4 max-md:px-4 py-4 mb-6 ${transitionClass}`}
          style={{
            background: "rgba(15,15,15,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--aras-stroke)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--aras-orange), var(--aras-gold-dark))" }}
              >
                <Shield className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="font-orbitron text-lg font-bold tracking-tight text-white">
                  ARAS Admin
                </h1>
                <p className="text-xs" style={{ color: "var(--aras-soft)" }}>
                  Dashboard · {totalUsers} Users
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/internal/dashboard")}
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${transitionClass}`}
                style={{
                  background: "rgba(254,145,0,0.08)",
                  border: "1px solid var(--aras-stroke-accent)",
                  color: "var(--aras-orange)",
                }}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Command Center
              </button>
              <div
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: onlineCount > 0 ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${onlineCount > 0 ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)"}`,
                  color: onlineCount > 0 ? "#10B981" : "var(--aras-soft)",
                }}
              >
                {onlineCount} online
              </div>
              <button
                onClick={() => refetchUsers()}
                className={`p-2 rounded-xl ${transitionClass}`}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--aras-glass-border)" }}
                aria-label="Refresh"
              >
                <RefreshCw className="w-4 h-4" style={{ color: "var(--aras-muted)" }} />
              </button>
            </div>
          </div>
        </header>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Users", value: totalUsers, icon: Users, color: "var(--aras-orange)" },
            { label: "Aktiv", value: activeUsers, icon: UserCheck, color: "#10B981" },
            { label: "Deaktiviert", value: disabledUsers, icon: UserX, color: "#EF4444" },
            { label: "Online", value: onlineCount, icon: Zap, color: "#06B6D4" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`p-4 rounded-2xl ${transitionClass}`}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--aras-glass-border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: "var(--aras-soft)" }}>
                  {kpi.label}
                </span>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color, opacity: 0.6 }} />
              </div>
              {usersLoading ? (
                <Skeleton className="h-8 w-16 bg-white/[0.06]" />
              ) : (
                <div className="text-2xl font-bold" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── TAB NAV ── */}
        <div
          className="flex items-center gap-1 p-1 rounded-2xl mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--aras-glass-border)" }}
          role="tablist"
        >
          {([
            { id: "users" as TabId, label: "Users", icon: Users },
            { id: "audit" as TabId, label: "Activity Log", icon: History },
            { id: "health" as TabId, label: "System", icon: Activity },
          ]).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${transitionClass}`}
              style={{
                background: activeTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeTab === tab.id ? "white" : "var(--aras-soft)",
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: USERS                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div>
            {/* Controls: Search + Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--aras-soft)" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suchen nach Name, Email..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-full text-sm ${transitionClass}`}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--aras-glass-border)",
                    color: "var(--aras-text)",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--aras-stroke-accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--aras-glass-border)")}
                />
              </div>
              <div className="flex items-center gap-2">
                {(["all", "active", "disabled"] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${transitionClass}`}
                    style={{
                      background: statusFilter === f ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${statusFilter === f ? "rgba(255,255,255,0.15)" : "var(--aras-glass-border)"}`,
                      color: statusFilter === f ? "white" : "var(--aras-soft)",
                    }}
                  >
                    {f === "all" ? "Alle" : f === "active" ? "Aktiv" : "Deaktiviert"}
                  </button>
                ))}
                <span className="text-xs pl-2" style={{ color: "var(--aras-soft)" }}>
                  {filteredUsers.length} Ergebnis{filteredUsers.length !== 1 ? "se" : ""}
                </span>
              </div>
            </div>

            {/* Users Table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--aras-glass-border)" }}
            >
              {/* Table Header */}
              <div
                className="grid items-center px-4 py-3 text-xs font-medium uppercase tracking-wider"
                style={{
                  gridTemplateColumns: "44px 1fr 1fr 100px 100px 80px 140px",
                  color: "var(--aras-soft)",
                  borderBottom: "1px solid var(--aras-glass-border)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div />
                <button onClick={() => toggleSort("username")} className="flex items-center gap-1 hover:text-white">
                  Name <SortIcon field="username" />
                </button>
                <button onClick={() => toggleSort("email")} className="flex items-center gap-1 hover:text-white max-md:hidden">
                  Email <SortIcon field="email" />
                </button>
                <button onClick={() => toggleSort("userRole")} className="flex items-center gap-1 hover:text-white">
                  Rolle <SortIcon field="userRole" />
                </button>
                <button onClick={() => toggleSort("subscriptionPlan")} className="flex items-center gap-1 hover:text-white max-md:hidden">
                  Plan <SortIcon field="subscriptionPlan" />
                </button>
                <div>Status</div>
                <div className="text-right">Aktionen</div>
              </div>

              {/* Loading */}
              {usersLoading && (
                <div className="divide-y" style={{ borderColor: "var(--aras-glass-border)" }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: "44px 1fr 1fr 100px 100px 80px 140px" }}>
                      <Skeleton className="w-8 h-8 rounded-full bg-white/[0.06]" />
                      <Skeleton className="h-4 w-28 bg-white/[0.06]" />
                      <Skeleton className="h-4 w-36 bg-white/[0.06] max-md:hidden" />
                      <Skeleton className="h-5 w-14 rounded-full bg-white/[0.06]" />
                      <Skeleton className="h-5 w-12 rounded-full bg-white/[0.06] max-md:hidden" />
                      <Skeleton className="h-5 w-14 rounded-full bg-white/[0.06]" />
                      <div className="flex justify-end gap-1">
                        {[1, 2, 3].map(j => <Skeleton key={j} className="w-8 h-8 rounded-xl bg-white/[0.06]" />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {!usersLoading && usersError && (
                <div className="py-16 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(239,68,68,0.5)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--aras-muted)" }}>Fehler beim Laden</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: "var(--aras-soft)" }}>{(usersError as Error).message}</p>
                  <button
                    onClick={() => refetchUsers()}
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--aras-glass-border)", color: "var(--aras-muted)" }}
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}

              {/* Empty */}
              {!usersLoading && !usersError && filteredUsers.length === 0 && (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--aras-muted)" }}>Keine Nutzer gefunden</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: "var(--aras-soft)" }}>Passe deine Filter an oder setze sie zurück.</p>
                  {(searchQuery || statusFilter !== "all") && (
                    <button
                      onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                      className="px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--aras-glass-border)", color: "var(--aras-muted)" }}
                    >
                      Filter zurücksetzen
                    </button>
                  )}
                </div>
              )}

              {/* Rows */}
              {!usersLoading && !usersError && paginatedUsers.length > 0 && (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {paginatedUsers.map((user: any) => {
                    const role = (user.userRole || user.user_role || "user").toLowerCase();
                    const plan = user.subscriptionPlan || user.subscription_plan || "free";
                    const status = user.subscriptionStatus || user.subscription_status || "active";
                    const isDisabled = status === "disabled";
                    const roleOpt = ROLE_OPTIONS.find((r) => r.key === role);
                    const planOpt = PLAN_OPTIONS.find((p) => p.key === plan);

                    return (
                      <div
                        key={user.id}
                        className={`grid items-center px-4 py-3 group ${transitionClass}`}
                        style={{
                          gridTemplateColumns: "44px 1fr 1fr 100px 100px 80px 140px",
                          opacity: isDisabled ? 0.55 : 1,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Avatar */}
                        <div className="relative">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "rgba(255,255,255,0.06)", color: "var(--aras-muted)" }}
                          >
                            {(user.username?.[0] || "?").toUpperCase()}
                          </div>
                          {isOnline(user.id) && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: "var(--aras-bg)" }} />
                          )}
                        </div>

                        {/* Name */}
                        <div className="min-w-0">
                          <button
                            onClick={() => setDeepDiveUserId(user.id)}
                            className={`text-sm font-medium truncate block hover:underline ${transitionClass}`}
                            style={{ color: "var(--aras-text)" }}
                          >
                            {user.username || "—"}
                          </button>
                          <span className="text-xs truncate block md:hidden" style={{ color: "var(--aras-soft)" }}>
                            {user.email || "—"}
                          </span>
                        </div>

                        {/* Email */}
                        <div className="text-xs truncate max-md:hidden" style={{ color: "var(--aras-soft)" }}>
                          {user.email || "—"}
                        </div>

                        {/* Role */}
                        <button
                          onClick={() => openModal("role", user)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${transitionClass}`}
                          style={{
                            background: `${roleOpt?.color || "#6B7280"}15`,
                            color: roleOpt?.color || "#6B7280",
                            border: `1px solid ${roleOpt?.color || "#6B7280"}25`,
                          }}
                        >
                          {role.toUpperCase()}
                          <ChevronDown className="w-2.5 h-2.5" />
                        </button>

                        {/* Plan */}
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full w-fit max-md:hidden"
                          style={{
                            background: `${planOpt?.color || "#6B7280"}12`,
                            color: planOpt?.color || "#6B7280",
                          }}
                        >
                          {plan}
                        </span>

                        {/* Status */}
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                          style={{
                            background: isDisabled ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                            color: isDisabled ? "#EF4444" : "#10B981",
                            border: `1px solid ${isDisabled ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.18)"}`,
                          }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-red-400" : "bg-emerald-400"}`} />
                          {isDisabled ? "Off" : "Aktiv"}
                        </span>

                        {/* Actions */}
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setDeepDiveUserId(user.id)}
                            className={`p-1.5 rounded-xl ${transitionClass}`}
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--aras-glass-border)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                            title="Details anzeigen"
                          >
                            <Eye className="w-3.5 h-3.5" style={{ color: "var(--aras-muted)" }} />
                          </button>
                          <button
                            onClick={() => openModal("plan", user)}
                            className={`p-1.5 rounded-xl ${transitionClass}`}
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--aras-glass-border)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                            title="Plan ändern"
                          >
                            <CreditCard className="w-3.5 h-3.5" style={{ color: "var(--aras-muted)" }} />
                          </button>
                          <button
                            onClick={() => openModal("password", user)}
                            className={`p-1.5 rounded-xl ${transitionClass}`}
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--aras-glass-border)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                            title="Passwort ändern"
                          >
                            <Key className="w-3.5 h-3.5" style={{ color: "var(--aras-muted)" }} />
                          </button>
                          {isDisabled ? (
                            <button
                              onClick={() => {
                                if (confirm("User reaktivieren? Login wird wieder erlaubt.")) enableMutation.mutate(user.id);
                              }}
                              className={`p-1.5 rounded-xl ${transitionClass}`}
                              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}
                              title="User reaktivieren"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (!canDisable(user)) return;
                                if (confirm("User deaktivieren? Login wird sofort blockiert.")) disableMutation.mutate(user.id);
                              }}
                              disabled={!canDisable(user)}
                              className={`p-1.5 rounded-xl ${transitionClass} disabled:opacity-30 disabled:cursor-not-allowed`}
                              style={{
                                background: canDisable(user) ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)",
                                border: `1px solid ${canDisable(user) ? "rgba(239,68,68,0.18)" : "transparent"}`,
                              }}
                              title={getDisableTooltip(user)}
                            >
                              <Ban className="w-3.5 h-3.5" style={{ color: canDisable(user) ? "#EF4444" : "var(--aras-soft)" }} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {!usersLoading && filteredUsers.length > pageSize && (
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: "1px solid var(--aras-glass-border)" }}
                >
                  <span className="text-xs" style={{ color: "var(--aras-soft)" }}>
                    Seite {page} von {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg disabled:opacity-30"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <ChevronLeft className="w-4 h-4" style={{ color: "var(--aras-muted)" }} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium ${transitionClass}`}
                          style={{
                            background: page === p ? "var(--aras-orange)" : "rgba(255,255,255,0.04)",
                            color: page === p ? "black" : "var(--aras-muted)",
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded-lg disabled:opacity-30"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <ChevronRight className="w-4 h-4" style={{ color: "var(--aras-muted)" }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: AUDIT LOG                                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "audit" && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--aras-glass-border)" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--aras-glass-border)", background: "rgba(255,255,255,0.02)" }}>
              <h3 className="text-sm font-medium" style={{ color: "var(--aras-text)" }}>Admin Activity Log</h3>
              <p className="text-xs" style={{ color: "var(--aras-soft)" }}>Alle Admin-Aktionen werden protokolliert.</p>
            </div>

            {auditLoading && (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full bg-white/[0.06]" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-48 bg-white/[0.06]" />
                      <Skeleton className="h-2.5 w-32 bg-white/[0.04]" />
                    </div>
                    <Skeleton className="h-3 w-20 bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            )}

            {!auditLoading && (!auditData?.entries || auditData.entries.length === 0) && (
              <div className="py-16 text-center">
                <History className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--aras-muted)" }}>Noch keine Audit-Einträge</p>
                <p className="text-xs mt-1" style={{ color: "var(--aras-soft)" }}>
                  Änderungen an Usern werden hier protokolliert.
                </p>
              </div>
            )}

            {!auditLoading && auditData?.entries && auditData.entries.length > 0 && (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {auditData.entries.map((entry: any, i: number) => {
                  const actionColors: Record<string, string> = {
                    role_change: "#8B5CF6",
                    password_reset: "#F59E0B",
                    user_delete: "#EF4444",
                    plan_change: "#06B6D4",
                    bulk_role_change: "#EC4899",
                  };
                  const color = actionColors[entry.action] || "#6B7280";
                  return (
                    <div key={entry.id || i} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}15` }}
                      >
                        <Activity className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: "var(--aras-text)" }}>
                            {entry.actor_username || "System"}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ background: `${color}15`, color }}
                          >
                            {(entry.action || "").replace(/_/g, " ")}
                          </span>
                        </div>
                        {entry.target_username && (
                          <span className="text-xs" style={{ color: "var(--aras-soft)" }}>
                            → {entry.target_username}
                          </span>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--aras-soft)" }}>
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB: SYSTEM HEALTH                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "health" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* API Status */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--aras-glass-border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>API Status</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" style={!prefersReducedMotion ? { animation: "pulse 2s infinite" } : {}} />
                  <span className="text-xs font-medium text-emerald-400">Online</span>
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Admin API</span>
                  <span className="text-emerald-400">Healthy</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Auth System</span>
                  <span className="text-emerald-400">Healthy</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Sessions</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.sessions || "—"} aktiv</span>
                </div>
              </div>
            </div>

            {/* Database */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--aras-glass-border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>Database</span>
                <Database className="w-4 h-4" style={{ color: "var(--aras-soft)", opacity: 0.5 }} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Users</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.users || totalUsers}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Leads</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.leads || "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Calls</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.callLogs || "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>AI Messages</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.totalAiMessages || "—"}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--aras-glass-border)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>Overview</span>
                <Heart className="w-4 h-4" style={{ color: "var(--aras-soft)", opacity: 0.5 }} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Feedback</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.feedback || "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Campaigns</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.campaigns || "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Voice Agents</span>
                  <span style={{ color: "var(--aras-muted)" }}>{stats?.voiceAgents || "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--aras-soft)" }}>Online Now</span>
                  <span className="text-emerald-400 font-medium">{onlineCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DEEP DIVE SLIDE-OVER                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {deepDiveUserId && createPortal(
        <div className="fixed inset-0 z-50" onClick={() => setDeepDiveUserId(null)}>
          <div
            className={prefersReducedMotion ? "fixed inset-0 bg-black/60" : "fixed inset-0 bg-black/60 backdrop-blur-sm"}
            style={!prefersReducedMotion ? { animation: "fadeIn 200ms ease-out" } : {}}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 h-full w-full sm:w-[600px] overflow-y-auto"
            style={{
              background: "#111113",
              borderLeft: "1px solid var(--aras-glass-border)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
              ...(prefersReducedMotion ? {} : { animation: "slideInRight 220ms ease-out" }),
            }}
          >
            {/* Panel Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
              style={{ background: "#111113", borderBottom: "1px solid var(--aras-glass-border)" }}
            >
              <h2 className="text-base font-bold" style={{ color: "var(--aras-text)" }}>User Details</h2>
              <button
                onClick={() => setDeepDiveUserId(null)}
                className="p-2 rounded-xl hover:bg-white/10"
              >
                <X className="w-4 h-4" style={{ color: "var(--aras-muted)" }} />
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-5 space-y-4">
              {deepDiveLoading && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-full bg-white/[0.06]" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-36 bg-white/[0.06]" />
                      <Skeleton className="h-3 w-48 bg-white/[0.04]" />
                    </div>
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl bg-white/[0.04]" />
                  ))}
                </div>
              )}

              {!deepDiveLoading && deepDiveData?.user && (() => {
                const u = deepDiveData.user;
                const role = (u.user_role || u.userRole || "user").toLowerCase();
                const plan = u.subscription_plan || u.subscriptionPlan || "free";
                const status = u.subscription_status || u.subscriptionStatus || "active";
                const isDisabled = status === "disabled";
                const roleOpt = ROLE_OPTIONS.find(r => r.key === role);
                const planOpt = PLAN_OPTIONS.find(p => p.key === plan);

                return (
                  <>
                    {/* Profile Header */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                        style={{ background: `${roleOpt?.color || "#6B7280"}20`, color: roleOpt?.color || "#6B7280" }}
                      >
                        {(u.username?.[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: "var(--aras-text)" }}>{u.username || "—"}</h3>
                        <p className="text-sm" style={{ color: "var(--aras-soft)" }}>{u.email || "—"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${roleOpt?.color}15`, color: roleOpt?.color }}>
                            {role.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${planOpt?.color}12`, color: planOpt?.color }}>
                            {plan}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: isDisabled ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                              color: isDisabled ? "#EF4444" : "#10B981",
                            }}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-red-400" : "bg-emerald-400"}`} />
                            {isDisabled ? "Disabled" : "Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(u.id); toast({ title: "ID kopiert" }); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--aras-glass-border)", color: "var(--aras-muted)" }}
                      >
                        <Copy className="w-3 h-3" /> ID kopieren
                      </button>
                      <button
                        onClick={() => { setDeepDiveUserId(null); openModal("plan", u); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--aras-glass-border)", color: "var(--aras-muted)" }}
                      >
                        <CreditCard className="w-3 h-3" /> Plan
                      </button>
                      <button
                        onClick={() => { setDeepDiveUserId(null); openModal("password", u); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--aras-glass-border)", color: "var(--aras-muted)" }}
                      >
                        <Key className="w-3 h-3" /> Passwort
                      </button>
                    </div>

                    {/* Account Card */}
                    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--aras-glass-border)" }}>
                      <h4 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--aras-soft)" }}>Account</h4>
                      <div className="space-y-2">
                        {[
                          { label: "ID", value: u.id },
                          { label: "Erstellt", value: u.created_at ? new Date(u.created_at).toLocaleDateString("de-DE") : "—" },
                          { label: "Name", value: [u.first_name, u.last_name].filter(Boolean).join(" ") || "—" },
                          { label: "Company", value: u.company || "—" },
                          { label: "AI Messages", value: u.ai_messages_used ?? "—" },
                          { label: "Voice Calls", value: u.voice_calls_used ?? "—" },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-xs">
                            <span style={{ color: "var(--aras-soft)" }}>{row.label}</span>
                            <span className="font-mono" style={{ color: "var(--aras-muted)" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    {deepDiveData.stats && (
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--aras-glass-border)" }}>
                        <h4 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--aras-soft)" }}>Nutzung</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Calls", value: deepDiveData.stats.totalCalls },
                            { label: "Chats", value: deepDiveData.stats.totalChats },
                            { label: "Leads", value: deepDiveData.stats.totalLeads },
                            { label: "Contacts", value: deepDiveData.stats.totalContacts },
                          ].map((s) => (
                            <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                              <div className="text-lg font-bold" style={{ color: "var(--aras-orange)" }}>{s.value}</div>
                              <div className="text-xs" style={{ color: "var(--aras-soft)" }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Calls */}
                    {deepDiveData.calls && deepDiveData.calls.length > 0 && (
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--aras-glass-border)" }}>
                        <h4 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--aras-soft)" }}>Letzte Anrufe</h4>
                        <div className="space-y-2">
                          {deepDiveData.calls.slice(0, 5).map((call: any) => (
                            <div key={call.id} className="flex justify-between text-xs">
                              <span style={{ color: "var(--aras-muted)" }}>{call.contact_name || call.contactName || call.phone_number || "—"}</span>
                              <span style={{ color: "var(--aras-soft)" }}>{timeAgo(call.created_at || call.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODALS                                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {modalOpen && selectedUser && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.8)",
            backdropFilter: prefersReducedMotion ? "none" : "blur(8px)",
            WebkitBackdropFilter: prefersReducedMotion ? "none" : "blur(8px)",
          }}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl max-h-[85vh] overflow-y-auto"
            style={{
              background: "#1a1a1c",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
              ...(prefersReducedMotion ? {} : { animation: "scaleIn 150ms ease-out" }),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-0">
              <h2 className="text-lg font-bold" style={{ color: "var(--aras-text)" }}>
                {modalType === "plan" && "Plan ändern"}
                {modalType === "password" && "Passwort ändern"}
                {modalType === "role" && "Rolle ändern"}
                {modalType === "details" && "User Details"}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-white/10">
                <X className="w-4 h-4" style={{ color: "var(--aras-muted)" }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* User Info */}
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-sm font-medium" style={{ color: "var(--aras-text)" }}>
                  {selectedUser.username || selectedUser.email || "?"}
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "var(--aras-soft)" }}>
                  {selectedUser.id}
                </div>
              </div>

              {/* Plan Modal */}
              {modalType === "plan" && (
                <>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>Plan</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {PLAN_OPTIONS.map((p) => (
                        <button
                          key={p.key}
                          onClick={() => setFormPlan(p.key)}
                          className={`p-3 rounded-xl text-center text-sm font-medium ${transitionClass}`}
                          style={{
                            background: formPlan === p.key ? `${p.color}20` : "rgba(255,255,255,0.04)",
                            border: `1px solid ${formPlan === p.key ? `${p.color}40` : "var(--aras-glass-border)"}`,
                            color: formPlan === p.key ? p.color : "var(--aras-muted)",
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>Status</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setFormStatus(s)}
                          className={`p-2 rounded-xl text-center text-xs font-medium ${transitionClass}`}
                          style={{
                            background: formStatus === s ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${formStatus === s ? "rgba(16,185,129,0.3)" : "var(--aras-glass-border)"}`,
                            color: formStatus === s ? "#10B981" : "var(--aras-muted)",
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Password Modal */}
              {modalType === "password" && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>Neues Passwort</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Min. 8 Zeichen"
                    autoFocus
                    className="w-full mt-2 px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--aras-glass-border)",
                      color: "var(--aras-text)",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--aras-stroke-accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--aras-glass-border)")}
                  />
                  {formPassword.length > 0 && formPassword.length < 8 && (
                    <p className="text-xs mt-1 text-red-400">Mindestens 8 Zeichen erforderlich.</p>
                  )}
                </div>
              )}

              {/* Role Modal */}
              {modalType === "role" && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--aras-soft)" }}>Neue Rolle</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {ROLE_OPTIONS.map((r) => {
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.key}
                          onClick={() => setFormRole(r.key)}
                          className={`p-4 rounded-xl text-center flex flex-col items-center gap-2 ${transitionClass}`}
                          style={{
                            background: formRole === r.key ? `${r.color}20` : "rgba(255,255,255,0.04)",
                            border: `2px solid ${formRole === r.key ? r.color : "transparent"}`,
                            color: formRole === r.key ? r.color : "var(--aras-muted)",
                          }}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-medium">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {(selectedUser.userRole || selectedUser.user_role || "").toLowerCase() === "admin" && formRole !== "admin" && (
                    <div
                      className="mt-3 p-3 rounded-xl text-xs flex items-start gap-2"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Admin wird herabgestuft. Das System verhindert die Entfernung des letzten Admins.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={closeModal}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${transitionClass}`}
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--aras-muted)" }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (modalType === "plan") {
                    changePlanMutation.mutate({ id: selectedUser.id, plan: formPlan, status: formStatus });
                  } else if (modalType === "password" && formPassword.length >= 8) {
                    changePasswordMutation.mutate({ id: selectedUser.id, password: formPassword });
                  } else if (modalType === "role") {
                    changeRoleMutation.mutate({ id: selectedUser.id, role: formRole });
                  }
                }}
                disabled={
                  (modalType === "password" && formPassword.length < 8) ||
                  (modalType === "role" && formRole === (selectedUser.userRole || selectedUser.user_role || "user").toLowerCase()) ||
                  changePlanMutation.isPending || changePasswordMutation.isPending || changeRoleMutation.isPending
                }
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${transitionClass} disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                style={{ background: "var(--aras-orange)", color: "black" }}
              >
                {(changePlanMutation.isPending || changePasswordMutation.isPending || changeRoleMutation.isPending) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Speichere...</>
                ) : (
                  <><Check className="w-4 h-4" /> Speichern</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Inline keyframe styles for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-admin-shell] *, [data-admin-shell] *::before, [data-admin-shell] *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
