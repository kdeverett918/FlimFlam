import type { Schema } from "@colyseus/schema";
import type { MapSchema } from "@colyseus/schema";
import { BaseGamePlugin } from "@flimflam/game-engine";
import type { Complexity, GameManifest } from "@flimflam/shared";
import {
  COMPLEXITY_TIMER_MULTIPLIERS,
  DEFAULT_PHASE_TIMERS,
  fuzzyMatch,
  shuffleInPlace,
} from "@flimflam/shared";
import type { Client, Room } from "colyseus";
import {
  ADVANCED_SURVEYS,
  KIDS_SURVEYS,
  STANDARD_SURVEYS,
  type Survey,
  type SurveyAnswer,
} from "./content/survey-bank";

// ─── Constants ──────────────────────────────────────────────────────

const FUZZY_THRESHOLD = 0.7;
const MAX_STRIKES = 3;
const LIGHTNING_QUESTION_COUNT = 5;
const LIGHTNING_BONUS_THRESHOLD = 200;
const LIGHTNING_BONUS_POINTS = 10_000;
const GUESS_ALONG_BONUS_POINTS = 150;

const ROUND_COUNTS: Record<Complexity, number> = {
  kids: 3,
  standard: 4,
  advanced: 5,
};

const PHASE_REVEAL_DELAY_MS = 3_000;
const ANSWER_REVEAL_DELAY_MS = 5_000;
const ROUND_RESULT_DELAY_MS = 5_000;
const LIGHTNING_REVEAL_DELAY_MS = 8_000;
const SURVEY_SMASH_E2E_OPENING_MIN_MS = 3_000;
const SURVEY_SMASH_E2E_INTERACTION_MIN_MS = 4_000;
const SURVEY_SMASH_E2E_REVEAL_MIN_MS = 1_500;
const SURVEY_SMASH_E2E_LIGHTNING_INTERACTION_MIN_MS = 15_000;
const SURVEY_SMASH_E2E_LIGHTNING_REVEAL_MIN_MS = 2_500;

// ─── Types ──────────────────────────────────────────────────────────

type SurveySmashPhase =
  | "question-reveal"
  | "face-off"
  | "guessing"
  | "strike"
  | "steal-chance"
  | "answer-reveal"
  | "round-result"
  | "lightning-round"
  | "lightning-round-reveal"
  | "final-scores";

interface TeamInfo {
  id: string; // "team-a", "team-b", or sessionId for FFA
  members: string[]; // session IDs
  score: number;
}

interface RevealedAnswer {
  text: string;
  points: number;
  rank: number;
}

interface FaceOffEntry {
  sessionId: string;
  answer: string;
  matchedRank: number | null;
}

interface FastMoneyAnswer {
  question: string;
  answer: string;
  points: number;
  matched: boolean;
}

interface RoundGuessEntry {
  sessionId: string;
  answer: string;
  source: "face-off" | "guessing" | "steal";
  outcome: "match" | "miss" | "duplicate";
  matchedRank: number | null;
}

// ─── Game State (internal, not a Colyseus Schema) ───────────────────

interface SurveySmashInternalState {
  complexity: Complexity;
  teamMode: boolean;
  teams: TeamInfo[];
  playerTeamMap: Map<string, string>; // sessionId -> teamId

  allSurveys: Survey[];
  usedSurveyIndices: Set<number>;
  currentSurveyIndex: number;
  currentSurvey: Survey | null;
  round: number;
  totalRounds: number;

  phase: SurveySmashPhase;
  revealedAnswers: RevealedAnswer[];
  strikes: number;
  controllingTeamId: string;
  roundPoints: number;

  // Face-off
  faceOffPlayers: string[];
  faceOffEntries: FaceOffEntry[];
  faceOffResolved: boolean;

  // Guessing rotation
  guessingOrder: string[];
  currentGuesserIndex: number;
  roundGuesses: RoundGuessEntry[];
  guessAlongGuesses: Map<string, string>;
  guessAlongEligible: number;
  guessAlongSubmissions: number;
  guessAlongPoints: Map<string, number>;
  lastGuessAlongWinners: string[];
  lastGuessAlongAnswer: string | null;

  // Steal
  stealTeamId: string;

  // Lightning round
  lightningPlayerId: string;
  lightningQuestions: Survey[];
  lightningCurrentIndex: number;
  lightningAnswers: FastMoneyAnswer[];
  lightningTotalPoints: number;

  // Track all player session IDs (excluding host)
  allPlayerIds: string[];
}

// ─── Helper: pick a survey we haven't used yet ──────────────────────

function pickUnusedSurvey(state: SurveySmashInternalState): Survey | null {
  const available: number[] = [];
  for (let i = 0; i < state.allSurveys.length; i++) {
    if (!state.usedSurveyIndices.has(i)) {
      available.push(i);
    }
  }
  if (available.length === 0) return null;
  shuffleInPlace(available);
  const idx = available[0];
  if (idx === undefined) return null;
  state.usedSurveyIndices.add(idx);
  state.currentSurveyIndex = idx;
  return state.allSurveys[idx] ?? null;
}

// ─── Helper: find matching answer ───────────────────────────────────

function findMatchingAnswer(
  guess: string,
  survey: Survey,
  revealed: RevealedAnswer[],
): SurveyAnswer | null {
  const revealedTexts = new Set(revealed.map((r) => r.text.toLowerCase()));
  for (const answer of survey.answers) {
    if (revealedTexts.has(answer.text.toLowerCase())) continue;
    if (fuzzyMatch(guess, answer.text, FUZZY_THRESHOLD)) {
      return answer;
    }
  }
  return null;
}

// ─── Helper: build host game data payload ───────────────────────────

