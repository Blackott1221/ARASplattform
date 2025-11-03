import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  MessageCircle, 
  Phone, 
  Users, 
  CreditCard, 
  Settings,
  Bot,
  Mail,
  LogOut,
  ChevronRight
} from "lucide-react";
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
    { id: "space", label: "SPACE", icon: MessageCircle },
    { id: "power", label: "POWER", icon: Phone },
    { id: "voice-agents", label: "VOICE AGENTS", icon: Bot },
    { id: "leads", label: "Results", icon: Users },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const mailingModules = [
    { id: "aras-mailing", label: "ARAS Mailing", icon: Mail },
  ];

  return (
    <motion.div 
      className={`${isCollapsed ? 'w-20' : 'w-72'} h-screen bg-[#0f0f0f] border-r border-[#FE9100]/10 flex flex-col relative overflow-hidden transition-all duration-500`}
      animate={{ width: isCollapsed ? 80 : 288 }}
    >
      {/* Animated Stars Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#FE9100] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Logo Section */}
      <div className="relative p-6 border-b border-[#FE9100]/10">
        <motion.div 
          className="flex items-center justify-center relative"
          whileHover={{ scale: 1.05 }}
        >
          {/* Logo Glow */}
          <motion.div
            className="absolute inset-0 blur-2xl opacity-30"
            animate={{
              background: [
                "radial-gradient(circle, #FE9100 0%, transparent 70%)",
                "radial-gradient(circle, #e9d7c4 0%, transparent 70%)",
                "radial-gradient(circle, #FE9100 0%, transparent 70%)",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          
          <img 
            src={arasLogo} 
            alt="ARAS AI" 
            className={`${isCollapsed ? 'w-12 h-12' : 'w-16 h-16'} transition-all duration-500 object-contain relative z-10`}
          />
        </motion.div>

        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-4"
          >
            <h1 
              className="text-2xl font-bold relative"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              <span className="bg-gradient-to-r from-[#e9d7c4] via-[#FE9100] to-[#a34e00] bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                ARAS AI
              </span>
            </h1>
          </motion.div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 relative z-10 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const isHovered = hoveredItem === item.id;
          
          return (
            <motion.div
              key={item.id}
              onHoverStart={() => setHoveredItem(item.id)}
              onHoverEnd={() => setHoveredItem(null)}
              className="relative"
            >
              {/* Animated Border on Hover/Active */}
              <AnimatePresence>
                {(isActive || isHovered) && (
                  <motion.div
                    className="absolute -inset-[1px] rounded-xl opacity-60 blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: isActive ? 0.8 : 0.4,
                      background: [
                        "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)",
                        "linear-gradient(90deg, #FE9100, #a34e00, #e9d7c4, #FE9100)",
                        "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)",
                      ],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{ backgroundSize: "300% 100%" }}
                  />
                )}
              </AnimatePresence>

              <motion.a
                href={item.id === 'space' ? '/app' : `/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-4' : 'space-x-4 px-4'} py-4 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                  isActive
                    ? "bg-[#FE9100]/10 text-[#FE9100]"
                    : "text-[#e9d7c4]/70 hover:text-[#FE9100] hover:bg-white/5"
                }`}
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                
                {!isCollapsed && (
                  <motion.span 
                    className="font-medium text-sm tracking-wide"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}

                {isActive && !isCollapsed && (
                  <motion.div
                    className="absolute right-4 w-2 h-2 rounded-full bg-[#FE9100]"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.a>
            </motion.div>
          );
        })}
        
        {/* Divider */}
        {!isCollapsed && (
          <motion.div 
            className="my-4 h-px bg-gradient-to-r from-transparent via-[#FE9100]/30 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5 }}
          />
        )}

        {/* Mailing Modules */}
        {mailingModules.map((item) => {
          const Icon = item.icon;
          const isHovered = hoveredItem === item.id;
          
          return (
            <motion.div
              key={item.id}
              onHoverStart={() => setHoveredItem(item.id)}
              onHoverEnd={() => setHoveredItem(null)}
              className="relative"
            >
              {isHovered && (
                <motion.div
                  className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#e9d7c4] via-[#FE9100] to-[#a34e00] opacity-40 blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                />
              )}

              <motion.a
                href={`/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-4' : 'space-x-4 px-4'} py-4 rounded-xl text-[#e9d7c4]/70 hover:text-[#FE9100] hover:bg-white/5 backdrop-blur-sm transition-all duration-300`}
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <motion.span 
                    className="font-medium text-sm tracking-wide"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.a>
            </motion.div>
          );
        })}
      </nav>
      
      {/* Logout Section */}
      <div className="p-4 border-t border-[#FE9100]/10 relative z-10">
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
          onHoverStart={() => setHoveredItem('logout')}
          onHoverEnd={() => setHoveredItem(null)}
          className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-4' : 'space-x-4 px-4'} py-4 rounded-xl text-[#e9d7c4]/70 hover:text-red-400 transition-all duration-300 overflow-hidden group`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Hover Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
          
          {hoveredItem === 'logout' && (
            <motion.div
              className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-red-500 to-red-600 opacity-30 blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
            />
          )}

          <LogOut className="w-5 h-5 relative z-10 flex-shrink-0" />
          {!isCollapsed && (
            <span 
              className="relative z-10 font-medium text-sm tracking-wide"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Logout
            </span>
          )}
        </motion.button>
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <motion.button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#0f0f0f] border border-[#FE9100]/20 rounded-r-lg flex items-center justify-center hover:bg-[#FE9100]/10 transition-all z-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-4 h-4 text-[#FE9100]" />
          </motion.div>
        </motion.button>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #FE9100, #a34e00);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #e9d7c4, #FE9100);
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </motion.div>
  );
}
