import type { MapSchema, Schema } from "@colyseus/schema";
import { BaseGamePlugin } from "@flimflam/game-engine";
import type { Complexity, GameManifest } from "@flimflam/shared";
import { pickRandom, shuffleInPlace } from "@flimflam/shared";
import type { Client, Room } from "colyseus";
import { type WheelPuzzle, getCategories, getPuzzleBank } from "./content/phrase-bank";
import { type SpinResult, spinWheel } from "./wheel";

// ─── Constants ─────────────────────────────────────────────────────────────

const VOWEL_COST = 250;
const VOWELS = new Set(["A", "E", "I", "O", "U"]);
const CONSONANTS = new Set("BCDFGHJKLMNPQRSTVWXYZ".split(""));
const RSTLNE = new Set(["R", "S", "T", "L", "N", "E"]);
const BONUS_PRIZE = 25000;
const _BONUS_SOLVE_TIME_MS = 10000;

const CATEGORY_VOTE_TIMEOUT_MS = 25000;
const SPIN_IDLE_TIMEOUT_MS = 20000;
const GUESS_IDLE_TIMEOUT_MS = 15000;
const BUY_VOWEL_IDLE_TIMEOUT_MS = 12000;
const SOLVE_IDLE_TIMEOUT_MS = 15000;
const ROUND_INTRO_DELAY_MS = 3000;
const LETTER_RESULT_DELAY_MS = 2000;
const ROUND_RESULT_DELAY_MS = 4000;
const SPIN_ANIMATION_DELAY_MS = 3500;
const BONUS_REVEAL_DELAY_MS = 5000;
const E2E_SOLVE_TOKEN_DEFAULT = "__E2E_SOLVE__";
const SOLVE_BONUS_BY_COMPLEXITY: Record<Complexity, number> = {
  kids: 500,
  standard: 1000,
  advanced: 1500,
};

/** How many rounds by complexity. */
function getRoundsForComplexity(complexity: Complexity): number {
  switch (complexity) {
    case "kids":
      return 3;
    case "standard":
      return 4;
    case "advanced":
      return 5;
  }
}

/** Whether the bonus round is available for this complexity. */
function hasBonusRound(complexity: Complexity): boolean {
  return complexity !== "kids";
}

// ─── Puzzle display helpers ────────────────────────────────────────────────

/**
 * Build the display string for a puzzle given revealed letters.
 * Unrevealed letters become underscores. Spaces and punctuation are preserved.
 */
export function buildPuzzleDisplay(phrase: string, revealed: Set<string>): string {
  return phrase
    .split("")
    .map((ch) => {
      const upper = ch.toUpperCase();
      if (/[A-Z]/.test(upper)) {
        return revealed.has(upper) ? upper : "_";
      }
      // Non-letter characters (spaces, punctuation, hyphens, ampersands) show through
      return ch;
    })
    .join("");
}

/**
 * Count how many times a letter appears in a phrase.
 */
export function countLetterInPhrase(phrase: string, letter: string): number {
  const upper = letter.toUpperCase();
  let count = 0;
  for (const ch of phrase) {
    if (ch.toUpperCase() === upper) count++;
  }
  return count;
}

/**
 * Normalize a solve attempt for comparison.
 * Strips everything except letters and spaces, then collapses whitespace.
 */
