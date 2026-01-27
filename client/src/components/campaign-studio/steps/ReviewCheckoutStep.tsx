import { CheckCircle2, CreditCard, Shield } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface ReviewCheckoutStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function ReviewCheckoutStep({ draft }: ReviewCheckoutStepProps) {
  const formatPrice = (cents?: number) => {
    if (!cents) return '—';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: draft.currency || 'EUR',
    }).format(cents / 100);
  };

  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Review & Launch</h1>
      <p className="cs-subtitle">
        Review your campaign configuration. You can always adjust settings after checkout.
      </p>

      <div className="cs-placeholder-cards">
        <div className="cs-placeholder-card cs-review-card">
          <div className="cs-placeholder-icon">
            <CheckCircle2 size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Configuration Summary</span>
            <div className="cs-review-summary">
              <div className="cs-review-row">
                <span>Customer Type</span>
                <span>{draft.customerType || '—'}</span>
              </div>
              <div className="cs-review-row">
                <span>Call Volume</span>
                <span>{draft.callVolume?.toLocaleString() || '—'} calls</span>
              </div>
              <div className="cs-review-row">
                <span>Leads Mode</span>
                <span>{draft.leadsMode === 'have' ? 'Own leads' : draft.leadsMode === 'need' ? 'Purchase leads' : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cs-placeholder-card cs-review-card cs-review-card--total">
          <div className="cs-placeholder-icon">
            <CreditCard size={24} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Total Investment</span>
            <span className="cs-review-total">{formatPrice(draft.computedTotalCents)}</span>
          </div>
        </div>

        <div className="cs-placeholder-card cs-trust-card">
          <div className="cs-placeholder-icon">
            <Shield size={20} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-desc">Secure checkout • Cancel anytime • GDPR compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
