import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { clearRoomQueue, costTracker } from "@flimflam/ai";
import type { GamePlugin } from "@flimflam/game-engine";
import { GameRegistry } from "@flimflam/game-engine";
import {
  AVATAR_COLORS,
  type Complexity,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  REACTION_COOLDOWN_MS,
  REACTION_EMOJIS,
  RECONNECTION_TIMEOUT_MS,
  ROOM_IDLE_TIMEOUT_MS,
} from "@flimflam/shared";
import type { Client, Delayed } from "colyseus";
import { GamePlayerSchema, RoomState } from "./LobbyState";
import { generateRoomCode } from "./room-code";

const require = createRequire(import.meta.url);
const { Room } = require("colyseus") as typeof import("colyseus");

export class PartyRoom extends Room<RoomState> {
  // +1 to allow a non-playing host client in addition to MAX_PLAYERS players.
  maxClients = MAX_PLAYERS + 1;

  private _currentPlugin: GamePlugin | null = null;
  private _roomCode = "";
  private _idleTimeout: Delayed | null = null;
  private _hostToken: string | null = null;

  // Maps the current Colyseus sessionId to the canonical player entry key in
  // state.players. We need this because on a name-based reconnect we re-use
  // the *old* key (and the player's stored name/color/score) while the client
  // arrives with a *new* sessionId.
  private _sessionToPlayerKey = new Map<string, string>();
  private _lastReactionAt = new Map<string, number>();

  private _getOrCreateHostToken(): string {
    if (!this._hostToken) {
      // 256-bit token, kept server-side only (never in shared room state).
      this._hostToken = randomBytes(32).toString("hex");
    }
    return this._hostToken;
  }

  async onAuth(
    _client: Client,
    options: { isHost?: boolean; hostToken?: unknown },
  ): Promise<boolean> {
    if (!options?.isHost) return true;

    const providedToken = typeof options.hostToken === "string" ? options.hostToken : null;
    if (this._hostToken && providedToken !== this._hostToken) {
      // Reject host takeover attempts at the handshake level (before onJoin).
      throw new Error("Host already assigned for this room");
    }

    return true;
  }

