import { useState, useEffect, useCallback } from "react";
import { 
  Building2, 
  Phone, 
  Mic, 
  Users, 
  Target, 
  CreditCard, 
  Shield, 
  Check, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CampaignStudioDraft } from "../types";

// ============================================================================
// Label Mappings
// ============================================================================
const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  company: 'Direct Company',
  agency: 'Agency / Partner',
};

const USE_CASE_LABELS: Record<string, string> = {
  'appointment-setting': 'Appointment Setting',
  'lead-qualification': 'Lead Qualification',
  'winback': 'Customer Winback',
  'event-invite': 'Event Invitation',
  'payment-reminder': 'Payment Reminder',
};

const VOICE_LABELS: Record<string, string> = {
  'voice-a': 'Aurora',
  'voice-b': 'Noah',
  'voice-c': 'Mara',
  'voice-d': 'Elias',
};

const GOAL_LABELS: Record<string, string> = {
  'book-meetings': 'Book meetings',
  'qualify-leads': 'Qualify interest',
  'winback': 'Win back customers',
  'event-invite': 'Invite to event',
};

const TONE_LABELS: Record<string, string> = {
  executive: 'Executive',
  friendly: 'Friendly',
  direct: 'Direct',
};

const LEAD_PRICE_CENTS = 5;

// ============================================================================
// Helpers
// ============================================================================
function formatPrice(cents?: number, currency = 'EUR'): string {
  if (!cents) return '€0';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatNumber(n?: number): string {
  if (!n) return '—';
  return new Intl.NumberFormat('de-DE').format(n);
}

// ============================================================================
// Component
// ============================================================================
type CheckoutStatus = 'idle' | 'creatingOrder' | 'orderReady' | 'startingCheckout' | 'error' | 'success';

interface ReviewCheckoutStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
  attemptedNext?: boolean;
}

