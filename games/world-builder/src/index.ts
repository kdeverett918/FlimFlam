import type { MapSchema, Schema } from "@colyseus/schema";
import {
  FALLBACK_SCENARIOS,
  aiRequest,
  buildBonusJudgingPrompt,
  buildNarrationPrompt,
  buildScenarioPrompt,
  enqueueAIRequest,
} from "@partyline/ai";
import { BaseGamePlugin, ScoringEngine, getRoundCount } from "@partyline/game-engine";
import {
  type BonusJudgingRaw,
  BonusJudgingRawSchema,
  type Complexity,
  GAME_MANIFESTS,
  type GeneratedScenarioRaw,
  GeneratedScenarioRawSchema,
  type RoundNarrationRaw,
  RoundNarrationRawSchema,
  type WorldState,
} from "@partyline/shared";
import type { Client, Room } from "colyseus";
import { SCORING, clampRoundPoints } from "./scoring.js";
import {
  type WorldBuilderInternalState,
  createInitialInternalState,
  validateAction,
} from "./state.js";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "world-builder")!;

export class WorldBuilderPlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: WorldBuilderInternalState;

  createState(): Schema {
    // We use the room's RoomState, so this is just a formality.
    // The actual state management uses internal state + RoomState fields.
    return {} as Schema;
  }

  async onGameStart(
    room: Room,
    state: Schema,
    players: MapSchema,
    complexity: Complexity,
  ): Promise<void> {
    const s = state as unknown as Record<string, unknown>;
    this.internal = createInitialInternalState(complexity);
    this.internal.totalRounds = getRoundCount(complexity);

    this.scoringEngine = new ScoringEngine(complexity === "kids");

    // Initialize scoring for all players
    players.forEach((player: Record<string, unknown>, key: string) => {
      this.scoringEngine.initPlayer(key, player.name as string);
    });

    s.totalRounds = this.internal.totalRounds;
    s.round = 0;
    this.setPhase(state, "generating");

    // Generate scenario via AI, with fallback
    try {
      const scenario = await enqueueAIRequest(room.roomId, async () => {
        const prompts = buildScenarioPrompt(players.size, complexity);
        return aiRequest<GeneratedScenarioRaw>(
          prompts.system,
          prompts.user,
          GeneratedScenarioRawSchema,
          { maxTokens: 4096 },
        );
      });

      const raw = scenario.parsed;
      this.internal.scenario = {
        setting: raw.setting,
        situation: raw.situation,
        worldState: {
          location: (raw.worldState ?? raw.world_state)?.location ?? "Unknown",
          timePressure:
            (raw.worldState ?? raw.world_state)?.timePressure ??
            (raw.worldState ?? raw.world_state)?.time_pressure ??
            "None",
          keyResources:
            (raw.worldState ?? raw.world_state)?.keyResources ??
            (raw.worldState ?? raw.world_state)?.key_resources ??
            [],
          npcs: (raw.worldState ?? raw.world_state)?.npcs ?? [],
          threats: (raw.worldState ?? raw.world_state)?.threats ?? [],
          opportunities: (raw.worldState ?? raw.world_state)?.opportunities ?? [],
        },
        roles: raw.roles.map((r) => ({
          roleName: r.roleName ?? r.role_name ?? "Unknown",
          publicIdentity: r.publicIdentity ?? r.public_identity ?? "",
          secretObjective: r.secretObjective ?? r.secret_objective ?? "",
          specialAbility: r.specialAbility ?? r.special_ability ?? "",
          scoringCriteria: r.scoringCriteria ?? r.scoring_criteria ?? "",
        })),
        tone: raw.tone,
      };
    } catch (error) {
      console.warn("AI scenario generation failed, using fallback:", error);
      const fallback =
        FALLBACK_SCENARIOS[complexity] ?? FALLBACK_SCENARIOS.standard ?? FALLBACK_SCENARIOS.kids;
      if (fallback) {
        this.internal.scenario = fallback;
      }
    }

    this.internal.worldState = { ...this.internal.scenario.worldState };

    // Assign roles to players
    const playerKeys: string[] = [];
    players.forEach((_player: unknown, key: string) => {
      playerKeys.push(key);
    });

    // Shuffle player keys for random role assignment
    for (let i = playerKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = playerKeys[i] as string;
      playerKeys[i] = playerKeys[j] as string;
      playerKeys[j] = temp;
    }

    const roles = this.internal.scenario.roles;
    for (let i = 0; i < playerKeys.length; i++) {
      const sessionId = playerKeys[i] ?? "";
      const role = roles[i % roles.length];
      if (!role) continue;
      const player = players.get(sessionId);
      if (player) {
        const p = player as Record<string, unknown>;
        p.role = role.roleName;
        p.publicInfo = role.publicIdentity;
      }
      this.internal.playerRoles.set(sessionId, {
        roleName: role.roleName,
        secretObjective: role.secretObjective,
        specialAbility: role.specialAbility,
        abilityUsed: false,
        scoringCriteria: role.scoringCriteria,
      });
    }

    // Move to role reveal phase
    this.setPhase(state, "role-reveal");

    // Send private data to each player with their secret objective
    for (const [sessionId, roleData] of this.internal.playerRoles) {
      const client = room.clients.find((c: { sessionId: string }) => c.sessionId === sessionId);
      if (client) {
        room.send(client, "private-data", {
          secretObjective: roleData.secretObjective,
          specialAbility: roleData.specialAbility,
          scoringCriteria: roleData.scoringCriteria,
        });
      }
    }

    // Broadcast scenario info to everyone
    room.broadcast("game-data", {
      type: "scenario",
      setting: this.internal.scenario.setting,
      situation: this.internal.scenario.situation,
      worldState: this.internal.worldState,
      tone: this.internal.scenario.tone,
    });

    // Start role reveal timer, then move to first round
    this.startPhaseTimer(room, "role-reveal", complexity, () => {
      this._startRound(room, state);
    });
  }

  async onPlayerMessage(
    room: Room,
    state: Schema,
    client: Client,
    type: string,
    data: unknown,
  ): Promise<void> {
    const s = state as unknown as Record<string, unknown>;
    const gamePhase = s.gamePhase as string;
    const players = s.players as MapSchema;

    if (type === "submit-action" && gamePhase === "action-input") {
      const msg = data as { content?: unknown };
      const validation = validateAction(msg?.content);

      if (!validation.valid) {
        room.send(client, "error", { message: validation.error });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;

      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already submitted" });
        return;
      }

      p.hasSubmitted = true;
      p.currentInput = validation.value ?? "";

      const roleData = this.internal.playerRoles.get(client.sessionId);
      this.internal.playerActions.set(client.sessionId, {
        name: p.name as string,
        role: roleData?.roleName ?? "Unknown",
        action: validation.value ?? "",
      });

      // Check if all players submitted
      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        await this._processActions(room, state);
      }
    } else if (type === "use-ability" && gamePhase === "action-input") {
      const roleData = this.internal.playerRoles.get(client.sessionId);
      if (!roleData || roleData.abilityUsed) {
        room.send(client, "error", { message: "Ability already used or not available" });
        return;
      }
      roleData.abilityUsed = true;
      const p = players.get(client.sessionId) as Record<string, unknown> | undefined;
      if (p) {
        p.abilityOrCustomBool = true;
      }
      room.broadcast("game-data", {
        type: "ability-used",
        sessionId: client.sessionId,
        ability: roleData.specialAbility,
      });
    } else if (type === "host-skip") {
      // Host can skip the current phase timer
      if (gamePhase === "role-reveal") {
        this.clearTimer();
        this._startRound(room, state);
      } else if (gamePhase === "narration-display") {
        this.clearTimer();
        this._advanceAfterNarration(room, state);
      } else if (gamePhase === "action-input") {
        this.clearTimer();
        await this._processActions(room, state);
      } else if (gamePhase === "reveal") {
        this.clearTimer();
        this.setPhase(state, "final-scores");
        this._showFinalScores(room, state);
      }
    }
  }

  isGameOver(state: Schema): boolean {
    const s = state as unknown as Record<string, unknown>;
    return s.gamePhase === "final-scores";
  }

  getScores(_state: Schema): Map<string, number> {
    const scores = new Map<string, number>();
    const leaderboard = this.scoringEngine.getLeaderboard();
    for (const entry of leaderboard) {
      scores.set(entry.sessionId, entry.score);
    }
    return scores;
  }

  // ─── Private Methods ──────────────────────────────────────────────────

  private _startRound(room: Room, state: Schema): void {
    const s = state as unknown as Record<string, unknown>;
    this.internal.round++;
    s.round = this.internal.round;

    this.internal.playerActions.clear();
    this.resetSubmissions(state);
    this.setPhase(state, "action-input");

    // Broadcast world state update
    room.broadcast("game-data", {
      type: "round-start",
      round: this.internal.round,
      totalRounds: this.internal.totalRounds,
      worldState: this.internal.worldState,
    });

    this.startPhaseTimer(room, "action-input", this.internal.complexity, async () => {
      await this._processActions(room, state);
    });
  }

  private async _processActions(room: Room, state: Schema): Promise<void> {
    const s = state as unknown as Record<string, unknown>;
    const players = s.players as MapSchema;
    this.setPhase(state, "ai-narrating");

    // Collect actions, using defaults for non-submitters
    const playerActions: { sessionId: string; name: string; role: string; action: string }[] = [];
    players.forEach((player: Record<string, unknown>, key: string) => {
      if (player.connected) {
        const existing = this.internal.playerActions.get(key);
        if (existing) {
          playerActions.push({ sessionId: key, ...existing });
        } else {
          const roleData = this.internal.playerRoles.get(key);
          playerActions.push({
            sessionId: key,
            name: player.name as string,
            role: roleData?.roleName ?? "Unknown",
            action: "watches cautiously and does nothing",
          });
        }
      }
    });

    // Generate narration via AI
    let narrationResult: {
      narration: string;
      playerOutcomes: {
        sessionId: string;
        points: number;
        reason: string;
        progressDelta: number;
      }[];
      worldStateUpdate: Partial<WorldState>;
      dramaticTwist?: string;
    };

    try {
      const input = {
        round: this.internal.round,
        totalRounds: this.internal.totalRounds,
        scenario: this.internal.scenario,
        previousNarrations: this.internal.narrations,
        playerActions,
        worldState: this.internal.worldState,
      };

      const result = await enqueueAIRequest(room.roomId, async () => {
        const prompts = buildNarrationPrompt(input, playerActions);
        return aiRequest<RoundNarrationRaw>(prompts.system, prompts.user, RoundNarrationRawSchema, {
          maxTokens: 4096,
        });
      });

      const raw = result.parsed;
      const outcomes = (raw.playerOutcomes ?? raw.player_outcomes ?? []).map((o) => ({
        sessionId: o.sessionId ?? o.session_id ?? "",
        narration: o.narration,
        points: clampRoundPoints(o.points),
        progressDelta: o.progressDelta ?? o.progress_delta ?? 0,
        reason: o.reason,
      }));

      narrationResult = {
        narration: raw.narration,
        playerOutcomes: outcomes,
        worldStateUpdate: (raw.worldStateUpdate ??
          raw.world_state_update ??
          {}) as Partial<WorldState>,
        dramaticTwist: raw.dramaticTwist ?? raw.dramatic_twist,
      };
    } catch (error) {
      console.warn("AI narration failed, using default:", error);
      narrationResult = {
        narration: `Round ${this.internal.round}: The adventurers make their moves. ${playerActions.map((a) => `${a.name} ${a.action}.`).join(" ")} The situation evolves...`,
        playerOutcomes: playerActions.map((a) => ({
          sessionId: a.sessionId,
          points: SCORING.DEFAULT_ROUND_POINTS,
          reason: "Participation points",
          progressDelta: 0,
        })),
        worldStateUpdate: {},
      };
    }

    // Store narration
    this.internal.narrations.push(narrationResult.narration);

    // Award points
    for (const outcome of narrationResult.playerOutcomes) {
      if (outcome.sessionId) {
        this.addPoints(state, outcome.sessionId, outcome.points, outcome.reason);

        // Update progress on player schema
        const player = players.get(outcome.sessionId);
        if (player) {
          const p = player as Record<string, unknown>;
          p.progressOrCustomInt = ((p.progressOrCustomInt as number) || 0) + outcome.progressDelta;
        }
      }
    }

    // Update world state
    if (narrationResult.worldStateUpdate) {
      const update = narrationResult.worldStateUpdate;
      if (update.threats) this.internal.worldState.threats = update.threats;
      if (update.opportunities) this.internal.worldState.opportunities = update.opportunities;
      if (update.newDevelopments) this.internal.worldState.newDevelopments = update.newDevelopments;
      if (update.location) this.internal.worldState.location = update.location;
      if (update.timePressure) this.internal.worldState.timePressure = update.timePressure;
      if (update.keyResources) this.internal.worldState.keyResources = update.keyResources;
    }

    // Broadcast narration
    this.setPhase(state, "narration-display");
    room.broadcast("game-data", {
      type: "narration",
      narration: narrationResult.narration,
      outcomes: narrationResult.playerOutcomes,
      worldState: this.internal.worldState,
      dramaticTwist: narrationResult.dramaticTwist,
    });

    this.startPhaseTimer(room, "narration-display", this.internal.complexity, () => {
      this._advanceAfterNarration(room, state);
    });
  }

  private _advanceAfterNarration(room: Room, state: Schema): void {
    if (this.internal.round >= this.internal.totalRounds) {
      // Game over - move to reveal phase
      this.setPhase(state, "reveal");
      this._doEndGameBonuses(room, state);
    } else {
      this._startRound(room, state);
    }
  }

  private async _doEndGameBonuses(room: Room, state: Schema): Promise<void> {
    const s = state as unknown as Record<string, unknown>;
    const players = s.players as MapSchema;

    // Award survivor bonus to players who stayed connected
    players.forEach((player: Record<string, unknown>, key: string) => {
      if (player.connected) {
        this.scoringEngine.addBonus(key, SCORING.SURVIVOR_BONUS, "Survivor Bonus");
        player.totalPoints = this.scoringEngine.getTotalPoints(key);
      }
    });

    // Try AI bonus judging
    try {
      const gameHistory = {
        scenario: {
          setting: this.internal.scenario.setting,
          situation: this.internal.scenario.situation,
        },
        rounds: this.internal.narrations.map((narration, i) => {
          const roundActions: { sessionId: string; name: string; action: string }[] = [];
          // We reconstruct from stored data as best we can
          players.forEach((player: Record<string, unknown>, key: string) => {
            roundActions.push({
              sessionId: key,
              name: player.name as string,
              action: `(round ${i + 1} action)`,
            });
          });
          return { narration, actions: roundActions };
        }),
      };

      const result = await enqueueAIRequest(room.roomId, async () => {
        const prompts = buildBonusJudgingPrompt(gameHistory);
        return aiRequest<BonusJudgingRaw>(prompts.system, prompts.user, BonusJudgingRawSchema, {
          maxTokens: 2048,
        });
      });

      const raw = result.parsed;

      const bestAction = raw.bestAction ?? raw.best_action;
      if (bestAction) {
        const sid = bestAction.sessionId ?? bestAction.session_id;
        if (sid) {
          this.scoringEngine.addBonus(sid, SCORING.BEST_ACTION_BONUS, "Best Action");
          const p = players.get(sid);
          if (p) {
            (p as Record<string, unknown>).totalPoints = this.scoringEngine.getTotalPoints(sid);
          }
        }
      }

      const chaosAgent = raw.chaosAgent ?? raw.chaos_agent;
      if (chaosAgent) {
        const sid = chaosAgent.sessionId ?? chaosAgent.session_id;
        if (sid) {
          this.scoringEngine.addBonus(sid, SCORING.CHAOS_AGENT_BONUS, "Chaos Agent");
          const p = players.get(sid);
          if (p) {
            (p as Record<string, unknown>).totalPoints = this.scoringEngine.getTotalPoints(sid);
          }
        }
      }

      const mvp = raw.mvpMoment ?? raw.mvp_moment;
      this.internal.bonusResult = {
        bestAction: {
          sessionId: bestAction?.sessionId ?? bestAction?.session_id ?? "",
          reason: bestAction?.reason ?? "",
          points: SCORING.BEST_ACTION_BONUS,
        },
        chaosAgent: {
          sessionId: chaosAgent?.sessionId ?? chaosAgent?.session_id ?? "",
          reason: chaosAgent?.reason ?? "",
          points: SCORING.CHAOS_AGENT_BONUS,
        },
        mvpMoment: {
          description: mvp?.description ?? "An unforgettable adventure!",
        },
      };
    } catch (error) {
      console.warn("AI bonus judging failed:", error);
      this.internal.bonusResult = null;
    }

    // Broadcast reveal with all secret objectives
    const roleReveals: Record<
      string,
      { roleName: string; secretObjective: string; progress: number }
    > = {};
    players.forEach((player: Record<string, unknown>, key: string) => {
      const roleData = this.internal.playerRoles.get(key);
      roleReveals[key] = {
        roleName: roleData?.roleName ?? "Unknown",
        secretObjective: roleData?.secretObjective ?? "",
        progress: (player.progressOrCustomInt as number) || 0,
      };
    });

    room.broadcast("game-data", {
      type: "reveal",
      roleReveals,
      bonuses: this.internal.bonusResult,
      leaderboard: this.getLeaderboard(state),
    });

    // Timer before final scores
    this.startPhaseTimer(room, "reveal", this.internal.complexity, () => {
      this.setPhase(state, "final-scores");
      this._showFinalScores(room, state);
    });
  }

  private _showFinalScores(room: Room, state: Schema): void {
    const leaderboard = this.getLeaderboard(state);
    room.broadcast("game-data", {
      type: "final-scores",
      leaderboard,
    });
  }
}

export function createWorldBuilderPlugin(): WorldBuilderPlugin {
  return new WorldBuilderPlugin();
}
