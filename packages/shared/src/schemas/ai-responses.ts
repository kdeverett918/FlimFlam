import { z } from "zod";

const NpcSchema = z.object({
  name: z.string(),
  role: z.string(),
  disposition: z.string(),
  status: z.string().optional(),
});

const WorldStateSchema = z.object({
  location: z.string(),
  time_pressure: z.string().optional(),
  timePressure: z.string().optional(),
  key_resources: z.array(z.string()).optional(),
  keyResources: z.array(z.string()).optional(),
  npcs: z.array(NpcSchema),
  threats: z.array(z.string()),
  opportunities: z.array(z.string()),
  new_developments: z.array(z.string()).optional(),
  newDevelopments: z.array(z.string()).optional(),
});

const GeneratedRoleSchema = z.object({
  role_name: z.string().optional(),
  roleName: z.string().optional(),
  public_identity: z.string().optional(),
  publicIdentity: z.string().optional(),
  secret_objective: z.string().optional(),
  secretObjective: z.string().optional(),
  special_ability: z.string().optional(),
  specialAbility: z.string().optional(),
  scoring_criteria: z.string().optional(),
  scoringCriteria: z.string().optional(),
});

export const GeneratedScenarioRawSchema = z.object({
  setting: z.string(),
  situation: z.string(),
  world_state: WorldStateSchema.optional(),
  worldState: WorldStateSchema.optional(),
  roles: z.array(GeneratedRoleSchema),
  tone: z.string(),
});

const PlayerOutcomeSchema = z.object({
  session_id: z.string().optional(),
  sessionId: z.string().optional(),
  narration: z.string(),
  points: z.number(),
  progress_delta: z.number().optional(),
  progressDelta: z.number().optional(),
  reason: z.string(),
});

export const RoundNarrationRawSchema = z.object({
  narration: z.string(),
  player_outcomes: z.array(PlayerOutcomeSchema).optional(),
  playerOutcomes: z.array(PlayerOutcomeSchema).optional(),
  world_state_update: z.record(z.unknown()).optional(),
  worldStateUpdate: z.record(z.unknown()).optional(),
  dramatic_twist: z.string().optional(),
  dramaticTwist: z.string().optional(),
});

export const BonusJudgingRawSchema = z.object({
  best_action: z
    .object({
      session_id: z.string().optional(),
      sessionId: z.string().optional(),
      reason: z.string(),
      points: z.number(),
    })
    .optional(),
  bestAction: z
    .object({
      session_id: z.string().optional(),
      sessionId: z.string().optional(),
      reason: z.string(),
      points: z.number(),
    })
    .optional(),
  chaos_agent: z
    .object({
      session_id: z.string().optional(),
      sessionId: z.string().optional(),
      reason: z.string(),
      points: z.number(),
    })
    .optional(),
  chaosAgent: z
    .object({
      session_id: z.string().optional(),
      sessionId: z.string().optional(),
      reason: z.string(),
      points: z.number(),
    })
    .optional(),
  mvp_moment: z.object({ description: z.string() }).optional(),
  mvpMoment: z.object({ description: z.string() }).optional(),
});

export const BluffPromptSchema = z.object({
  question: z.string(),
  real_answer: z.string().optional(),
  realAnswer: z.string().optional(),
  category: z.string(),
});

export const TriviaQuestionSchema = z.object({
  question: z.string(),
  correct_answer: z.string().optional(),
  correctAnswer: z.string().optional(),
  options: z.array(z.string()).min(4).max(4),
  is_drift: z.boolean().optional(),
  isDrift: z.boolean().optional(),
  category: z.string(),
});

export const TriviaBatchSchema = z.object({
  questions: z.array(TriviaQuestionSchema),
});

export const HotTakePromptSchema = z.object({
  statement: z.string(),
  reasoning: z.string().optional(),
  escalation_level: z.number().min(1).max(10).optional(),
  escalationLevel: z.number().min(1).max(10).optional(),
});

export const HotTakeBatchSchema = z.object({
  prompts: z.array(HotTakePromptSchema),
});

export type GeneratedScenarioRaw = z.infer<typeof GeneratedScenarioRawSchema>;
export type RoundNarrationRaw = z.infer<typeof RoundNarrationRawSchema>;
export type BonusJudgingRaw = z.infer<typeof BonusJudgingRawSchema>;
export type BluffPromptRaw = z.infer<typeof BluffPromptSchema>;
export type TriviaQuestionRaw = z.infer<typeof TriviaQuestionSchema>;
export type TriviaBatchRaw = z.infer<typeof TriviaBatchSchema>;
export type HotTakePromptRaw = z.infer<typeof HotTakePromptSchema>;
export type HotTakeBatchRaw = z.infer<typeof HotTakeBatchSchema>;
