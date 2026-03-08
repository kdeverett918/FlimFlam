"use client";

import * as React from "react";

export type ParticlePreset =
  | "confetti-burst"
  | "sparkle-trail"
  | "fire-embers"
  | "golden-rain"
  | "near-miss-sparks"
  | "lightning-arc";

interface ParticleConfig {
  particleCount: number;
  spread: number;
  startVelocity: number;
  colors: string[];
  gravity?: number;
  ticks?: number;
  scalar?: number;
  drift?: number;
  shapes?: string[];
}

const PRESET_CONFIGS: Record<ParticlePreset, ParticleConfig> = {
  "confetti-burst": {
    particleCount: 60,
    spread: 60,
    startVelocity: 35,
    colors: ["#22c55e", "#3db8a0", "#e8664a", "#06b6d4"],
  },
  "sparkle-trail": {
    particleCount: 30,
    spread: 40,
    startVelocity: 20,
    colors: ["#f5c842", "#f59e0b", "#fbbf24"],
    gravity: 0.8,
    ticks: 300,
    scalar: 0.6,
  },
  "fire-embers": {
    particleCount: 25,
    spread: 30,
    startVelocity: 15,
    colors: ["#ef4444", "#f97316", "#f59e0b", "#fbbf24"],
    gravity: -0.3,
    ticks: 250,
    scalar: 0.8,
    drift: 1,
  },
  "golden-rain": {
    particleCount: 100,
    spread: 120,
    startVelocity: 55,
    colors: ["#f5c842", "#f59e0b", "#fbbf24", "#eab308", "#ca8a04"],
    gravity: 1.4,
    ticks: 400,
    scalar: 1.2,
  },
  "near-miss-sparks": {
    particleCount: 15,
    spread: 20,
    startVelocity: 12,
    colors: ["#f97316", "#ef4444", "#dc2626"],
    gravity: 1.5,
    ticks: 100,
    scalar: 0.5,
  },
  "lightning-arc": {
    particleCount: 20,
    spread: 15,
    startVelocity: 40,
    colors: ["#38bdf8", "#60a5fa", "#93c5fd", "#ffffff"],
    gravity: 0.5,
    ticks: 120,
    scalar: 0.4,
  },
};

// Global particle count tracking
let activeParticleCount = 0;
const MAX_GLOBAL_PARTICLES = 200;

export interface FireParticleOptions {
  origin?: { x: number; y: number };
  scale?: number;
  /** Max particle budget — pass from useMotionFidelity().particleBudget.maxParticles */
  maxBudget?: number;
}

function detectMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function fireParticleEffect(
  preset: ParticlePreset,
  options?: FireParticleOptions,
): Promise<void> {
  // Check reduced motion
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const config = PRESET_CONFIGS[preset];
  // Apply mobile scaling: halve particle count on mobile unless budget overrides
  const mobileScale = detectMobileDevice() ? 0.5 : 1;
  const scaledCount = Math.round(config.particleCount * (options?.scale ?? 1) * mobileScale);

  // Respect caller-provided budget or global max
  const effectiveBudget = options?.maxBudget ?? MAX_GLOBAL_PARTICLES;
  if (activeParticleCount + scaledCount > effectiveBudget) {
    return;
  }

  activeParticleCount += scaledCount;

  try {
    const mod = await import("canvas-confetti");
    const confetti = mod.default;
    confetti({
      particleCount: scaledCount,
      spread: config.spread,
      startVelocity: config.startVelocity,
      colors: [...config.colors],
      origin: options?.origin ?? { x: 0.5, y: 0.5 },
      gravity: config.gravity ?? 1.2,
      ticks: config.ticks ?? 200,
      scalar: config.scalar ?? 1,
      drift: config.drift ?? 0,
      disableForReducedMotion: true,
    });
  } finally {
    // Release after animation completes
    setTimeout(
      () => {
        activeParticleCount = Math.max(0, activeParticleCount - scaledCount);
      },
      (config.ticks ?? 200) * 16,
    );
  }
}

/** Celebration tier based on clue value */
export function getCelebrationTier(value: number): ParticlePreset {
  if (value >= 1000) return "golden-rain";
  if (value >= 600) return "sparkle-trail";
  return "confetti-burst";
}

/** Trigger celebration particles based on clue value */
export async function celebrateCorrectAnswer(value: number, isPowerPlay: boolean): Promise<void> {
  if (isPowerPlay) {
    await fireParticleEffect("golden-rain", { scale: 1.3 });
    return;
  }
  const preset = getCelebrationTier(value);
  await fireParticleEffect(preset);
}

/** Fire particle effect component (declarative) */
export function ParticleEffect({
  preset,
  trigger,
  origin,
  scale,
}: {
  preset: ParticlePreset;
  trigger: boolean;
  origin?: { x: number; y: number };
  scale?: number;
}) {
  const prevTrigger = React.useRef(false);

  React.useEffect(() => {
    if (trigger && !prevTrigger.current) {
      void fireParticleEffect(preset, { origin, scale });
    }
    prevTrigger.current = trigger;
  }, [trigger, preset, origin, scale]);

  return null;
}
