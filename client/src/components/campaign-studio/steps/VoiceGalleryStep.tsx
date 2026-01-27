import { Mic, Volume2 } from "lucide-react";
import type { CampaignStudioDraft } from "../types";

interface VoiceGalleryStepProps {
  draft: CampaignStudioDraft;
  setDraft: (patch: Partial<CampaignStudioDraft>) => void;
  goNext?: () => void;
  goBack?: () => void;
}

export default function VoiceGalleryStep({ draft }: VoiceGalleryStepProps) {
  return (
    <div className="cs-step-content">
      <h1 className="cs-title arasWaveTitle">Select your voice</h1>
      <p className="cs-subtitle">
        Choose from our premium voice gallery. Each voice is optimized for professional conversations.
      </p>

      <div className="cs-placeholder-cards cs-voice-grid">
        <div className="cs-placeholder-card cs-voice-card">
          <div className="cs-voice-avatar">
            <Mic size={20} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Emma</span>
            <span className="cs-placeholder-desc">Warm, professional</span>
          </div>
          <button type="button" className="cs-voice-play" aria-label="Play sample">
            <Volume2 size={16} />
          </button>
        </div>

        <div className="cs-placeholder-card cs-voice-card">
          <div className="cs-voice-avatar">
            <Mic size={20} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">James</span>
            <span className="cs-placeholder-desc">Authoritative, clear</span>
          </div>
          <button type="button" className="cs-voice-play" aria-label="Play sample">
            <Volume2 size={16} />
          </button>
        </div>

        <div className="cs-placeholder-card cs-voice-card">
          <div className="cs-voice-avatar">
            <Mic size={20} strokeWidth={1.5} />
          </div>
          <div className="cs-placeholder-info">
            <span className="cs-placeholder-label">Sofia</span>
            <span className="cs-placeholder-desc">Friendly, energetic</span>
          </div>
          <button type="button" className="cs-voice-play" aria-label="Play sample">
            <Volume2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
