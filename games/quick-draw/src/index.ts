import type { MapSchema, Schema } from "@colyseus/schema";
import { BaseGamePlugin, ScoringEngine, getRoundCount } from "@partyline/game-engine";
import { type Complexity, GAME_MANIFESTS } from "@partyline/shared";
import type { Client, Room } from "colyseus";
import {
  type QuickDrawInternalState,
  createQuickDrawInternalState,
  getDrawerScore,
  getGuessScore,
  isCorrectGuess,
} from "./state";
import { pickRandomWord } from "./word-bank";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "quick-draw")!;

export class QuickDrawPlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: QuickDrawInternalState;

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
    this.internal = createQuickDrawInternalState(complexity);
    this.internal.totalRounds = getRoundCount(complexity);

    const s = state as unknown as Record<string, unknown>;
    s.totalRounds = this.internal.totalRounds;
    s.round = 0;

    this.scoringEngine = new ScoringEngine(complexity === "kids");
    players.forEach((player: Record<string, unknown>, key: string) => {
      this.scoringEngine.initPlayer(key, player.name as string);
    });

    // Build drawer order (rotate through all players)
    const keys: string[] = [];
    players.forEach((_: unknown, key: string) => keys.push(key));
    // Shuffle for random order
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = keys[i] as string;
      keys[i] = keys[j] as string;
      keys[j] = temp;
    }
    this.internal.drawerOrder = keys;
    this.internal.drawerIndex = 0;

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

    if (type === "player:draw-stroke" && gamePhase === "drawing") {
      // Only the drawer can draw
      if (client.sessionId !== this.internal.currentDrawerSessionId) {
        return;
      }
      const stroke = data as { points?: { x: number; y: number }[]; color?: string; size?: number };
      if (!stroke?.points || !Array.isArray(stroke.points)) return;

      // Broadcast stroke to all OTHER clients (not via schema, via broadcast)
      room.broadcast(
        "draw-stroke",
        {
          sessionId: client.sessionId,
          points: stroke.points,
          color: stroke.color ?? "#000000",
          size: stroke.size ?? 3,
        },
        { except: client },
      );
    } else if ((type === "player:submit" || type === "submit-action") && gamePhase === "guessing") {
      // Drawer cannot guess
      if (client.sessionId === this.internal.currentDrawerSessionId) {
        return;
      }

      // Already guessed correctly
      if (this.internal.guessedPlayers.has(client.sessionId)) {
        return;
      }

      const msg = data as { content?: unknown };
      if (typeof msg?.content !== "string") return;
      const guess = (msg.content as string).trim();
      if (guess.length === 0) return;

      if (isCorrectGuess(guess, this.internal.currentWord)) {
        this.internal.guessedPlayers.add(client.sessionId);
        this.internal.guessOrder.push(client.sessionId);

        const position = this.internal.guessOrder.length - 1;
        const points = getGuessScore(position);

        this.addPoints(state, client.sessionId, points, `Guessed #${position + 1}`);

        const player = players.get(client.sessionId);
        if (player) {
          (player as Record<string, unknown>).hasSubmitted = true;
        }

        const playerName = ((player as Record<string, unknown>)?.name as string) ?? "Unknown";
        this.internal.recentGuesses.push({ playerName, guess, correct: true });
        this.internal.recentGuesses = this.internal.recentGuesses.slice(-20);

        this._broadcastHost(room, state, {
          drawerId: this.internal.currentDrawerSessionId,
          recentGuesses: this.internal.recentGuesses,
        });

        // Check if all non-drawer players guessed
        const nonDrawerCount = this.getActivePlayerCount(state) - 1;
        if (this.internal.guessedPlayers.size >= nonDrawerCount) {
          this.clearTimer();
          this._endDrawingRound(room, state);
        }
      } else {
        // Wrong guess - broadcast it (so other players can see guesses)
        const player = players.get(client.sessionId);
        const playerName = ((player as Record<string, unknown>)?.name as string) ?? "Unknown";
        this.internal.recentGuesses.push({ playerName, guess, correct: false });
        this.internal.recentGuesses = this.internal.recentGuesses.slice(-20);

        this._broadcastHost(room, state, {
          drawerId: this.internal.currentDrawerSessionId,
          recentGuesses: this.internal.recentGuesses,
        });
      }
    } else if (type === "host:skip" || type === "host-skip") {
      if (gamePhase === "picking-drawer" || gamePhase === "drawing" || gamePhase === "guessing") {
        this.clearTimer();
        this._endDrawingRound(room, state);
      } else if (gamePhase === "word-reveal") {
        this.clearTimer();
        this._advanceAfterReveal(room, state);
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

    this.internal.guessedPlayers.clear();
    this.internal.guessOrder = [];
    this.internal.recentGuesses = [];
    this.resetSubmissions(state);

    // Pick next drawer (cycling through order)
    const drawerIdx = (this.internal.round - 1) % this.internal.drawerOrder.length;
    this.internal.currentDrawerSessionId = this.internal.drawerOrder[drawerIdx] ?? "";

    // Pick a word
    this.internal.currentWord = pickRandomWord(this.internal.complexity, this.internal.usedWords);
    this.internal.usedWords.add(this.internal.currentWord);

    this.setPhase(state, "picking-drawer");

    // Mark drawer/guesser roles on the schema (for controller UI)
    const players = s.players as MapSchema;
    players.forEach((player: Record<string, unknown>, key: string) => {
      player.role = key === this.internal.currentDrawerSessionId ? "drawer" : "guesser";
    });

    // Host view: show who is drawing
    this._broadcastHost(room, state, { drawerId: this.internal.currentDrawerSessionId });

    // Send the word ONLY to the drawer
    const drawerClient = room.clients.find(
      (c: { sessionId: string }) => c.sessionId === this.internal.currentDrawerSessionId,
    );
    if (drawerClient) {
      room.send(drawerClient, "private-data", {
        word: this.internal.currentWord,
        isDrawer: true,
      });
    }

    // Tell everyone else they are guessing (clears stale private state on reconnect)
    for (const client of room.clients) {
      if (client.sessionId !== this.internal.currentDrawerSessionId) {
        room.send(client, "private-data", { isDrawer: false, word: undefined });
      }
    }

    // After a brief pause, start the drawing/guessing phase
    room.clock.setTimeout(() => {
      this._startDrawingPhase(room, state);
    }, 2000);
  }

  private _startDrawingPhase(room: Room, state: Schema): void {
    this.setPhase(state, "drawing");
    this.internal.roundStartTime = Date.now();

    // Clear the shared canvas
    room.broadcast("clear-canvas", {});

    this._broadcastHost(room, state, { drawerId: this.internal.currentDrawerSessionId });

    // After a short delay, also switch to guessing phase (they overlap)
    room.clock.setTimeout(() => {
      this.setPhase(state, "guessing");
      this._broadcastHost(room, state, {
        drawerId: this.internal.currentDrawerSessionId,
        recentGuesses: this.internal.recentGuesses,
      });
    }, 1000);

    this.startPhaseTimer(room, "drawing", this.internal.complexity, () => {
      this._endDrawingRound(room, state);
    });
  }

  private _endDrawingRound(room: Room, state: Schema): void {
    this.clearTimer();
    this.setPhase(state, "word-reveal");

    // Award drawer points
    const drawerPoints = getDrawerScore(this.internal.guessedPlayers.size);
    if (drawerPoints > 0) {
      this.addPoints(
        state,
        this.internal.currentDrawerSessionId,
        drawerPoints,
        `${this.internal.guessedPlayers.size} correct guesser${this.internal.guessedPlayers.size !== 1 ? "s" : ""}`,
      );
    }

    this._broadcastHost(room, state, {
      word: this.internal.currentWord,
      correctGuessers: this.internal.guessOrder,
    });

    this.startPhaseTimer(room, "results-display", this.internal.complexity, () => {
      this._advanceAfterReveal(room, state);
    });
  }

  private _advanceAfterReveal(room: Room, state: Schema): void {
    if (this.internal.round >= this.internal.totalRounds) {
      this.setPhase(state, "final-scores");
      this._broadcastHost(room, state, {});
    } else {
      this._startRound(room, state);
    }
  }
}

export function createQuickDrawPlugin(): QuickDrawPlugin {
  return new QuickDrawPlugin();
}