function buildHostData(gs: SurveySmashInternalState): Record<string, unknown> {
  return {
    type: "game-state",
    action: "survey-smash-state",
    phase: gs.phase,
    round: gs.round,
    totalRounds: gs.totalRounds,
    teamMode: gs.teamMode,
    teams: gs.teams.map((t) => ({
      id: t.id,
      members: t.members,
      score: t.score,
    })),
    question: gs.currentSurvey?.question ?? "",
    answerCount: gs.currentSurvey?.answers.length ?? 0,
    revealedAnswers: gs.revealedAnswers,
    strikes: gs.strikes,
    controllingTeamId: gs.controllingTeamId,
    faceOffPlayers: gs.faceOffPlayers,
    faceOffEntries: gs.faceOffEntries.map((e) => ({
      sessionId: e.sessionId,
      answer: e.answer,
      matchedRank: e.matchedRank,
    })),
    guessingOrder: gs.guessingOrder,
    currentGuesserIndex: gs.currentGuesserIndex,
    roundGuesses: gs.phase === "round-result" ? gs.roundGuesses : [],
    stealTeamId: gs.stealTeamId,
    lightningPlayerId: gs.lightningPlayerId,
    lightningCurrentIndex: gs.lightningCurrentIndex,
    lightningQuestionCount: gs.lightningQuestions.length,
    lightningAnswers: gs.lightningAnswers,
    lightningTotalPoints: gs.lightningTotalPoints,
    guessAlongEligible: gs.guessAlongEligible,
    guessAlongSubmissions: gs.guessAlongSubmissions,
    guessAlongPoints: gs.allPlayerIds.map((sessionId) => ({
      sessionId,
      points: gs.guessAlongPoints.get(sessionId) ?? 0,
    })),
    lastGuessAlongWinners: gs.lastGuessAlongWinners,
    lastGuessAlongAnswer: gs.lastGuessAlongAnswer,
    allAnswers:
      gs.phase === "answer-reveal" ||
      gs.phase === "lightning-round-reveal" ||
      gs.phase === "round-result"
        ? (gs.currentSurvey?.answers ?? [])
        : [],
  };
}

export const buildPublicGameView = buildHostData;

// ─── Team assignment helpers (exported for testing) ─────────────────

export function assignTeams(
  playerIds: string[],
  teamMode: boolean,
): { teams: TeamInfo[]; playerTeamMap: Map<string, string> } {
  const teams: TeamInfo[] = [];
  const playerTeamMap = new Map<string, string>();

  if (teamMode) {
    const shuffled = [...playerIds];
    shuffleInPlace(shuffled);
    const teamA: TeamInfo = { id: "team-a", members: [], score: 0 };
    const teamB: TeamInfo = { id: "team-b", members: [], score: 0 };

    for (let i = 0; i < shuffled.length; i++) {
      const pid = shuffled[i];
      if (pid === undefined) continue;
      if (i % 2 === 0) {
        teamA.members.push(pid);
        playerTeamMap.set(pid, "team-a");
      } else {
        teamB.members.push(pid);
        playerTeamMap.set(pid, "team-b");
      }
    }
    teams.push(teamA, teamB);
  } else {
    // FFA: each player is their own "team"
    for (const pid of playerIds) {
      teams.push({ id: pid, members: [pid], score: 0 });
      playerTeamMap.set(pid, pid);
    }
  }

  return { teams, playerTeamMap };
}

export function pickFaceOffPlayers(gs: SurveySmashInternalState): string[] {
  if (gs.teamMode) {
    const teamA = gs.teams.find((t) => t.id === "team-a");
    const teamB = gs.teams.find((t) => t.id === "team-b");
    if (!teamA || !teamB) return [];
    // Rotate through team members each round
    const aIdx = (gs.round - 1) % teamA.members.length;
    const bIdx = (gs.round - 1) % teamB.members.length;
    const a = teamA.members[aIdx];
    const b = teamB.members[bIdx];
    if (a === undefined || b === undefined) return [];
    return [a, b];
  }
  // FFA: pick 2 random players
  const shuffled = [...gs.allPlayerIds];
  shuffleInPlace(shuffled);
  const result: string[] = [];
  if (shuffled[0] !== undefined) result.push(shuffled[0]);
  if (shuffled[1] !== undefined) result.push(shuffled[1]);
  return result;
}

export function pickLightningPlayerId(
  playerIds: string[],
  getScore: (playerId: string) => number,
  options?: { activePlayerIds?: string[]; hostSessionId?: string | null },
): string {
  const activeSet = new Set(options?.activePlayerIds ?? []);
  const hostSessionId = options?.hostSessionId ?? null;
  const activePlayers = playerIds.filter((pid) => activeSet.size === 0 || activeSet.has(pid));
  const preferredPlayers = activePlayers.filter((pid) => pid !== hostSessionId);
  const candidates =
    preferredPlayers.length > 0
      ? preferredPlayers
      : activePlayers.length > 0
        ? activePlayers
        : playerIds;

  let topPid = candidates[0] ?? "";
  let topScore = topPid ? getScore(topPid) : -1;
  for (const pid of candidates) {
    const score = getScore(pid);
    if (score > topScore) {
      topScore = score;
      topPid = pid;
    }
  }
  return topPid;
}

// ─── Plugin ──────────────────────────────────────────────────────────

class SurveySmashPlugin extends BaseGamePlugin {
  manifest: GameManifest = {
    id: "survey-smash",
    name: "Survey Smash",
    description:
      "Guess what the crowd thinks! Match the top answers and snag points from your rivals!",
    minPlayers: 2,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["survey", "teams", "classic"],
    icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
  };

  private gs: SurveySmashInternalState = this._freshState();
  private _room: Room | null = null;
  private _roomState: Schema | null = null;
  private _phaseTimeout: { clear: () => void } | null = null;
  private _lastHostSkipAt = 0;

  private _freshState(): SurveySmashInternalState {
    return {
      complexity: "standard",
      teamMode: false,
      teams: [],
      playerTeamMap: new Map(),
      allSurveys: [],
      usedSurveyIndices: new Set(),
      currentSurveyIndex: -1,
      currentSurvey: null,
      round: 0,
      totalRounds: 4,
      phase: "question-reveal",
      revealedAnswers: [],
      strikes: 0,
      controllingTeamId: "",
      roundPoints: 0,
      faceOffPlayers: [],
      faceOffEntries: [],
      faceOffResolved: false,
      guessingOrder: [],
      currentGuesserIndex: 0,
      roundGuesses: [],
      guessAlongGuesses: new Map(),
      guessAlongEligible: 0,
      guessAlongSubmissions: 0,
      guessAlongPoints: new Map(),
      lastGuessAlongWinners: [],
      lastGuessAlongAnswer: null,
      stealTeamId: "",
      lightningPlayerId: "",
      lightningQuestions: [],
      lightningCurrentIndex: 0,
      lightningAnswers: [],
      lightningTotalPoints: 0,
      allPlayerIds: [],
    };
  }

  createState(): Schema {
    // We use the shared RoomState from PartyRoom; no custom Schema needed.
    // All game-specific data is sent via room.broadcast("game-data", ...) and
    // room.send(client, "private-data", ...).
    return null as unknown as Schema;
  }

