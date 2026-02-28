export interface AIRequestOptions {
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
}

export interface AIResponse<T> {
  raw: string;
  parsed: T;
  tokensUsed: { input: number; output: number };
  latencyMs: number;
}

export interface NPC {
  name: string;
  role: string;
  disposition: string;
  status?: string;
}

export interface WorldState {
  location: string;
  timePressure: string;
  keyResources: string[];
  npcs: NPC[];
  threats: string[];
  opportunities: string[];
  newDevelopments?: string[];
}

export interface GeneratedRole {
  roleName: string;
  publicIdentity: string;
  secretObjective: string;
  specialAbility: string;
  scoringCriteria: string;
}

export interface GeneratedScenario {
  setting: string;
  situation: string;
  worldState: WorldState;
  roles: GeneratedRole[];
  tone: string;
}

export interface RoundNarrationInput {
  round: number;
  totalRounds: number;
  scenario: GeneratedScenario;
  previousNarrations: string[];
  playerActions: { sessionId: string; name: string; role: string; action: string }[];
  worldState: WorldState;
}

export interface PlayerOutcome {
  sessionId: string;
  narration: string;
  points: number;
  progressDelta: number;
  reason: string;
}

export interface RoundNarrationResult {
  narration: string;
  playerOutcomes: PlayerOutcome[];
  worldStateUpdate: Partial<WorldState>;
  dramaticTwist?: string;
}

export interface BonusJudgingResult {
  bestAction: { sessionId: string; reason: string; points: number };
  chaosAgent: { sessionId: string; reason: string; points: number };
  mvpMoment: { description: string };
}

export interface BluffPrompt {
  question: string;
  realAnswer: string;
  category: string;
}

export interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  options: string[];
  isDrift: boolean;
  category: string;
}
