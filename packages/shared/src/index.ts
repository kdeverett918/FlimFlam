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
  WorldBuilderPhase,
  BluffEnginePhase,
  QuickDrawPhase,
  RealityDriftPhase,
  HotTakePhase,
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
  PlayerDrawStrokeMessage,
  PlayerUseAbilityMessage,
  HostSelectGameMessage,
  HostStartGameMessage,
  SliderVoteMessage,
  GameDataMessage,
  PrivateDataMessage,
  DrawStrokeBroadcast,
  ErrorMessage,
} from "./types/messages";

export type {
  AIRequestOptions,
  AIResponse,
  NPC,
  WorldState,
  GeneratedRole,
  GeneratedScenario,
  RoundNarrationInput,
  PlayerOutcome,
  RoundNarrationResult,
  BonusJudgingResult,
  BluffPrompt,
  TriviaQuestion,
} from "./types/ai";

// Schemas
export {
  GeneratedScenarioRawSchema,
  RoundNarrationRawSchema,
  BonusJudgingRawSchema,
  BluffPromptSchema,
  TriviaQuestionSchema,
  TriviaBatchSchema,
} from "./schemas/ai-responses";

export type {
  GeneratedScenarioRaw,
  RoundNarrationRaw,
  BonusJudgingRaw,
  BluffPromptRaw,
  TriviaQuestionRaw,
  TriviaBatchRaw,
} from "./schemas/ai-responses";

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
  AI_REQUEST_TIMEOUT_MS,
  AI_MAX_RETRIES,
  COMPLEXITY_TIMER_MULTIPLIERS,
  COMPLEXITY_ROUND_COUNTS,
  DEFAULT_PHASE_TIMERS,
  AVATAR_COLORS,
  GAME_MANIFESTS,
} from "./constants";
