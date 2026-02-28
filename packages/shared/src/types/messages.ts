// Client -> Server message types
export type ClientMessageType =
  | "player:submit"
  | "player:vote"
  | "player:ready"
  | "player:draw-stroke"
  | "player:use-ability"
  | "host:start-game"
  | "host:next-round"
  | "host:skip"
  | "host:end-game"
  | "host:set-complexity";

export interface PlayerSubmitMessage {
  type: "player:submit";
  content: string;
}

export interface PlayerVoteMessage {
  type: "player:vote";
  targetIndex: number;
}

export interface PlayerDrawStrokeMessage {
  type: "player:draw-stroke";
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export interface PlayerUseAbilityMessage {
  type: "player:use-ability";
  abilityId: string;
}

export interface HostStartGameMessage {
  type: "host:start-game";
  gameId: string;
}

export interface SliderVoteMessage {
  type: "player:vote";
  value: number; // -2 to +2
}

// Server -> Client message types
export type ServerMessageType =
  | "game-data"
  | "private-data"
  | "draw-stroke"
  | "error"
  | "phase-change"
  | "timer-sync"
  | "score-update";

export interface GameDataMessage {
  type: "game-data";
  payload: Record<string, unknown>;
}

export interface PrivateDataMessage {
  type: "private-data";
  payload: Record<string, unknown>;
}

export interface DrawStrokeBroadcast {
  type: "draw-stroke";
  sessionId: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export interface ErrorMessage {
  type: "error";
  message: string;
  code?: string;
}
