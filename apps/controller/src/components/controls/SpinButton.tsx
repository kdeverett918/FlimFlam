"use client";

import { haptics } from "@flimflam/ui";
import { motion } from "motion/react";
import { useCallback } from "react";

interface SpinButtonProps {
  onSpin: () => void;
  disabled?: boolean;
}

export function SpinButton({ onSpin, disabled = false }: SpinButtonProps) {
  const handleSpin = useCallback(() => {
    if (disabled) return;
    haptics.confirm();
    onSpin();
  }, [disabled, onSpin]);

  return (
    <div
      className="flex min-h-[60dvh] flex-col items-center justify-center px-4"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {disabled ? (
        <motion.button
          type="button"
          disabled
          initial={{ scale: 1 }}
          animate={{ scale: 0.95, opacity: 0.5 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-[160px] w-[160px] flex-col items-center justify-center rounded-full bg-white/10"
          style={{
            boxShadow: "0 0 20px rgba(255,255,255,0.05)",
          }}
        >
          <span className="font-display text-xl font-bold text-text-dim uppercase tracking-wider">
            Wait...
          </span>
        </motion.button>
      ) : (
        <motion.button
          type="button"
          aria-label="Spin the wheel"
          onClick={handleSpin}
          whileTap={{ scale: 0.9, rotate: 15 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="relative flex h-[160px] w-[160px] flex-col items-center justify-center rounded-full animate-glow-breathe"
          style={{
            background: "linear-gradient(135deg, oklch(0.78 0.2 85), oklch(0.68 0.22 55))",
            boxShadow:
              "0 0 40px oklch(0.78 0.2 85 / 0.5), 0 0 80px oklch(0.78 0.2 85 / 0.25), inset 0 0 20px rgba(255,255,255,0.2)",
            touchAction: "manipulation",
          }}
        >
          {/* Decorative ring */}
          <span
            className="pointer-events-none absolute inset-[-6px] rounded-full border-2 animate-pulse-ring"
            style={{ borderColor: "oklch(0.78 0.2 85 / 0.4)" }}
          />
          <span className="font-display text-4xl font-bold text-white uppercase tracking-wider drop-shadow-lg">
            Spin!
          </span>
        </motion.button>
      )}
    </div>
  );
}
