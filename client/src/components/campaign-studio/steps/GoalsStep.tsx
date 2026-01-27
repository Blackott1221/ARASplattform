import { Target, MessageSquare, Calendar } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface GoalsStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function GoalsStep({ draft }: GoalsStepProps) {
  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Define your campaign goals</h1>
      <p className="cs-subtitle">
        Set your objectives and communication style. The ARAS Engine will adapt accordingly.
      </p>

      <div className="cs-placeholder-cards">
        <div className="cs-placeholder-card cs-placeholder-card--large">
          <div className="cs-placeholder-icon">
            <Target size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Primary Goal</span>
            <span className="cs-placeholder-value">{draft.goalPrimary || 'Not selected'}</span>
          </div>
        </div>

        <div className="cs-placeholder-card cs-placeholder-card--large">
          <div className="cs-placeholder-icon">
            <MessageSquare size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Communication Tone</span>
            <span className="cs-placeholder-value">
              {draft.tone === 'executive' && 'Executive & Formal'}
              {draft.tone === 'friendly' && 'Friendly & Warm'}
              {draft.tone === 'direct' && 'Direct & Efficient'}
              {!draft.tone && 'Not selected'}
            </span>
          </div>
        </div>

        <div className="cs-placeholder-card cs-placeholder-card--large">
          <div className="cs-placeholder-icon">
            <Calendar size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Calendar Integration</span>
            <span className="cs-placeholder-value">{draft.calendarLink || 'Not connected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
