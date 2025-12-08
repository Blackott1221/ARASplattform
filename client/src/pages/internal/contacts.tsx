/**
 * ============================================================================
 * ARAS COMMAND CENTER - CONTACTS
 * ============================================================================
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Plus, Mail, Phone, Building2 } from "lucide-react";
import InternalLayout from "@/components/internal/internal-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InternalContacts() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['/api/internal/contacts', searchQuery],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/internal/contacts?search=${encodeURIComponent(searchQuery)}`
        : '/api/internal/contacts';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    }
  });

  return (
    <InternalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Suche nach Name, E-Mail, Telefon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Neuer Kontakt
          </Button>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center text-gray-400 py-12">
              Lade Kontakte...
            </div>
          ) : contacts?.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 py-12">
              Keine Kontakte gefunden
            </div>
          ) : (
            contacts?.map((contact: any, index: number) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        {contact.position && (
                          <p className="text-sm text-gray-400 truncate">{contact.position}</p>
                        )}
                        <div className="mt-3 space-y-1">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Phone className="w-3 h-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.companyId && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Building2 className="w-3 h-3" />
                              <span>Company ID: {contact.companyId.slice(0, 8)}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            contact.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                            contact.status === 'NEW' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {contact.status}
                          </span>
                          {contact.source && (
                            <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">
                              {contact.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </InternalLayout>
  );
}