export default function ReviewCheckoutStep({ draft }: ReviewCheckoutStepProps) {
  // State
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showBriefDialog, setShowBriefDialog] = useState(false);

  // Check URL params on mount for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setStatus('success');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      setErrorMessage('Checkout was canceled. You can try again when ready.');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Compute totals
  const callsTotalCents = draft.computedTotalCents || 0;
  const leadsTotalCents = draft.leadsMode === 'need' && draft.leadPackageSize 
    ? draft.leadPackageSize * LEAD_PRICE_CENTS 
    : 0;
  const grandTotalCents = callsTotalCents + leadsTotalCents;

  // Create order
  const handleCreateOrder = useCallback(async () => {
    if (status === 'creatingOrder') return;
    
    setStatus('creatingOrder');
    setErrorMessage('');

    try {
      const response = await fetch('/api/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName: draft.companyName,
          contactName: draft.contactName,
          contactEmail: draft.contactEmail,
          packageCode: `calls_${draft.callVolume}`,
          targetCalls: draft.callVolume,
          priceCents: grandTotalCents,
          currency: 'eur',
          metadata: {
            customerType: draft.customerType,
            useCaseId: draft.useCaseId,
            voiceId: draft.voiceId,
            leadsMode: draft.leadsMode,
            leadPackageSize: draft.leadPackageSize,
            leadFilters: draft.leadFilters,
            goalPrimary: draft.goalPrimary,
            goalMetric: draft.goalMetric,
            goalBrief: draft.goalBrief,
            goalGuardrails: draft.goalGuardrails,
            tone: draft.tone,
            callsTotalCents,
            leadsTotalCents,
            grandTotalCents,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();
      setOrderId(order.id);
      setStatus('orderReady');
    } catch (err) {
      console.error('Create order error:', err);
      setStatus('error');
      setErrorMessage('We couldn\'t create your order. Please try again.');
    }
  }, [status, draft, grandTotalCents, callsTotalCents, leadsTotalCents]);

  // Start checkout
  const handleStartCheckout = useCallback(async () => {
    if (!orderId || status === 'startingCheckout' || !consentChecked) return;

    setStatus('startingCheckout');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/service-orders/${orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to start checkout');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setStatus('error');
      setErrorMessage('We couldn\'t start checkout. Please try again.');
    }
  }, [orderId, status, consentChecked]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
    setOrderId(null);
  }, []);

  // Success state
  if (status === 'success') {
    return (
      <div className="cs-step-content">
        <div className="cs-review-success">
          <div className="cs-review-success-icon">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="cs-review-success-title">Payment received!</h2>
          <p className="cs-review-success-text">
            Your campaign order has been confirmed. Our team will begin setup shortly.
          </p>
          <Button
            className="cs-review-success-btn"
            onClick={() => window.location.href = '/dashboard'}
          >
            Go to Dashboard
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Review & Launch</h1>
      <p className="cs-subtitle">
        Review your campaign configuration before checkout.
      </p>

      {errorMessage && (
        <div className="cs-review-error">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
          <button type="button" onClick={handleRetry} className="cs-review-error-retry">
            Retry
          </button>
        </div>
      )}

      <div className="cs-review-layout">
        {/* Left: Summary Sections */}
        <div className="cs-review-summary">
          {/* Identity */}
          <div className="cs-review-section">
            <div className="cs-review-section-header">
              <Building2 size={16} />
              <h3>Identity</h3>
            </div>
            <div className="cs-review-grid">
              <div className="cs-review-item">
                <span className="cs-review-label">Type</span>
                <span className="cs-review-value">{CUSTOMER_TYPE_LABELS[draft.customerType || ''] || '—'}</span>
              </div>
              <div className="cs-review-item">
                <span className="cs-review-label">Contact</span>
                <span className="cs-review-value">{draft.contactName || '—'}</span>
              </div>
              <div className="cs-review-item">
                <span className="cs-review-label">Email</span>
                <span className="cs-review-value">{draft.contactEmail || '—'}</span>
              </div>
              <div className="cs-review-item">
                <span className="cs-review-label">Company</span>
                <span className="cs-review-value">{draft.companyName || '—'}</span>
              </div>
            </div>
          </div>

          {/* Playbook */}
          <div className="cs-review-section">
            <div className="cs-review-section-header">
              <Target size={16} />
              <h3>Playbook</h3>
            </div>
            <div className="cs-review-grid">
              <div className="cs-review-item">
                <span className="cs-review-label">Use Case</span>
                <span className="cs-review-value">{USE_CASE_LABELS[draft.useCaseId || ''] || draft.useCaseId || '—'}</span>
              </div>
            </div>
          </div>

          {/* Volume */}
          <div className="cs-review-section">
            <div className="cs-review-section-header">
              <Phone size={16} />
              <h3>Volume & Pricing</h3>
            </div>
            <div className="cs-review-grid">
              <div className="cs-review-item">
                <span className="cs-review-label">Calls</span>
                <span className="cs-review-value">{formatNumber(draft.callVolume)}</span>
              </div>
              <div className="cs-review-item">
                <span className="cs-review-label">Price/Call</span>
                <span className="cs-review-value">{draft.pricePerCallCents ? `€${(draft.pricePerCallCents / 100).toFixed(2)}` : '—'}</span>
              </div>
              <div className="cs-review-item">
                <span className="cs-review-label">Calls Total</span>
                <span className="cs-review-value cs-review-value--highlight">{formatPrice(callsTotalCents)}</span>
              </div>
            </div>
          </div>

          {/* Voice */}
          <div className="cs-review-section">
            <div className="cs-review-section-header">
              <Mic size={16} />
              <h3>Voice</h3>
            </div>
            <div className="cs-review-grid">
              <div className="cs-review-item">
                <span className="cs-review-label">Selected Voice</span>
                <span className="cs-review-value">{VOICE_LABELS[draft.voiceId || ''] || draft.voiceId || '—'}</span>
              </div>
            </div>
          </div>

          {/* Leads */}
          <div className="cs-review-section">
            <div className="cs-review-section-header">
              <Users size={16} />
              <h3>Leads</h3>
            </div>
            <div className="cs-review-grid">
              <div className="cs-review-item">
                <span className="cs-review-label">Mode</span>
                <span className="cs-review-value">
                  {draft.leadsMode === 'have' ? 'Own leads' : draft.leadsMode === 'need' ? 'ARAS leads' : '—'}
                </span>
              </div>
              {draft.leadsMode === 'need' && draft.leadPackageSize && (
                <>
                  <div className="cs-review-item">
                    <span className="cs-review-label">Lead Package</span>
                    <span className="cs-review-value">{formatNumber(draft.leadPackageSize)} leads</span>
                  </div>
                  <div className="cs-review-item">
                    <span className="cs-review-label">Leads Total</span>
                    <span className="cs-review-value cs-review-value--highlight">{formatPrice(leadsTotalCents)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Goals */}
          <div className="cs-review-section">
            <div className="cs-review-section-header">
              <Target size={16} />
              <h3>Goals</h3>
            </div>
            <div className="cs-review-grid">
              <div className="cs-review-item">
                <span className="cs-review-label">Primary Goal</span>
                <span className="cs-review-value">{GOAL_LABELS[draft.goalPrimary || ''] || draft.goalPrimary || '—'}</span>
              </div>
              <div className="cs-review-item">
                <span className="cs-review-label">Tone</span>
                <span className="cs-review-value">{TONE_LABELS[draft.tone || ''] || '—'}</span>
              </div>
              {draft.goalBrief && (
                <div className="cs-review-item cs-review-item--full">
                  <span className="cs-review-label">Brief</span>
                  <span className="cs-review-value cs-review-brief">
                    {draft.goalBrief.length > 150 
                      ? `${draft.goalBrief.slice(0, 150)}...` 
                      : draft.goalBrief}
                    {draft.goalBrief.length > 150 && (
                      <button 
                        type="button" 
                        className="cs-review-show-more"
                        onClick={() => setShowBriefDialog(true)}
                      >
                        Show more
                      </button>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Total & Checkout */}
        <div className="cs-review-checkout">
          <div className="cs-review-total-card">
            <h3 className="cs-review-total-title">Total today</h3>
            
            <div className="cs-review-total-rows">
              <div className="cs-review-total-row">
                <span>Calls ({formatNumber(draft.callVolume)})</span>
                <span>{formatPrice(callsTotalCents)}</span>
              </div>
              {leadsTotalCents > 0 && (
                <div className="cs-review-total-row">
                  <span>Leads ({formatNumber(draft.leadPackageSize)})</span>
                  <span>{formatPrice(leadsTotalCents)}</span>
                </div>
              )}
              <div className="cs-review-total-divider" />
              <div className="cs-review-total-row cs-review-total-row--grand">
                <span>Grand Total</span>
                <span>{formatPrice(grandTotalCents)}</span>
              </div>
            </div>

            <p className="cs-review-total-vat">Taxes may apply based on your location.</p>

            {/* Consent */}
            <label className="cs-review-consent">
              <Checkbox
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
              />
              <span>I confirm I'm authorized to run outbound campaigns for this company.</span>
            </label>

            {/* Action Button */}
            {!orderId ? (
              <Button
                className="cs-review-pay-btn"
                onClick={handleCreateOrder}
                disabled={status === 'creatingOrder'}
              >
                {status === 'creatingOrder' ? (
                  <>
                    <Loader2 size={18} className="cs-spin" />
                    Creating order...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Create order
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="cs-review-pay-btn"
                onClick={handleStartCheckout}
                disabled={!consentChecked || status === 'startingCheckout'}
              >
                {status === 'startingCheckout' ? (
                  <>
                    <Loader2 size={18} className="cs-spin" />
                    Starting checkout...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Pay & launch
                  </>
                )}
              </Button>
            )}

            {/* Trust badges */}
            <div className="cs-review-trust">
              <Shield size={14} />
              <span>Secure checkout • GDPR compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brief Dialog */}
      <Dialog open={showBriefDialog} onOpenChange={setShowBriefDialog}>
        <DialogContent className="cs-review-brief-dialog">
          <DialogHeader>
            <DialogTitle>Campaign Brief</DialogTitle>
          </DialogHeader>
          <p className="cs-review-brief-full">{draft.goalBrief}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
