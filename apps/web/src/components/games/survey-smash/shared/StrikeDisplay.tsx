"use client";

import { ANIMATION_EASINGS } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";

export function StrikeDisplay({ strikes }: { strikes: number }) {
  return (
    <div className="flex gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex h-16 w-16 items-center justify-center rounded-lg border-2 transition-all duration-300 ${i < strikes ? "border-accent-6 bg-accent-6/20" : "border-white/15 bg-white/5"}`}
          style={i < strikes ? { boxShadow: "0 0 16px oklch(0.68 0.25 20 / 0.35)" } : undefined}
        >
          <AnimatePresence mode="wait">
            {i < strikes ? (
              <motion.span
                key={`strike-${i}`}
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.3,
                  ease: ANIMATION_EASINGS.snapIn,
                }}
                className="font-display text-[32px] font-black text-accent-6"
                style={{ textShadow: "0 0 20px oklch(0.68 0.25 20 / 0.5)" }}
              >
                X
              </motion.span>
            ) : (
              <motion.span
                key={`empty-${i}`}
                className="font-display text-[32px] font-black text-text-dim"
              >
                X
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
