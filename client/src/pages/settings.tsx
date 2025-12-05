import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { User, SubscriptionResponse } from '@shared/schema';

// ARAS CI Colors
const CI = {
  orange: '#FE9100',
  goldLight: '#E9D7C4',
  goldDark: '#A34E00',
};

// Typing Animation Hook
const useTypingAnimation = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed]);
  
  return displayText;
};

// Tabs
type TabType = 'account' | 'notifications' | 'security' | 'privacy';

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Typing Animation for Title
  const titleText = useTypingAnimation('Einstellungen', 100);
  
  // Form States
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    campaignAlerts: true,
    weeklyReports: false,
    aiSuggestions: true,
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    dataCollection: true,
    analytics: true,
    thirdPartySharing: false,
  });

  // Fetch subscription data
  const { data: subscription } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/user/subscription'],
    enabled: !!user && !authLoading,
  });

  // Fetch usage stats
  const { data: usageStats } = useQuery<any>({
    queryKey: ['/api/user/usage'],
    enabled: !!user && !authLoading,
  });

  const subscriptionData = subscription || {
    plan: 'free',
    status: 'trial',
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: null,
    voiceCallsLimit: null,
    renewalDate: new Date().toISOString(),
    trialMessagesUsed: 0,
    trialEndDate: null,
    hasPaymentMethod: false,
    requiresPaymentSetup: false,
    isTrialActive: false,
    canUpgrade: true,
  } as SubscriptionResponse;

  // Initialize profile form
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: (user as any).username || '',
        email: (user as any).email || '',
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
      });
    }
  }, [user]);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ Profil aktualisiert',
        description: 'Deine Änderungen wurden gespeichert!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to change password');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ Passwort geändert',
        description: 'Dein Passwort wurde erfolgreich aktualisiert!',
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete Account Mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete account');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ Account gelöscht',
        description: 'Dein Account wurde erfolgreich gelöscht.',
      });
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save Notifications
  const saveNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notificationSettings) => {
      const res = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ Benachrichtigungen gespeichert',
        description: 'Deine Einstellungen wurden aktualisiert!',
      });
    },
  });

  // Save Privacy Settings
  const savePrivacyMutation = useMutation({
    mutationFn: async (data: typeof privacySettings) => {
      const res = await fetch('/api/user/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ Datenschutz gespeichert',
        description: 'Deine Einstellungen wurden aktualisiert!',
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 rounded-full"
          style={{
            borderColor: `${CI.orange}40`,
            borderTopColor: CI.orange,
          }}
        />
      </div>
    );
  }

  const tabs = [
    { id: 'account' as TabType, label: 'Konto' },
    { id: 'notifications' as TabType, label: 'Benachrichtigungen' },
    { id: 'security' as TabType, label: 'Sicherheit' },
    { id: 'privacy' as TabType, label: 'Datenschutz' },
  ];

  return (
    <div className="flex h-screen relative overflow-hidden bg-black">
      {/* Video Background - durchscheinend */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/5 via-transparent to-[#E9D7C4]/5" />
      </div>

      <Sidebar
        activeSection="settings"
        onSectionChange={(section) => window.location.href = `/app/${section}`}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar
          currentSection="settings"
          subscriptionData={subscriptionData}
          user={user as any}
          isVisible={true}
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Animated Header */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 
                className="text-6xl font-bold mb-4 font-['Orbitron']"
                style={{
                  background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange}, ${CI.goldDark})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'gradient-shift 3s ease infinite',
                }}
              >
                {titleText}<motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>|</motion.span>
              </h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-lg font-medium"
                style={{ 
                  color: CI.goldLight,
                  textShadow: `0 0 10px ${CI.orange}60`,
                }}
              >
                Verwalte deinen Account • Personalisiere deine Erfahrung
              </motion.p>
            </motion.div>

            {/* Tab Navigation - Ultra Modern */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3 mb-10 overflow-x-auto pb-2 justify-center"
            >
              {tabs.map((tab, idx) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -3,
                    boxShadow: activeTab === tab.id 
                      ? `0 0 30px ${CI.orange}80, 0 0 60px ${CI.orange}40`
                      : `0 0 20px ${CI.orange}40`
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-2xl font-bold text-base whitespace-nowrap transition-all relative overflow-hidden"
                  style={{
                    background: activeTab === tab.id
                      ? `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`
                      : 'rgba(255,255,255,0.03)',
                    color: activeTab === tab.id ? '#000' : CI.goldLight,
                    border: `2px solid ${activeTab === tab.id ? 'transparent' : `${CI.orange}30`}`,
                    boxShadow: activeTab === tab.id 
                      ? `0 0 20px ${CI.orange}60, inset 0 0 20px ${CI.goldDark}40`
                      : 'none',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                        borderRadius: '1rem',
                      }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </motion.button>
              ))}
            </motion.div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {/* ACCOUNT TAB */}
                {activeTab === 'account' && (
                  <div className="space-y-8">
                    {/* Subscription Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02, boxShadow: `0 0 40px ${CI.orange}30` }}
                      className="p-8 rounded-3xl relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, rgba(254,145,0,0.08), rgba(163,78,0,0.05))`,
                        border: `2px solid transparent`,
                        backgroundImage: `
                          linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), 
                          linear-gradient(135deg, ${CI.orange}, ${CI.goldLight})
                        `,
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box',
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <motion.div
                        className="absolute top-0 right-0 w-64 h-64 rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${CI.orange}20, transparent)`,
                        }}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                        }}
                      />
                      
                      <h2 className="text-3xl font-bold mb-6 font-['Orbitron']" style={{ 
                        background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange})`,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        Dein Plan
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[
                          { label: 'Status', value: subscription?.status === 'active' ? 'Aktiv' : 'Trial' },
                          { label: 'Plan', value: subscription?.plan || 'Free' },
                          { label: 'AI Nachrichten', value: `${subscription?.aiMessagesUsed || 0} / ${subscription?.aiMessagesLimit || '∞'}` },
                        ].map((stat, idx) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            whileHover={{ scale: 1.05, y: -5 }}
                            className="p-6 rounded-2xl relative overflow-hidden"
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${CI.orange}20`,
                              backdropFilter: 'blur(10px)',
                            }}
                          >
                            <p className="text-sm mb-2" style={{ color: CI.goldLight }}>
                              {stat.label}
                            </p>
                            <p className="text-2xl font-bold font-['Orbitron']" style={{ 
                              color: CI.orange,
                              textShadow: `0 0 10px ${CI.orange}60`,
                            }}>
                              {stat.value}
                            </p>
                            <motion.div
                              className="absolute bottom-0 left-0 h-1 w-full"
                              style={{ background: `linear-gradient(90deg, ${CI.orange}, ${CI.goldLight})` }}
                              animate={{ scaleX: [0, 1, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                          </motion.div>
                        ))}
                      </div>
                      
                      <motion.button
                        whileHover={{ 
                          scale: 1.03, 
                          boxShadow: `0 0 30px ${CI.orange}80, 0 0 60px ${CI.orange}40`
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => window.location.href = '/app/billing'}
                        className="w-full py-4 rounded-2xl font-bold text-lg font-['Orbitron']"
                        style={{
                          background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                          color: '#000',
                          boxShadow: `0 0 20px ${CI.orange}40`,
                        }}
                      >
                        <motion.span
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          Plan upgraden →
                        </motion.span>
                      </motion.button>
                    </motion.div>

                    {/* Profile Form */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.01, boxShadow: `0 0 40px ${CI.orange}20` }}
                      className="p-8 rounded-3xl"
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: `2px solid ${CI.orange}20`,
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <h2 className="text-3xl font-bold mb-8 font-['Orbitron']" style={{ 
                        background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange})`,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        Profil bearbeiten
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { key: 'username', label: 'Benutzername', type: 'text', required: true },
                          { key: 'email', label: 'Email', type: 'email', required: true },
                          { key: 'firstName', label: 'Vorname', type: 'text', required: false },
                          { key: 'lastName', label: 'Nachname', type: 'text', required: false },
                        ].map((field, idx) => (
                          <motion.div
                            key={field.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * idx }}
                          >
                            <label className="block text-sm font-bold mb-3 font-['Orbitron']" style={{ color: CI.goldLight }}>
                              {field.label} {field.required && <span style={{ color: CI.orange }}>*</span>}
                            </label>
                            <motion.input
                              whileFocus={{ 
                                scale: 1.02,
                                boxShadow: `0 0 20px ${CI.orange}40`,
                              }}
                              type={field.type}
                              value={profileForm[field.key as keyof typeof profileForm]}
                              onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })}
                              className="w-full px-6 py-4 rounded-2xl text-white focus:outline-none transition-all"
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: `2px solid ${CI.orange}20`,
                                backdropFilter: 'blur(10px)',
                              }}
                            />
                          </motion.div>
                        ))}
                      </div>

                      <motion.button
                        whileHover={{ 
                          scale: 1.03, 
                          boxShadow: `0 0 30px ${CI.orange}60`
                        }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => updateProfileMutation.mutate(profileForm)}
                        disabled={updateProfileMutation.isPending}
                        className="mt-8 w-full md:w-auto px-10 py-4 rounded-2xl font-bold text-lg font-['Orbitron']"
                        style={{
                          background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                          color: '#000',
                          opacity: updateProfileMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        {updateProfileMutation.isPending ? 'Speichere...' : 'Änderungen speichern'}
                      </motion.button>
                    </motion.div>
                  </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 rounded-3xl"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      border: `2px solid ${CI.orange}20`,
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <h2 className="text-3xl font-bold mb-8 font-['Orbitron']" style={{ 
                      background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      Benachrichtigungen
                    </h2>

                    <div className="space-y-6">
                      {[
                        { key: 'emailNotifications', label: 'Email-Benachrichtigungen', desc: 'Erhalte Updates per Email' },
                        { key: 'campaignAlerts', label: 'Kampagnen-Alerts', desc: 'Werde über Kampagnen-Events benachrichtigt' },
                        { key: 'weeklyReports', label: 'Wöchentliche Reports', desc: 'Zusammenfassung deiner Aktivitäten' },
                        { key: 'aiSuggestions', label: 'AI-Vorschläge', desc: 'Erhalte intelligente Empfehlungen' },
                      ].map((setting, idx) => (
                        <motion.div
                          key={setting.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="flex items-center justify-between p-6 rounded-2xl"
                          style={{ 
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${CI.orange}15`,
                          }}
                        >
                          <div>
                            <p className="font-bold text-lg font-['Orbitron']" style={{ color: CI.goldLight }}>
                              {setting.label}
                            </p>
                            <p className="text-sm mt-1" style={{ color: `${CI.goldLight}80` }}>
                              {setting.desc}
                            </p>
                          </div>
                          <button
                            onClick={() => setNotificationSettings({
                              ...notificationSettings,
                              [setting.key]: !notificationSettings[setting.key as keyof typeof notificationSettings]
                            })}
                            className="relative w-16 h-9 rounded-full transition-all"
                            style={{
                              background: notificationSettings[setting.key as keyof typeof notificationSettings]
                                ? `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`
                                : 'rgba(255,255,255,0.1)',
                              boxShadow: notificationSettings[setting.key as keyof typeof notificationSettings]
                                ? `0 0 15px ${CI.orange}60`
                                : 'none',
                            }}
                          >
                            <motion.div
                              animate={{
                                x: notificationSettings[setting.key as keyof typeof notificationSettings] ? 28 : 2
                              }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="absolute top-1 w-7 h-7 rounded-full bg-white"
                              style={{
                                boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
                              }}
                            />
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${CI.orange}60` }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => saveNotificationsMutation.mutate(notificationSettings)}
                      disabled={saveNotificationsMutation.isPending}
                      className="mt-8 w-full md:w-auto px-10 py-4 rounded-2xl font-bold text-lg font-['Orbitron']"
                      style={{
                        background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                        color: '#000',
                      }}
                    >
                      {saveNotificationsMutation.isPending ? 'Speichere...' : 'Einstellungen speichern'}
                    </motion.button>
                  </motion.div>
                )}

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                  <div className="space-y-8">
                    {/* Password Change */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.01 }}
                      className="p-8 rounded-3xl"
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: `2px solid ${CI.orange}20`,
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <h2 className="text-3xl font-bold mb-4 font-['Orbitron']" style={{ 
                        background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange})`,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        Passwort ändern
                      </h2>
                      <p className="mb-6 text-lg" style={{ color: `${CI.goldLight}80` }}>
                        Schütze deinen Account mit einem starken Passwort
                      </p>

                      <motion.button
                        whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${CI.orange}60` }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowPasswordDialog(true)}
                        className="px-8 py-4 rounded-2xl font-bold text-lg font-['Orbitron']"
                        style={{
                          background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                          color: '#000',
                        }}
                      >
                        Passwort ändern
                      </motion.button>
                    </motion.div>

                    {/* Delete Account */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      whileHover={{ scale: 1.01 }}
                      className="p-8 rounded-3xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,0,0,0.08), rgba(139,0,0,0.05))',
                        border: `2px solid rgba(255,0,0,0.3)`,
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <h2 className="text-3xl font-bold mb-4 text-red-400 font-['Orbitron']">
                        Account löschen
                      </h2>
                      <p className="mb-6 text-lg" style={{ color: `${CI.goldLight}80` }}>
                        ⚠️ Diese Aktion kann nicht rückgängig gemacht werden! Alle deine Daten werden permanent gelöscht.
                      </p>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowDeleteDialog(true)}
                        className="px-8 py-4 rounded-2xl font-bold text-lg font-['Orbitron']"
                        style={{
                          background: 'linear-gradient(135deg, #ff0000, #8b0000)',
                          color: '#fff',
                        }}
                      >
                        Account endgültig löschen
                      </motion.button>
                    </motion.div>
                  </div>
                )}

                {/* PRIVACY TAB */}
                {activeTab === 'privacy' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 rounded-3xl"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      border: `2px solid ${CI.orange}20`,
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <h2 className="text-3xl font-bold mb-8 font-['Orbitron']" style={{ 
                      background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      Datenschutz
                    </h2>

                    <div className="space-y-6">
                      {[
                        { key: 'dataCollection', label: 'Datensammlung', desc: 'Erlaube ARAS AI, Nutzungsdaten zu sammeln' },
                        { key: 'analytics', label: 'Analytics', desc: 'Hilf uns, ARAS AI zu verbessern' },
                        { key: 'thirdPartySharing', label: 'Drittanbieter', desc: 'Daten mit Partnern teilen' },
                      ].map((setting, idx) => (
                        <motion.div
                          key={setting.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="flex items-center justify-between p-6 rounded-2xl"
                          style={{ 
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${CI.orange}15`,
                          }}
                        >
                          <div>
                            <p className="font-bold text-lg font-['Orbitron']" style={{ color: CI.goldLight }}>
                              {setting.label}
                            </p>
                            <p className="text-sm mt-1" style={{ color: `${CI.goldLight}80` }}>
                              {setting.desc}
                            </p>
                          </div>
                          <button
                            onClick={() => setPrivacySettings({
                              ...privacySettings,
                              [setting.key]: !privacySettings[setting.key as keyof typeof privacySettings]
                            })}
                            className="relative w-16 h-9 rounded-full transition-all"
                            style={{
                              background: privacySettings[setting.key as keyof typeof privacySettings]
                                ? `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`
                                : 'rgba(255,255,255,0.1)',
                              boxShadow: privacySettings[setting.key as keyof typeof privacySettings]
                                ? `0 0 15px ${CI.orange}60`
                                : 'none',
                            }}
                          >
                            <motion.div
                              animate={{
                                x: privacySettings[setting.key as keyof typeof privacySettings] ? 28 : 2
                              }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="absolute top-1 w-7 h-7 rounded-full bg-white"
                            />
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-8 p-6 rounded-2xl"
                      style={{ 
                        background: `linear-gradient(135deg, ${CI.orange}10, ${CI.goldDark}05)`,
                        border: `1px solid ${CI.orange}30`,
                      }}
                    >
                      <p className="text-sm mb-2 font-bold font-['Orbitron']" style={{ color: CI.goldLight }}>
                        🔒 Deine Daten sind sicher
                      </p>
                      <p className="text-sm" style={{ color: `${CI.goldLight}80` }}>
                        Wir verwenden End-to-End-Verschlüsselung und teilen deine Daten niemals ohne deine Zustimmung.
                      </p>
                    </motion.div>

                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${CI.orange}60` }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => savePrivacyMutation.mutate(privacySettings)}
                      disabled={savePrivacyMutation.isPending}
                      className="mt-8 w-full md:w-auto px-10 py-4 rounded-2xl font-bold text-lg font-['Orbitron']"
                      style={{
                        background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                        color: '#000',
                      }}
                    >
                      {savePrivacyMutation.isPending ? 'Speichere...' : 'Einstellungen speichern'}
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Password Change Dialog */}
      <AnimatePresence>
        {showPasswordDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowPasswordDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-8 rounded-3xl"
              style={{
                background: 'rgba(0,0,0,0.95)',
                border: `2px solid ${CI.orange}`,
                boxShadow: `0 0 40px ${CI.orange}60`,
                backdropFilter: 'blur(20px)',
              }}
            >
              <h2 className="text-3xl font-bold mb-6 font-['Orbitron']" style={{ 
                background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Passwort ändern
              </h2>

              <div className="space-y-5">
                {[
                  { key: 'currentPassword', label: 'Aktuelles Passwort' },
                  { key: 'newPassword', label: 'Neues Passwort' },
                  { key: 'confirmPassword', label: 'Passwort bestätigen' },
                ].map((field, idx) => (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                  >
                    <label className="block text-sm font-bold mb-2 font-['Orbitron']" style={{ color: CI.goldLight }}>
                      {field.label}
                    </label>
                    <input
                      type="password"
                      value={passwordForm[field.key as keyof typeof passwordForm]}
                      onChange={(e) => setPasswordForm({ ...passwordForm, [field.key]: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl text-white focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: `2px solid ${CI.orange}30`,
                      }}
                    />
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-4 mt-8">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => changePasswordMutation.mutate(passwordForm)}
                  disabled={changePasswordMutation.isPending}
                  className="flex-1 py-4 rounded-2xl font-bold font-['Orbitron']"
                  style={{
                    background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                    color: '#000',
                  }}
                >
                  {changePasswordMutation.isPending ? 'Ändere...' : 'Passwort ändern'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPasswordDialog(false)}
                  className="flex-1 py-4 rounded-2xl font-bold font-['Orbitron']"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: CI.goldLight,
                  }}
                >
                  Abbrechen
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}
            onClick={() => setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-8 rounded-3xl"
              style={{
                background: 'rgba(20,0,0,0.95)',
                border: '2px solid #ff0000',
                boxShadow: '0 0 40px rgba(255,0,0,0.5)',
              }}
            >
              <h2 className="text-3xl font-bold mb-4 text-red-400 font-['Orbitron']">
                ⚠️ Account löschen?
              </h2>
              <p className="mb-6 text-gray-300">
                Diese Aktion ist <strong>permanent</strong> und kann nicht rückgängig gemacht werden!
                <br /><br />
                Alle deine Daten, Kontakte, Kampagnen und Einstellungen werden unwiederbringlich gelöscht.
              </p>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => deleteAccountMutation.mutate()}
                  disabled={deleteAccountMutation.isPending}
                  className="flex-1 py-4 rounded-2xl font-bold font-['Orbitron']"
                  style={{
                    background: 'linear-gradient(135deg, #ff0000, #8b0000)',
                    color: '#fff',
                  }}
                >
                  {deleteAccountMutation.isPending ? 'Lösche...' : 'Ja, Account löschen'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 py-4 rounded-2xl font-bold font-['Orbitron']"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                >
                  Abbrechen
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS for Gradient Animation */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% {
            filter: hue-rotate(0deg);
          }
          50% {
            filter: hue-rotate(20deg);
          }
        }
      `}</style>
    </div>
  );
}
