"use client";

import * as React from "react";

interface ConfettiBurstProps {
  trigger: boolean;
  preset?: "win" | "correct" | "celebration";
  origin?: { x: number; y: number };
}

const presetConfigs = {
  win: {
    particleCount: 80,
    spread: 70,
    startVelocity: 45,
    colors: ["#e8664a", "#3db8a0", "#06b6d4", "#22c55e", "#f59e0b"],
  },
  correct: {
    particleCount: 40,
    spread: 50,
    startVelocity: 30,
    colors: ["#22c55e", "#3db8a0", "#e8664a"],
  },
  celebration: {
    particleCount: 90,
    spread: 90,
    startVelocity: 50,
    colors: ["#e8664a", "#3db8a0", "#f59e0b", "#06b6d4", "#22c55e", "#f5c842"],
  },
} as const;

function ConfettiBurst({ trigger, preset = "celebration", origin }: ConfettiBurstProps) {
  const prevTrigger = React.useRef(false);
  const originX = origin?.x ?? 0.5;
  const originY = origin?.y ?? 0.5;

  React.useEffect(() => {
    if (trigger && !prevTrigger.current) {
      const config = presetConfigs[preset];
      import("canvas-confetti").then((mod) => {
        const confetti = mod.default;
        confetti({
          particleCount: config.particleCount,
          spread: config.spread,
          startVelocity: config.startVelocity,
          colors: [...config.colors],
          origin: { x: originX, y: originY },
          disableForReducedMotion: true,
          ticks: 200,
          gravity: 1.2,
          scalar: 1,
          drift: 0,
        });
      });
    }
    prevTrigger.current = trigger;
  }, [trigger, preset, originX, originY]);

  return null;
}
ConfettiBurst.displayName = "ConfettiBurst";

export { ConfettiBurst };
export type { ConfettiBurstProps };
