import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";
import type { BoardCategory } from "../../shared/bb-types";

interface HostCategoryRevealProps {
  board: BoardCategory[];
  currentRound: number;
  personalizationMessage: string | null;
  personalizationStatus: "pending" | "ai" | "curated" | null;
}

export function HostCategoryReveal({
  board,
  currentRound,
  personalizationMessage,
  personalizationStatus,
}: HostCategoryRevealProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="font-display text-[clamp(48px,6vw,72px)] font-bold text-accent-brainboard"
      >
        {currentRound === 2 ? "DOUBLE DOWN!" : "BRAIN BOARD!"}
      </motion.h1>
      <div className="flex flex-wrap justify-center gap-4">
        {board.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.4, type: "spring", stiffness: 120 }}
          >
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.22 265 / 0.3)"
              className="flex items-center justify-center px-8 py-6"
            >
              <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-brainboard text-center uppercase">
                {cat.name}
              </span>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
      {personalizationMessage && personalizationStatus && (
        <GlassPanel
          glow={personalizationStatus === "ai"}
          glowColor={
            personalizationStatus === "ai"
              ? "oklch(0.68 0.22 265 / 0.25)"
              : "oklch(0.78 0.16 95 / 0.22)"
          }
          className="max-w-4xl px-6 py-4 text-center"
        >
          <span
            data-testid="brainboard-personalization-badge"
            className={`inline-flex rounded-full border px-3 py-1 font-display text-xs font-bold uppercase tracking-wider ${
              personalizationStatus === "curated"
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-accent-brainboard/35 bg-accent-brainboard/10 text-accent-brainboard"
            }`}
          >
            {personalizationStatus === "curated" ? "Curated" : "AI Personalized"}
          </span>
          <p
            data-testid="brainboard-personalization-message"
            className={`font-body text-[clamp(14px,1.7vw,20px)] ${personalizationStatus === "curated" ? "text-warning" : "text-text-primary"}`}
          >
            {personalizationMessage}
          </p>
        </GlassPanel>
      )}
    </div>
  );
}
