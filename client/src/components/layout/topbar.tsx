import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, LogOut, Sparkles, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import type { User, SubscriptionResponse } from "@shared/schema";

interface TopBarProps {
  currentSection: string;
  subscriptionData?: SubscriptionResponse;
  user: User | null;
  isVisible: boolean;
}

export function TopBar({ currentSection, subscriptionData, user, isVisible }: TopBarProps) {
  const getSectionTitle = (section: string) => {
    switch (section) {
      case "space":
        return "SPACE";
      case "power":
        return "POWER";
      case "voice-agents":
        return "VOICE AGENTS";
      case "leads":
        return "RESULTS";
      case "billing":
        return "BILLING";
      case "settings":
        return "SETTINGS";
      case "aras-mailing":
        return "ARAS MAILING";
      default:
        return "SPACE";
    }
  };

  const getUserInitials = (user: User | null) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const isPremium = subscriptionData?.plan !== 'free' && subscriptionData?.plan !== 'starter';

  return (
    <motion.div 
      className="h-12 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 relative"
      initial={{ y: 0, opacity: 1 }}
      animate={{ 
        y: isVisible ? 0 : -48,
        opacity: isVisible ? 1 : 0
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Ultra Subtle Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FE9100]/[0.02] to-transparent opacity-50" />
      
      {/* Ambient Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-[#FE9100]/5 blur-[80px] pointer-events-none" />

      {/* Left Section - Greeting & Section */}
      <div className="flex items-center space-x-4 relative z-10">
        {/* User Greeting */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col"
        >
          <span className="text-[10px] text-gray-500 font-medium tracking-wide leading-tight">
            Welcome back,
          </span>
          <span className="text-xs font-semibold text-white leading-tight">
            {user?.firstName || user?.username || 'User'} 👋
          </span>
        </motion.div>

        {/* Subtle Divider */}
        <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center space-x-1.5"
        >
          <div className="w-1 h-1 rounded-full bg-[#FE9100] animate-pulse" />
          <h2 
            className="text-xs font-bold tracking-widest"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
              {getSectionTitle(currentSection)}
            </span>
          </h2>
        </motion.div>
      </div>

      {/* Right Section - Plan & User Controls */}
      <div className="flex items-center space-x-2 relative z-10">
        {/* Premium Plan Badge - CLICKABLE zu /billing */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => window.location.href = '/billing'}
          className="relative group cursor-pointer"
        >
          {/* Animated Border */}
          {isPremium && (
            <div className="absolute -inset-[1px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <motion.div
                className="w-full h-full rounded-md"
                animate={{
                  background: [
                    "linear-gradient(90deg, #FE9100 0%, #a34e00 50%, #FE9100 100%)",
                    "linear-gradient(90deg, #a34e00 0%, #FE9100 50%, #a34e00 100%)",
                    "linear-gradient(90deg, #FE9100 0%, #a34e00 50%, #FE9100 100%)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{
                  padding: "1px",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />
            </div>
          )}

          <div className={`relative flex items-center space-x-1.5 px-2 py-1 rounded-md backdrop-blur-sm transition-all duration-300 ${
            isPremium 
              ? 'bg-gradient-to-r from-[#FE9100]/10 to-[#a34e00]/10 border border-[#FE9100]/20 group-hover:from-[#FE9100]/15 group-hover:to-[#a34e00]/15'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}>
            {isPremium ? (
              <motion.div
                animate={{ 
                  rotate: [0, 5, 0, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Crown className="w-3 h-3 text-[#FE9100]" />
              </motion.div>
            ) : (
              <Sparkles className="w-3 h-3 text-gray-500" />
            )}
            <span className={`text-[10px] font-semibold tracking-wider ${
              isPremium ? 'text-[#FE9100]' : 'text-gray-400'
            }`}>
              {subscriptionData?.status === "trial" || subscriptionData?.status === "trialing" 
                ? "TRIAL" 
                : subscriptionData?.plan 
                  ? subscriptionData.plan.toUpperCase()
                  : 'FREE'
              }
            </span>
          </div>
        </motion.button>

        {/* User Profile Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="relative group"
        >
          {/* Hover Glow */}
          <div className="absolute -inset-[1px] rounded-md bg-gradient-to-r from-[#FE9100]/0 via-[#FE9100]/20 to-[#FE9100]/0 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
          
          <button className="relative flex items-center space-x-2 bg-white/5 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
            {/* Avatar with Premium Ring */}
            <div className="relative">
              {/* Animated Ring for Premium Users */}
              {isPremium && (
                <motion.div
                  className="absolute -inset-[2px] rounded-full"
                  animate={{
                    background: [
                      "linear-gradient(0deg, #FE9100, #a34e00)",
                      "linear-gradient(180deg, #a34e00, #FE9100)",
                      "linear-gradient(360deg, #FE9100, #a34e00)",
                    ],
                    rotate: [0, 360],
                  }}
                  transition={{ 
                    background: { duration: 3, repeat: Infinity },
                    rotate: { duration: 8, repeat: Infinity, ease: "linear" }
                  }}
                />
              )}
              <Avatar className="w-6 h-6 relative border-2 border-black">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[#FE9100] to-[#a34e00] text-white text-[9px] font-bold">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* User Name */}
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-semibold text-white leading-tight">
                {user?.firstName || user?.username || 'User'}
              </span>
              <span className="text-[9px] text-gray-500 leading-tight">
                {user?.email?.split('@')[0] || 'user'}
              </span>
            </div>

            {/* Dropdown Icon */}
            <ChevronDown className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-300 transition-colors" />
          </button>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                window.location.href = '/auth';
              } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/auth';
              }
            }}
            className="w-7 h-7 rounded-md bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all duration-300 p-0 group"
          >
            <LogOut className="w-3 h-3 group-hover:scale-110 transition-transform" />
          </Button>
        </motion.div>
      </div>

      {/* Bottom Glow Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px">
        <motion.div 
          className="h-full bg-gradient-to-r from-transparent via-[#FE9100]/30 to-transparent"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    </motion.div>
  );
}
