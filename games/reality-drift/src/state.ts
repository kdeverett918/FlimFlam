import { type Complexity, type TriviaQuestion, randomFloat } from "@flimflam/shared";

// ─── In-Memory Game State ───────────────────────────────────────────────

export interface RealityDriftInternalState {
  complexity: Complexity;
  round: number;
  totalRounds: number;
  questions: TriviaQuestion[];
  currentQuestion: TriviaQuestion | null;
  /** Map of sessionId -> selected option index */
  answers: Map<string, number>;
  /** Map of sessionId -> whether they called drift */
  driftCalls: Map<string, boolean>;
}

export function createRealityDriftInternalState(complexity: Complexity): RealityDriftInternalState {
  return {
    complexity,
    round: 0,
    totalRounds: 0,
    questions: [],
    currentQuestion: null,
    answers: new Map(),
    driftCalls: new Map(),
  };
}

/**
 * Compute the progressive drift schedule.
 * Early rounds have fewer drift questions; later rounds have more.
 * Returns the total number of drift questions for the given round count.
 */
export function computeDriftCount(totalRounds: number, complexity: Complexity): number {
  switch (complexity) {
    case "kids":
      // ~30% drift for kids (fewer, easier to spot)
      return Math.max(1, Math.round(totalRounds * 0.3));
    case "standard":
      // ~30% drift
      return Math.max(1, Math.round(totalRounds * 0.3));
    case "advanced":
      // ~40% drift (more difficult)
      return Math.max(1, Math.round(totalRounds * 0.4));
  }
}

/**
 * Choose which rounds should be drift.
 * Weighted toward later rounds so the game "slowly starts lying".
 *
 * - Returns a boolean array of length totalRounds.
 * - Tries to keep round 1 real when possible.
 */
export function computeDriftSchedule(
  totalRounds: number,
  driftCount: number,
  complexity: Complexity,
): boolean[] {
  const schedule = Array.from({ length: Math.max(0, totalRounds) }, () => false);
  if (totalRounds <= 0 || driftCount <= 0) return schedule;

  // Prefer a real opening round so players learn the rules before the first lie.
  const keepFirstReal = totalRounds > 1;

  const candidates: number[] = [];
  for (let i = 0; i < totalRounds; i++) {
    if (keepFirstReal && i === 0) continue;
    candidates.push(i);
  }

  const targetCount = Math.min(driftCount, candidates.length);
  if (targetCount <= 0) return schedule;

  const exponent = complexity === "kids" ? 2.4 : complexity === "standard" ? 2.0 : 1.6;

  const weights = candidates.map((roundIndex) => {
    const t = (roundIndex + 1) / totalRounds;
    return t ** exponent;
  });

  const chosen: number[] = [];
  for (let pick = 0; pick < targetCount; pick++) {
    let totalWeight = 0;
    for (const w of weights) totalWeight += w;
    let r = randomFloat() * totalWeight;

    let selectedIdx = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i] ?? 0;
      if (r <= 0) {
        selectedIdx = i;
        break;
      }
    }

    const chosenRound = candidates[selectedIdx];
    if (chosenRound !== undefined) {
      chosen.push(chosenRound);
      candidates.splice(selectedIdx, 1);
      weights.splice(selectedIdx, 1);
    }
  }

  for (const idx of chosen) {
    if (idx >= 0 && idx < schedule.length) schedule[idx] = true;
  }
  return schedule;
}
