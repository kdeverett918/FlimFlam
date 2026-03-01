import type { MapSchema, Schema } from "@colyseus/schema";
import {
  FALLBACK_BOARDS,
  aiRequest,
  buildAnswerJudgePrompt,
  buildAppealPrompt,
  buildBoardGenerationPrompt,
  enqueueAIRequest,
} from "@partyline/ai";
import { BaseGamePlugin, ScoringEngine } from "@partyline/game-engine";
import {
  AnswerJudgeSchema,
  AppealResultSchema,
  type Complexity,
  GAME_MANIFESTS,
  type GeneratedBoard,
  GeneratedBoardSchema,
} from "@partyline/shared";
import type { Client, Room } from "colyseus";
import { SCORING } from "./scoring";
import {
  APPEALS_PER_PLAYER,
  type BrainBattleInternalState,
  assignClueIds,
  createBrainBattleInternalState,
  findBuzzWinner,
  fuzzyMatch,
  getClueById,
  isBoardComplete,
  validateTopicSubmission,
} from "./state";

// biome-ignore lint/style/noNonNullAssertion: manifest is always present for known game IDs
const MANIFEST = GAME_MANIFESTS.find((m) => m.id === "brain-battle")!;

export class BrainBattlePlugin extends BaseGamePlugin {
  manifest = MANIFEST;
  private internal!: BrainBattleInternalState;

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
    return {} as Schema;
  }

  async onGameStart(
    room: Room,
    state: Schema,
    players: MapSchema,
    complexity: Complexity,
  ): Promise<void> {
    this.internal = createBrainBattleInternalState(complexity);

    const s = state as unknown as Record<string, unknown>;
    s.totalRounds = 25;
    s.round = 0;

    this.scoringEngine = new ScoringEngine(complexity === "kids");
    const playerIds: string[] = [];
    players.forEach((player: Record<string, unknown>, key: string) => {
      this.scoringEngine.initPlayer(key, player.name as string);
      this.internal.appealsRemaining.set(key, APPEALS_PER_PLAYER);
      playerIds.push(key);
    });

    // Shuffle player order for turn rotation
    for (let i = playerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = playerIds[i];
      playerIds[i] = playerIds[j] as string;
      playerIds[j] = tmp as string;
    }
    this.internal.turnOrder = playerIds;
    this.internal.selectorSessionId = playerIds[0] ?? "";

    this.setPhase(state, "topic-submit");
    this._broadcastHost(room, state, {
      message: "Submit your topics!",
      submittedPlayerIds: [],
    });

    this.startPhaseTimer(room, "topic-submit", complexity, () => {
      this._generateBoard(room, state);
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

    // ─── TOPIC SUBMISSION ───────────────────────────────────────────────
    if (type === "player:submit" && gamePhase === "topic-submit") {
      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;
      if (p.hasSubmitted) {
        room.send(client, "error", { message: "Already submitted" });
        return;
      }

      const msg = data as { content?: unknown; topics?: unknown };
      const topicsRaw =
        msg?.topics ?? (typeof msg?.content === "string" ? [msg.content] : msg?.content);
      const validation = validateTopicSubmission(topicsRaw);
      if (!validation.valid) {
        room.send(client, "error", { message: validation.error });
        return;
      }

      p.hasSubmitted = true;
      // biome-ignore lint/style/noNonNullAssertion: validation ensures value exists
      this.internal.topicSubmissions.set(client.sessionId, validation.value!);
      // biome-ignore lint/style/noNonNullAssertion: validation ensures value exists
      for (const topic of validation.value!) {
        this.internal.topics.push(topic);
      }

      const submittedPlayerIds: string[] = [];
      players.forEach((playerObj: Record<string, unknown>, key: string) => {
        if (playerObj.connected && playerObj.hasSubmitted) {
          submittedPlayerIds.push(key);
        }
      });
      this._broadcastHost(room, state, {
        message: "Submit your topics!",
        submittedPlayerIds,
        topics: [...this.internal.topics],
      });

      if (this.allPlayersSubmitted(state)) {
        this.clearTimer();
        this._generateBoard(room, state);
      }
      return;
    }

    // ─── CLUE SELECTION ─────────────────────────────────────────────────
    if (type === "player:select-clue" && gamePhase === "clue-select") {
      if (client.sessionId !== this.internal.selectorSessionId) {
        room.send(client, "error", { message: "Not your turn to select" });
        return;
      }

      const msg = data as { clueId?: string };
      if (typeof msg?.clueId !== "string") {
        room.send(client, "error", { message: "Invalid clue selection" });
        return;
      }

      if (this.internal.answeredClues.has(msg.clueId)) {
        room.send(client, "error", { message: "Clue already answered" });
        return;
      }

      if (!this.internal.board) return;
      const clue = getClueById(this.internal.board, msg.clueId);
      if (!clue) {
        room.send(client, "error", { message: "Invalid clue" });
        return;
      }

      this.clearTimer();
      this._startBuzzing(room, state, msg.clueId);
      return;
    }

    // ─── BUZZING ────────────────────────────────────────────────────────
    if (type === "player:buzz" && gamePhase === "buzzing") {
      if (this.internal.buzzTimestamps.has(client.sessionId)) return;

      // Record server-side timestamp — the key Colyseus advantage
      this.internal.buzzTimestamps.set(client.sessionId, room.clock.currentTime);

      // First buzz wins immediately
      this.clearTimer();
      this._resolveBuzz(room, state);
      return;
    }

    // ─── ANSWERING ──────────────────────────────────────────────────────
    if (type === "player:submit" && gamePhase === "answering") {
      if (client.sessionId !== this.internal.buzzWinnerId) {
        room.send(client, "error", { message: "Not your turn to answer" });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;
      if (p.hasSubmitted) return;

      const msg = data as { content?: string };
      const rawAnswer = typeof msg?.content === "string" ? msg.content.trim() : "";
      if (!rawAnswer) {
        room.send(client, "error", { message: "Answer cannot be empty" });
        return;
      }

      p.hasSubmitted = true;
      this.clearTimer();

      this._broadcastHost(room, state, {
        clue: this.internal.currentClue,
        buzzWinnerId: this.internal.buzzWinnerId,
        submittedAnswer: rawAnswer,
        judging: true,
      });

      await this._handleAnswer(room, state, rawAnswer, client.sessionId);
      return;
    }

    // ─── APPEAL SUBMISSION ──────────────────────────────────────────────
    if (type === "player:submit" && gamePhase === "appeal-window") {
      if (client.sessionId !== this.internal.wrongAnswerSessionId) return;

      const msg = data as { content?: string };
      const argument = typeof msg?.content === "string" ? msg.content.trim() : "";
      if (!argument) {
        room.send(client, "error", { message: "Argument cannot be empty" });
        return;
      }

      const player = players.get(client.sessionId);
      if (!player) return;
      const p = player as Record<string, unknown>;
      if (p.hasSubmitted) return;

      p.hasSubmitted = true;
      this.clearTimer();

      this.internal.currentAppeal = {
        playerId: client.sessionId,
        playerAnswer: this.internal.currentAppeal?.playerAnswer ?? "",
        argument,
      };

      await this._runAppeal(room, state);
      return;
    }

    // ─── HOST SKIP ──────────────────────────────────────────────────────
    if (type === "host:skip" || type === "host-skip") {
      this.clearTimer();
      if (gamePhase === "topic-submit") {
        this._generateBoard(room, state);
      } else if (gamePhase === "board-generating" || gamePhase === "board-reveal") {
        this._startClueSelect(room, state);
      } else if (gamePhase === "clue-select") {
        this._autoSelectClue(room, state);
      } else if (gamePhase === "buzzing") {
        this._resolveBuzz(room, state);
      } else if (gamePhase === "answering") {
        this._handleWrong(room, state, this.internal.buzzWinnerId ?? "", "");
      } else if (
        gamePhase === "appeal-window" ||
        gamePhase === "appeal-judging" ||
        gamePhase === "appeal-result" ||
        gamePhase === "clue-result"
      ) {
        this._advanceToNextClue(room, state);
      }
    }
  }

  onPlayerReconnect(room: Room, state: Schema, client: Client): void {
    const s = state as unknown as Record<string, unknown>;
    const phase = s.gamePhase as string;
    const hostId = s.hostSessionId as string;
    if (client.sessionId === hostId) return;

    const appealsLeft = this.internal?.appealsRemaining?.get(client.sessionId) ?? 0;
    const isSelector = client.sessionId === this.internal?.selectorSessionId;
    const isBuzzWinner = client.sessionId === this.internal?.buzzWinnerId;

    if (phase === "topic-submit") {
      room.send(client, "private-data", { phase: "topic-submit" });
    } else if (phase === "clue-select") {
      room.send(client, "private-data", {
        isSelector,
        board: isSelector ? this._getBoardForController() : undefined,
        answeredClues: Array.from(this.internal.answeredClues),
        selectorName: this._getPlayerName(state, this.internal.selectorSessionId),
      });
    } else if (phase === "buzzing") {
      room.send(client, "private-data", {
        canBuzz: !this.internal.buzzTimestamps.has(client.sessionId),
        clue: this.internal.currentClue,
      });
    } else if (phase === "answering") {
      room.send(client, "private-data", {
        isBuzzWinner,
        clue: this.internal.currentClue,
      });
    } else if (phase === "appeal-window") {
      const canAppeal = client.sessionId === this.internal.wrongAnswerSessionId && appealsLeft > 0;
      room.send(client, "private-data", {
        canAppeal,
        appealsRemaining: appealsLeft,
      });
    }
  }

  onPlayerLeave(room: Room, state: Schema, sessionId: string, consented: boolean): void {
    super.onPlayerLeave(room, state, sessionId, consented);

    const s = state as unknown as Record<string, unknown>;
    const phase = s.gamePhase as string;

    if (phase === "clue-select" && sessionId === this.internal.selectorSessionId) {
      this._rotateSelector(state);
      this._broadcastHost(room, state, {
        selectorSessionId: this.internal.selectorSessionId,
        board: this._getBoardForHost(),
        answeredClues: Array.from(this.internal.answeredClues),
      });
    }

    if (phase === "answering" && sessionId === this.internal.buzzWinnerId) {
      this.clearTimer();
      this._showClueResult(room, state, false, null);
    }

    if (phase === "appeal-window" && sessionId === this.internal.wrongAnswerSessionId) {
      this.clearTimer();
      this._showClueResult(room, state, false, null);
    }
  }

  isGameOver(state: Schema): boolean {
    return (state as unknown as Record<string, unknown>).gamePhase === "final-scores";
  }

  getScores(_state: Schema): Map<string, number> {
    const scores = new Map<string, number>();
    for (const entry of this.scoringEngine.getLeaderboard()) {
      scores.set(entry.sessionId, entry.score);
    }
    return scores;
  }

  // ─── Private Methods ──────────────────────────────────────────────────

  private async _generateBoard(room: Room, state: Schema): Promise<void> {
    this.setPhase(state, "board-generating");
    this._broadcastHost(room, state, {
      message: "Building your board...",
      topics: this.internal.topics,
    });

    if (this.internal.topics.length === 0) {
      this.internal.topics = ["Movies", "Food", "Science", "History", "Sports"];
    }

    try {
      const { system, user } = buildBoardGenerationPrompt(
        this.internal.topics,
        this.internal.complexity,
      );
      const result = await enqueueAIRequest(room.roomId, () =>
        aiRequest(system, user, GeneratedBoardSchema, { maxTokens: 4096 }),
      );
      this.internal.board = assignClueIds(result.parsed as unknown as GeneratedBoard);
    } catch (error) {
      console.warn("[BrainBattle] AI board generation failed, using fallback:", error);
      const fallbackIndex = Math.floor(Math.random() * FALLBACK_BOARDS.length);
      const fallback = FALLBACK_BOARDS[fallbackIndex];
      if (fallback) {
        this.internal.board = assignClueIds(structuredClone(fallback));
      }
    }

    if (!this.internal.board) {
      const fallback = FALLBACK_BOARDS[0];
      if (fallback) {
        this.internal.board = assignClueIds(structuredClone(fallback));
      }
    }

    this.internal.cluesRemaining = 25;
    this._startBoardReveal(room, state);
  }

  private _startBoardReveal(room: Room, state: Schema): void {
    this.setPhase(state, "board-reveal");
    this._broadcastHost(room, state, {
      board: this._getBoardForHost(),
    });

    this.startPhaseTimer(room, "board-reveal", this.internal.complexity, () => {
      this._startClueSelect(room, state);
    });
  }

  private _startClueSelect(room: Room, state: Schema): void {
    this.resetSubmissions(state);
    this.internal.buzzTimestamps.clear();
    this.internal.buzzWinnerId = null;
    this.internal.currentClueId = null;
    this.internal.currentClue = null;
    this.internal.wrongAnswerSessionId = null;
    this.internal.currentAppeal = null;

    const activePlayers = this.getActivePlayers(state);
    if (!activePlayers.includes(this.internal.selectorSessionId)) {
      this._rotateSelector(state);
    }

    this.setPhase(state, "clue-select");
    this._broadcastHost(room, state, {
      selectorSessionId: this.internal.selectorSessionId,
      selectorName: this._getPlayerName(state, this.internal.selectorSessionId),
      board: this._getBoardForHost(),
      answeredClues: Array.from(this.internal.answeredClues),
    });

    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostId) continue;
      const isSelector = client.sessionId === this.internal.selectorSessionId;
      room.send(client, "private-data", {
        isSelector,
        board: isSelector ? this._getBoardForController() : undefined,
        answeredClues: Array.from(this.internal.answeredClues),
        selectorName: this._getPlayerName(state, this.internal.selectorSessionId),
      });
    }

    this.startPhaseTimer(room, "clue-select", this.internal.complexity, () => {
      this._autoSelectClue(room, state);
    });
  }

  private _autoSelectClue(room: Room, state: Schema): void {
    if (!this.internal.board) return;
    const unclaimed: string[] = [];
    for (let ci = 0; ci < this.internal.board.categories.length; ci++) {
      const cat = this.internal.board.categories[ci];
      if (!cat) continue;
      for (let cli = 0; cli < cat.clues.length; cli++) {
        const id = `cat${ci}_clue${cli}`;
        if (!this.internal.answeredClues.has(id)) {
          unclaimed.push(id);
        }
      }
    }
    if (unclaimed.length === 0) {
      this._showFinalScores(room, state);
      return;
    }
    // biome-ignore lint/style/noNonNullAssertion: unclaimed length checked above
    const randomId = unclaimed[Math.floor(Math.random() * unclaimed.length)]!;
    this._startBuzzing(room, state, randomId);
  }

  private _startBuzzing(room: Room, state: Schema, clueId: string): void {
    if (!this.internal.board) return;
    const clue = getClueById(this.internal.board, clueId);
    if (!clue) return;

    this.internal.currentClueId = clueId;
    this.internal.currentClue = clue;
    this.internal.currentClueValue = clue.value;
    this.internal.buzzTimestamps.clear();
    this.internal.buzzWinnerId = null;
    this.resetSubmissions(state);

    const catIndex = Number.parseInt(clueId.split("_")[0]?.replace("cat", "") ?? "0", 10);
    const categoryName = this.internal.board.categories[catIndex]?.name ?? "";

    this.setPhase(state, "buzzing");
    this._broadcastHost(room, state, {
      clue: { id: clue.id, answer: clue.answer, value: clue.value },
      categoryName,
    });

    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostId) continue;
      room.send(client, "private-data", {
        canBuzz: true,
        clueValue: clue.value,
      });
    }

    this.startPhaseTimer(room, "buzzing", this.internal.complexity, () => {
      this._resolveBuzz(room, state);
    });
  }

  private _resolveBuzz(room: Room, state: Schema): void {
    const winnerId = findBuzzWinner(this.internal.buzzTimestamps);

    if (!winnerId) {
      this._showClueResult(room, state, false, null);
      return;
    }

    this.internal.buzzWinnerId = winnerId;
    this.resetSubmissions(state);

    this.setPhase(state, "answering");
    this._broadcastHost(room, state, {
      clue: this.internal.currentClue,
      buzzWinnerId: winnerId,
      buzzWinnerName: this._getPlayerName(state, winnerId),
    });

    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostId) continue;
      room.send(client, "private-data", {
        isBuzzWinner: client.sessionId === winnerId,
        buzzWinnerName: this._getPlayerName(state, winnerId),
      });
    }

    this.startPhaseTimer(room, "answering", this.internal.complexity, () => {
      this._handleWrong(room, state, winnerId, "");
    });
  }

  private async _handleAnswer(
    room: Room,
    state: Schema,
    rawAnswer: string,
    sessionId: string,
  ): Promise<void> {
    const clue = this.internal.currentClue;
    if (!clue) return;

    const isLocalMatch = fuzzyMatch(rawAnswer, clue.question);
    if (isLocalMatch) {
      this._handleCorrect(room, state, sessionId);
      return;
    }

    try {
      const { system, user } = buildAnswerJudgePrompt(clue.answer, clue.question, rawAnswer);
      const result = await enqueueAIRequest(room.roomId, () =>
        aiRequest(system, user, AnswerJudgeSchema, { maxTokens: 300, timeoutMs: 8000 }),
      );

      if (result.parsed.correct) {
        this._handleCorrect(room, state, sessionId);
      } else {
        this._handleWrong(room, state, sessionId, rawAnswer);
      }
    } catch (error) {
      console.warn("[BrainBattle] AI judge failed, using local match only:", error);
      this._handleWrong(room, state, sessionId, rawAnswer);
    }
  }

  private _handleCorrect(room: Room, state: Schema, sessionId: string): void {
    const value = this.internal.currentClueValue;
    this.addPoints(state, sessionId, value, `Correct! +$${value}`);
    this.internal.lastCorrectAnswerer = sessionId;
    this.internal.selectorSessionId = sessionId;

    this._showClueResult(room, state, true, sessionId);
  }

  private _handleWrong(room: Room, state: Schema, sessionId: string, playerAnswer: string): void {
    const value = this.internal.currentClueValue;
    this.addPoints(state, sessionId, -value * SCORING.WRONG_DEDUCTION_FACTOR, `Wrong! -$${value}`);
    this.internal.wrongAnswerSessionId = sessionId;

    const appealsLeft = this.internal.appealsRemaining.get(sessionId) ?? 0;
    if (appealsLeft > 0) {
      this.internal.currentAppeal = {
        playerId: sessionId,
        playerAnswer,
        argument: "",
      };
      this._startAppealWindow(room, state, sessionId);
    } else {
      this._showClueResult(room, state, false, null);
    }
  }

  private _startAppealWindow(room: Room, state: Schema, sessionId: string): void {
    this.resetSubmissions(state);
    this.setPhase(state, "appeal-window");

    const appealsLeft = this.internal.appealsRemaining.get(sessionId) ?? 0;

    this._broadcastHost(room, state, {
      clue: this.internal.currentClue,
      wrongAnswer: this.internal.currentAppeal?.playerAnswer ?? "",
      appealingPlayerId: sessionId,
      appealingPlayerName: this._getPlayerName(state, sessionId),
      appealsRemaining: appealsLeft,
    });

    const hostId = (state as unknown as Record<string, unknown>).hostSessionId as string;
    for (const client of room.clients) {
      if (client.sessionId === hostId) continue;
      const canAppeal = client.sessionId === sessionId;
      room.send(client, "private-data", {
        canAppeal,
        appealsRemaining: canAppeal ? appealsLeft : 0,
      });
    }

    this.startPhaseTimer(room, "appeal-window", this.internal.complexity, () => {
      this._showClueResult(room, state, false, null);
    });
  }

  private async _runAppeal(room: Room, state: Schema): Promise<void> {
    const appeal = this.internal.currentAppeal;
    if (!appeal) return;

    const clue = this.internal.currentClue;
    if (!clue) return;

    const remaining = (this.internal.appealsRemaining.get(appeal.playerId) ?? 1) - 1;
    this.internal.appealsRemaining.set(appeal.playerId, Math.max(0, remaining));

    this.setPhase(state, "appeal-judging");
    this._broadcastHost(room, state, {
      appealingPlayerName: this._getPlayerName(state, appeal.playerId),
      argument: appeal.argument,
    });

    try {
      const { system, user } = buildAppealPrompt(
        clue.answer,
        clue.question,
        appeal.playerAnswer,
        appeal.argument,
      );
      const result = await enqueueAIRequest(room.roomId, () =>
        aiRequest(system, user, AppealResultSchema, { maxTokens: 500, timeoutMs: 10000 }),
      );

      this.setPhase(state, "appeal-result");

      if (result.parsed.granted) {
        const value = this.internal.currentClueValue;
        this.addPoints(
          state,
          appeal.playerId,
          value + SCORING.APPEAL_GRANTED_BONUS,
          "Appeal granted!",
        );
        this.internal.lastCorrectAnswerer = appeal.playerId;
        this.internal.selectorSessionId = appeal.playerId;
      }

      this._broadcastHost(room, state, {
        granted: result.parsed.granted,
        reasoning: result.parsed.reasoning,
        appealingPlayerName: this._getPlayerName(state, appeal.playerId),
      });

      this.startPhaseTimer(room, "appeal-result", this.internal.complexity, () => {
        this._showClueResult(
          room,
          state,
          result.parsed.granted,
          result.parsed.granted ? appeal.playerId : null,
        );
      });
    } catch (error) {
      console.warn("[BrainBattle] Appeal AI failed:", error);
      this.setPhase(state, "appeal-result");
      this._broadcastHost(room, state, {
        granted: false,
        reasoning:
          "The judge was momentarily distracted and could not hear your appeal. Case dismissed!",
        appealingPlayerName: this._getPlayerName(state, appeal.playerId),
      });

      this.startPhaseTimer(room, "appeal-result", this.internal.complexity, () => {
        this._showClueResult(room, state, false, null);
      });
    }
  }

  private _showClueResult(
    room: Room,
    state: Schema,
    correct: boolean,
    winnerId: string | null,
  ): void {
    const clue = this.internal.currentClue;
    if (this.internal.currentClueId) {
      this.internal.answeredClues.add(this.internal.currentClueId);
      this.internal.cluesRemaining = Math.max(0, this.internal.cluesRemaining - 1);
    }

    this.setPhase(state, "clue-result");
    this._broadcastHost(room, state, {
      correctAnswer: clue?.question ?? "",
      clueAnswer: clue?.answer ?? "",
      clueValue: clue?.value ?? 0,
      correct,
      winnerId,
      winnerName: winnerId ? this._getPlayerName(state, winnerId) : null,
      cluesRemaining: this.internal.cluesRemaining,
    });

    this.startPhaseTimer(room, "clue-result", this.internal.complexity, () => {
      this._advanceToNextClue(room, state);
    });
  }

  private _advanceToNextClue(room: Room, state: Schema): void {
    if (isBoardComplete(this.internal.answeredClues, 25)) {
      this._showFinalScores(room, state);
      return;
    }

    if (!this.internal.lastCorrectAnswerer) {
      this._rotateSelector(state);
    } else {
      this.internal.selectorSessionId = this.internal.lastCorrectAnswerer;
    }
    this.internal.lastCorrectAnswerer = null;

    const s = state as unknown as Record<string, unknown>;
    s.round = 25 - this.internal.cluesRemaining;

    this._startClueSelect(room, state);
  }

  private _showFinalScores(room: Room, state: Schema): void {
    this.setPhase(state, "final-scores");
    this._broadcastHost(room, state, {
      leaderboard: this.scoringEngine.getLeaderboard(),
    });
  }

  private _rotateSelector(state: Schema): void {
    const activePlayers = this.getActivePlayers(state);
    if (activePlayers.length === 0) return;

    const currentIndex = this.internal.turnOrder.indexOf(this.internal.selectorSessionId);
    for (let offset = 1; offset <= this.internal.turnOrder.length; offset++) {
      const nextIndex = (currentIndex + offset) % this.internal.turnOrder.length;
      const nextId = this.internal.turnOrder[nextIndex];
      if (nextId && activePlayers.includes(nextId)) {
        this.internal.selectorSessionId = nextId;
        return;
      }
    }
    this.internal.selectorSessionId = activePlayers[0] ?? "";
  }

  private _getPlayerName(state: Schema, sessionId: string): string {
    const players = (state as unknown as Record<string, unknown>).players as MapSchema;
    const player = players?.get(sessionId) as Record<string, unknown> | undefined;
    return (player?.name as string) ?? "Unknown";
  }

  private _getBoardForHost(): Record<string, unknown>[] | undefined {
    if (!this.internal.board) return undefined;
    return this.internal.board.categories.map((cat) => ({
      name: cat.name,
      clues: cat.clues.map((clue) => ({
        id: clue.id,
        value: clue.value,
        answered: this.internal.answeredClues.has(clue.id),
      })),
    }));
  }

  private _getBoardForController(): Record<string, unknown>[] | undefined {
    if (!this.internal.board) return undefined;
    return this.internal.board.categories.map((cat) => ({
      name: cat.name,
      clues: cat.clues.map((clue) => ({
        id: clue.id,
        value: clue.value,
        answered: this.internal.answeredClues.has(clue.id),
      })),
    }));
  }
}

export function createBrainBattlePlugin(): BrainBattlePlugin {
  return new BrainBattlePlugin();
}
