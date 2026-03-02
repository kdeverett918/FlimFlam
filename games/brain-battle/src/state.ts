import type { BrainBattleClue, Complexity, GeneratedBoard } from "@flimflam/shared";

export interface BrainBattleInternalState {
  complexity: Complexity;
  topics: string[];
  topicSubmissions: Map<string, string[]>;
  board: GeneratedBoard | null;
  answeredClues: Set<string>;
  cluesRemaining: number;
  currentClueId: string | null;
  currentClue: BrainBattleClue | null;
  selectorSessionId: string;
  buzzTimestamps: Map<string, number>;
  buzzWinnerId: string | null;
  lastCorrectAnswerer: string | null;
  appealsRemaining: Map<string, number>;
  currentAppeal: {
    playerId: string;
    playerAnswer: string;
    argument: string;
  } | null;
  turnOrder: string[];
  wrongAnswerSessionId: string | null;
  currentClueValue: number;
}

export function createBrainBattleInternalState(complexity: Complexity): BrainBattleInternalState {
  return {
    complexity,
    topics: [],
    topicSubmissions: new Map(),
    board: null,
    answeredClues: new Set(),
    cluesRemaining: 25,
    currentClueId: null,
    currentClue: null,
    selectorSessionId: "",
    buzzTimestamps: new Map(),
    buzzWinnerId: null,
    lastCorrectAnswerer: null,
    appealsRemaining: new Map(),
    currentAppeal: null,
    turnOrder: [],
    wrongAnswerSessionId: null,
    currentClueValue: 0,
  };
}

export const TOPIC_MAX_LENGTH = 40;
export const MAX_TOPICS_PER_PLAYER = 3;
export const APPEALS_PER_PLAYER = 2;
export const ANSWER_MAX_LENGTH = 100;
export const APPEAL_MAX_LENGTH = 140;

export function validateTopicSubmission(topics: unknown): {
  valid: boolean;
  error?: string;
  value?: string[];
} {
  if (!Array.isArray(topics)) {
    return { valid: false, error: "Topics must be an array" };
  }

  if (topics.length === 0) {
    return { valid: false, error: "Must submit at least 1 topic" };
  }

  if (topics.length > MAX_TOPICS_PER_PLAYER) {
    return {
      valid: false,
      error: `Cannot submit more than ${MAX_TOPICS_PER_PLAYER} topics`,
    };
  }

  const trimmed: string[] = [];
  for (const topic of topics) {
    if (typeof topic !== "string") {
      return { valid: false, error: "Each topic must be a string" };
    }
    const t = topic.trim();
    if (t.length === 0) {
      return { valid: false, error: "Topics cannot be empty" };
    }
    if (t.length > TOPIC_MAX_LENGTH) {
      return {
        valid: false,
        error: `Each topic must be ${TOPIC_MAX_LENGTH} characters or fewer`,
      };
    }
    trimmed.push(t);
  }

  return { valid: true, value: trimmed };
}

export function findBuzzWinner(timestamps: Map<string, number>): string | null {
  let winner: string | null = null;
  let earliest = Number.POSITIVE_INFINITY;

  for (const [sessionId, ts] of timestamps) {
    if (ts < earliest) {
      earliest = ts;
      winner = sessionId;
    }
  }

  return winner;
}

const ANSWER_PREFIXES = /^(what|who|where)\s+(is|are)\s+(a\s+|an\s+|the\s+)?/i;

export function normalizeAnswer(raw: string): string {
  let s = raw.toLowerCase().trim();
  s = s.replace(ANSWER_PREFIXES, "");
  s = s.replace(/[^\w\s']/g, "");
  s = s.replace(/\s+/g, " ");
  s = s.trim();
  return s;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  const curr: number[] = Array.from({ length: n + 1 }, () => 0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j] ?? 0;
    }
  }

  return prev[n] ?? 0;
}

export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.85;

export function fuzzyMatch(playerAnswer: string, correctQuestion: string): boolean {
  const normPlayer = normalizeAnswer(playerAnswer);
  const normCorrect = normalizeAnswer(correctQuestion);

  if (stringSimilarity(normPlayer, normCorrect) >= FUZZY_THRESHOLD) {
    return true;
  }

  if (
    normPlayer.length > 0 &&
    normCorrect.length > 0 &&
    (normPlayer.includes(normCorrect) || normCorrect.includes(normPlayer))
  ) {
    return true;
  }

  return false;
}

const CLUE_ID_PATTERN = /^cat(\d+)_clue(\d+)$/;

export function getClueById(board: GeneratedBoard, clueId: string): BrainBattleClue | null {
  const match = clueId.match(CLUE_ID_PATTERN);
  if (!match?.[1] || !match[2]) return null;

  const catIndex = Number.parseInt(match[1], 10);
  const clueIndex = Number.parseInt(match[2], 10);

  const category = board.categories[catIndex];
  if (!category) return null;

  const clue = category.clues[clueIndex];
  if (!clue) return null;

  return clue;
}

export function isBoardComplete(answeredClues: Set<string>, totalClues: number): boolean {
  return answeredClues.size >= totalClues;
}

export function assignClueIds(board: GeneratedBoard): GeneratedBoard {
  for (let catIndex = 0; catIndex < board.categories.length; catIndex++) {
    const category = board.categories[catIndex];
    if (!category) continue;
    for (let clueIndex = 0; clueIndex < category.clues.length; clueIndex++) {
      const clue = category.clues[clueIndex];
      if (!clue) continue;
      clue.id = `cat${catIndex}_clue${clueIndex}`;
    }
  }
  return board;
}
