import { createRequire } from "node:module";
// AI module removed — no AI games in this build
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
import { getRoomIdByCode, registerRoomCode, unregisterRoomCode } from "./room-registry";

const require = createRequire(import.meta.url);
const { Room } = require("colyseus") as typeof import("colyseus");

export class PartyRoom extends Room<RoomState> {
  maxClients = MAX_PLAYERS;

  private _currentPlugin: GamePlugin | null = null;
  private _roomCode = "";
  private _idleTimeout: Delayed | null = null;

  private _lastReactionAt = new Map<string, number>();
  private _clientMsgRate = new Map<string, { count: number; resetAt: number }>();

  async onCreate(_options: Record<string, unknown>): Promise<void> {
    const state = new RoomState();

    // Keep codes short for living-room play, but ensure uniqueness inside this
    // process lifetime to avoid accidental collisions.
    let code = generateRoomCode();
    while (getRoomIdByCode(code)) {
      code = generateRoomCode();
    }

    this._roomCode = code;
    registerRoomCode(this._roomCode, this.roomId);

    state.roomCode = this._roomCode;
    state.phase = "lobby";
    this.setState(state);

    await this.setMetadata({
      code: this._roomCode,
      gameName: "lobby",
      complexity: "standard",
      playerCount: 0,
      hotTakePlayerInputEnabled: false,
    });

    // Hide rooms from public matchmaking listings (clients join via room code).
    await this.setPrivate(true);

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
      const removed = this._removeDisconnectedPlayers();
      if (removed > 0) {
        this.setMetadata({
          code: this._roomCode,
          gameName: this.state.selectedGameId || "lobby",
          complexity: this.state.complexity as Complexity,
          playerCount: this.state.players.size,
          hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
        });
      }

      if (this._getConnectedPlayerCount() < MIN_PLAYERS) {
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
      const removed = this._removeDisconnectedPlayers();
      if (removed > 0) {
        this.setMetadata({
          code: this._roomCode,
          gameName: this.state.selectedGameId || "lobby",
          complexity: this.state.complexity as Complexity,
          playerCount: this.state.players.size,
          hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
        });
      }
      if (this._getConnectedPlayerCount() < MIN_PLAYERS) {
        this.send(client, "error", { message: `Need at least ${MIN_PLAYERS} players` });
        return;
      }
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

      const player = this.state.players.get(client.sessionId);
      const playerName = player?.name ?? "Unknown";

      this.broadcast("reaction", {
        sessionId: client.sessionId,
        playerName,
        emoji,
      });
    };

    const handleHostTransfer = (client: Client, data: { targetSessionId?: string }) => {
      if (!requireHost(client)) return;
      const targetId = data?.targetSessionId;
      if (typeof targetId !== "string" || !targetId) {
        this.send(client, "error", { message: "Invalid target session ID" });
        return;
      }
      const targetPlayer = this.state.players.get(targetId);
      if (!targetPlayer || !targetPlayer.connected) {
        this.send(client, "error", { message: "Target player not found or disconnected" });
        return;
      }

      // Remove host from current player
      const currentHost = this.state.players.get(client.sessionId);
      if (currentHost) {
        currentHost.isHost = false;
      }

      // Assign host to target
      targetPlayer.isHost = true;
      this.state.hostSessionId = targetId;
    };

    const handlePlayerReady = (client: Client) => {
      const player = this.state.players.get(client.sessionId);
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
    this.onMessage("host:transfer", (client, data) => handleHostTransfer(client, data));

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
      // Per-client rate limiting: 30 messages per 1-second window
      const now = Date.now();
      const rate = this._clientMsgRate.get(client.sessionId);
      if (!rate || rate.resetAt <= now) {
        this._clientMsgRate.set(client.sessionId, { count: 1, resetAt: now + 1000 });
      } else {
        rate.count++;
        if (rate.count > 30) return;
      }

      const internalTypes = new Set<string>([
        "host:transfer",
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

      // Basic input validation before delegating to game plugins
      if (typeof type !== "string" || type.length > 64) {
        return; // Reject non-string or absurdly long message types
      }

      // Ensure data is a plain object (not null, array, or primitive)
      if (
        data !== null &&
        data !== undefined &&
        (typeof data !== "object" || Array.isArray(data))
      ) {
        return;
      }

      // Sanitize string fields — truncate to prevent abuse
      if (data && typeof data === "object") {
        for (const key of Object.keys(data as Record<string, unknown>)) {
          const val = (data as Record<string, unknown>)[key];
          if (typeof val === "string" && val.length > 1000) {
            (data as Record<string, unknown>)[key] = val.slice(0, 1000);
          }
        }
      }

      if (this._currentPlugin && this.state.lobbyPhase === "in-game") {
        this._currentPlugin.onPlayerMessage(this, this.state, client, type, data);
      }
    });
  }

  onJoin(
    client: Client,
    options: { name?: string; color?: string },
  ): void {
    this._resetIdleTimeout();

    // Send server clock for client-side timer sync.
    this.send(client, "server-time", { serverTime: Date.now() });

    if (this.state.players.size >= MAX_PLAYERS) {
      this.send(client, "error", { message: "Room is full" });
      client.leave(1000);
      return;
    }

    const name = (options.name ?? "Player").slice(0, MAX_NAME_LENGTH).trim() || "Player";

    // Note: We intentionally do NOT support name-based reconnect, because it can
    // be abused to impersonate disconnected players. We rely on Colyseus's
    // reconnection tokens instead (client.reconnect()).

    // Check for duplicate names among current players.
    //
    // Include disconnected players so names remain reserved during the
    // reconnection window (prevents impersonation if someone drops).
    let finalName = name;
    let suffix = 2;
    const existingNames = new Set<string>();
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((p) => {
      existingNames.add(p.name);
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

    // First player to join becomes the host (admin)
    if (!this.state.hostSessionId || !this.state.players.get(this.state.hostSessionId)) {
      player.isHost = true;
      this.state.hostSessionId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);

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
    this._clientMsgRate.delete(client.sessionId);

    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.connected = false;
    }

    // Delegate to plugin
    if (this._currentPlugin && this.state.lobbyPhase === "in-game") {
      this._currentPlugin.onPlayerLeave?.(this, this.state, client.sessionId, consented);
    }

    try {
      if (!consented) {
        // Wait for reconnection (token-based). This keeps the player slot
        // reserved for a short window while their device refreshes or recovers
        // connectivity.
        await this.allowReconnection(client, RECONNECTION_TIMEOUT_MS / 1000);
        // Player reconnected via token — mark them connected again.
        if (player) {
          player.connected = true;
        }
        // Re-sync clock after reconnection.
        this.send(client, "server-time", { serverTime: Date.now() });
        return;
      }
    } catch {
      // Reconnection timed out or was rejected. Fall through to removal.
    }

    // Fully remove if consent or reconnection failed.
    // This keeps player counts and host assignment accurate.
    const wasHost = player?.isHost ?? false;
    this.state.players.delete(client.sessionId);

    if (wasHost) {
      this._transferHost(client.sessionId);
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
    if (this._roomCode) {
      unregisterRoomCode(this._roomCode, this.roomId);
    }
    // AI cleanup removed — no AI games in this build
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

    // Remove disconnected players
    const disconnectedIds: string[] = [];
    this.state.players.forEach((player, sessionId) => {
      if (!player.connected) disconnectedIds.push(sessionId);
    });
    for (const id of disconnectedIds) {
      this.state.players.delete(id);
    }
    this.setMetadata({
      code: this._roomCode,
      gameName: this.state.selectedGameId || "lobby",
      complexity: this.state.complexity as Complexity,
      playerCount: this.state.players.size,
      hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
    });

    this.state.round = 0;
    this.state.totalRounds = 0;
    this.state.timerEndsAt = 0;

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

    // Remove disconnected players
    const disconnectedIds: string[] = [];
    this.state.players.forEach((player, sessionId) => {
      if (!player.connected) disconnectedIds.push(sessionId);
    });
    for (const id of disconnectedIds) {
      this.state.players.delete(id);
    }
    this.setMetadata({
      code: this._roomCode,
      gameName: this.state.selectedGameId || "lobby",
      complexity: this.state.complexity as Complexity,
      playerCount: this.state.players.size,
      hotTakePlayerInputEnabled: this.state.hotTakePlayerInputEnabled,
    });

    this.state.round = 0;
    this.state.totalRounds = 0;
    this.state.timerEndsAt = 0;

    this.unlock();
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private _getConnectedPlayerCount(): number {
    let count = 0;
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((player) => {
      if (player.connected) count++;
    });
    return count;
  }

  private _removeDisconnectedPlayers(): number {
    const disconnectedIds: string[] = [];
    this.state.players.forEach((player, sessionId) => {
      if (!player.connected) disconnectedIds.push(sessionId);
    });
    for (const id of disconnectedIds) {
      this.state.players.delete(id);
    }
    return disconnectedIds.length;
  }

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

    // Remove disconnected players
    const disconnectedIds: string[] = [];
    this.state.players.forEach((player, sessionId) => {
      if (!player.connected) disconnectedIds.push(sessionId);
    });
    for (const id of disconnectedIds) {
      this.state.players.delete(id);
    }

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