  onCreate(_options: Record<string, unknown>): void {
    const state = new RoomState();
    this._roomCode = generateRoomCode();
    state.roomCode = this._roomCode;
    state.phase = "lobby";
    this.setState(state);

    this.setMetadata({
      code: this._roomCode,
      gameName: "lobby",
      complexity: "standard",
      playerCount: 0,
      hotTakePlayerInputEnabled: false,
    });

    this._resetIdleTimeout();

    // ─── Message Handlers ───────────────────────────────────────

    const requireHost = (client: Client): boolean => {
      if (client.sessionId !== this.state.hostSessionId) {
        this.send(client, "error", { message: "Only the host can do that" });
        return false;
      }
      return true;
    };

    const syncHotTakePlayerInputMode = (): void => {
      if (this.state.selectedGameId !== "hot-take") {
        this.state.hotTakePlayerInputEnabled = false;
        return;
      }
      if (this.state.complexity === "advanced") {
        this.state.hotTakePlayerInputEnabled = true;
        return;
      }
      if (this.state.complexity === "kids") {
        this.state.hotTakePlayerInputEnabled = false;
      }
    };

    const handleSelectGame = (client: Client, data: { gameId?: string }) => {
      if (!requireHost(client)) return;
      if (this.state.lobbyPhase !== "waiting" && this.state.lobbyPhase !== "between-games") {
        this.send(client, "error", { message: "Cannot change game during play" });
        return;
      }

      const gameId = (data.gameId ?? "").trim();
      if (!gameId) {
        this.send(client, "error", { message: "No game selected" });
        return;
      }

      const plugin = GameRegistry.getGame(gameId);
      if (!plugin) {
        this.send(client, "error", { message: `Unknown game: ${gameId}` });
        return;
      }

      this.state.selectedGameId = gameId;
      syncHotTakePlayerInputMode();
      this.setMetadata({
        code: this._roomCode,
        gameName: gameId,
        complexity: this.state.complexity as Complexity,
        playerCount: this.state.players.size,
        hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
      });
    };

    const handleSetComplexity = (client: Client, data: { complexity?: unknown }) => {
      if (!requireHost(client)) return;
      const valid: Complexity[] = ["kids", "standard", "advanced"];
      const complexity = data.complexity;
      if (typeof complexity !== "string" || !valid.includes(complexity as Complexity)) {
        this.send(client, "error", { message: "Invalid complexity" });
        return;
      }

      this.state.complexity = complexity;
      syncHotTakePlayerInputMode();
      this.setMetadata({
        code: this._roomCode,
        gameName: this.state.selectedGameId || "lobby",
        complexity: complexity as Complexity,
        playerCount: this.state.players.size,
        hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
      });
    };

    const handleSetPlayerInput = (client: Client, data: { enabled?: unknown }) => {
      if (!requireHost(client)) return;
      if (this.state.selectedGameId !== "hot-take") {
        this.send(client, "error", { message: "Player Input is only available for Hot Take" });
        return;
      }

      if (this.state.complexity === "advanced") {
        this.state.hotTakePlayerInputEnabled = true;
      } else if (this.state.complexity === "kids") {
        this.state.hotTakePlayerInputEnabled = false;
      } else if (typeof data.enabled === "boolean") {
        this.state.hotTakePlayerInputEnabled = data.enabled;
      } else {
        this.send(client, "error", { message: "Invalid player input toggle value" });
        return;
      }

      this.setMetadata({
        code: this._roomCode,
        gameName: this.state.selectedGameId || "lobby",
        complexity: this.state.complexity as Complexity,
        playerCount: this.state.players.size,
        hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
      });
    };

    const handleStartGame = (client: Client, data: { gameId?: string }) => {
      if (!requireHost(client)) return;
      if (this.state.lobbyPhase === "in-game") {
        this.send(client, "error", { message: "Game already in progress" });
        return;
      }

      if (typeof data?.gameId === "string" && data.gameId.trim()) {
        // Allow passing gameId at start-time (host UI convenience).
        this.state.selectedGameId = data.gameId.trim();
      }
      syncHotTakePlayerInputMode();

      if (!this.state.selectedGameId) {
        this.send(client, "error", { message: "No game selected" });
        return;
      }

      if (!GameRegistry.getGame(this.state.selectedGameId)) {
        this.send(client, "error", { message: `Unknown game: ${this.state.selectedGameId}` });
        return;
      }
      if (this.state.players.size < MIN_PLAYERS) {
        this.send(client, "error", { message: `Need at least ${MIN_PLAYERS} players` });
        return;
      }

      this._startGame();
    };

    const handleHostSkip = (client: Client) => {
      if (!requireHost(client)) return;
      if (this._currentPlugin) {
        this._currentPlugin.onPlayerMessage(this, this.state, client, "host:skip", {});
      }
    };

    const handleHostEnd = (client: Client) => {
      if (!requireHost(client)) return;
      this.transitionToLobby();
    };

    const handleRestartGame = (client: Client) => {
      if (!requireHost(client)) return;
      if (this.state.lobbyPhase !== "in-game") {
        this.send(client, "error", { message: "Can only restart during a game" });
        return;
      }
      if (this.state.gamePhase !== "final-scores") {
        this.send(client, "error", { message: "Can only restart from final scores" });
        return;
      }
      // Keep selectedGameId and complexity, re-start the game
      this._startGame();
    };

    const reactionEmojiSet = new Set<string>(REACTION_EMOJIS);
    const handlePlayerReaction = (client: Client, data: { emoji?: unknown }) => {
      const emoji = typeof data?.emoji === "string" ? data.emoji : "";
      if (!reactionEmojiSet.has(emoji)) return;

      const now = Date.now();
      const lastAt = this._lastReactionAt.get(client.sessionId) ?? 0;
      if (now - lastAt < REACTION_COOLDOWN_MS) return;
      this._lastReactionAt.set(client.sessionId, now);

      const playerKey = this._sessionToPlayerKey.get(client.sessionId) ?? client.sessionId;
      const player = this.state.players.get(playerKey);
      const playerName = player?.name ?? "Unknown";

      this.broadcast("reaction", {
        sessionId: client.sessionId,
        playerName,
        emoji,
      });
    };

    const handlePlayerReady = (client: Client) => {
      const playerKey = this._sessionToPlayerKey.get(client.sessionId) ?? client.sessionId;
      const player = this.state.players.get(playerKey);
      if (player) {
        player.ready = true;
      }

      // Allow the active game plugin to react to readiness (e.g., skip role reveal when all ready).
      if (this._currentPlugin && this.state.lobbyPhase === "in-game") {
        try {
          Promise.resolve(
            this._currentPlugin.onPlayerMessage(this, this.state, client, "player:ready", {}),
          ).catch((error) => {
            console.error("Error handling player:ready:", error);
          });
        } catch (error) {
          console.error("Error handling player:ready:", error);
        }
      }
    };

    // Host messages (preferred)
    this.onMessage("host:select-game", handleSelectGame);
    this.onMessage("host:set-complexity", handleSetComplexity);
    this.onMessage("host:set-player-input", handleSetPlayerInput);
    this.onMessage("host:start-game", handleStartGame);
    this.onMessage("host:skip", (client) => handleHostSkip(client));
    this.onMessage("host:end-game", (client) => handleHostEnd(client));
    this.onMessage("host:restart-game", (client) => handleRestartGame(client));

    // Player messages (preferred)
    this.onMessage("player:ready", (client) => handlePlayerReady(client));
    this.onMessage("player:reaction", (client, data) => handlePlayerReaction(client, data));

    // Backward-compatible aliases (older clients/spec drafts)
    this.onMessage("select-game", handleSelectGame);
    this.onMessage("set-complexity", handleSetComplexity);
    this.onMessage("set-player-input", handleSetPlayerInput);
    this.onMessage("start-game", handleStartGame);
    this.onMessage("host-skip", (client) => handleHostSkip(client));
    this.onMessage("host-end-game", (client) => handleHostEnd(client));
    this.onMessage("player-ready", (client) => handlePlayerReady(client));

    // Wildcard handler: delegate all other messages to the current game plugin
    this.onMessage("*", (client, type, data) => {
      const internalTypes = new Set<string>([
        "host:select-game",
        "host:set-complexity",
        "host:set-player-input",
        "host:start-game",
        "host:skip",
        "host:end-game",
        "host:restart-game",
        "player:ready",
        "player:reaction",
        // legacy aliases
        "select-game",
        "set-complexity",
        "set-player-input",
        "start-game",
        "host-skip",
        "host-end-game",
        "player-ready",
      ]);

      if (typeof type === "string" && internalTypes.has(type)) {
        return;
      }

      if (this._currentPlugin && this.state.lobbyPhase === "in-game") {
        this._currentPlugin.onPlayerMessage(this, this.state, client, type as string, data);
      }
    });
  }

