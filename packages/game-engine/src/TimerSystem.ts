import {
  COMPLEXITY_ROUND_COUNTS,
  COMPLEXITY_TIMER_MULTIPLIERS,
  type Complexity,
  DEFAULT_PHASE_TIMERS,
} from "@partyline/shared";

/**
 * Compute the duration of a given phase, adjusted for complexity.
 * Returns the duration in milliseconds.
 */
export function computePhaseDuration(phase: string, complexity: Complexity): number {
  const baseMs = DEFAULT_PHASE_TIMERS[phase];
  if (baseMs === undefined) {
    return 30_000;
  }
  const multiplier = COMPLEXITY_TIMER_MULTIPLIERS[complexity];
  return Math.round(baseMs * multiplier);
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