export function normalizeSolve(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check whether a solve attempt matches the puzzle.
 */
export function isSolveCorrect(attempt: string, phrase: string): boolean {
  return normalizeSolve(attempt) === normalizeSolve(phrase);
}

/**
 * Get remaining consonants not yet guessed.
 */
export function getConsonantsRemaining(revealed: Set<string>): string[] {
  const result: string[] = [];
  for (const c of CONSONANTS) {
    if (!revealed.has(c)) result.push(c);
  }
  return result;
}

/**
 * Get remaining vowels not yet guessed.
 */
export function getVowelsRemaining(revealed: Set<string>): string[] {
  const result: string[] = [];
  for (const v of VOWELS) {
    if (!revealed.has(v)) result.push(v);
  }
  return result;
}

/**
 * Check if a puzzle is fully revealed (all letters are in the revealed set).
 */
export function isPuzzleFullyRevealed(phrase: string, revealed: Set<string>): boolean {
  for (const ch of phrase) {
    const upper = ch.toUpperCase();
    if (/[A-Z]/.test(upper) && !revealed.has(upper)) {
      return false;
    }
  }
  return true;
}

interface LuckyLettersPublicGameStateInput {
  phase: WheelPhase;
  round: number;
  totalRounds: number;
  currentPuzzle: WheelPuzzle | null;
  revealedLetters: Set<string>;
  currentTurnSessionId: string | null;
  turnOrder: string[];
  standings: Array<{ sessionId: string; roundCash: number; totalCash: number }>;
  wildActive: boolean;
  lastSpinResult: SpinResult | null;
  bonusPlayerSessionId: string | null;
  bonusSolved: boolean;
  streak: number;
}

interface LuckyLettersRoundResultInput {
  winnerId: string | null;
  answer: string;
  category: string;
  roundCashEarned: number;
  solveBonusAwarded?: number;
  standings: Array<{ sessionId: string; roundCash: number; totalCash: number }>;
}

interface LuckyLettersBonusRevealInput {
  solved: boolean;
  answer: string;
  bonusPrize: number;
  bonusPlayerId: string | null;
}

export function buildLuckyLettersPublicGameState(
  input: LuckyLettersPublicGameStateInput,
): Record<string, unknown> {
  const puzzleDisplay = input.currentPuzzle
    ? buildPuzzleDisplay(input.currentPuzzle.phrase, input.revealedLetters)
    : "";

  return {
    type: "game-state",
    phase: input.phase,
    round: input.round,
    totalRounds: input.totalRounds,
    category: input.currentPuzzle?.category ?? "",
    hint: input.currentPuzzle?.hint ?? "",
    puzzleDisplay,
    currentTurnSessionId: input.currentTurnSessionId,
    turnOrder: input.turnOrder,
    standings: input.standings,
    consonantsRemaining: getConsonantsRemaining(input.revealedLetters),
    vowelsRemaining: getVowelsRemaining(input.revealedLetters),
    wildActive: input.wildActive,
    lastSpinResult: input.lastSpinResult ? { segment: input.lastSpinResult.segment } : null,
    bonusPlayerSessionId: input.bonusPlayerSessionId,
    bonusSolved: input.bonusSolved,
    revealedLetters: [...input.revealedLetters],
    streak: input.streak,
  };
}

export function buildLuckyLettersRoundResultPayload(
  input: LuckyLettersRoundResultInput,
): Record<string, unknown> {
  return {
    type: "round-result",
    winnerId: input.winnerId,
    answer: input.answer,
    category: input.category,
    roundCashEarned: input.roundCashEarned,
    solveBonusAwarded: input.solveBonusAwarded ?? 0,
    standings: input.standings,
  };
}

export function buildLuckyLettersBonusRevealPayload(
  input: LuckyLettersBonusRevealInput,
): Record<string, unknown> {
  return {
    type: "bonus-reveal",
    solved: input.solved,
    answer: input.answer,
    bonusPrize: input.bonusPrize,
    bonusPlayerId: input.bonusPlayerId,
  };
}

export function getSolveBonus(complexity: Complexity): number {
  return SOLVE_BONUS_BY_COMPLEXITY[complexity] ?? SOLVE_BONUS_BY_COMPLEXITY.standard;
}

function getPuzzleLengthScore(puzzle: WheelPuzzle): number {
  const wordCount = puzzle.phrase.trim().split(/\s+/).length;
  const revealedLetterCount = puzzle.phrase.replace(/[^A-Z]/g, "").length;
  return wordCount * 100 + revealedLetterCount;
}

export function getIdleTimeoutForPhase(phase: WheelPhase): number | null {
  switch (phase) {
    case "category-vote":
      return CATEGORY_VOTE_TIMEOUT_MS;
    case "spinning":
      return SPIN_IDLE_TIMEOUT_MS;
    case "guess-consonant":
      return GUESS_IDLE_TIMEOUT_MS;
    case "buy-vowel":
      return BUY_VOWEL_IDLE_TIMEOUT_MS;
    case "solve-attempt":
      return SOLVE_IDLE_TIMEOUT_MS;
    default:
      return null;
  }
}

export function isDeterministicE2ESolveAttempt(attempt: string): boolean {
  const isE2E = process.env.FLIMFLAM_E2E === "1" || process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1";
  if (!isE2E) return false;
  const token = process.env.FLIMFLAM_E2E_SOLVE_TOKEN ?? E2E_SOLVE_TOKEN_DEFAULT;
  const normalizedToken = normalizeSolve(token);
  if (!normalizedToken) return false;
  return normalizeSolve(attempt) === normalizedToken;
}

// ─── Internal state ────────────────────────────────────────────────────────

interface PlayerCash {
  roundCash: number;
  totalCash: number;
}

type WheelPhase =
  | "category-vote"
  | "round-intro"
  | "spinning"
  | "guess-consonant"
  | "buy-vowel"
  | "solve-attempt"
  | "letter-result"
  | "round-result"
  | "bonus-round"
  | "bonus-reveal"
  | "final-scores";

// ─── Plugin ────────────────────────────────────────────────────────────────

class LuckyLettersPlugin extends BaseGamePlugin {
  manifest: GameManifest = {
    id: "lucky-letters",
    name: "Lucky Letters",
    description: "Spin the wheel, guess the letters, and crack the phrase before anyone else!",
    minPlayers: 2,
    maxPlayers: 8,
    estimatedMinutes: 12,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["word", "puzzle", "classic"],
    icon: "\u{1F3A1}",
  };

  // Game state (not Colyseus Schema -- sent via messages)
  private complexity: Complexity = "standard";
  private totalRounds = 4;
  private currentRound = 0;
  private phase: WheelPhase = "round-intro";

  private turnOrder: string[] = [];
  private currentTurnIndex = 0;

  private currentPuzzle: WheelPuzzle | null = null;
  private revealedLetters: Set<string> = new Set();

  private playerCash: Map<string, PlayerCash> = new Map();
  private lastSpinResult: SpinResult | null = null;
  private wildActive = false;

  private usedPuzzleIndices: Set<number> = new Set();
  private puzzleBank: WheelPuzzle[] = [];
  private fullPuzzleBank: WheelPuzzle[] = [];

  private bonusPlayerSessionId: string | null = null;
  private bonusExtraLetters: string[] = [];
  private bonusPickBuffer: string[] = [];
  private bonusSolved = false;

  private currentStreak = 0;

  private availableCategories: string[] = [];
  private categoryVotes: Map<string, string[]> = new Map();
  private selectedCategories: string[] = [];

  private pendingTimerId: ReturnType<typeof setTimeout> | null = null;
  private actionTimerId: ReturnType<typeof setTimeout> | null = null;

  createState(): Schema {
    // We use the shared RoomState from PartyRoom; no custom Schema needed.
    // All game-specific data is sent via room.broadcast("game-data", ...) and
    // client.send("private-data", ...).
    return null as unknown as Schema;
  }

  onGameStart(room: Room, state: Schema, players: MapSchema, complexity: Complexity): void {
    this.complexity = complexity;
    this.totalRounds = getRoundsForComplexity(complexity);
    this.currentRound = 0;
    this.usedPuzzleIndices.clear();
    this.playerCash.clear();
    this.bonusPlayerSessionId = null;
    this.bonusSolved = false;
    this.categoryVotes.clear();
    this.selectedCategories = [];

    this.fullPuzzleBank = getPuzzleBank(complexity);
    this.puzzleBank = [...this.fullPuzzleBank];
    this.availableCategories = getCategories(this.puzzleBank);

    // Build turn order from connected players
    this.turnOrder = [];
    players.forEach((player: unknown, key: string) => {
      const p = player as Record<string, unknown>;
      if (p.connected) {
        this.turnOrder.push(key);
      }
    });
    shuffleInPlace(this.turnOrder);

    // Initialize cash tracking
    for (const sessionId of this.turnOrder) {
      this.playerCash.set(sessionId, { roundCash: 0, totalCash: 0 });
    }

    // Start with category vote phase
    this.phase = "category-vote";
    this.setPhase(state, "category-vote");
    this.setStateRound(state, 0, this.totalRounds);

    room.broadcast("game-data", {
      type: "category-vote",
      categories: this.availableCategories,
    });

    this.broadcastGameState(room, state);

    // Auto-advance after timeout
    this.startIdleTimer(room, state, "category-vote", () => {
      this.finalizeCategoryVote(room, state);
    });
  }

  onPlayerMessage(room: Room, state: Schema, client: Client, type: string, data: unknown): void {
    const msg = data as Record<string, unknown>;

    switch (type) {
      case "player:spin":
        this.handleSpin(room, state, client);
        break;
      case "player:guess-consonant":
        this.handleGuessConsonant(room, state, client, msg);
        break;
      case "player:buy-vowel":
        this.handleBuyVowel(room, state, client, msg);
        break;
      case "player:solve":
        this.handleSolve(room, state, client, msg);
        break;
      case "player:choose-action":
        this.handleChooseAction(room, state, client, msg);
        break;
      case "player:bonus-pick":
        this.handleBonusPick(room, state, client, msg);
        break;
      case "player:bonus-letters":
        this.handleBonusLetters(room, state, client, msg);
        break;
      case "player:bonus-solve":
        this.handleBonusSolve(room, state, client, msg);
        break;
      case "player:category-vote":
        this.handleCategoryVote(room, state, client, msg);
        break;
      case "host:pick-category":
        this.handleHostPickCategory(room, state, msg);
        break;
      case "host:skip":
        this.handleHostSkip(room, state);
        break;
    }
  }

  isGameOver(_state: Schema): boolean {
    return this.phase === "final-scores";
  }

  getScores(_state: Schema): Map<string, number> {
    const scores = new Map<string, number>();
    for (const [sessionId, cash] of this.playerCash) {
      scores.set(sessionId, cash.totalCash);
    }
    return scores;
  }

  onPlayerLeave(room: Room, state: Schema, sessionId: string, consented: boolean): void {
    super.onPlayerLeave(room, state, sessionId, consented);

    // If the current turn player disconnected, advance turn
    if (
      this.turnOrder[this.currentTurnIndex] === sessionId &&
      this.phase !== "final-scores" &&
      this.phase !== "round-result" &&
      this.phase !== "bonus-round" &&
      this.phase !== "bonus-reveal"
    ) {
      this.clearIdleTimer(state);
      this.advanceTurn(room, state);
    }

    // If the bonus round player disconnected, end bonus round
    if (this.phase === "bonus-round" && sessionId === this.bonusPlayerSessionId) {
      this.clearTimer();
      this.clearIdleTimer(state);
      this.goToBonusReveal(room, state);
    }
  }

  onPlayerReconnect(room: Room, state: Schema, client: Client): void {
    // Re-send full game state to reconnected player
    this.sendPrivateData(room, state, client.sessionId);
    this.broadcastGameState(room, state);
  }

  // ─── Phase Transitions ───────────────────────────────────────────────

  private startNextRound(room: Room, state: Schema): void {
    this.currentRound++;
    if (this.currentRound > this.totalRounds) {
      if (hasBonusRound(this.complexity)) {
        this.startBonusRound(room, state);
      } else {
        this.goToFinalScores(room, state);
      }
      return;
    }

    this.phase = "round-intro";
    this.currentTurnIndex = (this.currentRound - 1) % this.turnOrder.length;
    this.revealedLetters.clear();
    this.wildActive = false;
    this.lastSpinResult = null;

    // Reset round cash for all players
    for (const [sessionId, cash] of this.playerCash) {
      this.playerCash.set(sessionId, { roundCash: 0, totalCash: cash.totalCash });
    }

    // Pick a puzzle not yet used
    this.currentPuzzle = this.pickUnusedPuzzle();

    this.setStateRound(state, this.currentRound, this.totalRounds);
    this.setPhase(state, "round-intro");
    this.clearIdleTimer(state);
    this.broadcastGameState(room, state);

    // Auto-advance to spinning after a delay
    this.scheduleDelayed(room, ROUND_INTRO_DELAY_MS, () => {
      this.phase = "spinning";
      this.setPhase(state, "spinning");
      this.broadcastGameState(room, state);
      this.sendAllPrivateData(room, state);
      this.startIdleTimer(room, state, "spinning", () => {
        this.handleIdleSpinTimeout(room, state);
      });
    });
  }

  private handleSpin(room: Room, state: Schema, client: Client): void {
    if (this.phase !== "spinning") return;
    if (this.turnOrder[this.currentTurnIndex] !== client.sessionId) return;

    this.clearIdleTimer(state);
    const result = spinWheel();
    this.lastSpinResult = result;

    // Broadcast spin result to all clients for animation
    room.broadcast("game-data", {
      type: "spin-result",
      segment: result.segment,
      angle: result.angle,
    });

    // Process after animation delay
    this.scheduleDelayed(room, SPIN_ANIMATION_DELAY_MS, () => {
      this.processSpinResult(room, state, result);
    });
  }

  private handleIdleSpinTimeout(room: Room, state: Schema): void {
    if (this.phase !== "spinning") return;

    const result = spinWheel();
    this.lastSpinResult = result;

    // Broadcast spin result to all clients for animation (spectator parity).
    room.broadcast("game-data", {
      type: "spin-result",
      segment: result.segment,
      angle: result.angle,
    });

    // Process after animation delay.
    this.scheduleDelayed(room, SPIN_ANIMATION_DELAY_MS, () => {
      this.processSpinResult(room, state, result);
    });
  }

  private processSpinResult(room: Room, state: Schema, result: SpinResult): void {
    const currentPlayer = this.turnOrder[this.currentTurnIndex];
    if (!currentPlayer) return;

    switch (result.segment.type) {
      case "bust": {
        // Lose all round cash
        const cash = this.playerCash.get(currentPlayer);
        if (cash) {
          this.playerCash.set(currentPlayer, { roundCash: 0, totalCash: cash.totalCash });
        }
        this.wildActive = false;
        this.currentStreak = 0;
        this.broadcastGameState(room, state);
        // Show result briefly then advance turn
        this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
          this.advanceTurn(room, state);
        });
        break;
      }
      case "pass": {
        this.wildActive = false;
        this.broadcastGameState(room, state);
        this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
          this.advanceTurn(room, state);
        });
        break;
      }
      case "wild": {
        this.wildActive = true;
        this.phase = "guess-consonant";
        this.setPhase(state, "guess-consonant");
        this.broadcastGameState(room, state);
        this.sendAllPrivateData(room, state);
        this.startIdleTimer(room, state, "guess-consonant", () => {
          this.advanceTurn(room, state);
        });
        break;
      }
      case "cash": {
        this.wildActive = false;
        this.phase = "guess-consonant";
        this.setPhase(state, "guess-consonant");
        this.broadcastGameState(room, state);
        this.sendAllPrivateData(room, state);
        this.startIdleTimer(room, state, "guess-consonant", () => {
          this.advanceTurn(room, state);
        });
        break;
      }
    }
  }

  private handleGuessConsonant(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "guess-consonant") return;
    if (this.turnOrder[this.currentTurnIndex] !== client.sessionId) return;
    if (!this.currentPuzzle || !this.lastSpinResult) return;

    this.clearIdleTimer(state);
    const letter = (typeof data.letter === "string" ? data.letter : "").toUpperCase().trim();
    if (letter.length !== 1 || !CONSONANTS.has(letter)) return;
    if (this.revealedLetters.has(letter)) return;

    this.revealedLetters.add(letter);
    const count = countLetterInPhrase(this.currentPuzzle.phrase, letter);

    const spinValue = this.lastSpinResult.segment.value;

    this.phase = "letter-result";
    this.setPhase(state, "letter-result");

    if (count > 0) {
      this.currentStreak++;

      // Award cash
      const currentPlayer = this.turnOrder[this.currentTurnIndex];
      if (currentPlayer) {
        const cash = this.playerCash.get(currentPlayer);
        if (cash) {
          const earned = count * spinValue;
          cash.roundCash += earned;
          this.playerCash.set(currentPlayer, cash);
        }
      }

      room.broadcast("game-data", {
        type: "letter-result",
        letter,
        count,
        inPuzzle: true,
        earned: count * spinValue,
        streak: this.currentStreak,
        puzzleDisplay: buildPuzzleDisplay(this.currentPuzzle.phrase, this.revealedLetters),
      });

      // Check if puzzle is fully revealed
      if (isPuzzleFullyRevealed(this.currentPuzzle.phrase, this.revealedLetters)) {
        this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
          this.endRound(room, state, this.turnOrder[this.currentTurnIndex] ?? null);
        });
      } else {
        // Player keeps turn -- go to spinning (they choose to spin, buy vowel, or solve)
        this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
          this.goToPlayerChoice(room, state);
        });
      }
    } else {
      this.currentStreak = 0;

      room.broadcast("game-data", {
        type: "letter-result",
        letter,
        count: 0,
        inPuzzle: false,
        earned: 0,
        streak: this.currentStreak,
        puzzleDisplay: buildPuzzleDisplay(this.currentPuzzle.phrase, this.revealedLetters),
      });

      if (this.wildActive) {
        // Wild: wrong guess doesn't lose turn
        this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
          this.goToPlayerChoice(room, state);
        });
      } else {
        // Wrong guess: lose turn
        this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
          this.advanceTurn(room, state);
        });
      }
    }

    this.wildActive = false;
    this.broadcastGameState(room, state);
  }

  private handleBuyVowel(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "buy-vowel") return;
    if (this.turnOrder[this.currentTurnIndex] !== client.sessionId) return;
    if (!this.currentPuzzle) return;

    this.clearIdleTimer(state);
    const letter = (typeof data.letter === "string" ? data.letter : "").toUpperCase().trim();
    if (letter.length !== 1 || !VOWELS.has(letter)) return;
    if (this.revealedLetters.has(letter)) return;

    const currentPlayer = this.turnOrder[this.currentTurnIndex];
    if (!currentPlayer) return;
    const cash = this.playerCash.get(currentPlayer);
    if (!cash || cash.roundCash < VOWEL_COST) return;

    // Deduct cost
    cash.roundCash -= VOWEL_COST;
    this.playerCash.set(currentPlayer, cash);

    this.revealedLetters.add(letter);
    const count = countLetterInPhrase(this.currentPuzzle.phrase, letter);

    this.phase = "letter-result";
    this.setPhase(state, "letter-result");

    room.broadcast("game-data", {
      type: "letter-result",
      letter,
      count,
      inPuzzle: count > 0,
      earned: 0,
      vowelCost: VOWEL_COST,
      puzzleDisplay: buildPuzzleDisplay(this.currentPuzzle.phrase, this.revealedLetters),
    });

    this.broadcastGameState(room, state);

    if (isPuzzleFullyRevealed(this.currentPuzzle.phrase, this.revealedLetters)) {
      this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
        this.endRound(room, state, currentPlayer);
      });
    } else {
      // Stay on turn regardless of whether vowel was in puzzle
      this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
        this.goToPlayerChoice(room, state);
      });
    }
  }

  private handleSolve(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "solve-attempt") return;
    if (this.turnOrder[this.currentTurnIndex] !== client.sessionId) return;
    if (!this.currentPuzzle) return;

    this.clearIdleTimer(state);
    const attempt = typeof data.answer === "string" ? data.answer : "";
    const solved =
      isSolveCorrect(attempt, this.currentPuzzle.phrase) || isDeterministicE2ESolveAttempt(attempt);

    if (solved) {
      const solveBonusAwarded = getSolveBonus(this.complexity);
      const winnerCash = this.playerCash.get(client.sessionId);
      if (winnerCash) {
        winnerCash.roundCash += solveBonusAwarded;
        this.playerCash.set(client.sessionId, winnerCash);
      }

      // Correct solve! Player wins the round.
      room.broadcast("game-data", {
        type: "solve-result",
        correct: true,
        attempt,
        answer: this.currentPuzzle.phrase,
        solveBonusAwarded,
      });
      this.endRound(room, state, client.sessionId, solveBonusAwarded);
    } else {
      // Wrong solve: turn advances.
      room.broadcast("game-data", {
        type: "solve-result",
        correct: false,
        attempt,
      });
      this.scheduleDelayed(room, LETTER_RESULT_DELAY_MS, () => {
        this.advanceTurn(room, state);
      });
    }
  }

  private handleChooseAction(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    // Only the current turn player in the "spinning" phase can choose
    // This is triggered when a player wants to buy a vowel or solve instead of spinning
    if (this.turnOrder[this.currentTurnIndex] !== client.sessionId) return;
    if (this.phase !== "spinning") return;

    this.clearIdleTimer(state);
    const action = typeof data.action === "string" ? data.action : "";

    switch (action) {
      case "buy-vowel": {
        const currentPlayer = this.turnOrder[this.currentTurnIndex];
        if (!currentPlayer) return;
        const cash = this.playerCash.get(currentPlayer);
        if (!cash || cash.roundCash < VOWEL_COST) return;
        if (getVowelsRemaining(this.revealedLetters).length === 0) return;

        this.phase = "buy-vowel";
        this.setPhase(state, "buy-vowel");
        this.broadcastGameState(room, state);
        this.sendAllPrivateData(room, state);
        this.startIdleTimer(room, state, "buy-vowel", () => {
          this.advanceTurn(room, state);
        });
        break;
      }
      case "solve": {
        this.phase = "solve-attempt";
        this.setPhase(state, "solve-attempt");
        this.broadcastGameState(room, state);
        this.sendAllPrivateData(room, state);
        this.startIdleTimer(room, state, "solve-attempt", () => {
          this.advanceTurn(room, state);
        });
        break;
      }
      // "spin" is the default action -- player just sends player:spin
    }
  }

  private handleBonusPick(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "bonus-round") return;
    if (client.sessionId !== this.bonusPlayerSessionId) return;

    const letter = (typeof data.letter === "string" ? data.letter : "").toUpperCase().trim();
    if (letter.length !== 1) return;
    if (!CONSONANTS.has(letter) && !VOWELS.has(letter)) return;
    if (this.revealedLetters.has(letter)) return;
    if (this.bonusPickBuffer.includes(letter)) return;

    // Count consonants and vowels already in buffer
    const consonantCount = this.bonusPickBuffer.filter((l) => CONSONANTS.has(l)).length;
    const vowelCount = this.bonusPickBuffer.filter((l) => VOWELS.has(l)).length;

    if (CONSONANTS.has(letter)) {
      if (consonantCount >= 3) return; // Already have 3 consonants
    } else {
      if (vowelCount >= 1) return; // Already have 1 vowel
    }

    this.bonusPickBuffer.push(letter);

    // Broadcast confirmation so controller can show selections
    room.broadcast("game-data", {
      type: "bonus-pick-confirmed",
      letter,
      pickedSoFar: [...this.bonusPickBuffer],
    });

    // Check if buffer is complete: 3 consonants + 1 vowel
    const newConsonantCount = this.bonusPickBuffer.filter((l) => CONSONANTS.has(l)).length;
    const newVowelCount = this.bonusPickBuffer.filter((l) => VOWELS.has(l)).length;

    if (newConsonantCount === 3 && newVowelCount === 1) {
      // Construct data in the format handleBonusLetters expects
      const consonants = this.bonusPickBuffer.filter((l) => CONSONANTS.has(l));
      const vowel = this.bonusPickBuffer.find((l) => VOWELS.has(l)) ?? "";
      this.handleBonusLetters(room, state, client, { consonants, vowel });
    }
  }

  private handleBonusLetters(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "bonus-round") return;
    if (client.sessionId !== this.bonusPlayerSessionId) return;
    if (this.bonusExtraLetters.length > 0) return; // Already submitted

    const consonants = Array.isArray(data.consonants)
      ? (data.consonants as unknown[])
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.toUpperCase().trim())
          .filter((c) => c.length === 1 && CONSONANTS.has(c) && !this.revealedLetters.has(c))
      : [];
    const vowel = (typeof data.vowel === "string" ? data.vowel : "").toUpperCase().trim();

    if (consonants.length !== 3) return;
    if (!VOWELS.has(vowel) || this.revealedLetters.has(vowel)) return;

    // Ensure consonants are unique
    const uniqueConsonants = [...new Set(consonants)];
    if (uniqueConsonants.length !== 3) return;

    this.bonusExtraLetters = [...uniqueConsonants, vowel];

    // Reveal bonus letters
    for (const letter of this.bonusExtraLetters) {
      this.revealedLetters.add(letter);
    }

    // Broadcast updated display
    if (this.currentPuzzle) {
      room.broadcast("game-data", {
        type: "bonus-letters-revealed",
        letters: this.bonusExtraLetters,
        puzzleDisplay: buildPuzzleDisplay(this.currentPuzzle.phrase, this.revealedLetters),
      });
    }

    this.broadcastGameState(room, state);

    // Start 10-second solve timer
    this.startPhaseTimer(room, "bonus-solve", this.complexity, () => {
      // Time is up -- go to bonus reveal
      this.goToBonusReveal(room, state);
    });
  }

  private handleBonusSolve(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "bonus-round") return;
    if (client.sessionId !== this.bonusPlayerSessionId) return;
    if (!this.currentPuzzle) return;

    const attempt = typeof data.answer === "string" ? data.answer : "";
    const solved =
      isSolveCorrect(attempt, this.currentPuzzle.phrase) || isDeterministicE2ESolveAttempt(attempt);

    if (solved) {
      this.bonusSolved = true;
      this.clearTimer();
      // Award bonus prize
      const cash = this.playerCash.get(client.sessionId);
      if (cash) {
        cash.totalCash += BONUS_PRIZE;
        this.playerCash.set(client.sessionId, cash);
      }
    }

    this.goToBonusReveal(room, state);
  }

  private handleHostSkip(room: Room, state: Schema): void {
    // Allow host to advance past any waiting phase
    this.clearPendingTimer();
    this.clearIdleTimer(state);
    switch (this.phase) {
      case "category-vote":
        this.finalizeCategoryVote(room, state);
        break;
      case "round-intro":
        this.phase = "spinning";
        this.setPhase(state, "spinning");
        this.broadcastGameState(room, state);
        this.sendAllPrivateData(room, state);
        this.startIdleTimer(room, state, "spinning", () => {
          this.handleIdleSpinTimeout(room, state);
        });
        break;
      case "spinning":
        // Skip past active player's turn
        this.advanceTurn(room, state);
        break;
      case "guess-consonant":
      case "buy-vowel":
      case "solve-attempt":
        this.advanceTurn(room, state);
        break;
      case "bonus-round":
        this.goToBonusReveal(room, state);
        break;
      case "letter-result":
        // Skip the letter-result delay — if puzzle solved end round, otherwise go to spinning
        if (
          this.currentPuzzle &&
          isPuzzleFullyRevealed(this.currentPuzzle.phrase, this.revealedLetters)
        ) {
          this.endRound(room, state, this.turnOrder[this.currentTurnIndex] ?? null);
        } else {
          this.goToPlayerChoice(room, state);
        }
        break;
      case "round-result":
        // Skip the round-result delay — start next round
        this.startNextRound(room, state);
        break;
      case "bonus-reveal":
        this.goToFinalScores(room, state);
        break;
      case "final-scores":
        // Do nothing, game is over
        break;
    }
  }

  // ─── Category Vote ─────────────────────────────────────────────────

  private handleCategoryVote(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "category-vote") return;
    if (!this.turnOrder.includes(client.sessionId)) return;

    const selected = Array.isArray(data.categories)
      ? (data.categories as unknown[])
          .filter((c): c is string => typeof c === "string")
          .filter((c) => this.availableCategories.includes(c))
          .slice(0, 3)
      : [];

    if (selected.length === 0) return;

    this.categoryVotes.set(client.sessionId, selected);

    // Broadcast vote tally
    room.broadcast("game-data", {
      type: "category-vote-tally",
      voteCounts: this.tallyCategoryVotes(),
      totalVoters: this.turnOrder.length,
      votedCount: this.categoryVotes.size,
    });

    // Check if all players have voted
    if (this.categoryVotes.size >= this.turnOrder.length) {
      this.finalizeCategoryVote(room, state);
    }
  }

  private handleHostPickCategory(room: Room, state: Schema, data: Record<string, unknown>): void {
    if (this.phase !== "category-vote") return;

    const selected = Array.isArray(data.categories)
      ? (data.categories as unknown[])
          .filter((c): c is string => typeof c === "string")
          .filter((c) => this.availableCategories.includes(c))
      : [];

    if (selected.length === 0) return;

    this.selectedCategories = selected;
    this.applyCategoryFilter();

    this.clearPendingTimer();
    this.clearIdleTimer(state);
    this.phase = "round-intro";
    this.setPhase(state, "round-intro");
    this.setStateRound(state, 1, this.totalRounds);

    room.broadcast("game-data", {
      type: "categories-selected",
      categories: this.selectedCategories,
    });

    this.startNextRound(room, state);
  }

  private finalizeCategoryVote(room: Room, state: Schema): void {
    this.clearPendingTimer();
    this.clearIdleTimer(state);

    // Tally votes and pick top categories
    const tally = this.tallyCategoryVotes();
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);

    // Select top categories (at least 3, or all if fewer)
    const topCount = Math.min(
      Math.max(3, Math.ceil(this.availableCategories.length / 2)),
      sorted.length,
    );
    this.selectedCategories = sorted.slice(0, topCount).map(([cat]) => cat);

    // If no votes, use all categories
    if (this.selectedCategories.length === 0) {
      this.selectedCategories = [...this.availableCategories];
    }

    this.applyCategoryFilter();

    this.phase = "round-intro";
    this.setPhase(state, "round-intro");
    this.setStateRound(state, 1, this.totalRounds);

    room.broadcast("game-data", {
      type: "categories-selected",
      categories: this.selectedCategories,
    });

    this.startNextRound(room, state);
  }

  private tallyCategoryVotes(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const cat of this.availableCategories) {
      counts.set(cat, 0);
    }
    for (const votes of this.categoryVotes.values()) {
      for (const cat of votes) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
    return counts;
  }

  private applyCategoryFilter(): void {
    if (this.selectedCategories.length > 0) {
      const catSet = new Set(this.selectedCategories);
      this.puzzleBank = this.fullPuzzleBank.filter((p) => catSet.has(p.category));
      this.usedPuzzleIndices.clear();
    }
  }

  // ─── Turn / Round Management ─────────────────────────────────────────

  private advanceTurn(room: Room, state: Schema): void {
    this.wildActive = false;
    this.lastSpinResult = null;
    this.currentStreak = 0;

    // Find next connected player
    const _startIndex = this.currentTurnIndex;
    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      attempts++;
      const sessionId = this.turnOrder[this.currentTurnIndex];
      if (sessionId && this.isPlayerConnected(state, sessionId)) {
        break;
      }
    } while (attempts < this.turnOrder.length);

    if (attempts >= this.turnOrder.length) {
      // No connected players -- end round
      this.endRound(room, state, null);
      return;
    }

    this.phase = "spinning";
    this.setPhase(state, "spinning");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);
    this.startIdleTimer(room, state, "spinning", () => {
      this.handleIdleSpinTimeout(room, state);
    });
  }

  private goToPlayerChoice(room: Room, state: Schema): void {
    // Player has the choice: spin again, buy vowel, or solve
    this.phase = "spinning";
    this.setPhase(state, "spinning");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);
    this.startIdleTimer(room, state, "spinning", () => {
      this.handleIdleSpinTimeout(room, state);
    });
  }

  private endRound(
    room: Room,
    state: Schema,
    winnerId: string | null,
    solveBonusAwarded = 0,
  ): void {
    this.clearIdleTimer(state);
    this.phase = "round-result";
    this.setPhase(state, "round-result");

    // If someone solved, add their round cash to total cash
    if (winnerId) {
      const cash = this.playerCash.get(winnerId);
      if (cash) {
        cash.totalCash += cash.roundCash;
        this.playerCash.set(winnerId, cash);
      }
    }
    // For non-winners, round cash is lost (not added to total)

    // Update scores on schema
    for (const [sessionId, cash] of this.playerCash) {
      this.updatePlayerScore(state, sessionId, cash.totalCash);
    }

    room.broadcast(
      "game-data",
      buildLuckyLettersRoundResultPayload({
        winnerId,
        answer: this.currentPuzzle?.phrase ?? "",
        category: this.currentPuzzle?.category ?? "",
        roundCashEarned: winnerId ? (this.playerCash.get(winnerId)?.roundCash ?? 0) : 0,
        solveBonusAwarded,
        standings: this.getStandings(),
      }),
    );

    this.broadcastGameState(room, state);

    this.scheduleDelayed(room, ROUND_RESULT_DELAY_MS, () => {
      this.startNextRound(room, state);
    });
  }

  private startBonusRound(room: Room, state: Schema): void {
    this.clearIdleTimer(state);
    // Find player with highest totalCash
    let bestId: string | null = null;
    let bestCash = -1;
    for (const [sessionId, cash] of this.playerCash) {
      if (cash.totalCash > bestCash && this.isPlayerConnected(state, sessionId)) {
        bestCash = cash.totalCash;
        bestId = sessionId;
      }
    }

    if (!bestId) {
      this.goToFinalScores(room, state);
      return;
    }

    this.bonusPlayerSessionId = bestId;
    this.bonusSolved = false;
    this.bonusExtraLetters = [];
    this.bonusPickBuffer = [];

    // Pick a new puzzle for the bonus round
    this.currentPuzzle = this.pickUnusedPuzzle();
    this.revealedLetters.clear();

    // Auto-reveal RSTLNE
    for (const letter of RSTLNE) {
      this.revealedLetters.add(letter);
    }

    this.phase = "bonus-round";
    this.setPhase(state, "bonus-round");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    // Timeout for letter picking — auto-fill with random letters if player doesn't complete
    this.startPhaseTimer(room, "bonus-pick", this.complexity, () => {
      if (this.phase !== "bonus-round") return;
      if (this.bonusExtraLetters.length > 0) return; // already submitted

      // Auto-fill remaining consonant/vowel slots
      const consonantCount = this.bonusPickBuffer.filter((l) => CONSONANTS.has(l)).length;
      const vowelCount = this.bonusPickBuffer.filter((l) => VOWELS.has(l)).length;
      const neededConsonants = 3 - consonantCount;
      const neededVowels = 1 - vowelCount;

      const availConsonants = [...CONSONANTS].filter(
        (c) => !this.revealedLetters.has(c) && !this.bonusPickBuffer.includes(c),
      );
      const availVowels = [...VOWELS].filter(
        (v) => !this.revealedLetters.has(v) && !this.bonusPickBuffer.includes(v),
      );

      shuffleInPlace(availConsonants);
      shuffleInPlace(availVowels);

      for (let i = 0; i < neededConsonants && i < availConsonants.length; i++) {
        const c = availConsonants[i];
        if (c) this.bonusPickBuffer.push(c);
      }
      for (let i = 0; i < neededVowels && i < availVowels.length; i++) {
        const v = availVowels[i];
        if (v) this.bonusPickBuffer.push(v);
      }

      const consonants = this.bonusPickBuffer.filter((l) => CONSONANTS.has(l));
      const vowel = this.bonusPickBuffer.find((l) => VOWELS.has(l)) ?? "";

      if (consonants.length === 3 && vowel) {
        this.bonusExtraLetters = [...consonants, vowel];
        for (const letter of this.bonusExtraLetters) {
          this.revealedLetters.add(letter);
        }
        if (this.currentPuzzle) {
          room.broadcast("game-data", {
            type: "bonus-letters-revealed",
            letters: this.bonusExtraLetters,
            puzzleDisplay: buildPuzzleDisplay(this.currentPuzzle.phrase, this.revealedLetters),
          });
        }
        this.broadcastGameState(room, state);
        // Start solve timer
        this.startPhaseTimer(room, "bonus-solve", this.complexity, () => {
          this.goToBonusReveal(room, state);
        });
      } else {
        // Not enough letters available, skip to reveal
        this.goToBonusReveal(room, state);
      }
    });
  }

  private goToBonusReveal(room: Room, state: Schema): void {
    this.clearTimer();
    this.clearIdleTimer(state);
    this.phase = "bonus-reveal";
    this.setPhase(state, "bonus-reveal");

    room.broadcast(
      "game-data",
      buildLuckyLettersBonusRevealPayload({
        solved: this.bonusSolved,
        answer: this.currentPuzzle?.phrase ?? "",
        bonusPrize: this.bonusSolved ? BONUS_PRIZE : 0,
        bonusPlayerId: this.bonusPlayerSessionId,
      }),
    );

    this.broadcastGameState(room, state);

    this.scheduleDelayed(room, BONUS_REVEAL_DELAY_MS, () => {
      this.goToFinalScores(room, state);
    });
  }

  private goToFinalScores(room: Room, state: Schema): void {
    this.clearTimer();
    this.clearIdleTimer(state);
    this.phase = "final-scores";
    this.setPhase(state, "final-scores");

    // Update scores on schema one last time
    for (const [sessionId, cash] of this.playerCash) {
      this.updatePlayerScore(state, sessionId, cash.totalCash);
    }

    room.broadcast("game-data", {
      type: "final-scores",
      standings: this.getStandings(),
    });

    this.broadcastGameState(room, state);
  }

  // ─── Broadcast Helpers ───────────────────────────────────────────────

  private broadcastGameState(room: Room, _state: Schema): void {
    const payload = buildLuckyLettersPublicGameState({
      phase: this.phase,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      currentPuzzle: this.currentPuzzle,
      revealedLetters: this.revealedLetters,
      currentTurnSessionId: this.turnOrder[this.currentTurnIndex] ?? null,
      turnOrder: this.turnOrder,
      standings: this.getStandings(),
      wildActive: this.wildActive,
      lastSpinResult: this.lastSpinResult,
      bonusPlayerSessionId: this.bonusPlayerSessionId,
      bonusSolved: this.bonusSolved,
      streak: this.currentStreak,
    });

    // Include category info for category-vote phase
    if (this.phase === "category-vote") {
      (payload as Record<string, unknown>).availableCategories = this.availableCategories;
      (payload as Record<string, unknown>).selectedCategories = this.selectedCategories;
    }

    room.broadcast("game-data", payload);
  }

  private sendPrivateData(room: Room, _state: Schema, sessionId: string): void {
    const client = this.findClient(room, sessionId);
    if (!client) return;

    const cash = this.playerCash.get(sessionId);
    const isMyTurn = this.turnOrder[this.currentTurnIndex] === sessionId;
    const canBuyVowel =
      isMyTurn &&
      (cash?.roundCash ?? 0) >= VOWEL_COST &&
      getVowelsRemaining(this.revealedLetters).length > 0;

    client.send("private-data", {
      type: "player-state",
      roundCash: cash?.roundCash ?? 0,
      totalCash: cash?.totalCash ?? 0,
      isMyTurn,
      canBuyVowel,
      canSolve: isMyTurn,
      isBonusPlayer: sessionId === this.bonusPlayerSessionId,
      revealedLetters: [...this.revealedLetters],
    });
  }

  private sendAllPrivateData(room: Room, state: Schema): void {
    for (const sessionId of this.turnOrder) {
      this.sendPrivateData(room, state, sessionId);
    }
  }

  // ─── Utility Helpers ─────────────────────────────────────────────────

  private getHostSessionId(state: Schema): string {
    return ((state as unknown as Record<string, unknown>).hostSessionId as string) ?? "";
  }

  private isPlayerConnected(state: Schema, sessionId: string): boolean {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema | undefined;
    if (!players) return false;
    const player = players.get(sessionId);
    if (!player) return false;
    return (player as unknown as Record<string, unknown>).connected as boolean;
  }

  private findClient(room: Room, sessionId: string): Client | undefined {
    return (room.clients as unknown as Client[]).find((c: Client) => c.sessionId === sessionId);
  }

  private updatePlayerScore(state: Schema, sessionId: string, score: number): void {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema | undefined;
    if (!players) return;
    const player = players.get(sessionId);
    if (player) {
      (player as unknown as Record<string, unknown>).score = score;
    }
  }

  private setStateRound(state: Schema, round: number, total: number): void {
    const rec = state as unknown as Record<string, unknown>;
    rec.round = round;
    rec.totalRounds = total;
  }

  private getStandings(): Array<{ sessionId: string; roundCash: number; totalCash: number }> {
    const standings: Array<{ sessionId: string; roundCash: number; totalCash: number }> = [];
    for (const [sessionId, cash] of this.playerCash) {
      standings.push({ sessionId, roundCash: cash.roundCash, totalCash: cash.totalCash });
    }
    standings.sort((a, b) => b.totalCash - a.totalCash);
    return standings;
  }

  private pickUnusedPuzzle(): WheelPuzzle {
    const bank = this.puzzleBank;
    // Find indices not yet used
    const available: number[] = [];
    for (let i = 0; i < bank.length; i++) {
      if (!this.usedPuzzleIndices.has(i)) {
        available.push(i);
      }
    }

    // If all used, reset (wrap around)
    if (available.length === 0) {
      this.usedPuzzleIndices.clear();
      for (let i = 0; i < bank.length; i++) {
        available.push(i);
      }
    }

    const sortedByLength = [...available].sort((a, b) => {
      const left = bank[a];
      const right = bank[b];
      return (
        getPuzzleLengthScore(right ?? { phrase: "", category: "" }) -
        getPuzzleLengthScore(left ?? { phrase: "", category: "" })
      );
    });
    const preferredPoolSize = Math.max(
      1,
      Math.min(
        sortedByLength.length,
        Math.ceil(sortedByLength.length * (this.complexity === "kids" ? 0.6 : 0.45)),
      ),
    );
    const preferredPool = sortedByLength.slice(0, preferredPoolSize);
    const idx = pickRandom(preferredPool) ?? sortedByLength[0] ?? 0;
    this.usedPuzzleIndices.add(idx);
    return bank[idx] ?? bank[0] ?? { phrase: "", category: "", hint: "" };
  }

  private getScaledDelay(delayMs: number): number {
    const rawScale = process.env.FLIMFLAM_TIMER_SCALE;
    const scale = rawScale ? Number(rawScale) : 1;
    const safeScale = Number.isFinite(scale) && scale > 0 ? Math.min(Math.max(scale, 0.01), 10) : 1;
    return Math.max(250, Math.round(delayMs * safeScale));
  }

  private getScaledPresentationDelay(delayMs: number): number {
    const scaledDelay = this.getScaledDelay(delayMs);
    const isE2E = process.env.FLIMFLAM_E2E === "1" || process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1";
    if (!isE2E) return scaledDelay;

    if (delayMs >= BONUS_REVEAL_DELAY_MS) return Math.max(2_500, scaledDelay);
    if (delayMs >= ROUND_RESULT_DELAY_MS || delayMs >= SPIN_ANIMATION_DELAY_MS) {
      return Math.max(1_250, scaledDelay);
    }
    if (delayMs >= ROUND_INTRO_DELAY_MS || delayMs >= LETTER_RESULT_DELAY_MS) {
      return Math.max(900, scaledDelay);
    }
    return scaledDelay;
  }

  private startIdleTimer(
    room: Room,
    state: Schema,
    expectedPhase: WheelPhase,
    onTimeout: () => void,
  ): void {
    const timeoutMs = getIdleTimeoutForPhase(expectedPhase);
    if (!timeoutMs) return;

    this.clearIdleTimer(state);
    const scaledDelay = this.getScaledDelay(timeoutMs);
    this.setTimerEndsAt(state, Date.now() + scaledDelay);
    const delayed = room.clock.setTimeout(() => {
      this.actionTimerId = null;
      this.setTimerEndsAt(state, 0);
      if (this.phase !== expectedPhase) return;

      room.broadcast("game-data", {
        type: "idle-timeout",
        phase: expectedPhase,
        sessionId:
          expectedPhase === "category-vote"
            ? null
            : (this.turnOrder[this.currentTurnIndex] ?? null),
      });
      onTimeout();
    }, scaledDelay);
    this.actionTimerId = delayed as unknown as ReturnType<typeof setTimeout>;
  }

  private clearIdleTimer(state: Schema): void {
    if (this.actionTimerId !== null) {
      try {
        const delayed = this.actionTimerId as unknown as { clear?: () => void };
        if (typeof delayed.clear === "function") {
          delayed.clear();
        }
      } catch {
        // Ignore -- timer may have already fired
      }
      this.actionTimerId = null;
    }
    this.setTimerEndsAt(state, 0);
  }

  /**
   * Schedule a delayed callback using the room clock.
   * Clears any previous pending delayed timer.
   */
  private scheduleDelayed(room: Room, delayMs: number, callback: () => void): void {
    this.clearPendingTimer();
    const scaledDelay = this.getScaledPresentationDelay(delayMs);
    const delayed = room.clock.setTimeout(callback, scaledDelay);
    this.pendingTimerId = delayed as unknown as ReturnType<typeof setTimeout>;
  }

  private clearPendingTimer(): void {
    if (this.pendingTimerId !== null) {
      try {
        const delayed = this.pendingTimerId as unknown as { clear?: () => void };
        if (typeof delayed.clear === "function") {
          delayed.clear();
        }
      } catch {
        // Ignore -- timer may have already fired
      }
      this.pendingTimerId = null;
    }
  }
}

/** Factory function to create a Lucky Letters game plugin. */
export function createLuckyLettersPlugin(): LuckyLettersPlugin {
  return new LuckyLettersPlugin();
}

// Re-export constants for testing
export {
  VOWEL_COST,
  BONUS_PRIZE,
  VOWELS,
  CONSONANTS,
  RSTLNE,
  getRoundsForComplexity,
  hasBonusRound,
  CATEGORY_VOTE_TIMEOUT_MS,
  SPIN_IDLE_TIMEOUT_MS,
  GUESS_IDLE_TIMEOUT_MS,
  BUY_VOWEL_IDLE_TIMEOUT_MS,
  SOLVE_IDLE_TIMEOUT_MS,
  E2E_SOLVE_TOKEN_DEFAULT,
};
