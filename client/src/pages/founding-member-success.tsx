import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

export default function FoundingMemberSuccess() {
  const [, setLocation] = useLocation();

  return (
    <main
      className="relative min-h-screen w-full flex items-center justify-center px-4 md:px-6 lg:px-8"
      style={{ background: "var(--aras-bg)" }}
    >
      <div className="max-w-lg w-full text-center">
        {/* Success icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)] flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-orbitron font-bold text-2xl md:text-3xl mb-4"
          style={{ color: "var(--aras-text)" }}
        >
          Zahlung erfolgreich.
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base md:text-lg leading-relaxed mb-10"
          style={{ color: "var(--aras-muted)" }}
        >
          Wir ordnen deine Zahlung deinem ARAS-Account zu und schalten PRO
          frei. In der Regel innerhalb von 24 Stunden.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => setLocation("/auth")}
            className="aras-btn--primary rounded-full px-7 py-3 font-inter font-semibold text-base transition-all duration-300"
            aria-label="Zum Login"
          >
            Zum Login
            <ArrowRight className="inline-block w-4 h-4 ml-1.5 -mt-0.5" />
          </button>

          <button
            onClick={() => setLocation("/founding")}
            className="aras-btn--secondary rounded-full px-6 py-3 font-inter text-sm border border-[rgba(233,215,196,0.15)] hover:border-[rgba(254,145,0,0.3)] transition-all duration-300"
            style={{ color: "var(--aras-muted)" }}
          >
            <ArrowLeft className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" />
            Zurück zur Landingpage
          </button>
        </motion.div>
      </div>
    </main>
  );
}
