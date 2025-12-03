import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Upload, Megaphone, Users, Phone, Settings as SettingsIcon, Play, Pause, FileText } from 'lucide-react';
import type { User, SubscriptionResponse } from "@shared/schema";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

// ARAS CI
const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00',
  black: '#0a0a0a'
};

export default function Campaigns() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(100);
  
  // Intelligente personalisierte Felder
  const [targetProduct, setTargetProduct] = useState('');
  const [callObjective, setCallObjective] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [specialOffers, setSpecialOffers] = useState('');
  const [objectionHandling, setObjectionHandling] = useState('');

  // Fetch subscription
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  const handleSectionChange = (section: string) => {
    window.location.href = section === 'space' ? '/app' : `/app/${section}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast({
        title: 'Ungültiger Dateityp',
        description: 'Bitte laden Sie eine CSV oder XLSX Datei hoch.',
        variant: 'destructive'
      });
      return;
    }

    setUploadedFile(file);
    toast({
      title: 'Datei hochgeladen',
      description: `${file.name} erfolgreich geladen.`
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileUpload(fakeEvent);
    }
  };

  const handleStartCampaign = async () => {
    if (!campaignName || !targetProduct || !callObjective || !uploadedFile) {
      toast({
        title: 'Fehlende Angaben',
        description: 'Bitte füllen Sie alle Pflichtfelder (*) aus und laden Sie eine Kontaktliste hoch.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Kampagne wird gestartet',
      description: 'ARAS AI analysiert Ihre Zielgruppe und passt Gespräche individuell an...'
    });

    // TODO: Implementiere Backend-Integration
  };

  // Generiere personalisierte Vorschläge basierend auf User-Daten
  const getProductSuggestions = () => {
    const aiProfile = user?.aiProfile as any;
    if (!aiProfile) return [];
    
    const suggestions = [];
    if (aiProfile.products && aiProfile.products.length > 0) {
      suggestions.push(...aiProfile.products.slice(0, 3));
    }
    if (aiProfile.services && aiProfile.services.length > 0) {
      suggestions.push(...aiProfile.services.slice(0, 3));
    }
    return suggestions;
  };

  const getAudienceSuggestions = () => {
    const aiProfile = user?.aiProfile as any;
    if (!aiProfile) return [];
    
    const suggestions = [];
    if (aiProfile.targetAudience) {
      suggestions.push(aiProfile.targetAudience);
    }
    if (user?.industry) {
      suggestions.push(`${user.industry}-Unternehmen`);
      suggestions.push(`Entscheider in ${user.industry}`);
    }
    return suggestions;
  };

  const productSuggestions = getProductSuggestions();
  const audienceSuggestions = getAudienceSuggestions();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" 
          style={{ borderColor: CI.orange, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Premium ARAS background */}
      <div className="absolute inset-0 opacity-[0.14] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FE9100]/10 via-transparent to-[#A34E00]/10" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 22% 30%, rgba(254,145,0,0.09) 0%, transparent 55%),
              radial-gradient(circle at 78% 70%, rgba(163,78,0,0.07) 0%, transparent 55%),
              radial-gradient(circle at 50% 50%, rgba(233,215,196,0.05) 0%, transparent 65%)`
          }}
        />
      </div>

      <Sidebar
        activeSection="campaigns"
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden content-zoom">
        <TopBar
          currentSection="campaigns"
          subscriptionData={subscriptionData}
          user={user as User}
          isVisible={true}
        />

        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.h1
                className="text-5xl font-black mb-4"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange}, ${CI.goldDark})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                KAMPAGNEN
              </motion.h1>

              <p className="text-gray-400 text-sm">
                Starten Sie professionelle Massencall-Kampagnen mit bis zu <span style={{ color: CI.orange, fontWeight: 600 }}>10.000</span> gleichzeitigen Anrufen
              </p>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEFT: Campaign Setup */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-2xl p-8"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {/* Brand Tag */}
                <div className="mb-8 flex items-center justify-center">
                  <img src={arasLogo} alt="ARAS" className="w-8 h-8 object-contain mr-2" />
                  <div
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                    className="text-lg font-bold"
                  >
                    KAMPAGNEN-SETUP
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Campaign Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Kampagnenname*</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="z.B. Q1 2025 Akquise"
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Produkt/Dienstleistung - MIT VORSCHLÄGEN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Welches Produkt / Dienstleistung verkaufen?*
                    </label>
                    <input
                      type="text"
                      value={targetProduct}
                      onChange={(e) => setTargetProduct(e.target.value)}
                      placeholder={productSuggestions[0] || `z.B. ${user?.company ? user.company + ' Lösung' : 'Premium Software'}`}
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {/* Schnellauswahl aus Profil */}
                    {productSuggestions.length > 0 && !targetProduct && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {productSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setTargetProduct(suggestion)}
                            className="px-3 py-1 rounded-full text-xs transition-all"
                            style={{
                              background: 'rgba(254,145,0,0.1)',
                              border: '1px solid rgba(254,145,0,0.3)',
                              color: CI.goldLight
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anrufziel */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Was ist das Ziel des Anrufs?*
                    </label>
                    <select
                      value={callObjective}
                      onChange={(e) => setCallObjective(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                    >
                      <option value="">Ziel auswählen...</option>
                      <option value="termin">Termin vereinbaren</option>
                      <option value="demo">Produktdemo anbieten</option>
                      <option value="angebot">Angebot unterbreiten</option>
                      <option value="qualifikation">Lead qualifizieren</option>
                      <option value="reaktivierung">Kunden reaktivieren</option>
                      <option value="feedback">Feedback einholen</option>
                      <option value="upsell">Upselling / Cross-Selling</option>
                      <option value="event">Event-Einladung</option>
                    </select>
                  </div>

                  {/* Zielgruppe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      An wen richtet sich die Kampagne?
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder={audienceSuggestions[0] || 'z.B. Geschäftsführer mittelständischer Unternehmen'}
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {audienceSuggestions.length > 0 && !targetAudience && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {audienceSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setTargetAudience(suggestion)}
                            className="px-3 py-1 rounded-full text-xs transition-all"
                            style={{
                              background: 'rgba(254,145,0,0.1)',
                              border: '1px solid rgba(254,145,0,0.3)',
                              color: CI.goldLight
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Kernbotschaft */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Kernbotschaft / USP
                    </label>
                    <textarea
                      value={keyMessage}
                      onChange={(e) => setKeyMessage(e.target.value)}
                      placeholder="Was macht Ihr Angebot einzigartig? Was ist der Hauptnutzen?"
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all resize-none text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Erwünschtes Ergebnis */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gewünschtes Ergebnis
                    </label>
                    <input
                      type="text"
                      value={desiredOutcome}
                      onChange={(e) => setDesiredOutcome(e.target.value)}
                      placeholder="z.B. Termin in Kalender eintragen, Ja zur Demo"
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Follow-Up Aktion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Follow-Up Aktion
                    </label>
                    <input
                      type="text"
                      value={followUpAction}
                      onChange={(e) => setFollowUpAction(e.target.value)}
                      placeholder="z.B. Email mit Unterlagen senden, Rückruf vereinbaren"
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Spezielle Angebote */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Spezielle Angebote / Aktionen
                    </label>
                    <input
                      type="text"
                      value={specialOffers}
                      onChange={(e) => setSpecialOffers(e.target.value)}
                      placeholder="z.B. 20% Rabatt für Erstbesteller, kostenloser Test"
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Einwandbehandlung */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Häufige Einwände & Antworten
                    </label>
                    <textarea
                      value={objectionHandling}
                      onChange={(e) => setObjectionHandling(e.target.value)}
                      placeholder='z.B. "Zu teuer" → Wir bieten flexible Zahlungsmodelle'
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all resize-none text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(254,145,0,0.45)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(254,145,0,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Kontaktliste (CSV/XLSX)*</label>
                    <div
                      className="rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer"
                      style={{
                        borderColor: uploadedFile ? CI.orange + '60' : 'rgba(255,255,255,0.15)',
                        background: uploadedFile ? 'rgba(254,145,0,0.05)' : 'rgba(0,0,0,0.25)'
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('fileInput')?.click()}
                    >
                      <input
                        id="fileInput"
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Upload className="w-10 h-10 mx-auto mb-2" style={{ color: uploadedFile ? CI.orange : '#6b7280' }} />
                      {uploadedFile ? (
                        <>
                          <p className="text-white font-medium text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-300 text-sm">Datei hier ablegen oder klicken</p>
                          <p className="text-xs text-gray-500 mt-1">CSV oder XLSX (Name, Firma, Telefon)</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Max Concurrent Calls */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gleichzeitige Anrufe: <span style={{ color: CI.orange, fontWeight: 700 }}>{maxConcurrentCalls}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="10000"
                      step="10"
                      value={maxConcurrentCalls}
                      onChange={(e) => setMaxConcurrentCalls(parseInt(e.target.value))}
                      className="w-full"
                      style={{
                        accentColor: CI.orange
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10</span>
                      <span>5.000</span>
                      <span>10.000</span>
                    </div>
                  </div>

                  {/* Personalisierungs-Hinweis */}
                  <div className="rounded-xl p-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.08), rgba(233, 215, 196, 0.05))',
                      border: '1px solid rgba(254, 145, 0, 0.2)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'rgba(254, 145, 0, 0.15)',
                          border: '1px solid rgba(254, 145, 0, 0.3)'
                        }}
                      >
                        <Users className="w-4 h-4" style={{ color: CI.orange }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white mb-1">KI-Personalisierung aktiv</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          ARAS AI nutzt Ihre Profildaten ({user?.company || 'Unternehmen'}, {user?.industry || 'Branche'}) 
                          und analysiert für jeden Kontakt bis zu 500 Quellen für maximale Relevanz.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={handleStartCampaign}
                    disabled={!campaignName || !targetProduct || !callObjective || !uploadedFile}
                    className="w-full py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: !campaignName || !targetProduct || !callObjective || !uploadedFile
                        ? 'rgba(100, 100, 100, 0.3)'
                        : `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                      border: `1px solid ${!campaignName || !targetProduct || !callObjective || !uploadedFile ? 'rgba(255, 255, 255, 0.1)' : CI.orange}`,
                      color: '#fff',
                      boxShadow: !campaignName || !targetProduct || !callObjective || !uploadedFile ? 'none' : `0 8px 30px ${CI.orange}40`,
                      fontFamily: 'Orbitron, sans-serif'
                    }}
                  >
                    <Play className="w-5 h-5" />
                    <span>KAMPAGNE STARTEN</span>
                  </button>
                </div>
              </motion.div>

              {/* RIGHT: Info & Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Info Card */}
                <div className="rounded-2xl p-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(254, 145, 0, 0.1), rgba(233, 215, 196, 0.05))',
                    border: '1px solid rgba(254, 145, 0, 0.2)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Megaphone className="w-6 h-6" style={{ color: CI.orange }} />
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      Massencalls mit ARAS AI
                    </h3>
                  </div>
                  <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
                    <p>
                      <span style={{ color: CI.orange, fontWeight: 600 }}>ARAS AI</span> analysiert für jeden Kontakt bis zu{' '}
                      <span style={{ color: CI.goldLight, fontWeight: 600 }}>500 öffentliche Quellen</span> – 
                      Webseiten, Handelsregister, Presse, Social Profiles und mehr.
                    </p>
                    <p>
                      Das Gespräch wird präzise an Person, Firma und Kontext angepasst – 
                      für <span style={{ color: CI.orange }}>maximale Erfolgsquote</span>.
                    </p>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Phone, label: 'Gleichzeitig', value: '10.000', color: CI.orange },
                    { icon: Users, label: 'Personalisiert', value: '100%', color: CI.goldLight },
                  ].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + (idx * 0.1) }}
                      className="rounded-xl p-5 text-center"
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                    >
                      <stat.icon className="w-8 h-8 mx-auto mb-2" style={{ color: stat.color }} />
                      <div className="text-2xl font-black" style={{ color: stat.color, fontFamily: 'Orbitron, sans-serif' }}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Requirements */}
                <div className="rounded-xl p-6"
                  style={{
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5" style={{ color: CI.orange }} />
                    <h4 className="text-sm font-bold text-white">Anforderungen an die Datei</h4>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-start gap-2">
                      <span style={{ color: CI.orange }}>•</span>
                      <span>Format: CSV oder XLSX</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: CI.orange }}>•</span>
                      <span>Pflicht-Spalten: Name, Firma, Telefon</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: CI.orange }}>•</span>
                      <span>Telefon-Format: +49... (international)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: CI.orange }}>•</span>
                      <span>Optional: Email, Position, Website</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}
