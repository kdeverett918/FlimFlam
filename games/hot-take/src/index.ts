import type { MapSchema, Schema } from "@colyseus/schema";
import {
  aiRequest,
  buildHotTakeAdaptivePrompt,
  buildHotTakeInitialPrompt,
  enqueueAIRequest,
} from "@partyline/ai";
import { BaseGamePlugin, ScoringEngine, getRoundCount } from "@partyline/game-engine";
import {
  type Complexity,
  GAME_MANIFESTS,
  type HotTakeBatchRaw,
  HotTakeBatchSchema,
  type HotTakePromptRaw,
} from "@partyline/shared";
import type { Client, Room } from "colyseus";
import { pickRandomPrompts } from "./prompts";
import { calculateRoundScores } from "./scoring";
import {
  type HotTakeInternalState,
  computeRoundStats,
  createHotTakeInternalState,
  getRoundType,
  validateSliderVote,
  validateTopicSubmission,
} from "./state";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "hot-take")!;

const TOPIC_CATEGORIES = [
  "politics",
  "dating",
  "workplace",
  "food",
  "technology",
  "lifestyle",
  "wildcard",
];

const DEFAULT_PROMPT = "Is this a good game?";

export class HotTakePlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: HotTakeInternalState;
  private prePickedPrompts: { prompt: string; index: number }[] = [];

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

  private _isHostPlayerInputEnabled(state: Schema): boolean {
    const s = state as unknown as Record<string, unknown>;
    return s.hotTakePlayerInputEnabled === true;
  }

  private _getStaticPrompt(roundIndex: number): string {
    return this.prePickedPrompts[roundIndex]?.prompt ?? DEFAULT_PROMPT;
  }

  private _normalizeGeneratedPrompt(raw: HotTakePromptRaw | undefined): {
    statement: string;
    reasoning?: string;
    escalationLevel?: number;
  } | null {
    if (!raw || typeof raw.statement !== "string") return null;
    const statement = raw.statement.trim();
    if (!statement) return null;

    const prompt: { statement: string; reasoning?: string; escalationLevel?: number } = {
      statement: statement.slice(0, 180),
    };

    if (typeof raw.reasoning === "string" && raw.reasoning.trim().length > 0) {
      prompt.reasoning = raw.reasoning.trim().slice(0, 240);
    }

    const escalation = raw.escalationLevel ?? raw.escalation_level;
    if (typeof escalation === "number" && Number.isFinite(escalation)) {
      prompt.escalationLevel = Math.min(10, Math.max(1, Math.round(escalation)));
    }

    return prompt;
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
    this.internal = createHotTakeInternalState(complexity);
    this.internal.totalRounds = getRoundCount(complexity);

    const s = state as unknown as Record<string, unknown>;
    s.totalRounds = this.internal.totalRounds;
    s.round = 0;

    this.scoringEngine = new ScoringEngine(complexity === "kids");
    players.forEach((player: Record<string, unknown>, key: string) => {
      this.scoringEngine.initPlayer(key, player.name as string);
    });

    // Pre-pick static prompts for baseline mode and AI fallback/padding.
    this.prePickedPrompts = pickRandomPrompts(
      complexity,
      this.internal.totalRounds,
      this.internal.usedPromptIndices,
    );

    const apiAvailable = Boolean(process.env.ANTHROPIC_API_KEY);
    const hostEnabled = this._isHostPlayerInputEnabled(state);
    const shouldUsePlayerInput =
      complexity === "advanced" || (complexity === "standard" && hostEnabled);

    this.internal.usePlayerInput = shouldUsePlayerInput && apiAvailable;

    if (this.internal.usePlayerInput) {
      this._startTopicSetup(room, state);
      return;
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

    if (type === "player:submit" && gamePhase === "topic-setup") {
      const validation = validateTopicSubmission(data);
      if (!validation.valid || !validation.value) {
        room.send(client, "error", { message: validation.error ?? "Invalid topic submission" });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Topic already submitted" });
        return;
      }

      p.hasSubmitted = true;
      p.currentInput = validation.value.content;
      this.internal.profilesSubmitted.add(client.sessionId);
      this.internal.playerProfiles.push({
        sessionId: client.sessionId,
        name: p.name as string,
        topic: validation.value.content,
        category: validation.value.category,
      });

      this._broadcastHost(room, state, {
        message: "Players are submitting topics...",
        submittedPlayerIds: Array.from(this.internal.profilesSubmitted),
      });

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        await this._generateAIPrompts(room, state);
      }
      return;
    }

    if (type === "player:vote" && gamePhase === "voting") {
      const msg = data as { value?: unknown };
      const validation = validateSliderVote(msg?.value);

      if (!validation.valid) {
        room.send(client, "error", { message: validation.error });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already voted" });
        return;
      }

      p.hasSubmitted = true;
      this.internal.votes.set(client.sessionId, validation.value ?? 0);

      const votedPlayerIds: string[] = [];
      players.forEach((playerObj: Record<string, unknown>, key: string) => {
        if (playerObj.connected && playerObj.hasSubmitted) {
          votedPlayerIds.push(key);
        }
      });

      this._broadcastHost(room, state, {
        statement: this.internal.currentPrompt,
        votedPlayerIds,
      });

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._showResults(room, state);
      }
      return;
    }

    if (type === "host:skip" || type === "host-skip") {
      if (gamePhase === "topic-setup") {
        this.clearTimer();
        await this._generateAIPrompts(room, state);
      } else if (gamePhase === "showing-prompt") {
        this.clearTimer();
        this._startVoting(room, state);
      } else if (gamePhase === "voting") {
        this.clearTimer();
        this._showResults(room, state);
      } else if (gamePhase === "results") {
        this.clearTimer();
        await this._advanceAfterResults(room, state);
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

  // Private methods

  private _startTopicSetup(room: Room, state: Schema): void {
    this.setPhase(state, "topic-setup");
    this.resetSubmissions(state);

    this.internal.playerProfiles = [];
    this.internal.profilesSubmitted.clear();

    this._broadcastHost(room, state, {
      message: "Players are submitting topics...",
      submittedPlayerIds: [],
    });

    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    players.forEach((player: Record<string, unknown>, key: string) => {
      if (!player.connected) return;
      const target = room.clients.find((c) => c.sessionId === key);
      if (!target) return;
      room.send(target, "private-data", {
        inputType: "topic-setup",
        prompt: "What topic should the hot takes be about?",
        categories: TOPIC_CATEGORIES,
      });
    });

    this.startPhaseTimer(room, "topic-setup", this.internal.complexity, () => {
      void this._generateAIPrompts(room, state);
    });
  }

  private async _generateAIPrompts(room: Room, state: Schema): Promise<void> {
    this.clearTimer();
    this.setPhase(state, "ai-generating");
    this.resetSubmissions(state);

    this._broadcastHost(room, state, {
      message: "AI is crafting your hot takes...",
    });

    const players = (state as unknown as Record<string, unknown>).players as MapSchema;

    players.forEach((player: Record<string, unknown>, key: string) => {
      if (!player.connected) return;
      if (!this.internal.profilesSubmitted.has(key)) {
        this.internal.playerProfiles.push({
          sessionId: key,
          name: player.name as string,
          topic: "surprise me",
          category: "wildcard",
        });
      }
    });

    const categoryCounts = new Map<string, number>();
    for (const profile of this.internal.playerProfiles) {
      categoryCounts.set(profile.category, (categoryCounts.get(profile.category) ?? 0) + 1);
    }
    let topCategory = "general";
    let topCount = -1;
    for (const [category, count] of categoryCounts) {
      if (count > topCount) {
        topCategory = category;
        topCount = count;
      }
    }
    this.internal.topicCategory = topCategory;

    try {
      const { system, user } = buildHotTakeInitialPrompt(
        this.internal.complexity,
        this.internal.playerProfiles,
        this.internal.totalRounds,
      );

      const response = await enqueueAIRequest(room.roomId, () =>
        aiRequest<HotTakeBatchRaw>(system, user, HotTakeBatchSchema, { maxTokens: 4096 }),
      );

      const generated: Array<NonNullable<ReturnType<HotTakePlugin["_normalizeGeneratedPrompt"]>>> =
        [];
      for (const prompt of response.parsed.prompts) {
        const normalized = this._normalizeGeneratedPrompt(prompt as HotTakePromptRaw);
        if (normalized) {
          generated.push(normalized);
        }
      }

      const padded = generated.slice(0, this.internal.totalRounds);
      for (let i = padded.length; i < this.internal.totalRounds; i++) {
        padded.push({
          statement: this._getStaticPrompt(i),
          reasoning: "Static fallback prompt used due short AI batch.",
        });
      }

      this.internal.aiGeneratedPrompts = padded;
    } catch (error) {
      console.error("[HotTake] AI prompt generation failed, using static fallback:", error);
      this.internal.aiGeneratedPrompts = [];
      this.internal.usePlayerInput = false;
    }

    this._startRound(room, state);
  }

  private _startRound(room: Room, state: Schema): void {
    const s = state as unknown as Record<string, unknown>;
    this.internal.round++;
    s.round = this.internal.round;

    this.internal.votes.clear();
    this.resetSubmissions(state);
    this.internal.currentRoundType = getRoundType(this.internal.round);

    const roundIndex = this.internal.round - 1;
    if (this.internal.usePlayerInput && this.internal.aiGeneratedPrompts.length > 0) {
      this.internal.currentPrompt =
        this.internal.aiGeneratedPrompts[roundIndex]?.statement ??
        this._getStaticPrompt(roundIndex);
    } else {
      this.internal.currentPrompt = this._getStaticPrompt(roundIndex);
    }

    this.setPhase(state, "showing-prompt");

    this._broadcastHost(room, state, {
      statement: this.internal.currentPrompt,
    });

    room.clock.setTimeout(() => {
      this._startVoting(room, state);
    }, 3000);
  }

  private _startVoting(room: Room, state: Schema): void {
    this.setPhase(state, "voting");
    this.resetSubmissions(state);

    this._broadcastHost(room, state, {
      statement: this.internal.currentPrompt,
      votedPlayerIds: [],
    });

    this.startPhaseTimer(room, "rating", this.internal.complexity, () => {
      this._showResults(room, state);
    });
  }

  private _showResults(room: Room, state: Schema): void {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    this.setPhase(state, "results");

    // Calculate scores
    const scores = calculateRoundScores(this.internal.votes, this.internal.currentRoundType);

    const playerResults: {
      sessionId: string;
      name: string;
      vote: number | null;
      points: number;
      reason: string;
    }[] = [];

    players.forEach((player: Record<string, unknown>, key: string) => {
      if (!player.connected) return;

      const vote = this.internal.votes.get(key) ?? null;
      const scoreInfo = scores.get(key);
      const points = scoreInfo?.points ?? 0;
      const reason = scoreInfo?.reason ?? "Did not vote";

      if (points > 0) {
        this.addPoints(state, key, points, reason);
      }

      playerResults.push({
        sessionId: key,
        name: player.name as string,
        vote,
        points,
        reason,
      });
    });

    const votes = Array.from(this.internal.votes.entries()).map(([sessionId, value]) => ({
      sessionId,
      value,
    }));

    const bucketCounts = new Map<number, number>();
    for (const vote of this.internal.votes.values()) {
      bucketCounts.set(vote, (bucketCounts.get(vote) ?? 0) + 1);
    }

    let majorityValue = 0;
    let majorityCount = -1;
    for (const [value, count] of bucketCounts) {
      if (count > majorityCount) {
        majorityValue = value;
        majorityCount = count;
      }
    }

    const loneWolfIds: string[] = [];
    if (this.internal.currentRoundType === "lone-wolf") {
      for (const [sessionId, value] of this.internal.votes) {
        if ((bucketCounts.get(value) ?? 0) === 1) {
          loneWolfIds.push(sessionId);
        }
      }
    }

    this._broadcastHost(room, state, {
      statement: this.internal.currentPrompt,
      votes,
      majorityValue,
      loneWolfIds,
      playerResults,
    });

    if (this.internal.usePlayerInput) {
      const stats = computeRoundStats(
        this.internal.currentPrompt,
        this.internal.round,
        this.internal.votes,
      );
      this.internal.roundHistory.push(stats);
    }

    this.startPhaseTimer(room, "results-display", this.internal.complexity, () => {
      void this._advanceAfterResults(room, state);
    });
  }

  private async _advanceAfterResults(room: Room, state: Schema): Promise<void> {
    if (this.internal.round >= this.internal.totalRounds) {
      this.setPhase(state, "final-scores");
      this._broadcastHost(room, state, {});
      return;
    }

    const remainingRounds = this.internal.totalRounds - this.internal.round;
    const lastRound = this.internal.roundHistory[this.internal.roundHistory.length - 1];
    if (this.internal.usePlayerInput && lastRound?.wasUnanimous && remainingRounds > 0) {
      await this._adaptNextPrompt(room, state, remainingRounds);
    }

    this._startRound(room, state);
  }

  private async _adaptNextPrompt(
    room: Room,
    _state: Schema,
    remainingRounds: number,
  ): Promise<void> {
    try {
      const { system, user } = buildHotTakeAdaptivePrompt(
        this.internal.complexity,
        this.internal.playerProfiles,
        this.internal.roundHistory,
        remainingRounds,
      );

      const response = await enqueueAIRequest(room.roomId, () =>
        aiRequest<HotTakeBatchRaw>(system, user, HotTakeBatchSchema, {
          maxTokens: 1024,
          timeoutMs: 5_000,
        }),
      );

      const adapted = this._normalizeGeneratedPrompt(response.parsed.prompts[0]);
      const nextIndex = this.internal.round;

      if (adapted && nextIndex < this.internal.aiGeneratedPrompts.length) {
        this.internal.aiGeneratedPrompts[nextIndex] = adapted;
      }
    } catch (error) {
      console.error("[HotTake] Adaptive prompt generation failed, keeping original:", error);
    }
  }
}

export function createHotTakePlugin(): HotTakePlugin {
  return new HotTakePlugin();
}
