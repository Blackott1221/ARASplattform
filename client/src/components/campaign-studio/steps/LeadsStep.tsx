import { Upload, ShoppingCart, Database } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface LeadsStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function LeadsStep({ draft }: LeadsStepProps) {
  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Where are your leads?</h1>
      <p className="cs-subtitle">
        Bring your own contacts or let us source qualified leads for your campaign.
      </p>

      <div className="cs-choices">
        <button
          type="button"
          className={`cs-choice-card ${draft.leadsMode === 'have' ? 'cs-choice-card--selected' : ''}`}
          aria-pressed={draft.leadsMode === 'have'}
        >
          <div className="cs-choice-icon">
            <Upload size={28} strokeWidth={1.5} />
          </div>
          <span className="cs-choice-label">I have leads</span>
          <span className="cs-choice-desc">Upload your own contact list</span>
        </button>

        <button
          type="button"
          className={`cs-choice-card ${draft.leadsMode === 'need' ? 'cs-choice-card--selected' : ''}`}
          aria-pressed={draft.leadsMode === 'need'}
        >
          <div className="cs-choice-icon">
            <ShoppingCart size={28} strokeWidth={1.5} />
          </div>
          <span className="cs-choice-label">I need leads</span>
          <span className="cs-choice-desc">Purchase targeted lead packages</span>
        </button>
      </div>

      <div className="cs-placeholder-cards" style={{ marginTop: '24px' }}>
        <div className="cs-placeholder-card">
          <div className="cs-placeholder-icon">
            <Database size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Lead Filters</span>
            <span className="cs-placeholder-desc">Region, Industry, Role Level, Company Size</span>
          </div>
        </div>
      </div>
    </div>
  );
}
