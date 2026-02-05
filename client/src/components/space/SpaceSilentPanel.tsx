import { motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { TileId, TileStatus } from "./SpaceSilentTile";

interface SpaceSilentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tileId: TileId | null;
}

const TILE_CONTENT: Record<
  TileId,
  {
    title: string;
    status: TileStatus;
    description: string;
    primaryLink?: { href: string; label: string };
    secondaryLink?: { href: string; label: string };
  }
> = {
  outbound: {
    title: "Outbound-Logik",
    status: "READY",
    description:
      "Routing, compliance guards und Sequencing sind geladen. Du kannst Kampagnen sofort starten.",
    primaryLink: { href: "/app/campaigns", label: "Open Campaign Studio" },
  },
  voice: {
    title: "Voice Engine",
    status: "LIVE",
    description:
      "Voice engine läuft in realtime. Übergänge, Pausen und Tonalität sind bereit.",
    primaryLink: { href: "/app/power", label: "Open Power Calls" },
  },
  campaign: {
    title: "Campaign Mode",
    status: "READY",
    description:
      "Massencalls, Tracking und Ergebnis-Streams stehen bereit. Öffne das Campaign Studio.",
    primaryLink: { href: "/app/campaigns", label: "Open Campaign Studio" },
    secondaryLink: { href: "/app/power", label: "Power Calls starten" },
  },
  power: {
    title: "Power Calls",
    status: "READY",
    description:
      "Single-call Aufgaben wie Reservierungen oder Follow-ups kannst du direkt ausführen.",
    primaryLink: { href: "/app/power", label: "Open Power Calls" },
    secondaryLink: { href: "/app/campaigns", label: "Kampagne starten" },
  },
};

export function SpaceSilentPanel({
  open,
  onOpenChange,
  tileId,
}: SpaceSilentPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const content = tileId ? TILE_CONTENT[tileId] : null;

  if (!content) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 border-l-0 overflow-hidden"
        style={{
          background: "rgba(10,10,12,0.92)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderLeft: "1px solid rgba(233,215,196,0.14)",
          boxShadow: "-30px 0 120px rgba(0,0,0,0.72)",
        }}
      >
        {/* Custom Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 flex items-center justify-center transition-all duration-160 hover:bg-white/10"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        {/* Signal Module Strip */}
        <div
          className="w-full overflow-hidden"
          style={{ height: "10px", marginTop: "60px" }}
        >
          {!prefersReducedMotion ? (
            <motion.div
              className="h-full"
              style={{
                background:
                  "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)",
                backgroundSize: "200% 100%",
              }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 4,
                ease: "linear",
                repeat: Infinity,
              }}
            />
          ) : (
            <div
              className="h-full"
              style={{
                background:
                  "linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00, #FE9100, #e9d7c4)",
              }}
            />
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <SheetHeader className="text-left space-y-1 mb-6">
            <SheetTitle
              className="text-left"
              style={{
                fontFamily: "Orbitron, sans-serif",
                fontSize: "18px",
                fontWeight: 820,
                color: "rgba(245,245,247,0.95)",
              }}
            >
              {content.title}
            </SheetTitle>
            <SheetDescription
              className="text-left"
              style={{
                fontSize: "12px",
                color: "rgba(245,245,247,0.55)",
              }}
            >
              System status:{" "}
              <span
                style={{
                  color:
                    content.status === "LIVE"
                      ? "#FE9100"
                      : "rgba(233,215,196,0.88)",
                }}
              >
                {content.status}
              </span>
            </SheetDescription>
          </SheetHeader>

          {/* Description */}
          <p
            style={{
              fontSize: "13.6px",
              lineHeight: 1.65,
              color: "rgba(245,245,247,0.78)",
              marginBottom: "32px",
            }}
          >
            {content.description}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {content.primaryLink && (
              <Link href={content.primaryLink.href}>
                <motion.a
                  className="flex items-center justify-center w-full transition-all duration-160"
                  style={{
                    height: "44px",
                    borderRadius: "14px",
                    background: "rgba(254,145,0,0.14)",
                    border: "1px solid rgba(254,145,0,0.26)",
                    color: "rgba(245,245,247,0.95)",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : {
                          background: "rgba(254,145,0,0.22)",
                          borderColor: "rgba(254,145,0,0.35)",
                        }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                >
                  {content.primaryLink.label}
                </motion.a>
              </Link>
            )}

            {content.secondaryLink && (
              <Link href={content.secondaryLink.href}>
                <motion.a
                  className="flex items-center justify-center w-full transition-all duration-160"
                  style={{
                    height: "44px",
                    borderRadius: "14px",
                    background: "transparent",
                    border: "1px solid rgba(233,215,196,0.12)",
                    color: "rgba(233,215,196,0.88)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : {
                          background: "rgba(255,255,255,0.04)",
                          borderColor: "rgba(233,215,196,0.20)",
                        }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                >
                  {content.secondaryLink.label}
                </motion.a>
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
