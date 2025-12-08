/**
 * ============================================================================
 * ARAS COMMAND CENTER - AI ENDPOINTS
 * ============================================================================
 */

import { Router } from "express";
import { requireInternal } from "../../middleware/role-guard";
import * as ai from "../../lib/internal-ai";
import * as storage from "../../storage-internal-crm";

const router = Router();

// Alle AI Routes benötigen admin/staff Role
router.use(requireInternal);

/**
 * POST /api/internal/ai/weekly-summary
 * Generiert wöchentliche CRM-Zusammenfassung
 */
router.post("/weekly-summary", async (req, res) => {
  try {
    // Hole aktuelle Stats
    const stats = await storage.getDashboardStats();
    
    // Generiere AI Summary
    const summary = await ai.generateWeeklySummary(stats);
    
    res.json({ summary, stats });
  } catch (error: any) {
    console.error('[AI] Weekly summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/internal/ai/contact-summary
 * Generiert Kontakt-Zusammenfassung
 */
router.post("/contact-summary", async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) {
      return res.status(400).json({ error: "contactId required" });
    }
    
    // Hole Kontakt & Related Data
    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    const [deals, tasks, calls, notes] = await Promise.all([
      storage.getDealsByContact(contactId),
      storage.getTasksByContact(contactId),
      storage.getCallLogsByContact(contactId),
      storage.getNotesByContact(contactId)
    ]);
    
    // Generiere Summary
    const summary = await ai.generateContactSummary(contact, {
      deals,
      tasks,
      calls,
      notes,
      company: contact.companyId ? await storage.getCompanyById(contact.companyId) : null
    });
    
    res.json({ summary, contact });
  } catch (error: any) {
    console.error('[AI] Contact summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/internal/ai/deal-next-steps
 * Schlägt nächste Schritte für Deal vor
 */
router.post("/deal-next-steps", async (req, res) => {
  try {
    const { dealId } = req.body;
    if (!dealId) {
      return res.status(400).json({ error: "dealId required" });
    }
    
    const deal = await storage.getDealById(dealId);
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }
    
    // Hole Kontext
    const [contact, company, tasks] = await Promise.all([
      deal.contactId ? storage.getContactById(deal.contactId) : null,
      deal.companyId ? storage.getCompanyById(deal.companyId) : null,
      storage.getTasksByContact(deal.contactId || '')
    ]);
    
    const steps = await ai.suggestDealNextSteps(deal, {
      contact,
      company,
      tasks,
      lastActivity: tasks[0]?.createdAt
    });
    
    res.json({ steps, deal });
  } catch (error: any) {
    console.error('[AI] Deal next steps error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
