import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { probeCapabilities, isCapabilityAvailable } from '@/lib/capabilities/settingsCapabilities';
import type { SubscriptionResponse } from '@shared/schema';
import { 
  User, Shield, Trash2, Key, ChevronRight, 
  CheckCircle, AlertCircle, Loader2, RefreshCw,
  Zap, Clock, MessageSquare
} from 'lucide-react';

// ARAS CI Colors
const CI = {
  orange: '#FE9100',
  goldLight: '#E9D7C4',
  goldDark: '#A34E00',
};

// Section type
type SectionType = 'account' | 'security';

// Error Boundary Fallback
function SettingsErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertCircle className="w-16 h-16 mb-4" style={{ color: CI.orange }} />
      <h2 className="text-xl font-bold mb-2 font-['Orbitron']" style={{ color: CI.goldLight }}>
        Einstellungen konnten nicht geladen werden
      </h2>
      <p className="text-sm mb-6 text-center" style={{ color: `${CI.goldLight}80` }}>
        Bitte versuche es erneut oder kontaktiere den Support.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
          color: '#000',
        }}
      >
        <RefreshCw className="w-4 h-4" />
        Neu laden
      </button>
    </div>
  );
}

// Loading Skeleton
function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="h-4 w-64 rounded bg-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
        <div className="h-12 rounded-xl bg-white/5" />
        <div className="lg:col-span-3 space-y-4">
          <div className="h-32 rounded-2xl bg-white/5" />
          <div className="h-48 rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}

