import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Contact, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  User as UserIcon, 
  StickyNote,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  Users
} from 'lucide-react';
import type { User, SubscriptionResponse } from "@shared/schema";
import '@/styles/glassmorphism.css';

// ARAS CI
const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00',
  black: '#0a0a0a'
};

interface ContactData {
  id?: string;
  company: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function Contacts() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactData | null>(null);

  // Form State
  const [formData, setFormData] = useState<ContactData>({
    company: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Fetch subscription
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user,
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery<ContactData[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  // Create/Update contact mutation
  const saveMutation = useMutation({
    mutationFn: async (contact: ContactData) => {
      const url = contact.id ? `/api/contacts/${contact.id}` : '/api/contacts';
      const method = contact.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(contact)
      });
      if (!res.ok) throw new Error('Failed to save contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      resetForm();
      toast({
        title: editingContact ? 'Kontakt aktualisiert' : 'Kontakt hinzugefügt',
        description: 'Der Kontakt wurde erfolgreich gespeichert.'
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Kontakt konnte nicht gespeichert werden.',
        variant: 'destructive'
      });
    }
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: 'Kontakt gelöscht',
        description: 'Der Kontakt wurde erfolgreich entfernt.'
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Kontakt konnte nicht gelöscht werden.',
        variant: 'destructive'
      });
    }
  });

  const handleSectionChange = (section: string) => {
    window.location.href = section === 'space' ? '/app' : `/app/${section}`;
  };

  const resetForm = () => {
    setFormData({
      company: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      notes: ''
    });
    setEditingContact(null);
    setShowAddForm(false);
  };

  const handleEdit = (contact: ContactData) => {
    setEditingContact(contact);
    setFormData(contact);
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formData.company.trim()) {
      toast({
        title: 'Unternehmensname erforderlich',
        description: 'Bitte geben Sie mindestens einen Unternehmensnamen ein.',
        variant: 'destructive'
      });
      return;
    }

    saveMutation.mutate(editingContact ? { ...formData, id: editingContact.id } : formData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Möchten Sie diesen Kontakt wirklich löschen?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Premium Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{ 
            background: `radial-gradient(circle, ${CI.orange}12, transparent 70%)`,
            top: '-10%',
            left: '10%',
            filter: 'blur(60px)'
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{ 
            background: `radial-gradient(circle, ${CI.goldLight}08, transparent 70%)`,
            bottom: '-5%',
            right: '15%',
            filter: 'blur(70px)'
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <Sidebar
        activeSection="contacts"
        onSectionChange={handleSectionChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar
          currentSection="contacts"
          subscriptionData={subscriptionData}
          user={user as User}
          isVisible={true}
        />

        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-5xl mx-auto">
            {/* Header - ULTRA CLEAN */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-10"
            >
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl font-black mb-1.5 tracking-tight"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: `linear-gradient(120deg, ${CI.orange}, ${CI.goldLight})`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Kontakte
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-gray-500"
                >
                  {contacts.length} {contacts.length === 1 ? 'Kontakt' : 'Kontakte'} gespeichert
                </motion.p>
              </div>

              <motion.button
                whileHover={{ 
                  scale: 1.02, 
                  y: -3,
                  rotateX: 5,
                  rotateY: -5
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm text-black relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                  boxShadow: `0 4px 12px ${CI.orange}30`,
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                  }}
                  animate={{
                    x: ['-100%', '200%']
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                />
                <span className="relative flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Neu
                </span>
              </motion.button>
            </motion.div>

            {/* Stats - ULTRA MINIMAL mit TILT */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-2 mb-6"
            >
              <motion.div
                whileHover={{ 
                  y: -6, 
                  rotateX: 8,
                  rotateY: -8,
                  scale: 1.03
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative overflow-hidden rounded-lg p-3 cursor-pointer"
                style={{
                  background: 'rgba(254, 145, 0, 0.03)',
                  border: '1px solid rgba(254, 145, 0, 0.08)',
                  backdropFilter: 'blur(8px)',
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${CI.orange}08, transparent)`
                  }}
                />
                <div className="relative" style={{ transform: 'translateZ(20px)' }}>
                  <div className="text-2xl font-black mb-0.5" style={{ color: CI.orange }}>
                    {contacts.length}
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
                    Total
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ 
                  y: -6,
                  rotateX: 8,
                  scale: 1.03
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative overflow-hidden rounded-lg p-3 cursor-pointer"
                style={{
                  background: 'rgba(233, 215, 196, 0.03)',
                  border: '1px solid rgba(233, 215, 196, 0.08)',
                  backdropFilter: 'blur(8px)',
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${CI.goldLight}06, transparent)`
                  }}
                />
                <div className="relative" style={{ transform: 'translateZ(20px)' }}>
                  <div className="text-2xl font-black mb-0.5" style={{ color: CI.goldLight }}>
                    {contacts.filter(c => c.company).length}
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
                    Firmen
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ 
                  y: -6,
                  rotateX: 8,
                  rotateY: 8,
                  scale: 1.03
                }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative overflow-hidden rounded-lg p-3 cursor-pointer"
                style={{
                  background: 'rgba(254, 145, 0, 0.03)',
                  border: '1px solid rgba(254, 145, 0, 0.08)',
                  backdropFilter: 'blur(8px)',
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${CI.orange}08, transparent)`
                  }}
                />
                <div className="relative" style={{ transform: 'translateZ(20px)' }}>
                  <div className="text-2xl font-black mb-0.5" style={{ color: CI.orange }}>
                    {contacts.filter(c => c.phone && c.email).length}
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
                    Voll
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Search Bar - ULTRA MINIMAL */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative mb-5"
            >
              <motion.div
                whileFocus={{ scale: 1.005 }}
                className="relative overflow-hidden rounded-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(16px)'
                }}
              >
                <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <Search className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-700 text-sm"
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-white/5 rounded-md transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-gray-600" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Add/Edit Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-orange rounded-3xl p-6 mb-6 overflow-hidden"
                  style={{
                    boxShadow: `0 20px 60px ${CI.orange}20`
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">
                      {editingContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Unternehmensname (Pflichtfeld) */}
                    <div className="col-span-2">
                      <label className="block text-sm font-bold mb-2 text-gray-300">
                        Unternehmensname <span style={{ color: CI.orange }}>*</span>
                      </label>
                      <div className="relative">
                        <Building2 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                        />
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="z.B. ACME GmbH"
                          className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Vorname */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-300">
                        Vorname
                      </label>
                      <div className="relative">
                        <UserIcon 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                        />
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Max"
                          className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Nachname */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-300">
                        Nachname
                      </label>
                      <div className="relative">
                        <UserIcon 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                        />
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Mustermann"
                          className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Telefonnummer */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-300">
                        Telefonnummer
                      </label>
                      <div className="relative">
                        <Phone 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                        />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+49 123 456789"
                          className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* E-Mail */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-300">
                        E-Mail
                      </label>
                      <div className="relative">
                        <Mail 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                        />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="max@acme.de"
                          className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Notizen */}
                    <div className="col-span-2">
                      <label className="block text-sm font-bold mb-2 text-gray-300">
                        Notizen
                      </label>
                      <div className="relative">
                        <StickyNote 
                          className="absolute left-3 top-3 w-5 h-5 text-gray-400" 
                        />
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Weitere Informationen zum Unternehmen..."
                          rows={3}
                          className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-500/50 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      className="flex-1 py-3 px-6 rounded-xl font-bold text-black relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                        boxShadow: `0 8px 24px ${CI.orange}40`
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" />
                        {saveMutation.isPending ? 'Speichert...' : 'Speichern'}
                      </span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={resetForm}
                      className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      Abbrechen
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Contacts List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {contactsLoading ? (
                  <div className="text-center py-12 text-gray-400">
                    Lade Kontakte...
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card rounded-2xl p-12 text-center"
                  >
                    <Contact className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-bold text-gray-400 mb-2">
                      {searchQuery ? 'Keine Kontakte gefunden' : 'Noch keine Kontakte'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {searchQuery 
                        ? 'Versuchen Sie eine andere Suche' 
                        : 'Fügen Sie Ihren ersten Kontakt hinzu'}
                    </p>
                    {!searchQuery && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddForm(true)}
                        className="px-6 py-3 rounded-xl font-bold text-black"
                        style={{
                          background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          Ersten Kontakt hinzufügen
                        </span>
                      </motion.button>
                    )}
                  </motion.div>
                ) : (
                  filteredContacts.map((contact, index) => (
                    <motion.div
                      key={contact.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: -20 }}
                      transition={{ 
                        delay: index * 0.02,
                        type: "spring",
                        stiffness: 400,
                        damping: 20
                      }}
                      whileHover={{ 
                        y: -8,
                        rotateX: 5,
                        rotateY: 2,
                        scale: 1.01,
                        transition: { 
                          type: "spring",
                          stiffness: 400,
                          damping: 15
                        }
                      }}
                      className="group relative overflow-hidden rounded-lg p-3.5 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.015)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        backdropFilter: 'blur(16px)',
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                      }}
                    >
                      {/* Subtle Hover Glow */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: `radial-gradient(400px circle at 50% 0%, ${CI.orange}04, transparent)`,
                          pointerEvents: 'none'
                        }}
                      />

                      <div className="relative flex items-start gap-3" style={{ transform: 'translateZ(10px)' }}>
                        {/* Company Icon - MICRO */}
                        <motion.div
                          whileHover={{ 
                            rotate: -5, 
                            scale: 1.08,
                            transition: { type: "spring", stiffness: 500 }
                          }}
                          className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `${CI.orange}08`,
                            border: `1px solid ${CI.orange}15`
                          }}
                        >
                          <Building2 className="w-5 h-5" style={{ color: CI.orange }} />
                        </motion.div>

                        {/* Contact Info - ULTRA CLEAN */}
                        <div className="flex-1 min-w-0">
                          <motion.h3 
                            className="text-sm font-bold text-white mb-1.5 group-hover:text-orange-400 transition-colors duration-300"
                            style={{ letterSpacing: '-0.01em' }}
                          >
                            {contact.company}
                          </motion.h3>
                          
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                            {(contact.firstName || contact.lastName) && (
                              <motion.div 
                                className="flex items-center gap-1"
                                whileHover={{ x: 2, transition: { duration: 0.2 } }}
                              >
                                <UserIcon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                                </span>
                              </motion.div>
                            )}
                            {contact.phone && (
                              <motion.div 
                                className="flex items-center gap-1"
                                whileHover={{ x: 2, transition: { duration: 0.2 } }}
                              >
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                <span>{contact.phone}</span>
                              </motion.div>
                            )}
                            {contact.email && (
                              <motion.div 
                                className="flex items-center gap-1"
                                whileHover={{ x: 2, transition: { duration: 0.2 } }}
                              >
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[180px]">{contact.email}</span>
                              </motion.div>
                            )}
                          </div>

                          {contact.notes && (
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-1.5 text-[10px] text-gray-700 line-clamp-1 italic"
                            >
                              "{contact.notes}"
                            </motion.p>
                          )}
                        </div>

                        {/* Actions - MICRO BUTTONS */}
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 0, x: 0 }}
                          whileHover={{ opacity: 1 }}
                          className="flex gap-0.5 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <motion.button
                            whileHover={{ 
                              scale: 1.2, 
                              y: -3,
                              rotate: -5,
                              transition: { type: "spring", stiffness: 500 }
                            }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(contact);
                            }}
                            className="p-1.5 rounded-md transition-colors"
                            style={{
                              background: 'rgba(233, 215, 196, 0.08)',
                              border: '1px solid rgba(233, 215, 196, 0.15)'
                            }}
                            title="Bearbeiten"
                          >
                            <Pencil className="w-3.5 h-3.5" style={{ color: CI.goldLight }} />
                          </motion.button>

                          <motion.button
                            whileHover={{ 
                              scale: 1.2, 
                              y: -3,
                              rotate: 5,
                              transition: { type: "spring", stiffness: 500 }
                            }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contact.id!);
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-md transition-colors"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.15)'
                            }}
                            title="Löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </motion.button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}
