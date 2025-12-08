/**
 * ============================================================================
 * ARAS COMMAND CENTER - INTERNAL LAYOUT
 * ============================================================================
 * Dunkles, hochwertiges Layout für das interne CRM-System
 * NUR für admin/staff sichtbar
 * ============================================================================
 */

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  TrendingUp, 
  CheckSquare, 
  Phone,
  Settings,
  LogOut,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface InternalLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { path: "/internal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/internal/contacts", label: "Contacts", icon: Users },
  { path: "/internal/companies", label: "Companies", icon: Building2 },
  { path: "/internal/deals", label: "Deals & Pipeline", icon: TrendingUp },
  { path: "/internal/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/internal/calls", label: "Call Logs", icon: Phone },
  { path: "/internal/settings", label: "Settings", icon: Settings },
];

export default function InternalLayout({ children }: InternalLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-black/40 backdrop-blur-xl border-r border-orange-500/20 z-50">
        {/* Logo & Title */}
        <div className="p-6 border-b border-orange-500/20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-1"
                style={{ fontFamily: 'Orbitron, sans-serif' }}>
              ARAS COMMAND
            </h1>
            <p className="text-xs text-orange-300/60 tracking-wider">
              INTERNAL CONTROL CENTER
            </p>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <motion.a
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border border-orange-500/30' 
                      : 'text-gray-400 hover:text-orange-300 hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.label}
                  </span>
                </motion.a>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-orange-500/20">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
              {(user as any)?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {(user as any)?.username || 'Admin'}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-400 font-semibold">INTERNAL</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-orange-500/20">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {NAV_ITEMS.find(item => item.path === location)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-400">
                Alles hier ist ARAS AI – interne Steuerzentrale
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timezone */}
              <div className="text-sm text-gray-400">
                {new Date().toLocaleString('de-DE', { 
                  timeZone: 'Europe/Berlin',
                  hour: '2-digit',
                  minute: '2-digit'
                })} CET
              </div>
              
              {/* Logout */}
              <button
                onClick={() => window.location.href = '/api/logout'}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>

      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-orange-600/10 to-transparent rounded-full blur-3xl"
        />
      </div>
    </div>
  );
}
