import type { Schema } from "@colyseus/schema";
import type { MapSchema } from "@colyseus/schema";
import { BaseGamePlugin } from "@flimflam/game-engine";
import type { Complexity, GameManifest } from "@flimflam/shared";
import { fuzzyMatch, shuffleInPlace } from "@flimflam/shared";
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
const FAST_MONEY_QUESTION_COUNT = 5;
const FAST_MONEY_TIMER_MS = 20_000;
const FAST_MONEY_BONUS_THRESHOLD = 200;
const FAST_MONEY_BONUS_POINTS = 10_000;

const ROUND_COUNTS: Record<Complexity, number> = {
  kids: 3,
  standard: 4,
  advanced: 5,
};

const PHASE_REVEAL_DELAY_MS = 3_000;
const FACE_OFF_TIMER_MS = 15_000;
const GUESSING_TIMER_MS = 30_000;
const STEAL_TIMER_MS = 20_000;
const ANSWER_REVEAL_DELAY_MS = 5_000;
const ROUND_RESULT_DELAY_MS = 5_000;
const FAST_MONEY_REVEAL_DELAY_MS = 8_000;

// ─── Types ──────────────────────────────────────────────────────────

type FamilyFeudPhase =
  | "question-reveal"
  | "face-off"
  | "guessing"
  | "strike"
  | "steal-chance"
  | "answer-reveal"
  | "round-result"
  | "fast-money"
  | "fast-money-reveal"
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

// ─── Game State (internal, not a Colyseus Schema) ───────────────────

interface FamilyFeudInternalState {
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

  phase: FamilyFeudPhase;
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

  // Steal
  stealTeamId: string;

  // Fast money
  fastMoneyPlayerId: string;
  fastMoneyQuestions: Survey[];
  fastMoneyCurrentIndex: number;
  fastMoneyAnswers: FastMoneyAnswer[];
  fastMoneyTotalPoints: number;

  // Track all player session IDs (excluding host)
  allPlayerIds: string[];
}

// ─── Helper: pick a survey we haven't used yet ──────────────────────

