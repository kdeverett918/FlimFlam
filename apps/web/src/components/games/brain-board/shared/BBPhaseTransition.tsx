"use client";

import { GlassPanel, sounds, useReducedMotion } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

type TransitionType = "double-down" | "all-in" | "power-play";

interface BBPhaseTransitionProps {
  type: TransitionType;
  show: boolean;
}

const TRANSITION_CONFIG: Record<
  TransitionType,
  {
    title: string;
    subtitle: string;
    color: string;
    glowColor: string;
    sound: () => void;
  }
> = {
  "double-down": {
    title: "DOUBLE DOWN!",
    subtitle: "Values are doubled. Stakes are higher.",
    color: "oklch(0.82 0.18 85)",
    glowColor: "oklch(0.82 0.18 85 / 0.6)",
    sound: () => sounds.reveal(),
  },
  "all-in": {
    title: "ALL-IN ROUND",
    subtitle: "One final question. Wager everything.",
    color: "oklch(0.68 0.22 265)",
    glowColor: "oklch(0.68 0.22 265 / 0.6)",
    sound: () => sounds.allIn(),
  },
  "power-play": {
    title: "POWER PLAY!",
    subtitle: "Only the selector can answer.",
    color: "oklch(0.82 0.2 85)",
    glowColor: "oklch(0.82 0.2 85 / 0.6)",
    sound: () => sounds.powerPlay(),
  },
};

export function BBPhaseTransition({ type, show }: BBPhaseTransitionProps) {
  const config = TRANSITION_CONFIG[type];
  const hasFiredRef = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (show && !hasFiredRef.current) {
      hasFiredRef.current = true;
      if (!reducedMotion) config.sound();
    }
    if (!show) {
      hasFiredRef.current = false;
    }
  }, [show, config, reducedMotion]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center gap-6 p-8"
        >
          {/* Title with dramatic entrance */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 12,
              delay: 0.1,
            }}
            className="font-display text-[clamp(48px,8vw,96px)] font-black text-center"
            style={{
              color: config.color,
              textShadow: `0 0 40px ${config.glowColor}, 0 0 80px ${config.glowColor.replace("0.6", "0.3")}`,
            }}
          >
            {config.title}
          </motion.h1>

          {/* Subtitle with delayed entrance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <GlassPanel
              glow
              glowColor={config.glowColor.replace("0.6", "0.3")}
              className="px-8 py-4"
            >
              <p className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted text-center">
                {config.subtitle}
              </p>
            </GlassPanel>
          </motion.div>

          {/* Decorative accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-[2px] w-32 rounded-full"
            style={{
              backgroundColor: config.color,
              boxShadow: `0 0 16px ${config.glowColor}`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
