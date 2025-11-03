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
      className={`${isCollapsed ? 'w-20' : 'w-60'} h-screen bg-transparent backdrop-blur-xl border-r border-white/5 flex flex-col relative`}
      animate={{ width: isCollapsed ? 80 : 240 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Ultra Subtle Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${15 + i * 12}%`,
              background: "radial-gradient(circle, #FE9100 0%, transparent 70%)",
            }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      {/* Logo Section */}
      <div className="relative p-5">
        <motion.div 
          className="flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative">
            <motion.div
              className="absolute -inset-2 rounded-full opacity-0"
              animate={{
                opacity: [0, 0.15, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              style={{
                background: "radial-gradient(circle, #FE9100, transparent 70%)",
              }}
            />
            <img 
              src={arasLogo} 
              alt="ARAS AI" 
              className={`${isCollapsed ? 'w-9 h-9' : 'w-10 h-10'} transition-all duration-300 object-contain relative z-10`}
            />
          </div>
        </motion.div>

        {!isCollapsed && (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-3 text-base font-bold tracking-wider relative"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {/* Animated Gradient Text */}
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
                background: "linear-gradient(90deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)",
                backgroundSize: "200% auto",
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
      
      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-1 space-y-1 relative overflow-y-auto custom-scroll">
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
              {/* Animated Gradient Border - ONLY BORDER, NO BACKGROUND */}
              {(isActive || isHovered) && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: "1px",
                    background: "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #e9d7c4)",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: [
                        "linear-gradient(90deg, #e9d7c4 0%, #FE9100 50%, #a34e00 100%)",
                        "linear-gradient(90deg, #FE9100 0%, #a34e00 50%, #e9d7c4 100%)",
                        "linear-gradient(90deg, #e9d7c4 0%, #FE9100 50%, #a34e00 100%)",
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.div>
              )}

              <motion.a
                href={item.id === 'space' ? '/app' : `/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-2.5' : 'px-3 space-x-3'} py-2 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "text-[#FE9100]"
                    : "text-gray-400 hover:text-[#e9d7c4]"
                }`}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <Icon className="w-[17px] h-[17px]" />
                
                {!isCollapsed && (
                  <span className="font-medium text-[12px] tracking-wide">
                    {item.label}
                  </span>
                )}
              </motion.a>
            </motion.div>
          );
        })}
        
        {/* Elegant Divider */}
        {!isCollapsed && (
          <motion.div 
            className="relative my-3 h-px"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FE9100]/20 to-transparent" />
          </motion.div>
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
                  className="absolute inset-0 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    padding: "1px",
                    background: "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: [
                        "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)",
                        "linear-gradient(90deg, #FE9100, #a34e00, #e9d7c4)",
                        "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              )}

              <motion.a
                href={`/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-2.5' : 'px-3 space-x-3'} py-2 rounded-lg text-gray-400 hover:text-[#e9d7c4] transition-all duration-300`}
                whileHover={{ scale: 1.01 }}
              >
                <Icon className="w-[17px] h-[17px]" />
                {!isCollapsed && (
                  <span className="font-medium text-[12px] tracking-wide">
                    {item.label}
                  </span>
                )}
              </motion.a>
            </motion.div>
          );
        })}
      </nav>
      
      {/* Logout */}
      <div className="px-2.5 pb-3 relative">
        <motion.div
          onHoverStart={() => setHoveredItem('logout')}
          onHoverEnd={() => setHoveredItem(null)}
          className="relative"
        >
          {hoveredItem === 'logout' && (
            <motion.div
              className="absolute inset-0 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: "1px",
                background: "linear-gradient(90deg, #ef4444, #dc2626)",
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />
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
            className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-2.5' : 'px-3 space-x-3'} py-2 rounded-lg text-gray-400 hover:text-red-400 transition-all duration-300`}
            whileHover={{ scale: 1.01 }}
          >
            <LogOut className="w-[17px] h-[17px]" />
            {!isCollapsed && <span className="font-medium text-[12px]">Logout</span>}
          </motion.button>
        </motion.div>
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-14 w-6 h-6 bg-black/50 backdrop-blur-sm border border-[#FE9100]/20 rounded-full flex items-center justify-center hover:bg-[#FE9100]/10 hover:border-[#FE9100]/40 transition-all"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-3 h-3 text-[#FE9100]" />
          </motion.div>
        </button>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(254, 145, 0, 0.2);
          border-radius: 2px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(254, 145, 0, 0.4);
        }
      `}</style>
    </motion.div>
  );
}
