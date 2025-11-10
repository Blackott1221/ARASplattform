import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, LogOut, Sparkles, User } from "lucide-react";
import { motion } from "framer-motion";
import type { User as UserType, SubscriptionResponse } from "@shared/schema";
import UsageWidget from "@/components/usage-widget";

interface TopBarProps {
  currentSection: string;
  subscriptionData?: SubscriptionResponse;
  user: UserType | null;
  isVisible: boolean;
}

export function TopBar({ currentSection, subscriptionData, user, isVisible }: TopBarProps) {
  const getSectionTitle = (section: string) => {
    switch (section) {
      case "space":
        return "Space";
      case "power":
        return "Power";
      case "leads":
        return "Dashboard";
      case "billing":
        return "Ihr Plan";
      case "settings":
        return "Einstellungen";
      default:
        return "Space";
    }
  };

  const getUserInitials = (user: UserType | null) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const isPremium = subscriptionData?.plan !== "free" && subscriptionData?.plan !== "starter";

  return (
    <motion.div
      className="h-16 w-full relative overflow-hidden z-40"
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isVisible ? 0 : -64,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
    >
      {/* Ultra-transparent background with blur */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(40px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      />

      {/* Subtle radial glow */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(254, 145, 0, 0.12) 0%, transparent 70%)',
        }}
      />

      {/* Animated bottom border glow */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(254, 145, 0, 0.5), transparent)',
          backgroundSize: '200% 100%'
        }}
        animate={{
          backgroundPosition: ['0% 50%', '200% 50%', '0% 50%']
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      />

      {/* Content Container */}
      <div className="relative h-full flex items-center justify-between px-8 z-10">
        {/* LEFT: Section Title */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="flex items-center gap-4"
        >
          {/* Active indicator dot */}
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              background: '#FE9100',
              boxShadow: '0 0 12px rgba(254, 145, 0, 0.8)'
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Section title with animated gradient */}
          <motion.h1
            className="text-2xl font-black tracking-tight"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
              backgroundSize: '200% 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            {getSectionTitle(currentSection)}
          </motion.h1>
        </motion.div>

        {/* RIGHT: User Controls */}
        <div className="flex items-center gap-3">
          {/* Usage Widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <UsageWidget />
          </motion.div>

          {/* Plan Badge */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            onClick={() => (window.location.href = "/app/billing")}
            className="relative group"
          >
            {/* Animated border for premium */}
            {isPremium && (
              <motion.div
                className="absolute -inset-[1px] rounded-xl opacity-75"
                style={{
                  background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)',
                  backgroundSize: '300% 100%'
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
            )}

            {/* Button container */}
            <div
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300"
              style={{
                background: isPremium 
                  ? 'rgba(254, 145, 0, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isPremium
                  ? '1px solid rgba(254, 145, 0, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                boxShadow: isPremium 
                  ? '0 4px 20px rgba(254, 145, 0, 0.25)'
                  : 'none'
              }}
            >
              {isPremium ? (
                <motion.div
                  animate={{
                    rotate: [0, 5, 0, -5, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Crown className="w-4 h-4 text-[#FE9100]" />
                </motion.div>
              ) : (
                <Sparkles className="w-4 h-4 text-gray-400" />
              )}

              <span 
                className="text-sm font-bold tracking-wide"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: isPremium ? '#FE9100' : '#9ca3af'
                }}
              >
                {subscriptionData?.plan?.toUpperCase() || 'FREE'}
              </span>
            </div>
          </motion.button>

          {/* User Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative group"
          >
            {/* Hover glow */}
            <motion.div
              className="absolute -inset-2 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"
              style={{
                background: 'radial-gradient(circle, rgba(254, 145, 0, 0.4) 0%, transparent 70%)'
              }}
            />

            {/* Avatar button */}
            <button
              className="relative flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Avatar with premium ring */}
              <div className="relative">
                {isPremium && (
                  <motion.div
                    className="absolute -inset-[3px] rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                      backgroundSize: '200% 100%'
                    }}
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      rotate: [0, 360]
                    }}
                    transition={{
                      backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
                      rotate: { duration: 8, repeat: Infinity, ease: 'linear' }
                    }}
                  />
                )}
                <Avatar 
                  className="w-10 h-10 relative"
                  style={{
                    border: '2px solid rgba(0, 0, 0, 0.8)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback 
                    className="text-white text-xs font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #FE9100, #a34e00)'
                    }}
                  >
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* User info */}
              <div className="hidden md:flex flex-col items-start">
                <span 
                  className="text-sm font-semibold text-white leading-tight"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {user?.firstName || user?.username || "User"}
                </span>
                <span className="text-xs text-gray-500 leading-tight">
                  {user?.email?.split("@")[0] || "user"}
                </span>
              </div>
            </button>
          </motion.div>

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await fetch("/api/logout", { method: "POST", credentials: "include" });
                  window.location.href = "/auth";
                } catch (error) {
                  console.error("Logout failed:", error);
                  window.location.href = "/auth";
                }
              }}
              className="relative w-10 h-10 rounded-xl group p-0 transition-all duration-300"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Hover glow */}
              <motion.div
                className="absolute -inset-2 rounded-xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(90deg, #ef4444, #dc2626)'
                }}
              />
              <LogOut className="w-4 h-4 text-red-400 relative z-10 group-hover:scale-110 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Orbitron Font */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" 
        rel="stylesheet" 
      />
    </motion.div>
  );
}