import type { MapSchema, Schema } from "@colyseus/schema";
import { aiRequest, buildAnswerJudgePrompt, enqueueAIRequest } from "@flimflam/ai";
import { BaseGamePlugin } from "@flimflam/game-engine";
import { AnswerJudgeSchema } from "@flimflam/shared";
import type { Complexity, GameManifest } from "@flimflam/shared";
import { fuzzyMatch, pickRandom, shuffleInPlace } from "@flimflam/shared";
import type { Client, Room } from "colyseus";
import { type JeopardyBoard, type JeopardyClue, getClueBank } from "./content/clue-bank";

// ─── Constants ─────────────────────────────────────────────────────────────

const CLUE_VALUES = [200, 400, 600, 800, 1000];
const DOUBLE_DOWN_VALUES = [400, 800, 1200, 1600, 2000];
const CATEGORIES_PER_BOARD = 6;
const CLUES_PER_CATEGORY = 5;

const CATEGORY_REVEAL_DELAY_MS = 30000;
const CLUE_RESULT_DELAY_MS = 6000;
const ANSWER_TIMEOUT_MS = 20000;
const POWER_PLAY_WAGER_TIMEOUT_MS = 20000;
const ROUND_TRANSITION_DELAY_MS = 4000;
const ALL_IN_CATEGORY_DELAY_MS = 5000;
const ALL_IN_WAGER_TIMEOUT_MS = 30000;
const ALL_IN_ANSWER_TIMEOUT_MS = 30000;
const ALL_IN_REVEAL_DELAY_MS = 8000;

const FUZZY_THRESHOLD = 0.7;
const BRAIN_BOARD_JUDGE_TIMEOUT_MS = 4000;
const BRAIN_BOARD_JUDGE_MODEL =
  process.env.FLIMFLAM_BRAIN_BOARD_JUDGE_MODEL ?? "claude-haiku-4-5-latest";

/** Power Play counts per round. Round 1 always has 1, Round 2 always has 2. */
function getPowerPlayCount(_complexity: Complexity, round: number): number {
  return round === 1 ? 1 : 2;
}

/** Legacy overload kept for backward compatibility — returns count for Round 1. */
function getPowerPlayCountLegacy(complexity: Complexity): number {
  return getPowerPlayCount(complexity, 1);
}

// ─── Types ─────────────────────────────────────────────────────────────────

type BrainBoardPhase =
  | "category-reveal"
  | "clue-select"
  | "power-play-wager"
  | "power-play-answer"
  | "answering"
  | "clue-result"
  | "round-transition"
  | "all-in-category"
  | "all-in-wager"
  | "all-in-answer"
  | "all-in-reveal"
  | "final-scores";

interface CluePosition {
  categoryIndex: number;
  clueIndex: number;
}

interface FinalRoundData {
  category: string;
  clue: JeopardyClue;
  wagers: Map<string, number>;
  answers: Map<string, string>;
}

type AnswerJudgeSource = "local" | "ai" | "fallback";

interface JudgedAnswer {
  correct: boolean;
  judgedBy: AnswerJudgeSource;
  judgeExplanation: string | null;
}

interface ClueResultEntry {
  sessionId: string;
  answer: string;
  correct: boolean;
  delta: number;
  judgedBy?: AnswerJudgeSource;
  judgeExplanation?: string;
}

interface AllInRevealResultEntry {
  sessionId: string;
  answer: string;
  correct: boolean;
  wager: number;
  delta: number;
  judgedBy?: AnswerJudgeSource;
  judgeExplanation?: string;
}

// ─── Helpers (exported for testing) ────────────────────────────────────────

/**
 * Place Power Plays randomly on the board.
 * Power Plays are placed only on rows with value >= 400 (indices 1-4).
 * Returns a Set of "categoryIndex,clueIndex" strings.
 */
export function placePowerPlays(
  count: number,
  categoriesCount: number,
  cluesPerCategory: number,
): Set<string> {
  const positions: string[] = [];
  for (let c = 0; c < categoriesCount; c++) {
    for (let r = 1; r < cluesPerCategory; r++) {
      positions.push(`${c},${r}`);
    }
  }
  shuffleInPlace(positions);
  const result = new Set<string>();
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const pos = positions[i];
    if (pos !== undefined) result.add(pos);
  }
  return result;
}

/**
 * Validate a wager for Power Play.
 * Min $5, max = max(playerScore, highest clue value on the current board).
 */
export function validatePowerPlayWager(
  wager: number,
  playerScore: number,
  highestClueValue = 1000,
): boolean {
  if (!Number.isFinite(wager) || wager < 5) return false;
  const maxWager = Math.max(playerScore, highestClueValue);
  return wager <= maxWager;
}

/**
 * Validate an All-In Round wager.
 */
export function validateAllInWager(wager: number, playerScore: number): boolean {
  if (playerScore <= 0) return false;
  if (!Number.isFinite(wager) || wager < 0) return false;
  return wager <= playerScore;
}

