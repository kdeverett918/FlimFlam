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
  type TriviaQuestionRaw,
} from "@partyline/shared";
import type { Client, Room } from "colyseus";
import { SCORING } from "./scoring.js";
import {
  type RealityDriftInternalState,
  computeDriftCount,
  createRealityDriftInternalState,
} from "./state.js";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "reality-drift")!;

export class RealityDriftPlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: RealityDriftInternalState;

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

    // Pre-generate ALL questions at once
    const driftCount = computeDriftCount(this.internal.totalRounds, complexity);

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

      this.internal.questions = result.parsed.questions.map((q) => ({
        question: q.question,
        correctAnswer: q.correctAnswer ?? q.correct_answer ?? "",
        options: q.options,
        isDrift: q.isDrift ?? q.is_drift ?? false,
        category: q.category,
      }));

      // Ensure we have enough questions
      while (this.internal.questions.length < this.internal.totalRounds) {
        const fallback =
          FALLBACK_TRIVIA_QUESTIONS[
            this.internal.questions.length % FALLBACK_TRIVIA_QUESTIONS.length
          ];
        if (fallback) this.internal.questions.push(fallback);
      }
    } catch (error) {
      console.warn("AI trivia generation failed, using fallbacks:", error);
      // Shuffle fallbacks and take what we need
      const shuffled = [...FALLBACK_TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5);
      this.internal.questions = shuffled.slice(0, this.internal.totalRounds);
      // Ensure at least some are drift
      let driftSoFar = this.internal.questions.filter((q) => q.isDrift).length;
      for (let i = 0; i < this.internal.questions.length && driftSoFar < driftCount; i++) {
        const q = this.internal.questions[i];
        if (!q) continue;
        if (!q.isDrift) {
          // Find a drift question from fallbacks that isn't already used
          const driftQ = FALLBACK_TRIVIA_QUESTIONS.find(
            (fq) => fq.isDrift && !this.internal.questions.includes(fq),
          );
          if (driftQ) {
            this.internal.questions[i] = driftQ;
            driftSoFar++;
          }
        }
      }
    }

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

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._startDriftCheck(room, state);
      }
    } else if (type === "submit-action" && gamePhase === "drift-check") {
      const msg = data as { content?: unknown };
      const callDrift =
        msg?.content === "drift" || msg?.content === true || msg?.content === "true";

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already submitted" });
        return;
      }

      p.hasSubmitted = true;
      this.internal.driftCalls.set(client.sessionId, callDrift);

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._showResults(room, state);
      }
    } else if (type === "host-skip") {
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

    // Broadcast question (without revealing if it's drift)
    room.broadcast("game-data", {
      type: "trivia-question",
      question: this.internal.currentQuestion.question,
      options: this.internal.currentQuestion.options,
      category: this.internal.currentQuestion.category,
      round: this.internal.round,
      totalRounds: this.internal.totalRounds,
    });

    this.startPhaseTimer(room, "trivia-answer", this.internal.complexity, () => {
      this._startDriftCheck(room, state);
    });
  }

  private _startDriftCheck(room: Room, state: Schema): void {
    this.resetSubmissions(state);
    this.setPhase(state, "drift-check");

    room.broadcast("game-data", {
      type: "drift-check",
      message: "Is this question real or drift (fabricated)?",
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

    room.broadcast("game-data", {
      type: "round-results",
      isDrift,
      correctAnswer: question.correctAnswer,
      correctAnswerIndex,
      question: question.question,
      playerResults,
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
    const leaderboard = this.getLeaderboard(state);
    room.broadcast("game-data", {
      type: "final-scores",
      leaderboard,
    });
  }
}

export function createRealityDriftPlugin(): RealityDriftPlugin {
  return new RealityDriftPlugin();
}
