import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, LogOut, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { User, SubscriptionResponse } from "@shared/schema";

interface TopBarProps {
  currentSection: string;
  subscriptionData?: SubscriptionResponse;
  user: User | null;
}

export function TopBar({ currentSection, subscriptionData, user }: TopBarProps) {
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
      className="h-20 bg-black border-b border-white/5 flex items-center justify-between px-8 relative overflow-hidden"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Subtle Background Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px rounded-full bg-[#FE9100]"
            style={{
              left: `${25 + i * 20}%`,
              top: `${30 + i * 15}%`,
            }}
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      {/* Left Section - Title */}
      <div className="flex items-center space-x-4 relative z-10">
        <motion.h1
          className="text-2xl font-bold tracking-wider"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
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
            {getSectionTitle(currentSection)}
          </motion.span>
        </motion.h1>
      </div>

      {/* Right Section - User Info */}
      <div className="flex items-center space-x-4 relative z-10">
        {/* Plan Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          {/* Animated Glow Border */}
          <div className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.div
              className="w-full h-full rounded-xl"
              animate={{
                background: isPremium 
                  ? [
                      "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)",
                      "linear-gradient(90deg, #FE9100, #a34e00, #e9d7c4)",
                      "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)",
                    ]
                  : "linear-gradient(90deg, #4b5563, #6b7280, #4b5563)",
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

          <div className="relative flex items-center space-x-2 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
            {isPremium ? (
              <Crown className="w-4 h-4 text-[#FE9100]" />
            ) : (
              <Sparkles className="w-4 h-4 text-gray-400" />
            )}
            <span className={`text-sm font-medium ${
              isPremium ? 'text-[#FE9100]' : 'text-gray-400'
            }`}>
              {subscriptionData?.status === "trial" || subscriptionData?.status === "trialing" 
                ? "Free Trial" 
                : subscriptionData?.plan 
                  ? subscriptionData.plan.charAt(0).toUpperCase() + subscriptionData.plan.slice(1)
                  : 'Free'
              }
            </span>
          </div>
        </motion.div>

        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
        >
          {/* Avatar with Ring */}
          <div className="relative">
            <motion.div
              className="absolute -inset-[2px] rounded-full"
              animate={{
                background: [
                  "linear-gradient(90deg, #e9d7c4, #FE9100)",
                  "linear-gradient(90deg, #FE9100, #a34e00)",
                  "linear-gradient(90deg, #e9d7c4, #FE9100)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <Avatar className="w-9 h-9 relative border-2 border-black">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[#FE9100] to-[#a34e00] text-white text-xs font-bold">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* User Name */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
              {user?.firstName || user?.username || 'User'}
            </span>
            <span className="text-xs text-gray-500">
              {user?.email?.split('@')[0] || 'user'}
            </span>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
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
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all p-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
