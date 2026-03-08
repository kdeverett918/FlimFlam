import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

interface HostGeneratingBoardProps {
  topicPreview: string[];
}

export function HostGeneratingBoard({ topicPreview }: HostGeneratingBoardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="h-20 w-20 rounded-full border-4 border-accent-brainboard/30 border-t-accent-brainboard"
      />
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display text-[clamp(36px,5vw,56px)] font-bold text-accent-brainboard"
        style={{ textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.4)" }}
      >
        Building Your Board
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
      >
        AI is crafting custom trivia from your topics...
      </motion.p>
      {topicPreview.length > 0 && (
        <GlassPanel className="w-full max-w-3xl px-6 py-4">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-accent-brainboard">
            Building From
          </p>
          <div data-testid="brainboard-topic-chips" className="mt-3 flex flex-wrap gap-2">
            {topicPreview.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-accent-brainboard/35 bg-accent-brainboard/15 px-3 py-1 font-body text-[clamp(13px,1.5vw,18px)] text-accent-brainboard"
              >
                {topic}
              </span>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
