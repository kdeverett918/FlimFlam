import type { MapSchema, Schema } from "@colyseus/schema";
import {
  FALLBACK_TRIVIA_QUESTIONS,
  aiRequest,
  buildTriviaBatchPrompt,
  enqueueAIRequest,
} from "@partyline/ai";
import { BaseGamePlugin, ScoringEngine, getRoundCount } from "@partyline/game-engine";
import {
  type Complexity,
  GAME_MANIFESTS,
  TriviaBatchSchema,
  type TriviaQuestion,
  type TriviaQuestionRaw,
} from "@partyline/shared";
import type { Client, Room } from "colyseus";
import { SCORING } from "./scoring";
import {
  type RealityDriftInternalState,
  computeDriftCount,
  computeDriftSchedule,
  createRealityDriftInternalState,
} from "./state";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "reality-drift")!;

export class RealityDriftPlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: RealityDriftInternalState;

  private _broadcastHost(room: Room, state: Schema, payload: Record<string, unknown>): void {
    const s = state as unknown as Record<string, unknown>;
    room.broadcast("game-data", {
      gameId: this.manifest.id,
      phase: (s.phase as string) ?? (s.gamePhase as string) ?? "",
      round: (s.round as number) ?? 0,
      totalRounds: (s.totalRounds as number) ?? 0,
      payload,
    });
  }

  createState(): Schema {
    return {} as Schema;
  }

  async onGameStart(
    room: Room,
    state: Schema,
    players: MapSchema,
    complexity: Complexity,
  ): Promise<void> {
    this.internal = createRealityDriftInternalState(complexity);
    this.internal.totalRounds = getRoundCount(complexity);

    const s = state as unknown as Record<string, unknown>;
    s.totalRounds = this.internal.totalRounds;
    s.round = 0;

    this.scoringEngine = new ScoringEngine(complexity === "kids");
    players.forEach((player: Record<string, unknown>, key: string) => {
      this.scoringEngine.initPlayer(key, player.name as string);
    });

    this.setPhase(state, "generating-questions");
    this._broadcastHost(room, state, {});

    // Pre-generate ALL questions at once
    const driftCount = computeDriftCount(this.internal.totalRounds, complexity);

    const generatedQuestions: TriviaQuestion[] = [];
    try {
      const result = await enqueueAIRequest(room.roomId, async () => {
        const prompts = buildTriviaBatchPrompt(complexity, this.internal.totalRounds, driftCount);
        return aiRequest<{ questions: TriviaQuestionRaw[] }>(
          prompts.system,
          prompts.user,
          TriviaBatchSchema,
          { maxTokens: 4096 },
        );
      });

      for (const q of result.parsed.questions) {
        generatedQuestions.push({
          question: q.question,
          correctAnswer: q.correctAnswer ?? q.correct_answer ?? "",
          options: q.options,
          isDrift: q.isDrift ?? q.is_drift ?? false,
          category: q.category ?? "",
        });
      }
    } catch (error) {
      console.warn("AI trivia generation failed, using fallbacks:", error);
    }

    this.internal.questions = buildQuestionDeck(
      generatedQuestions,
      this.internal.totalRounds,
      driftCount,
      complexity,
    );

    this._startRound(room, state);
  }

  async onPlayerMessage(
    room: Room,
    state: Schema,
    client: Client,
    type: string,
    data: unknown,
  ): Promise<void> {
    const s = state as unknown as Record<string, unknown>;
    const gamePhase = s.gamePhase as string;
    const players = s.players as MapSchema;

    if (type === "player:vote" && gamePhase === "answering") {
      const msg = data as { targetIndex?: number };
      if (typeof msg?.targetIndex !== "number") {
        room.send(client, "error", { message: "Invalid answer" });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already answered" });
        return;
      }

      if (
        msg.targetIndex < 0 ||
        msg.targetIndex >= (this.internal.currentQuestion?.options.length ?? 4)
      ) {
        room.send(client, "error", { message: "Invalid option index" });
        return;
      }

      p.hasSubmitted = true;
      this.internal.answers.set(client.sessionId, msg.targetIndex);

      const answeredPlayerIds: string[] = [];
      players.forEach((playerObj: Record<string, unknown>, key: string) => {
        if (playerObj.connected && playerObj.hasSubmitted) {
          answeredPlayerIds.push(key);
        }
      });
      this._broadcastHost(room, state, {
        question: this.internal.currentQuestion?.question ?? "",
        options: this.internal.currentQuestion?.options ?? [],
        category: this.internal.currentQuestion?.category ?? "",
        answeredPlayerIds,
      });

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._startDriftCheck(room, state);
      }
    } else if (type === "player:vote" && gamePhase === "drift-check") {
      const msg = data as { targetIndex?: unknown };
      if (
        typeof msg?.targetIndex !== "number" ||
        (msg.targetIndex !== 0 && msg.targetIndex !== 1)
      ) {
        room.send(client, "error", { message: "Invalid choice" });
        return;
      }
      const callDrift = msg.targetIndex === 1;

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already submitted" });
        return;
      }

      p.hasSubmitted = true;
      this.internal.driftCalls.set(client.sessionId, callDrift);

      const driftVoterIds: string[] = [];
      for (const [sid, called] of this.internal.driftCalls) {
        if (called) driftVoterIds.push(sid);
      }
      this._broadcastHost(room, state, {
        question: this.internal.currentQuestion?.question ?? "",
        driftVoterIds,
      });

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._showResults(room, state);
      }
    } else if (type === "host:skip" || type === "host-skip") {
      if (gamePhase === "answering") {
        this.clearTimer();
        this._startDriftCheck(room, state);
      } else if (gamePhase === "drift-check") {
        this.clearTimer();
        this._showResults(room, state);
      } else if (gamePhase === "results") {
        this.clearTimer();
        this._advanceAfterResults(room, state);
      }
    }
  }

  isGameOver(state: Schema): boolean {
    return (state as unknown as Record<string, unknown>).gamePhase === "final-scores";
  }

  getScores(_state: Schema): Map<string, number> {
    const scores = new Map<string, number>();
    for (const entry of this.scoringEngine.getLeaderboard()) {
      scores.set(entry.sessionId, entry.score);
    }
    return scores;
  }

  // ─── Private Methods ──────────────────────────────────────────────────

  private _startRound(room: Room, state: Schema): void {
    const s = state as unknown as Record<string, unknown>;
    this.internal.round++;
    s.round = this.internal.round;

    this.internal.answers.clear();
    this.internal.driftCalls.clear();
    this.resetSubmissions(state);

    // Get current question
    this.internal.currentQuestion = this.internal.questions[this.internal.round - 1] ?? null;

    if (!this.internal.currentQuestion) {
      // No more questions, end game
      this.setPhase(state, "final-scores");
      this._showFinalScores(room, state);
      return;
    }

    this.setPhase(state, "answering");

    this._broadcastHost(room, state, {
      question: this.internal.currentQuestion.question,
      options: this.internal.currentQuestion.options,
      category: this.internal.currentQuestion.category,
      answeredPlayerIds: [],
    });

    // Send answer options to controllers
    for (const client of room.clients) {
      room.send(client, "private-data", {
        answerOptions: this.internal.currentQuestion.options.map((opt, index) => ({
          index,
          label: opt,
        })),
      });
    }

    this.startPhaseTimer(room, "trivia-answer", this.internal.complexity, () => {
      this._startDriftCheck(room, state);
    });
  }

  private _startDriftCheck(room: Room, state: Schema): void {
    this.resetSubmissions(state);
    this.setPhase(state, "drift-check");

    this._broadcastHost(room, state, {
      question: this.internal.currentQuestion?.question ?? "",
      driftVoterIds: [],
    });

    // Use the rating timer for drift check
    this.startPhaseTimer(room, "rating", this.internal.complexity, () => {
      this._showResults(room, state);
    });
  }

  private _showResults(room: Room, state: Schema): void {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    const question = this.internal.currentQuestion;
    if (!question) return;

    this.setPhase(state, "results");

    const isDrift = question.isDrift;
    const correctAnswerIndex = question.options.indexOf(question.correctAnswer);

    const playerResults: {
      sessionId: string;
      name: string;
      answerIndex: number | null;
      calledDrift: boolean;
      points: number;
      reason: string;
    }[] = [];

    players.forEach((player: Record<string, unknown>, key: string) => {
      if (!player.connected) return;

      const answerIndex = this.internal.answers.get(key) ?? null;
      const calledDrift = this.internal.driftCalls.get(key) ?? false;
      let points = 0;
      let reason = "";

      if (isDrift) {
        // Question was fake
        if (calledDrift) {
          points = SCORING.CATCH_DRIFT;
          reason = "Caught the drift!";
        } else {
          reason = "Missed the drift";
        }
      } else {
        // Question was real
        if (calledDrift) {
          points = SCORING.FALSE_DRIFT_CALL;
          reason = "False drift call!";
        } else if (answerIndex === correctAnswerIndex) {
          points = SCORING.CORRECT_ANSWER;
          reason = "Correct answer";
        } else {
          reason = "Wrong answer";
        }
      }

      if (points !== 0) {
        this.addPoints(state, key, points, reason);
      }

      playerResults.push({
        sessionId: key,
        name: player.name as string,
        answerIndex,
        calledDrift,
        points,
        reason,
      });
    });

    const driftSoFar = this.internal.questions
      .slice(0, this.internal.round)
      .filter((q) => q.isDrift).length;
    const realityMeter = this.internal.round > 0 ? 1 - driftSoFar / this.internal.round : 1;

    this._broadcastHost(room, state, {
      correctAnswer: question.correctAnswer,
      isDrift,
      realityMeter,
      playerResults: playerResults.map((r) => ({
        sessionId: r.sessionId,
        correct: r.points > 0,
        points: r.points,
      })),
    });

    this.startPhaseTimer(room, "results-display", this.internal.complexity, () => {
      this._advanceAfterResults(room, state);
    });
  }

  private _advanceAfterResults(room: Room, state: Schema): void {
    if (this.internal.round >= this.internal.totalRounds) {
      this.setPhase(state, "final-scores");
      this._showFinalScores(room, state);
    } else {
      this._startRound(room, state);
    }
  }

  private _showFinalScores(room: Room, state: Schema): void {
    this._broadcastHost(room, state, {});
  }
}