const LEADING_ARTICLES = /^(a|an|the)\s+/i;

/**
 * Judge an answer using fuzzy matching.
 * Strips leading articles ("a", "an", "the") and common answer prefixes
 * ("what is", "who is", etc.) from both sides before comparing.
 * Uses a forgiving threshold (0.7) to allow for typos and partial answers.
 */
export function judgeAnswer(playerAnswer: string, correctAnswer: string): boolean {
  // First try direct fuzzy match
  if (fuzzyMatch(playerAnswer, correctAnswer, FUZZY_THRESHOLD)) return true;

  // Strip leading articles and retry
  const stripArticles = (s: string) => s.toLowerCase().trim().replace(LEADING_ARTICLES, "").trim();
  const playerStripped = stripArticles(playerAnswer);
  const correctStripped = stripArticles(correctAnswer);

  if (playerStripped.length > 0 && correctStripped.length > 0) {
    if (fuzzyMatch(playerStripped, correctStripped, FUZZY_THRESHOLD)) return true;
    // Check if one contains the other (e.g., "spongebob" matches "spongebob squarepants")
    if (playerStripped.includes(correctStripped) || correctStripped.includes(playerStripped)) {
      return true;
    }
  }

  return false;
}

// ─── Plugin ────────────────────────────────────────────────────────────────

class BrainBoardPlugin extends BaseGamePlugin {
  manifest: GameManifest = {
    id: "brain-board",
    name: "Brain Board",
    description:
      "Pick clues from the board, outsmart your rivals, and cash in big with Power Plays!",
    minPlayers: 2,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["trivia", "buzzer", "classic"],
    icon: "\u2753",
  };

  // ─── Internal State ──────────────────────────────────────────────────

  private complexity: Complexity = "standard";
  private phase: BrainBoardPhase = "category-reveal";

  /** Current round: 1 = Brain Board, 2 = Double Down */
  private currentRound = 1;
  private board: JeopardyBoard | null = null;
  private round1Board: JeopardyBoard | null = null;
  private round2Board: JeopardyBoard | null = null;
  private powerPlays: Set<string> = new Set();
  private revealedClues: Set<string> = new Set();

  private playerOrder: string[] = [];
  private playerScores: Map<string, number> = new Map();

  private selectorSessionId: string | null = null;
  private selectorIndex = 0;

  private currentClue: JeopardyClue | null = null;
  private currentCluePosition: CluePosition | null = null;
  private currentCategoryName = "";
  private isPowerPlay = false;

  // All-answer tracking: every player submits, then we resolve
  private playerAnswers: Map<string, string> = new Map();

  // Power Play wager stored separately so we don't mutate clue objects
  private powerPlayWager = 5;

  private finalRound: FinalRoundData | null = null;

  /** All available boards for the current complexity, used for reroll. */
  private availableBoards: JeopardyBoard[] = [];

  private pendingTimerId: ReturnType<typeof setTimeout> | null = null;
  private resolvingAllAnswers = false;
  private resolvingPowerPlayAnswer = false;
  private resolvingFinalAnswers = false;

  createState(): Schema {
    return null as unknown as Schema;
  }

  onGameStart(room: Room, state: Schema, players: MapSchema, complexity: Complexity): void {
    this.complexity = complexity;
    this.phase = "category-reveal";
    this.currentRound = 1;
    this.revealedClues.clear();
    this.playerScores.clear();
    this.playerOrder = [];
    this.selectorIndex = 0;
    this.playerAnswers.clear();
    this.powerPlayWager = 5;
    this.resolvingAllAnswers = false;
    this.resolvingPowerPlayAnswer = false;
    this.resolvingFinalAnswers = false;

    // Build player order (exclude host)
    const hostId = this.getHostSessionId(state);
    players.forEach((player: unknown, key: string) => {
      const p = player as Record<string, unknown>;
      if (key !== hostId && p.connected) {
        this.playerOrder.push(key);
      }
    });
    shuffleInPlace(this.playerOrder);

    for (const sessionId of this.playerOrder) {
      this.playerScores.set(sessionId, 0);
    }

    // Pick two DIFFERENT boards for Round 1 and Round 2
    const banks = getClueBank(complexity);
    this.availableBoards = banks;
    const shuffledBanks = [...banks];
    shuffleInPlace(shuffledBanks);
    this.round1Board = shuffledBanks[0] ?? banks[0] ?? null;
    this.round2Board = shuffledBanks[1] ?? shuffledBanks[0] ?? banks[0] ?? null;

    // Start with Round 1 board
    this.board = this.round1Board;

    // Place Power Plays for Round 1 (always 1)
    this.powerPlays = placePowerPlays(
      getPowerPlayCount(complexity, 1),
      CATEGORIES_PER_BOARD,
      CLUES_PER_CATEGORY,
    );

    // First selector is a random player (first in shuffled order)
    this.selectorSessionId = this.playerOrder[0] ?? null;

    this.setPhase(state, "category-reveal");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    // Auto-advance to clue-select after timeout (selector can start earlier)
    this.scheduleDelayed(room, CATEGORY_REVEAL_DELAY_MS, () => {
      if (this.phase === "category-reveal") {
        this.goToClueSelect(room, state);
      }
    });
  }

