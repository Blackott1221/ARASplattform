import React, { useState, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Database, Brain, Sparkles, FileText, Link2, Upload, X, Copy, Trash2, 
  ChevronDown, ChevronRight, Search, Filter, Eye, User, Building2, 
  Mail, Calendar, Zap, MessageSquare, Phone, Crown, ExternalLink,
  Check, AlertCircle, RefreshCw, Settings, MoreHorizontal, Activity,
  Signal, Cpu, HardDrive, Layers
} from 'lucide-react';
import type { User as UserType, SubscriptionResponse } from '@shared/schema';
import '@/styles/animations.css';

// Animated counter hook for KPI numbers
function useAnimatedCounter(end: number, duration: number = 600) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  useEffect(() => {
    if (hasAnimated || end === 0) return;
    setHasAnimated(true);
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.round(end * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, hasAnimated]);
  
  return count;
}

// ErrorBoundary to prevent black screen crashes
class LeadsErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LEADS] ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-black/60 backdrop-blur-2xl border border-red-500/30 rounded-[22px] p-8 max-w-md text-center shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Fehler aufgetreten
            </h2>
            <p className="text-sm text-white/60 mb-4">
              Die Wissensdatenbank konnte nicht geladen werden.
            </p>
            <pre className="text-xs text-red-300/80 bg-black/40 p-3 rounded-xl border border-red-500/20 overflow-auto max-h-[100px] mb-5 text-left">
              {this.state.error?.message || 'Unbekannter Fehler'}
            </pre>
            <Button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-[#ff6a00] to-[#ff8533] hover:from-[#ff6a00]/90 hover:to-[#ff8533]/90 text-white font-medium px-6 rounded-xl"
            >
              Seite neu laden
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Safe date helper to prevent RangeError
const safeDateLabel = (value: string | null | undefined, addSuffix = true): string => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return formatDistanceToNow(d, { locale: de, addSuffix });
  } catch {
    return '—';
  }
};

const safeFormatDate = (value: string | null | undefined, formatStr: string): string => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return format(d, formatStr);
  } catch {
    return '—';
  }
};

// Data Source type from API
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

