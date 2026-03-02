import type { GameManifest } from "./types/game";
import type { Complexity } from "./types/room";

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 3;
// 12 chars was causing real player names to be silently truncated in the lobby UI.
// Keep it bounded for layout + abuse prevention, but long enough for typical names/handles.
export const MAX_NAME_LENGTH = 20;

export const COLYSEUS_PORT = 2567;
export const HOST_PORT = 3000;
export const CONTROLLER_PORT = 3001;

// Allow enough time for client-side route transitions and slow devices to reconnect.
// This is also used for the controller join-page -> play-page handoff, which relies on
// Colyseus reconnection tokens.
export const RECONNECTION_TIMEOUT_MS = 45_000;
export const ROOM_IDLE_TIMEOUT_MS = 600_000;

export const COMPLEXITY_TIMER_MULTIPLIERS: Record<Complexity, number> = {
  kids: 1.5,
  standard: 1.0,
  advanced: 0.75,
};

export const COMPLEXITY_ROUND_COUNTS: Record<Complexity, number> = {
  kids: 3,
  standard: 5,
  advanced: 7,
};

export const DEFAULT_PHASE_TIMERS: Record<string, number> = {};

export const REACTION_EMOJIS = ["😂", "🔥", "👏", "😱", "💀", "🎉", "👀", "💯"] as const;
export const REACTION_COOLDOWN_MS = 2_000;

export const AVATAR_COLORS = [
  "#FF3366", // hot pink
  "#00D4AA", // teal
  "#FFB800", // gold
  "#7B61FF", // purple
  "#FF6B35", // orange
  "#00B4D8", // cyan
  "#FF1493", // deep pink
  "#32CD32", // lime green
] as const;

export const GAME_MANIFESTS: GameManifest[] = [];