export function createRealityDriftPlugin(): RealityDriftPlugin {
  return new RealityDriftPlugin();
}

function normalizeTriviaQuestion(question: TriviaQuestion): TriviaQuestion | null {
  const q = question.question.trim();
  const correctAnswer = question.correctAnswer.trim();
  const category = question.category?.trim() ?? "";

  if (!q || !correctAnswer) return null;
  if (!Array.isArray(question.options)) return null;

  const options = question.options
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter((o) => o.length > 0);

  if (options.length !== 4) return null;
  const unique = Array.from(new Set(options));
  if (unique.length !== 4) return null;

  const exact = unique.find((o) => o === correctAnswer);
  const caseInsensitive = unique.find((o) => o.toLowerCase() === correctAnswer.toLowerCase());
  const normalizedCorrect = exact ?? caseInsensitive;
  if (!normalizedCorrect) return null;

  return {
    question: q,
    correctAnswer: normalizedCorrect,
    options: unique,
    isDrift: Boolean(question.isDrift),
    category,
  };
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j] as T;
    result[j] = tmp as T;
  }
  return result;
}

function buildQuestionDeck(
  generatedQuestions: TriviaQuestion[],
  totalRounds: number,
  driftCount: number,
  complexity: Complexity,
): TriviaQuestion[] {
  const schedule = computeDriftSchedule(totalRounds, driftCount, complexity);

  const normalized = generatedQuestions
    .map(normalizeTriviaQuestion)
    .filter((q): q is TriviaQuestion => q !== null);

  const realPool = shuffle(normalized.filter((q) => !q.isDrift));
  const driftPool = shuffle(normalized.filter((q) => q.isDrift));

  const fallbackReal = FALLBACK_TRIVIA_QUESTIONS.filter((q) => !q.isDrift);
  const fallbackDrift = FALLBACK_TRIVIA_QUESTIONS.filter((q) => q.isDrift);

  let realFallbackCursor = Math.floor(Math.random() * Math.max(1, fallbackReal.length));
  let driftFallbackCursor = Math.floor(Math.random() * Math.max(1, fallbackDrift.length));

  const nextFallback = (wantDrift: boolean): TriviaQuestion => {
    const pool = wantDrift ? fallbackDrift : fallbackReal;
    if (pool.length === 0) {
      const any = FALLBACK_TRIVIA_QUESTIONS[0];
      if (any) {
        return { ...any, options: [...any.options], isDrift: wantDrift };
      }
      return {
        question: "Reality Drift",
        correctAnswer: "A",
        options: ["A", "B", "C", "D"],
        isDrift: wantDrift,
        category: "",
      };
    }

    const idx = wantDrift ? driftFallbackCursor++ : realFallbackCursor++;
    const q = pool[idx % pool.length];
    // biome-ignore lint/style/noNonNullAssertion: pool length checked above
    return { ...q!, options: [...q!.options] };
  };

  const deck: TriviaQuestion[] = [];
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const wantDrift = schedule[roundIndex] ?? false;
    const q = wantDrift ? driftPool.shift() : realPool.shift();
    deck.push(q ?? nextFallback(wantDrift));
  }

  return deck;
}
