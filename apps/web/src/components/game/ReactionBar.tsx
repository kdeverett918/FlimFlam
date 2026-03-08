"use client";

import { haptics } from "@flimflam/ui";
import { useCallback, useRef, useState } from "react";

const EMOJIS = [
  "\u{1F602}",
  "\u{1F525}",
  "\u{1F44F}",
  "\u{1F631}",
  "\u{1F480}",
  "\u{1F389}",
  "\u{1F440}",
  "\u{1F4AF}",
];

const COOLDOWN_MS = 2000;

interface ReactionBarProps {
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export function ReactionBar({ sendMessage }: ReactionBarProps) {
  const [coolingDown, setCoolingDown] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReaction = useCallback(
    (emoji: string) => {
      if (coolingDown) return;
      haptics.tap();
      sendMessage("player:reaction", { emoji });
      setCoolingDown(true);
      cooldownRef.current = setTimeout(() => {
        setCoolingDown(false);
      }, COOLDOWN_MS);
    },
    [coolingDown, sendMessage],
  );

  return (
    <div
      data-testid="hud-floating"
      className="pointer-events-auto absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center justify-center gap-1 rounded-full border border-white/10 px-2 py-2 shadow-[0_18px_45px_oklch(0_0_0/0.22)] sm:left-4 sm:translate-x-0"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.1 0.025 250 / 0.88), oklch(0.08 0.02 248 / 0.9))",
        backdropFilter: "blur(12px) saturate(1.2)",
        WebkitBackdropFilter: "blur(12px) saturate(1.2)",
        maxWidth: "min(calc(100vw - 1rem), 30rem)",
      }}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={coolingDown}
          onClick={() => handleReaction(emoji)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl transition-all active:scale-90 disabled:opacity-40"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
