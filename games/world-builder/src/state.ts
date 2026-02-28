import type {
  BonusJudgingResult,
  Complexity,
  GeneratedScenario,
  RoundNarrationResult,
  WorldState,
} from "@partyline/shared";

// ─── In-Memory Game State (not synced to client via schema) ─────────────

export interface WorldBuilderInternalState {
  complexity: Complexity;
  scenario: GeneratedScenario;
  worldState: WorldState;
  currentSituation: string;
  narrations: string[];
  actionHistory: {
    narration: string;
    actions: { sessionId: string; name: string; role: string; action: string }[];
  }[];
  roundResults: RoundNarrationResult[];
  playerActions: Map<string, { name: string; role: string; action: string }>;
  playerRoles: Map<
    string,
    {
      roleName: string;
      secretObjective: string;
      specialAbility: string;
      abilityUsed: boolean;
      abilityUsedRound: number | null;
      scoringCriteria: string;
    }
  >;
  bonusResult: BonusJudgingResult | null;
  round: number;
  totalRounds: number;
}

export function createInitialInternalState(complexity: Complexity): WorldBuilderInternalState {
  return {
    complexity,
    scenario: {
      setting: "",
      situation: "",
      worldState: {
        location: "",
        timePressure: "",
        keyResources: [],
        npcs: [],
        threats: [],
        opportunities: [],
      },
      roles: [],
      tone: "",
    },
    worldState: {
      location: "",
      timePressure: "",
      keyResources: [],
      npcs: [],
      threats: [],
      opportunities: [],
    },
    currentSituation: "",
    narrations: [],
    actionHistory: [],
    roundResults: [],
    playerActions: new Map(),
    playerRoles: new Map(),
    bonusResult: null,
    round: 0,
    totalRounds: 0,
  };
}

// ─── Action Validation ──────────────────────────────────────────────────

export const ACTION_MIN_LENGTH = 1;
export const ACTION_MAX_LENGTH = 140;

export function validateAction(action: unknown): {
  valid: boolean;
  error?: string;
  value?: string;
} {
  if (typeof action !== "string") {
    return { valid: false, error: "Action must be a string" };
  }
  const trimmed = action.trim();
  if (trimmed.length < ACTION_MIN_LENGTH) {
    return { valid: false, error: "Action cannot be empty" };
  }
  if (trimmed.length > ACTION_MAX_LENGTH) {
    return { valid: false, error: `Action must be ${ACTION_MAX_LENGTH} characters or less` };
  }
  return { valid: true, value: trimmed };
}
