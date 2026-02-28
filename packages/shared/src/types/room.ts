export type RoomStatus = "lobby" | "in-game" | "between-games" | "finished";

export type Complexity = "kids" | "standard" | "advanced";

export interface RoomOptions {
  name: string;
  isHost?: boolean;
  color?: number;
}

export interface RoomMetadata {
  code: string;
  gameName: string;
  complexity: Complexity;
  playerCount: number;
  hotTakePlayerInputEnabled?: boolean;
}

export interface GameSettings {
  complexity: Complexity;
  playerCount: number;
  customRounds?: number;
  customTimer?: number;
}
