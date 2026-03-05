"use client";

import * as React from "react";

const EMOJIS = ["🎲", "🎯", "🏆", "🎪", "🎭", "✨", "🎮", "🎰", "🃏", "🎵", "💡", "🔥"];

interface FloatingEmojiProps {
  count?: number;
}

function FloatingEmoji({ count = 8 }: FloatingEmojiProps) {
  const [items, setItems] = React.useState<
    { emoji: string; left: string; delay: string; duration: string; size: string }[]
  >([]);

  React.useEffect(() => {
    setItems(
      Array.from({ length: count }, (_, i) => ({
        emoji: (EMOJIS[i % EMOJIS.length] ?? EMOJIS[0]) as string,
        left: `${(i * 100) / count + Math.random() * 8}%`,
        delay: `${i * 2.5 + Math.random() * 3}s`,
        duration: `${18 + Math.random() * 12}s`,
        size: `${18 + Math.random() * 14}px`,
      })),
    );
  }, [count]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-5 overflow-hidden" aria-hidden="true">
      {items.map((item, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative elements
          key={i}
          className="absolute animate-float-drift"
          style={{
            left: item.left,
            bottom: "-40px",
            fontSize: item.size,
            animationDelay: item.delay,
            animationDuration: item.duration,
            opacity: 0,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}

FloatingEmoji.displayName = "FloatingEmoji";

export { FloatingEmoji };
