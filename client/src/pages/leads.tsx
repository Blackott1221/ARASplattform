import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Building2, Target, Globe, TrendingUp, Users, 
  Calendar, Clock, RefreshCw,
  Plus, User, Mail, Briefcase, CheckCircle2, AlertCircle,
  Zap, Award, Hash, FileText, Upload,
  XCircle, Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { GradientText } from '@/components/ui/gradient-text';
import type { User as UserType, SubscriptionResponse } from '@shared/schema';

// Import Orbitron font for ARAS branding
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
if (!document.querySelector(`link[href="${fontLink.href}"]`)) {
  document.head.appendChild(fontLink);
}

interface DataSource {
  id: string;
  type: 'document' | 'url' | 'api' | 'custom';
  name: string;
  content: string;
  status: 'active' | 'pending' | 'inactive';
}

export default function Leads() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showAddDataDialog, setShowAddDataDialog] = useState(false);
  const [newDataSource, setNewDataSource] = useState({ type: '', name: '', content: '' });
  const [dataSources, setDataSources] = useState<DataSource[]>([
    { id: '1', type: 'document', name: 'Company Research', content: 'AI-generierte Analyse', status: 'active' },
    { id: '2', type: 'url', name: 'Website Data', content: 'www.' + (typeof window !== 'undefined' ? window.location.hostname : 'aras-ai.com'), status: 'active' },
    { id: '3', type: 'api', name: 'Business Goals', content: 'KPIs & Objectives', status: 'active' }
  ]);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscription data
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/user/subscription'],
    enabled: !!user && !authLoading,
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate AI Summary with Gemini
  const generateAISummary = async () => {
    if (!user) return;
    
    const userProfile = user as UserType;
    setIsLoadingSummary(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          message: `🔥 ARAS AI ULTRA-DEEP INTELLIGENCE REPORT 🔥

User: ${userProfile.firstName} ${userProfile.lastName}
Firma: ${userProfile.company}
Position: ${userProfile.role}
Branche: ${userProfile.industry}
Hauptziel: ${userProfile.primaryGoal}

Als ARAS AI Pro Research™ kenne ich ALLES über ${userProfile.company}:
- ${aiProfile.competitors?.length || 0} Wettbewerber analysiert
- ${aiProfile.effectiveKeywords?.length || 0} relevante Keywords identifiziert
- Company Intelligence: ${aiProfile.companyDescription?.substring(0, 100)}...
- Zielgruppe: ${aiProfile.targetAudience}

Gib mir jetzt eine KRASSE 4-5 Satz Zusammenfassung die ${userProfile.firstName} WOW sagt! Zeige dass du ALLES weißt - CEO, Mitarbeiter, Umsatz, Wettbewerber, Insider-Info. Sei konkret und nutze die echten Daten. Sprich direkt ${userProfile.firstName} mit Namen an und zeige dass ARAS AI sein Business IN- UND AUSWENDIG kennt! 💪🔥`,
          sessionId: 'dashboard-summary-' + Date.now()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.message);
      } else {
        // Fallback summary
        const userProfile = user as UserType;
        const aiProfile = userProfile.aiProfile || {};
        setAiSummary(
          `🔥 Hey ${userProfile.firstName}! Als deine persönliche ARAS AI kenne ich dich und ${userProfile.company} in- und auswendig. ` +
          `Dein Fokus liegt auf ${userProfile.primaryGoal?.replace('_', ' ')} in der ${userProfile.industry} Branche. ` +
          `${userProfile.profileEnriched ? 'Dein AI-Profil ist vollständig optimiert mit ' + (aiProfile.effectiveKeywords?.length || 0) + ' Keywords und ' + (aiProfile.competitors?.length || 0) + ' analysierten Wettbewerbern!' : 'Vervollständige dein Profil für bessere Ergebnisse!'} ` +
          `Ich bin bereit, dir bei allen Sales & Marketing Herausforderungen zu helfen! Let's fucking go! 💪`
        );
      }
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      setAiSummary(`Willkommen zurück, ${userProfile.firstName}! Deine ARAS AI ist bereit für heute.`);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (user) {
      generateAISummary();
      // Refresh every 5 minutes
      const interval = setInterval(generateAISummary, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE9100]" />
      </div>
    );
  }

  const userProfile = user as UserType;
  
  // Parse AI Profile data
  const aiProfile = userProfile.aiProfile || {};
  let companyIntel = null;
  try {
    if (aiProfile.companyDescription) {
      companyIntel = typeof aiProfile.companyDescription === 'string' 
        ? JSON.parse(aiProfile.companyDescription)
        : aiProfile.companyDescription;
    }
  } catch (e) {
    companyIntel = { description: aiProfile.companyDescription };
  }

  // User Profile Data sections
  const profileData = [
    { emoji: '👤', label: 'Name', value: `${userProfile.firstName} ${userProfile.lastName}` },
    { emoji: '📧', label: 'E-Mail', value: userProfile.email || userProfile.username },
    { emoji: '🏢', label: 'Firma', value: userProfile.company },
    { emoji: '💼', label: 'Position', value: userProfile.role },
    { emoji: '🌐', label: 'Branche', value: userProfile.industry },
    { emoji: '🎯', label: 'Hauptziel', value: userProfile.primaryGoal?.replace('_', ' ') },
    { emoji: '#️⃣', label: 'User ID', value: userProfile.id },
  ];

  const businessIntelligence = [
    { 
      label: 'Company Intelligence', 
      value: companyIntel?.description || aiProfile.companyDescription || 'AI-generierte Analyse verfügbar', 
      fullText: true 
    },
    { 
      label: 'Zielgruppe', 
      value: aiProfile.targetAudience || 'Wird analysiert...'
    },
    { 
      label: 'Effektive Keywords', 
      value: aiProfile.effectiveKeywords?.slice(0, 10).join(', ') || 'SEO-Optimierung läuft...', 
      badge: aiProfile.effectiveKeywords?.length || 0
    },
    { 
      label: 'Wettbewerber', 
      value: aiProfile.competitors?.slice(0, 5).join(', ') || 'Marktanalyse läuft...', 
      badge: aiProfile.competitors?.length || 0
    },
    { 
      label: 'Services', 
      value: companyIntel?.services?.join(', ') || aiProfile.services || 'Wird erfasst...'
    },
    { 
      label: 'Business Goals', 
      value: companyIntel?.goals?.join(', ') || 'Strategieentwicklung...'
    }
  ];

  const usageStats = [
    { 
      label: 'AI Nachrichten', 
      value: userProfile.aiMessagesUsed || 0, 
      max: subscriptionData?.aiMessagesLimit || 100, 
      unit: `von ${subscriptionData?.aiMessagesLimit || 100}`,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      label: 'Voice Calls', 
      value: userProfile.voiceCallsUsed || 0, 
      max: subscriptionData?.voiceCallsLimit || 50, 
      unit: `von ${subscriptionData?.voiceCallsLimit || 50}`,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      label: 'Profile Score', 
      value: userProfile.profileEnriched ? 95 : 60, 
      max: 100, 
      unit: '%',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      label: 'Subscription', 
      value: subscriptionData?.plan === 'pro' ? 100 : subscriptionData?.plan === 'ultra' ? 100 : 30, 
      max: 100, 
      unit: subscriptionData?.plan?.toUpperCase() || 'FREE',
      color: 'from-[#FE9100] to-[#a34e00]'
    }
  ];

  const accountStatus = [
    { 
      label: 'Account erstellt', 
      value: userProfile.createdAt ? formatDistanceToNow(new Date(userProfile.createdAt), { locale: de, addSuffix: true }) : 'Unbekannt',
      icon: Calendar
    },
    { 
      label: 'Letztes Update', 
      value: userProfile.updatedAt ? formatDistanceToNow(new Date(userProfile.updatedAt), { locale: de, addSuffix: true }) : 'Nie',
      icon: Clock
    },
    { 
      label: 'Profile Enriched', 
      value: userProfile.profileEnriched ? 'Vollständig' : 'Unvollständig',
      icon: userProfile.profileEnriched ? CheckCircle2 : AlertCircle,
      color: userProfile.profileEnriched ? 'text-green-400' : 'text-yellow-400'
    },
    { 
      label: 'Subscription Status', 
      value: userProfile.subscriptionStatus || 'Active',
      icon: userProfile.subscriptionStatus === 'active' ? CheckCircle2 : XCircle,
      color: userProfile.subscriptionStatus === 'active' ? 'text-green-400' : 'text-red-400'
    }
  ];

  const handleAddDataSource = async () => {
    if (!newDataSource.name || !newDataSource.content) {
      toast({ 
        title: 'Fehler', 
        description: 'Bitte alle Felder ausfüllen', 
        variant: 'destructive' 
      });
      return;
    }

    const newSource: DataSource = {
      id: Date.now().toString(),
      type: (newDataSource.type as DataSource['type']) || 'custom',
      name: newDataSource.name,
      content: newDataSource.content,
      status: 'pending'
    };

    setDataSources([...dataSources, newSource]);
    toast({ 
      title: '✅ Erfolgreich', 
      description: 'Datenquelle wurde hinzugefügt und wird in Ihre AI integriert' 
    });
    setShowAddDataDialog(false);
    setNewDataSource({ type: '', name: '', content: '' });
    generateAISummary(); // Regenerate summary with new data
  };


  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar 
        activeSection="leads"
        onSectionChange={() => {}}
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col">
        <TopBar 
          currentSection="leads"
          user={userProfile}
          subscriptionData={subscriptionData}
          isVisible={true}
        />
        
        <div className="flex-1 overflow-y-auto p-6 premium-scroll">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Premium Header with Live Timestamp */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FE9100]/10 via-transparent to-[#a34e00]/10 animate-pulse" />
              <div className="relative bg-gradient-to-br from-black via-[#0a0a0a] to-black border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 
                      className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] to-[#E9D7C4] mb-3" 
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      INTELLIGENCE DASHBOARD
                    </h1>
                    <div className="flex items-center gap-6 text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#FE9100]" />
                        <span className="text-sm font-medium">
                          {format(currentTime, 'EEEE, dd. MMMM yyyy', { locale: de })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#FE9100]" />
                        <span className="text-sm font-mono font-bold text-white">
                          {format(currentTime, 'HH:mm:ss')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        ARAS AI weiß alles über Sie...
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={generateAISummary}
                    disabled={isLoadingSummary}
                    className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#FE9100]/90 hover:to-[#a34e00]/90 text-white font-bold px-6"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                    Aktualisieren
                  </Button>
                </div>
                
                {/* ARAS AI Live Summary */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-[#FE9100]/5 via-transparent to-[#a34e00]/5 border border-[#FE9100]/30 rounded-2xl p-8 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FE9100]/10 via-transparent to-transparent animate-pulse" />
                  <div className="relative">
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mb-4"
                    >
                      <h3 
                        className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] via-[#E9D7C4] to-[#FE9100] animate-pulse"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        ARAS AI® INTELLIGENCE ANALYSIS
                      </h3>
                    </motion.div>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-white/90 leading-relaxed text-lg font-medium"
                    >
                      {aiSummary || (
                        <span className="italic text-gray-400 animate-pulse">
                          🔥 ARAS AI analysiert Ihre Daten...
                        </span>
                      )}
                    </motion.p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Main Data Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Personal Profile Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-1"
              >
                <Card className="bg-gradient-to-br from-black via-[#0a0a0a] to-black border border-[#FE9100]/20 backdrop-blur-xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/5 via-transparent to-transparent" />
                  <div className="relative p-6">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] to-[#E9D7C4] mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      USER PROFILE
                    </h2>
                  <div className="p-6 space-y-3">
                    {profileData.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.08, type: "spring", stiffness: 100 }}
                        whileHover={{ x: 5, scale: 1.02 }}
                        className="py-4 border-b border-[#FE9100]/10 hover:border-[#FE9100]/30 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{item.emoji}</span>
                            <span className="text-sm font-medium text-gray-400">{item.label}</span>
                          </div>
                          <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 truncate max-w-[180px]">
                            {item.value}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  </div>
                </Card>
              </motion.div>

              {/* Business Intelligence Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2"
              >
                <Card className="bg-gradient-to-br from-black via-[#0a0a0a] to-black border border-[#FE9100]/20 backdrop-blur-xl overflow-hidden h-full relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/5 via-transparent to-transparent" />
                  <div className="relative p-6">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] to-[#E9D7C4] mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      BUSINESS INTELLIGENCE
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {businessIntelligence.map((item, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + idx * 0.1, type: "spring", stiffness: 80 }}
                          whileHover={{ scale: 1.03, y: -5 }}
                          className={`bg-gradient-to-br from-[#FE9100]/5 to-transparent rounded-xl p-5 border border-[#FE9100]/10 hover:border-[#FE9100]/40 transition-all duration-300 cursor-pointer ${item.fullText ? 'md:col-span-2' : ''}`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.6 + idx * 0.1 }}
                              className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] to-[#E9D7C4] uppercase tracking-wider"
                            >
                              {item.label}
                            </motion.p>
                            {item.badge && (
                              <motion.span 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.7 + idx * 0.1, type: "spring" }}
                                className="text-xs px-3 py-1 bg-gradient-to-r from-[#FE9100] to-[#a34e00] text-white rounded-full font-black"
                              >
                                {item.badge}
                              </motion.span>
                            )}
                          </div>
                          <p className={`text-sm text-white/80 ${item.fullText ? 'leading-relaxed' : 'font-medium'} line-clamp-3`}>
                            {item.value}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Usage & Account Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Usage Statistics */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="bg-gradient-to-br from-black via-[#0a0a0a] to-black border border-[#FE9100]/20 backdrop-blur-xl p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/5 via-transparent to-transparent" />
                  <div className="relative">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] to-[#E9D7C4] mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      NUTZUNG
                    </h2>
                  <div className="space-y-5">
                    {usageStats.map((stat, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-400">{stat.label}</span>
                          <span className="text-sm font-bold text-white">
                            {stat.value} {stat.unit}
                          </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((stat.value / stat.max) * 100, 100)}%` }}
                            transition={{ delay: 0.7 + idx * 0.1, duration: 1 }}
                            className={`h-3 bg-gradient-to-r ${stat.color} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                </Card>
              </motion.div>

              {/* Account Status */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card className="bg-gradient-to-br from-black via-[#0a0a0a] to-black border border-[#FE9100]/20 backdrop-blur-xl p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/5 via-transparent to-transparent" />
                  <div className="relative">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] to-[#E9D7C4] mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      ACCOUNT STATUS
                    </h2>
                  <div className="space-y-4">
                    {accountStatus.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75 + idx * 0.1, type: "spring" }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FE9100]/5 to-transparent rounded-lg border border-[#FE9100]/10 hover:border-[#FE9100]/30 transition-all cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-300">{item.label}</span>
                        <span className={`text-sm font-bold ${item.color || 'text-white'}`}>
                          {item.value}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Data Sources Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="bg-gradient-to-br from-black via-[#0a0a0a] to-black border border-[#FE9100]/20 backdrop-blur-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/5 via-transparent to-transparent" />
                <div className="relative p-6 border-b border-[#FE9100]/20">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FE9100] to-[#E9D7C4]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      DATENQUELLEN
                    </h2>
                    <Button
                      onClick={() => setShowAddDataDialog(true)}
                      className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#FE9100]/90 hover:to-[#a34e00]/90"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Datenquelle hinzufügen
                    </Button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dataSources.map((source) => (
                      <motion.div
                        key={source.id}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className={`bg-gradient-to-br ${
                          source.type === 'document' ? 'from-[#FE9100]/10 to-[#a34e00]/10 border-[#FE9100]/30' :
                          source.type === 'url' ? 'from-purple-600/10 to-purple-900/10 border-purple-600/30' :
                          source.type === 'api' ? 'from-blue-600/10 to-blue-900/10 border-blue-600/30' :
                          'from-green-600/10 to-green-900/10 border-green-600/30'
                        } border rounded-xl p-5 cursor-pointer hover:border-opacity-50 transition-all`}
                      >
                        {
                          source.type === 'document' ? <FileText className="w-10 h-10 text-[#FE9100] mb-3" /> :
                          source.type === 'url' ? <Globe className="w-10 h-10 text-purple-400 mb-3" /> :
                          source.type === 'api' ? <Server className="w-10 h-10 text-blue-400 mb-3" /> :
                          <span className="text-5xl mb-3">💾</span>
                        }
                        <h3 className="text-sm font-bold text-white mb-1">{source.name}</h3>
                        <p className="text-xs text-gray-400">{source.content}</p>
                        <div className="mt-3 flex items-center gap-2">
                          {source.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                              <span className="text-xs text-green-400">Aktiv</span>
                            </>
                          ) : source.status === 'pending' ? (
                            <>
                              <Clock className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400">Verarbeitung...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">Inaktiv</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Add New Button */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      onClick={() => setShowAddDataDialog(true)}
                      className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-2 border-dashed border-white/10 rounded-xl p-5 cursor-pointer hover:border-[#FE9100]/50 transition-all flex flex-col items-center justify-center min-h-[160px]"
                    >
                      <Plus className="w-10 h-10 text-gray-500 mb-2" />
                      <p className="text-sm text-gray-500">Neue Quelle</p>
                    </motion.div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add Data Source Dialog */}
      <Dialog open={showAddDataDialog} onOpenChange={setShowAddDataDialog}>
        <DialogContent className="bg-black/95 border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Datenquelle hinzufügen
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Fügen Sie neue Informationen hinzu, um ARAS AI zu verbessern
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Typ</label>
              <select 
                value={newDataSource.type}
                onChange={(e) => setNewDataSource({...newDataSource, type: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#FE9100] focus:outline-none"
              >
                <option value="" className="bg-black">Wählen Sie einen Typ</option>
                <option value="document" className="bg-black">Dokument</option>
                <option value="url" className="bg-black">Website URL</option>
                <option value="api" className="bg-black">API Endpoint</option>
                <option value="custom" className="bg-black">Eigene Daten</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Name</label>
              <Input
                value={newDataSource.name}
                onChange={(e) => setNewDataSource({...newDataSource, name: e.target.value})}
                placeholder="z.B. Produktkatalog 2025"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Inhalt / URL</label>
              <Textarea
                value={newDataSource.content}
                onChange={(e) => setNewDataSource({...newDataSource, content: e.target.value})}
                placeholder="Fügen Sie hier Ihre Daten ein oder geben Sie eine URL an..."
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDataDialog(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAddDataSource}
                className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#FE9100]/90 hover:to-[#a34e00]/90"
              >
                <Upload className="w-4 h-4 mr-2" />
                Hinzufügen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Scrollbar Styles */}
      <style>{`
        .premium-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .premium-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .premium-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #FE9100, #A34E00);
          border-radius: 4px;
        }
        .premium-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #FE9100, #A34E00);
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
