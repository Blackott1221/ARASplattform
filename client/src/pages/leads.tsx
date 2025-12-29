import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
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
import { ChevronDown, ChevronRight, Database, Brain, Sparkles, FileText, Link, Upload } from 'lucide-react';
import type { User as UserType, SubscriptionResponse } from '@shared/schema';
import '@/styles/animations.css';

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
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Fehler aufgetreten</h2>
            <p className="text-sm text-gray-400 mb-4">
              Die Wissensdatenbank konnte nicht geladen werden.
            </p>
            <pre className="text-xs text-red-300 bg-black/40 p-3 rounded-lg overflow-auto max-h-[100px] mb-4">
              {this.state.error?.message || 'Unbekannter Fehler'}
            </pre>
            <Button
              onClick={() => window.location.reload()}
              className="bg-[#FE9100] hover:bg-[#FE9100]/80 text-white"
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
  const [showAddDataDialog, setShowAddDataDialog] = useState(false);
  const [newDataSource, setNewDataSource] = useState({ type: 'text' as 'text' | 'url' | 'file', title: '', content: '', url: '' });
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addSourceError, setAddSourceError] = useState<string | null>(null); // Persistent error display
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState<any>({});
  
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    },
    onError: (error: any) => {
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
    const updates = {
      companyDescription: editedBusiness.companyDescription,
      targetAudience: editedBusiness.targetAudience,
      effectiveKeywords: editedBusiness.effectiveKeywords.split(',').map((k: string) => k.trim()).filter(Boolean),
      competitors: editedBusiness.competitors.split(',').map((c: string) => c.trim()).filter(Boolean),
      services: editedBusiness.services,
    };
    updateAiProfileMutation.mutate(updates);
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

  // Loading state
  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FE9100] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Header - ARAS CI with Orbitron + Animated Gradient */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6a00] to-[#e9d7c4] flex items-center justify-center">
              <Database className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold aras-headline-gradient" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Wissensdatenbank
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">Verwalte deine KI-Datenquellen und Business Intelligence</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>{format(new Date(), 'dd. MMM yyyy', { locale: de })}</div>
            <div className="text-gray-400">{format(new Date(), 'HH:mm')}</div>
          </div>
        </div>

        {/* Stats Row - Dark Glass Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
            <div className="text-xs text-gray-400 mb-1">Datenquellen</div>
            <div className="text-xl font-bold text-white">{dataSources.length}</div>
          </div>
          <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
            <div className="text-xs text-gray-400 mb-1">KI-Nachrichten</div>
            <div className="text-xl font-bold text-white">
              {subscriptionData?.aiMessagesUsed || 0} / {subscriptionData?.aiMessagesLimit || 100}
            </div>
          </div>
          <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
            <div className="text-xs text-gray-400 mb-1">Anrufe</div>
            <div className="text-xl font-bold text-white">
              {subscriptionData?.voiceCallsUsed || 0} / {subscriptionData?.voiceCallsLimit || 50}
            </div>
          </div>
          <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
            <div className="text-xs text-gray-400 mb-1">Plan</div>
            <div className="text-xl font-bold text-[#ff6a00]">{subscriptionData?.plan?.toUpperCase() || 'FREE'}</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Data Sources - Dark Glass Card */}
          <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ff6a00]" />
                <h2 className="text-base font-semibold text-white">Datenquellen</h2>
              </div>
              <Button
                type="button"
                onClick={() => setShowAddDataDialog(true)}
                size="sm"
                className="bg-[#FE9100] hover:bg-[#FE9100]/80 text-white text-xs h-8 px-3"
              >
                + Hinzufügen
              </Button>
            </div>
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {isLoadingDataSources ? (
                <div className="text-center py-8 text-gray-500">Laden...</div>
              ) : dataSources.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Noch keine Datenquellen. Füge deine erste hinzu!
                </div>
              ) : (
                dataSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300 uppercase">
                          {source.type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          source.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          source.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {source.status}
                        </span>
                      </div>
                      <div className="text-sm text-white mt-1 truncate">
                        {source.title || source.fileName || source.url || 'Ohne Titel'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {safeDateLabel(source.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDataSource(source.id)}
                      className="ml-2 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Business Intelligence - Dark Glass Card */}
          <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#ff6a00]" />
                <h2 className="text-base font-semibold text-white">Business Intelligence</h2>
              </div>
              {!isEditingBusiness ? (
                <Button
                  type="button"
                  onClick={startEditingBusiness}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 px-3 border-white/20 text-gray-300 hover:bg-white/10"
                >
                  Bearbeiten
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setIsEditingBusiness(false)}
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 px-3 border-white/20 text-gray-300 hover:bg-white/10"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="button"
                    onClick={saveBusinessIntelligence}
                    size="sm"
                    className="bg-[#FE9100] hover:bg-[#FE9100]/80 text-white text-xs h-8 px-3"
                    disabled={updateAiProfileMutation.isPending}
                  >
                    {updateAiProfileMutation.isPending ? 'Speichern...' : 'Speichern'}
                  </Button>
                </div>
              )}
            </div>
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {isEditingBusiness ? (
                <>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Unternehmensbeschreibung</label>
                    <Textarea
                      value={editedBusiness.companyDescription}
                      onChange={(e) => setEditedBusiness({...editedBusiness, companyDescription: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm min-h-[80px]"
                      placeholder="Beschreibe dein Unternehmen..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Zielgruppe</label>
                    <Input
                      value={editedBusiness.targetAudience}
                      onChange={(e) => setEditedBusiness({...editedBusiness, targetAudience: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="Wer sind deine Kunden?"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Keywords (kommagetrennt)</label>
                    <Input
                      value={editedBusiness.effectiveKeywords}
                      onChange={(e) => setEditedBusiness({...editedBusiness, effectiveKeywords: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="Keyword1, Keyword2, ..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Wettbewerber (kommagetrennt)</label>
                    <Input
                      value={editedBusiness.competitors}
                      onChange={(e) => setEditedBusiness({...editedBusiness, competitors: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="Wettbewerber1, Wettbewerber2, ..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Dienstleistungen</label>
                    <Textarea
                      value={editedBusiness.services}
                      onChange={(e) => setEditedBusiness({...editedBusiness, services: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm min-h-[60px]"
                      placeholder="Welche Dienstleistungen bietest du an?"
                    />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Unternehmen" value={aiProfile.companyDescription || 'Nicht gesetzt'} />
                  <InfoRow label="Zielgruppe" value={aiProfile.targetAudience || 'Nicht gesetzt'} />
                  <InfoRow label="Keywords" value={Array.isArray(aiProfile.effectiveKeywords) ? aiProfile.effectiveKeywords.join(', ') : 'Nicht gesetzt'} />
                  <InfoRow label="Wettbewerber" value={Array.isArray(aiProfile.competitors) ? aiProfile.competitors.join(', ') : 'Nicht gesetzt'} />
                  <InfoRow label="Dienstleistungen" value={aiProfile.services || 'Nicht gesetzt'} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info - Dark Glass Card */}
        <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff6a00]" />
            Profil
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoRow label="Name" value={userProfile.fullName || userProfile.username || 'Unbekannt'} />
            <InfoRow label="E-Mail" value={userProfile.email || 'Nicht gesetzt'} />
            <InfoRow label="Unternehmen" value={userProfile.company || 'Nicht gesetzt'} />
            <InfoRow label="Mitglied seit" value={safeFormatDate(userProfile.createdAt, 'dd.MM.yyyy')} />
          </div>
        </div>

        {/* Knowledge Context Preview (SPACE/POWER) - Dark Glass Card */}
        <div className="bg-black/45 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6a00]/20 to-[#e9d7c4]/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#ff6a00]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Kontext-Vorschau</h2>
                <p className="text-xs text-gray-500 mt-0.5">Was ARAS AI über dich weiß</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDigestMode('space')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  digestMode === 'space' ? 'bg-[#FE9100] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                SPACE
              </button>
              <button
                onClick={() => setDigestMode('power')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  digestMode === 'power' ? 'bg-[#FE9100] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                POWER
              </button>
            </div>
          </div>
          <div className="p-4">
            {/* Debug Stats Row */}
            <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-400">
              <span>Quellen: <span className="text-white font-medium">{digestData?.sourceCount ?? 0}</span></span>
              <span>Zeichen: <span className="text-white font-medium">{digestData?.charCount ?? 0}</span></span>
              <span>Modus: <span className="text-[#ff6a00] font-medium uppercase">{digestMode}</span></span>
              {digestData?.truncated && <span className="text-yellow-500">(gekürzt)</span>}
            </div>
            {/* Sources Debug Info */}
            {(digestData as any)?.sourcesDebug && (
              <div className="mb-3 p-2 bg-black/30 rounded-lg border border-white/5 text-xs">
                <div className="text-gray-500 mb-1">Debug: raw={((digestData as any).sourcesDebug?.rawCount) ?? '?'} mapped={((digestData as any).sourcesDebug?.mappedCount) ?? '?'} filtered={((digestData as any).sourcesDebug?.filteredCount) ?? '?'}</div>
                <div className="text-gray-400">IDs: {((digestData as any).sourcesDebug?.ids || []).join(', ') || 'keine'}</div>
              </div>
            )}
            <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap">
              {digestData?.digest || 'Lade Kontext...'}
            </pre>
          </div>
        </div>
      </div>

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