  async onGameStart(
    room: Room,
    state: Schema,
    players: MapSchema,
    complexity: Complexity,
  ): Promise<void> {
    this._room = room;
    this._roomState = state;
    this._lastHostSkipAt = 0;
    this.gs = this._freshState();
    this.gs.complexity = complexity;

    // Parse game options for teamMode
    const rawOpts = (state as unknown as Record<string, unknown>).gameOptions;
    if (typeof rawOpts === "string" && rawOpts.trim()) {
      try {
        const parsed = JSON.parse(rawOpts) as Record<string, unknown>;
        if (parsed.teamMode === true) {
          this.gs.teamMode = true;
        }
      } catch {
        // ignore invalid JSON
      }
    }

    // Collect player IDs
    const playerIds: string[] = [];
    players.forEach((_player: unknown, key: string) => {
      playerIds.push(key);
    });
    this.gs.allPlayerIds = playerIds;

    // Build survey pool
    switch (complexity) {
      case "kids":
        this.gs.allSurveys = [...KIDS_SURVEYS];
        break;
      case "advanced":
        this.gs.allSurveys = [...ADVANCED_SURVEYS];
        break;
      default:
        this.gs.allSurveys = [...STANDARD_SURVEYS];
        break;
    }

    this.gs.totalRounds = ROUND_COUNTS[complexity];
    this.setRoomRound(state, 0, this.gs.totalRounds);

    // Assign teams
    const { teams, playerTeamMap } = assignTeams(playerIds, this.gs.teamMode);
    this.gs.teams = teams;
    this.gs.playerTeamMap = playerTeamMap;

    // Set player roles on the schema
    players.forEach((player: unknown, key: string) => {
      const p = player as Record<string, unknown>;
      const teamId = playerTeamMap.get(key) ?? "free";
      p.role = teamId;
    });

    // Init scoring engine
    players.forEach((player: unknown, key: string) => {
      const p = player as Record<string, unknown>;
      this.scoringEngine.initPlayer(key, p.name as string);
      this.gs.guessAlongPoints.set(key, 0);
    });

    // Start first round
    this._startRound(room, state);
  }

  async onPlayerMessage(
    room: Room,
    state: Schema,
    client: Client,
    type: string,
    data: unknown,
  ): Promise<void> {
    // Handle host-specific messages (e.g., host:skip forwarded by PartyRoom)
    if (type.startsWith("host:")) {
      this._handleHostMessage(room, state, client, type, data);
      return;
    }

    switch (this.gs.phase) {
      case "face-off":
        if (type === "player:submit" || type === "player:buzz") {
          this._handleFaceOffAnswer(room, state, client, data);
        }
        break;
      case "guessing":
        if (type === "player:submit") {
          this._handleGuess(room, state, client, data);
        } else if (type === "player:guess-along") {
          this._handleGuessAlong(room, client, data);
        }
        break;
      case "steal-chance":
        if (type === "player:submit") {
          this._handleStealGuess(room, state, client, data);
        }
        break;
      case "lightning-round":
        if (type === "player:submit") {
          this._handleLightningAnswer(room, state, client, data);
        }
        break;
      default:
        break;
    }
  }

  onPlayerLeave(room: Room, state: Schema, sessionId: string, consented: boolean): void {
    super.onPlayerLeave(room, state, sessionId, consented);

    // Handle active-player disconnect during critical phases
    if (this.gs.phase === "guessing") {
      const currentGuesser = this.gs.guessingOrder[this.gs.currentGuesserIndex];
      if (sessionId === currentGuesser) {
        // Current guesser disconnected — treat as a strike
        this._recordStrike(room, state);
      }
    } else if (this.gs.phase === "face-off") {
      if (this.gs.faceOffPlayers.includes(sessionId) && !this.gs.faceOffResolved) {
        // Check if all face-off players have either submitted or disconnected
        const allResolved = this.gs.faceOffPlayers.every((pid) => {
          if (this.gs.faceOffEntries.some((e) => e.sessionId === pid)) return true;
          if (!this.isPlayerConnected(state, pid)) return true; // disconnected
          return false;
        });
        if (allResolved) {
          this._resolveFaceOff(room, state);
        }
      }
    } else if (this.gs.phase === "lightning-round") {
      if (sessionId === this.gs.lightningPlayerId) {
        // Lightning player disconnected — record no-answer for remaining questions and finish
        this._clearPhaseTiming(state);
        const q = this.gs.lightningQuestions[this.gs.lightningCurrentIndex];
        if (q) {
          this.gs.lightningAnswers.push({
            question: q.question,
            answer: "(disconnected)",
            points: 0,
            matched: false,
          });
        }
        this._advanceLightning(room);
      }
    }
  }

  onPlayerReconnect(room: Room, _state: Schema, client: Client): void {
    // Re-send full state to reconnected player
    this._sendPrivateToPlayer(room, client.sessionId, {
      action: "survey-smash-reconnect",
      phase: this.gs.phase,
      round: this.gs.round,
      totalRounds: this.gs.totalRounds,
      question: this.gs.currentSurvey?.question ?? "",
      revealedAnswers: this.gs.revealedAnswers,
      strikes: this.gs.strikes,
      controllingTeamId: this.gs.controllingTeamId,
      teams: this.gs.teams.map((t) => ({ id: t.id, members: t.members, score: t.score })),
    });
  }

  isGameOver(_state: Schema): boolean {
    return this.gs.phase === "final-scores";
  }

  getScores(_state: Schema): Map<string, number> {
    const scores = new Map<string, number>();
    for (const pid of this.gs.allPlayerIds) {
      scores.set(pid, this.scoringEngine.getTotalPoints(pid));
    }
    return scores;
  }

  // ─── Private: Room State Helpers ────────────────────────────────────

  private setRoomRound(state: Schema, round: number, total: number): void {
    const s = state as unknown as Record<string, unknown>;
    s.round = round;
    s.totalRounds = total;
  }

  private _broadcastGameData(room: Room): void {
    room.broadcast("game-data", buildHostData(this.gs));
  }

  private _sendPrivateData(room: Room, client: Client, payload: Record<string, unknown>): void {
    client.send("private-data", payload);
  }

  private _buildPlayerContext(sessionId: string): Record<string, unknown> {
    const teamId = this.gs.playerTeamMap.get(sessionId) ?? "";
    const team = this.gs.teams.find((t) => t.id === teamId);
    return {
      teamMode: this.gs.teamMode,
      yourTeamId: teamId,
      teamMembers: team?.members ?? [],
      guessAlongPoints: this.gs.guessAlongPoints.get(sessionId) ?? 0,
    };
  }

