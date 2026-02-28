/**
 * World Builder scoring constants and helpers.
 *
 * Per-round: 0-200 points from AI judgment based on creativity and relevance
 * End bonuses:
 *   - Best Action: +150
 *   - Chaos Agent: +100
 *   - Survivor (stayed connected the entire game): +100
 */

export const SCORING = {
  /** Max per-round points awarded by AI */
  MAX_ROUND_POINTS: 200,
  /** Bonus for the best single action across all rounds */
  BEST_ACTION_BONUS: 150,
  /** Bonus for causing the most chaos */
  CHAOS_AGENT_BONUS: 100,
  /** Bonus for staying connected the entire game */
  SURVIVOR_BONUS: 100,
  /** Default points if AI fails to score */
  DEFAULT_ROUND_POINTS: 50,
} as const;

/**
 * Clamp points to valid range.
 */
export function clampRoundPoints(points: number): number {
  return Math.max(0, Math.min(points, SCORING.MAX_ROUND_POINTS));
}
