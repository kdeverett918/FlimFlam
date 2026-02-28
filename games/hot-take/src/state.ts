import type { Complexity } from "@partyline/shared";

// ─── In-Memory Game State ───────────────────────────────────────────────

export type RoundType = "majority" | "lone-wolf";

export interface HotTakeInternalState {
  complexity: Complexity;
  round: number;
  totalRounds: number;
  currentPrompt: string;
  currentRoundType: RoundType;
  /** Map of sessionId -> their vote (-2 to +2) */
  votes: Map<string, number>;
  usedPromptIndices: Set<number>;
}

export function createHotTakeInternalState(complexity: Complexity): HotTakeInternalState {
  return {
    complexity,
    round: 0,
    totalRounds: 0,
    currentPrompt: "",
    currentRoundType: "majority",
    votes: new Map(),
    usedPromptIndices: new Set(),
  };
}

/**
 * Determine round type: alternating majority/lone-wolf.
 * Odd rounds are majority, even rounds are lone-wolf.
 */
export function getRoundType(round: number): RoundType {
  return round % 2 === 1 ? "majority" : "lone-wolf";
}

/**
 * Validate a slider vote (-2 to +2).
 */
export function validateSliderVote(value: unknown): {
  valid: boolean;
  error?: string;
  value?: number;
} {
  if (typeof value !== "number") {
    return { valid: false, error: "Vote must be a number" };
  }
  if (!Number.isInteger(value) || value < -2 || value > 2) {
    return { valid: false, error: "Vote must be an integer from -2 to +2" };
  }
  return { valid: true, value };
}
