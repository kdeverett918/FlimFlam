"use client";

import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface FloatingReaction {
  id: number;
  emoji: string;
  playerName: string;
  x: number;
}

const MAX_VISIBLE = 10;

export function ReactionOverlay({ room }: { room: Room | null }) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!room) return;

    const handler = (data: { emoji: string; playerName: string }) => {
      const id = nextId.current++;
      const x = 10 + Math.random() * 80; // random horizontal position (10-90%)

      setReactions((prev) => {
        const next = [...prev, { id, emoji: data.emoji, playerName: data.playerName, x }];
        // FIFO: keep only the most recent MAX_VISIBLE
        if (next.length > MAX_VISIBLE) {
          return next.slice(next.length - MAX_VISIBLE);
        }
        return next;
      });

      // Auto-remove after animation completes
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    };

    const unsubscribe = room.onMessage("reaction", handler);
    return () => {
      unsubscribe();
    };
  }, [room]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[200px] overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 160, scale: 0.5 }}
            animate={{ opacity: 0, y: -40, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute flex flex-col items-center"
            style={{ left: `${r.x}%`, transform: "translateX(-50%)" }}
          >
            <span className="text-[48px]">{r.emoji}</span>
            <span className="rounded-full bg-bg-surface/80 px-2 py-0.5 font-body text-[14px] text-text-muted backdrop-blur-sm">
              {r.playerName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
