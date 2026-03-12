"use client";

import { GlassPanel, useReducedMotion } from "@flimflam/ui";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

const HINT_STORAGE_PREFIX = "flimflam_hint_seen_";

interface HintTooltipProps {
  id: string;
  message: string;
  position?: "top" | "bottom";
  autoHideMs?: number;
}

export function HintTooltip({
  id,
  message,
  position = "bottom",
  autoHideMs = 5000,
}: HintTooltipProps) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(`${HINT_STORAGE_PREFIX}${id}`);
      if (!seen) {
        // Delay showing to let the page settle
        const showTimer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(showTimer);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(`${HINT_STORAGE_PREFIX}${id}`, "1");
      } catch {}
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [visible, autoHideMs, id]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(`${HINT_STORAGE_PREFIX}${id}`, "1");
    } catch {}
  }, [id]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: position === "top" ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "top" ? -8 : 8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto z-50"
        >
          <GlassPanel
            rounded="xl"
            className="flex items-center gap-3 border border-primary/20 bg-primary/10 px-4 py-3 backdrop-blur-xl"
          >
            <span className="font-body text-sm text-text-primary">{message}</span>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-dim hover:text-text-primary"
              aria-label="Dismiss hint"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </GlassPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
