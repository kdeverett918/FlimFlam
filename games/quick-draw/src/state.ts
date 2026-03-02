import type { Complexity } from "@flimflam/shared";

// ─── In-Memory Game State ───────────────────────────────────────────────

export interface QuickDrawInternalState {
  complexity: Complexity;
  round: number;
  totalRounds: number;
  currentWord: string;
  currentDrawerSessionId: string;
  drawerOrder: string[];
  drawerIndex: number;
  guessedPlayers: Set<string>;
  guessOrder: string[];
  recentGuesses: Array<{ playerName: string; guess: string; correct: boolean }>;
  usedWords: Set<string>;
  roundStartTime: number;
}

export function createQuickDrawInternalState(complexity: Complexity): QuickDrawInternalState {
  return {
    complexity,
    round: 0,
    totalRounds: 0,
    currentWord: "",
    currentDrawerSessionId: "",
    drawerOrder: [],
    drawerIndex: 0,
    guessedPlayers: new Set(),
    guessOrder: [],
    recentGuesses: [],
    usedWords: new Set(),
    roundStartTime: 0,
  };
}

// ─── Guess Validation ───────────────────────────────────────────────────

export function isCorrectGuess(guess: string, word: string): boolean {
  const normalize = (s: string) => {
    const withoutDiacritics = s
      .normalize("NFD")
      // Strip combining marks (accents/diacritics)
      .replace(/\p{M}/gu, "");

    return (
      withoutDiacritics
        .toLowerCase()
        // Treat punctuation/symbols as word separators.
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/\s+/g, " ")
    );
  };
  return normalize(guess) === normalize(word);
}

/**
 * Get score for a guesser based on their position in the guess order.
 * First: 500, Second: 400, Third: 300, Fourth: 200, Fifth+: 100
 */
export function getGuessScore(position: number): number {
  const scores = [500, 400, 300, 200, 100];
  return scores[Math.min(position, scores.length - 1)] ?? 100;
}

/**
 * Get drawer score: 100 points per correct guesser.
 */
export function getDrawerScore(correctGuessCount: number): number {
  return correctGuessCount * 100;
}
