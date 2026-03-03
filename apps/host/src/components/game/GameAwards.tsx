"use client";

import type { GameAward } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { Award, Crown, Flame, Star, Zap } from "lucide-react";
import { motion } from "motion/react";

const AWARD_ICONS: Record<string, typeof Award> = {
  Champion: Crown,
  "Speed Demon": Zap,
  "Hot Streak": Flame,
  "Steady Eddie": Star,
};

interface GameAwardsProps {
  awards: GameAward[];
  accentColorClass?: string;
}

export function GameAwards({
  awards,
  accentColorClass = "text-accent-luckyletters",
}: GameAwardsProps) {
  if (awards.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 max-w-5xl">
      {awards.map((award, index) => {
        const Icon = AWARD_ICONS[award.title] ?? Award;
        return (
          <motion.div
            key={award.title}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 1.5 + index * 0.3,
              type: "spring",
              stiffness: 120,
              damping: 12,
            }}
          >
            <GlassPanel
              className={`flex flex-col items-center gap-2 px-6 py-5 min-w-[180px] ${
                index === 0 ? "border-primary/40" : ""
              }`}
              glow={index === 0}
              glowColor="oklch(0.82 0.18 85 / 0.25)"
            >
              <Icon className={`h-8 w-8 ${index === 0 ? accentColorClass : "text-accent-5"}`} />
              <span className="font-display text-[clamp(14px,1.5vw,20px)] font-bold text-text-primary uppercase tracking-wider">
                {award.title}
              </span>
              <span className="font-display text-[clamp(20px,2.5vw,28px)] font-black text-text-primary">
                {award.recipient}
              </span>
              <span className="font-body text-[clamp(16px,1.4vw,20px)] text-text-muted">
                {award.description}
              </span>
            </GlassPanel>
          </motion.div>
        );
      })}
    </div>
  );
}
