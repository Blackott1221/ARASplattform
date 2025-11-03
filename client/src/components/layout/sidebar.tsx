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
      className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-transparent backdrop-blur-xl border-r border-white/5 flex flex-col relative`}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Ultra Subtle Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px rounded-full"
            style={{
              left: `${15 + i * 12}%`,
              top: `${10 + i * 11}%`,
              background: "radial-gradient(circle, #FE9100 0%, transparent 70%)",
            }}
            animate={{
              opacity: [0, 0.4, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Logo Section */}
      <div className="relative p-6">
        <motion.div 
          className="flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative">
            {/* Logo Glow Ring */}
            <motion.div
              className="absolute -inset-2 rounded-full opacity-0"
              animate={{
                opacity: [0, 0.2, 0],
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
              className={`${isCollapsed ? 'w-10 h-10' : 'w-11 h-11'} transition-all duration-300 object-contain relative z-10`}
            />
          </div>
        </motion.div>

        {!isCollapsed && (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-3 text-lg font-bold tracking-wide"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            <span className="bg-gradient-to-r from-[#e9d7c4] via-[#FE9100] to-[#e9d7c4] bg-clip-text text-transparent">
              ARAS AI
            </span>
          </motion.h1>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 relative overflow-y-auto custom-scroll">
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
              {/* Animated Gradient Border */}
              {(isActive || isHovered) && (
                <motion.div
                  className="absolute inset-0 rounded-xl p-[1px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-xl"
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
                    style={{
                      WebkitMaskImage: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      padding: "1px",
                    }}
                  />
                </motion.div>
              )}

              <motion.a
                href={item.id === 'space' ? '/app' : `/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4 space-x-3'} py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-[#FE9100]/5 to-[#a34e00]/5 text-[#FE9100]"
                    : "text-gray-400 hover:text-[#e9d7c4]"
                }`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Icon className="w-[18px] h-[18px]" />
                
                {!isCollapsed && (
                  <span className="font-medium text-[13px] tracking-wide">
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
            className="relative my-4 h-px"
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
                  className="absolute inset-0 rounded-xl p-[1px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    animate={{
                      background: [
                        "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)",
                        "linear-gradient(90deg, #FE9100, #a34e00, #e9d7c4)",
                        "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{
                      WebkitMaskImage: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      padding: "1px",
                    }}
                  />
                </motion.div>
              )}

              <motion.a
                href={`/app/${item.id}`}
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4 space-x-3'} py-3 rounded-xl text-gray-400 hover:text-[#e9d7c4] transition-all duration-300`}
                whileHover={{ scale: 1.02 }}
              >
                <Icon className="w-[18px] h-[18px]" />
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
      <div className="px-3 pb-4 relative">
        <motion.div
          onHoverStart={() => setHoveredItem('logout')}
          onHoverEnd={() => setHoveredItem(null)}
          className="relative"
        >
          {hoveredItem === 'logout' && (
            <motion.div
              className="absolute inset-0 rounded-xl p-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/50 to-red-600/50" 
                style={{
                  WebkitMaskImage: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "1px",
                }}
              />
            </motion.div>
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
            className={`relative w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4 space-x-3'} py-3 rounded-xl text-gray-400 hover:text-red-400 transition-all duration-300`}
            whileHover={{ scale: 1.02 }}
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!isCollapsed && <span className="font-medium text-[13px]">Logout</span>}
          </motion.button>
        </motion.div>
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-16 w-6 h-6 bg-black/50 backdrop-blur-sm border border-[#FE9100]/20 rounded-full flex items-center justify-center hover:bg-[#FE9100]/10 hover:border-[#FE9100]/40 transition-all"
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
