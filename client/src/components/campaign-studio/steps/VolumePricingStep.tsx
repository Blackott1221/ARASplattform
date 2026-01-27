import { TrendingUp, Zap, Crown } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface VolumePricingStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function VolumePricingStep({ draft }: VolumePricingStepProps) {
  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Choose your call volume</h1>
      <p className="cs-subtitle">
        Select how many calls you need. Higher volumes unlock better per-call rates.
      </p>

      <div className="cs-placeholder-cards">
        <div className="cs-placeholder-card cs-placeholder-card--pricing">
          <div className="cs-placeholder-icon">
            <TrendingUp size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Starter</span>
            <span className="cs-placeholder-price">1,000 calls</span>
            <span className="cs-placeholder-desc">Perfect for testing</span>
          </div>
        </div>

        <div className="cs-placeholder-card cs-placeholder-card--pricing cs-placeholder-card--popular">
          <div className="cs-placeholder-badge">Most Popular</div>
          <div className="cs-placeholder-icon">
            <Zap size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Growth</span>
            <span className="cs-placeholder-price">5,000 calls</span>
            <span className="cs-placeholder-desc">Best value for scale</span>
          </div>
        </div>

        <div className="cs-placeholder-card cs-placeholder-card--pricing">
          <div className="cs-placeholder-icon">
            <Crown size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Enterprise</span>
            <span className="cs-placeholder-price">25,000+ calls</span>
            <span className="cs-placeholder-desc">Custom pricing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
