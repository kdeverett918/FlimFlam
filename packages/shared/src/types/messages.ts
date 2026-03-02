// Client -> Server message types
export type ClientMessageType =
  | "player:submit"
  | "player:vote"
  | "player:ready"
  | "player:draw-stroke"
  | "player:use-ability"
  | "host:select-game"
  | "host:start-game"
  | "host:next-round"
  | "host:skip"
  | "host:end-game"
  | "host:set-complexity"
  | "host:set-player-input"
  | "host:restart-game"
  | "player:reaction";

export interface PlayerSubmitMessage {
  type: "player:submit";
  content: string;
}

export interface PlayerTopicSubmitMessage {
  type: "player:submit";
  content: string;
  category?: string;
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

export interface HostSelectGameMessage {
  type: "host:select-game";
  gameId: string;
}

export interface HostSetPlayerInputMessage {
  type: "host:set-player-input";
  enabled: boolean;
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
  | "score-update"
  | "reaction";

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

export interface PlayerReactionMessage {
  type: "player:reaction";
  emoji: string;
}
