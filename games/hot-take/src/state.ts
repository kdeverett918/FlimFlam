import type {
  Complexity,
  GeneratedHotTakePrompt,
  HotTakePlayerProfile,
  HotTakeRoundHistory,
} from "@partyline/shared";

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
  usePlayerInput: boolean;
  playerProfiles: HotTakePlayerProfile[];
  profilesSubmitted: Set<string>;
  aiGeneratedPrompts: GeneratedHotTakePrompt[];
  roundHistory: HotTakeRoundHistory[];
  topicCategory: string;
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
    usePlayerInput: false,
    playerProfiles: [],
    profilesSubmitted: new Set(),
    aiGeneratedPrompts: [],
    roundHistory: [],
    topicCategory: "general",
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

export function validateTopicSubmission(value: unknown): {
  valid: boolean;
  error?: string;
  value?: { content: string; category: string };
} {
  const msg = value as { content?: unknown; category?: unknown } | undefined;
  if (!msg || typeof msg.content !== "string") {
    return { valid: false, error: "Topic must be a string" };
  }

  const content = msg.content.trim().slice(0, 140);
  if (!content) {
    return { valid: false, error: "Topic cannot be empty" };
  }

  const category =
    typeof msg.category === "string" && msg.category.trim().length > 0
      ? msg.category.trim().slice(0, 32)
      : "wildcard";

  return { valid: true, value: { content, category } };
}

export function computeRoundStats(
  statement: string,
  round: number,
  votes: Map<string, number>,
): HotTakeRoundHistory {
  const values = Array.from(votes.values());
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length > 0 ? (sorted[Math.floor(sorted.length / 2)] ?? 0) : 0;

  const mean = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  const spread =
    values.length > 0
      ? Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
      : 0;

  const range = values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
  const hasNegativeExtreme = values.some((v) => v <= -1);
  const hasPositiveExtreme = values.some((v) => v >= 1);

  return {
    round,
    statement,
    votes: new Map(votes),
    median,
    spread,
    wasUnanimous: range <= 1,
    wasPolarized: spread > 1.5 || (hasNegativeExtreme && hasPositiveExtreme),
  };
}
