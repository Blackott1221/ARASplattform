import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Contact {
  id: number;
  company?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
}

interface ContactAutoSuggestProps {
  value: string;
  onChange: (value: string) => void;
  onSelectContact: (contact: Contact) => void;
  contacts: Contact[];
  placeholder?: string;
  disabled?: boolean;
}

export function ContactAutoSuggest({
  value,
  onChange,
  onSelectContact,
  contacts,
  placeholder = "Max Mustermann GmbH",
  disabled = false
}: ContactAutoSuggestProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fuzzy match helper
  const fuzzyMatch = (str: string, query: string): boolean => {
    if (!str || !query) return false;
    const lowerStr = str.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact match
    if (lowerStr.includes(lowerQuery)) return true;
    
    // Fuzzy match (all chars in order)
    let strIdx = 0;
    for (let i = 0; i < lowerQuery.length; i++) {
      const idx = lowerStr.indexOf(lowerQuery[i], strIdx);
      if (idx === -1) return false;
      strIdx = idx + 1;
    }
    return true;
  };

  useEffect(() => {
    if (value.length < 2) {
      setFilteredContacts([]);
      setShowSuggestions(false);
      return;
    }

    const lowerQuery = value.toLowerCase();
    
    const filtered = contacts
      .filter(contact => {
        return (
          fuzzyMatch(contact.company || '', value) ||
          fuzzyMatch(contact.firstName || '', value) ||
          fuzzyMatch(contact.lastName || '', value) ||
          fuzzyMatch(contact.phone || contact.phoneNumber || '', value) ||
          fuzzyMatch(contact.email || '', value) ||
          fuzzyMatch(`${contact.firstName} ${contact.lastName}`, value)
        );
      })
      .sort((a, b) => {
        // Volltreffer zuerst (Name/Firma beginnt mit Query)
        const aCompany = (a.company || '').toLowerCase();
        const bCompany = (b.company || '').toLowerCase();
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        
        const aStartsWithCompany = aCompany.startsWith(lowerQuery);
        const bStartsWithCompany = bCompany.startsWith(lowerQuery);
        const aStartsWithName = aName.startsWith(lowerQuery);
        const bStartsWithName = bName.startsWith(lowerQuery);
        
        if ((aStartsWithCompany || aStartsWithName) && !(bStartsWithCompany || bStartsWithName)) return -1;
        if (!(aStartsWithCompany || aStartsWithName) && (bStartsWithCompany || bStartsWithName)) return 1;
        
        return 0;
      })
      .slice(0, 6);

    setFilteredContacts(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [value, contacts]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (contact: Contact) => {
    const displayName = contact.company || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    onChange(displayName);
    onSelectContact(contact);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-neutral-500 transition-all outline-none"
        style={{
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.14)'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#FE9100';
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(254,145,0,0.3), 0 0 18px rgba(254,145,0,0.35)';
          if (value.length >= 2) {
            setShowSuggestions(true);
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />

      <AnimatePresence>
        {showSuggestions && filteredContacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute w-full rounded-2xl overflow-hidden"
            style={{
              top: 'calc(100% + 8px)',
              maxHeight: '260px',
              overflowY: 'auto',
              zIndex: 40,
              background: 'rgba(12,12,12,0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
              backdropFilter: 'blur(20px)'
            }}
          >
            {filteredContacts.map((contact, idx) => (
              <button
                key={contact.id}
                onClick={() => handleSelect(contact)}
                className="w-full text-left px-4 py-3 transition-all"
                style={{
                  borderBottom: idx < filteredContacts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(254,145,0,0.3) inset';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(233,215,196,0.16), rgba(254,145,0,0.18))',
                      border: '1px solid rgba(254,145,0,0.3)',
                      color: '#FE9100'
                    }}
                  >
                    {(contact.company?.[0] || contact.firstName?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {contact.company || `${contact.firstName} ${contact.lastName}`.trim() || 'Unbenannt'}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {contact.phone || contact.phoneNumber || contact.email || ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
