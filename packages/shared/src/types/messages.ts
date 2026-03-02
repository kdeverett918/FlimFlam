// Client -> Server message types
export type ClientMessageType =
  | "player:submit"
  | "player:vote"
  | "player:ready"
  | "player:buzz"
  | "host:select-game"
  | "host:start-game"
  | "host:next-round"
  | "host:skip"
  | "host:end-game"
  | "host:set-complexity"
  | "host:set-game-options"
  | "host:restart-game"
  | "player:reaction";

export interface PlayerSubmitMessage {
  type: "player:submit";
  content: string;
}

export interface PlayerVoteMessage {
  type: "player:vote";
  targetIndex: number;
}

export interface PlayerBuzzMessage {
  type: "player:buzz";
}

export interface HostStartGameMessage {
  type: "host:start-game";
  gameId: string;
}

export interface HostSelectGameMessage {
  type: "host:select-game";
  gameId: string;
}

export interface HostSetGameOptionsMessage {
  type: "host:set-game-options";
  options: string;
}

// Server -> Client message types
export type ServerMessageType =
  | "game-data"
  | "private-data"
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

export interface ErrorMessage {
  type: "error";
  message: string;
  code?: string;
}

export interface PlayerReactionMessage {
  type: "player:reaction";
  emoji: string;
}
