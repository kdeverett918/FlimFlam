import type { MapSchema, Schema } from "@colyseus/schema";
import type { Complexity, GameManifest } from "@flimflam/shared";
import type { Client, Room } from "colyseus";

export interface GamePlugin {
  manifest: GameManifest;
  createState(): Schema;
  onGameStart(
    room: Room,
    state: Schema,
    players: MapSchema,
    complexity: Complexity,
  ): void | Promise<void>;
  onPlayerMessage(
    room: Room,
    state: Schema,
    client: Client,
    type: string,
    data: unknown,
  ): void | Promise<void>;
  onTick?(room: Room, state: Schema, deltaTime: number): void;
  onPlayerLeave?(room: Room, state: Schema, sessionId: string, consented: boolean): void;
  onPlayerReconnect?(room: Room, state: Schema, client: Client): void;
  isGameOver(state: Schema): boolean;
  getScores(state: Schema): Map<string, number>;
}
