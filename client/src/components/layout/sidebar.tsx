import { motion } from "framer-motion";
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
  X
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
      className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen relative flex flex-col bg-black`}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Border Right */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-white/5" />

      {/* Subtle Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#FE9100]"
            style={{
              left: `${20 + i * 15}%`,
              top: `${20 + i * 12}%`,
            }}
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      {/* Logo Section */}
      <div className="relative p-8 pb-6">
        <motion.div 
          className="flex items-center justify-center"
          whileHover={{ scale: 1.03 }}
        >
          <div className="relative">
            <motion.div
              className="absolute -inset-3 rounded-full opacity-0"
              animate={{
                opacity: [0, 0.15, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              style={{
                background: "radial-gradient(circle, #FE9100, transparent 60%)",
              }}
            />
            <img 
              src={arasLogo} 
              alt="ARAS AI" 
              className={`${isCollapsed ? 'w-12 h-12' : 'w-16 h-16'} transition-all duration-300 object-contain relative z-10`}
            />
          </div>
        </motion.div>

        {!isCollapsed && (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4 text-lg font-bold tracking-wider relative"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            <motion.span 
              className="relative inline-block"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                background: "linear-gradient(90deg, #e9d7c4 0%, #FE9100 20%, #a34e00 40%, #FE9100 60%, #e9d7c4 80%, #FE9100 100%)",
                backgroundSize: "300% auto",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              ARAS AI
            </motion.span>
          </motion.h1>
        )}
      </div>

      {/* Toggle Button - Only X Icon */}
      {onToggleCollapse && (
        <div className="px-4 pb-4">
          <motion.button
            onClick={onToggleCollapse}
            className="w-full h-9 rounded-lg bg-white/5 hover:bg-[#FE9100]/10 border border-white/10 hover:border-[#FE9100]/30 flex items-center justify-center transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="w-4 h-4 text-[#FE9100]" />
          </motion.button>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="flex-1 px-4 pt-16 space-y-2.5 relative overflow-y-auto custom-scroll">
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
              {/* ANIMATED GRADIENT BORDER */}
              {(isActive || isHovered) && (
                <div className="absolute -inset-[2px] rounded-xl">
                  <motion.div
                    className="w-full h-full rounded-xl"
                    animate={{
                      background: [
                        "linear-gradient(90deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)",
                        "linear-gradient(90deg, #FE9100 0%, #a34e00 25%, #e9d7c4 50%, #FE9100 75%, #a34e00 100%)",
                        "linear-gradient(90deg, #a34e00 0%, #e9d7c4 25%, #FE9100 50%, #a34e00 75%, #e9d7c4 100%)",
                        "linear-gradient(90deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)",
                      ],
                    }}
                    transition={{
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      padding: "2px",
                      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                </div>
              )}

              <motion.a
                href={item.id === 'space' ? '/app' : `/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4 space-x-3'} py-4 rounded-xl bg-black/60 backdrop-blur-sm transition-all duration-300 ${
                  isActive
                    ? "text-[#FE9100]"
                    : "text-gray-400 hover:text-[#e9d7c4]"
                }`}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                
                {!isCollapsed && (
                  <span className="font-medium text-[13px] tracking-wide">
                    {item.label}
                  </span>
                )}
              </motion.a>
            </motion.div>
          );
        })}
        
        {/* Divider */}
        {!isCollapsed && (
          <div className="relative my-5 h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FE9100]/20 to-transparent" />
          </div>
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
                <div className="absolute -inset-[2px] rounded-xl">
                  <motion.div
                    className="w-full h-full rounded-xl"
                    animate={{
                      background: [
                        "linear-gradient(90deg, #e9d7c4 0%, #FE9100 50%, #a34e00 100%)",
                        "linear-gradient(90deg, #FE9100 0%, #a34e00 50%, #e9d7c4 100%)",
                        "linear-gradient(90deg, #e9d7c4 0%, #FE9100 50%, #a34e00 100%)",
                      ],
                    }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                    style={{
                      padding: "2px",
                      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                </div>
              )}

              <motion.a
                href={`/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4 space-x-3'} py-4 rounded-xl bg-black/60 backdrop-blur-sm text-gray-400 hover:text-[#e9d7c4] transition-all duration-300`}
                whileHover={{ scale: 1.01 }}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-[13px] tracking-wide">
                    {item.label}
                  </span>
                )}
              </motion.a>
            </motion.div>
          );
        })}
      </nav>
      
      {/* Logout */}
      <div className="px-4 pb-5 pt-3 relative">
        <motion.div
          onHoverStart={() => setHoveredItem('logout')}
          onHoverEnd={() => setHoveredItem(null)}
          className="relative"
        >
          {hoveredItem === 'logout' && (
            <div className="absolute -inset-[2px] rounded-xl">
              <div 
                className="w-full h-full rounded-xl"
                style={{
                  padding: "2px",
                  background: "linear-gradient(90deg, #ef4444, #dc2626)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />
            </div>
          )}

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
            className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4 space-x-3'} py-4 rounded-xl bg-black/60 backdrop-blur-sm text-gray-400 hover:text-red-400 transition-all duration-300`}
            whileHover={{ scale: 1.01 }}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!isCollapsed && <span className="font-medium text-[13px]">Logout</span>}
          </motion.button>
        </motion.div>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(254, 145, 0, 0.3);
          border-radius: 3px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(254, 145, 0, 0.5);
        }
      `}</style>
    </motion.div>
  );
}
