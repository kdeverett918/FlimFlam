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

export function computeMedianVoteValue(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid] ?? 0;
  }
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

/**
 * Calculate majority round scores.
 * Players score based on proximity to the group median.
 */
export function calculateMajorityScores(
  votes: Map<string, number>,
): Map<string, { points: number; reason: string }> {
  const results = new Map<string, { points: number; reason: string }>();
  const values = Array.from(votes.values());

  if (values.length === 0) return results;

  const median = computeMedianVoteValue(values);

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
  const entries = Array.from(votes.entries());
  if (entries.length === 0) return results;

  const len = entries.length;
  const sum = entries.reduce((total, [, v]) => total + v, 0);

  const distances = entries.map(([sessionId, vote]) => ({
    sessionId,
    distanceNumerator: Math.abs(vote * len - sum),
  }));

  let maxDistance = 0;
  let minDistance = Number.POSITIVE_INFINITY;
  for (const d of distances) {
    maxDistance = Math.max(maxDistance, d.distanceNumerator);
    minDistance = Math.min(minDistance, d.distanceNumerator);
  }

  // If everyone is equally (un)unique, treat it as "no lone wolves" and award default points.
  if (maxDistance === 0 || maxDistance === minDistance) {
    for (const d of distances) {
      results.set(d.sessionId, {
        points: SCORING.LONE_WOLF_DEFAULT,
        reason: "No lone wolves this round",
      });
    }
    return results;
  }

  distances.sort((a, b) => b.distanceNumerator - a.distanceNumerator);

  const topDistance = distances[0]?.distanceNumerator ?? 0;
  const secondDistance = distances.find(
    (d) => d.distanceNumerator < topDistance,
  )?.distanceNumerator;

  for (const d of distances) {
    if (d.distanceNumerator === topDistance) {
      results.set(d.sessionId, {
        points: SCORING.LONE_WOLF_MOST_UNIQUE,
        reason: "Lone wolf! Most unique opinion",
      });
    } else if (secondDistance !== undefined && d.distanceNumerator === secondDistance) {
      results.set(d.sessionId, {
        points: SCORING.LONE_WOLF_SECOND,
        reason: "Second most unique",
      });
    } else {
      results.set(d.sessionId, {
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
