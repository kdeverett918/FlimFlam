"use client";

import { haptics } from "@partyline/ui";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";

interface BuzzButtonProps {
  onBuzz: () => void;
  disabled?: boolean;
  buzzed?: boolean;
  playerColor?: string;
}

export function BuzzButton({
  onBuzz,
  disabled = false,
  buzzed: externalBuzzed,
  playerColor,
}: BuzzButtonProps) {
  const [localBuzzed, setLocalBuzzed] = useState(false);
  const buzzed = externalBuzzed ?? localBuzzed;

  const color = playerColor ?? "oklch(0.7 0.25 265)";

  const handleBuzz = () => {
    if (buzzed || disabled) return;
    haptics.confirm();
    window.navigator?.vibrate?.(50);
    setLocalBuzzed(true);
    onBuzz();
  };

  return (
    <div
      className="flex min-h-[60dvh] flex-col items-center justify-center px-4"
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {buzzed ? (
        <motion.button
          type="button"
          disabled
          initial={{ scale: 1.05 }}
          animate={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-[200px] w-[200px] flex-col items-center justify-center rounded-full"
          style={{
            backgroundColor: color,
            opacity: 0.7,
            boxShadow: `0 0 40px ${color}, inset 0 0 20px rgba(255,255,255,0.15)`,
          }}
        >
          <Check className="mb-1 h-10 w-10 text-white" strokeWidth={3} />
          <span className="font-display text-2xl font-bold text-white uppercase tracking-wider">
            Buzzed!
          </span>
        </motion.button>
      ) : disabled ? (
        <motion.button
          type="button"
          disabled
          initial={{ scale: 1 }}
          animate={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-[200px] w-[200px] flex-col items-center justify-center rounded-full bg-white/10"
          style={{
            boxShadow: "0 0 20px rgba(255,255,255,0.05)",
          }}
        >
          <span className="font-display text-xl font-bold text-text-dim uppercase tracking-wider">
            Too Slow!
          </span>
        </motion.button>
      ) : (
        <motion.button
          type="button"
          onClick={handleBuzz}
          whileTap={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="flex h-[200px] w-[200px] flex-col items-center justify-center rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 40px ${color}, 0 0 80px ${color}40, inset 0 0 20px rgba(255,255,255,0.15)`,
            touchAction: "manipulation",
          }}
        >
          <span className="font-display text-4xl font-bold text-white uppercase tracking-wider">
            Buzz!
          </span>
        </motion.button>
      )}
    </div>
  );
}
