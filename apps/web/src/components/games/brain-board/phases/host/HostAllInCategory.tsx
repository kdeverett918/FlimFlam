import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

interface HostAllInCategoryProps {
  allInCategory: string | null;
}

export function HostAllInCategory({ allInCategory }: HostAllInCategoryProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.h1
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="font-display text-[clamp(48px,7vw,80px)] font-black text-accent-brainboard"
        style={{
          textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.6), 0 0 80px oklch(0.68 0.22 265 / 0.3)",
        }}
      >
        ALL-IN ROUND
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.4)" className="px-16 py-10">
          <span className="font-display text-[clamp(32px,4.5vw,56px)] font-bold text-accent-brainboard uppercase text-center">
            {allInCategory}
          </span>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
