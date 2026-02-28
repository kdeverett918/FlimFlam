import type { RoundType } from "./state";

/**
 * Hot Take scoring.
 *
 * Majority rounds: Score based on how close you are to the group average.
 *   - Exact match with median: 200 points
 *   - Off by 1: 100 points
 *   - Off by 2+: 50 points
 *
 * Lone-wolf rounds: Score based on how far you are from everyone else.
 *   - Most unique vote (furthest from average): 200 points
 *   - Second most unique: 100 points
 *   - Everyone else: 50 points
 */

export const SCORING = {
  MAJORITY_EXACT: 200,
  MAJORITY_CLOSE: 100,
  MAJORITY_FAR: 50,
  LONE_WOLF_MOST_UNIQUE: 200,
  LONE_WOLF_SECOND: 100,
  LONE_WOLF_DEFAULT: 50,
} as const;

/**
 * Calculate majority round scores.
 * Players score based on proximity to the group median.
 */
export function calculateMajorityScores(
  votes: Map<string, number>,
): Map<string, { points: number; reason: string }> {
  const results = new Map<string, { points: number; reason: string }>();
  const values = Array.from(votes.values()).sort((a, b) => a - b);

  if (values.length === 0) return results;

  // Calculate median
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 !== 0
      ? (values[mid] ?? 0)
      : Math.round(((values[mid - 1] ?? 0) + (values[mid] ?? 0)) / 2);

  for (const [sessionId, vote] of votes) {
    const distance = Math.abs(vote - median);
    if (distance === 0) {
      results.set(sessionId, { points: SCORING.MAJORITY_EXACT, reason: "Matched the majority!" });
    } else if (distance === 1) {
      results.set(sessionId, { points: SCORING.MAJORITY_CLOSE, reason: "Close to majority" });
    } else {
      results.set(sessionId, { points: SCORING.MAJORITY_FAR, reason: "Far from majority" });
    }
  }

  return results;
}

/**
 * Calculate lone-wolf round scores.
 * Players score based on how far they are from the group average.
 */
export function calculateLoneWolfScores(
  votes: Map<string, number>,
): Map<string, { points: number; reason: string }> {
  const results = new Map<string, { points: number; reason: string }>();
  const values = Array.from(votes.values());

  if (values.length === 0) return results;

  // Calculate average
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  // Calculate distance from average for each player
  const distances: { sessionId: string; distance: number }[] = [];
  for (const [sessionId, vote] of votes) {
    distances.push({ sessionId, distance: Math.abs(vote - avg) });
  }

  // Sort by distance descending (most unique first)
  distances.sort((a, b) => b.distance - a.distance);

  for (let i = 0; i < distances.length; i++) {
    const entry = distances[i];
    if (!entry) continue;
    if (i === 0) {
      results.set(entry.sessionId, {
        points: SCORING.LONE_WOLF_MOST_UNIQUE,
        reason: "Lone wolf! Most unique opinion",
      });
    } else if (i === 1) {
      results.set(entry.sessionId, {
        points: SCORING.LONE_WOLF_SECOND,
        reason: "Second most unique",
      });
    } else {
      results.set(entry.sessionId, {
        points: SCORING.LONE_WOLF_DEFAULT,
        reason: "Part of the crowd",
      });
    }
  }

  return results;
}

/**
 * Calculate scores for a round based on round type.
 */
export function calculateRoundScores(
  votes: Map<string, number>,
  roundType: RoundType,
): Map<string, { points: number; reason: string }> {
  if (roundType === "majority") {
    return calculateMajorityScores(votes);
  }
  return calculateLoneWolfScores(votes);
}