  private _sendPrivateToPlayer(
    room: Room,
    sessionId: string,
    payload: Record<string, unknown>,
  ): void {
    const clients = (room as unknown as { clients: Client[] }).clients;
    for (const c of clients) {
      if (c.sessionId === sessionId) {
        this._sendPrivateData(room, c, { ...this._buildPlayerContext(sessionId), ...payload });
        break;
      }
    }
  }

  private _sendPrivateToTeam(room: Room, teamId: string, payload: Record<string, unknown>): void {
    const team = this.gs.teams.find((t) => t.id === teamId);
    if (!team) return;
    for (const pid of team.members) {
      this._sendPrivateToPlayer(room, pid, payload);
    }
  }

  private _refreshPrivateActions(room: Room): void {
    const roomState = this._roomState;
    const activePlayers = roomState ? new Set(this.getActivePlayers(roomState)) : null;
    const currentGuesser = this.gs.guessingOrder[this.gs.currentGuesserIndex] ?? null;
    const currentLightningQuestion = this.gs.lightningQuestions[this.gs.lightningCurrentIndex];

    for (const pid of this.gs.allPlayerIds) {
      const payload: Record<string, unknown> = {
        action: null,
        question: this.gs.currentSurvey?.question ?? "",
      };

      switch (this.gs.phase) {
        case "face-off":
          if (this.gs.faceOffPlayers.includes(pid)) {
            payload.action = "face-off-your-turn";
          }
          break;
        case "guessing":
          if (pid === currentGuesser) {
            payload.action = "your-turn-to-guess";
            payload.revealedAnswers = this.gs.revealedAnswers;
            payload.strikes = this.gs.strikes;
          } else if (!activePlayers || activePlayers.has(pid)) {
            payload.action = "guess-along";
            payload.currentGuesserId = currentGuesser;
            payload.guessAlongSubmitted = this.gs.guessAlongGuesses.has(pid);
            if (this.gs.guessAlongGuesses.has(pid)) {
              payload.guessAlongGuess = this.gs.guessAlongGuesses.get(pid) ?? "";
            }
          }
          break;
        case "steal-chance":
          if ((this.gs.playerTeamMap.get(pid) ?? "") === this.gs.stealTeamId) {
            payload.action = "snag-your-turn";
            payload.revealedAnswers = this.gs.revealedAnswers;
          }
          break;
        case "lightning-round":
          if (pid === this.gs.lightningPlayerId && currentLightningQuestion) {
            payload.action = "lightning-question";
            payload.question = currentLightningQuestion.question;
            payload.questionIndex = this.gs.lightningCurrentIndex;
            payload.totalQuestions = this.gs.lightningQuestions.length;
          }
          break;
        default:
          break;
      }

      this._sendPrivateToPlayer(room, pid, payload);
    }
  }

  private _clearPhaseTimeout(): void {
    if (this._phaseTimeout !== null) {
      this._phaseTimeout.clear();
      this._phaseTimeout = null;
    }
  }

  private _clearPhaseTiming(state?: Schema | null): void {
    this.clearTimer();
    this._clearPhaseTimeout();
    if (state) {
      this.setTimerEndsAt(state, 0);
    }
  }

  private _getScaledDelay(delayMs: number, minE2eMs = 0): number {
    const rawScale = process.env.FLIMFLAM_TIMER_SCALE;
    const scale = rawScale ? Number(rawScale) : 1;
    const safeScale = Number.isFinite(scale) && scale > 0 ? Math.min(Math.max(scale, 0.01), 10) : 1;
    const scaledDelay = Math.max(250, Math.round(delayMs * safeScale));
    const shouldApplyE2eFloor =
      process.env.FLIMFLAM_E2E === "1" ||
      process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1" ||
      (rawScale !== undefined && safeScale < 1);
    if (shouldApplyE2eFloor) {
      return Math.max(scaledDelay, minE2eMs);
    }
    return scaledDelay;
  }

  private _startManagedPhaseTimer(
    room: Room,
    state: Schema,
    phaseKey: string,
    complexity: Complexity,
    onExpiry: () => void,
    minE2eMs = 0,
  ): void {
    this._clearPhaseTiming(state);
    const baseMs = DEFAULT_PHASE_TIMERS[phaseKey] ?? 30_000;
    const multiplier = COMPLEXITY_TIMER_MULTIPLIERS[complexity] ?? 1;
    const durationMs = this._getScaledDelay(baseMs * multiplier, minE2eMs);
    this.setTimerEndsAt(state, Date.now() + durationMs);
    this._phaseTimeout = room.clock.setTimeout(() => {
      this._phaseTimeout = null;
      this.setTimerEndsAt(state, 0);
      onExpiry();
    }, durationMs);
  }

  private _scheduleTimeout(
    delayMs: number,
    callback: () => void,
    options?: { state?: Schema | null; minE2eMs?: number },
  ): void {
    const state = options?.state ?? this._roomState;
    this._clearPhaseTiming(state);
    if (!this._room) return;
    const scaledDelay = this._getScaledDelay(delayMs, options?.minE2eMs ?? 0);
    this._phaseTimeout = this._room.clock.setTimeout(() => {
      this._phaseTimeout = null;
      if (state) {
        this.setTimerEndsAt(state, 0);
      }
      callback();
    }, scaledDelay);
  }

  private _recordRoundGuess(entry: RoundGuessEntry): void {
    this.gs.roundGuesses.push(entry);
    if (this.gs.roundGuesses.length > 16) {
      this.gs.roundGuesses = this.gs.roundGuesses.slice(-16);
    }
  }

  // ─── Phase Transitions ─────────────────────────────────────────────

