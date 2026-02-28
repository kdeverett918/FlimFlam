// Types
export type {
  RoomStatus,
  Complexity,
  RoomOptions,
  RoomMetadata,
  GameSettings,
} from "./types/room.js";

export type { PlayerData } from "./types/player.js";

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
} from "./types/game.js";

export type {
  ClientMessageType,
  ServerMessageType,
  PlayerSubmitMessage,
  PlayerVoteMessage,
  PlayerDrawStrokeMessage,
  PlayerUseAbilityMessage,
  HostStartGameMessage,
  SliderVoteMessage,
  GameDataMessage,
  PrivateDataMessage,
  DrawStrokeBroadcast,
  ErrorMessage,
} from "./types/messages.js";

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
} from "./types/ai.js";

// Schemas
export {
  GeneratedScenarioRawSchema,
  RoundNarrationRawSchema,
  BonusJudgingRawSchema,
  BluffPromptSchema,
  TriviaQuestionSchema,
  TriviaBatchSchema,
} from "./schemas/ai-responses.js";

export type {
  GeneratedScenarioRaw,
  RoundNarrationRaw,
  BonusJudgingRaw,
  BluffPromptRaw,
  TriviaQuestionRaw,
  TriviaBatchRaw,
} from "./schemas/ai-responses.js";

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
} from "./constants.js";

// Test Utilities
export {
  createMockClient,
  resetClientIdCounter,
  createMockRoom,
  mockScenarioKids,
  mockScenarioStandard,
  mockScenarioAdvanced,
  mockScenarios,
  mockNarrationResults,
  mockBonusJudging,
  mockBluffPrompts,
  mockTriviaQuestions,
  malformedJsonString,
  partialValidJsonString,
} from "./test-utils/index.js";

export type {
  MockClient,
  MockRoom,
  MockClock,
  CreateMockRoomOptions,
} from "./test-utils/index.js";