  onPlayerMessage(room: Room, state: Schema, client: Client, type: string, data: unknown): void {
    const msg = data as Record<string, unknown>;

    switch (type) {
      case "player:select-clue":
        this.handleSelectClue(room, state, client, msg);
        break;
      case "player:answer":
        this.handleAnswer(room, state, client, msg);
        break;
      case "player:power-play-wager":
        this.handlePowerPlayWager(room, state, client, msg);
        break;
      case "player:power-play-answer":
        this.handlePowerPlayAnswer(room, state, client, msg);
        break;
      case "player:all-in-wager":
        this.handleFinalWager(room, state, client, msg);
        break;
      case "player:all-in-answer":
        this.handleFinalAnswer(room, state, client, msg);
        break;
      case "player:confirm-categories":
        this.handleConfirmCategories(room, state, client);
        break;
      case "player:reroll-board":
        this.handleRerollBoard(room, state, client);
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
    return new Map(this.playerScores);
  }

  onPlayerLeave(room: Room, state: Schema, sessionId: string, consented: boolean): void {
    super.onPlayerLeave(room, state, sessionId, consented);

    // If the selector left during clue-select, advance selector
    if (this.phase === "clue-select" && this.selectorSessionId === sessionId) {
      this.advanceSelector(state);
      this.broadcastGameState(room, state);
      this.sendAllPrivateData(room, state);
    }

    // If a player leaves during answering, count as submitted (empty)
    if (this.phase === "answering" && !this.playerAnswers.has(sessionId)) {
      this.playerAnswers.set(sessionId, "");
      this.checkAllAnswered(room, state);
    }

    // If Power Play player left, skip the clue
    if (
      (this.phase === "power-play-wager" || this.phase === "power-play-answer") &&
      this.selectorSessionId === sessionId
    ) {
      this.goToClueResult(room, state, []);
    }
  }

  onPlayerReconnect(room: Room, state: Schema, client: Client): void {
    this.sendPrivateData(room, state, client.sessionId);
    this.broadcastGameState(room, state);
  }

  // ─── Clue Selection ──────────────────────────────────────────────────

  private goToClueSelect(room: Room, state: Schema): void {
    this.phase = "clue-select";
    this.currentClue = null;
    this.currentCluePosition = null;
    this.isPowerPlay = false;
    this.playerAnswers.clear();
    this.powerPlayWager = 5;

    this.setPhase(state, "clue-select");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);
  }

  private handleSelectClue(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "clue-select") return;
    if (client.sessionId !== this.selectorSessionId) return;
    if (!this.board) return;

    const categoryIndex = typeof data.categoryIndex === "number" ? data.categoryIndex : -1;
    const clueIndex = typeof data.clueIndex === "number" ? data.clueIndex : -1;

    if (categoryIndex < 0 || categoryIndex >= CATEGORIES_PER_BOARD) return;
    if (clueIndex < 0 || clueIndex >= CLUES_PER_CATEGORY) return;

    const posKey = `${categoryIndex},${clueIndex}`;
    if (this.revealedClues.has(posKey)) return;

    this.revealedClues.add(posKey);
    const category = this.board.categories[categoryIndex];
    if (!category) return;
    const clue = category.clues[clueIndex];
    if (!clue) return;

    // Apply Double Down values if in round 2
    const effectiveValue =
      this.currentRound === 2 ? (DOUBLE_DOWN_VALUES[clueIndex] ?? clue.value) : clue.value;

    this.currentClue = { ...clue, value: effectiveValue };
    this.currentCluePosition = { categoryIndex, clueIndex };
    this.currentCategoryName = category.name;
    this.isPowerPlay = this.powerPlays.has(posKey);