  private _startRound(room: Room, state: Schema): void {
    this.gs.round++;
    this.setRoomRound(state, this.gs.round, this.gs.totalRounds);

    const survey = pickUnusedSurvey(this.gs);
    if (!survey) {
      // No surveys left, go to final scores or lightning round
      if (this.gs.complexity !== "kids") {
        this._startLightningRound(room, state);
      } else {
        this._goToFinalScores(room, state);
      }
      return;
    }

    this.gs.currentSurvey = survey;
    this.gs.revealedAnswers = [];
    this.gs.strikes = 0;
    this.gs.controllingTeamId = "";
    this.gs.roundPoints = 0;
    this.gs.faceOffPlayers = [];
    this.gs.faceOffEntries = [];
    this.gs.faceOffResolved = false;
    this.gs.guessingOrder = [];
    this.gs.currentGuesserIndex = 0;
    this.gs.roundGuesses = [];
    this.gs.guessAlongGuesses.clear();
    this.gs.guessAlongEligible = 0;
    this.gs.guessAlongSubmissions = 0;
    this.gs.lastGuessAlongWinners = [];
    this.gs.lastGuessAlongAnswer = null;
    this.gs.stealTeamId = "";

    this.resetSubmissions(state);

    // Question reveal
    this.gs.phase = "question-reveal";
    this.setPhase(state, "question-reveal");
    this._broadcastGameData(room);

    // After delay, move to face-off
    this._scheduleTimeout(
      PHASE_REVEAL_DELAY_MS,
      () => {
        this._startFaceOff(room, state);
      },
      { state, minE2eMs: SURVEY_SMASH_E2E_OPENING_MIN_MS },
    );
  }

  private _startFaceOff(room: Room, state: Schema): void {
    this.gs.phase = "face-off";
    this.gs.faceOffPlayers = pickFaceOffPlayers(this.gs);
    this.gs.faceOffEntries = [];
    this.gs.faceOffResolved = false;

    this.setPhase(state, "face-off");
    this.resetSubmissions(state);
    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    // Timer for face-off
    this._startManagedPhaseTimer(
      room,
      state,
      "ss-face-off",
      this.gs.complexity,
      () => {
        this._resolveFaceOff(room, state);
      },
      SURVEY_SMASH_E2E_INTERACTION_MIN_MS,
    );
  }

  private _handleFaceOffAnswer(room: Room, state: Schema, client: Client, data: unknown): void {
    if (this.gs.faceOffResolved) return;
    if (!this.gs.faceOffPlayers.includes(client.sessionId)) return;
    // Already submitted?
    if (this.gs.faceOffEntries.some((e) => e.sessionId === client.sessionId)) return;

    const content =
      typeof (data as Record<string, unknown>)?.content === "string"
        ? ((data as Record<string, unknown>).content as string)
        : "";

    if (!content.trim()) return;

    const survey = this.gs.currentSurvey;
    if (!survey) return;

    const matched = findMatchingAnswer(content, survey, []);
    this._recordRoundGuess({
      sessionId: client.sessionId,
      answer: content.trim(),
      source: "face-off",
      outcome: matched ? "match" : "miss",
      matchedRank: matched?.rank ?? null,
    });
    this.gs.faceOffEntries.push({
      sessionId: client.sessionId,
      answer: content,
      matchedRank: matched?.rank ?? null,
    });

    // Mark submitted on schema
    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    const player = players.get(client.sessionId);
    if (player) {
      (player as unknown as Record<string, unknown>).hasSubmitted = true;
    }

    this._broadcastGameData(room);

    // If both face-off players have answered, resolve
    if (this.gs.faceOffEntries.length >= this.gs.faceOffPlayers.length) {
      this._resolveFaceOff(room, state);
    }
  }

  private _resolveFaceOff(room: Room, state: Schema): void {
    if (this.gs.faceOffResolved) return;
    this.gs.faceOffResolved = true;
    this._clearPhaseTiming(state);

    // Find the entry with the best (lowest) rank
    let bestEntry: FaceOffEntry | null = null;
    for (const entry of this.gs.faceOffEntries) {
      if (entry.matchedRank !== null) {
        if (
          !bestEntry ||
          bestEntry.matchedRank === null ||
          entry.matchedRank < bestEntry.matchedRank
        ) {
          bestEntry = entry;
        }
      }
    }

    if (bestEntry) {
      // Reveal the matched answer
      const survey = this.gs.currentSurvey;
      if (survey) {
        const answer = survey.answers.find((a) => a.rank === bestEntry.matchedRank);
        if (answer) {
          this.gs.revealedAnswers.push({
            text: answer.text,
            points: answer.points,
            rank: answer.rank,
          });
          this.gs.roundPoints += answer.points;
        }
      }

      // Controlling team is the winner's team
      const winnerTeamId = this.gs.playerTeamMap.get(bestEntry.sessionId) ?? "";
      this.gs.controllingTeamId = winnerTeamId;
    } else {
      // No one got a match: randomly assign control to first face-off player's team
      const fallbackPid = this.gs.faceOffPlayers[0];
      if (fallbackPid) {
        this.gs.controllingTeamId = this.gs.playerTeamMap.get(fallbackPid) ?? "";
      }
    }

    // Check if all answers are revealed
    if (
      this.gs.currentSurvey &&
      this.gs.revealedAnswers.length >= this.gs.currentSurvey.answers.length
    ) {
      this._goToAnswerReveal(room, state);
      return;
    }

    // Move to guessing phase
    this._startGuessing(room, state);
  }

  private _startGuessing(room: Room, state: Schema): void {
    this.gs.phase = "guessing";
    this.setPhase(state, "guessing");

    // Build guessing order: members of controlling team
    const controlTeam = this.gs.teams.find((t) => t.id === this.gs.controllingTeamId);
    if (controlTeam) {
      this.gs.guessingOrder = [...controlTeam.members];
    } else {
      this.gs.guessingOrder = [];
    }
    if (this.gs.guessingOrder.length === 0) {
      this._goToAnswerReveal(room, state);
      return;
    }
    this.gs.currentGuesserIndex = 0;

    this.resetSubmissions(state);
    this._broadcastGameData(room);

    // Notify current guesser
    this._notifyCurrentGuesser(room);
    this._startGuessAlongWindow(room);
    this._refreshPrivateActions(room);

    // Timer
    this._startManagedPhaseTimer(
      room,
      state,
      "ss-guessing",
      this.gs.complexity,
      () => {
        // Time ran out for this guess: count as strike
        this._recordStrike(room, state);
      },
      SURVEY_SMASH_E2E_INTERACTION_MIN_MS,
    );
  }

  private _notifyCurrentGuesser(room: Room): void {
    const guesser = this.gs.guessingOrder[this.gs.currentGuesserIndex];
    if (guesser) {
      this._sendPrivateToPlayer(room, guesser, {
        action: "your-turn-to-guess",
        question: this.gs.currentSurvey?.question ?? "",
        revealedAnswers: this.gs.revealedAnswers,
        strikes: this.gs.strikes,
      });
    }
  }

