import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Phone, 
  Users, 
  CreditCard, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { useState, useEffect } from "react";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ activeSection, onSectionChange, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Auto-collapse after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onToggleCollapse && !isCollapsed) {
        onToggleCollapse();
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isCollapsed, onToggleCollapse]);

  const navItems = [
    { id: "space", label: "Space", icon: MessageCircle, gradient: "from-[#e9d7c4] via-[#FE9100] to-[#a34e00]" },
    { id: "power", label: "Power", icon: Phone, gradient: "from-[#FE9100] via-[#e9d7c4] to-[#a34e00]" },
    { id: "leads", label: "Dashboard", icon: LayoutDashboard, gradient: "from-[#a34e00] via-[#FE9100] to-[#e9d7c4]" },
    { id: "billing", label: "Ihr Plan", icon: CreditCard, gradient: "from-[#e9d7c4] via-[#a34e00] to-[#FE9100]" },
    { id: "settings", label: "Einstellungen", icon: Settings, gradient: "from-[#FE9100] via-[#a34e00] to-[#e9d7c4]" },
  ];

  return (
    <motion.div 
      className="relative flex-shrink-0"
      initial={false}
      animate={{ width: isCollapsed ? 100 : 280 }}
      transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
    >
      {/* Ultra-Transparent Background with Glow */}
      <div className="absolute inset-0">
        {/* Subtle Gradient Glow */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(254, 145, 0, 0.15) 0%, transparent 70%)',
          }}
        />
        
        {/* Glassmorphism Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(40px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        />

        {/* Animated Right Border Glow */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-[1px]"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(254, 145, 0, 0.5), transparent)',
            backgroundSize: '100% 200%'
          }}
          animate={{
            backgroundPosition: ['0% 0%', '0% 100%', '0% 0%']
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Logo Section */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-6' : 'justify-between p-6'} border-b border-white/5`}>
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {/* Logo Glow */}
            <motion.div
              className="absolute -inset-2 rounded-full blur-xl opacity-0 group-hover:opacity-100"
              style={{
                background: 'radial-gradient(circle, rgba(254, 145, 0, 0.4) 0%, transparent 70%)'
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <img 
              src={arasLogo} 
              alt="ARAS AI" 
              className={`relative ${isCollapsed ? 'w-12 h-12' : 'w-16 h-16'} transition-all duration-400 object-contain`}
            />
          </motion.div>
          
          {!isCollapsed && onToggleCollapse && (
            <motion.button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              whileHover={{ 
                scale: 1.1,
                background: 'rgba(254, 145, 0, 0.1)',
                borderColor: 'rgba(254, 145, 0, 0.3)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}
        </div>

        {/* Expand Button (when collapsed) */}
        {isCollapsed && onToggleCollapse && (
          <div className="flex justify-center p-4">
            <motion.button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              whileHover={{ 
                scale: 1.1,
                background: 'rgba(254, 145, 0, 0.1)',
                borderColor: 'rgba(254, 145, 0, 0.3)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </motion.button>
          </div>
        )}
        
        {/* Navigation Items */}
        <nav className={`flex-1 ${isCollapsed ? 'px-4 py-6' : 'px-6 py-8'} space-y-2`}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isHovered = hoveredItem === item.id;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
              >
                <motion.a
                  href={item.id === 'space' ? '/app' : `/app/${item.id}`}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="relative block group"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active/Hover Glow */}
                  {(isActive || isHovered) && (
                    <motion.div
                      layoutId={isActive ? "activeGlow" : "hoverGlow"}
                      className="absolute -inset-2 rounded-2xl blur-xl opacity-40"
                      style={{
                        background: `linear-gradient(90deg, ${item.gradient.split(' ').slice(1).join(' ')})`
                      }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  {/* Item Container */}
                  <div
                    className={`relative flex ${isCollapsed ? 'flex-col items-center justify-center p-3 space-y-1' : 'flex-row items-center px-4 py-3 space-x-4'} rounded-xl transition-all duration-300`}
                    style={{
                      background: isActive 
                        ? 'rgba(254, 145, 0, 0.15)'
                        : isHovered 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'transparent',
                      border: isActive 
                        ? '1px solid rgba(254, 145, 0, 0.3)'
                        : '1px solid transparent',
                      backdropFilter: (isActive || isHovered) ? 'blur(20px)' : 'none',
                      boxShadow: isActive 
                        ? '0 4px 20px rgba(254, 145, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                        : 'none'
                    }}
                  >
                    {/* Icon Container */}
                    <div className="relative flex items-center justify-center">
                      {/* Icon Background Glow */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-lg"
                          style={{
                            background: `linear-gradient(135deg, ${item.gradient.split(' ').slice(1).join(' ')})`,
                            opacity: 0.2
                          }}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.2, 0.3, 0.2]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                      
                      <Icon 
                        className={`relative ${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'} transition-all`}
                        style={{
                          color: isActive ? '#FE9100' : isHovered ? '#e9d7c4' : '#9ca3af'
                        }}
                      />
                    </div>

                    {/* Label with Animated Gradient - ALWAYS VISIBLE */}
                    <motion.span
                      className={`relative font-semibold tracking-wide ${isCollapsed ? 'text-[10px]' : 'text-sm'}`}
                      style={{
                        fontFamily: 'Orbitron, sans-serif'
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.span
                        className="inline-block"
                        style={{
                          background: `linear-gradient(90deg, ${item.gradient.split(' ').slice(1).join(' ')})`,
                          backgroundSize: '200% 100%',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      >
                        {item.label}
                      </motion.span>
                    </motion.span>

                    {/* Active Indicator */}
                    {isActive && !isCollapsed && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full"
                        style={{
                          background: `linear-gradient(180deg, ${item.gradient.split(' ').slice(1).join(' ')})`
                        }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {/* Active Dot (collapsed state) */}
                    {isActive && isCollapsed && (
                      <motion.div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{
                          background: '#FE9100',
                          boxShadow: '0 0 8px rgba(254, 145, 0, 0.8)'
                        }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>

                  {/* Tooltip for collapsed state - REMOVED since label is always visible now */}
                </motion.a>
              </motion.div>
            );
          })}
        </nav>
        
        {/* Logout Button */}
        <div className={`${isCollapsed ? 'px-4 pb-6' : 'px-6 pb-8'} border-t border-white/5 pt-4`}>
          <motion.button
            onClick={async () => {
              try {
                await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                window.location.href = '/auth';
              } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/auth';
              }
            }}
            className="relative w-full group"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Hover Glow */}
            <motion.div
              className="absolute -inset-2 rounded-2xl blur-xl opacity-0 group-hover:opacity-40"
              style={{
                background: 'linear-gradient(90deg, #ef4444, #dc2626)'
              }}
            />

            {/* Button Container */}
            <div
              className={`relative flex ${isCollapsed ? 'flex-col items-center justify-center p-3 space-y-1' : 'flex-row items-center px-4 py-3 space-x-4'} rounded-xl transition-all duration-300`}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <LogOut 
                className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'} text-red-400 transition-all`}
              />
              <motion.span
                className={`font-semibold tracking-wide ${isCollapsed ? 'text-[10px]' : 'text-sm'}`}
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(90deg, #ef4444, #dc2626, #ef4444)',
                  backgroundSize: '200% 100%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
              >
                Abmelden
              </motion.span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* ARAS Font */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" 
        rel="stylesheet" 
      />
    </motion.div>
  );
}