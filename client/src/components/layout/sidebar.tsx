import { motion, AnimatePresence } from "framer-motion";
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
import { useState } from "react";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ activeSection, onSectionChange, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems = [
    { id: "space", label: "Space", icon: MessageCircle },
    { id: "power", label: "Power", icon: Phone },
    { id: "leads", label: "Dashboard", icon: LayoutDashboard },
    { id: "billing", label: "Ihr Plan", icon: CreditCard },
    { id: "settings", label: "Einstellungen", icon: Settings },
  ];

  return (
    <motion.div 
      className="relative flex-shrink-0"
      initial={false}
      animate={{ width: isCollapsed ? 72 : 220 }}
      transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
    >
      {/* Clean Background */}
      <div className="absolute inset-0">
        {/* Subtle Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        />

        {/* Subtle Animated Border */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-[1px]"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(254, 145, 0, 0.15), transparent)',
            backgroundSize: '100% 200%'
          }}
          animate={{
            backgroundPosition: ['0% 0%', '0% 100%', '0% 0%']
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Logo Section */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-5' : 'justify-between px-5 py-5'}`}>
          <motion.div
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <img 
              src={arasLogo} 
              alt="ARAS AI" 
              className={`relative ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} transition-all duration-300 object-contain`}
            />
          </motion.div>
          
          {!isCollapsed && onToggleCollapse && (
            <motion.button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-full transition-all"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              whileHover={{ 
                scale: 1.05,
                borderColor: 'rgba(254, 145, 0, 0.2)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-3 h-3 text-gray-500" />
            </motion.button>
          )}
        </div>

        {/* Expand Button (when collapsed) */}
        {isCollapsed && onToggleCollapse && (
          <div className="flex justify-center pb-4">
            <motion.button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-full transition-all"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              whileHover={{ 
                scale: 1.05,
                borderColor: 'rgba(254, 145, 0, 0.2)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-3 h-3 text-gray-500" />
            </motion.button>
          </div>
        )}
        
        {/* Navigation Items - More Centered */}
        <nav className={`flex-1 flex flex-col justify-center ${isCollapsed ? 'px-3' : 'px-4'} -mt-16`}>
          <div className="space-y-3">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const isHovered = hoveredItem === item.id;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                >
                  <motion.a
                    href={item.id === 'space' ? '/app' : `/app/${item.id}`}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="relative block group"
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Wave Border Animation Container */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      {/* Fluid Wave Border */}
                      {(isActive || isHovered) && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: isActive
                              ? `linear-gradient(90deg, 
                                  transparent 0%, 
                                  rgba(254, 145, 0, 0.3) 25%, 
                                  rgba(233, 215, 196, 0.3) 50%, 
                                  rgba(163, 78, 0, 0.3) 75%, 
                                  transparent 100%)`
                              : `linear-gradient(90deg, 
                                  transparent 0%, 
                                  rgba(254, 145, 0, 0.15) 50%, 
                                  transparent 100%)`,
                            backgroundSize: '200% 100%',
                            padding: '1px',
                          }}
                          animate={{
                            backgroundPosition: isActive || isHovered 
                              ? ['200% 0%', '-200% 0%']
                              : '0% 0%'
                          }}
                          transition={{
                            backgroundPosition: {
                              duration: isActive ? 2 : 1.5,
                              repeat: Infinity,
                              ease: 'linear'
                            }
                          }}
                        >
                          {/* Inner transparent background */}
                          <div className="absolute inset-[1px] rounded-full bg-[#0f0f0f]" />
                        </motion.div>
                      )}
                      
                      {/* Default border when not active/hovered */}
                      {!isActive && !isHovered && (
                        <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
                      )}
                    </div>

                    {/* Button Content */}
                    <div
                      className={`relative flex ${isCollapsed ? 'justify-center' : 'items-center'} ${isCollapsed ? 'p-2.5' : 'px-3 py-2'} rounded-full`}
                    >
                      {/* Icon */}
                      <Icon 
                        className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} transition-all`}
                        style={{
                          color: isActive ? '#FE9100' : isHovered ? '#e9d7c4' : '#6b7280'
                        }}
                      />

                      {/* Label - ONLY VISIBLE WHEN OPEN */}
                      {!isCollapsed && (
                        <motion.span
                          className="ml-3 text-[11px] font-medium tracking-wide"
                          style={{
                            fontFamily: 'Orbitron, sans-serif',
                            color: isActive ? '#FE9100' : isHovered ? '#e9d7c4' : '#9ca3af'
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          {item.label}
                        </motion.span>
                      )}

                      {/* Active Dot Indicator */}
                      {isActive && (
                        <motion.div
                          className={`absolute ${isCollapsed ? 'bottom-0.5 left-1/2 -translate-x-1/2' : 'right-2 top-1/2 -translate-y-1/2'} w-1 h-1 rounded-full`}
                          style={{
                            background: '#FE9100',
                          }}
                          animate={{
                            opacity: [0.4, 1, 0.4]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>
                  </motion.a>
                </motion.div>
              );
            })}
          </div>
        </nav>
        
        {/* Logout Button - More Spacing */}
        <div className={`${isCollapsed ? 'px-3 pb-8' : 'px-4 pb-8'} pt-4`}>
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
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {/* Button Container */}
            <motion.div
              className={`relative flex ${isCollapsed ? 'justify-center' : 'items-center'} ${isCollapsed ? 'p-2.5' : 'px-3 py-2'} rounded-full transition-all duration-200`}
              style={{
                background: 'transparent',
                border: '1px solid',
                borderColor: hoveredItem === 'logout'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(239, 68, 68, 0.15)'
              }}
            >
              <LogOut 
                className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} transition-all`}
                style={{
                  color: hoveredItem === 'logout' ? '#ef4444' : '#9b5a5a'
                }}
              />
              
              {/* Label - ONLY VISIBLE WHEN OPEN */}
              {!isCollapsed && (
                <motion.span
                  className="ml-3 text-[11px] font-medium tracking-wide"
                  style={{ 
                    fontFamily: 'Orbitron, sans-serif',
                    color: hoveredItem === 'logout' ? '#ef4444' : '#9b5a5a'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  Abmelden
                </motion.span>
              )}
            </motion.div>
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