  private _startGuessAlongWindow(room: Room): void {
    const currentGuesser = this.gs.guessingOrder[this.gs.currentGuesserIndex] ?? null;
    const roomState = this._roomState;
    const activePlayers = roomState ? new Set(this.getActivePlayers(roomState)) : null;
    const eligible = this.gs.allPlayerIds.filter((pid) => {
      if (pid === currentGuesser) return false;
      if (activePlayers) {
        return activePlayers.has(pid);
      }
      return true;
    });

    this.gs.guessAlongGuesses.clear();
    this.gs.guessAlongEligible = eligible.length;
    this.gs.guessAlongSubmissions = 0;

    this._broadcastGameData(room);
  }

  private _clearGuessAlongWindow(): void {
    this.gs.guessAlongGuesses.clear();
    this.gs.guessAlongEligible = 0;
    this.gs.guessAlongSubmissions = 0;
  }

  private _handleGuessAlong(room: Room, client: Client, data: unknown): void {
    const currentGuesser = this.gs.guessingOrder[this.gs.currentGuesserIndex] ?? null;
    if (client.sessionId === currentGuesser) return;
    if (!this.gs.allPlayerIds.includes(client.sessionId)) return;

    const content =
      typeof (data as Record<string, unknown>)?.content === "string"
        ? ((data as Record<string, unknown>).content as string)
        : "";
    if (!content.trim()) return;

    this.gs.guessAlongGuesses.set(client.sessionId, content.trim());
    this.gs.guessAlongSubmissions = this.gs.guessAlongGuesses.size;

    this._refreshPrivateActions(room);
    this._broadcastGameData(room);
  }

  private _resolveGuessAlong(room: Room, state: Schema, answerText: string | null): void {
    const winners: string[] = [];

    if (answerText) {
      for (const [sessionId, guess] of this.gs.guessAlongGuesses) {
        if (fuzzyMatch(guess, answerText, FUZZY_THRESHOLD)) {
          winners.push(sessionId);
        }
      }
    }

    if (winners.length > 0) {
      for (const sessionId of winners) {
        this.addPoints(state, sessionId, GUESS_ALONG_BONUS_POINTS, "Guess Along bonus");
        const prev = this.gs.guessAlongPoints.get(sessionId) ?? 0;
        this.gs.guessAlongPoints.set(sessionId, prev + GUESS_ALONG_BONUS_POINTS);
      }
    }

    this.gs.lastGuessAlongWinners = winners;
    this.gs.lastGuessAlongAnswer = answerText;

    room.broadcast("game-data", {
      type: "guess-along-result",
      answer: answerText,
      winners: winners.map((sessionId) => ({
        sessionId,
        points: GUESS_ALONG_BONUS_POINTS,
      })),
    });

    this._clearGuessAlongWindow();
    this._broadcastGameData(room);

    // Refresh all per-player contexts so stale actions do not persist across phases.
    this._refreshPrivateActions(room);
  }

  private _handleGuess(room: Room, state: Schema, client: Client, data: unknown): void {
    const currentGuesser = this.gs.guessingOrder[this.gs.currentGuesserIndex];
    if (client.sessionId !== currentGuesser) return;

    const content =
      typeof (data as Record<string, unknown>)?.content === "string"
        ? ((data as Record<string, unknown>).content as string)
        : "";
    if (!content.trim()) return;

    const survey = this.gs.currentSurvey;
    if (!survey) return;

    // Check if the guess matches an already-revealed answer (duplicate)
    const isDuplicate = this.gs.revealedAnswers.some((r) =>
      fuzzyMatch(content, r.text, FUZZY_THRESHOLD),
    );
    if (isDuplicate) {
      this._recordRoundGuess({
        sessionId: client.sessionId,
        answer: content.trim(),
        source: "guessing",
        outcome: "duplicate",
        matchedRank: null,
      });
      // Notify the player it's a duplicate — no strike
      this._sendPrivateToPlayer(room, client.sessionId, {
        action: "duplicate-answer",
        message: "Already on the board!",
      });
      this._startGuessAlongWindow(room);
      this.resetSubmissions(state);
      this._broadcastGameData(room);
      this._notifyCurrentGuesser(room);
      return;
    }

    const matched = findMatchingAnswer(content, survey, this.gs.revealedAnswers);
    if (matched) {
      this._resolveGuessAlong(room, state, matched.text);
      this._recordRoundGuess({
        sessionId: client.sessionId,
        answer: content.trim(),
        source: "guessing",
        outcome: "match",
        matchedRank: matched.rank,
      });
      // Correct guess
      this.gs.revealedAnswers.push({
        text: matched.text,
        points: matched.points,
        rank: matched.rank,
      });
      this.gs.roundPoints += matched.points;

      this._broadcastGameData(room);

      // Check if all answers revealed
      if (this.gs.revealedAnswers.length >= survey.answers.length) {
        this._clearPhaseTiming(state);
        this._goToAnswerReveal(room, state);
        return;
      }

      // Next guesser in rotation
      this.gs.currentGuesserIndex =
        (this.gs.currentGuesserIndex + 1) % this.gs.guessingOrder.length;
      this.resetSubmissions(state);
      this._broadcastGameData(room);
      this._notifyCurrentGuesser(room);

      // Reset timer
      this._startManagedPhaseTimer(
        room,
        state,
        "ss-guessing",
        this.gs.complexity,
        () => {
          this._recordStrike(room, state);
        },
        SURVEY_SMASH_E2E_INTERACTION_MIN_MS,
      );
    } else {
      this._resolveGuessAlong(room, state, null);
      this._recordRoundGuess({
        sessionId: client.sessionId,
        answer: content.trim(),
        source: "guessing",
        outcome: "miss",
        matchedRank: null,
      });
      // Wrong guess: strike
      this._recordStrike(room, state);
    }
  }

  private _recordStrike(room: Room, state: Schema): void {
    this._clearPhaseTiming(state);
    this.gs.strikes++;

    // Show strike phase briefly
    this.gs.phase = "strike";
    this.setPhase(state, "strike");
    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    if (this.gs.strikes >= MAX_STRIKES) {
      // 3 strikes: move to steal chance
      this._scheduleTimeout(
        1500,
        () => {
          this._startStealChance(room, state);
        },
        { state },
      );
    } else {
      // Continue guessing with next player
      this._scheduleTimeout(
        1500,
        () => {
          this.gs.phase = "guessing";
          this.setPhase(state, "guessing");
          this.gs.currentGuesserIndex =
            (this.gs.currentGuesserIndex + 1) % this.gs.guessingOrder.length;
          this._startGuessAlongWindow(room);
          this.resetSubmissions(state);
          this._broadcastGameData(room);
          this._notifyCurrentGuesser(room);

          this._startManagedPhaseTimer(
            room,
            state,
            "ss-guessing",
            this.gs.complexity,
            () => {
              this._recordStrike(room, state);
            },
            SURVEY_SMASH_E2E_INTERACTION_MIN_MS,
          );
        },
        { state },
      );
    }
  }