    if (this.isPowerPlay) {
      this.phase = "power-play-wager";
      this.setPhase(state, "power-play-wager");
      this.broadcastGameState(room, state);
      this.sendAllPrivateData(room, state);

      this.scheduleDelayed(room, POWER_PLAY_WAGER_TIMEOUT_MS, () => {
        if (this.phase === "power-play-wager") {
          this.processPowerPlayWager(room, state, 5);
        }
      });
    } else {
      // All players answer simultaneously
      this.goToAnswering(room, state);
    }
  }

  // ─── Answering (all players at once) ────────────────────────────────

  private goToAnswering(room: Room, state: Schema): void {
    this.phase = "answering";
    this.playerAnswers.clear();
    this.resolvingAllAnswers = false;

    this.setPhase(state, "answering");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    // Answer timeout — resolve whatever we have
    this.scheduleDelayed(room, ANSWER_TIMEOUT_MS, () => {
      if (this.phase === "answering") {
        void this.resolveAllAnswers(room, state);
      }
    });
  }

  private handleAnswer(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "answering") return;
    if (!this.playerScores.has(client.sessionId)) return;
    if (this.playerAnswers.has(client.sessionId)) return; // already answered

    const answer = typeof data.answer === "string" ? data.answer : "";
    this.playerAnswers.set(client.sessionId, answer);

    // Mark as submitted on schema
    this.markSubmitted(state, client.sessionId);

    // Update broadcast so host sees progress
    this.broadcastGameState(room, state);

    this.checkAllAnswered(room, state);
  }

  private checkAllAnswered(room: Room, state: Schema): void {
    // Count connected players
    let connectedCount = 0;
    for (const sessionId of this.playerOrder) {
      if (this.isPlayerConnected(state, sessionId)) {
        connectedCount++;
      }
    }

    if (this.playerAnswers.size >= connectedCount) {
      this.clearPendingTimer();
      void this.resolveAllAnswers(room, state);
    }
  }

  private async resolveAllAnswers(room: Room, state: Schema): Promise<void> {
    if (this.phase !== "answering") return;
    if (this.resolvingAllAnswers) return;
    this.resolvingAllAnswers = true;

    if (!this.currentClue) {
      this.resolvingAllAnswers = false;
      this.goToClueResult(room, state, []);
      return;
    }

    try {
      const value = this.currentClue.value;
      const results: ClueResultEntry[] = [];

      for (const sessionId of this.playerOrder) {
        const answer = this.playerAnswers.get(sessionId) ?? "";
        const judged =
          answer.length > 0
            ? await this.judgeAnswerWithModeration(
                room,
                this.currentClue.question,
                this.currentClue.answer,
                answer,
              )
            : ({ correct: false, judgedBy: "local", judgeExplanation: null } as JudgedAnswer);
        const isCorrect = judged.correct;

        let delta = 0;
        if (isCorrect) {
          delta = value;
        } else if (answer.length > 0 && this.complexity !== "kids") {
          // Only penalize if they actually submitted a wrong answer (not blank)
          delta = -value;
        }

        if (delta !== 0) {
          this.adjustScore(state, sessionId, delta);
        }

        results.push({
          sessionId,
          answer,
          correct: isCorrect,
          delta,
          judgedBy: judged.judgedBy,
          ...(judged.judgeExplanation ? { judgeExplanation: judged.judgeExplanation } : {}),
        });
      }

      if (this.phase === "answering") {
        this.goToClueResult(room, state, results);
      }
    } finally {
      this.resolvingAllAnswers = false;
    }
  }

  // ─── Power Play ─────────────────────────────────────────────────────

  private handlePowerPlayWager(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "power-play-wager") return;
    if (client.sessionId !== this.selectorSessionId) return;

    const wager = typeof data.wager === "number" ? Math.floor(data.wager) : 5;
    const playerScore = this.playerScores.get(client.sessionId) ?? 0;
    const highestClueValue = this.currentRound === 2 ? 2000 : 1000;

    if (!validatePowerPlayWager(wager, playerScore, highestClueValue)) return;

    this.processPowerPlayWager(room, state, wager);
  }

  private processPowerPlayWager(room: Room, state: Schema, wager: number): void {
    this.clearPendingTimer();

    this.powerPlayWager = wager;

    this.phase = "power-play-answer";
    this.resolvingPowerPlayAnswer = false;
    this.setPhase(state, "power-play-answer");

    room.broadcast("game-data", {
      type: "power-play-wager-set",
      wager,
    });

    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, ANSWER_TIMEOUT_MS, () => {
      if (this.phase === "power-play-answer") {
        this.processPowerPlayAnswer(room, state, "", {
          correct: false,
          judgedBy: "local",
          judgeExplanation: null,
        } as JudgedAnswer);
      }
    });
  }

  private handlePowerPlayAnswer(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "power-play-answer") return;
    if (client.sessionId !== this.selectorSessionId) return;
    if (!this.currentClue) return;

    const answer = typeof data.answer === "string" ? data.answer : "";

    // Stop the timeout while AI moderation runs.
    this.clearPendingTimer();
    void (async () => {
      const judged =
        answer.length > 0
          ? await this.judgeAnswerWithModeration(
              room,
              this.currentClue?.question ?? "",
              this.currentClue?.answer ?? "",
              answer,
            )
          : ({ correct: false, judgedBy: "local", judgeExplanation: null } as JudgedAnswer);
      this.processPowerPlayAnswer(room, state, answer, judged);
    })();
  }

  private processPowerPlayAnswer(
    room: Room,
    state: Schema,
    _answer: string,
    judged: JudgedAnswer,
  ): void {
    if (this.phase !== "power-play-answer") return;
    if (this.resolvingPowerPlayAnswer) return;
    this.resolvingPowerPlayAnswer = true;
    try {
      this.clearPendingTimer();

      const wager = this.powerPlayWager;
      const sessionId = this.selectorSessionId;
      const isCorrect = judged.correct;

      if (sessionId) {
        if (isCorrect) {
          this.adjustScore(state, sessionId, wager);
        } else if (this.complexity !== "kids") {
          this.adjustScore(state, sessionId, -wager);
        }
      }

      const results = sessionId
        ? [
            {
              sessionId,
              answer: _answer,
              correct: isCorrect,
              delta: isCorrect ? wager : this.complexity === "kids" ? 0 : -wager,
              judgedBy: judged.judgedBy,
              ...(judged.judgeExplanation ? { judgeExplanation: judged.judgeExplanation } : {}),
            },
          ]
        : [];

      this.goToClueResult(room, state, results);
    } finally {
      this.resolvingPowerPlayAnswer = false;
    }
  }

  // ─── Clue Result ─────────────────────────────────────────────────────

  private goToClueResult(room: Room, state: Schema, results: ClueResultEntry[]): void {
    this.clearPendingTimer();
    this.phase = "clue-result";
    this.setPhase(state, "clue-result");
    const correctCount = results.filter((entry) => entry.correct).length;
    const anyCorrect = correctCount > 0;

    room.broadcast("game-data", {
      type: "clue-result",
      results,
      correctCount,
      anyCorrect,
      // Backward-compat fallback for host clients that still read `correct`.
      correct: anyCorrect,
      correctAnswer: this.currentClue?.answer ?? "",
      question: this.currentClue?.question ?? "",
      value: this.currentClue?.value ?? 0,
      category: this.currentCategoryName,
      isPowerPlay: this.isPowerPlay,
    });

    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    // Auto-advance after delay
    this.scheduleDelayed(room, CLUE_RESULT_DELAY_MS, () => {
      this.advanceAfterClue(room, state);
    });
  }

  private advanceAfterClue(room: Room, state: Schema): void {
    // ALWAYS rotate selector to next player in round-robin order
    this.advanceSelector(state);

    // Check if all clues on current board are answered
    if (this.allCluesRevealed()) {
      // If Round 1 is done and not kids mode, go to Round 2
      if (this.currentRound === 1 && this.complexity !== "kids") {
        this.startRoundTransition(room, state);
      } else {
        // Kids mode after Round 1, or Round 2 done -> All-In Round
        this.startAllInRound(room, state);
      }
    } else {
      this.goToClueSelect(room, state);
    }
  }

  // ─── Round Transition ─────────────────────────────────────────────────

  private startRoundTransition(room: Room, state: Schema): void {
    this.phase = "round-transition";
    this.setPhase(state, "round-transition");
    this.broadcastGameState(room, state);

    this.scheduleDelayed(room, ROUND_TRANSITION_DELAY_MS, () => {
      this.startRound2(room, state);
    });
  }

  private startRound2(room: Room, state: Schema): void {
    this.currentRound = 2;
    this.revealedClues.clear();

    // Switch to the Round 2 board
    this.board = this.round2Board;

    // Place Power Plays for Round 2 (always 2)
    this.powerPlays = placePowerPlays(
      getPowerPlayCount(this.complexity, 2),
      CATEGORIES_PER_BOARD,
      CLUES_PER_CATEGORY,
    );

    // Category reveal for new board
    this.phase = "category-reveal";
    this.setPhase(state, "category-reveal");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    // Auto-advance to clue-select after timeout (selector can start earlier)
    this.scheduleDelayed(room, CATEGORY_REVEAL_DELAY_MS, () => {
      if (this.phase === "category-reveal") {
        this.goToClueSelect(room, state);
      }
    });
  }

  // ─── All-In Round ──────────────────────────────────────────────────

  private startAllInRound(room: Room, state: Schema): void {
    // Find a category from a board NOT used in either round
    const banks = getClueBank(this.complexity);
    const usedBoards = new Set([this.round1Board, this.round2Board]);
    const otherBoards = banks.filter((b) => !usedBoards.has(b));
    const sourceBoard = pickRandom(otherBoards) ?? pickRandom(banks) ?? banks[0];
    if (!sourceBoard) {
      this.goToFinalScores(room, state);
      return;
    }
    const sourceCategory = pickRandom(sourceBoard.categories) ?? sourceBoard.categories[0];
    if (!sourceCategory) {
      this.goToFinalScores(room, state);
      return;
    }
    const sourceClue = pickRandom(sourceCategory.clues) ?? sourceCategory.clues[0];
    if (!sourceClue) {
      this.goToFinalScores(room, state);
      return;
    }

    this.finalRound = {
      category: sourceCategory.name,
      clue: sourceClue,
      wagers: new Map(),
      answers: new Map(),
    };

    this.phase = "all-in-category";
    this.setPhase(state, "all-in-category");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, ALL_IN_CATEGORY_DELAY_MS, () => {
      this.goToFinalWager(room, state);
    });
  }

  private goToFinalWager(room: Room, state: Schema): void {
    this.phase = "all-in-wager";
    this.setPhase(state, "all-in-wager");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, ALL_IN_WAGER_TIMEOUT_MS, () => {
      if (this.phase === "all-in-wager") {
        this.finalizeFinalWagers(room, state);
      }
    });
  }

  private handleFinalWager(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "all-in-wager") return;
    if (!this.finalRound) return;
    if (!this.playerScores.has(client.sessionId)) return;

    const wager = typeof data.wager === "number" ? Math.floor(data.wager) : 0;
    const playerScore = this.playerScores.get(client.sessionId) ?? 0;

    if (!validateAllInWager(wager, playerScore)) return;

    this.finalRound.wagers.set(client.sessionId, wager);

    const eligibleCount = this.getAllInEligibleCount();
    if (this.finalRound.wagers.size >= eligibleCount) {
      this.clearPendingTimer();
      this.goToFinalAnswer(room, state);
    }
  }

  private finalizeFinalWagers(room: Room, state: Schema): void {
    if (!this.finalRound) return;

    for (const sessionId of this.playerOrder) {
      const score = this.playerScores.get(sessionId) ?? 0;
      if (score > 0 && !this.finalRound.wagers.has(sessionId)) {
        this.finalRound.wagers.set(sessionId, 0);
      }
    }

    this.goToFinalAnswer(room, state);
  }

  private goToFinalAnswer(room: Room, state: Schema): void {
    this.phase = "all-in-answer";
    this.resolvingFinalAnswers = false;
    this.setPhase(state, "all-in-answer");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, ALL_IN_ANSWER_TIMEOUT_MS, () => {
      if (this.phase === "all-in-answer") {
        void this.finalizeFinalAnswers(room, state);
      }
    });
  }

  private handleFinalAnswer(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "all-in-answer") return;
    if (!this.finalRound) return;
    if (!this.finalRound.wagers.has(client.sessionId)) return;

    const answer = typeof data.answer === "string" ? data.answer : "";
    this.finalRound.answers.set(client.sessionId, answer);

    if (this.finalRound.answers.size >= this.finalRound.wagers.size) {
      this.clearPendingTimer();
      void this.finalizeFinalAnswers(room, state);
    }
  }

  private async finalizeFinalAnswers(room: Room, state: Schema): Promise<void> {
    if (this.phase !== "all-in-answer") return;
    if (this.resolvingFinalAnswers) return;
    this.resolvingFinalAnswers = true;

    if (!this.finalRound) {
      this.resolvingFinalAnswers = false;
      this.goToFinalScores(room, state);
      return;
    }

    try {
      const results: AllInRevealResultEntry[] = [];

      for (const [sessionId, wager] of this.finalRound.wagers) {
        const answer = this.finalRound.answers.get(sessionId) ?? "";
        const judged =
          answer.length > 0
            ? await this.judgeAnswerWithModeration(
                room,
                this.finalRound.clue.question,
                this.finalRound.clue.answer,
                answer,
              )
            : ({ correct: false, judgedBy: "local", judgeExplanation: null } as JudgedAnswer);
        const isCorrect = judged.correct;
        const delta = isCorrect ? wager : this.complexity === "kids" ? 0 : -wager;

        this.adjustScore(state, sessionId, delta);
        results.push({
          sessionId,
          answer,
          correct: isCorrect,
          wager,
          delta,
          judgedBy: judged.judgedBy,
          ...(judged.judgeExplanation ? { judgeExplanation: judged.judgeExplanation } : {}),
        });
      }

      if (this.phase !== "all-in-answer") return;

      this.phase = "all-in-reveal";
      this.setPhase(state, "all-in-reveal");

      room.broadcast("game-data", {
        type: "all-in-reveal",
        correctAnswer: this.finalRound.clue.answer,
        question: this.finalRound.clue.question,
        results,
      });

      this.broadcastGameState(room, state);

      this.scheduleDelayed(room, ALL_IN_REVEAL_DELAY_MS, () => {
        this.goToFinalScores(room, state);
      });
    } finally {
      this.resolvingFinalAnswers = false;
    }
  }

  private async judgeAnswerWithModeration(
    room: Room,
    clueAnswer: string,
    correctQuestion: string,
    playerAnswer: string,
  ): Promise<JudgedAnswer> {
    const answer = playerAnswer.trim();
    if (answer.length === 0) {
      return { correct: false, judgedBy: "local", judgeExplanation: null };
    }

    // Preserve existing local behavior, then use AI only for borderline misses.
    if (judgeAnswer(answer, correctQuestion)) {
      return { correct: true, judgedBy: "local", judgeExplanation: null };
    }

    try {
      const { system, user } = buildAnswerJudgePrompt(clueAnswer, correctQuestion, answer);
      const response = await enqueueAIRequest(room.roomId, () =>
        aiRequest(system, user, AnswerJudgeSchema, {
          model: BRAIN_BOARD_JUDGE_MODEL,
          timeoutMs: BRAIN_BOARD_JUDGE_TIMEOUT_MS,
          retries: 0,
          maxTokens: 180,
        }),
      );
      return {
        correct: response.parsed.correct,
        judgedBy: "ai",
        judgeExplanation: this.normalizeJudgeExplanation(response.parsed.explanation),
      };
    } catch {
      return { correct: false, judgedBy: "fallback", judgeExplanation: null };
    }
  }

  private normalizeJudgeExplanation(explanation: string | undefined): string | null {
    if (typeof explanation !== "string") return null;
    const normalized = explanation.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    return normalized.slice(0, 160);
  }

  // ─── Final Scores ───────────────────────────────────────────────────

  private goToFinalScores(room: Room, state: Schema): void {
    this.phase = "final-scores";
    this.setPhase(state, "final-scores");

    for (const [sessionId, score] of this.playerScores) {
      this.updatePlayerScore(state, sessionId, score);
    }

    room.broadcast("game-data", {
      type: "final-scores",
      standings: this.getStandings(),
    });

    this.broadcastGameState(room, state);
  }

  // ─── Category Selection (pre-game) ──────────────────────────────────

  private handleConfirmCategories(room: Room, state: Schema, client: Client): void {
    if (this.phase !== "category-reveal") return;
    if (client.sessionId !== this.selectorSessionId) return;

    this.clearPendingTimer();
    this.goToClueSelect(room, state);
  }

  private handleRerollBoard(room: Room, state: Schema, client: Client): void {
    if (this.phase !== "category-reveal") return;
    if (client.sessionId !== this.selectorSessionId) return;
    if (!this.board) return;

    // Pick a different random board from available boards
    const currentBoard = this.board;
    const otherBoards = this.availableBoards.filter((b) => b !== currentBoard);
    if (otherBoards.length === 0) return;

    const newBoard = pickRandom(otherBoards) ?? otherBoards[0];
    if (!newBoard) return;

    if (this.currentRound === 1) {
      this.round1Board = newBoard;
    } else {
      this.round2Board = newBoard;
    }
    this.board = newBoard;

    // Re-place Power Plays on the new board
    this.powerPlays = placePowerPlays(
      getPowerPlayCount(this.complexity, this.currentRound),
      CATEGORIES_PER_BOARD,
      CLUES_PER_CATEGORY,
    );

    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);
  }

  // ─── Host Skip ───────────────────────────────────────────────────────

  private handleHostSkip(room: Room, state: Schema): void {
    this.clearPendingTimer();

    switch (this.phase) {
      case "category-reveal":
        this.goToClueSelect(room, state);
        break;
      case "answering":
        void this.resolveAllAnswers(room, state);
        break;
      case "clue-result":
        this.advanceAfterClue(room, state);
        break;
      case "power-play-wager":
        this.processPowerPlayWager(room, state, 5);
        break;
      case "power-play-answer":
        this.processPowerPlayAnswer(room, state, "", {
          correct: false,
          judgedBy: "local",
          judgeExplanation: null,
        } as JudgedAnswer);
        break;
      case "round-transition":
        this.startRound2(room, state);
        break;
      case "all-in-category":
        this.goToFinalWager(room, state);
        break;
      case "all-in-wager":
        this.finalizeFinalWagers(room, state);
        break;
      case "all-in-answer":
        void this.finalizeFinalAnswers(room, state);
        break;
      case "all-in-reveal":
        this.goToFinalScores(room, state);
        break;
      case "final-scores":
        break;
    }
  }

  // ─── Broadcast / Private Data ────────────────────────────────────────

  private broadcastGameState(room: Room, _state: Schema): void {
    const isDoubleDown = this.currentRound === 2;
    const clueValues = isDoubleDown ? DOUBLE_DOWN_VALUES : CLUE_VALUES;

    const boardData = this.board
      ? this.board.categories.map((cat) => ({
          name: cat.name,
          clues: cat.clues.map((_clue, i) => ({
            value: clueValues[i] ?? 0,
          })),
        }))
      : [];

    room.broadcast("game-data", {
      type: "game-state",
      phase: this.phase,
      board: boardData,
      revealedClues: [...this.revealedClues],
      powerPlayCount: this.powerPlays.size,
      selectorSessionId: this.selectorSessionId,
      currentClueValue: this.currentClue?.value ?? null,
      // Show the question (the "answer" in Brain Board terms) during answering
      currentClueQuestion:
        this.phase === "answering" || this.phase === "power-play-answer"
          ? (this.currentClue?.question ?? null)
          : null,
      currentCategoryName: this.currentCategoryName,
      isPowerPlay: this.isPowerPlay,
      standings: this.getStandings(),
      allInCategory: this.finalRound?.category ?? null,
      allInQuestion:
        this.phase === "all-in-answer" || this.phase === "all-in-reveal"
          ? (this.finalRound?.clue.question ?? null)
          : null,
      // Show how many have answered
      answeredCount: this.playerAnswers.size,
      totalPlayerCount: this.playerOrder.length,
      // Round info
      currentRound: this.currentRound,
      doubleDownValues: isDoubleDown,
    });
  }

  private sendPrivateData(room: Room, _state: Schema, sessionId: string): void {
    const client = this.findClient(room, sessionId);
    if (!client) return;

    const score = this.playerScores.get(sessionId) ?? 0;
    const isSelector = this.selectorSessionId === sessionId;
    const hasAnswered = this.playerAnswers.has(sessionId);

    const canWagerFinal =
      this.phase === "all-in-wager" && score > 0 && !this.finalRound?.wagers.has(sessionId);

    const canAnswerFinal =
      this.phase === "all-in-answer" &&
      this.finalRound?.wagers.has(sessionId) === true &&
      !this.finalRound?.answers.has(sessionId);

    // Include board data for category-reveal (all players) or clue-select (selector only)
    const showCategories =
      this.phase === "category-reveal" || (isSelector && this.phase === "clue-select");
    const categories =
      showCategories && this.board ? this.board.categories.map((cat) => cat.name) : undefined;
    const answeredClues = isSelector ? [...this.revealedClues] : undefined;

    // Send the clue question to ALL players during answering phase
    const clueQuestion = this.phase === "answering" ? (this.currentClue?.question ?? null) : null;
    const clueCategory = this.phase === "answering" ? this.currentCategoryName : null;
    const clueValue = this.phase === "answering" ? (this.currentClue?.value ?? null) : null;

    room.send(client, "private-data", {
      type: "player-state",
      score,
      isSelector,
      hasAnswered,
      canAnswer: this.phase === "answering" && !hasAnswered,
      canWagerFinal,
      canAnswerFinal,
      isPowerPlayPlayer: this.isPowerPlay && isSelector,
      categories,
      answeredClues,
      clueQuestion,
      clueCategory,
      clueValue,
    });
  }

  private sendAllPrivateData(room: Room, state: Schema): void {
    for (const sessionId of this.playerOrder) {
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

  private markSubmitted(state: Schema, sessionId: string): void {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema | undefined;
    if (!players) return;
    const player = players.get(sessionId);
    if (player) {
      (player as unknown as Record<string, unknown>).hasSubmitted = true;
    }
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

  private adjustScore(state: Schema, sessionId: string, delta: number): void {
    const current = this.playerScores.get(sessionId) ?? 0;
    let newScore = current + delta;
    if (this.complexity === "kids" && newScore < 0) {
      newScore = 0;
    }
    this.playerScores.set(sessionId, newScore);
    this.updatePlayerScore(state, sessionId, newScore);
  }

  /**
   * Advance selector to the next player in round-robin order.
   * Skips disconnected players.
   */
  private advanceSelector(state: Schema): void {
    if (this.playerOrder.length === 0) return;

    const currentIndex = this.playerOrder.indexOf(this.selectorSessionId ?? "");
    const start = currentIndex >= 0 ? currentIndex : this.selectorIndex;

    // Try each player in order, wrapping around
    for (let i = 1; i <= this.playerOrder.length; i++) {
      const idx = (start + i) % this.playerOrder.length;
      const candidate = this.playerOrder[idx];
      if (candidate && this.isPlayerConnected(state, candidate)) {
        this.selectorSessionId = candidate;
        this.selectorIndex = idx;
        return;
      }
    }

    // Fallback: if no one connected, just advance numerically
    const idx = (start + 1) % this.playerOrder.length;
    this.selectorSessionId = this.playerOrder[idx] ?? this.playerOrder[0] ?? null;
    this.selectorIndex = idx;
  }

  private allCluesRevealed(): boolean {
    return this.revealedClues.size >= CATEGORIES_PER_BOARD * CLUES_PER_CATEGORY;
  }

  private getAllInEligibleCount(): number {
    let count = 0;
    for (const sessionId of this.playerOrder) {
      const score = this.playerScores.get(sessionId) ?? 0;
      if (score > 0) count++;
    }
    return count;
  }

  private getStandings(): Array<{ sessionId: string; score: number }> {
    const standings: Array<{ sessionId: string; score: number }> = [];
    for (const [sessionId, score] of this.playerScores) {
      standings.push({ sessionId, score });
    }
    standings.sort((a, b) => b.score - a.score);
    return standings;
  }

  private scheduleDelayed(room: Room, delayMs: number, callback: () => void): void {
    this.clearPendingTimer();
    const delayed = room.clock.setTimeout(callback, delayMs);
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
        // Ignore
      }
      this.pendingTimerId = null;
    }
  }
}

/** Factory function to create a Brain Board game plugin. */
export function createBrainBoardPlugin(): BrainBoardPlugin {
  return new BrainBoardPlugin();
}

// Re-export helpers and constants for testing
export {
  CLUE_VALUES,
  DOUBLE_DOWN_VALUES,
  CATEGORIES_PER_BOARD,
  CLUES_PER_CATEGORY,
  FUZZY_THRESHOLD,
  getPowerPlayCountLegacy as getPowerPlayCount,
};

// Re-export content types
export type { JeopardyClue, JeopardyCategory, JeopardyBoard } from "./content/clue-bank";
export { KIDS_BOARDS, STANDARD_BOARDS, ADVANCED_BOARDS, getClueBank } from "./content/clue-bank";
