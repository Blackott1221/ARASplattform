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
  XCircle, Server, Edit2, Save, X, ChevronDown, ChevronUp,
  Eye, EyeOff, Copy, ExternalLink, Sparkles, Phone, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { GradientText } from '@/components/ui/gradient-text';
import type { User as UserType, SubscriptionResponse } from '@shared/schema';

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
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [marketIntel, setMarketIntel] = useState<any>(null);
  const [growthOpportunities, setGrowthOpportunities] = useState<any[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [newDataSource, setNewDataSource] = useState({ type: '', name: '', content: '' });
  const [dataSources, setDataSources] = useState<DataSource[]>([
    { id: '1', type: 'document', name: 'Company Research', content: 'AI-generierte Analyse', status: 'active' },
    { id: '2', type: 'url', name: 'Website Data', content: 'www.' + (typeof window !== 'undefined' ? window.location.hostname : 'aras-ai.com'), status: 'active' },
    { id: '3', type: 'api', name: 'Business Goals', content: 'KPIs & Objectives', status: 'active' }
  ]);
  
  // Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    profile: true,
    business: true,
    usage: true,
    account: true,
    personal: true,
    sources: true
  });
  
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/user/subscription'],
    enabled: !!user && !authLoading,
  });

  // Update time every second with correct local timezone
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };
    
    // Initial update
    updateTime();
    
    // Update every second
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔥 GEMINI LIVE INTELLIGENCE ENGINE
  const generateLiveIntelligence = async () => {
    if (!user) return;
    
    setIsLoadingInsights(true);
    
    try {
      const userProfile = user as UserType;
      const aiProfile = userProfile.aiProfile || {};
      
      // Generate multiple AI insights in parallel
      const insightsPrompt = `Analyze this business and provide 5 HIGH-IMPACT actionable insights:

Company: ${userProfile.company}
Industry: ${userProfile.industry}
Role: ${userProfile.role}
Goal: ${userProfile.primaryGoal}
Context: ${aiProfile.companyDescription || 'Technology company'}

Provide insights about:
1. Market positioning
2. Growth opportunities
3. Competitive advantages
4. Risk factors
5. Strategic recommendations

Format as JSON array with: { "type": "opportunity|risk|strategy", "title": "...", "description": "...", "priority": "high|medium|low", "impact": "revenue|efficiency|market" }`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: insightsPrompt,
          sessionId: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        try {
          // Try to extract JSON from response
          const jsonMatch = data.message.match(/\[\s*{[\s\S]*}\s*\]/);
          if (jsonMatch) {
            const insights = JSON.parse(jsonMatch[0]);
            setAiInsights(insights);
          }
        } catch (e) {
          console.log('Could not parse insights JSON, using text');
          // Fallback: create insights from text
          setAiInsights([
            { type: 'strategy', title: 'AI Analysis Ready', description: data.message.slice(0, 200), priority: 'high', impact: 'revenue' }
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to generate live intelligence:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const generateAISummary = async () => {
    if (!user) return;
    
    setIsLoadingSummary(true);
    
    try {
      const userProfile = user as UserType;
      const aiProfile = userProfile.aiProfile || {};
      
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
      const userProfile = user as UserType;
      setAiSummary(`Willkommen zurück, ${userProfile.firstName}! Deine ARAS AI ist bereit für heute.`);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (user) {
      generateAISummary();
      generateLiveIntelligence();
      const summaryInterval = setInterval(generateAISummary, 5 * 60 * 1000);
      const insightsInterval = setInterval(generateLiveIntelligence, 10 * 60 * 1000);
      return () => {
        clearInterval(summaryInterval);
        clearInterval(insightsInterval);
      };
    }
  }, [user]);

  if (!user || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-16 h-16 border-4 border-[#FE9100] border-t-transparent rounded-full" />
        </motion.div>
      </div>
    );
  }

  const userProfile = user as UserType;
  
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

  const profileData = [
    { icon: User, label: 'Name', value: `${userProfile.firstName} ${userProfile.lastName}`, key: 'name', editable: true },
    { icon: Mail, label: 'E-Mail', value: userProfile.email || userProfile.username, key: 'email', editable: false },
    { icon: Building2, label: 'Company', value: userProfile.company, key: 'company', editable: true },
    { icon: Briefcase, label: 'Position', value: userProfile.role, key: 'role', editable: true },
    { icon: Target, label: 'Industry', value: userProfile.industry, key: 'industry', editable: true },
    { icon: Zap, label: 'Primary Goal', value: userProfile.primaryGoal?.replace('_', ' '), key: 'primaryGoal', editable: true },
    { icon: Hash, label: 'User ID', value: userProfile.id, key: 'id', editable: false },
  ];

  const businessIntelligence = [
    { 
      label: 'Company Intelligence', 
      value: companyIntel?.description || aiProfile.companyDescription || 'AI-generierte Analyse verfügbar', 
      fullText: true,
      expandable: true
    },
    { 
      label: 'Target Audience', 
      value: aiProfile.targetAudience || 'Analyzing...',
      expandable: true
    },
    { 
      label: 'Effective Keywords', 
      value: aiProfile.effectiveKeywords?.slice(0, 10).join(', ') || 'SEO optimization running...', 
      badge: aiProfile.effectiveKeywords?.length || 0,
      expandable: true,
      fullData: aiProfile.effectiveKeywords
    },
    { 
      label: 'Competitors', 
      value: aiProfile.competitors?.slice(0, 5).join(', ') || 'Market analysis running...', 
      badge: aiProfile.competitors?.length || 0,
      expandable: true,
      fullData: aiProfile.competitors
    },
    { 
      label: 'Services', 
      value: companyIntel?.services?.join(', ') || aiProfile.services || 'Being captured...',
      expandable: true
    },
    { 
      label: 'Business Goals', 
      value: companyIntel?.goals?.join(', ') || 'Strategy development...',
      expandable: true
    }
  ];

  const usageStats = [
    { 
      label: 'AI Messages', 
      value: userProfile.aiMessagesUsed || 0, 
      max: subscriptionData?.aiMessagesLimit || 100, 
      unit: `/ ${subscriptionData?.aiMessagesLimit || 100}`,
      color: 'from-blue-500 to-cyan-500',
      icon: Sparkles
    },
    { 
      label: 'Voice Calls', 
      value: userProfile.voiceCallsUsed || 0, 
      max: subscriptionData?.voiceCallsLimit || 50, 
      unit: `/ ${subscriptionData?.voiceCallsLimit || 50}`,
      color: 'from-purple-500 to-pink-500',
      icon: Phone
    },
    { 
      label: 'Profile Score', 
      value: userProfile.profileEnriched ? 95 : 60, 
      max: 100, 
      unit: '%',
      color: 'from-green-500 to-emerald-500',
      icon: Award
    },
    { 
      label: 'Subscription', 
      value: subscriptionData?.plan === 'pro' ? 100 : subscriptionData?.plan === 'ultra' ? 100 : 30, 
      max: 100, 
      unit: subscriptionData?.plan?.toUpperCase() || 'FREE',
      color: 'from-[#FE9100] to-[#a34e00]',
      icon: Zap
    }
  ];

  const accountStatus = [
    { 
      label: 'Account Created', 
      value: userProfile.createdAt ? formatDistanceToNow(new Date(userProfile.createdAt), { locale: de, addSuffix: true }) : 'Unknown',
      icon: Calendar,
      color: 'text-gray-400'
    },
    { 
      label: 'Last Update', 
      value: userProfile.updatedAt ? formatDistanceToNow(new Date(userProfile.updatedAt), { locale: de, addSuffix: true }) : 'Never',
      icon: Clock,
      color: 'text-gray-400'
    },
    { 
      label: 'Profile Status', 
      value: userProfile.profileEnriched ? 'Complete' : 'Incomplete',
      icon: userProfile.profileEnriched ? CheckCircle2 : AlertCircle,
      color: userProfile.profileEnriched ? 'text-green-400' : 'text-yellow-400'
    },
    { 
      label: 'Subscription', 
      value: userProfile.subscriptionStatus || 'Active',
      icon: userProfile.subscriptionStatus === 'active' ? CheckCircle2 : XCircle,
      color: userProfile.subscriptionStatus === 'active' ? 'text-green-400' : 'text-red-400'
    }
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddDataSource = async () => {
    if (!newDataSource.name || !newDataSource.content) {
      toast({ 
        title: 'Error', 
        description: 'Please fill all fields', 
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
      title: '✅ Success', 
      description: 'Data source added and being integrated into your AI' 
    });
    setShowAddDataDialog(false);
    setNewDataSource({ type: '', name: '', content: '' });
    generateAISummary();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '✅ Copied!', description: 'Copied to clipboard' });
  };

  const openDetailModal = (item: any) => {
    setSelectedDetail(item);
    setShowDetailDialog(true);
  };
  
  // 🧠 ANALYZE SPACE CHATS
  const [isAnalyzingChats, setIsAnalyzingChats] = useState(false);
  
  const analyzeSpaceChats = async () => {
    setIsAnalyzingChats(true);
    try {
      const response = await fetch('/api/chat/analyze-user', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: '✅ Analysis Complete!',
          description: `Analyzed ${data.messagesAnalyzed} messages. Dashboard updated with deep insights.`
        });
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        toast({
          title: '❌ Analysis Failed',
          description: 'Could not analyze chat history',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to analyze chats:', error);
      toast({
        title: '❌ Error',
        description: 'Analysis failed',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzingChats(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
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
        
        <div className="flex-1 overflow-y-auto p-8 premium-scroll">
          <div className="max-w-[1600px] mx-auto space-y-8">
            
            {/* 🔥 ULTRA PREMIUM HEADER */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FE9100]/10 via-transparent to-[#a34e00]/10 blur-3xl" />
              <div className="relative bg-gradient-to-br from-black/80 via-[#0a0a0a]/80 to-black/80 border border-white/5 rounded-3xl p-10 backdrop-blur-2xl overflow-hidden">
                {/* Animated Background */}
                <motion.div 
                  className="absolute inset-0 opacity-30"
                  animate={{
                    background: [
                      'radial-gradient(circle at 0% 0%, rgba(254, 145, 0, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 100% 100%, rgba(254, 145, 0, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 0% 0%, rgba(254, 145, 0, 0.1) 0%, transparent 50%)'
                    ]
                  }}
                  transition={{ duration: 8, repeat: Infinity }}
                />
                
                <div className="relative flex justify-between items-start mb-8">
                  <div>
                    <motion.h1 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-6xl font-black mb-4" 
                      style={{ 
                        fontFamily: 'Orbitron, sans-serif',
                        background: 'linear-gradient(135deg, #FE9100, #E9D7C4, #FE9100)',
                        backgroundSize: '200% auto',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      INTELLIGENCE
                    </motion.h1>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-6 text-gray-400"
                    >
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Calendar className="w-3.5 h-3.5 text-[#FE9100]" />
                        <span className="text-sm font-medium">
                          {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Clock className="w-3.5 h-3.5 text-[#FE9100]" />
                        <span className="text-sm font-mono font-bold text-white">
                          {format(new Date(), 'HH:mm:ss')}
                        </span>
                      </div>
                    </motion.div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3"
                  >
                    <Button
                      onClick={analyzeSpaceChats}
                      disabled={isAnalyzingChats}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-6 text-base rounded-xl shadow-2xl shadow-purple-600/20"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      <Sparkles className={`w-5 h-5 mr-2 ${isAnalyzingChats ? 'animate-spin' : ''}`} />
                      Analyze SPACE
                    </Button>
                    <Button
                      onClick={generateAISummary}
                      disabled={isLoadingSummary}
                      className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#FE9100]/90 hover:to-[#a34e00]/90 text-white font-bold px-8 py-6 text-base rounded-xl shadow-2xl shadow-[#FE9100]/20"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      <RefreshCw className={`w-5 h-5 mr-2 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                      Refresh AI
                    </Button>
                  </motion.div>
                </div>
                
                {/* 🔥 AI SUMMARY CARD */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative"
                >
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FE9100] via-[#E9D7C4] to-[#FE9100] rounded-2xl opacity-50 blur" />
                  <div className="relative bg-gradient-to-br from-[#FE9100]/10 via-black/50 to-[#a34e00]/10 border border-[#FE9100]/20 rounded-2xl p-8 backdrop-blur-xl">
                    <div className="flex items-start gap-4 mb-4">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FE9100] to-[#a34e00] flex items-center justify-center flex-shrink-0"
                      >
                        <Sparkles className="w-6 h-6 text-white" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 
                          className="text-2xl font-black mb-2"
                          style={{ 
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #FE9100, #E9D7C4)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          ARAS AI® LIVE ANALYSIS
                        </h3>
                        <p className="text-white/90 leading-relaxed text-lg">
                          {aiSummary || (
                            <span className="italic text-gray-400 animate-pulse">
                              🔥 Analyzing your data in real-time...
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* 🔥 AI LIVE INSIGHTS BANNER */}
            <AnimatePresence>
              {aiInsights.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {aiInsights.slice(0, 6).map((insight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + idx * 0.1 }}
                      whileHover={{ scale: 1.03, y: -5 }}
                      className="relative group"
                    >
                      <div className="absolute -inset-[1px] bg-gradient-to-br from-[#FE9100]/30 to-[#a34e00]/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur" />
                      <div className={`relative p-5 rounded-xl border transition-all ${
                        insight.type === 'opportunity' ? 'bg-green-500/5 border-green-500/30' :
                        insight.type === 'risk' ? 'bg-red-500/5 border-red-500/30' :
                        'bg-blue-500/5 border-blue-500/30'
                      }`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            insight.type === 'opportunity' ? 'bg-green-500/20' :
                            insight.type === 'risk' ? 'bg-red-500/20' :
                            'bg-blue-500/20'
                          }`}>
                            {insight.type === 'opportunity' ? '🚀' : insight.type === 'risk' ? '⚠️' : '💡'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-white text-sm">{insight.title}</h4>
                              <Badge className={`text-xs ${
                                insight.priority === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                'bg-gray-500/20 text-gray-300 border-gray-500/30'
                              }`}>
                                {insight.priority?.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2">{insight.description}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-[#FE9100]" />
                              <span className="text-xs text-gray-500">Impact: {insight.impact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 🎯 MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* 👤 USER PROFILE CARD */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="xl:col-span-1"
              >
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-br from-[#FE9100]/50 to-[#a34e00]/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
                  <div className="relative bg-gradient-to-br from-black/90 via-[#0a0a0a]/90 to-black/90 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h2 
                          className="text-2xl font-black"
                          style={{ 
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #FE9100, #E9D7C4)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          PROFILE
                        </h2>
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleSection('profile')}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          {expandedSections.profile ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </motion.button>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <AnimatePresence>
                      {expandedSections.profile && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 space-y-2">
                            {profileData.map((item, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + idx * 0.05 }}
                                whileHover={{ x: 5, scale: 1.01 }}
                                className="group/item relative"
                              >
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#FE9100]/30 transition-all cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FE9100]/20 to-[#a34e00]/20 flex items-center justify-center flex-shrink-0">
                                      <item.icon className="w-4 h-4 text-[#FE9100]" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 font-medium mb-0.5">{item.label}</p>
                                      <p className="text-sm font-bold text-white">{item.value}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => copyToClipboard(String(item.value))}
                                      className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center"
                                    >
                                      <Copy className="w-3 h-3 text-gray-400" />
                                    </motion.button>
                                    {item.editable && (
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => openDetailModal(item)}
                                        className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center"
                                      >
                                        <Edit2 className="w-3 h-3 text-gray-400" />
                                      </motion.button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* 💼 BUSINESS INTELLIGENCE */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="xl:col-span-2"
              >
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-br from-[#FE9100]/50 to-[#a34e00]/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
                  <div className="relative bg-gradient-to-br from-black/90 via-[#0a0a0a]/90 to-black/90 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h2 
                          className="text-2xl font-black"
                          style={{ 
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #FE9100, #E9D7C4)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          BUSINESS INTELLIGENCE
                        </h2>
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleSection('business')}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          {expandedSections.business ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </motion.button>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedSections.business && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {businessIntelligence.map((item, idx) => (
                                <motion.div 
                                  key={idx}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.8 + idx * 0.05 }}
                                  whileHover={{ scale: 1.02, y: -3 }}
                                  onClick={() => item.expandable && openDetailModal(item)}
                                  className={`bg-gradient-to-br from-[#FE9100]/5 to-transparent rounded-xl p-5 border border-[#FE9100]/10 hover:border-[#FE9100]/30 transition-all cursor-pointer ${item.fullText ? 'md:col-span-2' : ''}`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold text-[#FE9100] uppercase tracking-wider">
                                      {item.label}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      {item.badge && (
                                        <Badge className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] text-white border-0">
                                          {item.badge}
                                        </Badge>
                                      )}
                                      {item.expandable && (
                                        <ExternalLink className="w-3 h-3 text-gray-500" />
                                      )}
                                    </div>
                                  </div>
                                  <p className={`text-sm text-white/80 ${item.fullText ? 'leading-relaxed' : ''} line-clamp-2`}>
                                    {item.value}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 📊 USAGE & STATUS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* USAGE STATS */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-br from-[#FE9100]/50 to-[#a34e00]/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
                  <div className="relative bg-gradient-to-br from-black/90 via-[#0a0a0a]/90 to-black/90 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h2 
                          className="text-2xl font-black"
                          style={{ 
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #FE9100, #E9D7C4)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          USAGE
                        </h2>
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleSection('usage')}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          {expandedSections.usage ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </motion.button>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedSections.usage && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 space-y-6">
                            {usageStats.map((stat, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.9 + idx * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="group/stat"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FE9100]/20 to-[#a34e00]/20 flex items-center justify-center">
                                      <stat.icon className="w-5 h-5 text-[#FE9100]" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-400">{stat.label}</span>
                                  </div>
                                  <span className="text-sm font-bold text-white">
                                    {stat.value} {stat.unit}
                                  </span>
                                </div>
                                <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((stat.value / stat.max) * 100, 100)}%` }}
                                    transition={{ delay: 1 + idx * 0.1, duration: 1, ease: 'easeOut' }}
                                    className={`h-full bg-gradient-to-r ${stat.color} rounded-full relative overflow-hidden`}
                                  >
                                    <motion.div
                                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                      animate={{ x: ['-100%', '200%'] }}
                                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                    />
                                  </motion.div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* ACCOUNT STATUS */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-br from-[#FE9100]/50 to-[#a34e00]/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
                  <div className="relative bg-gradient-to-br from-black/90 via-[#0a0a0a]/90 to-black/90 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h2 
                          className="text-2xl font-black"
                          style={{ 
                            fontFamily: 'Orbitron, sans-serif',
                            background: 'linear-gradient(90deg, #FE9100, #E9D7C4)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          STATUS
                        </h2>
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleSection('account')}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          {expandedSections.account ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </motion.button>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedSections.account && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 space-y-3">
                            {accountStatus.map((item, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1 + idx * 0.08 }}
                                whileHover={{ scale: 1.02, x: 5 }}
                                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[#FE9100]/5 to-transparent border border-[#FE9100]/10 hover:border-[#FE9100]/30 transition-all cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <item.icon className={`w-5 h-5 ${item.color}`} />
                                  <span className="text-sm font-medium text-gray-300">{item.label}</span>
                                </div>
                                <span className={`text-sm font-bold ${item.color}`}>
                                  {item.value}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 📁 DATA SOURCES */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <div className="relative group">
                <div className="absolute -inset-[1px] bg-gradient-to-br from-[#FE9100]/50 to-[#a34e00]/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
                <div className="relative bg-gradient-to-br from-black/90 via-[#0a0a0a]/90 to-black/90 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h2 
                        className="text-2xl font-black"
                        style={{ 
                          fontFamily: 'Orbitron, sans-serif',
                          background: 'linear-gradient(90deg, #FE9100, #E9D7C4)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        DATA SOURCES
                      </h2>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => setShowAddDataDialog(true)}
                          className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#FE9100]/90 hover:to-[#a34e00]/90"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Source
                        </Button>
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleSection('sources')}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          {expandedSections.sources ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedSections.sources && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {dataSources.map((source, idx) => (
                              <motion.div
                                key={source.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1.1 + idx * 0.05 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className={`relative group/source bg-gradient-to-br ${
                                  source.type === 'document' ? 'from-[#FE9100]/10 to-[#a34e00]/10 border-[#FE9100]/30' :
                                  source.type === 'url' ? 'from-purple-600/10 to-purple-900/10 border-purple-600/30' :
                                  source.type === 'api' ? 'from-blue-600/10 to-blue-900/10 border-blue-600/30' :
                                  'from-green-600/10 to-green-900/10 border-green-600/30'
                                } border rounded-xl p-5 cursor-pointer hover:border-opacity-50 transition-all`}
                              >
                                <div className="flex flex-col h-full">
                                  {source.type === 'document' ? <FileText className="w-10 h-10 text-[#FE9100] mb-3" /> :
                                   source.type === 'url' ? <Globe className="w-10 h-10 text-purple-400 mb-3" /> :
                                   source.type === 'api' ? <Server className="w-10 h-10 text-blue-400 mb-3" /> :
                                   <span className="text-5xl mb-3">💾</span>
                                  }
                                  <h3 className="text-sm font-bold text-white mb-1">{source.name}</h3>
                                  <p className="text-xs text-gray-400 flex-1 line-clamp-2">{source.content}</p>
                                  <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {source.status === 'active' ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                                          <span className="text-xs text-green-400">Active</span>
                                        </>
                                      ) : source.status === 'pending' ? (
                                        <>
                                          <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />
                                          <span className="text-xs text-yellow-400">Processing...</span>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-3 h-3 text-gray-400" />
                                          <span className="text-xs text-gray-400">Inactive</span>
                                        </>
                                      )}
                                    </div>
                                    <motion.button
                                      whileHover={{ scale: 1.2 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="opacity-0 group-hover/source:opacity-100 w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                                    >
                                      <Eye className="w-3 h-3 text-white" />
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                            
                            {/* Add New */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1.1 + dataSources.length * 0.05 }}
                              whileHover={{ scale: 1.05, y: -5 }}
                              onClick={() => setShowAddDataDialog(true)}
                              className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border-2 border-dashed border-white/10 rounded-xl p-5 cursor-pointer hover:border-[#FE9100]/50 transition-all flex flex-col items-center justify-center min-h-[180px]"
                            >
                              <Plus className="w-12 h-12 text-gray-500 mb-3" />
                              <p className="text-sm text-gray-500 font-medium">New Source</p>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 🔥 ADD DATA SOURCE DIALOG */}
      <Dialog open={showAddDataDialog} onOpenChange={setShowAddDataDialog}>
        <DialogContent className="bg-black/95 border border-white/10 backdrop-blur-2xl text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Add Data Source
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Integrate new information to enhance ARAS AI
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 mt-6">
            <div>
              <label className="text-sm font-bold text-gray-300 mb-2 block">Type</label>
              <select 
                value={newDataSource.type}
                onChange={(e) => setNewDataSource({...newDataSource, type: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-[#FE9100] focus:outline-none transition-all"
              >
                <option value="" className="bg-black">Select Type</option>
                <option value="document" className="bg-black">Document</option>
                <option value="url" className="bg-black">Website URL</option>
                <option value="api" className="bg-black">API Endpoint</option>
                <option value="custom" className="bg-black">Custom Data</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-300 mb-2 block">Name</label>
              <Input
                value={newDataSource.name}
                onChange={(e) => setNewDataSource({...newDataSource, name: e.target.value})}
                placeholder="e.g. Product Catalog 2025"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 rounded-xl py-3"
              />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-300 mb-2 block">Content / URL</label>
              <Textarea
                value={newDataSource.content}
                onChange={(e) => setNewDataSource({...newDataSource, content: e.target.value})}
                placeholder="Paste your data here or provide a URL..."
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 min-h-[120px] rounded-xl"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDataDialog(false)}
                className="border-white/20 text-white hover:bg-white/10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddDataSource}
                className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#FE9100]/90 hover:to-[#a34e00]/90 rounded-xl"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔥 DETAIL MODAL */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-black/95 border border-white/10 backdrop-blur-2xl text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {selectedDetail?.label || 'Details'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-6">
            {selectedDetail?.fullData && Array.isArray(selectedDetail.fullData) ? (
              <div className="space-y-2">
                {selectedDetail.fullData.map((item: string, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <span className="text-white">{item}</span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => copyToClipboard(item)}
                      className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/90 leading-relaxed">
                  {selectedDetail?.value || 'No data available'}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setShowDetailDialog(false)}
              className="bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#FE9100]/90 hover:to-[#a34e00]/90 rounded-xl"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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