// Glass Panel Component
function GlassPanel({ 
  children, 
  className = '',
  hover = true,
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { scale: 1.005, boxShadow: `0 0 30px ${CI.orange}15` } : undefined}
      className={`p-6 rounded-2xl transition-all ${className}`}
      style={{
        background: 'rgba(0,0,0,0.55)',
        border: `1px solid ${CI.orange}20`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {children}
    </motion.div>
  );
}

// Section Navigation Item
function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
      style={{
        background: active ? `${CI.orange}15` : 'transparent',
        borderLeft: active ? `3px solid ${CI.orange}` : '3px solid transparent',
        color: active ? CI.orange : CI.goldLight,
      }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-sm">{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}

// Toggle Switch
function Toggle({ 
  checked, 
  onChange, 
  disabled = false 
}: { 
  checked: boolean; 
  onChange: (value: boolean) => void; 
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative w-12 h-7 rounded-full transition-all"
      style={{
        background: checked 
          ? `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})` 
          : 'rgba(255,255,255,0.1)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <motion.div
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-5 h-5 rounded-full bg-white"
        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
      />
    </button>
  );
}

// Input Field
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  helper?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-2" style={{ color: CI.goldLight }}>
        {label} {required && <span style={{ color: CI.orange }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none transition-all disabled:opacity-50"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${CI.orange}20`,
        }}
      />
      {helper && (
        <p className="text-xs mt-1" style={{ color: `${CI.goldLight}60` }}>{helper}</p>
      )}
    </div>
  );
}

// Main Settings Page
export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<SectionType>('account');
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({});
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [capabilitiesError, setCapabilitiesError] = useState(false);

  // Dialogs
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form States
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  const [profileDirty, setProfileDirty] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch subscription data
  const { data: subscription } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/user/subscription'],
    enabled: !!user && !authLoading,
  });

  // Probe capabilities on mount
  useEffect(() => {
    async function loadCapabilities() {
      try {
        setCapabilitiesLoading(true);
        setCapabilitiesError(false);
        const results = await probeCapabilities();
        setCapabilities(results);
      } catch {
        setCapabilitiesError(true);
      } finally {
        setCapabilitiesLoading(false);
      }
    }
    if (user) {
      loadCapabilities();
    }
  }, [user]);

  // Initialize profile form from user data
  useEffect(() => {
    if (user) {
      const newForm = {
        username: (user as any).username || '',
        email: (user as any).email || '',
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
      };
      setProfileForm(newForm);
      setProfileDirty(false);
    }
  }, [user]);

  // Update profile mutation
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
        throw new Error(error.message || 'Fehler beim Speichern');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '✅ Profil aktualisiert', description: 'Änderungen wurden gespeichert.' });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setProfileDirty(false);
    },
    onError: (error: Error) => {
      toast({ title: '❌ Fehler', description: error.message, variant: 'destructive' });
    },
  });

  // Change password mutation
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
        throw new Error(error.message || 'Fehler beim Ändern');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '✅ Passwort geändert', description: 'Dein Passwort wurde aktualisiert.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: '❌ Fehler', description: error.message, variant: 'destructive' });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '✅ Account gelöscht', description: 'Auf Wiedersehen!' });
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({ title: '❌ Fehler', description: error.message, variant: 'destructive' });
    },
  });

  // Handle profile form change
  const handleProfileChange = useCallback((key: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [key]: value }));
    setProfileDirty(true);
  }, []);

  // Retry loading capabilities
  const retryCapabilities = useCallback(async () => {
    setCapabilitiesLoading(true);
    setCapabilitiesError(false);
    try {
      const results = await probeCapabilities();
      setCapabilities(results);
    } catch {
      setCapabilitiesError(true);
    } finally {
      setCapabilitiesLoading(false);
    }
  }, []);

  // Loading state
  if (authLoading || capabilitiesLoading) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <SettingsSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (capabilitiesError) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <SettingsErrorFallback onRetry={retryCapabilities} />
        </div>
      </div>
    );
  }

  // Check if core capabilities available
  const hasSubscription = isCapabilityAvailable(capabilities, 'subscription');
  const hasProfile = isCapabilityAvailable(capabilities, 'profile');
  const hasPassword = isCapabilityAvailable(capabilities, 'password');
  const hasDeleteAccount = isCapabilityAvailable(capabilities, 'deleteAccount');

  // Available sections
  const sections = [
    { id: 'account' as SectionType, icon: User, label: 'Konto', available: hasSubscription || hasProfile },
    { id: 'security' as SectionType, icon: Shield, label: 'Sicherheit', available: hasPassword || hasDeleteAccount },
  ].filter(s => s.available);

  // Last sync time
  const lastSync = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 
                className="text-3xl sm:text-4xl font-bold font-['Orbitron']"
                style={{
                  background: `linear-gradient(135deg, ${CI.goldLight}, ${CI.orange})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Einstellungen
              </h1>
              <p className="text-sm mt-2" style={{ color: `${CI.goldLight}80` }}>
                Kontrolle, Zugriff, Sicherheit – alles an einem Ort.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: `${CI.goldLight}60` }}>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
              <span>•</span>
              <span>Synchronisiert: {lastSync}</span>
            </div>
          </div>
        </motion.div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden lg:block">
            <GlassPanel hover={false} className="sticky top-4">
              <nav className="space-y-1">
                {sections.map(section => (
                  <NavItem
                    key={section.id}
                    icon={section.icon}
                    label={section.label}
                    active={activeSection === section.id}
                    onClick={() => setActiveSection(section.id)}
                  />
                ))}
              </nav>
            </GlassPanel>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all"
                style={{
                  background: activeSection === section.id 
                    ? `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})` 
                    : 'rgba(255,255,255,0.05)',
                  color: activeSection === section.id ? '#000' : CI.goldLight,
                  border: `1px solid ${activeSection === section.id ? 'transparent' : `${CI.orange}30`}`,
                }}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {/* ACCOUNT SECTION */}
              {activeSection === 'account' && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Subscription Card */}
                  {hasSubscription && (
                    <GlassPanel>
                      <div className="flex items-center gap-3 mb-6">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${CI.orange}20` }}
                        >
                          <Zap className="w-5 h-5" style={{ color: CI.orange }} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold font-['Orbitron']" style={{ color: CI.goldLight }}>
                            Dein Plan
                          </h2>
                          <p className="text-xs" style={{ color: `${CI.goldLight}60` }}>
                            Aktuelle Nutzung und Limits
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        {[
                          { 
                            icon: CheckCircle, 
                            label: 'Status', 
                            value: subscription?.status === 'active' ? 'Aktiv' : 'Trial',
                            color: subscription?.status === 'active' ? '#22c55e' : CI.orange,
                          },
                          { 
                            icon: Zap, 
                            label: 'Plan', 
                            value: subscription?.plan?.toUpperCase() || 'FREE',
                            color: CI.orange,
                          },
                          { 
                            icon: MessageSquare, 
                            label: 'AI Nachrichten', 
                            value: `${subscription?.aiMessagesUsed || 0} / ${subscription?.aiMessagesLimit || '∞'}`,
                            color: CI.goldLight,
                          },
                        ].map((stat) => (
                          <div 
                            key={stat.label}
                            className="p-4 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${CI.orange}10` }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                              <span className="text-xs" style={{ color: `${CI.goldLight}60` }}>{stat.label}</span>
                            </div>
                            <p className="text-lg font-bold font-['Orbitron']" style={{ color: stat.color }}>
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => window.location.href = '/app/billing'}
                        className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                          color: '#000',
                        }}
                      >
                        Plan upgraden →
                      </button>
                    </GlassPanel>
                  )}

                  {/* Profile Card */}
                  {hasProfile && (
                    <GlassPanel>
                      <div className="flex items-center gap-3 mb-6">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${CI.orange}20` }}
                        >
                          <User className="w-5 h-5" style={{ color: CI.orange }} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold font-['Orbitron']" style={{ color: CI.goldLight }}>
                            Profil bearbeiten
                          </h2>
                          <p className="text-xs" style={{ color: `${CI.goldLight}60` }}>
                            Deine persönlichen Daten
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField
                          label="Benutzername"
                          value={profileForm.username}
                          onChange={(v) => handleProfileChange('username', v)}
                          required
                          disabled={updateProfileMutation.isPending}
                        />
                        <InputField
                          label="Email"
                          value={profileForm.email}
                          onChange={(v) => handleProfileChange('email', v)}
                          type="email"
                          required
                          disabled={updateProfileMutation.isPending}
                        />
                        <InputField
                          label="Vorname"
                          value={profileForm.firstName}
                          onChange={(v) => handleProfileChange('firstName', v)}
                          disabled={updateProfileMutation.isPending}
                        />
                        <InputField
                          label="Nachname"
                          value={profileForm.lastName}
                          onChange={(v) => handleProfileChange('lastName', v)}
                          disabled={updateProfileMutation.isPending}
                        />
                      </div>

                      {profileDirty && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 flex justify-end"
                        >
                          <button
                            onClick={() => updateProfileMutation.mutate(profileForm)}
                            disabled={updateProfileMutation.isPending}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                            style={{
                              background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                              color: '#000',
                            }}
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Speichere...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Änderungen speichern
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </GlassPanel>
                  )}

                  {/* Account Info Card */}
                  <GlassPanel>
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${CI.orange}20` }}
                      >
                        <Clock className="w-5 h-5" style={{ color: CI.orange }} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold font-['Orbitron']" style={{ color: CI.goldLight }}>
                          Kontoinformationen
                        </h2>
                        <p className="text-xs" style={{ color: `${CI.goldLight}60` }}>
                          Was ARAS AI über dein Konto weiß
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      {[
                        { label: 'User ID', value: (user as any)?.id?.slice(0, 8) + '...' || '—' },
                        { label: 'Email', value: (user as any)?.email || '—' },
                        { label: 'Plan', value: subscription?.plan || 'free' },
                        { label: 'Status', value: subscription?.status || 'trial' },
                      ].map(item => (
                        <div key={item.label}>
                          <p className="text-xs mb-1" style={{ color: `${CI.goldLight}60` }}>{item.label}</p>
                          <p className="font-mono text-xs" style={{ color: CI.goldLight }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </GlassPanel>
                </motion.div>
              )}

              {/* SECURITY SECTION */}
              {activeSection === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Password Card */}
                  {hasPassword && (
                    <GlassPanel>
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${CI.orange}20` }}
                        >
                          <Key className="w-5 h-5" style={{ color: CI.orange }} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold font-['Orbitron']" style={{ color: CI.goldLight }}>
                            Passwort ändern
                          </h2>
                          <p className="text-xs" style={{ color: `${CI.goldLight}60` }}>
                            Schütze deinen Account mit einem starken Passwort
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowPasswordDialog(true)}
                        className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                          color: '#000',
                        }}
                      >
                        Passwort ändern
                      </button>
                    </GlassPanel>
                  )}

                  {/* Delete Account Card */}
                  {hasDeleteAccount && (
                    <GlassPanel className="!border-red-500/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(255,0,0,0.1)' }}
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold font-['Orbitron'] text-red-400">
                            Account löschen
                          </h2>
                          <p className="text-xs" style={{ color: `${CI.goldLight}60` }}>
                            ⚠️ Diese Aktion kann nicht rückgängig gemacht werden
                          </p>
                        </div>
                      </div>

                      <p className="text-sm mb-4" style={{ color: `${CI.goldLight}80` }}>
                        Alle deine Daten, Kontakte und Einstellungen werden permanent gelöscht.
                      </p>

                      <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                          color: '#fff',
                        }}
                      >
                        Account löschen
                      </button>
                    </GlassPanel>
                  )}
                </motion.div>
              )}
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
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl"
              style={{
                background: 'rgba(0,0,0,0.95)',
                border: `2px solid ${CI.orange}`,
                boxShadow: `0 0 40px ${CI.orange}40`,
              }}
            >
              <h2 className="text-2xl font-bold mb-6 font-['Orbitron']" style={{ color: CI.goldLight }}>
                Passwort ändern
              </h2>

              <div className="space-y-4">
                <InputField
                  label="Aktuelles Passwort"
                  value={passwordForm.currentPassword}
                  onChange={(v) => setPasswordForm(prev => ({ ...prev, currentPassword: v }))}
                  type="password"
                  required
                  disabled={changePasswordMutation.isPending}
                />
                <InputField
                  label="Neues Passwort"
                  value={passwordForm.newPassword}
                  onChange={(v) => setPasswordForm(prev => ({ ...prev, newPassword: v }))}
                  type="password"
                  required
                  disabled={changePasswordMutation.isPending}
                  helper="Mindestens 8 Zeichen"
                />
                <InputField
                  label="Passwort bestätigen"
                  value={passwordForm.confirmPassword}
                  onChange={(v) => setPasswordForm(prev => ({ ...prev, confirmPassword: v }))}
                  type="password"
                  required
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => changePasswordMutation.mutate(passwordForm)}
                  disabled={changePasswordMutation.isPending}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                    color: '#000',
                  }}
                >
                  {changePasswordMutation.isPending ? 'Ändere...' : 'Passwort ändern'}
                </button>
                <button
                  onClick={() => setShowPasswordDialog(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: CI.goldLight,
                  }}
                >
                  Abbrechen
                </button>
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
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl"
              style={{
                background: 'rgba(20,0,0,0.95)',
                border: '2px solid #ef4444',
                boxShadow: '0 0 40px rgba(239,68,68,0.4)',
              }}
            >
              <h2 className="text-2xl font-bold mb-4 text-red-400 font-['Orbitron']">
                ⚠️ Account löschen?
              </h2>
              <p className="text-sm mb-6" style={{ color: `${CI.goldLight}80` }}>
                Diese Aktion ist <strong>permanent</strong> und kann nicht rückgängig gemacht werden. 
                Alle deine Daten werden unwiederbringlich gelöscht.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => deleteAccountMutation.mutate()}
                  disabled={deleteAccountMutation.isPending}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                    color: '#fff',
                  }}
                >
                  {deleteAccountMutation.isPending ? 'Lösche...' : 'Ja, Account löschen'}
                </button>
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
