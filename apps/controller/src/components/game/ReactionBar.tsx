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
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-1 px-2 py-2"
      style={{
        background: "oklch(0.09 0.02 250 / 0.7)",
        backdropFilter: "blur(12px) saturate(1.2)",
        WebkitBackdropFilter: "blur(12px) saturate(1.2)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={coolingDown}
          onClick={() => handleReaction(emoji)}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all active:scale-90 disabled:opacity-40"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
