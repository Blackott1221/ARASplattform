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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-8"
            >
              <div>
                <h1
                  className="text-5xl font-black mb-2"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange}, ${CI.goldDark})`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  KONTAKTE
                </h1>
                <p className="text-gray-400">
                  Verwalten Sie Ihre Unternehmenskontakte zentral
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="px-6 py-3 rounded-xl font-bold text-black relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                  boxShadow: `0 10px 30px ${CI.orange}40`
                }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                  }}
                  animate={{
                    x: ['-100%', '200%']
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 0.5
                  }}
                />
                <span className="relative flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Neuer Kontakt
                </span>
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${CI.orange}20`,
                      border: `1px solid ${CI.orange}40`
                    }}
                  >
                    <Users className="w-6 h-6" style={{ color: CI.orange }} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{contacts.length}</div>
                    <div className="text-xs text-gray-400">Gesamt Kontakte</div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${CI.goldLight}20`,
                      border: `1px solid ${CI.goldLight}40`
                    }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: CI.goldLight }} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">
                      {contacts.filter(c => c.company).length}
                    </div>
                    <div className="text-xs text-gray-400">Unternehmen</div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${CI.orange}20`,
                      border: `1px solid ${CI.orange}40`
                    }}
                  >
                    <CheckCircle2 className="w-6 h-6" style={{ color: CI.orange }} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">
                      {contacts.filter(c => c.phone && c.email).length}
                    </div>
                    <div className="text-xs text-gray-400">Vollständig</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-4 mb-6"
            >
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Kontakte durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
                />
              </div>
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
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card glass-card-hover rounded-2xl p-5"
                    >
                      <div className="flex items-start gap-4">
                        {/* Company Icon */}
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${CI.orange}30, ${CI.goldDark}30)`,
                            border: `1px solid ${CI.orange}40`
                          }}
                        >
                          <Building2 className="w-7 h-7" style={{ color: CI.orange }} />
                        </div>

                        {/* Contact Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white mb-1">
                            {contact.company}
                          </h3>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            {(contact.firstName || contact.lastName) && (
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4" />
                                <span>
                                  {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                                </span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span>{contact.email}</span>
                              </div>
                            )}
                          </div>

                          {contact.notes && (
                            <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                              {contact.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(contact)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Bearbeiten"
                          >
                            <Pencil className="w-5 h-5" style={{ color: CI.goldLight }} />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(contact.id!)}
                            disabled={deleteMutation.isPending}
                            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </motion.button>
                        </div>
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
