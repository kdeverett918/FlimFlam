"use client";

import { createScopedTimeline, fireParticleEffect, sounds, useReducedMotion } from "@flimflam/ui";
import { useEffect, useRef } from "react";

export function HostRoundTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const container = containerRef.current;
    const tl = createScopedTimeline(containerRef);

    // Act 1: "ROUND 1 COMPLETE" fades in/out (0-2s)
    tl.fromTo(
      container.querySelector('[data-anim="round-complete"]'),
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" },
      0,
    );
    tl.call(() => sounds.whoosh(), [], 0);
    tl.to(
      container.querySelector('[data-anim="round-complete"]'),
      { opacity: 0, duration: 0.4 },
      1.6,
    );

    // Act 2: Amber gradient wave (2-4s)
    tl.fromTo(
      container.querySelector('[data-anim="amber-wave"]'),
      { scaleX: 0, opacity: 0.8 },
      { scaleX: 1, opacity: 0, duration: 1.5, ease: "power2.inOut" },
      2.0,
    );

    // Act 3: "DOUBLE DOWN!" slams from scale(4)->1 (3.5-5.5s)
    tl.fromTo(
      container.querySelector('[data-anim="double-down"]'),
      { opacity: 0, scale: 4 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "power4.out" },
      3.5,
    );
    tl.call(
      () => {
        sounds.powerPlay();
        void fireParticleEffect("fire-embers", { scale: 1.5, origin: { x: 0.5, y: 0.5 } });
      },
      [],
      3.5,
    );

    // Subtitle
    tl.fromTo(
      container.querySelector('[data-anim="subtitle"]'),
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      4.3,
    );

    // Rapid card flip sounds
    tl.call(
      () => {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => sounds.cardFlip(), i * 100);
        }
      },
      [],
      5.5,
    );

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-6 p-8 min-h-[400px] overflow-hidden"
    >
      {/* Act 1: Round Complete */}
      <div
        data-anim="round-complete"
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: reducedMotion ? 0 : 0 }}
      >
        <span className="font-display text-[clamp(36px,5vw,64px)] font-bold text-text-primary">
          ROUND 1 COMPLETE
        </span>
      </div>

      {/* Act 2: Amber gradient wave */}
      <div
        data-anim="amber-wave"
        className="absolute inset-0 pointer-events-none origin-left"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, oklch(0.82 0.18 85 / 0.4) 40%, oklch(0.82 0.18 85 / 0.6) 60%, transparent 100%)",
          opacity: 0,
        }}
      />

      {/* Act 3: DOUBLE DOWN! slam */}
      <div
        data-anim="double-down"
        className="flex flex-col items-center gap-4"
        style={{ opacity: reducedMotion ? 1 : 0 }}
      >
        <h1
          className="font-display text-[clamp(48px,8vw,96px)] font-black text-center"
          style={{
            color: "oklch(0.82 0.18 85)",
            textShadow: "0 0 40px oklch(0.82 0.18 85 / 0.6), 0 0 80px oklch(0.82 0.18 85 / 0.3)",
          }}
        >
          DOUBLE DOWN!
        </h1>
      </div>

      {/* Subtitle */}
      <div data-anim="subtitle" style={{ opacity: reducedMotion ? 1 : 0 }}>
        <p className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted text-center">
          Values are doubled. Stakes are higher.
        </p>
      </div>

      {/* Decorative accent line */}
      <div
        className="h-[2px] w-32 rounded-full"
        style={{
          backgroundColor: "oklch(0.82 0.18 85)",
          boxShadow: "0 0 16px oklch(0.82 0.18 85 / 0.6)",
        }}
      />
    </div>
  );
}
