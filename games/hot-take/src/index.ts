import type { MapSchema, Schema } from "@colyseus/schema";
import { BaseGamePlugin, ScoringEngine, getRoundCount } from "@partyline/game-engine";
import { type Complexity, GAME_MANIFESTS } from "@partyline/shared";
import type { Client, Room } from "colyseus";
import { pickRandomPrompts } from "./prompts";
import { calculateRoundScores } from "./scoring";
import {
  type HotTakeInternalState,
  createHotTakeInternalState,
  getRoundType,
  validateSliderVote,
} from "./state";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "hot-take")!;

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

    // Pre-pick all prompts for the game
    this.prePickedPrompts = pickRandomPrompts(
      complexity,
      this.internal.totalRounds,
      this.internal.usedPromptIndices,
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
    } else if (type === "host:skip" || type === "host-skip") {
      if (gamePhase === "showing-prompt") {
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

    this.internal.votes.clear();
    this.resetSubmissions(state);

    // Determine round type
    this.internal.currentRoundType = getRoundType(this.internal.round);

    // Get prompt
    const promptData = this.prePickedPrompts[this.internal.round - 1];
    this.internal.currentPrompt = promptData?.prompt ?? "Is this a good game?";

    this.setPhase(state, "showing-prompt");

    this._broadcastHost(room, state, {
      statement: this.internal.currentPrompt,
    });

    // Brief display before voting starts
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

    // Award points
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
    for (const v of this.internal.votes.values()) {
      bucketCounts.set(v, (bucketCounts.get(v) ?? 0) + 1);
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
    });

    this.startPhaseTimer(room, "results-display", this.internal.complexity, () => {
      this._advanceAfterResults(room, state);
    });
  }

  private _advanceAfterResults(room: Room, state: Schema): void {
    if (this.internal.round >= this.internal.totalRounds) {
      this.setPhase(state, "final-scores");
      this._broadcastHost(room, state, {});
    } else {
      this._startRound(room, state);
    }
  }
}

export function createHotTakePlugin(): HotTakePlugin {
  return new HotTakePlugin();
}
