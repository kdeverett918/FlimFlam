import type { Complexity, TriviaQuestion } from "@partyline/shared";

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
