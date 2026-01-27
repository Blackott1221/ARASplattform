import { Globe, Building, User, Mail } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface CompanyScanStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function CompanyScanStep({ draft }: CompanyScanStepProps) {
  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Tell us about your company</h1>
      <p className="cs-subtitle">
        We'll scan your website to auto-configure your campaign settings and voice persona.
      </p>

      <div className="cs-placeholder-cards">
        <div className="cs-placeholder-card">
          <div className="cs-placeholder-icon">
            <User size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Contact Name</span>
            <span className="cs-placeholder-value">{draft.contactName || 'Not set'}</span>
          </div>
        </div>

        <div className="cs-placeholder-card">
          <div className="cs-placeholder-icon">
            <Mail size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Email Address</span>
            <span className="cs-placeholder-value">{draft.contactEmail || 'Not set'}</span>
          </div>
        </div>

        <div className="cs-placeholder-card">
          <div className="cs-placeholder-icon">
            <Building size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Company Name</span>
            <span className="cs-placeholder-value">{draft.companyName || 'Not set'}</span>
          </div>
        </div>

        <div className="cs-placeholder-card">
          <div className="cs-placeholder-icon">
            <Globe size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Website URL</span>
            <span className="cs-placeholder-value">{draft.websiteUrl || 'Not set'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
