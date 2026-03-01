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
  type RoundNarrationResult,
  type WorldState,
} from "@partyline/shared";
import type { Client, Room } from "colyseus";
import { SCORING, clampRoundPoints } from "./scoring";
import {
  type WorldBuilderInternalState,
  createInitialInternalState,
  validateAction,
} from "./state";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "world-builder")!;

export class WorldBuilderPlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: WorldBuilderInternalState;

  private _broadcastHost(room: Room, state: Schema, payload: Record<string, unknown>): void {
    const s = state as unknown as Record<string, unknown>;
    room.broadcast("game-data", {
      gameId: this.manifest.id,
      phase: (s.phase as string) ?? (s.gamePhase as string) ?? "",
      round: (s.round as number) ?? 0,
      totalRounds: (s.totalRounds as number) ?? 0,
      payload,
    });
  }

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
    this.internal.currentSituation = this.internal.scenario.situation;

    // Ensure scenario is usable even if AI/fallback data is partial.
    if (!this.internal.scenario.setting.trim()) {
      this.internal.scenario.setting = "An uncharted world awaits.";
    }
    if (!this.internal.scenario.situation.trim()) {
      this.internal.scenario.situation =
        "A crisis unfolds. Work together (and against each other) to shape what happens next.";
      this.internal.currentSituation = this.internal.scenario.situation;
    }

    if (this.internal.scenario.roles.length < players.size) {
      const existing = this.internal.scenario.roles.length;
      for (let i = existing; i < players.size; i++) {
        this.internal.scenario.roles.push({
          roleName: `Adventurer ${i + 1}`,
          publicIdentity: "A capable traveler with a mysterious past",
          secretObjective: "Steer the story toward your own agenda",
          specialAbility: "Once per game: bend fate in your favor",
          scoringCriteria: "Earn points for creative, story-advancing choices",
        });
      }
    }

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
        abilityUsedRound: null,
        scoringCriteria: role.scoringCriteria,
      });
    }

    // Move to role reveal phase
    this.setPhase(state, "role-reveal");

    // Send private data to each player with their role + secret objective (skip host)
    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const [sessionId, roleData] of this.internal.playerRoles) {
      if (sessionId === hostId) continue;
      const client = room.clients.find((c: { sessionId: string }) => c.sessionId === sessionId);
      if (client) {
        room.send(client, "private-data", {
          role: roleData.roleName,
          publicIdentity: (players.get(sessionId) as Record<string, unknown> | undefined)
            ?.publicInfo,
          secretObjective: roleData.secretObjective,
          specialAbility: roleData.specialAbility,
          abilityId: "special",
          scoringCriteria: roleData.scoringCriteria,
        });
      }
    }

    // Broadcast scenario info for the host view
    this._broadcastHost(room, state, {
      setting: this.internal.scenario.setting,
      situation: this.internal.scenario.situation,
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

    if ((type === "player:ready" || type === "player-ready") && gamePhase === "role-reveal") {
      const player = players.get(client.sessionId);
      if (player) {
        (player as Record<string, unknown>).ready = true;
      }

      let active = 0;
      let readyCount = 0;
      // biome-ignore lint/complexity/noForEach: MapSchema does not reliably support for...of
      players.forEach((playerObj: Record<string, unknown>) => {
        if (playerObj.connected) {
          active++;
          if (playerObj.ready) readyCount++;
        }
      });

      if (active > 0 && readyCount >= active) {
        this.clearTimer();
        this._startRound(room, state);
      }
      return;
    }

    if ((type === "player:submit" || type === "submit-action") && gamePhase === "action-input") {
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

      // Update host with live submission progress
      const submittedPlayerIds: string[] = [];
      players.forEach((playerObj: Record<string, unknown>, key: string) => {
        if (playerObj.connected && playerObj.hasSubmitted) {
          submittedPlayerIds.push(key);
        }
      });
      this._broadcastHost(room, state, {
        narrative: this.internal.currentSituation || this.internal.scenario.situation,
        submittedPlayerIds,
        worldState: this.internal.worldState,
      });

      // Check if all players submitted
      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        await this._processActions(room, state);
      }
    } else if (
      (type === "player:use-ability" || type === "use-ability") &&
      gamePhase === "action-input"
    ) {
      const roleData = this.internal.playerRoles.get(client.sessionId);
      if (!roleData || roleData.abilityUsed) {
        room.send(client, "error", { message: "Ability already used or not available" });
        return;
      }
      roleData.abilityUsed = true;
      roleData.abilityUsedRound = this.internal.round;
      const p = players.get(client.sessionId) as Record<string, unknown> | undefined;
      if (p) {
        p.abilityOrCustomBool = true;
      }
      // Optional: could broadcast an effect to the host.
    } else if (type === "host:skip" || type === "host-skip") {
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

  onPlayerReconnect(room: Room, state: Schema, client: Client): void {
    const s = state as unknown as Record<string, unknown>;
    const phase = s.gamePhase as string;

    if (phase === "role-reveal" || phase === "action-input") {
      const roleData = this.internal?.playerRoles.get(client.sessionId);
      if (!roleData) return;
      const players = s.players as MapSchema;
      const player = players.get(client.sessionId);
      room.send(client, "private-data", {
        role: roleData.roleName,
        publicIdentity: (player as Record<string, unknown> | undefined)?.publicInfo,
        secretObjective: roleData.secretObjective,
        specialAbility: roleData.specialAbility,
        abilityId: "special",
        scoringCriteria: roleData.scoringCriteria,
      });
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
    const currentPhase = s.gamePhase as string;
    if (currentPhase === "action-input" || currentPhase === "ai-narrating") {
      return;
    }

    this.internal.round++;
    s.round = this.internal.round;

    this.internal.playerActions.clear();
    this.resetSubmissions(state);
    this.setPhase(state, "action-input");

    this._broadcastHost(room, state, {
      narrative: this.internal.currentSituation || this.internal.scenario.situation,
      submittedPlayerIds: [],
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
    this._broadcastHost(room, state, {});

    // Collect actions, using defaults for non-submitters
    const playerActions: { sessionId: string; name: string; role: string; action: string }[] = [];
    players.forEach((player: Record<string, unknown>, key: string) => {
      if (!player.connected) return;

      const roleData = this.internal.playerRoles.get(key);
      const specialAbility = roleData?.specialAbility ?? "";
      const existing = this.internal.playerActions.get(key);

      const baseAction = existing?.action ?? "watches cautiously and does nothing";
      const abilityThisRound =
        roleData?.abilityUsedRound === this.internal.round && specialAbility.trim().length > 0;
      const abilityNote = abilityThisRound ? ` (uses special ability: ${specialAbility})` : "";

      playerActions.push({
        sessionId: key,
        name: (existing?.name ?? (player.name as string)) as string,
        role: existing?.role ?? roleData?.roleName ?? "Unknown",
        action: `${baseAction}${abilityNote}`,
      });
    });

    // Generate narration via AI
    let narrationResult: RoundNarrationResult;
    const clampProgressDelta = (delta: unknown): number => {
      const value = typeof delta === "number" ? delta : 0;
      if (!Number.isFinite(value)) return 0;
      return Math.max(-1, Math.min(1, Math.trunc(value)));
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
      const rawOutcomes = (raw.playerOutcomes ?? raw.player_outcomes ?? []).map((o) => ({
        sessionId: o.sessionId ?? o.session_id ?? "",
        narration: o.narration,
        points: clampRoundPoints(o.points),
        progressDelta: clampProgressDelta(o.progressDelta ?? o.progress_delta ?? 0),
        reason: o.reason,
      }));

      const outcomeBySessionId = new Map(
        rawOutcomes.filter((o) => Boolean(o.sessionId)).map((o) => [o.sessionId, o] as const),
      );

      const completeOutcomes = playerActions
        .filter((a) => Boolean(a.sessionId))
        .map((a) => {
          const existing = outcomeBySessionId.get(a.sessionId);
          if (existing) return existing;
          return {
            sessionId: a.sessionId,
            narration: `${a.name} ${a.action}.`,
            points: SCORING.DEFAULT_ROUND_POINTS,
            progressDelta: 0,
            reason: "Participation points",
          };
        });

      const worldStateUpdate = (raw.worldStateUpdate ?? raw.world_state_update ?? {}) as Record<
        string,
        unknown
      >;

      narrationResult = {
        narration: raw.narration,
        playerOutcomes: completeOutcomes,
        worldStateUpdate: worldStateUpdate as Partial<WorldState>,
        dramaticTwist: raw.dramaticTwist ?? raw.dramatic_twist,
      };
    } catch (error) {
      console.warn("AI narration failed, using default:", error);
      narrationResult = {
        narration: `Round ${this.internal.round}: The adventurers make their moves. ${playerActions.map((a) => `${a.name} ${a.action}.`).join(" ")} The situation evolves...`,
        playerOutcomes: playerActions.map((a) => ({
          sessionId: a.sessionId,
          narration: `${a.name} ${a.action}.`,
          points: SCORING.DEFAULT_ROUND_POINTS,
          reason: "Participation points",
          progressDelta: 0,
        })),
        worldStateUpdate: {},
      };
    }

    // Store narration
    this.internal.narrations.push(narrationResult.narration);
    this.internal.actionHistory.push({
      narration: narrationResult.narration,
      actions: playerActions.map((a) => ({
        sessionId: a.sessionId,
        name: a.name,
        role: a.role,
        action: a.action,
      })),
    });

    // Award points
    const progressStep =
      this.internal.totalRounds > 0 ? Math.ceil(100 / this.internal.totalRounds) : 0;
    for (const outcome of narrationResult.playerOutcomes) {
      if (outcome.sessionId) {
        this.addPoints(state, outcome.sessionId, outcome.points, outcome.reason);

        // Update progress on player schema
        const player = players.get(outcome.sessionId);
        if (player) {
          const p = player as Record<string, unknown>;
          const currentProgress =
            typeof p.progressOrCustomInt === "number" && Number.isFinite(p.progressOrCustomInt)
              ? (p.progressOrCustomInt as number)
              : 0;
          const nextProgress = Math.max(
            0,
            Math.min(100, currentProgress + (outcome.progressDelta ?? 0) * progressStep),
          );
          p.progressOrCustomInt = nextProgress;
        }
      }
    }

    // Update world state
    if (narrationResult.worldStateUpdate) {
      const update = narrationResult.worldStateUpdate as unknown as Record<string, unknown>;
      const toStringArray = (value: unknown): string[] | null => {
        if (!Array.isArray(value)) return null;
        return value.filter((v): v is string => typeof v === "string");
      };

      const threats = toStringArray(update.threats);
      if (threats !== null) this.internal.worldState.threats = threats;

      const opportunities = toStringArray(update.opportunities);
      if (opportunities !== null) this.internal.worldState.opportunities = opportunities;

      const newDevelopments = toStringArray(update.newDevelopments ?? update.new_developments);
      if (newDevelopments !== null) this.internal.worldState.newDevelopments = newDevelopments;

      if (typeof update.location === "string") {
        this.internal.worldState.location = update.location;
      }

      const timePressure = update.timePressure ?? update.time_pressure;
      if (typeof timePressure === "string") {
        this.internal.worldState.timePressure = timePressure;
      }

      const keyResources = toStringArray(update.keyResources ?? update.key_resources);
      if (keyResources !== null) {
        this.internal.worldState.keyResources = keyResources;
      }

      if (Array.isArray(update.npcs)) {
        this.internal.worldState.npcs = (update.npcs as unknown[])
          .filter((n): n is Record<string, unknown> => Boolean(n) && typeof n === "object")
          .map((n) => ({
            name: typeof n.name === "string" ? n.name : "",
            role: typeof n.role === "string" ? n.role : "",
            disposition: typeof n.disposition === "string" ? n.disposition : "",
            status: typeof n.status === "string" ? n.status : undefined,
          }))
          .filter((n) => n.name && n.role && n.disposition);
      }
    }

    const developments = this.internal.worldState.newDevelopments ?? [];
    const nextSituation =
      typeof narrationResult.dramaticTwist === "string" && narrationResult.dramaticTwist.trim()
        ? narrationResult.dramaticTwist.trim()
        : developments.length > 0
          ? developments.slice(0, 2).join(" ")
          : narrationResult.narration;

    this.internal.currentSituation = nextSituation;
    this.internal.scenario.situation = nextSituation;

    this.internal.roundResults.push({
      narration: narrationResult.narration,
      playerOutcomes: narrationResult.playerOutcomes.map((o) => ({
        sessionId: o.sessionId,
        narration: o.narration ?? "",
        points: o.points,
        progressDelta: o.progressDelta,
        reason: o.reason,
      })),
      worldStateUpdate: narrationResult.worldStateUpdate,
      dramaticTwist: narrationResult.dramaticTwist,
    });

    // Broadcast narration for the host
    this.setPhase(state, "narration-display");
    this._broadcastHost(room, state, {
      narration: narrationResult.narration,
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
        player.score = this.scoringEngine.getTotalPoints(key);
      }
    });

    // Try AI bonus judging
    try {
      const rounds =
        this.internal.actionHistory.length > 0
          ? this.internal.actionHistory.map((r) => ({
              narration: r.narration,
              actions: r.actions.map((a) => ({
                sessionId: a.sessionId,
                name: a.name,
                action: a.action,
              })),
            }))
          : this.internal.narrations.map((narration, i) => {
              const roundActions: { sessionId: string; name: string; action: string }[] = [];
              players.forEach((player: Record<string, unknown>, key: string) => {
                roundActions.push({
                  sessionId: key,
                  name: player.name as string,
                  action: `(round ${i + 1} action)`,
                });
              });
              return { narration, actions: roundActions };
            });

      const gameHistory = {
        scenario: {
          setting: this.internal.scenario.setting,
          situation: this.internal.scenario.situation,
        },
        rounds,
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
            (p as Record<string, unknown>).score = this.scoringEngine.getTotalPoints(sid);
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
            (p as Record<string, unknown>).score = this.scoringEngine.getTotalPoints(sid);
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
      const rawProgress = (player.progressOrCustomInt as number) || 0;
      const progress = Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : 0;
      roleReveals[key] = {
        roleName: roleData?.roleName ?? "Unknown",
        secretObjective: roleData?.secretObjective ?? "",
        progress,
      };
    });

    this._broadcastHost(room, state, {
      roleReveals,
      bonusAwards: this.internal.bonusResult ?? undefined,
      worldState: this.internal.worldState,
    });

    // Timer before final scores
    this.startPhaseTimer(room, "reveal", this.internal.complexity, () => {
      this.setPhase(state, "final-scores");
      this._showFinalScores(room, state);
    });
  }

  private _showFinalScores(room: Room, state: Schema): void {
    this._broadcastHost(room, state, {
      bonusAwards: this.internal.bonusResult ?? undefined,
    });
  }
}

export function createWorldBuilderPlugin(): WorldBuilderPlugin {
  return new WorldBuilderPlugin();
}
