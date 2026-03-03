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
  GamePreviewContent,
  WorldBuilderPhase,
  BluffEnginePhase,
  QuickDrawPhase,
  RealityDriftPhase,
  HotTakePhase,
  BrainBattlePhase,
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
  PlayerTopicSubmitMessage,
  PlayerVoteMessage,
  PlayerDrawStrokeMessage,
  PlayerUseAbilityMessage,
  HostSelectGameMessage,
  HostStartGameMessage,
  HostSetPlayerInputMessage,
  SliderVoteMessage,
  GameDataMessage,
  PrivateDataMessage,
  DrawStrokeBroadcast,
  ErrorMessage,
  PlayerReactionMessage,
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
  HotTakePlayerProfile,
  HotTakeRoundHistory,
  GeneratedHotTakePrompt,
  BrainBattleClue,
  BrainBattleCategory,
  GeneratedBoard,
  AnswerJudgeResult,
  AppealResult,
} from "./types/ai";

// Schemas
export {
  GeneratedScenarioRawSchema,
  RoundNarrationRawSchema,
  BonusJudgingRawSchema,
  BluffPromptSchema,
  TriviaQuestionSchema,
  TriviaBatchSchema,
  HotTakePromptSchema,
  HotTakeBatchSchema,
  GeneratedBoardSchema,
  AnswerJudgeSchema,
  AppealResultSchema,
} from "./schemas/ai-responses";

export type {
  GeneratedScenarioRaw,
  RoundNarrationRaw,
  BonusJudgingRaw,
  BluffPromptRaw,
  TriviaQuestionRaw,
  TriviaBatchRaw,
  HotTakePromptRaw,
  HotTakeBatchRaw,
  GeneratedBoardRaw,
  AnswerJudgeRaw,
  AppealResultRaw,
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
  REACTION_EMOJIS,
  REACTION_COOLDOWN_MS,
  AVATAR_COLORS,
  GAME_MANIFESTS,
  GAME_PREVIEW_CONTENT,
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

export { fuzzyMatch, normalizeAnswer, stringSimilarity } from "./utils/fuzzy-match";

// Commentary & Awards
export {
  getStreakCommentary,
  getComebackCommentary,
  getCloseGameCommentary,
  getBlowoutCommentary,
  getLastRoundCommentary,
  getCorrectCommentary,
  getWrongCommentary,
  analyzeGameState,
  generateAwards,
} from "./commentary";

export type { GameAward } from "./commentary";
