"use client";

import {
  GlassPanel,
  createScopedTimeline,
  fireParticleEffect,
  haptics,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { useEffect, useRef, useState } from "react";
import type { BoardCategory } from "../../shared/bb-types";

interface HostCategoryRevealProps {
  board: BoardCategory[];
  currentRound: number;
  personalizationMessage: string | null;
  personalizationStatus: "pending" | "ai" | "curated" | null;
}

const ENTRY_DIRECTIONS = [
  { x: -300, y: 0 },
  { x: 300, y: 0 },
  { x: 0, y: -200 },
  { x: 300, y: 0 },
  { x: -300, y: 0 },
  { x: 0, y: 200 },
];

export function HostCategoryReveal({
  board,
  currentRound,
  personalizationMessage,
  personalizationStatus,
}: HostCategoryRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [_animComplete, setAnimComplete] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) {
      setAnimComplete(true);
      return;
    }

    const container = containerRef.current;
    const tl = createScopedTimeline(containerRef);

    tl.set(container.querySelector('[data-anim="dim"]'), { opacity: 1 });

    const categoryEls = container.querySelectorAll('[data-anim="category"]');
    const holdDuration = 1.2;
    const entryDuration = 0.6;

    for (let i = 0; i < categoryEls.length; i++) {
      const el = categoryEls[i];
      if (!el) continue;
      const dir = ENTRY_DIRECTIONS[i % ENTRY_DIRECTIONS.length] ?? { x: 0, y: 0 };
      const startTime = i * (holdDuration + entryDuration + 0.2);

      tl.fromTo(
        el,
        { opacity: 0, x: dir.x, y: dir.y, scale: 1.5 },
        { opacity: 1, x: 0, y: 0, scale: 1.5, duration: entryDuration, ease: "back.out(1.4)" },
        startTime,
      );
      tl.call(() => sounds.cardFlip(), [], startTime);
      tl.to(
        el,
        { scale: 1, duration: 0.5, ease: "power2.inOut" },
        startTime + entryDuration + holdDuration,
      );
    }

    const allDoneTime = categoryEls.length * (holdDuration + entryDuration + 0.2) + 0.5;

    tl.fromTo(
      container.querySelector('[data-anim="pulse-wave"]'),
      { scale: 0, opacity: 0.8 },
      { scale: 4, opacity: 0, duration: 1.0, ease: "power2.out" },
      allDoneTime,
    );

    tl.fromTo(
      container.querySelector('[data-anim="title"]'),
      { opacity: 0, scale: 3 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "power4.out" },
      allDoneTime + 0.2,
    );

    tl.call(
      () => {
        sounds.reveal();
        haptics.celebrate();
        void fireParticleEffect("golden-rain", { scale: 1.2 });
      },
      [],
      allDoneTime + 0.2,
    );

    tl.to(
      container.querySelector('[data-anim="dim"]'),
      { opacity: 0, duration: 0.6 },
      allDoneTime + 0.5,
    );

    tl.fromTo(
      container.querySelector('[data-anim="personalization"]'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 },
      allDoneTime + 0.8,
    );

    tl.call(() => setAnimComplete(true), [], allDoneTime + 1.0);

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  const titleText = currentRound === 2 ? "DOUBLE DOWN!" : "BRAIN BOARD!";

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-8 p-8 min-h-[400px]"
    >
      <div
        data-anim="dim"
        className="absolute inset-0 pointer-events-none bg-black/80 z-0"
        style={{ opacity: reducedMotion ? 0 : 0 }}
      />
      <div
        data-anim="pulse-wave"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 h-32 w-32 rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.68 0.22 265 / 0.5) 0%, transparent 70%)",
          opacity: 0,
        }}
      />
      <h1
        data-anim="title"
        className="font-display text-[clamp(48px,6vw,72px)] font-black text-accent-brainboard relative z-10"
        style={{
          textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.6), 0 0 80px oklch(0.68 0.22 265 / 0.3)",
          opacity: reducedMotion ? 1 : 0,
        }}
      >
        {titleText}
      </h1>
      <div className="flex flex-wrap justify-center gap-4 relative z-10">
        {board.map((cat) => (
          <div key={cat.name} data-anim="category" style={{ opacity: reducedMotion ? 1 : 0 }}>
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.22 265 / 0.3)"
              className="flex items-center justify-center px-8 py-6"
            >
              <span className="font-display text-[clamp(24px,3vw,36px)] font-bold text-accent-brainboard text-center uppercase">
                {cat.name}
              </span>
            </GlassPanel>
          </div>
        ))}
      </div>
      {personalizationMessage && personalizationStatus && (
        <div
          data-anim="personalization"
          style={{ opacity: reducedMotion ? 1 : 0 }}
          className="relative z-10"
        >
          <GlassPanel
            glow={personalizationStatus === "ai"}
            glowColor={
              personalizationStatus === "ai"
                ? "oklch(0.68 0.22 265 / 0.25)"
                : "oklch(0.78 0.16 95 / 0.22)"
            }
            className="max-w-4xl px-6 py-4 text-center"
          >
            <span
              data-testid="brainboard-personalization-badge"
              className={`inline-flex rounded-full border px-3 py-1 font-display text-xs font-bold uppercase tracking-wider ${
                personalizationStatus === "curated"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-accent-brainboard/35 bg-accent-brainboard/10 text-accent-brainboard"
              }`}
            >
              {personalizationStatus === "curated" ? "Curated" : "AI Personalized"}
            </span>
            <p
              data-testid="brainboard-personalization-message"
              className={`font-body text-[clamp(14px,1.7vw,20px)] ${personalizationStatus === "curated" ? "text-warning" : "text-text-primary"}`}
            >
              {personalizationMessage}
            </p>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
