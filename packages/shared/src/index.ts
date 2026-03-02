// Types
export type {
  RoomStatus,
  Complexity,
  RoomOptions,
  RoomMetadata,
  GameSettings,
} from "./types/room";

export type { PlayerData } from "./types/player";

export type {
  GameManifest,
  JeopardyPhase,
  WheelOfFortunePhase,
  FamilyFeudPhase,
  GamePhase,
  TimerConfig,
  HostViewData,
  PlayerViewData,
  ScoreEntry,
} from "./types/game";

export type {
  ClientMessageType,
  ServerMessageType,
  PlayerSubmitMessage,
  PlayerVoteMessage,
  PlayerBuzzMessage,
  HostSelectGameMessage,
  HostStartGameMessage,
  HostSetGameOptionsMessage,
  GameDataMessage,
  PrivateDataMessage,
  ErrorMessage,
  PlayerReactionMessage,
} from "./types/messages";

// Constants
export {
  ROOM_CODE_LENGTH,
  ROOM_CODE_CHARS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MAX_NAME_LENGTH,
  COLYSEUS_PORT,
  HOST_PORT,
  CONTROLLER_PORT,
  RECONNECTION_TIMEOUT_MS,
  ROOM_IDLE_TIMEOUT_MS,
  COMPLEXITY_TIMER_MULTIPLIERS,
  COMPLEXITY_ROUND_COUNTS,
  DEFAULT_PHASE_TIMERS,
  REACTION_EMOJIS,
  REACTION_COOLDOWN_MS,
  AVATAR_COLORS,
  GAME_MANIFESTS,
} from "./constants";

// Utilities (browser-safe helpers)
export {
  resolveColyseusWsUrlFromEnv,
  resolveNextPublicColyseusWsUrl,
  resolveNextPublicColyseusHttpUrl,
  wsUrlToHttpUrl,
  resolveRoomIdByCode,
} from "./utils/colyseus";

export type { ResolveRoomIdResult } from "./utils/colyseus";

export { pickRandom, randomFloat, randomInt, shuffleInPlace } from "./utils/random";

export { normalizeAnswer, stringSimilarity, fuzzyMatch } from "./utils/fuzzy-match";
