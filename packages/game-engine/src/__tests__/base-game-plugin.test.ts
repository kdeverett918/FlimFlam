import { MapSchema, type Schema } from "@colyseus/schema";
import type { GameManifest } from "@flimflam/shared";
import type { Client, Room } from "colyseus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BaseGamePlugin } from "../BaseGamePlugin";

class TestPlugin extends BaseGamePlugin {
  manifest: GameManifest = {
    id: "test",
    name: "Test Game",
    description: "Test game plugin",
    minPlayers: 2,
    maxPlayers: 8,
    estimatedMinutes: 5,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["test"],
    icon: "T",
  };

  createState(): Schema {
    return {} as Schema;
  }

  onGameStart(): void {}

  onPlayerMessage(): void {}

  isGameOver(): boolean {
    return false;
  }

  getScores(): Map<string, number> {
    return new Map();
  }

  initPlayerForScoring(sessionId: string, name: string): void {
    this.scoringEngine.initPlayer(sessionId, name);
  }

  startTimerPublic(room: Room, phase: string, onExpiry: () => void): void {
    this.startPhaseTimer(room, phase, "standard", onExpiry);
  }

  clearTimerPublic(): void {
    this.clearTimer();
  }

  getPhaseTimerPublic(phase: string): number {
    return this.getPhaseTimer(phase, "standard");
  }

  setTimerEndsAtPublic(state: Schema, timestamp: number): void {
    this.setTimerEndsAt(state, timestamp);
  }

  setPhasePublic(state: Schema, phase: string): void {
    this.setPhase(state, phase);
  }

  addPointsPublic(state: Schema, sessionId: string, points: number, reason: string): void {
    this.addPoints(state, sessionId, points, reason);
  }

  getLeaderboardPublic(state: Schema) {
    return this.getLeaderboard(state);
  }

  getActivePlayersPublic(state: Schema): string[] {
    return this.getActivePlayers(state);
  }

  getActivePlayerCountPublic(state: Schema): number {
    return this.getActivePlayerCount(state);
  }

  getSubmittedCountPublic(state: Schema): number {
    return this.getSubmittedCount(state);
  }

  allPlayersSubmittedPublic(state: Schema): boolean {
    return this.allPlayersSubmitted(state);
  }

  resetSubmissionsPublic(state: Schema): void {
    this.resetSubmissions(state);
  }
}

function createRoom(state: Schema) {
  let callback: (() => void) | null = null;
  const delayed = { clear: vi.fn() };
  const setTimeout = vi.fn((fn: () => void) => {
    callback = fn;
    return delayed;
  });

  const room = {
    state,
    clock: { setTimeout },
  } as unknown as Room;

  return {
    room,
    delayed,
    setTimeout,
    trigger: () => callback?.(),
  };
}

function createStateWithPlayers(
  players: Array<{ id: string; connected: boolean; hasSubmitted: boolean }>,
) {
  const playerMap = new MapSchema<Record<string, unknown>>();
  for (const player of players) {
    playerMap.set(player.id, {
      connected: player.connected,
      hasSubmitted: player.hasSubmitted,
      currentInput: "seed",
      score: 0,
    });
  }
  return {
    players: playerMap,
    round: 2,
  } as unknown as Schema;
}

