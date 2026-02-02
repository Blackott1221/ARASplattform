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
import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  TrendingUp, 
  CheckSquare, 
  Phone,
  Settings,
  LogOut,
  Shield,
  Command,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { InternalCommandPalette } from "./command-palette-internal";
import { DebugOverlay } from "./debug-overlay";

interface InternalLayoutProps {
  children: ReactNode;
}

// Feature flags - can be server-delivered or build-time
const INTERNAL_FEATURES = {
  settingsEnabled: false, // Settings page is in development
};

const NAV_ITEMS = [
  { path: "/internal/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { path: "/internal/contacts", label: "Contacts", icon: Users, enabled: true },
  { path: "/internal/companies", label: "Companies", icon: Building2, enabled: true },
  { path: "/internal/deals", label: "Deals & Pipeline", icon: TrendingUp, enabled: true },
  { path: "/internal/tasks", label: "Tasks", icon: CheckSquare, enabled: true },
  { path: "/internal/calls", label: "Call Logs", icon: Phone, enabled: true },
  { path: "/internal/contracts", label: "Contracts", icon: FileText, enabled: true },
  { path: "/internal/settings", label: "Settings", icon: Settings, enabled: INTERNAL_FEATURES.settingsEnabled },
];

export default function InternalLayout({ children }: InternalLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative z-20" style={{ background: 'var(--aras-bg, #0f0f0f)' }}>
      {/* Aurora Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary aurora glow */}
        <div 
          className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] opacity-[0.15]"
          style={{ background: 'radial-gradient(circle, var(--aras-orange) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] opacity-[0.1]"
          style={{ background: 'radial-gradient(circle, var(--aras-gold-dark) 0%, transparent 70%)' }}
        />
        {/* Horizon grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Sidebar - Premium Glass */}
      <aside 
        className="fixed left-0 top-0 h-screen w-64 z-50 border-r"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: 'var(--aras-stroke-accent)'
        }}
      >
        {/* Logo & Title */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--aras-stroke)' }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 
              className="text-xl font-bold mb-0.5"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, var(--aras-gold-light), var(--aras-orange), var(--aras-gold-dark))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              ARAS COMMAND
            </h1>
            <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--aras-soft)' }}>
              Control Center
            </p>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = location === item.path || location.startsWith(item.path + '/');
            const isDisabled = !item.enabled;
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative group"
              >
                <button
                  onClick={() => !isDisabled && setLocation(item.path)}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                    ${isDisabled 
                      ? 'opacity-40 cursor-not-allowed' 
                      : 'cursor-pointer hover:bg-white/[0.04]'
                    }
                  `}
                  style={{
                    color: isActive ? 'var(--aras-orange)' : 'var(--aras-muted)',
                    background: isActive ? 'rgba(254,145,0,0.08)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--aras-orange)' : '3px solid transparent',
                  }}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.label}
                  </span>
                </button>
                {isDisabled && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/95 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{ color: 'var(--aras-soft)' }}>
                    Coming soon
                  </div>
                )}
              </motion.div>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ borderColor: 'var(--aras-stroke)' }}>
          <div 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
              style={{ background: 'linear-gradient(135deg, var(--aras-orange), var(--aras-gold-dark))' }}
            >
              {(user as any)?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--aras-text)' }}>
                {(user as any)?.username || 'Admin'}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" style={{ color: 'var(--aras-orange)' }} />
                <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'var(--aras-orange)' }}>
                  {((user as any)?.userRole || (user as any)?.user_role || 'staff').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 min-h-screen relative">
        {/* Top Bar - Premium Glass */}
        <header 
          className="sticky top-0 z-40 border-b"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'var(--aras-stroke)'
          }}
        >
          <div className="px-8 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
            <div>
              <h2 
                className="text-xl font-bold"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  color: 'var(--aras-text)'
                }}
              >
                {NAV_ITEMS.find(item => location.startsWith(item.path))?.label || 'Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Command Palette Trigger */}
              <button
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-sm"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--aras-glass-border)',
                  color: 'var(--aras-muted)'
                }}
                title="⌘K / Ctrl+K"
              >
                <Command className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Suche</span>
                <kbd 
                  className="hidden sm:inline px-1.5 py-0.5 text-[9px] rounded ml-1"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--aras-soft)' }}
                >
                  ⌘K
                </kbd>
              </button>
              
              {/* Timezone */}
              <div className="text-xs hidden md:block px-2 py-1 rounded-lg" style={{ color: 'var(--aras-soft)', background: 'rgba(255,255,255,0.03)' }}>
                {new Date().toLocaleString('de-DE', { 
                  timeZone: 'Europe/Berlin',
                  hour: '2-digit',
                  minute: '2-digit'
                })} CET
              </div>
              
              {/* Logout */}
              <button
                onClick={() => window.location.href = '/api/logout'}
                className="px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 text-sm"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--aras-glass-border)',
                  color: 'var(--aras-muted)'
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
          {/* Gradient underline accent */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, var(--aras-stroke-accent), transparent)' }}
          />
        </header>

        {/* Page Content */}
        <main className="p-8 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <InternalCommandPalette />
      
      {/* Debug Overlay - only visible when localStorage.aras_debug = "1" */}
      <DebugOverlay />
    </div>
  );
}