function LeadsContent() {
  // === STATE (preserved from original) ===
  const [showAddDataDialog, setShowAddDataDialog] = useState(false);
  const [newDataSource, setNewDataSource] = useState({ type: 'text' as 'text' | 'url' | 'file', title: '', content: '', url: '' });
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addSourceError, setAddSourceError] = useState<string | null>(null);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState<any>({});
  const [biSaveError, setBiSaveError] = useState<string | null>(null);
  const [biSaveSuccess, setBiSaveSuccess] = useState(false);
  
  // NEW: UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'url' | 'file'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [showDevDetails, setShowDevDetails] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [hasMounted, setHasMounted] = useState(false);
  
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mount animation trigger
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch data sources from API
  const { data: dataSourcesResponse, isLoading: isLoadingDataSources, refetch: refetchDataSources } = useQuery<{ success: boolean; dataSources: DataSource[] }>({
    queryKey: ['/api/user/data-sources'],
    enabled: !!user && !authLoading,
  });

  const dataSources = dataSourcesResponse?.dataSources || [];

  // Fetch subscription data for usage stats display
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/user/subscription'],
    enabled: !!user && !authLoading,
  });

  // Fetch knowledge digest preview (SPACE mode)
  const [digestMode, setDigestMode] = useState<'space' | 'power'>('space');
  const { data: digestData, refetch: refetchDigest } = useQuery<{
    success: boolean;
    mode: string;
    userId: string;
    sourceCount: number;
    charCount: number;
    truncated: boolean;
    digest: string;
  }>({
    queryKey: ['/api/user/knowledge/digest', digestMode],
    queryFn: async () => {
      const res = await fetch(`/api/user/knowledge/digest?mode=${digestMode}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!user && !authLoading,
    refetchInterval: 10000, // Refresh every 10s
  });

  // Mutation to update AI profile
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
      queryClient.invalidateQueries({ queryKey: ['/api/user/knowledge/digest'] });
      refetchDigest();
      toast({ title: 'Gespeichert', description: 'Business Intelligence aktualisiert.' });
      setIsEditingBusiness(false);
      setBiSaveError(null);
      setBiSaveSuccess(true);
      setTimeout(() => setBiSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      setBiSaveError(error.message || 'Speichern fehlgeschlagen');
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    }
  });

  const userProfile = (user as UserType) || {};
  const aiProfile = userProfile.aiProfile || {};

  // Start editing business intelligence
  const startEditingBusiness = () => {
    setEditedBusiness({
      companyDescription: aiProfile.companyDescription || '',
      targetAudience: aiProfile.targetAudience || '',
      effectiveKeywords: Array.isArray(aiProfile.effectiveKeywords) ? aiProfile.effectiveKeywords.join(', ') : '',
      competitors: Array.isArray(aiProfile.competitors) ? aiProfile.competitors.join(', ') : '',
      services: aiProfile.services || '',
    });
    setIsEditingBusiness(true);
  };

  // Save business intelligence
  const saveBusinessIntelligence = () => {
    setBiSaveError(null);
    setBiSaveSuccess(false);
    const updates = {
      companyDescription: editedBusiness.companyDescription,
      targetAudience: editedBusiness.targetAudience,
      effectiveKeywords: editedBusiness.effectiveKeywords.split(',').map((k: string) => k.trim()).filter(Boolean),
      competitors: editedBusiness.competitors.split(',').map((c: string) => c.trim()).filter(Boolean),
      services: editedBusiness.services,
    };
    updateAiProfileMutation.mutate(updates);
  };
  
  // Filter and sort data sources
  const filteredSources = dataSources
    .filter(s => filterType === 'all' || s.type === filterType)
    .filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (s.title?.toLowerCase().includes(q)) || 
             (s.contentText?.toLowerCase().includes(q)) ||
             (s.url?.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return (a.title || '').localeCompare(b.title || '');
    });
  
  // Copy context to clipboard
  const copyContextToClipboard = async () => {
    if (digestData?.digest) {
      await navigator.clipboard.writeText(digestData.digest);
      setCopiedContext(true);
      toast({ title: 'Kopiert', description: 'Kontext in Zwischenablage kopiert.' });
      setTimeout(() => setCopiedContext(false), 2000);
    }
  };

  // Handle add data source
  const handleAddDataSource = async () => {
    setAddSourceError(null); // Clear previous error
    
    // Debug logging
    console.log('[ADD_SOURCE] Click', {
      type: newDataSource.type,
      title: newDataSource.title,
      textLen: newDataSource.content?.length || 0,
      url: newDataSource.url,
      hasFile: !!selectedFile
    });

    // Validation
    if (newDataSource.type === 'text' && !newDataSource.content.trim()) {
      setAddSourceError('Bitte Textinhalt eingeben');
      return;
    }
    if (newDataSource.type === 'url' && !newDataSource.url.trim()) {
      setAddSourceError('Bitte URL eingeben');
      return;
    }
    if (newDataSource.type === 'file') {
      setAddSourceError('Datei-Upload kommt bald. Bitte nutze Text oder URL.');
      return;
    }

    setIsAddingSource(true);

    try {
      let response: Response;

      // File upload is disabled - this block should not be reached due to validation above
      if (newDataSource.type === 'file') {
        throw new Error('Datei-Upload ist noch nicht verfügbar');
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

      console.log('[ADD_SOURCE] ✅ Success! userId from response:', data.userId);
      toast({ title: 'Erfolg', description: 'Datenquelle hinzugefügt!' });
      
      // Invalidate ALL relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user/data-sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/knowledge/digest', 'space'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/knowledge/digest', 'power'] });
      
      // Refetch data
      refetchDataSources();
      refetchDigest();
      
      setShowAddDataDialog(false);
      setNewDataSource({ type: 'text', title: '', content: '', url: '' });
      setSelectedFile(null);
      setAddSourceError(null);
    } catch (error: any) {
      console.error('[ADD_SOURCE] Error:', error);
      const errMsg = error.message || 'Datenquelle konnte nicht hinzugefügt werden';
      setAddSourceError(errMsg); // Persistent error display
      toast({ title: 'Fehler', description: errMsg, variant: 'destructive' });
    } finally {
      setIsAddingSource(false);
    }
  };

  // Handle delete data source
  const handleDeleteDataSource = async (id: number) => {
    try {
      const response = await fetch(`/api/user/data-sources/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast({ title: 'Gelöscht', description: 'Datenquelle entfernt.' });
      refetchDataSources();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Animated KPI counters
  const animatedSources = useAnimatedCounter(dataSources.length);
  const animatedMessages = useAnimatedCounter(subscriptionData?.aiMessagesUsed || 0);
  const animatedCalls = useAnimatedCounter(subscriptionData?.voiceCallsUsed || 0);
  
  // Data pulse animation state
  const [showDataPulse, setShowDataPulse] = useState(false);
  
  // Trigger data pulse periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setShowDataPulse(true);
      setTimeout(() => setShowDataPulse(false), 800);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#050508]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#ff6a00] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Memory Vault laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#050508] via-[#080810] to-[#0a0a12]">
      {/* ═══════════════════════════════════════════════════════════════════
          FIXED BACKGROUND LAYERS - Never affect scroll
      ═══════════════════════════════════════════════════════════════════ */}
      
      {/* Matrix Data Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,106,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,106,0,0.03) 1px, transparent 1px),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff6a00' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `,
          backgroundSize: '40px 40px, 40px 40px, 60px 60px',
          animation: 'arasMatrixDrift 45s linear infinite'
        }}
      />
      
      {/* Neural Particle Field */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle 800px at 10% 20%, rgba(255,106,0,0.04) 0%, transparent 50%),
            radial-gradient(circle 600px at 90% 80%, rgba(233,215,196,0.03) 0%, transparent 50%),
            radial-gradient(circle 400px at 50% 50%, rgba(255,106,0,0.02) 0%, transparent 50%)
          `,
          animation: 'arasNeuralPulse 30s ease-in-out infinite'
        }}
      />
      
      {/* Data Pulse Effect */}
      <AnimatePresence>
        {showDataPulse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(255,106,0,0.08) 0%, transparent 50%)'
            }}
          />
        )}
      </AnimatePresence>
      
      {/* ═══════════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT - pb-40 ensures bottom padding for widgets
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-32 sm:pb-40 w-full max-w-[1400px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION A: HERO HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <motion.div 
          ref={heroRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Scanline effect on mount */}
          {hasMounted && (
            <motion.div
              initial={{ left: '-100%' }}
              animate={{ left: '100%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-[#ff6a00]/20 to-transparent pointer-events-none z-20"
              style={{ filter: 'blur(8px)' }}
            />
          )}
          
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff6a00] to-[#e9d7c4] flex items-center justify-center shadow-[0_0_30px_rgba(255,106,0,0.3)]">
                  <Database className="w-7 h-7 text-black" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#050508] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
              <div>
                <h1 
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold aras-headline-gradient tracking-tight" 
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Wissensdatenbank
                </h1>
                <p className="text-sm text-white/50 mt-1">
                  Verwalte deine KI-Datenquellen und Business Intelligence
                </p>
              </div>
            </div>
            
            {/* Status Chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-white/70 font-medium">LIVE</span>
              </div>
              <div className="px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full">
                <span className="text-xs text-white/50">Aktualisiert: </span>
                <span className="text-xs text-white/70">{format(new Date(), 'HH:mm', { locale: de })}</span>
              </div>
              <div className="px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-[#ff6a00]/30 rounded-full">
                <span className="text-xs text-[#ff6a00] font-medium uppercase">{digestMode}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION B: KPI ROW
        ═══════════════════════════════════════════════════════════════════ */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {/* Datenquellen */}
          <div className="group relative bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-[20px] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.4)] hover:border-[#ff6a00]/30 hover:shadow-[0_0_30px_rgba(255,106,0,0.1)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6a00]/20 to-[#ff6a00]/5 flex items-center justify-center">
                  <Database className="w-4.5 h-4.5 text-[#ff6a00]" />
                </div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Quellen</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {animatedSources}
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(dataSources.length * 10, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-[#ff6a00] to-[#e9d7c4] rounded-full"
                />
              </div>
            </div>
          </div>
          
          {/* KI-Nachrichten */}
          <div className="group relative bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-[20px] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.4)] hover:border-[#ff6a00]/30 hover:shadow-[0_0_30px_rgba(255,106,0,0.1)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6a00]/20 to-[#ff6a00]/5 flex items-center justify-center">
                  <MessageSquare className="w-4.5 h-4.5 text-[#ff6a00]" />
                </div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Nachrichten</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {animatedMessages}
                <span className="text-lg text-white/40 font-normal">/{subscriptionData?.aiMessagesLimit || 100}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((subscriptionData?.aiMessagesUsed || 0) / (subscriptionData?.aiMessagesLimit || 100)) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-[#ff6a00] to-[#e9d7c4] rounded-full"
                />
              </div>
            </div>
          </div>
          
          {/* Anrufe */}
          <div className="group relative bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-[20px] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.4)] hover:border-[#ff6a00]/30 hover:shadow-[0_0_30px_rgba(255,106,0,0.1)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6a00]/20 to-[#ff6a00]/5 flex items-center justify-center">
                  <Phone className="w-4.5 h-4.5 text-[#ff6a00]" />
                </div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Anrufe</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {animatedCalls}
                <span className="text-lg text-white/40 font-normal">/{subscriptionData?.voiceCallsLimit || 50}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((subscriptionData?.voiceCallsUsed || 0) / (subscriptionData?.voiceCallsLimit || 50)) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-[#ff6a00] to-[#e9d7c4] rounded-full"
                />
              </div>
            </div>
          </div>
          
          {/* Plan */}
          <div className="group relative bg-black/40 backdrop-blur-xl border border-[#ff6a00]/20 rounded-[20px] p-5 shadow-[0_0_0_1px_rgba(255,106,0,0.1),0_20px_50px_rgba(0,0,0,0.4)] hover:border-[#ff6a00]/40 hover:shadow-[0_0_40px_rgba(255,106,0,0.15)] transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a00]/10 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6a00]/30 to-[#e9d7c4]/20 flex items-center justify-center">
                  <Crown className="w-4.5 h-4.5 text-[#ff6a00]" />
                </div>
                <span className="text-[10px] text-[#ff6a00]/60 uppercase tracking-wider font-medium">Plan</span>
              </div>
              <div className="text-3xl font-bold text-[#ff6a00] mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {subscriptionData?.plan?.toUpperCase() || 'FREE'}
              </div>
              <div className="text-xs text-white/50">Aktives Abonnement</div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION C: "ALLES ÜBER DICH" - Profile + Business Intelligence
        ═══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Profile Card */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-[22px] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6a00]/20 to-[#e9d7c4]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#ff6a00]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>Profil</h2>
                <p className="text-xs text-white/40">Deine Kontoinformationen</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-[11px] text-white/40 uppercase tracking-wider">Name</div>
                <div className="text-sm text-white/90 font-medium">{userProfile.fullName || userProfile.username || 'Noch nicht hinterlegt'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-white/40 uppercase tracking-wider">E-Mail</div>
                <div className="text-sm text-white/90 font-medium truncate">{userProfile.email || 'Noch nicht hinterlegt'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-white/40 uppercase tracking-wider">Unternehmen</div>
                <div className="text-sm text-white/90 font-medium">{userProfile.company || 'Noch nicht hinterlegt'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-white/40 uppercase tracking-wider">Mitglied seit</div>
                <div className="text-sm text-white/90 font-medium">{safeFormatDate(userProfile.createdAt, 'dd.MM.yyyy')}</div>
              </div>
            </div>
          </div>

          {/* Business Intelligence Card */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-[22px] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.4)]">
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6a00]/20 to-[#e9d7c4]/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-[#ff6a00]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>Business Intelligence</h2>
                  <p className="text-xs text-white/40">Informationen über dein Unternehmen</p>
                </div>
              </div>
              {!isEditingBusiness ? (
                <Button
                  type="button"
                  onClick={startEditingBusiness}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs h-9 px-4 rounded-xl"
                >
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  Bearbeiten
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => { setIsEditingBusiness(false); setBiSaveError(null); }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs h-9 px-4 rounded-xl"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="button"
                    onClick={saveBusinessIntelligence}
                    disabled={updateAiProfileMutation.isPending}
                    className="bg-gradient-to-r from-[#ff6a00] to-[#ff8533] hover:from-[#ff6a00]/90 hover:to-[#ff8533]/90 text-white text-xs h-9 px-4 rounded-xl font-medium"
                  >
                    {updateAiProfileMutation.isPending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Speichern...
                      </>
                    ) : biSaveSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-2" />
                        Gespeichert
                      </>
                    ) : (
                      'Speichern'
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Persistent BI Save Error */}
            {biSaveError && (
              <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-400 font-medium">Speichern fehlgeschlagen</p>
                  <p className="text-xs text-red-400/70 mt-0.5">{biSaveError}</p>
                </div>
                <button type="button" onClick={() => setBiSaveError(null)} className="text-red-400/60 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="p-6">
              {isEditingBusiness ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="lg:col-span-2">
                    <label className="text-[11px] text-white/50 uppercase tracking-wider mb-2 block">Unternehmensbeschreibung</label>
                    <Textarea
                      value={editedBusiness.companyDescription}
                      onChange={(e) => setEditedBusiness({...editedBusiness, companyDescription: e.target.value})}
                      className="bg-black/40 border-white/10 text-white text-sm min-h-[100px] rounded-xl focus:border-[#ff6a00]/50 focus:ring-[#ff6a00]/20"
                      placeholder="Beschreibe dein Unternehmen..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 uppercase tracking-wider mb-2 block">Zielgruppe</label>
                    <Input
                      value={editedBusiness.targetAudience}
                      onChange={(e) => setEditedBusiness({...editedBusiness, targetAudience: e.target.value})}
                      className="bg-black/40 border-white/10 text-white text-sm rounded-xl focus:border-[#ff6a00]/50 focus:ring-[#ff6a00]/20"
                      placeholder="Wer sind deine Kunden?"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 uppercase tracking-wider mb-2 block">Dienstleistungen</label>
                    <Input
                      value={editedBusiness.services}
                      onChange={(e) => setEditedBusiness({...editedBusiness, services: e.target.value})}
                      className="bg-black/40 border-white/10 text-white text-sm rounded-xl focus:border-[#ff6a00]/50 focus:ring-[#ff6a00]/20"
                      placeholder="Welche Dienstleistungen bietest du an?"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 uppercase tracking-wider mb-2 block">Keywords (kommagetrennt)</label>
                    <Input
                      value={editedBusiness.effectiveKeywords}
                      onChange={(e) => setEditedBusiness({...editedBusiness, effectiveKeywords: e.target.value})}
                      className="bg-black/40 border-white/10 text-white text-sm rounded-xl focus:border-[#ff6a00]/50 focus:ring-[#ff6a00]/20"
                      placeholder="Keyword1, Keyword2, ..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 uppercase tracking-wider mb-2 block">Wettbewerber (kommagetrennt)</label>
                    <Input
                      value={editedBusiness.competitors}
                      onChange={(e) => setEditedBusiness({...editedBusiness, competitors: e.target.value})}
                      className="bg-black/40 border-white/10 text-white text-sm rounded-xl focus:border-[#ff6a00]/50 focus:ring-[#ff6a00]/20"
                      placeholder="Wettbewerber1, Wettbewerber2, ..."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="lg:col-span-2 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Unternehmensbeschreibung</div>
                    <div className="text-sm text-white/80 leading-relaxed">
                      {aiProfile.companyDescription || <span className="text-white/40 italic">Noch nicht hinterlegt</span>}
                    </div>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Zielgruppe</div>
                    <div className="text-sm text-white/80">{aiProfile.targetAudience || <span className="text-white/40 italic">Noch nicht hinterlegt</span>}</div>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Dienstleistungen</div>
                    <div className="text-sm text-white/80">{aiProfile.services || <span className="text-white/40 italic">Noch nicht hinterlegt</span>}</div>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Keywords</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(aiProfile.effectiveKeywords) && aiProfile.effectiveKeywords.length > 0 ? (
                        aiProfile.effectiveKeywords.map((kw: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-[#ff6a00]/10 border border-[#ff6a00]/20 rounded-lg text-xs text-[#ff6a00]">
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-white/40 italic">Noch nicht hinterlegt</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Wettbewerber</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(aiProfile.competitors) && aiProfile.competitors.length > 0 ? (
                        aiProfile.competitors.map((comp: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70">
                            {comp}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-white/40 italic">Noch nicht hinterlegt</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION D: DATA SOURCES - Database Style
        ═══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-[22px] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.4)]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6a00]/20 to-[#e9d7c4]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#ff6a00]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>Datenquellen</h2>
                  <p className="text-xs text-white/40">{dataSources.length} Quellen gespeichert</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setShowAddDataDialog(true)}
                className="bg-gradient-to-r from-[#ff6a00] to-[#ff8533] hover:from-[#ff6a00]/90 hover:to-[#ff8533]/90 text-white text-xs h-9 px-4 rounded-xl font-medium"
              >
                <Zap className="w-3.5 h-3.5 mr-2" />
                Hinzufügen
              </Button>
            </div>
            
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quellen durchsuchen..."
                  className="pl-10 bg-black/40 border-white/10 text-white text-sm rounded-xl h-9 focus:border-[#ff6a00]/50"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'text', 'url', 'file'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    disabled={type === 'file'}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      filterType === type 
                        ? 'bg-[#ff6a00] text-white' 
                        : type === 'file'
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {type === 'all' ? 'Alle' : type === 'file' ? 'Datei ⏳' : type.toUpperCase()}
                  </button>
                ))}
              </div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'title')}
                className="bg-black/40 border border-white/10 text-white/70 text-xs rounded-lg h-9 px-3 focus:border-[#ff6a00]/50"
              >
                <option value="newest">Neueste</option>
                <option value="oldest">Älteste</option>
                <option value="title">Titel A-Z</option>
              </select>
            </div>
          </div>
          
          {/* Sources List */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoadingDataSources ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#ff6a00] border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-sm text-white/40">Quellen laden...</span>
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <Database className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/60 text-sm mb-1">
                  {searchQuery ? 'Keine Ergebnisse gefunden' : 'Noch keine Datenquellen'}
                </p>
                <p className="text-white/40 text-xs">
                  {searchQuery ? 'Versuche einen anderen Suchbegriff' : 'Füge deine erste Quelle hinzu!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className="group p-4 hover:bg-white/[0.02] transition-all cursor-pointer"
                    onClick={() => setSelectedSource(source)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        source.type === 'text' ? 'bg-blue-500/10' : 'bg-green-500/10'
                      }`}>
                        {source.type === 'text' ? (
                          <FileText className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Link2 className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-medium ${
                            source.type === 'text' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {source.type}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                            source.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            source.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {source.status === 'active' ? 'Aktiv' : source.status === 'failed' ? 'Fehler' : 'Verarbeitung'}
                          </span>
                        </div>
                        <div className="text-sm text-white/90 font-medium truncate mb-1">
                          {source.title || source.fileName || source.url || 'Ohne Titel'}
                        </div>
                        <div className="text-xs text-white/40 line-clamp-2">
                          {source.contentText?.slice(0, 150) || source.url || 'Kein Inhalt'}
                        </div>
                        <div className="text-[11px] text-white/30 mt-2">
                          {safeDateLabel(source.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedSource(source); }}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteDataSource(source.id); }}
                          className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION F: CONTEXT PREVIEW - "ARAS BRAIN" Showpiece
        ═══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative bg-black/40 backdrop-blur-xl border border-[#ff6a00]/20 rounded-[22px] overflow-hidden shadow-[0_0_0_1px_rgba(255,106,0,0.1),0_20px_60px_rgba(0,0,0,0.5),0_0_80px_rgba(255,106,0,0.05)]"
        >
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-[22px] opacity-30" style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,106,0,0.3), transparent)',
            backgroundSize: '200% 100%',
            animation: 'arasShimmer 3s ease-in-out infinite'
          }} />
          
          <div className="relative p-6 border-b border-white/[0.06]">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff6a00] to-[#e9d7c4] flex items-center justify-center shadow-[0_0_30px_rgba(255,106,0,0.4)]">
                    <Brain className="w-6 h-6 text-black" />
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-[#ff6a00]/50 animate-ping opacity-20" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Kontext-Vorschau
                  </h2>
                  <p className="text-sm text-white/50">Was ARAS AI über dich weiß</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Premium Mode Toggle */}
                <div className="flex bg-black/60 border border-white/10 rounded-xl p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setDigestMode('space')}
                    className={`relative px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                      digestMode === 'space' 
                        ? 'bg-gradient-to-r from-[#ff6a00] to-[#ff8533] text-white shadow-[0_0_20px_rgba(255,106,0,0.4)]' 
                        : 'text-white/50 hover:text-white/70'
                    }`}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    SPACE
                  </button>
                  <button
                    type="button"
                    onClick={() => setDigestMode('power')}
                    className={`relative px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                      digestMode === 'power' 
                        ? 'bg-gradient-to-r from-[#ff6a00] to-[#ff8533] text-white shadow-[0_0_20px_rgba(255,106,0,0.4)]' 
                        : 'text-white/50 hover:text-white/70'
                    }`}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    POWER
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={copyContextToClipboard}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs h-10 px-4 rounded-xl"
                >
                  {copiedContext ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedContext ? 'Kopiert!' : 'Exportieren'}
                </Button>
                <a
                  href="/app/space"
                  className="inline-flex items-center bg-gradient-to-r from-[#ff6a00]/20 to-[#ff6a00]/10 hover:from-[#ff6a00]/30 hover:to-[#ff6a00]/20 border border-[#ff6a00]/30 text-[#ff6a00] text-xs h-10 px-4 rounded-xl transition-all font-medium"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Testen
                </a>
              </div>
            </div>
          </div>
          
          {/* Memory Density Visualization */}
          <div className="px-6 py-4 bg-black/20 border-b border-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Index Status */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Signal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-white/50">Index:</span>
                  <span className="text-xs text-emerald-400 font-medium">synchron</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#ff6a00]" />
                  <span className="text-xs text-white/50">Quellen:</span>
                  <span className="text-xs text-white font-bold">{digestData?.sourceCount ?? 0} aktiv</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#e9d7c4]" />
                  <span className="text-xs text-white/50">Kontext:</span>
                  <span className="text-xs text-white font-bold">{(digestData?.charCount ?? 0).toLocaleString()} Zeichen</span>
                </div>
              </div>
              
              {/* Memory Density Heatmap */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Kontextdichte</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const density = Math.min((digestData?.charCount ?? 0) / 50000, 1);
                    const threshold = i / 24;
                    const isActive = density > threshold;
                    const intensity = isActive ? Math.min((density - threshold) * 24, 1) : 0;
                    return (
                      <div
                        key={i}
                        className="w-1.5 h-4 rounded-sm transition-all duration-300"
                        style={{
                          backgroundColor: isActive 
                            ? `rgba(255, 106, 0, ${0.3 + intensity * 0.7})` 
                            : 'rgba(255,255,255,0.1)',
                          boxShadow: isActive && intensity > 0.5 
                            ? `0 0 ${4 + intensity * 4}px rgba(255,106,0,${intensity * 0.5})` 
                            : 'none'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            
            {digestData?.truncated && (
              <div className="mt-3 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg inline-flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400">Kontext wurde für optimale Performance gekürzt</span>
              </div>
            )}
          </div>
          
          {/* Developer Details (Collapsible) */}
          <div className="border-b border-white/[0.04]">
            <button
              type="button"
              onClick={() => setShowDevDetails(!showDevDetails)}
              className="w-full px-6 py-3 bg-black/20 cursor-pointer text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-2"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDevDetails ? 'rotate-90' : ''}`} />
              <Cpu className="w-3.5 h-3.5" />
              Entwicklerdetails
            </button>
            <AnimatePresence>
              {showDevDetails && (digestData as any)?.sourcesDebug && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 py-3 bg-black/30 text-xs font-mono border-t border-white/[0.04]">
                    <div className="text-white/40">
                      raw={((digestData as any).sourcesDebug?.rawCount) ?? '?'} | 
                      mapped={((digestData as any).sourcesDebug?.mappedCount) ?? '?'} | 
                      filtered={((digestData as any).sourcesDebug?.filteredCount) ?? '?'}
                    </div>
                    <div className="text-white/30 mt-1">
                      IDs: {((digestData as any).sourcesDebug?.ids || []).join(', ') || 'keine'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Context Panel - Terminal Glass */}
          <div className="p-6">
            <div className="relative">
              {/* Animated Neon Spine */}
              <motion.div 
                className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #ff6a00, #e9d7c4, #ff6a00)',
                  backgroundSize: '100% 200%'
                }}
                animate={{
                  backgroundPosition: ['0% 0%', '0% 100%', '0% 0%'],
                  boxShadow: [
                    '0 0 10px rgba(255,106,0,0.5)',
                    '0 0 20px rgba(255,106,0,0.8)',
                    '0 0 10px rgba(255,106,0,0.5)'
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={digestMode}
                  initial={{ opacity: 0, filter: 'blur(8px)', x: -10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', x: 0 }}
                  exit={{ opacity: 0, filter: 'blur(8px)', x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="ml-5"
                >
                  {/* Scanline on mode change */}
                  <motion.div
                    initial={{ top: 0 }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 0.3 }}
                    className="absolute left-5 right-0 h-px bg-gradient-to-r from-[#ff6a00] to-transparent opacity-60"
                    style={{ pointerEvents: 'none' }}
                  />
                  
                  <pre className="bg-black/50 border border-white/[0.06] rounded-xl p-5 text-sm text-white/80 font-mono overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                    {digestData?.digest || 'Lade Kontext...'}
                  </pre>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Source Detail Drawer */}
      <AnimatePresence>
        {selectedSource && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSelectedSource(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-[#0a0a12] border-l border-white/10 z-50 flex flex-col"
            >
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Quelle Details
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSource(null)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Titel</div>
                  <div className="text-white/90">{selectedSource.title || 'Ohne Titel'}</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Typ</div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg ${
                      selectedSource.type === 'text' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {selectedSource.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Status</div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg ${
                      selectedSource.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedSource.status === 'active' ? 'Aktiv' : selectedSource.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Erstellt am</div>
                  <div className="text-white/70 text-sm">{safeFormatDate(selectedSource.createdAt, 'dd.MM.yyyy HH:mm')}</div>
                </div>
                {selectedSource.url && (
                  <div>
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">URL</div>
                    <a href={selectedSource.url} target="_blank" rel="noopener noreferrer" className="text-[#ff6a00] text-sm hover:underline break-all">
                      {selectedSource.url}
                    </a>
                  </div>
                )}
                <div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Inhalt</div>
                  <pre className="bg-black/40 border border-white/[0.06] rounded-xl p-4 text-sm text-white/70 font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                    {selectedSource.contentText || 'Kein Inhalt verfügbar'}
                  </pre>
                </div>
              </div>
              <div className="p-6 border-t border-white/[0.06] flex gap-3">
                <Button
                  type="button"
                  onClick={async () => {
                    if (selectedSource.contentText) {
                      await navigator.clipboard.writeText(selectedSource.contentText);
                      toast({ title: 'Kopiert', description: 'Inhalt in Zwischenablage kopiert.' });
                    }
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm h-10 rounded-xl"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Kopieren
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    handleDeleteDataSource(selectedSource.id);
                    setSelectedSource(null);
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm h-10 px-4 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Data Source Dialog */}
      <Dialog open={showAddDataDialog} onOpenChange={(open) => { setShowAddDataDialog(open); if (open) setAddSourceError(null); }}>
        <DialogContent className="bg-[#111] border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Datenquelle hinzufügen</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Informationen hinzufügen, um deinen KI-Assistenten zu verbessern
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Persistent Error Display */}
            {addSourceError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{addSourceError}</p>
              </div>
            )}
            
            {/* Type Selection */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Typ</label>
              <div className="flex gap-2">
                {(['text', 'url', 'file'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setNewDataSource({...newDataSource, type: t}); setSelectedFile(null); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      newDataSource.type === t 
                        ? 'bg-[#FE9100] text-white' 
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {t === 'file' ? 'Datei' : t === 'text' ? 'Text' : 'URL'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Title */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Titel (optional)</label>
              <Input
                value={newDataSource.title}
                onChange={(e) => setNewDataSource({...newDataSource, title: e.target.value})}
                placeholder="z.B. Produktkatalog"
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
            
            {/* Content based on type */}
            {newDataSource.type === 'text' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Textinhalt</label>
                <Textarea
                  value={newDataSource.content}
                  onChange={(e) => setNewDataSource({...newDataSource, content: e.target.value})}
                  placeholder="Füge deinen Text hier ein..."
                  className="bg-white/5 border-white/10 text-white text-sm min-h-[120px]"
                />
                <p className="text-xs text-gray-500 mt-1">{newDataSource.content.length} / 50,000</p>
              </div>
            )}

            {newDataSource.type === 'url' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">URL</label>
                <Input
                  value={newDataSource.url}
                  onChange={(e) => setNewDataSource({...newDataSource, url: e.target.value})}
                  placeholder="https://example.com/page"
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
            )}

            {newDataSource.type === 'file' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Datei-Upload</label>
                <div className="border border-dashed border-white/20 rounded-lg p-6 text-center bg-white/5">
                  <p className="text-[#FE9100] text-sm font-medium">Kommt bald</p>
                  <p className="text-gray-500 text-xs mt-1">Datei-Upload wird in Kürze verfügbar sein.</p>
                  <p className="text-gray-500 text-xs mt-2">Nutze vorerst Text oder URL.</p>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowAddDataDialog(false); setSelectedFile(null); }}
                className="border-white/20 text-gray-300 hover:bg-white/10 text-sm"
                disabled={isAddingSource}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={handleAddDataSource}
                disabled={isAddingSource}
                className="bg-[#FE9100] hover:bg-[#FE9100]/80 text-white text-sm"
              >
                {isAddingSource ? 'Hinzufügen...' : 'Hinzufügen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for info rows with "Noch nicht hinterlegt" for empty values
function InfoRow({ label, value, onAdd }: { label: string; value: string; onAdd?: () => void }) {
  const isEmpty = !value || value === 'Nicht gesetzt' || value === '—';
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      {isEmpty ? (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <span>Noch nicht hinterlegt</span>
          {onAdd && (
            <button 
              onClick={onAdd}
              className="text-[#ff6a00] hover:underline text-xs"
            >
              Jetzt hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-white truncate">{value}</div>
      )}
    </div>
  );
}

// Export with ErrorBoundary wrapper to prevent black screen crashes
export default function Leads() {
  return (
    <LeadsErrorBoundary>
      <LeadsContent />
    </LeadsErrorBoundary>
  );
}
