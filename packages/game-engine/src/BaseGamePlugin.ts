import type { MapSchema, Schema } from "@colyseus/schema";
import type { Complexity, GameManifest, ScoreEntry } from "@flimflam/shared";
import type { Client, Delayed, Room } from "colyseus";
import type { GamePlugin } from "./GamePlugin";
import { ScoringEngine } from "./ScoringEngine";
import { computePhaseDuration } from "./TimerSystem";

/** Helper to access schema properties dynamically */
function asRecord(schema: Schema): Record<string, unknown> {
  return schema as unknown as Record<string, unknown>;
}

/**
 * Abstract base class for all game plugins.
 * Provides timer management, phase management, scoring, and player helpers.
 */
export abstract class BaseGamePlugin implements GamePlugin {
  abstract manifest: GameManifest;

  protected scoringEngine: ScoringEngine = new ScoringEngine();
  private _activeTimer: Delayed | null = null;

  abstract createState(): Schema;

  abstract onGameStart(
    room: Room,
    state: Schema,
    players: MapSchema,
    complexity: Complexity,
  ): void | Promise<void>;

  abstract onPlayerMessage(
    room: Room,
    state: Schema,
    client: Client,
    type: string,
    data: unknown,
  ): void | Promise<void>;

  abstract isGameOver(state: Schema): boolean;

  abstract getScores(state: Schema): Map<string, number>;

  // ─── Timer System ─────────────────────────────────────────────────────

  /**
   * Start a phase timer using the room clock.
   * Automatically clears any previous timer.
   */
  protected startPhaseTimer(
    room: Room,
    phase: string,
    complexity: Complexity,
    onExpiry: () => void,
  ): void {
    this.clearTimer();
    const durationMs = computePhaseDuration(phase, complexity);
    const endsAt = Date.now() + durationMs;
    this.setTimerEndsAt(room.state as Schema, endsAt);
    this._activeTimer = room.clock.setTimeout(() => {
      this._activeTimer = null;
      onExpiry();
    }, durationMs);
  }

  /**
   * Clear the active phase timer if any.
   */
  protected clearTimer(): void {
    if (this._activeTimer) {
      this._activeTimer.clear();
      this._activeTimer = null;
    }
  }

  /**
   * Get the phase duration in ms for a phase/complexity combo.
   */
  protected getPhaseTimer(phase: string, complexity: Complexity): number {
    return computePhaseDuration(phase, complexity);
  }

  /**
   * Set the timerEndsAt field on the room state for client sync.
   */
  protected setTimerEndsAt(state: Schema, timestamp: number): void {
    asRecord(state).timerEndsAt = timestamp;
  }

  // ─── Phase Management ─────────────────────────────────────────────────

  /**
   * Transition the game to a new phase.
   */
  protected setPhase(state: Schema, newPhase: string): void {
    asRecord(state).gamePhase = newPhase;
    asRecord(state).phase = newPhase;
  }

  // ─── Scoring ──────────────────────────────────────────────────────────

  /**
   * Award points to a player and update their score on the schema.
   */
  protected addPoints(state: Schema, sessionId: string, points: number, reason: string): void {
    const round = (asRecord(state).round as number) ?? 0;
    this.scoringEngine.addRoundPoints(sessionId, round, points, reason);

    const players = asRecord(state).players as MapSchema | undefined;
    if (players) {
      const player = players.get(sessionId);
      if (player) {
        (player as unknown as Record<string, unknown>).score =
          this.scoringEngine.getTotalPoints(sessionId);
      }
    }
  }

  /**
   * Get the full leaderboard sorted by score with ranks.
   */
  protected getLeaderboard(_state: Schema): ScoreEntry[] {
    return this.scoringEngine.getLeaderboard();
  }

  // ─── Player Helpers ───────────────────────────────────────────────────

  /**
   * Return an array of active (connected) player session IDs.
   */
  protected getActivePlayers(state: Schema): string[] {
    const players = asRecord(state).players as MapSchema | undefined;
    if (!players) return [];
    const result: string[] = [];
    players.forEach((player: unknown, key: string) => {
      if ((player as Record<string, unknown>).connected) {
        result.push(key);
      }
    });
    return result;
  }

  /**
   * Count how many players are still connected.
   */
  protected getActivePlayerCount(state: Schema): number {
    return this.getActivePlayers(state).length;
  }

  /**
   * Count how many players have submitted.
   */
  protected getSubmittedCount(state: Schema): number {
    const players = asRecord(state).players as MapSchema | undefined;
    if (!players) return 0;
    let count = 0;
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    players.forEach((player: unknown) => {
      const p = player as Record<string, unknown>;
      if (p.connected && p.hasSubmitted) {
        count++;
      }
    });
    return count;
  }

  /**
   * Check if all connected players have submitted.
   */
  protected allPlayersSubmitted(state: Schema): boolean {
    const active = this.getActivePlayerCount(state);
    if (active === 0) return false;
    return this.getSubmittedCount(state) >= active;
  }

  /**
   * Reset the hasSubmitted flag for all players.
   */
  protected resetSubmissions(state: Schema): void {
    const players = asRecord(state).players as MapSchema | undefined;
    if (!players) return;
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    players.forEach((player: unknown) => {
      const p = player as Record<string, unknown>;
      p.hasSubmitted = false;
      p.currentInput = "";
    });
  }

  // ─── Default Lifecycle Hooks ──────────────────────────────────────────

  /**
   * Default onPlayerLeave: mark disconnected, auto-submit.
   *
   * Note: we intentionally do not force-end the game when active players drop below MIN_PLAYERS.
   * Colyseus reconnections are common (route transitions, mobile networks), and ending instantly
   * makes games feel brittle. Game plugins can choose to end/skip phases if they truly require a
   * minimum player count.
   */
  onPlayerLeave(_room: Room, state: Schema, sessionId: string, _consented: boolean): void {
    const players = asRecord(state).players as MapSchema | undefined;
    if (!players) return;

    const player = players.get(sessionId);
    if (player) {
      const p = player as unknown as Record<string, unknown>;
      p.connected = false;
      if (!p.hasSubmitted) {
        p.hasSubmitted = true;
      }
    }
  }

  /**
   * Default onTick: no-op.
   */
  onTick(_room: Room, _state: Schema, _deltaTime: number): void {
    // No-op by default
  }

  /**
   * Default onPlayerReconnect: no-op. Override to re-send private data
   * to a player who reconnected mid-game (e.g. via name-based reconnect).
   */
  onPlayerReconnect(_room: Room, _state: Schema, _client: Client): void {
    // No-op by default
  }
}
