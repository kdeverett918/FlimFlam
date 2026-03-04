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

  const scaledMs = Math.max(250, Math.round(resolvedMs * multiplier * safeScale));

  // In non-E2E environments, keep Brain Board topic chat visible long enough
  // for players to actually interact even if global timer scaling is aggressive.
  if (phase === "topic-chat" && process.env.FLIMFLAM_E2E !== "1") {
    const rawFloor = process.env.FLIMFLAM_TOPIC_CHAT_MIN_MS;
    const configuredFloor = rawFloor ? Number(rawFloor) : 20_000;
    const safeFloor = Number.isFinite(configuredFloor) ? Math.max(0, configuredFloor) : 20_000;
    return Math.max(scaledMs, safeFloor);
  }

  return scaledMs;
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
