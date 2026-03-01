import type { MapSchema, Schema } from "@colyseus/schema";
import {
  FALLBACK_BLUFF_PROMPTS,
  aiRequest,
  buildBluffPromptGeneration,
  enqueueAIRequest,
} from "@flimflam/ai";
import { BaseGamePlugin, ScoringEngine, getRoundCount } from "@flimflam/game-engine";
import {
  type BluffPromptRaw,
  BluffPromptSchema,
  type Complexity,
  GAME_MANIFESTS,
} from "@flimflam/shared";
import type { Client, Room } from "colyseus";
import { SCORING } from "./scoring";
import {
  type BluffEngineInternalState,
  createBluffInternalState,
  isTooSimilarToReal,
  shuffleArray,
  validateAnswer,
} from "./state";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "bluff-engine")!;

export class BluffEnginePlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: BluffEngineInternalState;

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
    this.internal = createBluffInternalState(complexity);
    this.internal.totalRounds = getRoundCount(complexity);

    const s = state as unknown as Record<string, unknown>;
    s.totalRounds = this.internal.totalRounds;
    s.round = 0;

    this.scoringEngine = new ScoringEngine(complexity === "kids");
    players.forEach((player: Record<string, unknown>, key: string) => {
      this.scoringEngine.initPlayer(key, player.name as string);
    });

    await this._startRound(room, state);
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

    if ((type === "player:submit" || type === "submit-action") && gamePhase === "answer-input") {
      const msg = data as { content?: unknown };
      const validation = validateAnswer(msg?.content);

      if (!validation.valid) {
        room.send(client, "error", { message: validation.error });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already submitted" });
        return;
      }

      // Check if too similar to real answer
      if (
        this.internal.currentPrompt &&
        isTooSimilarToReal(validation.value ?? "", this.internal.currentPrompt.realAnswer)
      ) {
        room.send(client, "error", {
          message: "Your answer is too similar to the real one! Try something else.",
        });
        return;
      }

      p.hasSubmitted = true;
      p.currentInput = validation.value ?? "";
      this.internal.fakeAnswers.set(client.sessionId, validation.value ?? "");

      const submittedPlayerIds: string[] = [];
      players.forEach((playerObj: Record<string, unknown>, key: string) => {
        if (playerObj.connected && playerObj.hasSubmitted) {
          submittedPlayerIds.push(key);
        }
      });
      this._broadcastHost(room, state, {
        question: this.internal.currentPrompt?.question ?? "",
        category: this.internal.currentPrompt?.category ?? "",
        submittedPlayerIds,
      });

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._startVoting(room, state);
      }
    } else if (type === "player:vote" && gamePhase === "voting") {
      const msg = data as { targetIndex?: number };
      if (typeof msg?.targetIndex !== "number") {
        room.send(client, "error", { message: "Invalid vote" });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already voted" });
        return;
      }

      if (msg.targetIndex < 0 || msg.targetIndex >= this.internal.answerOptions.length) {
        room.send(client, "error", { message: "Invalid answer index" });
        return;
      }

      // Players cannot vote for their own answer
      const option = this.internal.answerOptions[msg.targetIndex];
      if (option && option.authorSessionId === client.sessionId) {
        room.send(client, "error", { message: "You cannot vote for your own answer!" });
        return;
      }

      p.hasSubmitted = true;
      this.internal.votes.set(client.sessionId, msg.targetIndex);

      const votedPlayerIds: string[] = [];
      players.forEach((playerObj: Record<string, unknown>, key: string) => {
        if (playerObj.connected && playerObj.hasSubmitted) {
          votedPlayerIds.push(key);
        }
      });
      this._broadcastHost(room, state, {
        question: this.internal.currentPrompt?.question ?? "",
        answers: this.internal.answerOptions.map((o, index) => ({ text: o.text, index })),
        votedPlayerIds,
      });

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._showResults(room, state);
      }
    } else if (type === "host:skip" || type === "host-skip") {
      if (gamePhase === "answer-input") {
        this.clearTimer();
        this._startVoting(room, state);
      } else if (gamePhase === "voting") {
        this.clearTimer();
        this._showResults(room, state);
      } else if (gamePhase === "results") {
        this.clearTimer();
        this._advanceAfterResults(room, state);
      }
    }
  }

  onPlayerReconnect(room: Room, state: Schema, client: Client): void {
    const s = state as unknown as Record<string, unknown>;
    const phase = s.gamePhase as string;

    if (phase === "answer-input") {
      const prompt = this.internal?.currentPrompt;
      if (prompt) {
        room.send(client, "private-data", {
          question: prompt.question,
          category: prompt.category,
        });
      }
    } else if (phase === "voting") {
      const voteOptions = this.internal?.answerOptions.map((o, index) => ({
        index,
        label: o.text,
      }));
      if (voteOptions) {
        const disallowedVoteIndex = this.internal.answerOptions.findIndex(
          (o) => o.authorSessionId === client.sessionId,
        );
        room.send(client, "private-data", {
          voteOptions,
          disallowedVoteIndex: disallowedVoteIndex >= 0 ? disallowedVoteIndex : null,
        });
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

  private async _startRound(room: Room, state: Schema): Promise<void> {
    const s = state as unknown as Record<string, unknown>;
    this.internal.round++;
    s.round = this.internal.round;
    this.internal.fakeAnswers.clear();
    this.internal.answerOptions = [];
    this.internal.votes.clear();
    this.resetSubmissions(state);

    this.setPhase(state, "generating-prompt");
    this.setTimerEndsAt(state, 0);
    this._broadcastHost(room, state, {});

    // Generate prompt via AI
    const previousAccuracy =
      this.internal.totalVoteCount > 0
        ? this.internal.correctVoteCount / this.internal.totalVoteCount
        : undefined;

    const useFallbackPrompt = () => {
      // Pick an unused fallback prompt
      let promptIndex = 0;
      for (let i = 0; i < FALLBACK_BLUFF_PROMPTS.length; i++) {
        if (!this.internal.usedPromptIndices.has(i)) {
          promptIndex = i;
          break;
        }
      }
      this.internal.usedPromptIndices.add(promptIndex);
      this.internal.currentPrompt = FALLBACK_BLUFF_PROMPTS[
        promptIndex % FALLBACK_BLUFF_PROMPTS.length
      ] ?? {
        question: "What is the capital of Australia?",
        realAnswer: "Canberra",
        category: "Geography",
      };
    };

    const hasAiKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    if (!hasAiKey) {
      if (this.internal.round === 1) {
        console.warn("Bluff Engine: ANTHROPIC_API_KEY not set. Using fallback prompts.");
      }
      useFallbackPrompt();
    } else {
      try {
        const result = await enqueueAIRequest(room.roomId, async () => {
          const prompts = buildBluffPromptGeneration(
            this.internal.complexity,
            this.internal.round,
            previousAccuracy,
          );
          return aiRequest<BluffPromptRaw>(prompts.system, prompts.user, BluffPromptSchema, {
            maxTokens: 1024,
          });
        });

        const raw = result.parsed;
        this.internal.currentPrompt = {
          question: raw.question,
          realAnswer: raw.realAnswer ?? raw.real_answer ?? "",
          category: raw.category,
        };
      } catch (error) {
        console.warn("AI prompt generation failed, using fallback:", error);
        useFallbackPrompt();
      }
    }

    const prompt = this.internal.currentPrompt ?? {
      question: "What is the capital of Australia?",
      realAnswer: "Canberra",
      category: "Geography",
    };
    this.internal.currentPrompt = prompt;

    this.setPhase(state, "answer-input");

    this._broadcastHost(room, state, {
      question: prompt.question,
      category: prompt.category,
      submittedPlayerIds: [],
    });

    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostId) continue;
      room.send(client, "private-data", {
        question: prompt.question,
        category: prompt.category,
      });
    }

    this.startPhaseTimer(room, "answer-input", this.internal.complexity, () => {
      this._startVoting(room, state);
    });
  }

  private _startVoting(room: Room, state: Schema): void {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    this.resetSubmissions(state);
    this.setPhase(state, "voting");

    // Build answer options: all fake answers + the real answer
    const options: { text: string; isReal: boolean; authorSessionId: string | null }[] = [];

    // Add submitted fake answers
    for (const [sessionId, fakeAnswer] of this.internal.fakeAnswers) {
      options.push({ text: fakeAnswer, isReal: false, authorSessionId: sessionId });
    }

    // Add fake answers for players who didn't submit
    let missingCount = 0;
    players.forEach((player: Record<string, unknown>, key: string) => {
      if (player.connected && !this.internal.fakeAnswers.has(key)) {
        missingCount++;
      }
    });

    let missingIndex = 0;
    players.forEach((player: Record<string, unknown>, key: string) => {
      if (player.connected && !this.internal.fakeAnswers.has(key)) {
        missingIndex++;
        options.push({
          text: missingCount > 1 ? `No answer submitted #${missingIndex}` : "No answer submitted",
          isReal: false,
          authorSessionId: null,
        });
      }
    });

    // Add the real answer
    options.push({
      text: this.internal.currentPrompt?.realAnswer ?? "Unknown",
      isReal: true,
      authorSessionId: null,
    });

    // Shuffle
    shuffleArray(options);
    this.internal.answerOptions = options;

    this._broadcastHost(room, state, {
      question: this.internal.currentPrompt?.question ?? "",
      answers: options.map((o, index) => ({ text: o.text, index })),
      votedPlayerIds: [],
    });

    // Send voting options to controllers (skip host)
    const voteOptions = options.map((o, index) => ({ index, label: o.text }));
    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostId) continue;
      const disallowedVoteIndex = options.findIndex((o) => o.authorSessionId === client.sessionId);
      room.send(client, "private-data", {
        voteOptions,
        disallowedVoteIndex: disallowedVoteIndex >= 0 ? disallowedVoteIndex : null,
      });
    }

    this.startPhaseTimer(room, "voting", this.internal.complexity, () => {
      this._showResults(room, state);
    });
  }

  private _showResults(room: Room, state: Schema): void {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    this.setPhase(state, "results");

    // Score each voter
    const roundResults: {
      sessionId: string;
      name: string;
      votedFor: number;
      wasCorrect: boolean;
      pointsEarned: number;
    }[] = [];

    // Count how many players voted for each fake answer (for fool points)
    const foolCounts = new Map<string, number>();

    for (const [voterId, votedIndex] of this.internal.votes) {
      const option = this.internal.answerOptions[votedIndex];
      const voter = players.get(voterId);
      if (!voter) continue;

      this.internal.totalVoteCount++;

      if (option?.isReal) {
        // Correct vote
        this.internal.correctVoteCount++;
        this.addPoints(state, voterId, SCORING.CORRECT_VOTE, "Spotted the truth");
        roundResults.push({
          sessionId: voterId,
          name: (voter as Record<string, unknown>).name as string,
          votedFor: votedIndex,
          wasCorrect: true,
          pointsEarned: SCORING.CORRECT_VOTE,
        });
      } else {
        // Got fooled
        this.addPoints(state, voterId, SCORING.GOT_FOOLED, "Fooled");
        roundResults.push({
          sessionId: voterId,
          name: (voter as Record<string, unknown>).name as string,
          votedFor: votedIndex,
          wasCorrect: false,
          pointsEarned: SCORING.GOT_FOOLED,
        });

        // Credit the author of the fake answer
        if (option?.authorSessionId) {
          foolCounts.set(option.authorSessionId, (foolCounts.get(option.authorSessionId) ?? 0) + 1);
        }
      }
    }

    // Award fool points
    for (const [authorId, count] of foolCounts) {
      const points = count * SCORING.FOOL_PLAYER;
      this.addPoints(state, authorId, points, `Fooled ${count} player${count > 1 ? "s" : ""}`);
    }

    const voterNamesByIndex = new Map<number, string[]>();
    for (const [voterId, votedIndex] of this.internal.votes) {
      const voter = players.get(voterId) as Record<string, unknown> | undefined;
      if (!voter) continue;
      const list = voterNamesByIndex.get(votedIndex) ?? [];
      list.push((voter.name as string) ?? "Unknown");
      voterNamesByIndex.set(votedIndex, list);
    }

    this._broadcastHost(room, state, {
      answers: this.internal.answerOptions.map((o, index) => ({
        text: o.text,
        index,
        isReal: o.isReal,
        authorName: o.authorSessionId
          ? ((players.get(o.authorSessionId) as Record<string, unknown> | undefined)?.name as
              | string
              | undefined)
          : undefined,
        voterNames: voterNamesByIndex.get(index) ?? [],
      })),
    });

    this.startPhaseTimer(room, "results-display", this.internal.complexity, () => {
      this._advanceAfterResults(room, state);
    });
  }

  private async _advanceAfterResults(room: Room, state: Schema): Promise<void> {
    if (this.internal.round >= this.internal.totalRounds) {
      this.setPhase(state, "final-scores");
      this.setTimerEndsAt(state, 0);
      this._broadcastHost(room, state, {});
    } else {
      await this._startRound(room, state);
    }
  }
}

export function createBluffEnginePlugin(): BluffEnginePlugin {
  return new BluffEnginePlugin();
}