  onJoin(
    client: Client,
    options: { name?: string; isHost?: boolean; hostToken?: unknown; color?: string },
  ): void {
    this._resetIdleTimeout();

    if (options.isHost) {
      const providedToken = typeof options.hostToken === "string" ? options.hostToken : null;

      // If a host was ever established for this room, require the server-issued token
      // for any future host joins. This prevents any client from claiming host by
      // sending `{ isHost: true }`.
      if (this._hostToken && providedToken !== this._hostToken) {
        this.send(client, "error", { message: "Host already assigned for this room" });
        client.leave(1000);
        return;
      }

      // Host connects as a non-playing client. Players join from their own devices.
      this.state.hostSessionId = client.sessionId;
      this.send(client, "host-token", { token: this._getOrCreateHostToken() });
      this.setMetadata({
        code: this._roomCode,
        gameName: this.state.selectedGameId || "lobby",
        complexity: this.state.complexity as Complexity,
        playerCount: this.state.players.size,
        hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
      });
      return;
    }

    if (this.state.players.size >= MAX_PLAYERS) {
      this.send(client, "error", { message: "Room is full" });
      client.leave(1000);
      return;
    }

    const name = (options.name ?? "Player").slice(0, MAX_NAME_LENGTH).trim() || "Player";

    // ── Name-based reconnect ──────────────────────────────────────────────────
    // When a player's WebSocket drops and they rejoin (e.g. page refresh, brief
    // network blip), they arrive with a new Colyseus sessionId but the same
    // display name. Colyseus's token-based reconnect only works when the
    // *client* explicitly calls client.reconnect(token). If the player instead
    // navigates back to the join page and re-enters their name, we detect them
    // here by matching the name against disconnected players and restore their
    // slot. This eliminates the "Bob2" duplicate bug.
    let ghostKey: string | null = null;
    let ghostPlayer: GamePlayerSchema | null = null;
    this.state.players.forEach((p, key) => {
      if (!p.connected && p.name === name && ghostKey === null) {
        ghostKey = key;
        ghostPlayer = p;
      }
    });

    if (ghostKey !== null && ghostPlayer !== null) {
      // Re-use the existing player entry. Move it to the new sessionId key so
      // all downstream code (including plugins) can look it up by sessionId.
      const restoredPlayer = ghostPlayer as GamePlayerSchema;

      // Remove the old key and re-insert under the new sessionId.
      this.state.players.delete(ghostKey);
      restoredPlayer.sessionId = client.sessionId;
      restoredPlayer.connected = true;
      this.state.players.set(client.sessionId, restoredPlayer);

      // Update the session→key mapping for message routing.
      this._sessionToPlayerKey.delete(ghostKey);
      this._sessionToPlayerKey.set(client.sessionId, client.sessionId);

      this.setMetadata({
        code: this._roomCode,
        gameName: this.state.selectedGameId || "lobby",
        complexity: this.state.complexity as Complexity,
        playerCount: this.state.players.size,
        hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
      });

      // Re-send current private data so the player can resume gameplay.
      if (this._currentPlugin && this.state.lobbyPhase === "in-game") {
        try {
          this._currentPlugin.onPlayerReconnect?.(this, this.state, client);
        } catch (error) {
          console.error("[FlimFlam] Error in onPlayerReconnect:", error);
        }
      }
      return;
    }
    // ── End name-based reconnect ──────────────────────────────────────────────

    // Check for duplicate names among still-connected (or in-reconnection) players.
    // We only suffix-disambiguate if the name collision is with a player who is
    // genuinely online — disconnected players were handled above.
    let finalName = name;
    let suffix = 2;
    const existingNames = new Set<string>();
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((p) => {
      if (p.connected) {
        existingNames.add(p.name);
      }
    });
    while (existingNames.has(finalName)) {
      finalName = `${name}${suffix}`;
      suffix++;
    }

    const player = new GamePlayerSchema();
    player.sessionId = client.sessionId;
    player.name = finalName;

    // Use player-selected color when provided, else assign based on join order.
    if (typeof options.color === "string" && /^#?[0-9a-fA-F]{6}$/.test(options.color.trim())) {
      player.avatarColor = options.color.trim().startsWith("#")
        ? options.color.trim()
        : `#${options.color.trim()}`;
    } else {
      const colorIndex = this.state.players.size % AVATAR_COLORS.length;
      player.avatarColor = AVATAR_COLORS[colorIndex] ?? "#FF3366";
    }

    player.connected = true;
    this.state.players.set(client.sessionId, player);
    this._sessionToPlayerKey.set(client.sessionId, client.sessionId);

    // Update metadata
    this.setMetadata({
      code: this._roomCode,
      gameName: this.state.selectedGameId || "lobby",
      complexity: this.state.complexity as Complexity,
      playerCount: this.state.players.size,
      hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
    });
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const isHostClient = client.sessionId === this.state.hostSessionId;

    // Resolve the canonical player key (same as sessionId unless a name-based
    // reconnect re-keyed the entry).
    const playerKey = this._sessionToPlayerKey.get(client.sessionId) ?? client.sessionId;
    const player = this.state.players.get(playerKey);

    if (player) {
      player.connected = false;
    }

    // Delegate to plugin
    if (this._currentPlugin && this.state.lobbyPhase === "in-game") {
      this._currentPlugin.onPlayerLeave?.(this, this.state, client.sessionId, consented);
    }

    try {
      if (!consented) {
        // Wait for reconnection (token-based). The reconnection window is also
        // used as a grace period for the name-based reconnect path: if the
        // player re-enters their name within RECONNECTION_TIMEOUT_MS seconds,
        // onJoin will find the ghost entry and restore it before this timeout
        // fires and permanently removes the player.
        await this.allowReconnection(client, RECONNECTION_TIMEOUT_MS / 1000);
        // Player reconnected via token — mark them connected again.
        if (player) {
          player.connected = true;
        }
        return;
      }
    } catch {
      // Reconnection timed out or was rejected. Fall through to removal.
    }

    // Clean up session mapping.
    this._sessionToPlayerKey.delete(client.sessionId);

    if (isHostClient) {
      this.state.hostSessionId = "";
      if (this.state.lobbyPhase === "in-game") {
        this.broadcast("error", { message: "Host disconnected. Returning to lobby." });
        this.transitionToLobby();
      }

      this.setMetadata({
        code: this._roomCode,
        gameName: this.state.selectedGameId || "lobby",
        complexity: this.state.complexity as Complexity,
        playerCount: this.state.players.size,
        hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
      });
      return;
    }

    // Fully remove if consent or reconnection failed.
    // This keeps player counts and host assignment accurate.
    const wasHost = player?.isHost ?? false;
    this.state.players.delete(playerKey);

    if (wasHost) {
      this._transferHost(playerKey);
    }

    if (this.state.lobbyPhase !== "in-game") {
      this.unlock();
    }

    this._resetIdleTimeout();

    // Update metadata
    this.setMetadata({
      code: this._roomCode,
      gameName: this.state.selectedGameId || "lobby",
      complexity: this.state.complexity as Complexity,
      playerCount: this.state.players.size,
      hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
    });
  }

