import type { MapSchema, Schema } from "@colyseus/schema";
import { BaseGamePlugin } from "@flimflam/game-engine";
import type { Complexity, GameManifest } from "@flimflam/shared";
import { fuzzyMatch, pickRandom, shuffleInPlace } from "@flimflam/shared";
import type { Client, Room } from "colyseus";
import { type JeopardyBoard, type JeopardyClue, getClueBank } from "./content/clue-bank";

// ─── Constants ─────────────────────────────────────────────────────────────

const CLUE_VALUES = [200, 400, 600, 800, 1000];
const CATEGORIES_PER_BOARD = 6;
const CLUES_PER_CATEGORY = 5;

const CATEGORY_REVEAL_DELAY_MS = 5000;
const CLUE_RESULT_DELAY_MS = 6000;
const ANSWER_TIMEOUT_MS = 20000;
const DAILY_DOUBLE_WAGER_TIMEOUT_MS = 20000;
const FINAL_JEOPARDY_WAGER_TIMEOUT_MS = 30000;
const FINAL_JEOPARDY_ANSWER_TIMEOUT_MS = 30000;
const FINAL_JEOPARDY_REVEAL_DELAY_MS = 8000;

const FUZZY_THRESHOLD = 0.85;

/** How many daily doubles by complexity. */
function getDailyDoubleCount(complexity: Complexity): number {
  switch (complexity) {
    case "kids":
      return 1;
    case "standard":
    case "advanced":
      return 2;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

type JeopardyPhase =
  | "category-reveal"
  | "clue-select"
  | "daily-double-wager"
  | "daily-double-answer"
  | "answering"
  | "clue-result"
  | "final-jeopardy-category"
  | "final-jeopardy-wager"
  | "final-jeopardy-answer"
  | "final-jeopardy-reveal"
  | "final-scores";

interface CluePosition {
  categoryIndex: number;
  clueIndex: number;
}

interface FinalJeopardyData {
  category: string;
  clue: JeopardyClue;
  wagers: Map<string, number>;
  answers: Map<string, string>;
}

// ─── Helpers (exported for testing) ────────────────────────────────────────

/**
 * Place daily doubles randomly on the board.
 * Daily doubles are placed only on rows with value >= 400 (indices 1-4).
 * Returns a Set of "categoryIndex,clueIndex" strings.
 */
export function placeDailyDoubles(
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
 * Validate a wager for daily double.
 */
export function validateDailyDoubleWager(wager: number, playerScore: number): boolean {
  if (!Number.isFinite(wager) || wager < 5) return false;
  const maxWager = Math.max(playerScore, 1000);
  return wager <= maxWager;
}

/**
 * Validate a Final Jeopardy wager.
 */
export function validateFinalJeopardyWager(wager: number, playerScore: number): boolean {
  if (playerScore <= 0) return false;
  if (!Number.isFinite(wager) || wager < 0) return false;
  return wager <= playerScore;
}

/**
 * Judge an answer using fuzzy matching.
 */
export function judgeAnswer(playerAnswer: string, correctAnswer: string): boolean {
  return fuzzyMatch(playerAnswer, correctAnswer, FUZZY_THRESHOLD);
}

// ─── Plugin ────────────────────────────────────────────────────────────────

class JeopardyPlugin extends BaseGamePlugin {
  manifest: GameManifest = {
    id: "jeopardy",
    name: "Jeopardy",
    description:
      "Classic quiz show! Pick clues from the board and answer in the form of a question.",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["trivia", "buzzer", "classic"],
    icon: "\u2753",
  };

  // ─── Internal State ──────────────────────────────────────────────────

  private complexity: Complexity = "standard";
  private phase: JeopardyPhase = "category-reveal";

  private board: JeopardyBoard | null = null;
  private dailyDoubles: Set<string> = new Set();
  private revealedClues: Set<string> = new Set();

  private playerOrder: string[] = [];
  private playerScores: Map<string, number> = new Map();

  private selectorSessionId: string | null = null;
  private selectorIndex = 0;

  private currentClue: JeopardyClue | null = null;
  private currentCluePosition: CluePosition | null = null;
  private currentCategoryName = "";
  private isDailyDouble = false;

  // All-answer tracking: every player submits, then we resolve
  private playerAnswers: Map<string, string> = new Map();

  private finalJeopardy: FinalJeopardyData | null = null;

  private pendingTimerId: ReturnType<typeof setTimeout> | null = null;

  createState(): Schema {
    return null as unknown as Schema;
  }

  onGameStart(room: Room, state: Schema, players: MapSchema, complexity: Complexity): void {
    this.complexity = complexity;
    this.phase = "category-reveal";
    this.revealedClues.clear();
    this.playerScores.clear();
    this.playerOrder = [];
    this.selectorIndex = 0;
    this.playerAnswers.clear();

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

    // Pick a random board for this complexity
    const banks = getClueBank(complexity);
    this.board = pickRandom(banks) ?? banks[0] ?? null;

    // Place daily doubles
    this.dailyDoubles = placeDailyDoubles(
      getDailyDoubleCount(complexity),
      CATEGORIES_PER_BOARD,
      CLUES_PER_CATEGORY,
    );

    // First selector is the first player in turn order
    this.selectorSessionId = this.playerOrder[0] ?? null;

    this.setPhase(state, "category-reveal");
    this.broadcastGameState(room, state);

    // Auto-advance to clue-select after reveal delay
    this.scheduleDelayed(room, CATEGORY_REVEAL_DELAY_MS, () => {
      this.goToClueSelect(room, state);
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
      case "player:daily-double-wager":
        this.handleDailyDoubleWager(room, state, client, msg);
        break;
      case "player:daily-double-answer":
        this.handleDailyDoubleAnswer(room, state, client, msg);
        break;
      case "player:final-wager":
        this.handleFinalWager(room, state, client, msg);
        break;
      case "player:final-answer":
        this.handleFinalAnswer(room, state, client, msg);
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
      this.advanceSelector();
      this.broadcastGameState(room, state);
      this.sendAllPrivateData(room, state);
    }

    // If a player leaves during answering, count as submitted (empty)
    if (this.phase === "answering" && !this.playerAnswers.has(sessionId)) {
      this.playerAnswers.set(sessionId, "");
      this.checkAllAnswered(room, state);
    }

    // If daily-double player left, skip the clue
    if (
      (this.phase === "daily-double-wager" || this.phase === "daily-double-answer") &&
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
    this.isDailyDouble = false;
    this.playerAnswers.clear();

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

    this.currentClue = clue;
    this.currentCluePosition = { categoryIndex, clueIndex };
    this.currentCategoryName = category.name;
    this.isDailyDouble = this.dailyDoubles.has(posKey);

    if (this.isDailyDouble) {
      this.phase = "daily-double-wager";
      this.setPhase(state, "daily-double-wager");
      this.broadcastGameState(room, state);
      this.sendAllPrivateData(room, state);

      this.scheduleDelayed(room, DAILY_DOUBLE_WAGER_TIMEOUT_MS, () => {
        if (this.phase === "daily-double-wager") {
          this.processDailyDoubleWager(room, state, 5);
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

    this.setPhase(state, "answering");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    // Answer timeout — resolve whatever we have
    this.scheduleDelayed(room, ANSWER_TIMEOUT_MS, () => {
      if (this.phase === "answering") {
        this.resolveAllAnswers(room, state);
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
      this.resolveAllAnswers(room, state);
    }
  }

  private resolveAllAnswers(room: Room, state: Schema): void {
    if (!this.currentClue) {
      this.goToClueResult(room, state, []);
      return;
    }

    const value = this.currentClue.value;
    const results: Array<{
      sessionId: string;
      answer: string;
      correct: boolean;
      delta: number;
    }> = [];

    let firstCorrectId: string | null = null;

    for (const sessionId of this.playerOrder) {
      const answer = this.playerAnswers.get(sessionId) ?? "";
      const isCorrect = answer.length > 0 && judgeAnswer(answer, this.currentClue.answer);

      let delta = 0;
      if (isCorrect) {
        delta = value;
        if (!firstCorrectId) firstCorrectId = sessionId;
      } else if (answer.length > 0 && this.complexity !== "kids") {
        // Only penalize if they actually submitted a wrong answer (not blank)
        delta = -value;
      }

      if (delta !== 0) {
        this.adjustScore(state, sessionId, delta);
      }

      results.push({ sessionId, answer, correct: isCorrect, delta });
    }

    // Next selector: first correct answerer, else round-robin
    if (firstCorrectId) {
      this.selectorSessionId = firstCorrectId;
    }

    this.goToClueResult(room, state, results);
  }

  // ─── Daily Double ────────────────────────────────────────────────────

  private handleDailyDoubleWager(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "daily-double-wager") return;
    if (client.sessionId !== this.selectorSessionId) return;

    const wager = typeof data.wager === "number" ? Math.floor(data.wager) : 5;
    const playerScore = this.playerScores.get(client.sessionId) ?? 0;

    if (!validateDailyDoubleWager(wager, playerScore)) return;

    this.processDailyDoubleWager(room, state, wager);
  }

  private processDailyDoubleWager(room: Room, state: Schema, wager: number): void {
    this.clearPendingTimer();

    if (this.currentClue) {
      (this.currentClue as JeopardyClue & { wager?: number }).wager = wager;
    }

    this.phase = "daily-double-answer";
    this.setPhase(state, "daily-double-answer");

    room.broadcast("game-data", {
      type: "daily-double-wager-set",
      wager,
    });

    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, ANSWER_TIMEOUT_MS, () => {
      if (this.phase === "daily-double-answer") {
        this.processDailyDoubleAnswer(room, state, "", false);
      }
    });
  }

  private handleDailyDoubleAnswer(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "daily-double-answer") return;
    if (client.sessionId !== this.selectorSessionId) return;
    if (!this.currentClue) return;

    const answer = typeof data.answer === "string" ? data.answer : "";
    const isCorrect = judgeAnswer(answer, this.currentClue.answer);

    this.processDailyDoubleAnswer(room, state, answer, isCorrect);
  }

  private processDailyDoubleAnswer(
    room: Room,
    state: Schema,
    _answer: string,
    isCorrect: boolean,
  ): void {
    this.clearPendingTimer();

    const wager = (this.currentClue as JeopardyClue & { wager?: number })?.wager ?? 5;
    const sessionId = this.selectorSessionId;

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
          },
        ]
      : [];

    this.goToClueResult(room, state, results);
  }

  // ─── Clue Result ─────────────────────────────────────────────────────

  private goToClueResult(
    room: Room,
    state: Schema,
    results: Array<{ sessionId: string; answer: string; correct: boolean; delta: number }>,
  ): void {
    this.clearPendingTimer();
    this.phase = "clue-result";
    this.setPhase(state, "clue-result");

    room.broadcast("game-data", {
      type: "clue-result",
      results,
      correctAnswer: this.currentClue?.answer ?? "",
      question: this.currentClue?.question ?? "",
      value: this.currentClue?.value ?? 0,
      category: this.currentCategoryName,
      isDailyDouble: this.isDailyDouble,
    });

    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    // Auto-advance after delay
    this.scheduleDelayed(room, CLUE_RESULT_DELAY_MS, () => {
      this.advanceAfterClue(room, state);
    });
  }

  private advanceAfterClue(room: Room, state: Schema): void {
    // Selector stays the same (first correct answerer already set in resolveAllAnswers)
    // or advance round-robin if no one got it right
    if (!this.playerOrder.includes(this.selectorSessionId ?? "")) {
      this.advanceSelector();
    }

    // Check if all clues answered
    if (this.allCluesRevealed()) {
      this.startFinalJeopardy(room, state);
    } else {
      this.goToClueSelect(room, state);
    }
  }

  // ─── Final Jeopardy ─────────────────────────────────────────────────

  private startFinalJeopardy(room: Room, state: Schema): void {
    if (!this.board) {
      this.goToFinalScores(room, state);
      return;
    }

    const banks = getClueBank(this.complexity);
    const otherBoards = banks.filter((b) => b !== this.board);
    const sourceBoard = pickRandom(otherBoards) ?? banks[0];
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

    this.finalJeopardy = {
      category: sourceCategory.name,
      clue: sourceClue,
      wagers: new Map(),
      answers: new Map(),
    };

    this.phase = "final-jeopardy-category";
    this.setPhase(state, "final-jeopardy-category");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, CATEGORY_REVEAL_DELAY_MS, () => {
      this.goToFinalWager(room, state);
    });
  }

  private goToFinalWager(room: Room, state: Schema): void {
    this.phase = "final-jeopardy-wager";
    this.setPhase(state, "final-jeopardy-wager");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, FINAL_JEOPARDY_WAGER_TIMEOUT_MS, () => {
      if (this.phase === "final-jeopardy-wager") {
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
    if (this.phase !== "final-jeopardy-wager") return;
    if (!this.finalJeopardy) return;
    if (!this.playerScores.has(client.sessionId)) return;

    const wager = typeof data.wager === "number" ? Math.floor(data.wager) : 0;
    const playerScore = this.playerScores.get(client.sessionId) ?? 0;

    if (!validateFinalJeopardyWager(wager, playerScore)) return;

    this.finalJeopardy.wagers.set(client.sessionId, wager);

    const eligibleCount = this.getFinalJeopardyEligibleCount();
    if (this.finalJeopardy.wagers.size >= eligibleCount) {
      this.clearPendingTimer();
      this.goToFinalAnswer(room, state);
    }
  }

  private finalizeFinalWagers(room: Room, state: Schema): void {
    if (!this.finalJeopardy) return;

    for (const sessionId of this.playerOrder) {
      const score = this.playerScores.get(sessionId) ?? 0;
      if (score > 0 && !this.finalJeopardy.wagers.has(sessionId)) {
        this.finalJeopardy.wagers.set(sessionId, 0);
      }
    }

    this.goToFinalAnswer(room, state);
  }

  private goToFinalAnswer(room: Room, state: Schema): void {
    this.phase = "final-jeopardy-answer";
    this.setPhase(state, "final-jeopardy-answer");
    this.broadcastGameState(room, state);
    this.sendAllPrivateData(room, state);

    this.scheduleDelayed(room, FINAL_JEOPARDY_ANSWER_TIMEOUT_MS, () => {
      if (this.phase === "final-jeopardy-answer") {
        this.finalizeFinalAnswers(room, state);
      }
    });
  }

  private handleFinalAnswer(
    room: Room,
    state: Schema,
    client: Client,
    data: Record<string, unknown>,
  ): void {
    if (this.phase !== "final-jeopardy-answer") return;
    if (!this.finalJeopardy) return;
    if (!this.finalJeopardy.wagers.has(client.sessionId)) return;

    const answer = typeof data.answer === "string" ? data.answer : "";
    this.finalJeopardy.answers.set(client.sessionId, answer);

    if (this.finalJeopardy.answers.size >= this.finalJeopardy.wagers.size) {
      this.clearPendingTimer();
      this.finalizeFinalAnswers(room, state);
    }
  }

  private finalizeFinalAnswers(room: Room, state: Schema): void {
    if (!this.finalJeopardy) {
      this.goToFinalScores(room, state);
      return;
    }

    const results: Array<{
      sessionId: string;
      answer: string;
      correct: boolean;
      wager: number;
      delta: number;
    }> = [];

    for (const [sessionId, wager] of this.finalJeopardy.wagers) {
      const answer = this.finalJeopardy.answers.get(sessionId) ?? "";
      const isCorrect = judgeAnswer(answer, this.finalJeopardy.clue.answer);
      const delta = isCorrect ? wager : this.complexity === "kids" ? 0 : -wager;

      this.adjustScore(state, sessionId, delta);
      results.push({ sessionId, answer, correct: isCorrect, wager, delta });
    }

    this.phase = "final-jeopardy-reveal";
    this.setPhase(state, "final-jeopardy-reveal");

    room.broadcast("game-data", {
      type: "final-jeopardy-reveal",
      correctAnswer: this.finalJeopardy.clue.answer,
      question: this.finalJeopardy.clue.question,
      results,
    });

    this.broadcastGameState(room, state);

    this.scheduleDelayed(room, FINAL_JEOPARDY_REVEAL_DELAY_MS, () => {
      this.goToFinalScores(room, state);
    });
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

  // ─── Host Skip ───────────────────────────────────────────────────────

  private handleHostSkip(room: Room, state: Schema): void {
    this.clearPendingTimer();

    switch (this.phase) {
      case "category-reveal":
        this.goToClueSelect(room, state);
        break;
      case "answering":
        this.resolveAllAnswers(room, state);
        break;
      case "clue-result":
        this.advanceAfterClue(room, state);
        break;
      case "daily-double-wager":
        this.processDailyDoubleWager(room, state, 5);
        break;
      case "daily-double-answer":
        this.processDailyDoubleAnswer(room, state, "", false);
        break;
      case "final-jeopardy-category":
        this.goToFinalWager(room, state);
        break;
      case "final-jeopardy-wager":
        this.finalizeFinalWagers(room, state);
        break;
      case "final-jeopardy-answer":
        this.finalizeFinalAnswers(room, state);
        break;
      case "final-jeopardy-reveal":
        this.goToFinalScores(room, state);
        break;
      case "final-scores":
        break;
    }
  }

  // ─── Broadcast / Private Data ────────────────────────────────────────

  private broadcastGameState(room: Room, _state: Schema): void {
    const boardData = this.board
      ? this.board.categories.map((cat) => ({
          name: cat.name,
          clues: cat.clues.map((clue) => ({
            value: clue.value,
          })),
        }))
      : [];

    room.broadcast("game-data", {
      type: "game-state",
      phase: this.phase,
      board: boardData,
      revealedClues: [...this.revealedClues],
      dailyDoubleCount: this.dailyDoubles.size,
      selectorSessionId: this.selectorSessionId,
      currentClueValue: this.currentClue?.value ?? null,
      // Show the question (the "answer" in Jeopardy terms) during answering
      currentClueQuestion:
        this.phase === "answering" || this.phase === "daily-double-answer"
          ? (this.currentClue?.question ?? null)
          : null,
      currentCategoryName: this.currentCategoryName,
      isDailyDouble: this.isDailyDouble,
      standings: this.getStandings(),
      finalJeopardyCategory: this.finalJeopardy?.category ?? null,
      finalJeopardyQuestion:
        this.phase === "final-jeopardy-answer" || this.phase === "final-jeopardy-reveal"
          ? (this.finalJeopardy?.clue.question ?? null)
          : null,
      // Show how many have answered
      answeredCount: this.playerAnswers.size,
      totalPlayerCount: this.playerOrder.length,
    });
  }

  private sendPrivateData(room: Room, _state: Schema, sessionId: string): void {
    const client = this.findClient(room, sessionId);
    if (!client) return;

    const score = this.playerScores.get(sessionId) ?? 0;
    const isSelector = this.selectorSessionId === sessionId;
    const hasAnswered = this.playerAnswers.has(sessionId);

    const canWagerFinal =
      this.phase === "final-jeopardy-wager" &&
      score > 0 &&
      !this.finalJeopardy?.wagers.has(sessionId);

    const canAnswerFinal =
      this.phase === "final-jeopardy-answer" &&
      this.finalJeopardy?.wagers.has(sessionId) === true &&
      !this.finalJeopardy?.answers.has(sessionId);

    // Include board data for the selector so the phone can render ClueGrid
    const categories =
      isSelector && this.board ? this.board.categories.map((cat) => cat.name) : undefined;
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
      isDailyDoublePlayer: this.isDailyDouble && isSelector,
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

  private advanceSelector(): void {
    const startIndex = this.playerOrder.indexOf(this.selectorSessionId ?? "");
    const start = startIndex >= 0 ? startIndex : this.selectorIndex;
    const idx = (start + 1) % this.playerOrder.length;
    this.selectorSessionId = this.playerOrder[idx] ?? this.playerOrder[0] ?? null;
    this.selectorIndex = idx;
  }

  private allCluesRevealed(): boolean {
    return this.revealedClues.size >= CATEGORIES_PER_BOARD * CLUES_PER_CATEGORY;
  }

  private getFinalJeopardyEligibleCount(): number {
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

/** Factory function to create a Jeopardy game plugin. */
export function createJeopardyPlugin(): JeopardyPlugin {
  return new JeopardyPlugin();
}

// Re-export helpers and constants for testing
export {
  CLUE_VALUES,
  CATEGORIES_PER_BOARD,
  CLUES_PER_CATEGORY,
  FUZZY_THRESHOLD,
  getDailyDoubleCount,
};

// Re-export content types
export type { JeopardyClue, JeopardyCategory, JeopardyBoard } from "./content/clue-bank";
export { KIDS_BOARDS, STANDARD_BOARDS, ADVANCED_BOARDS, getClueBank } from "./content/clue-bank";
