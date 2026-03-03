import {
  COMPLEXITY_ROUND_COUNTS,
  COMPLEXITY_TIMER_MULTIPLIERS,
  type Complexity,
  DEFAULT_PHASE_TIMERS,
} from "@flimflam/shared";

/**
 * Compute the duration of a given phase, adjusted for complexity.
 * Returns the duration in milliseconds.
 */
export function computePhaseDuration(phase: string, complexity: Complexity): number {
  const baseMs = DEFAULT_PHASE_TIMERS[phase];
  if (baseMs === undefined) {
    console.warn(
      `[TimerSystem] No timer configured for phase "${phase}", falling back to 30s. Add it to DEFAULT_PHASE_TIMERS in packages/shared/src/constants.ts`,
    );
  }
  const resolvedMs = baseMs ?? 30_000;
  const multiplier = COMPLEXITY_TIMER_MULTIPLIERS[complexity];

  const rawScale = process.env.FLIMFLAM_TIMER_SCALE;
  const scale = rawScale ? Number(rawScale) : 1;
  const safeScale = Number.isFinite(scale) && scale > 0 ? Math.min(Math.max(scale, 0.01), 10) : 1;

  return Math.max(250, Math.round(resolvedMs * multiplier * safeScale));
}

/**
 * Compute the absolute timestamp when a timer should expire for a given phase/complexity.
 */
export function computeTimerEndTimestamp(phase: string, complexity: Complexity): number {
  return Date.now() + computePhaseDuration(phase, complexity);
}

/**
 * Determine how many rounds a game should have for a given complexity.
 * If customRounds is provided, it overrides the default.
 */
export function getRoundCount(complexity: Complexity, customRounds?: number): number {
  if (customRounds !== undefined && customRounds > 0) {
    return customRounds;
  }
  return COMPLEXITY_ROUND_COUNTS[complexity];
}
