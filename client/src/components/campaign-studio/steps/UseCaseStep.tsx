import { PhoneCall, CalendarCheck, Headphones } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface UseCaseStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function UseCaseStep({ draft }: UseCaseStepProps) {
  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">What's your primary goal?</h1>
      <p className="cs-subtitle">
        Select your main use case. The ARAS Engine will optimize for this objective.
      </p>

      <div className="cs-placeholder-cards">
        <div className="cs-placeholder-card cs-placeholder-card--large">
          <div className="cs-placeholder-icon">
            <PhoneCall size={28} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Lead Qualification</span>
            <span className="cs-placeholder-desc">Qualify inbound leads with intelligent conversations</span>
          </div>
        </div>

        <div className="cs-placeholder-card cs-placeholder-card--large">
          <div className="cs-placeholder-icon">
            <CalendarCheck size={28} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Appointment Setting</span>
            <span className="cs-placeholder-desc">Book meetings directly into your calendar</span>
          </div>
        </div>

        <div className="cs-placeholder-card cs-placeholder-card--large">
          <div className="cs-placeholder-icon">
            <Headphones size={28} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Customer Support</span>
            <span className="cs-placeholder-desc">Handle support inquiries 24/7</span>
          </div>
        </div>
      </div>
    </div>
  );
}
