import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Layout components removed - app.tsx handles Sidebar/TopBar
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { User as UserType, SubscriptionResponse } from '@shared/schema';

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS (no logic, pure presentation)
// ═══════════════════════════════════════════════════════════════

const Chip = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'orange' | 'success' | 'warning' | 'error';
  className?: string;
}) => {
  const variants = {
    default: 'border-white/10 text-white/60',
    orange: 'border-orange-500/25 text-orange-400 bg-orange-500/5',
    success: 'border-emerald-500/25 text-emerald-400',
    warning: 'border-amber-500/25 text-amber-400',
    error: 'border-red-500/25 text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium tracking-wide border rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-black/45 border border-white/8 rounded-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-white/12 ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ title, hint, actions }: { title: string; hint?: string; actions?: React.ReactNode }) => (
  <div className="px-6 py-5 border-b border-white/6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
        {hint && <p className="text-xs text-white/40 mt-0.5">{hint}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  </div>
);

const FieldRow = ({ label, value, editable = false, onEdit }: { 
  label: string; 
  value: string | number | null | undefined; 
  editable?: boolean;
  onEdit?: () => void;
}) => (
  <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white/[0.02] transition-colors group">
    <span className="text-xs uppercase tracking-wider text-white/40 font-medium">{label}</span>
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/80 font-medium">{value || '—'}</span>
      {editable && onEdit && (
        <button 
          onClick={onEdit}
          className="text-xs text-white/30 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          Edit
        </button>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// DATA SOURCE TYPE
// ═══════════════════════════════════════════════════════════════

interface DataSource {
  id: number;
  userId: string;
  type: 'file' | 'text' | 'url';
  title: string | null;
  status: 'pending' | 'processing' | 'active' | 'failed';
  contentText: string | null;
  url: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  fileStorageKey: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// Safe date helper to prevent RangeError
const safeDateLabel = (value: string | null | undefined): string => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return formatDistanceToNow(d, { locale: de, addSuffix: true });
  } catch {
    return '—';
  }
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function Leads() {
  // ─────────────────────────────────────────────────────────────
  // STATE (preserved exactly as before)
  // ─────────────────────────────────────────────────────────────
  // sidebarCollapsed removed - app.tsx handles sidebar state
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
  const [newDataSource, setNewDataSource] = useState({ type: 'text' as 'text' | 'url' | 'file', title: '', content: '', url: '' });
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addSourceError, setAddSourceError] = useState<string | null>(null); // Persistent error display
  
  // Knowledge Digest Preview State
  const [showDigestPreview, setShowDigestPreview] = useState(false);
  const [digestPreview, setDigestPreview] = useState<{ digest: string; meta: { sourceCount: number; charCount: number; mode: string } } | null>(null);
  const [isLoadingDigest, setIsLoadingDigest] = useState(false);
  const [digestMode, setDigestMode] = useState<'space' | 'power'>('space');

  // Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState<any>({});
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

  // ─────────────────────────────────────────────────────────────
  // QUERIES (preserved exactly)
  // ─────────────────────────────────────────────────────────────
  const { data: dataSourcesResponse, isLoading: isLoadingDataSources, refetch: refetchDataSources } = useQuery<{ success: boolean; dataSources: DataSource[] }>({
    queryKey: ['/api/user/data-sources'],
    enabled: !!user && !authLoading,
  });

  const dataSources = dataSourcesResponse?.dataSources || [];

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/user/subscription'],
    enabled: !!user && !authLoading,
  });

  // ─────────────────────────────────────────────────────────────
  // MUTATIONS (preserved exactly)
  // ─────────────────────────────────────────────────────────────
  const updateAiProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch('/api/user/ai-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update AI profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ 
        title: 'Saved successfully', 
        description: 'Your business intelligence has been updated.',
        duration: 3000
      });
      setIsEditingBusiness(false);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error saving', 
        description: error.message || 'Could not save to database.', 
        variant: 'destructive',
        duration: 5000
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // HANDLERS (preserved exactly)
  // ─────────────────────────────────────────────────────────────
  const startEditingBusiness = () => {
    const userProfile = user as UserType;
    const aiProfile = userProfile.aiProfile || {};
    
    setEditedBusiness({
      companyDescription: aiProfile.companyDescription || '',
      targetAudience: aiProfile.targetAudience || '',
      effectiveKeywords: Array.isArray(aiProfile.effectiveKeywords) 
        ? aiProfile.effectiveKeywords.join(', ') 
        : '',
      competitors: Array.isArray(aiProfile.competitors) 
        ? aiProfile.competitors.join(', ') 
        : '',
      services: aiProfile.services || '',
    });
    setIsEditingBusiness(true);
  };

  const saveBusinessIntelligence = () => {
    const updates = {
      companyDescription: editedBusiness.companyDescription,
      targetAudience: editedBusiness.targetAudience,
      effectiveKeywords: editedBusiness.effectiveKeywords
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean),
      competitors: editedBusiness.competitors
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean),
      services: editedBusiness.services,
    };
    updateAiProfileMutation.mutate(updates);
  };

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const generateLiveIntelligence = async () => {
    if (!user) return;
    setIsLoadingInsights(true);
    try {
      const userProfile = user as UserType;
      const aiProfile = userProfile.aiProfile || {};
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
        body: JSON.stringify({ message: insightsPrompt, sessionId: 1 })
      });
      
      if (response.ok) {
        const data = await response.json();
        try {
          const jsonMatch = data.message.match(/\[\s*{[\s\S]*}\s*\]/);
          if (jsonMatch) {
            const insights = JSON.parse(jsonMatch[0]);
            setAiInsights(insights);
          }
        } catch (e) {
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
          message: `Generate a brief, professional 2-3 sentence summary about ${userProfile.firstName}'s business (${userProfile.company}) in ${userProfile.industry}. Focus on their primary goal: ${userProfile.primaryGoal}. Be concise and insightful.`,
          sessionId: 'dashboard-summary-' + Date.now()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.message);
      } else {
        setAiSummary(`Welcome back, ${userProfile.firstName}. Your knowledge base is ready.`);
      }
    } catch (error) {
      const userProfile = user as UserType;
      setAiSummary(`Welcome back, ${userProfile.firstName}. Your knowledge base is ready.`);
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

  const handleAddDataSource = async () => {
    setAddSourceError(null); // Clear previous error
    
    // Validation
    if (newDataSource.type === 'text' && !newDataSource.content) {
      setAddSourceError('Please enter text content');
      return;
    }
    if (newDataSource.type === 'url' && !newDataSource.url) {
      setAddSourceError('Please enter a URL');
      return;
    }
    if (newDataSource.type === 'file' && !selectedFile) {
      setAddSourceError('Please select a file');
      return;
    }

    setIsAddingSource(true);
    console.log('[ADD_SOURCE] Starting...', { type: newDataSource.type, title: newDataSource.title });

    try {
      let response: Response;

      if (newDataSource.type === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (newDataSource.title) formData.append('title', newDataSource.title);
        console.log('[ADD_SOURCE] Uploading file:', selectedFile.name);
        response = await fetch('/api/user/data-sources/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      } else {
        const payload = {
          type: newDataSource.type,
          title: newDataSource.title || undefined,
          contentText: newDataSource.type === 'text' ? newDataSource.content : undefined,
          url: newDataSource.type === 'url' ? newDataSource.url : undefined,
        };
        console.log('[ADD_SOURCE] POST JSON:', payload);
        response = await fetch('/api/user/data-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      console.log('[ADD_SOURCE] Response:', response.status, data);
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      toast({ title: 'Success', description: 'Data source added to your knowledge base!' });
      queryClient.invalidateQueries({ queryKey: ['/api/user/data-sources'] });
      refetchDataSources();
      setShowAddDataDialog(false);
      setNewDataSource({ type: 'text', title: '', content: '', url: '' });
      setSelectedFile(null);
      setAddSourceError(null);
    } catch (error: any) {
      console.error('[ADD_SOURCE] Error:', error);
      const errMsg = error.message || 'Failed to add data source';
      setAddSourceError(errMsg);
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleDeleteDataSource = async (id: number) => {
    try {
      const response = await fetch(`/api/user/data-sources/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete data source');
      toast({ title: 'Deleted', description: 'Data source removed' });
      refetchDataSources();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete data source', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  const fetchDigestPreview = async (mode: 'space' | 'power') => {
    setIsLoadingDigest(true);
    setDigestMode(mode);
    try {
      const response = await fetch(`/api/user/knowledge-digest?mode=${mode}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setDigestPreview({ digest: data.digest, meta: data.meta });
        setShowDigestPreview(true);
      } else {
        toast({ title: 'Error', description: 'Failed to load digest preview', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load digest preview', variant: 'destructive' });
    } finally {
      setIsLoadingDigest(false);
    }
  };

  const openDetailModal = (item: any) => {
    setSelectedDetail(item);
    setShowDetailDialog(true);
  };
  
  const [isAnalyzingChats, setIsAnalyzingChats] = useState(false);
  
  const analyzeSpaceChats = async () => {
    setIsAnalyzingChats(true);
    try {
      const response = await fetch('/api/chat/analyze-user', { method: 'POST', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        toast({ title: 'Analysis Complete', description: `Analyzed ${data.messagesAnalyzed} messages.` });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        toast({ title: 'Analysis Failed', description: 'Could not analyze chat history', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Analysis failed', variant: 'destructive' });
    } finally {
      setIsAnalyzingChats(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ─────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────
  if (!user || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b0b0f]">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const userProfile = user as UserType;
  const aiProfile = userProfile.aiProfile || {};

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#0b0b0f] relative">
      {/* Subtle radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
          <div className="max-w-[1480px] mx-auto px-8 py-10">
            
            {/* ═══════════════════════════════════════════════════════════════
                LAYER 1: HERO HEADER
            ═══════════════════════════════════════════════════════════════ */}
            <header className="mb-12">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
                    Knowledge Base
                  </h1>
                  <p className="text-lg text-white/50 max-w-xl">
                    The complete intelligence ARAS uses across SPACE and POWER.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchDigestPreview('space')}
                    disabled={isLoadingDigest}
                    className="px-5 py-2.5 text-sm font-medium text-white/70 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-50"
                  >
                    {isLoadingDigest ? 'Loading...' : 'Preview Context'}
                  </button>
                  <button
                    onClick={() => setShowAddDataDialog(true)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/20"
                  >
                    Add Source
                  </button>
                </div>
              </div>
              
              {/* Status Row */}
              <div className="flex flex-wrap items-center gap-3">
                <Chip variant="orange">
                  {subscriptionData?.plan?.toUpperCase() || 'FREE'}
                </Chip>
                <Chip>
                  {dataSources.length} Sources
                </Chip>
                {userProfile.updatedAt && (
                  <Chip>
                    Updated {safeDateLabel(userProfile.updatedAt)}
                  </Chip>
                )}
                <Chip variant={userProfile.profileEnriched ? 'success' : 'warning'}>
                  {userProfile.profileEnriched ? 'Profile Complete' : 'Profile Incomplete'}
                </Chip>
              </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════
                LAYER 2: MAIN GRID
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* ─────────────────────────────────────────────────────────────
                  LEFT COLUMN (8 cols): Profile + Business Intelligence
              ───────────────────────────────────────────────────────────── */}
              <div className="col-span-12 xl:col-span-8 space-y-6">
                
                {/* PROFILE SECTION */}
                <SectionCard>
                  <SectionHeader title="Profile" hint="Your account information" />
                  <div className="p-4 divide-y divide-white/5">
                    <FieldRow label="Name" value={`${userProfile.firstName} ${userProfile.lastName}`} />
                    <FieldRow label="Email" value={userProfile.email || userProfile.username} />
                    <FieldRow label="Company" value={userProfile.company} editable />
                    <FieldRow label="Position" value={userProfile.role} editable />
                    <FieldRow label="Industry" value={userProfile.industry} editable />
                    <FieldRow label="Primary Goal" value={userProfile.primaryGoal?.replace('_', ' ')} editable />
                    <FieldRow label="Website" value={userProfile.website} editable />
                    <FieldRow label="User ID" value={userProfile.id} />
                  </div>
                </SectionCard>

                {/* BUSINESS INTELLIGENCE SECTION */}
                <SectionCard>
                  <SectionHeader 
                    title="Business Intelligence" 
                    hint="AI-enriched data about your company"
                    actions={
                      !isEditingBusiness ? (
                        <button
                          onClick={startEditingBusiness}
                          className="px-4 py-1.5 text-xs font-medium text-orange-400 border border-orange-500/25 rounded-lg hover:bg-orange-500/10 transition-all"
                        >
                          Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditingBusiness(false)}
                            className="px-4 py-1.5 text-xs font-medium text-white/50 border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveBusinessIntelligence}
                            disabled={updateAiProfileMutation.isPending}
                            className="px-4 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-400 transition-all disabled:opacity-50"
                          >
                            {updateAiProfileMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )
                    }
                  />
                  
                  {!isEditingBusiness ? (
                    <div className="p-6 space-y-6">
                      {/* Company Overview */}
                      <div className="space-y-3">
                        <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Company Overview</h4>
                        <p className="text-sm text-white/70 leading-relaxed">
                          {aiProfile.companyDescription || 'No description available. Add your company information to enhance AI responses.'}
                        </p>
                      </div>
                      
                      <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Target Audience */}
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Target Audience</h4>
                          <p className="text-sm text-white/70">{aiProfile.targetAudience || '—'}</p>
                        </div>
                        
                        {/* Services */}
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Services</h4>
                          <p className="text-sm text-white/70">{aiProfile.services || '—'}</p>
                        </div>
                      </div>
                      
                      <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Keywords */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Keywords</h4>
                            {aiProfile.effectiveKeywords?.length > 0 && (
                              <span className="text-xs text-white/30">{aiProfile.effectiveKeywords.length} total</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aiProfile.effectiveKeywords?.slice(0, 8).map((kw: string, i: number) => (
                              <span key={i} className="px-2 py-1 text-xs text-white/60 bg-white/5 border border-white/8 rounded-md">
                                {kw}
                              </span>
                            )) || <span className="text-sm text-white/40">—</span>}
                          </div>
                        </div>
                        
                        {/* Competitors */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">Competitors</h4>
                            {aiProfile.competitors?.length > 0 && (
                              <span className="text-xs text-white/30">{aiProfile.competitors.length} total</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aiProfile.competitors?.slice(0, 5).map((c: string, i: number) => (
                              <span key={i} className="px-2 py-1 text-xs text-white/60 bg-white/5 border border-white/8 rounded-md">
                                {c}
                              </span>
                            )) || <span className="text-sm text-white/40">—</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Edit Mode */
                    <div className="p-6 space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Company Description</label>
                        <Textarea
                          value={editedBusiness.companyDescription || ''}
                          onChange={(e) => setEditedBusiness({ ...editedBusiness, companyDescription: e.target.value })}
                          className="bg-white/5 border-white/10 text-white text-sm min-h-[120px] rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50 resize-none"
                          placeholder="Describe your company..."
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Target Audience</label>
                          <Input
                            value={editedBusiness.targetAudience || ''}
                            onChange={(e) => setEditedBusiness({ ...editedBusiness, targetAudience: e.target.value })}
                            className="bg-white/5 border-white/10 text-white text-sm rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50"
                            placeholder="Your target audience..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Services</label>
                          <Input
                            value={editedBusiness.services || ''}
                            onChange={(e) => setEditedBusiness({ ...editedBusiness, services: e.target.value })}
                            className="bg-white/5 border-white/10 text-white text-sm rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50"
                            placeholder="Your services..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Keywords (comma separated)</label>
                          <Input
                            value={editedBusiness.effectiveKeywords || ''}
                            onChange={(e) => setEditedBusiness({ ...editedBusiness, effectiveKeywords: e.target.value })}
                            className="bg-white/5 border-white/10 text-white text-sm rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50"
                            placeholder="keyword1, keyword2, keyword3..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Competitors (comma separated)</label>
                          <Input
                            value={editedBusiness.competitors || ''}
                            onChange={(e) => setEditedBusiness({ ...editedBusiness, competitors: e.target.value })}
                            className="bg-white/5 border-white/10 text-white text-sm rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50"
                            placeholder="competitor1, competitor2..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </SectionCard>

                {/* AI SUMMARY */}
                <SectionCard>
                  <SectionHeader 
                    title="AI Summary" 
                    hint="Generated insights about your business"
                    actions={
                      <button
                        onClick={generateAISummary}
                        disabled={isLoadingSummary}
                        className="px-4 py-1.5 text-xs font-medium text-white/50 border border-white/10 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
                      >
                        {isLoadingSummary ? 'Generating...' : 'Regenerate'}
                      </button>
                    }
                  />
                  <div className="p-6">
                    <p className="text-sm text-white/70 leading-relaxed">
                      {aiSummary || 'Generating summary...'}
                    </p>
                  </div>
                </SectionCard>

                {/* USAGE STATS */}
                <SectionCard>
                  <SectionHeader title="Usage" hint="Your current usage statistics" />
                  <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wider text-white/40 font-medium">AI Messages</p>
                      <p className="text-2xl font-semibold text-white">{userProfile.aiMessagesUsed || 0}</p>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                          style={{ width: `${Math.min(((userProfile.aiMessagesUsed || 0) / (subscriptionData?.aiMessagesLimit || 100)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wider text-white/40 font-medium">Voice Calls</p>
                      <p className="text-2xl font-semibold text-white">{userProfile.voiceCallsUsed || 0}</p>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                          style={{ width: `${Math.min(((userProfile.voiceCallsUsed || 0) / (subscriptionData?.voiceCallsLimit || 50)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wider text-white/40 font-medium">Data Sources</p>
                      <p className="text-2xl font-semibold text-white">{dataSources.length}</p>
                      <p className="text-xs text-white/40">Active sources</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wider text-white/40 font-medium">Account Age</p>
                      <p className="text-2xl font-semibold text-white">
                        {safeDateLabel(userProfile.createdAt)}
                      </p>
                      <p className="text-xs text-white/40">Since creation</p>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  RIGHT COLUMN (4 cols): Data Sources + Preview
              ───────────────────────────────────────────────────────────── */}
              <div className="col-span-12 xl:col-span-4 space-y-6">
                
                {/* DATA SOURCES */}
                <SectionCard>
                  <SectionHeader 
                    title="Data Sources" 
                    hint={`${dataSources.length} active`}
                    actions={
                      <button
                        onClick={() => setShowAddDataDialog(true)}
                        className="px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/25 rounded-lg hover:bg-orange-500/10 transition-all"
                      >
                        Add
                      </button>
                    }
                  />
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {isLoadingDataSources ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                      </div>
                    ) : dataSources.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-white/40 mb-4">No data sources yet</p>
                        <button
                          onClick={() => setShowAddDataDialog(true)}
                          className="px-4 py-2 text-sm font-medium text-orange-400 border border-orange-500/25 rounded-lg hover:bg-orange-500/10 transition-all"
                        >
                          Add your first source
                        </button>
                      </div>
                    ) : dataSources.map((source) => (
                      <div 
                        key={source.id}
                        className="p-4 bg-white/[0.02] border border-white/6 rounded-xl hover:border-white/12 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Chip variant={source.type === 'file' ? 'orange' : source.type === 'url' ? 'default' : 'default'}>
                              {source.type.toUpperCase()}
                            </Chip>
                            <Chip variant={source.status === 'active' ? 'success' : source.status === 'failed' ? 'error' : 'warning'}>
                              {source.status.toUpperCase()}
                            </Chip>
                          </div>
                        </div>
                        
                        <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">
                          {source.title || source.fileName || 'Untitled'}
                        </h4>
                        
                        <p className="text-xs text-white/40 mb-3 line-clamp-1">
                          {source.type === 'url' ? source.url : 
                           source.type === 'file' ? `${source.fileName} · ${Math.round((source.fileSize || 0) / 1024)}KB` :
                           'Text content'}
                        </p>
                        
                        {source.contentText && (
                          <p className="text-xs text-white/30 line-clamp-2 mb-3">
                            {source.contentText.substring(0, 150)}...
                          </p>
                        )}
                        
                        <button
                          onClick={() => handleDeleteDataSource(source.id)}
                          className="text-xs text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* PREVIEW CONTEXT */}
                <SectionCard>
                  <SectionHeader title="Preview Context" hint="What ARAS sees" />
                  <div className="p-4">
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => fetchDigestPreview('space')}
                        disabled={isLoadingDigest}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                          digestMode === 'space' && showDigestPreview
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        SPACE
                      </button>
                      <button
                        onClick={() => fetchDigestPreview('power')}
                        disabled={isLoadingDigest}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                          digestMode === 'power' && showDigestPreview
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        POWER
                      </button>
                    </div>
                    
                    {showDigestPreview && digestPreview ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Chip variant={digestPreview.meta.mode === 'space' ? 'default' : 'default'}>
                            {digestPreview.meta.sourceCount} sources
                          </Chip>
                          <span className="text-xs text-white/30">
                            {digestPreview.meta.charCount} chars
                          </span>
                        </div>
                        <div className="bg-black/30 border border-white/6 rounded-xl p-4 max-h-[300px] overflow-y-auto">
                          <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap leading-relaxed">
                            {digestPreview.digest || 'No context available.'}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-sm text-white/30 py-8">
                        Click SPACE or POWER to preview
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>

      {/* ═══════════════════════════════════════════════════════════════
          ADD DATA SOURCE DIALOG
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showAddDataDialog} onOpenChange={(open) => { setShowAddDataDialog(open); if (open) setAddSourceError(null); }}>
        <DialogContent className="bg-[#0f0f13] border border-white/10 backdrop-blur-2xl text-white max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Add Data Source
            </DialogTitle>
            <DialogDescription className="text-sm text-white/50">
              Add information to enhance ARAS AI responses
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 mt-4">
            {/* Persistent Error Display */}
            {addSourceError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-400 font-medium">{addSourceError}</p>
              </div>
            )}
            
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['text', 'url', 'file'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setNewDataSource({...newDataSource, type: t}); setSelectedFile(null); }}
                    className={`py-3 text-sm font-medium rounded-xl border transition-all ${
                      newDataSource.type === t 
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' 
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {t === 'file' ? 'File' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Title (optional)</label>
              <Input
                value={newDataSource.title}
                onChange={(e) => setNewDataSource({...newDataSource, title: e.target.value})}
                placeholder="e.g. Product Catalog 2025"
                className="bg-white/5 border-white/10 text-white text-sm rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50"
              />
            </div>
            
            {/* Text Input */}
            {newDataSource.type === 'text' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40 font-medium">Content</label>
                <Textarea
                  value={newDataSource.content}
                  onChange={(e) => setNewDataSource({...newDataSource, content: e.target.value})}
                  placeholder="Paste your text content here..."
                  className="bg-white/5 border-white/10 text-white text-sm min-h-[150px] rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50 resize-none"
                />
                <p className="text-xs text-white/30">{newDataSource.content.length} / 50,000 characters</p>
              </div>
            )}

            {/* URL Input */}
            {newDataSource.type === 'url' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40 font-medium">URL</label>
                <Input
                  value={newDataSource.url}
                  onChange={(e) => setNewDataSource({...newDataSource, url: e.target.value})}
                  placeholder="https://example.com/page"
                  className="bg-white/5 border-white/10 text-white text-sm rounded-xl focus:ring-orange-500/25 focus:border-orange-500/50"
                />
              </div>
            )}

            {/* File Upload */}
            {newDataSource.type === 'file' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40 font-medium">File (PDF, TXT, DOC, DOCX — max 25MB)</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    selectedFile ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => document.getElementById('file-upload-redesign')?.click()}
                >
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload-redesign"
                  />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm text-white font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-white/40 mt-1">{Math.round(selectedFile.size / 1024)} KB</p>
                    </div>
                  ) : (
                    <p className="text-sm text-white/40">Click to select a file</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowAddDataDialog(false); setSelectedFile(null); }}
                disabled={isAddingSource}
                className="px-5 py-2.5 text-sm font-medium text-white/50 border border-white/10 rounded-xl hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDataSource}
                disabled={isAddingSource}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-400 hover:to-orange-500 transition-all disabled:opacity-50"
              >
                {isAddingSource ? 'Adding...' : 'Add Source'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          DETAIL MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-[#0f0f13] border border-white/10 backdrop-blur-2xl text-white max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              {selectedDetail?.label || 'Details'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedDetail?.fullData && Array.isArray(selectedDetail.fullData) ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedDetail.fullData.map((item: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/8 group"
                  >
                    <span className="text-sm text-white/80">{item}</span>
                    <button
                      onClick={() => copyToClipboard(item)}
                      className="text-xs text-white/30 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-white/5 border border-white/8">
                <p className="text-sm text-white/70 leading-relaxed">
                  {selectedDetail?.value || 'No data available'}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowDetailDialog(false)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-400 hover:to-orange-500 transition-all"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
