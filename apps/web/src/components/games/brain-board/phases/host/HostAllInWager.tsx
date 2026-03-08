import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

interface HostAllInWagerProps {
  allInCategory: string | null;
}

export function HostAllInWager({ allInCategory }: HostAllInWagerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <h1
        className="font-display text-[clamp(48px,6vw,72px)] font-black text-accent-brainboard"
        style={{ textShadow: "0 0 30px oklch(0.68 0.22 265 / 0.5)" }}
      >
        ALL-IN ROUND
      </h1>
      <GlassPanel className="px-12 py-6">
        <span className="font-display text-[clamp(24px,3vw,40px)] text-accent-brainboard uppercase">
          {allInCategory}
        </span>
      </GlassPanel>
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        className="font-body text-[clamp(28px,3.5vw,44px)] text-text-muted"
      >
        Players are wagering...
      </motion.span>
    </div>
  );
}
