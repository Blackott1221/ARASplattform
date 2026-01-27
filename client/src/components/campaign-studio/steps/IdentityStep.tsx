import { Building2, Users } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface IdentityStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function IdentityStep({ draft, setDraft }: IdentityStepProps) {
  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Who are you?</h1>
      <p className="cs-subtitle">
        Let us know how you'll be using the ARAS Engine so we can tailor your experience.
      </p>

      <div className="cs-choices">
        <button
          type="button"
          className={`cs-choice-card ${draft.customerType === 'company' ? 'cs-choice-card--selected' : ''}`}
          onClick={() => setDraft({ customerType: 'company' })}
          aria-pressed={draft.customerType === 'company'}
        >
          <div className="cs-choice-icon">
            <Building2 size={28} strokeWidth={1.5} />
          </div>
          <span className="cs-choice-label">I'm a company</span>
          <span className="cs-choice-desc">Single brand, direct outreach</span>
        </button>

        <button
          type="button"
          className={`cs-choice-card ${draft.customerType === 'agency' ? 'cs-choice-card--selected' : ''}`}
          onClick={() => setDraft({ customerType: 'agency' })}
          aria-pressed={draft.customerType === 'agency'}
        >
          <div className="cs-choice-icon">
            <Users size={28} strokeWidth={1.5} />
          </div>
          <span className="cs-choice-label">I'm an agency</span>
          <span className="cs-choice-desc">Multiple clients, white-label</span>
        </button>
      </div>
    </div>
  );
}
