"use client";

import { useMemo } from "react";
import { PARTICLE_LIMITS } from "../lib/animation";
import { useReducedMotion } from "./useReducedMotion";

export type MotionFidelity = "full" | "reduced" | "minimal";

export interface MotionFidelityResult {
  fidelity: MotionFidelity;
  particleBudget: (typeof PARTICLE_LIMITS)[keyof typeof PARTICLE_LIMITS];
}

function detectLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;
  if (hardwareConcurrency <= 2) return true;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === "number" && memory <= 2) return true;
  return false;
}

export function useMotionFidelity(): MotionFidelityResult {
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    if (reducedMotion) {
      return { fidelity: "minimal" as const, particleBudget: PARTICLE_LIMITS.minimal };
    }
    if (detectLowEndDevice()) {
      return { fidelity: "reduced" as const, particleBudget: PARTICLE_LIMITS.mobile };
    }
    return { fidelity: "full" as const, particleBudget: PARTICLE_LIMITS.desktop };
  }, [reducedMotion]);
}