  onDispose(): void {
    this._clearIdleTimeout();
    clearRoomQueue(this.roomId);
    costTracker.clearRoom(this.roomId);
  }

  // ─── Transitions ──────────────────────────────────────────────────

  transitionToBetweenGames(): void {
    this.state.lobbyPhase = "between-games";
    this.state.gamePhase = "";
    this.state.phase = "between-games";
    this._currentPlugin = null;

    // Reset player states for next game
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((player) => {
      player.ready = false;
      player.hasSubmitted = false;
      player.score = 0;
      player.role = "";
      player.publicInfo = "";
      player.progressOrCustomInt = 0;
      player.abilityOrCustomBool = false;
      player.currentInput = "";
    });

    this.state.round = 0;
    this.state.totalRounds = 0;
    this.state.timerEndsAt = 0;

    // Unlock so a host can (re)join even if the player list is full.
    this.unlock();
  }

  transitionToLobby(): void {
    this.state.lobbyPhase = "waiting";
    this.state.gamePhase = "";
    this.state.phase = "lobby";
    this.state.selectedGameId = "";
    this.state.hotTakePlayerInputEnabled = false;
    this._currentPlugin = null;

    // Reset player states
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((player) => {
      player.ready = false;
      player.hasSubmitted = false;
      player.score = 0;
      player.role = "";
      player.publicInfo = "";
      player.progressOrCustomInt = 0;
      player.abilityOrCustomBool = false;
      player.currentInput = "";
    });

    this.state.round = 0;
    this.state.totalRounds = 0;
    this.state.timerEndsAt = 0;

    // Unlock so a host can (re)join even if the player list is full.
    this.unlock();
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private async _startGame(): Promise<void> {
    const plugin = GameRegistry.getGame(this.state.selectedGameId);
    if (!plugin) return;

    this._currentPlugin = plugin;
    this.state.lobbyPhase = "in-game";

    // Reset all player game state
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((player) => {
      player.ready = false;
      player.hasSubmitted = false;
      player.score = 0;
      player.role = "";
      player.publicInfo = "";
      player.progressOrCustomInt = 0;
      player.abilityOrCustomBool = false;
      player.currentInput = "";
    });

    // Lock the room during game
    this.lock();

    this.setMetadata({
      code: this._roomCode,
      gameName: this.state.selectedGameId,
      complexity: this.state.complexity as Complexity,
      playerCount: this.state.players.size,
      hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
    });

    try {
      await plugin.onGameStart(
        this,
        this.state,
        this.state.players,
        this.state.complexity as Complexity,
      );
    } catch (error) {
      console.error("Error starting game:", error);
      this.broadcast("error", { message: "Failed to start game. Returning to lobby." });
      this.transitionToLobby();
    }
  }

  private _transferHost(leavingSessionId: string): void {
    this.state.hostSessionId = "";
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((p) => {
      p.isHost = false;
    });

    let newHostFound = false;
    this.state.players.forEach((player, key) => {
      if (!newHostFound && key !== leavingSessionId && player.connected) {
        player.isHost = true;
        this.state.hostSessionId = key;
        newHostFound = true;
      }
    });
  }

  private _resetIdleTimeout(): void {
    this._clearIdleTimeout();
    this._idleTimeout = this.clock.setTimeout(() => {
      // Check if room is empty
      let hasConnected = false;
      // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
      this.state.players.forEach((player) => {
        if (player.connected) hasConnected = true;
      });
      if (!hasConnected) {
        this.disconnect();
      }
    }, ROOM_IDLE_TIMEOUT_MS);
  }

  private _clearIdleTimeout(): void {
    if (this._idleTimeout) {
      this._idleTimeout.clear();
      this._idleTimeout = null;
    }
  }
}