function pickUnusedSurvey(state: FamilyFeudInternalState): Survey | null {
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

function buildHostData(gs: FamilyFeudInternalState): Record<string, unknown> {
  return {
    action: "family-feud-state",
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
    stealTeamId: gs.stealTeamId,
    fastMoneyPlayerId: gs.fastMoneyPlayerId,
    fastMoneyCurrentIndex: gs.fastMoneyCurrentIndex,
    fastMoneyAnswers: gs.fastMoneyAnswers,
    fastMoneyTotalPoints: gs.fastMoneyTotalPoints,
    allAnswers:
      gs.phase === "answer-reveal" || gs.phase === "fast-money-reveal"
        ? (gs.currentSurvey?.answers ?? [])
        : [],
  };
}

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

export function pickFaceOffPlayers(gs: FamilyFeudInternalState): string[] {
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

// ─── Plugin ──────────────────────────────────────────────────────────

class FamilyFeudPlugin extends BaseGamePlugin {
  manifest: GameManifest = {
    id: "family-feud",
    name: "Family Feud",
    description:
      "Survey says! Guess the top answers to survey questions. Play in teams or free-for-all!",
    minPlayers: 3,
    maxPlayers: 8,
    estimatedMinutes: 15,
    aiRequired: false,
    complexityLevels: ["kids", "standard", "advanced"],
    tags: ["survey", "teams", "classic"],
    icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
  };

  private gs: FamilyFeudInternalState = this._freshState();
  private _room: Room | null = null;
  private _roomState: Schema | null = null;
  private _phaseTimeout: ReturnType<typeof setTimeout> | null = null;

  private _freshState(): FamilyFeudInternalState {
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
      stealTeamId: "",
      fastMoneyPlayerId: "",
      fastMoneyQuestions: [],
      fastMoneyCurrentIndex: 0,
      fastMoneyAnswers: [],
      fastMoneyTotalPoints: 0,
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

    // Collect player IDs (exclude host)
    const hostSessionId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    const playerIds: string[] = [];
    players.forEach((_player: unknown, key: string) => {
      if (key !== hostSessionId) {
        playerIds.push(key);
      }
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
      if (key === hostSessionId) return;
      const teamId = playerTeamMap.get(key) ?? "free";
      p.role = teamId;
    });

    // Init scoring engine
    players.forEach((player: unknown, key: string) => {
      if (key === hostSessionId) return;
      const p = player as Record<string, unknown>;
      this.scoringEngine.initPlayer(key, p.name as string);
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
    const hostSessionId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    if (client.sessionId === hostSessionId) {
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
        }
        break;
      case "steal-chance":
        if (type === "player:submit") {
          this._handleStealGuess(room, state, client, data);
        }
        break;
      case "fast-money":
        if (type === "player:submit") {
          this._handleFastMoneyAnswer(room, state, client, data);
        }
        break;
      default:
        break;
    }
  }

  onPlayerLeave(room: Room, state: Schema, sessionId: string, consented: boolean): void {
    super.onPlayerLeave(room, state, sessionId, consented);
    // Remove from allPlayerIds if they fully leave
    // (they stay for reconnect window; plugin doesn't force-end)
  }

  onPlayerReconnect(room: Room, state: Schema, client: Client): void {
    // Re-send full state to reconnected player
    const hostSessionId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    if (client.sessionId === hostSessionId) return;

    const teamId = this.gs.playerTeamMap.get(client.sessionId) ?? "";
    this._sendPrivateData(room, client, {
      action: "family-feud-reconnect",
      phase: this.gs.phase,
      round: this.gs.round,
      totalRounds: this.gs.totalRounds,
      teamMode: this.gs.teamMode,
      yourTeamId: teamId,
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
    (room as unknown as { send(client: Client, type: string, data: unknown): void }).send(
      client,
      "private-data",
      payload,
    );
  }

  private _sendPrivateToPlayer(
    room: Room,
    sessionId: string,
    payload: Record<string, unknown>,
  ): void {
    const clients = (room as unknown as { clients: Client[] }).clients;
    for (const c of clients) {
      if (c.sessionId === sessionId) {
        this._sendPrivateData(room, c, payload);
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

  private _clearPhaseTimeout(): void {
    if (this._phaseTimeout !== null) {
      clearTimeout(this._phaseTimeout);
      this._phaseTimeout = null;
    }
  }

  private _scheduleTimeout(delayMs: number, callback: () => void): void {
    this._clearPhaseTimeout();
    this._phaseTimeout = setTimeout(callback, delayMs);
  }

  // ─── Phase Transitions ─────────────────────────────────────────────

  private _startRound(room: Room, state: Schema): void {
    this.gs.round++;
    this.setRoomRound(state, this.gs.round, this.gs.totalRounds);

    const survey = pickUnusedSurvey(this.gs);
    if (!survey) {
      // No surveys left, go to final scores or fast money
      if (this.gs.complexity !== "kids") {
        this._startFastMoney(room, state);
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
    this.gs.stealTeamId = "";

    this.resetSubmissions(state);

    // Question reveal
    this.gs.phase = "question-reveal";
    this.setPhase(state, "question-reveal");
    this._broadcastGameData(room);

    // After delay, move to face-off
    this._scheduleTimeout(PHASE_REVEAL_DELAY_MS, () => {
      this._startFaceOff(room, state);
    });
  }

  private _startFaceOff(room: Room, state: Schema): void {
    this.gs.phase = "face-off";
    this.gs.faceOffPlayers = pickFaceOffPlayers(this.gs);
    this.gs.faceOffEntries = [];
    this.gs.faceOffResolved = false;

    this.setPhase(state, "face-off");
    this.resetSubmissions(state);
    this._broadcastGameData(room);

    // Notify face-off players
    for (const pid of this.gs.faceOffPlayers) {
      this._sendPrivateToPlayer(room, pid, {
        action: "face-off-your-turn",
        question: this.gs.currentSurvey?.question ?? "",
      });
    }

    // Timer for face-off
    this._scheduleTimeout(FACE_OFF_TIMER_MS, () => {
      this._resolveFaceOff(room, state);
    });
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
    this._clearPhaseTimeout();

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
    this.gs.currentGuesserIndex = 0;

    this.resetSubmissions(state);
    this._broadcastGameData(room);

    // Notify current guesser
    this._notifyCurrentGuesser(room);

    // Timer
    this._scheduleTimeout(GUESSING_TIMER_MS, () => {
      // Time ran out for this guess: count as strike
      this._recordStrike(room, state);
    });
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

    const matched = findMatchingAnswer(content, survey, this.gs.revealedAnswers);
    if (matched) {
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
        this._clearPhaseTimeout();
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
      this._scheduleTimeout(GUESSING_TIMER_MS, () => {
        this._recordStrike(room, state);
      });
    } else {
      // Wrong guess: strike
      this._recordStrike(room, state);
    }
  }

  private _recordStrike(room: Room, state: Schema): void {
    this._clearPhaseTimeout();
    this.gs.strikes++;

    // Show strike phase briefly
    this.gs.phase = "strike";
    this.setPhase(state, "strike");
    this._broadcastGameData(room);

    if (this.gs.strikes >= MAX_STRIKES) {
      // 3 strikes: move to steal chance
      this._scheduleTimeout(1500, () => {
        this._startStealChance(room, state);
      });
    } else {
      // Continue guessing with next player
      this._scheduleTimeout(1500, () => {
        this.gs.phase = "guessing";
        this.setPhase(state, "guessing");
        this.gs.currentGuesserIndex =
          (this.gs.currentGuesserIndex + 1) % this.gs.guessingOrder.length;
        this.resetSubmissions(state);
        this._broadcastGameData(room);
        this._notifyCurrentGuesser(room);

        this._scheduleTimeout(GUESSING_TIMER_MS, () => {
          this._recordStrike(room, state);
        });
      });
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

    // Notify steal team
    this._sendPrivateToTeam(room, this.gs.stealTeamId, {
      action: "steal-your-turn",
      question: this.gs.currentSurvey?.question ?? "",
      revealedAnswers: this.gs.revealedAnswers,
    });

    // Timer
    this._scheduleTimeout(STEAL_TIMER_MS, () => {
      // Time ran out: controlling team keeps points
      this._resolveSteal(room, state, false);
    });
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

    this._clearPhaseTimeout();

    const matched = findMatchingAnswer(content, survey, this.gs.revealedAnswers);
    if (matched) {
      // Successful steal!
      this.gs.revealedAnswers.push({
        text: matched.text,
        points: matched.points,
        rank: matched.rank,
      });
      this.gs.roundPoints += matched.points;
      this._resolveSteal(room, state, true);
    } else {
      // Failed steal: controlling team keeps points
      this._resolveSteal(room, state, false);
    }
  }

  private _resolveSteal(room: Room, state: Schema, stealSuccessful: boolean): void {
    this._clearPhaseTimeout();

    const winningTeamId = stealSuccessful ? this.gs.stealTeamId : this.gs.controllingTeamId;
    this._awardRoundPoints(state, winningTeamId, this.gs.roundPoints);

    this._goToAnswerReveal(room, state);
  }

  private _goToAnswerReveal(room: Room, state: Schema): void {
    this._clearPhaseTimeout();

    // If no steal phase happened (all answers found during guessing), award points to controlling team
    if (this.gs.stealTeamId === "" && this.gs.controllingTeamId) {
      this._awardRoundPoints(state, this.gs.controllingTeamId, this.gs.roundPoints);
    }

    this.gs.phase = "answer-reveal";
    this.setPhase(state, "answer-reveal");
    this._broadcastGameData(room);

    this._scheduleTimeout(ANSWER_REVEAL_DELAY_MS, () => {
      this._goToRoundResult(room, state);
    });
  }

  private _goToRoundResult(room: Room, state: Schema): void {
    this.gs.phase = "round-result";
    this.setPhase(state, "round-result");
    this._broadcastGameData(room);

    this._scheduleTimeout(ROUND_RESULT_DELAY_MS, () => {
      if (this.gs.round >= this.gs.totalRounds) {
        // All regular rounds done
        if (this.gs.complexity !== "kids") {
          this._startFastMoney(room, state);
        } else {
          this._goToFinalScores(room, state);
        }
      } else {
        this._startRound(room, state);
      }
    });
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

  // ─── Fast Money ────────────────────────────────────────────────────

  private _startFastMoney(room: Room, state: Schema): void {
    // Find top scoring player
    let topPid = "";
    let topScore = -1;
    for (const pid of this.gs.allPlayerIds) {
      const s = this.scoringEngine.getTotalPoints(pid);
      if (s > topScore) {
        topScore = s;
        topPid = pid;
      }
    }
    this.gs.fastMoneyPlayerId = topPid;

    // Pick 5 surveys for fast money
    this.gs.fastMoneyQuestions = [];
    for (let i = 0; i < FAST_MONEY_QUESTION_COUNT; i++) {
      const survey = pickUnusedSurvey(this.gs);
      if (survey) {
        this.gs.fastMoneyQuestions.push(survey);
      }
    }

    this.gs.fastMoneyCurrentIndex = 0;
    this.gs.fastMoneyAnswers = [];
    this.gs.fastMoneyTotalPoints = 0;

    this.gs.phase = "fast-money";
    this.setPhase(state, "fast-money");
    this._broadcastGameData(room);

    // Send first question to the player
    this._sendFastMoneyQuestion(room);
  }

  private _sendFastMoneyQuestion(room: Room): void {
    const q = this.gs.fastMoneyQuestions[this.gs.fastMoneyCurrentIndex];
    if (!q) return;

    this.gs.currentSurvey = q;

    this._broadcastGameData(room);

    this._sendPrivateToPlayer(room, this.gs.fastMoneyPlayerId, {
      action: "fast-money-question",
      questionIndex: this.gs.fastMoneyCurrentIndex,
      question: q.question,
      totalQuestions: this.gs.fastMoneyQuestions.length,
    });

    this._scheduleTimeout(FAST_MONEY_TIMER_MS, () => {
      // Time ran out: record 0 points
      this.gs.fastMoneyAnswers.push({
        question: q.question,
        answer: "(no answer)",
        points: 0,
        matched: false,
      });
      this._advanceFastMoney(room);
    });
  }

  private _handleFastMoneyAnswer(room: Room, _state: Schema, client: Client, data: unknown): void {
    if (client.sessionId !== this.gs.fastMoneyPlayerId) return;

    const content =
      typeof (data as Record<string, unknown>)?.content === "string"
        ? ((data as Record<string, unknown>).content as string)
        : "";

    const q = this.gs.fastMoneyQuestions[this.gs.fastMoneyCurrentIndex];
    if (!q) return;

    this._clearPhaseTimeout();

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

    this.gs.fastMoneyAnswers.push({
      question: q.question,
      answer: content,
      points,
      matched,
    });
    this.gs.fastMoneyTotalPoints += points;

    this._broadcastGameData(room);
    this._advanceFastMoney(room);
  }

  private _advanceFastMoney(room: Room): void {
    this.gs.fastMoneyCurrentIndex++;
    if (this.gs.fastMoneyCurrentIndex >= this.gs.fastMoneyQuestions.length) {
      this._finishFastMoney(room);
    } else {
      this._sendFastMoneyQuestion(room);
    }
  }

  private _finishFastMoney(room: Room): void {
    this._clearPhaseTimeout();

    // Award fast money points
    const state = this._roomState;
    if (state) {
      const pid = this.gs.fastMoneyPlayerId;
      this.addPoints(state, pid, this.gs.fastMoneyTotalPoints, "Fast Money answers");

      if (this.gs.fastMoneyTotalPoints >= FAST_MONEY_BONUS_THRESHOLD) {
        this.addPoints(state, pid, FAST_MONEY_BONUS_POINTS, "Fast Money bonus (200+)");
      }
    }

    this.gs.phase = "fast-money-reveal";
    this.setPhase(state as Schema, "fast-money-reveal");
    this._broadcastGameData(room);

    this._scheduleTimeout(FAST_MONEY_REVEAL_DELAY_MS, () => {
      this._goToFinalScores(room, state as Schema);
    });
  }

  private _goToFinalScores(room: Room, state: Schema): void {
    this._clearPhaseTimeout();

    this.gs.phase = "final-scores";
    this.setPhase(state, "final-scores");

    const leaderboard = this.getLeaderboard(state);
    room.broadcast("game-data", {
      action: "family-feud-state",
      phase: "final-scores",
      teamMode: this.gs.teamMode,
      teams: this.gs.teams.map((t) => ({
        id: t.id,
        members: t.members,
        score: t.score,
      })),
      leaderboard,
      fastMoneyAnswers: this.gs.fastMoneyAnswers,
      fastMoneyTotalPoints: this.gs.fastMoneyTotalPoints,
    });
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
      // Advance current phase (skip timer)
      this._clearPhaseTimeout();
      switch (this.gs.phase) {
        case "question-reveal":
          this._startFaceOff(room, state);
          break;
        case "face-off":
          this._resolveFaceOff(room, state);
          break;
        case "strike":
        case "answer-reveal":
          this._goToRoundResult(room, state);
          break;
        case "round-result":
          if (this.gs.round >= this.gs.totalRounds) {
            if (this.gs.complexity !== "kids") {
              this._startFastMoney(room, state);
            } else {
              this._goToFinalScores(room, state);
            }
          } else {
            this._startRound(room, state);
          }
          break;
        case "fast-money-reveal":
          this._goToFinalScores(room, state);
          break;
        default:
          break;
      }
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createFamilyFeudPlugin(): FamilyFeudPlugin {
  return new FamilyFeudPlugin();
}

// Re-export types for testing
export type {
  FamilyFeudPhase,
  TeamInfo,
  RevealedAnswer,
  FaceOffEntry,
  FastMoneyAnswer,
  FamilyFeudInternalState,
};
export {
  findMatchingAnswer,
  FUZZY_THRESHOLD,
  MAX_STRIKES,
  FAST_MONEY_BONUS_THRESHOLD,
  FAST_MONEY_BONUS_POINTS,
};