  private _startStealChance(room: Room, state: Schema): void {
    // Find the opposing team
    if (this.gs.teamMode) {
      this.gs.stealTeamId = this.gs.controllingTeamId === "team-a" ? "team-b" : "team-a";
    } else {
      // FFA: pick a random non-controlling player
      const others = this.gs.allPlayerIds.filter(
        (pid) => this.gs.playerTeamMap.get(pid) !== this.gs.controllingTeamId,
      );
      if (others.length > 0) {
        shuffleInPlace(others);
        this.gs.stealTeamId = others[0] ?? "";
      } else {
        // No one to steal, go to answer reveal
        this._goToAnswerReveal(room, state);
        return;
      }
    }

    this.gs.phase = "steal-chance";
    this.setPhase(state, "steal-chance");
    this.resetSubmissions(state);
    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    // Timer
    this._startManagedPhaseTimer(
      room,
      state,
      "ss-steal",
      this.gs.complexity,
      () => {
        // Time ran out: controlling team keeps points
        this._resolveSteal(room, state, false);
      },
      SURVEY_SMASH_E2E_INTERACTION_MIN_MS,
    );
  }

  private _handleStealGuess(room: Room, state: Schema, client: Client, data: unknown): void {
    // Only steal team members can guess
    const playerTeamId = this.gs.playerTeamMap.get(client.sessionId);
    if (playerTeamId !== this.gs.stealTeamId) return;

    const content =
      typeof (data as Record<string, unknown>)?.content === "string"
        ? ((data as Record<string, unknown>).content as string)
        : "";
    if (!content.trim()) return;

    const survey = this.gs.currentSurvey;
    if (!survey) return;

    this._clearPhaseTiming(state);

    const matched = findMatchingAnswer(content, survey, this.gs.revealedAnswers);
    if (matched) {
      this._recordRoundGuess({
        sessionId: client.sessionId,
        answer: content.trim(),
        source: "steal",
        outcome: "match",
        matchedRank: matched.rank,
      });
      // Successful steal!
      this.gs.revealedAnswers.push({
        text: matched.text,
        points: matched.points,
        rank: matched.rank,
      });
      this.gs.roundPoints += matched.points;
      this._resolveSteal(room, state, true);
    } else {
      this._recordRoundGuess({
        sessionId: client.sessionId,
        answer: content.trim(),
        source: "steal",
        outcome: "miss",
        matchedRank: null,
      });
      // Failed steal: controlling team keeps points
      this._resolveSteal(room, state, false);
    }
  }

  private _resolveSteal(room: Room, state: Schema, stealSuccessful: boolean): void {
    this._clearPhaseTiming(state);

    const winningTeamId = stealSuccessful ? this.gs.stealTeamId : this.gs.controllingTeamId;
    this._awardRoundPoints(state, winningTeamId, this.gs.roundPoints);

    this._goToAnswerReveal(room, state);
  }

  private _goToAnswerReveal(room: Room, state: Schema): void {
    this._clearPhaseTiming(state);
    this._clearGuessAlongWindow();

    // If no steal phase happened (all answers found during guessing), award points to controlling team
    if (this.gs.stealTeamId === "" && this.gs.controllingTeamId) {
      this._awardRoundPoints(state, this.gs.controllingTeamId, this.gs.roundPoints);
    }

    this.gs.phase = "answer-reveal";
    this.setPhase(state, "answer-reveal");
    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    this._scheduleTimeout(
      ANSWER_REVEAL_DELAY_MS,
      () => {
        this._goToRoundResult(room, state);
      },
      { state, minE2eMs: SURVEY_SMASH_E2E_REVEAL_MIN_MS },
    );
  }

  private _goToRoundResult(room: Room, state: Schema): void {
    this.gs.phase = "round-result";
    this.setPhase(state, "round-result");
    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    this._scheduleTimeout(
      ROUND_RESULT_DELAY_MS,
      () => {
        if (this.gs.round >= this.gs.totalRounds) {
          // All regular rounds done
          if (this.gs.complexity !== "kids") {
            this._startLightningRound(room, state);
          } else {
            this._goToFinalScores(room, state);
          }
        } else {
          this._startRound(room, state);
        }
      },
      { state, minE2eMs: SURVEY_SMASH_E2E_REVEAL_MIN_MS },
    );
  }

  private _awardRoundPoints(state: Schema, teamId: string, points: number): void {
    if (points <= 0) return;
    const team = this.gs.teams.find((t) => t.id === teamId);
    if (!team) return;

    team.score += points;

    // Distribute points to individual players
    const perPlayer = Math.floor(points / team.members.length);
    const remainder = points - perPlayer * team.members.length;

    for (let i = 0; i < team.members.length; i++) {
      const pid = team.members[i];
      if (pid === undefined) continue;
      const bonus = i === 0 ? remainder : 0;
      this.addPoints(state, pid, perPlayer + bonus, `Round ${this.gs.round} survey`);
    }
    // Mark round points as zero so they don't get double-counted
    this.gs.roundPoints = 0;
  }

  // ─── Lightning Round ─────────────────────────────────────────────

  private _startLightningRound(room: Room, state: Schema): void {
    const roomState = this._roomState as (Schema & { hostSessionId?: string }) | null;
    const activePlayerIds = roomState ? this.getActivePlayers(roomState) : [];
    this.gs.lightningPlayerId = pickLightningPlayerId(
      this.gs.allPlayerIds,
      (pid) => this.scoringEngine.getTotalPoints(pid),
      {
        activePlayerIds,
        hostSessionId: roomState?.hostSessionId ?? null,
      },
    );

    // Pick 5 surveys for lightning round
    this.gs.lightningQuestions = [];
    for (let i = 0; i < LIGHTNING_QUESTION_COUNT; i++) {
      const survey = pickUnusedSurvey(this.gs);
      if (survey) {
        this.gs.lightningQuestions.push(survey);
      }
    }

    this.gs.lightningCurrentIndex = 0;
    this.gs.lightningAnswers = [];
    this.gs.lightningTotalPoints = 0;

    this.gs.phase = "lightning-round";
    this.setPhase(state, "lightning-round");
    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    // Send first question to the player
    this._sendLightningQuestion(room);
  }

