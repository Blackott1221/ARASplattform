"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Users } from "lucide-react";
import { useState } from "react";
import "./campaign-studio.css";

const CURRENT_STEP = 1;
const TOTAL_STEPS = 8;

export default function CampaignStudioShell() {
  const prefersReducedMotion = useReducedMotion();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const cardVariants = {
    initial: prefersReducedMotion 
      ? { opacity: 0 } 
      : { opacity: 0, y: 14 },
    animate: prefersReducedMotion 
      ? { opacity: 1 } 
      : { opacity: 1, y: 0 },
  };

  const transition = {
    duration: prefersReducedMotion ? 0 : 0.18,
    ease: [0.32, 0.72, 0, 1],
  };

  return (
    <div className="cs-container">
      {/* Background layers */}
      <div className="cs-bg-layer cs-bg-gradient" aria-hidden="true" />
      <div className="cs-bg-layer cs-bg-noise" aria-hidden="true" />

      {/* Header */}
      <header className="cs-header">
        <div className="cs-header-inner">
          <span className="cs-header-label">Campaign Studio</span>
          <span className="cs-header-step">Step {CURRENT_STEP}/{TOTAL_STEPS}</span>
        </div>
        <div className="cs-progress-track">
          <div 
            className="cs-progress-fill" 
            style={{ width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      {/* Main content area */}
      <main className="cs-main">
        <motion.div
          className="cs-card"
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={transition}
        >
          <h1 className="cs-title arasWaveTitle">
            Start your campaign setup
          </h1>
          <p className="cs-subtitle">
            Answer a few quick steps. You pay per call volume — conversations are unlimited.
          </p>

          {/* Choice cards */}
          <div className="cs-choices">
            <button
              type="button"
              className={`cs-choice-card ${selectedType === 'company' ? 'cs-choice-card--selected' : ''}`}
              onClick={() => setSelectedType('company')}
              aria-pressed={selectedType === 'company'}
            >
              <div className="cs-choice-icon">
                <Building2 size={28} strokeWidth={1.5} />
              </div>
              <span className="cs-choice-label">I'm a company</span>
              <span className="cs-choice-desc">Single brand, direct outreach</span>
            </button>

            <button
              type="button"
              className={`cs-choice-card ${selectedType === 'agency' ? 'cs-choice-card--selected' : ''}`}
              onClick={() => setSelectedType('agency')}
              aria-pressed={selectedType === 'agency'}
            >
              <div className="cs-choice-icon">
                <Users size={28} strokeWidth={1.5} />
              </div>
              <span className="cs-choice-label">I'm an agency</span>
              <span className="cs-choice-desc">Multiple clients, white-label</span>
            </button>
          </div>

          {/* Action buttons (desktop) */}
          <div className="cs-actions cs-actions--desktop">
            <button type="button" className="cs-btn cs-btn--back" disabled>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button type="button" className="cs-btn cs-btn--next" disabled={!selectedType}>
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </main>

      {/* Bottom action bar (mobile) */}
      <div className="cs-bottom-bar">
        <button type="button" className="cs-btn cs-btn--back" disabled>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <button type="button" className="cs-btn cs-btn--next" disabled={!selectedType}>
          <span>Continue</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
