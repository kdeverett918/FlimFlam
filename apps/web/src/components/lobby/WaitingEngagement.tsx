"use client";

import { GAME_PREVIEW_CONTENT } from "@flimflam/shared";
import { useReducedMotion } from "@flimflam/ui";
import { Lightbulb } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

interface WaitingEngagementProps {
  selectedGameId: string;
}

export function WaitingEngagement({ selectedGameId }: WaitingEngagementProps) {
  const reducedMotion = useReducedMotion();
  const [tipIndex, setTipIndex] = useState(0);

  const tips = useMemo(() => {
    const content = GAME_PREVIEW_CONTENT.find((c) => c.gameId === selectedGameId);
    if (!content) return [];
    return content.howToPlay;
  }, [selectedGameId]);

  // Reset index when game changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: tips derives from selectedGameId; we intentionally reset on game change only
  useEffect(() => {
    setTipIndex(0);
  }, [selectedGameId]);

  // Auto-rotate tips every 8 seconds
  useEffect(() => {
    if (tips.length <= 1) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  if (!selectedGameId || tips.length === 0) return null;

  const content = GAME_PREVIEW_CONTENT.find((c) => c.gameId === selectedGameId);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Tagline */}
      {content?.tagline && (
        <p className="font-display text-sm font-bold uppercase tracking-wider text-text-dim/50">
          {content.tagline}
        </p>
      )}

      {/* Tip container */}
      <div className="relative w-full max-w-lg min-h-[60px] overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-3/60" />
          <AnimatePresence mode="wait">
            <motion.p
              key={`${selectedGameId}-${tipIndex}`}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="font-body text-sm leading-relaxed text-text-muted/80"
            >
              {tips[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        {tips.length > 1 && (
          <div className="mt-2 flex justify-center gap-1">
            {tips.map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: Tip indices are stable
                key={`dot-${i}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === tipIndex ? "w-4 bg-accent-3/40" : "w-1 bg-white/10"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
