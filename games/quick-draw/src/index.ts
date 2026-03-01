import type { MapSchema, Schema } from "@colyseus/schema";
import { BaseGamePlugin, ScoringEngine, getRoundCount } from "@flimflam/game-engine";
import { type Complexity, GAME_MANIFESTS } from "@flimflam/shared";
import type { Client, Delayed, Room } from "colyseus";
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
  private _roundToken = 0;
  private _delayed: Delayed[] = [];
  private _lastGuessAt = new Map<string, number>();

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
    this._roundToken = 0;
    this._clearDelayed();

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

  onPlayerLeave(room: Room, state: Schema, sessionId: string, consented: boolean): void {
    const s = state as unknown as Record<string, unknown>;
    const gamePhase = s.gamePhase as string;

    const wasDrawer = sessionId === this.internal.currentDrawerSessionId;

    // Preserve base behavior (mark disconnected, end if below min players).
    super.onPlayerLeave(room, state, sessionId, consented);

    if (!this._isStillActive(state)) {
      this._clearDelayed();
      return;
    }

    if (((state as unknown as Record<string, unknown>).gamePhase as string) === "final-scores") {
      this._clearDelayed();
      return;
    }

    if (wasDrawer) {
      // If the drawer drops, the round can't continue. Move on quickly.
      if (gamePhase === "picking-drawer") {
        this._clearDelayed();
        this._repickDrawerAndWord(room, state);
        return;
      }

      if (gamePhase === "drawing" || gamePhase === "guessing") {
        this._clearDelayed();
        this.clearTimer();
        this._endDrawingRound(room, state);
        return;
      }
    }

    // If a guesser leaves and everyone remaining has already guessed, end the round early.
    if (gamePhase === "drawing" || gamePhase === "guessing") {
      const nonDrawerCount = Math.max(0, this.getActivePlayerCount(state) - 1);
      if (this.internal.guessedPlayers.size >= nonDrawerCount) {
        this._clearDelayed();
        this.clearTimer();
        this._endDrawingRound(room, state);
      }
    }
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

    if (type === "player:draw-stroke" && (gamePhase === "drawing" || gamePhase === "guessing")) {
      // Only the drawer can draw
      if (client.sessionId !== this.internal.currentDrawerSessionId) {
        return;
      }
      const stroke = data as {
        points?: { x: unknown; y: unknown }[];
        color?: unknown;
        size?: unknown;
      };
      if (!stroke?.points || !Array.isArray(stroke.points)) return;

      const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
      const points = stroke.points
        .slice(0, 512)
        .map((p) => ({
          x: clamp01(typeof p?.x === "number" ? p.x : Number(p?.x)),
          y: clamp01(typeof p?.y === "number" ? p.y : Number(p?.y)),
        }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      if (points.length === 0) return;

      const sizeRaw = typeof stroke.size === "number" ? stroke.size : Number(stroke.size);
      const size = Number.isFinite(sizeRaw) ? Math.max(1, Math.min(40, sizeRaw)) : 3;

      const color =
        typeof stroke.color === "string" && stroke.color.trim().length > 0
          ? stroke.color.trim()
          : "#000000";

      // Broadcast stroke to all OTHER clients (not via schema, via broadcast)
      room.broadcast(
        "draw-stroke",
        {
          sessionId: client.sessionId,
          points,
          color,
          size,
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
      const guess = (msg.content as string).trim().slice(0, 80);
      if (guess.length === 0) return;

      // Soft rate-limit to keep the guess feed readable.
      const now = Date.now();
      const lastGuessAt = this._lastGuessAt.get(client.sessionId) ?? 0;
      if (now - lastGuessAt < 250) return;
      this._lastGuessAt.set(client.sessionId, now);

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

        room.send(client, "private-data", { qdCorrect: true });

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
    } else if (
      type === "player:draw-undo" &&
      (gamePhase === "drawing" || gamePhase === "guessing")
    ) {
      if (client.sessionId !== this.internal.currentDrawerSessionId) return;
      room.broadcast("draw-undo", {}, { except: client });
    } else if (
      type === "player:draw-clear" &&
      (gamePhase === "drawing" || gamePhase === "guessing")
    ) {
      if (client.sessionId !== this.internal.currentDrawerSessionId) return;
      room.broadcast("draw-clear", {}, { except: client });
    } else if (type === "host:skip" || type === "host-skip") {
      if (gamePhase === "picking-drawer" || gamePhase === "drawing" || gamePhase === "guessing") {
        this._clearDelayed();
        this.clearTimer();
        this._endDrawingRound(room, state);
      } else if (gamePhase === "word-reveal") {
        this._clearDelayed();
        this.clearTimer();
        this._advanceAfterReveal(room, state);
      }
    }
  }

  onPlayerReconnect(room: Room, state: Schema, client: Client): void {
    const s = state as unknown as Record<string, unknown>;
    const phase = s.gamePhase as string;

    if (phase === "picking-drawer" || phase === "drawing" || phase === "guessing") {
      const isDrawer = client.sessionId === this.internal?.currentDrawerSessionId;
      if (isDrawer) {
        room.send(client, "private-data", {
          word: this.internal.currentWord,
          isDrawer: true,
          qdCorrect: false,
        });
      } else {
        const alreadyGuessed = this.internal?.guessedPlayers.has(client.sessionId) ?? false;
        room.send(client, "private-data", {
          isDrawer: false,
          word: undefined,
          qdCorrect: alreadyGuessed,
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

  private _isStillActive(state: Schema): boolean {
    const s = state as unknown as Record<string, unknown>;
    return (
      (s.lobbyPhase as string) === "in-game" && (s.selectedGameId as string) === this.manifest.id
    );
  }

  private _schedule(room: Room, cb: () => void, delayMs: number): void {
    const handle = room.clock.setTimeout(cb, delayMs);
    this._delayed.push(handle);
  }

  private _clearDelayed(): void {
    for (const t of this._delayed) {
      t.clear();
    }
    this._delayed = [];
  }

  private _pruneDrawerOrder(state: Schema): void {
    const s = state as unknown as Record<string, unknown>;
    const players = s.players as MapSchema;

    // Remove players that have fully left the room.
    this.internal.drawerOrder = this.internal.drawerOrder.filter((id) => Boolean(players.get(id)));

    if (this.internal.drawerOrder.length === 0) {
      const keys: string[] = [];
      players.forEach((_: unknown, key: string) => keys.push(key));
      this.internal.drawerOrder = keys;
      this.internal.drawerIndex = 0;
    }

    if (this.internal.drawerIndex >= this.internal.drawerOrder.length) {
      this.internal.drawerIndex = 0;
    }
  }

  private _pickNextConnectedDrawer(state: Schema): string {
    const s = state as unknown as Record<string, unknown>;
    const players = s.players as MapSchema;

    if (this.internal.drawerOrder.length === 0) return "";

    const total = this.internal.drawerOrder.length;
    for (let attempts = 0; attempts < total; attempts++) {
      const idx = this.internal.drawerIndex % total;
      const candidate = this.internal.drawerOrder[idx] ?? "";
      this.internal.drawerIndex = (idx + 1) % total;

      const player = players.get(candidate) as Record<string, unknown> | undefined;
      if (player?.connected) {
        return candidate;
      }
    }

    return "";
  }

  private _repickDrawerAndWord(room: Room, state: Schema): void {
    const s = state as unknown as Record<string, unknown>;
    this._pruneDrawerOrder(state);

    const drawerSessionId = this._pickNextConnectedDrawer(state);
    if (!drawerSessionId) {
      this.setPhase(state, "final-scores");
      this._broadcastHost(room, state, {});
      return;
    }

    // New drawer, new word (keeps things fair if the previous drawer left mid-pick).
    this.internal.currentDrawerSessionId = drawerSessionId;
    this.internal.currentWord = pickRandomWord(this.internal.complexity, this.internal.usedWords);
    this.internal.usedWords.add(this.internal.currentWord);

    // Reset guesses for the re-pick.
    this.internal.guessedPlayers.clear();
    this.internal.guessOrder = [];
    this.internal.recentGuesses = [];
    this.resetSubmissions(state);
    this._lastGuessAt.clear();

    this.setPhase(state, "picking-drawer");

    const players = s.players as MapSchema;
    players.forEach((player: Record<string, unknown>, key: string) => {
      player.role = key === this.internal.currentDrawerSessionId ? "drawer" : "guesser";
    });

    this._broadcastHost(room, state, { drawerId: this.internal.currentDrawerSessionId });

    const drawerClient = room.clients.find(
      (c: { sessionId: string }) => c.sessionId === this.internal.currentDrawerSessionId,
    );
    if (drawerClient) {
      room.send(drawerClient, "private-data", {
        word: this.internal.currentWord,
        isDrawer: true,
        qdCorrect: false,
      });
    }

    const hostIdRepick = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostIdRepick) continue;
      if (client.sessionId !== this.internal.currentDrawerSessionId) {
        room.send(client, "private-data", { isDrawer: false, word: undefined, qdCorrect: false });
      }
    }

    const token = this._roundToken;
    this._schedule(
      room,
      () => {
        if (token !== this._roundToken) return;
        if (!this._isStillActive(state)) return;
        const phase = (state as unknown as Record<string, unknown>).gamePhase as string;
        if (phase !== "picking-drawer") return;
        this._startDrawingPhase(room, state);
      },
      1500,
    );
  }

  private _startRound(room: Room, state: Schema): void {
    this._clearDelayed();
    this._lastGuessAt.clear();

    const token = ++this._roundToken;
    const s = state as unknown as Record<string, unknown>;
    this.internal.round++;
    s.round = this.internal.round;

    this.internal.guessedPlayers.clear();
    this.internal.guessOrder = [];
    this.internal.recentGuesses = [];
    this.resetSubmissions(state);
    this._pruneDrawerOrder(state);

    // Pick next connected drawer (cycling through order)
    this.internal.currentDrawerSessionId = this._pickNextConnectedDrawer(state);
    if (!this.internal.currentDrawerSessionId) {
      this.setPhase(state, "final-scores");
      this._broadcastHost(room, state, {});
      return;
    }

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
        qdCorrect: false,
      });
    }

    // Tell everyone else they are guessing (clears stale private state on reconnect)
    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostId) continue;
      if (client.sessionId !== this.internal.currentDrawerSessionId) {
        room.send(client, "private-data", { isDrawer: false, word: undefined, qdCorrect: false });
      }
    }

    // After a brief pause, start the drawing/guessing phase
    this._schedule(
      room,
      () => {
        if (token !== this._roundToken) return;
        if (!this._isStillActive(state)) return;
        const phase = (state as unknown as Record<string, unknown>).gamePhase as string;
        if (phase !== "picking-drawer") return;
        this._startDrawingPhase(room, state);
      },
      2000,
    );
  }

  private _startDrawingPhase(room: Room, state: Schema): void {
    this._clearDelayed();
    const token = this._roundToken;
    this.setPhase(state, "drawing");
    this.internal.roundStartTime = Date.now();

    // Clear the shared canvas
    room.broadcast("clear-canvas", {});

    this._broadcastHost(room, state, { drawerId: this.internal.currentDrawerSessionId });

    // After a short delay, also switch to guessing phase (they overlap)
    this._schedule(
      room,
      () => {
        if (token !== this._roundToken) return;
        if (!this._isStillActive(state)) return;
        const phase = (state as unknown as Record<string, unknown>).gamePhase as string;
        if (phase !== "drawing") return;

        this.setPhase(state, "guessing");
        this._broadcastHost(room, state, {
          drawerId: this.internal.currentDrawerSessionId,
          recentGuesses: this.internal.recentGuesses,
        });

        const nonDrawerCount = Math.max(0, this.getActivePlayerCount(state) - 1);
        if (nonDrawerCount === 0) {
          this.clearTimer();
          this._endDrawingRound(room, state);
        }
      },
      1000,
    );

    this.startPhaseTimer(room, "drawing", this.internal.complexity, () => {
      if (token !== this._roundToken) return;
      if (!this._isStillActive(state)) return;
      this._endDrawingRound(room, state);
    });
  }

  private _endDrawingRound(room: Room, state: Schema): void {
    this._clearDelayed();
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

    const token = this._roundToken;
    this.startPhaseTimer(room, "results-display", this.internal.complexity, () => {
      if (token !== this._roundToken) return;
      if (!this._isStillActive(state)) return;
      this._advanceAfterReveal(room, state);
    });
  }

  private _advanceAfterReveal(room: Room, state: Schema): void {
    this._clearDelayed();
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
