"use client";

import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import type { PlayerData, ScoreEntry } from "@partyline/shared";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";

interface HotTakeHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

export function HotTakeHost({
  phase,
  round,
  totalRounds,
  players,
  payload,
  timerEndTime,
}: HotTakeHostProps) {
  switch (phase) {
    case "topic-setup":
      return <TopicSetupHostView payload={payload} players={players} timerEndTime={timerEndTime} />;
    case "ai-generating":
      return <AIGeneratingView />;
    case "showing-prompt":
      return (
        <ShowingPromptView
          payload={payload}
          round={round}
          totalRounds={totalRounds}
          players={players}
        />
      );
    case "voting":
      return <HotTakeVotingView payload={payload} players={players} timerEndTime={timerEndTime} />;
    case "results":
      return <HotTakeResultsView payload={payload} players={players} />;
    case "final-scores":
      return <HotTakeFinalScoresView players={players} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[36px] text-text-muted">Hot Take - {phase}</p>
        </div>
      );
  }
}

function TopicSetupHostView({
  payload,
  players,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
}) {
  const submittedIds = (payload.submittedPlayerIds as string[]) ?? [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <h1 className="font-display text-[64px] text-accent-1">WHAT&apos;S THE TOPIC?</h1>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-4xl text-center text-[32px] text-text-muted"
      >
        Pick a category and submit your angle from your phone
      </motion.p>

      <div className="flex flex-wrap justify-center gap-4">
        {players.map((player) => {
          const hasSubmitted = submittedIds.includes(player.sessionId);
          return (
            <motion.div
              key={player.sessionId}
              animate={{ opacity: hasSubmitted ? 1 : 0.3, scale: hasSubmitted ? 1.06 : 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-[30px] font-bold text-bg-dark"
                style={{
                  backgroundColor: player.avatarColor,
                  boxShadow: hasSubmitted ? `0 0 20px ${player.avatarColor}66` : "none",
                }}
              >
                {hasSubmitted ? "\u2713" : player.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[18px] text-text-muted">{player.name}</span>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1.3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
        className="text-[24px] text-text-muted"
      >
        Grab your phone and submit your topic...
      </motion.p>
    </div>
  );
}

function AIGeneratingView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="text-[84px]"
      >
        {"🔥"}
      </motion.div>
      <h2 className="font-display text-[54px] text-accent-3">COOKING UP YOUR HOT TAKES...</h2>
      <p className="text-[28px] text-text-muted">The AI is crafting personalized provocations</p>
    </div>
  );
}

function ShowingPromptView({
  payload,
  round,
  totalRounds,
  players,
}: {
  payload: Record<string, unknown>;
  round: number;
  totalRounds: number;
  players: PlayerData[];
}) {
  const statement = (payload.statement as string) ?? "Loading hot take...";
  const roundType = payload.roundType === "lone-wolf" ? "lone-wolf" : "majority";
  const activeCount = players.filter((p) => p.connected).length;

  const goalText =
    roundType === "lone-wolf" ? "Be the most unique opinion" : "Match the group's vibe";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <span className="font-display text-[28px] text-text-muted">
        ROUND {round} / {totalRounds}
      </span>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="text-[80px]"
      >
        {"\uD83D\uDD25"}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-5xl text-center font-display text-[52px] leading-tight text-text-primary"
      >
        {statement}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-[28px] text-accent-2"
      >
        {goalText} {activeCount > 0 ? `• ${activeCount} players` : ""}
      </motion.p>
    </div>
  );
}

function HotTakeVotingView({
  payload,
  players,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
}) {
  const statement = (payload.statement as string) ?? "";
  const roundType = payload.roundType === "lone-wolf" ? "lone-wolf" : "majority";
  const votedIds = (payload.votedPlayerIds as string[]) ?? [];
  const activePlayers = players.filter((p) => p.connected);
  const voted = votedIds.length;
  const total = activePlayers.length;

  // Opinion spectrum labels
  const labels = [
    { text: "STRONGLY DISAGREE", position: 0 },
    { text: "DISAGREE", position: 25 },
    { text: "NEUTRAL", position: 50 },
    { text: "AGREE", position: 75 },
    { text: "STRONGLY AGREE", position: 100 },
  ];

  return (
    <div className="flex min-h-screen flex-col p-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-[36px] text-accent-1">HOT TAKE</h2>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      {/* Statement */}
      <div className="mb-12">
        <p className="font-display text-[44px] leading-tight text-text-primary">{statement}</p>
      </div>

      {/* Opinion spectrum */}
      <div className="mb-10">
        <div className="relative h-6 w-full rounded-full bg-bg-card">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.29 12), oklch(0.85 0.18 85), oklch(0.83 0.18 195))",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          {labels.map((label) => (
            <span
              key={label.text}
              className="text-[16px] text-text-muted"
              style={{ width: "20%", textAlign: "center" }}
            >
              {label.text}
            </span>
          ))}
        </div>
      </div>

      {/* Voting status */}
      <div className="mt-auto flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <p className="font-display text-[32px] text-accent-2">RATE YOUR OPINION</p>
          <p className="text-[18px] text-text-muted">
            {roundType === "lone-wolf" ? "Try to stand out" : "Try to match the crowd"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-[300px] overflow-hidden rounded-full bg-bg-card">
            <motion.div
              className="h-full rounded-full bg-accent-2"
              animate={{ width: `${total > 0 ? (voted / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <span className="font-display text-[28px] text-text-primary">
            {voted} / {total} voted
          </span>
        </div>

        {/* Player vote indicators */}
        <div className="flex gap-3">
          {activePlayers.map((player) => {
            const hasVoted = votedIds.includes(player.sessionId);
            return (
              <motion.div
                key={player.sessionId}
                animate={{ opacity: hasVoted ? 1 : 0.3, scale: hasVoted ? 1 : 0.85 }}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="flex h-[48px] w-[48px] items-center justify-center rounded-full text-[22px] font-bold text-bg-dark"
                  style={{
                    backgroundColor: player.avatarColor,
                    boxShadow: hasVoted ? `0 0 12px ${player.avatarColor}60` : "none",
                  }}
                >
                  {hasVoted ? "\u2713" : player.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[14px] text-text-muted">{player.name}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HotTakeResultsView({
  payload,
  players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const statement = (payload.statement as string) ?? "";
  const roundType = payload.roundType === "lone-wolf" ? "lone-wolf" : "majority";
  const votes =
    (payload.votes as Array<{
      sessionId: string;
      value: number; // -2 to +2
    }>) ?? [];
  const anchorValue =
    (payload.anchorValue as number | undefined) ??
    (payload.majorityValue as number | undefined) ??
    0;
  const loneWolves = (payload.loneWolfIds as string[]) ?? [];
  const secondUniqueIds = (payload.secondUniqueIds as string[]) ?? [];
  const matchedMajorityIds = (payload.matchedMajorityIds as string[]) ?? [];

  // Map vote values to spectrum positions (0-100%)
  const voteToPercent = (v: number) => ((v + 2) / 4) * 100;
  const markerLabel = roundType === "lone-wolf" ? "AVERAGE" : "MAJORITY";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <h2 className="font-display text-[48px] text-accent-1">THE RESULTS</h2>

      <p className="max-w-4xl text-center text-[32px] text-text-muted">{statement}</p>

      {/* Opinion spectrum with player positions */}
      <div className="relative w-full max-w-4xl">
        {/* Spectrum bar */}
        <div className="relative h-8 w-full overflow-hidden rounded-full bg-bg-card">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.65 0.29 12), oklch(0.85 0.18 85), oklch(0.83 0.18 195))",
            }}
          />
        </div>

        {/* Majority indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute top-10"
          style={{ left: `${voteToPercent(anchorValue)}%`, transform: "translateX(-50%)" }}
        >
          <div className="flex flex-col items-center">
            <div className="h-4 w-0.5 bg-accent-3" />
            <span className="font-display text-[18px] text-accent-3">{markerLabel}</span>
          </div>
        </motion.div>

        {/* Player vote markers */}
        <AnimatePresence>
          {votes.map((vote, i) => {
            const player = players.find((p) => p.sessionId === vote.sessionId);
            if (!player) return null;
            const isTopLoneWolf = roundType === "lone-wolf" && loneWolves.includes(vote.sessionId);
            const isSecondLoneWolf =
              roundType === "lone-wolf" && secondUniqueIds.includes(vote.sessionId);
            const matchedMajority =
              roundType === "majority" && matchedMajorityIds.includes(vote.sessionId);

            const ringClass = isTopLoneWolf
              ? "ring-2 ring-accent-1 ring-offset-2 ring-offset-bg-dark"
              : isSecondLoneWolf
                ? "ring-2 ring-accent-3 ring-offset-2 ring-offset-bg-dark"
                : matchedMajority
                  ? "ring-2 ring-accent-2 ring-offset-2 ring-offset-bg-dark"
                  : "";

            return (
              <motion.div
                key={vote.sessionId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className="absolute"
                style={{
                  left: `${voteToPercent(vote.value)}%`,
                  top: "-50px",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-[40px] w-[40px] items-center justify-center rounded-full text-[18px] font-bold text-bg-dark ${ringClass}`}
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  {isTopLoneWolf && <span className="text-[14px] text-accent-1">LONE WOLF</span>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Spectrum labels */}
      <div className="flex w-full max-w-4xl justify-between px-2">
        <span className="text-[20px] text-accent-1">DISAGREE</span>
        <span className="text-[20px] text-text-muted">NEUTRAL</span>
        <span className="text-[20px] text-accent-2">AGREE</span>
      </div>

      {/* Majority / Lone Wolf summary */}
      <div className="flex flex-wrap justify-center gap-8">
        {roundType === "lone-wolf" && loneWolves.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-accent-1/30 bg-bg-card p-6"
          >
            <span className="text-[36px]">{"\uD83D\uDE3A"}</span>
            <span className="font-display text-[28px] text-accent-1">LONE WOLVES</span>
            <div className="flex gap-2">
              {loneWolves.map((id) => {
                const player = players.find((p) => p.sessionId === id);
                return player ? (
                  <span key={id} className="text-[22px] text-text-primary">
                    {player.name}
                  </span>
                ) : null;
              })}
            </div>
            <p className="text-[18px] text-text-muted">Against the crowd</p>
          </motion.div>
        )}

        {roundType === "majority" && matchedMajorityIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-accent-2/30 bg-bg-card p-6"
          >
            <span className="text-[36px]">{"\uD83C\uDFAF"}</span>
            <span className="font-display text-[28px] text-accent-2">MATCHED THE MAJORITY</span>
            <div className="flex gap-2">
              {matchedMajorityIds.map((id) => {
                const player = players.find((p) => p.sessionId === id);
                return player ? (
                  <span key={id} className="text-[22px] text-text-primary">
                    {player.name}
                  </span>
                ) : null;
              })}
            </div>
            <p className="text-[18px] text-text-muted">Right on target</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function HotTakeFinalScoresView({ players }: { players: PlayerData[] }) {
  const scores: ScoreEntry[] = players
    .map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      score: p.score,
      rank: 0,
      breakdown: [],
    }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <h1 className="font-display text-[64px] text-accent-3">FINAL SCORES</h1>
      <div className="w-full max-w-4xl">
        <Scoreboard scores={scores} />
      </div>
    </div>
  );
}
