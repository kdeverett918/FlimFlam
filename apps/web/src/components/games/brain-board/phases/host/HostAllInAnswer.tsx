import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

interface HostAllInAnswerProps {
  allInQuestion: string | null;
}

export function HostAllInAnswer({ allInQuestion }: HostAllInAnswerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <h1
        className="font-display text-[clamp(48px,6vw,72px)] font-black text-accent-brainboard"
        style={{ textShadow: "0 0 30px oklch(0.68 0.22 265 / 0.5)" }}
      >
        ALL-IN ROUND
      </h1>
      {allInQuestion && (
        <GlassPanel glow glowColor="oklch(0.68 0.22 265 / 0.3)" className="max-w-4xl px-12 py-8">
          <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
            {allInQuestion}
          </p>
        </GlassPanel>
      )}
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        className="font-body text-[clamp(28px,3.5vw,44px)] text-text-muted"
      >
        Players are answering...
      </motion.span>
    </div>
  );
}