describe("game-engine/BaseGamePlugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts timers, updates timerEndsAt, and runs expiry callback", () => {
    vi.spyOn(Date, "now").mockReturnValue(100_000);
    const plugin = new TestPlugin();
    const state = {} as Schema;
    const { room, setTimeout, trigger } = createRoom(state);
    const onExpiry = vi.fn();

    plugin.startTimerPublic(room, "reveal", onExpiry);

    expect(plugin.getPhaseTimerPublic("reveal")).toBe(15_000);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 15_000);
    expect((state as unknown as Record<string, unknown>).timerEndsAt).toBe(115_000);

    trigger();
    expect(onExpiry).toHaveBeenCalledTimes(1);
  });

  it("clears an existing timer before starting a new one", () => {
    vi.spyOn(Date, "now").mockReturnValue(200_000);
    const plugin = new TestPlugin();
    const state = {} as Schema;

    const delayedA = { clear: vi.fn() };
    const delayedB = { clear: vi.fn() };
    const setTimeout = vi
      .fn()
      .mockReturnValueOnce(delayedA as never)
      .mockReturnValueOnce(delayedB as never);

    const room = {
      state,
      clock: { setTimeout },
    } as unknown as Room;

    plugin.startTimerPublic(room, "reveal", vi.fn());
    plugin.startTimerPublic(room, "answering", vi.fn());
    plugin.clearTimerPublic();

    expect(delayedA.clear).toHaveBeenCalledTimes(1);
    expect(delayedB.clear).toHaveBeenCalledTimes(1);
  });

  it("sets phase/timer fields and tracks scoring back into player schema", () => {
    const plugin = new TestPlugin();
    const state = createStateWithPlayers([
      { id: "p1", connected: true, hasSubmitted: false },
      { id: "p2", connected: true, hasSubmitted: true },
    ]);
    const players = (state as unknown as Record<string, unknown>).players as MapSchema<
      Record<string, unknown>
    >;
    plugin.initPlayerForScoring("p1", "Alex");

    plugin.setPhasePublic(state, "round-result");
    plugin.setTimerEndsAtPublic(state, 42);
    plugin.addPointsPublic(state, "p1", 300, "Correct answer");

    expect((state as unknown as Record<string, unknown>).phase).toBe("round-result");
    expect((state as unknown as Record<string, unknown>).gamePhase).toBe("round-result");
    expect((state as unknown as Record<string, unknown>).timerEndsAt).toBe(42);
    expect(players.get("p1")?.score).toBe(300);
    expect(plugin.getLeaderboardPublic(state)[0]?.score).toBe(300);
  });

  it("calculates active/submitted player state and resets submissions", () => {
    const plugin = new TestPlugin();
    const state = createStateWithPlayers([
      { id: "a", connected: true, hasSubmitted: true },
      { id: "b", connected: true, hasSubmitted: false },
      { id: "c", connected: false, hasSubmitted: true },
    ]);

    expect(plugin.getActivePlayersPublic(state).sort()).toEqual(["a", "b"]);
    expect(plugin.getActivePlayerCountPublic(state)).toBe(2);
    expect(plugin.getSubmittedCountPublic(state)).toBe(1);
    expect(plugin.allPlayersSubmittedPublic(state)).toBe(false);

    const players = (state as unknown as Record<string, unknown>).players as MapSchema<
      Record<string, unknown>
    >;
    const playerB = players.get("b");
    if (playerB) {
      playerB.hasSubmitted = true;
    }
    expect(plugin.allPlayersSubmittedPublic(state)).toBe(true);

    plugin.resetSubmissionsPublic(state);
    expect(players.get("a")?.hasSubmitted).toBe(false);
    expect(players.get("a")?.currentInput).toBe("");
    expect(players.get("b")?.hasSubmitted).toBe(false);
    expect(players.get("c")?.hasSubmitted).toBe(false);
  });

  it("marks leaving players disconnected and auto-submits when needed", () => {
    const plugin = new TestPlugin();
    const state = createStateWithPlayers([
      { id: "a", connected: true, hasSubmitted: false },
      { id: "b", connected: true, hasSubmitted: true },
    ]);

    plugin.onPlayerLeave({} as Room, state, "a", true);
    plugin.onPlayerLeave({} as Room, state, "b", true);
    plugin.onPlayerLeave({} as Room, state, "missing", true);

    const players = (state as unknown as Record<string, unknown>).players as MapSchema<
      Record<string, unknown>
    >;
    expect(players.get("a")?.connected).toBe(false);
    expect(players.get("a")?.hasSubmitted).toBe(true);
    expect(players.get("b")?.connected).toBe(false);
    expect(players.get("b")?.hasSubmitted).toBe(true);
  });

  it("keeps default lifecycle hooks as no-ops", () => {
    const plugin = new TestPlugin();
    const state = {} as Schema;

    expect(() => plugin.onTick({} as Room, state, 16)).not.toThrow();
    expect(() => plugin.onPlayerReconnect({} as Room, state, {} as Client)).not.toThrow();
  });
});