  private _sendLightningQuestion(room: Room): void {
    const q = this.gs.lightningQuestions[this.gs.lightningCurrentIndex];
    if (!q) return;

    this.gs.currentSurvey = q;

    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    this._startManagedPhaseTimer(
      room,
      this._roomState as Schema,
      "ss-lightning",
      this.gs.complexity,
      () => {
        // Time ran out: record 0 points
        this.gs.lightningAnswers.push({
          question: q.question,
          answer: "(no answer)",
          points: 0,
          matched: false,
        });
        this._advanceLightning(room);
      },
      SURVEY_SMASH_E2E_LIGHTNING_INTERACTION_MIN_MS,
    );
  }

  private _handleLightningAnswer(room: Room, _state: Schema, client: Client, data: unknown): void {
    if (client.sessionId !== this.gs.lightningPlayerId) return;

    const content =
      typeof (data as Record<string, unknown>)?.content === "string"
        ? ((data as Record<string, unknown>).content as string)
        : "";

    const q = this.gs.lightningQuestions[this.gs.lightningCurrentIndex];
    if (!q) return;

    this._clearPhaseTiming(this._roomState);

    // Check for match against #1 answer
    const topAnswer = q.answers[0];
    let points = 0;
    let matched = false;

    if (topAnswer && fuzzyMatch(content, topAnswer.text, FUZZY_THRESHOLD)) {
      points = topAnswer.points;
      matched = true;
    } else {
      // Check all answers
      for (const answer of q.answers) {
        if (fuzzyMatch(content, answer.text, FUZZY_THRESHOLD)) {
          points = answer.points;
          matched = true;
          break;
        }
      }
    }

    this.gs.lightningAnswers.push({
      question: q.question,
      answer: content,
      points,
      matched,
    });
    this.gs.lightningTotalPoints += points;

    this._broadcastGameData(room);
    this._advanceLightning(room);
  }

  private _advanceLightning(room: Room): void {
    this.gs.lightningCurrentIndex++;
    if (this.gs.lightningCurrentIndex >= this.gs.lightningQuestions.length) {
      this._finishLightning(room);
    } else {
      this._sendLightningQuestion(room);
    }
  }

  private _finishLightning(room: Room): void {
    const state = this._roomState;
    this._clearPhaseTiming(state);

    // Award lightning round points
    if (state) {
      const pid = this.gs.lightningPlayerId;
      this.addPoints(state, pid, this.gs.lightningTotalPoints, "Lightning Round answers");

      if (this.gs.lightningTotalPoints >= LIGHTNING_BONUS_THRESHOLD) {
        this.addPoints(state, pid, LIGHTNING_BONUS_POINTS, "Lightning Round bonus (200+)");
      }
    }

    this.gs.phase = "lightning-round-reveal";
    this.setPhase(state as Schema, "lightning-round-reveal");
    this._broadcastGameData(room);
    this._refreshPrivateActions(room);

    this._scheduleTimeout(
      LIGHTNING_REVEAL_DELAY_MS,
      () => {
        this._goToFinalScores(room, state as Schema);
      },
      { state, minE2eMs: SURVEY_SMASH_E2E_LIGHTNING_REVEAL_MIN_MS },
    );
  }

  private _goToFinalScores(room: Room, state: Schema): void {
    this._clearPhaseTiming(state);

    this.gs.phase = "final-scores";
    this.setPhase(state, "final-scores");

    const leaderboard = this.getLeaderboard(state);
    room.broadcast("game-data", {
      action: "survey-smash-state",
      phase: "final-scores",
      teamMode: this.gs.teamMode,
      teams: this.gs.teams.map((t) => ({
        id: t.id,
        members: t.members,
        score: t.score,
      })),
      leaderboard,
      lightningAnswers: this.gs.lightningAnswers,
      lightningTotalPoints: this.gs.lightningTotalPoints,
    });
    this._refreshPrivateActions(room);
  }

  // ─── Host Messages ─────────────────────────────────────────────────

  private _handleHostMessage(
    room: Room,
    state: Schema,
    _client: Client,
    type: string,
    _data: unknown,
  ): void {
    if (type === "host:skip") {
      const now = Date.now();
      // Guard against duplicate skip deliveries from rapid UI rebinds or repeated
      // host control surfaces collapsing multiple phases into one click.
      if (now - this._lastHostSkipAt < 250) {
        return;
      }
      this._lastHostSkipAt = now;

      // Advance current phase (skip timer)
      this._clearPhaseTiming(state);
      switch (this.gs.phase) {
        case "question-reveal":
          this._startFaceOff(room, state);
          break;
        case "face-off":
          this._resolveFaceOff(room, state);
          break;
        case "guessing":
        case "steal-chance":
          this._goToAnswerReveal(room, state);
          break;
        case "strike":
        case "answer-reveal":
          this._goToRoundResult(room, state);
          break;
        case "lightning-round":
          this._finishLightning(room);
          break;
        case "round-result":
          if (this.gs.round >= this.gs.totalRounds) {
            if (this.gs.complexity !== "kids") {
              this._startLightningRound(room, state);
            } else {
              this._goToFinalScores(room, state);
            }
          } else {
            this._startRound(room, state);
          }
          break;
        case "lightning-round-reveal":
          this._goToFinalScores(room, state);
          break;
        default:
          break;
      }
    }
  }

  private isPlayerConnected(state: Schema, sessionId: string): boolean {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    const player = players.get(sessionId);
    if (!player) return false;
    return (player as unknown as Record<string, unknown>).connected as boolean;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createSurveySmashPlugin(): SurveySmashPlugin {
  return new SurveySmashPlugin();
}

// Re-export types for testing
export type {
  SurveySmashPhase,
  TeamInfo,
  RevealedAnswer,
  FaceOffEntry,
  FastMoneyAnswer,
  RoundGuessEntry,
  SurveySmashInternalState,
};
export {
  findMatchingAnswer,
  FUZZY_THRESHOLD,
  MAX_STRIKES,
  LIGHTNING_BONUS_THRESHOLD,
  LIGHTNING_BONUS_POINTS,
};
