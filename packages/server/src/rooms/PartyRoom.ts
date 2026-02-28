import type { GamePlugin } from "@partyline/game-engine";
import { GameRegistry } from "@partyline/game-engine";
import {
  AVATAR_COLORS,
  type Complexity,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RECONNECTION_TIMEOUT_MS,
  ROOM_IDLE_TIMEOUT_MS,
} from "@partyline/shared";
import type { Client, Delayed } from "colyseus";
import { Room } from "colyseus";
import { GamePlayerSchema, RoomState } from "./LobbyState.js";
import { generateRoomCode } from "./room-code.js";

export class PartyRoom extends Room<RoomState> {
  maxClients = MAX_PLAYERS;

  private _currentPlugin: GamePlugin | null = null;
  private _roomCode = "";
  private _idleTimeout: Delayed | null = null;

  onCreate(_options: Record<string, unknown>): void {
    const state = new RoomState();
    this._roomCode = generateRoomCode();
    state.roomCode = this._roomCode;
    this.setState(state);

    this.setMetadata({
      code: this._roomCode,
      gameName: "lobby",
      complexity: "standard",
      playerCount: 0,
    });

    this._resetIdleTimeout();

    // ─── Message Handlers ───────────────────────────────────────

    this.onMessage("select-game", (client, data: { gameId: string }) => {
      if (client.sessionId !== this.state.hostSessionId) {
        this.send(client, "error", { message: "Only the host can select a game" });
        return;
      }
      if (this.state.lobbyPhase !== "waiting" && this.state.lobbyPhase !== "between-games") {
        this.send(client, "error", { message: "Cannot change game during play" });
        return;
      }
      const plugin = GameRegistry.getGame(data.gameId);
      if (!plugin) {
        this.send(client, "error", { message: `Unknown game: ${data.gameId}` });
        return;
      }
      this.state.selectedGameId = data.gameId;
      this.broadcast("game-data", { type: "game-selected", gameId: data.gameId });
    });

    this.onMessage("set-complexity", (client, data: { complexity: string }) => {
      if (client.sessionId !== this.state.hostSessionId) {
        this.send(client, "error", { message: "Only the host can set complexity" });
        return;
      }
      const valid = ["kids", "standard", "advanced"];
      if (!valid.includes(data.complexity)) {
        this.send(client, "error", { message: "Invalid complexity" });
        return;
      }
      this.state.complexity = data.complexity;
      this.setMetadata({
        code: this._roomCode,
        gameName: this.state.selectedGameId || "lobby",
        complexity: data.complexity as Complexity,
        playerCount: this.state.players.size,
      });
    });

    this.onMessage("start-game", (client, _data: unknown) => {
      if (client.sessionId !== this.state.hostSessionId) {
        this.send(client, "error", { message: "Only the host can start the game" });
        return;
      }
      if (!this.state.selectedGameId) {
        this.send(client, "error", { message: "No game selected" });
        return;
      }
      if (this.state.players.size < MIN_PLAYERS) {
        this.send(client, "error", { message: `Need at least ${MIN_PLAYERS} players` });
        return;
      }
      if (this.state.lobbyPhase === "in-game") {
        this.send(client, "error", { message: "Game already in progress" });
        return;
      }

      this._startGame();
    });

    this.onMessage("host-skip", (client, _data: unknown) => {
      if (client.sessionId !== this.state.hostSessionId) {
        return;
      }
      // Let the plugin handle skip if it wants to
      if (this._currentPlugin) {
        this._currentPlugin.onPlayerMessage(this, this.state, client, "host-skip", {});
      }
    });

    this.onMessage("host-end-game", (client, _data: unknown) => {
      if (client.sessionId !== this.state.hostSessionId) {
        return;
      }
      this.transitionToLobby();
    });

    this.onMessage("player-ready", (client, _data: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.hasSubmitted = true;
      }
    });

    // Wildcard handler: delegate all other messages to the current game plugin
    this.onMessage("*", (client, type, data) => {
      if (this._currentPlugin && this.state.lobbyPhase === "in-game") {
        this._currentPlugin.onPlayerMessage(this, this.state, client, type as string, data);
      }
    });
  }

  onJoin(client: Client, options: { name?: string; isHost?: boolean; color?: number }): void {
    this._resetIdleTimeout();

    const name = (options.name ?? "Player").slice(0, MAX_NAME_LENGTH).trim() || "Player";

    // Check for duplicate names
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

    // Assign avatar color based on join order
    const colorIndex = this.state.players.size % AVATAR_COLORS.length;
    player.avatarColor = AVATAR_COLORS[colorIndex] ?? "#FF3366";

    // First player is the host
    if (this.state.players.size === 0) {
      player.isHost = true;
      this.state.hostSessionId = client.sessionId;
    }

    player.connected = true;
    this.state.players.set(client.sessionId, player);

    // Update metadata
    this.setMetadata({
      code: this._roomCode,
      gameName: this.state.selectedGameId || "lobby",
      complexity: this.state.complexity as Complexity,
      playerCount: this.state.players.size,
    });

    // Lock at max
    if (this.state.players.size >= MAX_PLAYERS) {
      this.lock();
    }
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
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
        // Wait for reconnection
        await this.allowReconnection(client, RECONNECTION_TIMEOUT_MS / 1000);
        // Player reconnected
        if (player) {
          player.connected = true;
        }
        return;
      }
    } catch {
      // Reconnection timed out or was rejected
    }

    // Fully remove if consent or reconnection failed
    // Check if we should transfer host
    if (player?.isHost) {
      this._transferHost(client.sessionId);
    }

    // Update metadata
    this.setMetadata({
      code: this._roomCode,
      gameName: this.state.selectedGameId || "lobby",
      complexity: this.state.complexity as Complexity,
      playerCount: this.state.players.size,
    });
  }

  onDispose(): void {
    this._clearIdleTimeout();
  }

  // ─── Transitions ──────────────────────────────────────────────────

  transitionToBetweenGames(): void {
    this.state.lobbyPhase = "between-games";
    this.state.gamePhase = "";
    this._currentPlugin = null;

    // Reset player states for next game
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((player) => {
      player.hasSubmitted = false;
      player.totalPoints = 0;
      player.role = "";
      player.publicInfo = "";
      player.progressOrCustomInt = 0;
      player.abilityOrCustomBool = false;
      player.currentInput = "";
    });

    this.state.round = 0;
    this.state.totalRounds = 0;
    this.state.timerEndsAt = 0;

    this.broadcast("game-data", { type: "between-games" });

    // Unlock for new players
    if (this.state.players.size < MAX_PLAYERS) {
      this.unlock();
    }
  }

  transitionToLobby(): void {
    this.state.lobbyPhase = "waiting";
    this.state.gamePhase = "";
    this.state.selectedGameId = "";
    this._currentPlugin = null;

    // Reset player states
    // biome-ignore lint/complexity/noForEach: MapSchema does not support for...of
    this.state.players.forEach((player) => {
      player.hasSubmitted = false;
      player.totalPoints = 0;
      player.role = "";
      player.publicInfo = "";
      player.progressOrCustomInt = 0;
      player.abilityOrCustomBool = false;
      player.currentInput = "";
    });

    this.state.round = 0;
    this.state.totalRounds = 0;
    this.state.timerEndsAt = 0;

    this.broadcast("game-data", { type: "return-to-lobby" });

    if (this.state.players.size < MAX_PLAYERS) {
      this.unlock();
    }
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
      player.hasSubmitted = false;
      player.totalPoints = 0;
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
