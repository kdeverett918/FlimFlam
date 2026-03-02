import { type BluffPrompt, type Complexity, shuffleInPlace } from "@flimflam/shared";

// ─── In-Memory Game State ───────────────────────────────────────────────

export interface BluffEngineInternalState {
  complexity: Complexity;
  round: number;
  totalRounds: number;
  currentPrompt: BluffPrompt | null;
  /** Map of sessionId -> their fake answer */
  fakeAnswers: Map<string, string>;
  /** All answers shown during voting (shuffled mix of fakes + real) */
  answerOptions: { text: string; isReal: boolean; authorSessionId: string | null }[];
  /** Map of sessionId -> index they voted for */
  votes: Map<string, number>;
  /** Accuracy tracking for difficulty adjustment */
  correctVoteCount: number;
  totalVoteCount: number;
  usedPromptIndices: Set<number>;
}

export function createBluffInternalState(complexity: Complexity): BluffEngineInternalState {
  return {
    complexity,
    round: 0,
    totalRounds: 0,
    currentPrompt: null,
    fakeAnswers: new Map(),
    answerOptions: [],
    votes: new Map(),
    correctVoteCount: 0,
    totalVoteCount: 0,
    usedPromptIndices: new Set(),
  };
}

// ─── Validation ─────────────────────────────────────────────────────────

export const ANSWER_MAX_LENGTH = 80;

export function validateAnswer(answer: unknown): {
  valid: boolean;
  error?: string;
  value?: string;
} {
  if (typeof answer !== "string") {
    return { valid: false, error: "Answer must be a string" };
  }
  const trimmed = answer.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Answer cannot be empty" };
  }
  if (trimmed.length > ANSWER_MAX_LENGTH) {
    return { valid: false, error: `Answer must be ${ANSWER_MAX_LENGTH} characters or less` };
  }
  return { valid: true, value: trimmed };
}

/**
 * Check if a fake answer is too similar to the real answer (case-insensitive).
 */
export function isTooSimilarToReal(fake: string, real: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalize(fake) === normalize(real);
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
export function shuffleArray<T>(arr: T[]): T[] {
  shuffleInPlace(arr);
  return arr;
}
