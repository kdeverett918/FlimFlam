"use client";

import { FinalScoresLayout, buildScores } from "@/components/game/FinalScoresLayout";
import { Timer } from "@/components/game/Timer";
import type { PlayerData } from "@flimflam/shared";
import { AnimatedBackground, GlassPanel } from "@flimflam/ui";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Target, Users } from "lucide-react";

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
  room,
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
      return (
        <FinalScoresLayout
          scores={buildScores(players)}
          accentColorClass="text-accent-6"
          room={room}
        />
      );
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <AnimatedBackground variant="subtle" />
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />

      <div className="relative z-10 mb-4 flex w-full max-w-5xl items-center justify-between">
        <h1 className="font-display text-[64px] font-bold text-accent-6">WHAT&apos;S THE TOPIC?</h1>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 max-w-4xl text-center font-body text-[32px] text-text-muted"
      >
        Pick a category and submit your angle from your phone
      </motion.p>

      <div className="relative z-10 flex flex-wrap justify-center gap-4">
        {players.map((player) => {
          const hasSubmitted = submittedIds.includes(player.sessionId);
          return (
            <motion.div
              key={player.sessionId}
              animate={{ opacity: hasSubmitted ? 1 : 0.3, scale: hasSubmitted ? 1.06 : 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full font-body text-[30px] font-bold text-bg-deep"
                style={{
                  backgroundColor: player.avatarColor,
                  boxShadow: hasSubmitted ? `0 0 20px ${player.avatarColor}66` : "none",
                }}
              >
                {hasSubmitted ? "\u2713" : player.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-body text-[18px] text-text-muted">{player.name}</span>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1.3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
        className="relative z-10 font-body text-[24px] text-text-muted"
      >
        Grab your phone and submit your topic...
      </motion.p>
    </div>
  );
}

function AIGeneratingView() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="relative z-10"
      >
        <Flame className="h-20 w-20 text-accent-6" />
      </motion.div>
      <h2
        className="relative z-10 font-display text-[54px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.68 0.25 20 / 0.4)" }}
      >
        COOKING UP YOUR HOT TAKES...
      </h2>
      <p className="relative z-10 font-body text-[28px] text-text-muted">
        The AI is crafting personalized provocations
      </p>
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />

      <span className="relative z-10 font-display text-[28px] font-semibold text-text-muted">
        ROUND {round} / {totalRounds}
      </span>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10"
      >
        <Flame className="h-20 w-20 text-accent-6" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10"
      >
        <GlassPanel
          glow
          glowColor="oklch(0.68 0.25 20 / 0.2)"
          rounded="2xl"
          className="max-w-5xl p-10 text-center"
        >
          <h2 className="font-display text-[52px] font-bold leading-tight text-text-primary">
            {statement}
          </h2>
        </GlassPanel>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 text-center font-body text-[28px] text-accent-6"
      >
        {goalText} {activeCount > 0 ? `-- ${activeCount} players` : ""}
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

  const labels = [
    { text: "STRONGLY DISAGREE", position: 0 },
    { text: "DISAGREE", position: 25 },
    { text: "NEUTRAL", position: 50 },
    { text: "AGREE", position: 75 },
    { text: "STRONGLY AGREE", position: 100 },
  ];

  return (
    <div className="relative flex min-h-screen flex-col p-12">
      <AnimatedBackground variant="subtle" />

      <div className="relative z-10 mb-6 flex items-center justify-between">
        <h2 className="font-display text-[36px] font-bold text-accent-6">HOT TAKE</h2>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      <GlassPanel rounded="2xl" className="relative z-10 mb-12 p-8">
        <p className="font-display text-[44px] font-bold italic leading-tight text-text-primary">
          {statement}
        </p>
      </GlassPanel>

      {/* Opinion spectrum */}
      <div className="relative z-10 mb-10">
        <div className="relative h-8 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.68 0.25 20), oklch(0.78 0.18 85), oklch(0.70 0.15 210), oklch(0.72 0.18 160))",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          {labels.map((label) => (
            <span
              key={label.text}
              className="font-body text-[16px] text-text-muted"
              style={{ width: "20%", textAlign: "center" }}
            >
              {label.text}
            </span>
          ))}
        </div>
      </div>

      {/* Voting status */}
      <div className="relative z-10 mt-auto flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <p className="font-display text-[32px] font-bold text-accent-6">RATE YOUR OPINION</p>
          <p className="font-body text-[18px] text-text-muted">
            {roundType === "lone-wolf" ? "Try to stand out" : "Try to match the crowd"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <GlassPanel rounded="2xl" className="h-4 w-[300px] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent-6"
              animate={{ width: `${total > 0 ? (voted / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </GlassPanel>
          <span className="font-mono text-[28px] font-bold text-text-primary">
            {voted} / {total} voted
          </span>
        </div>

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
                  className="flex h-[48px] w-[48px] items-center justify-center rounded-full font-body text-[22px] font-bold text-bg-deep"
                  style={{
                    backgroundColor: player.avatarColor,
                    boxShadow: hasVoted ? `0 0 12px ${player.avatarColor}60` : "none",
                  }}
                >
                  {hasVoted ? "\u2713" : player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-body text-[14px] text-text-muted">{player.name}</span>
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
      value: number;
    }>) ?? [];
  const anchorValue =
    (payload.anchorValue as number | undefined) ??
    (payload.majorityValue as number | undefined) ??
    0;
  const loneWolves = (payload.loneWolfIds as string[]) ?? [];
  const secondUniqueIds = (payload.secondUniqueIds as string[]) ?? [];
  const matchedMajorityIds = (payload.matchedMajorityIds as string[]) ?? [];

  const voteToPercent = (v: number) => ((v + 2) / 4) * 100;
  const markerLabel = roundType === "lone-wolf" ? "AVERAGE" : "MAJORITY";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      <h2 className="relative z-10 font-display text-[48px] font-bold text-accent-6">
        THE RESULTS
      </h2>

      <p className="relative z-10 max-w-4xl text-center font-body text-[32px] text-text-muted">
        {statement}
      </p>

      {/* Opinion spectrum with player positions */}
      <div className="relative z-10 w-full max-w-4xl pt-16">
        <div className="relative h-8 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.68 0.25 20), oklch(0.78 0.18 85), oklch(0.70 0.15 210), oklch(0.72 0.18 160))",
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
            <div className="h-4 w-0.5 bg-accent-6" />
            <span className="font-display text-[18px] font-bold text-accent-6">{markerLabel}</span>
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
              ? "ring-2 ring-accent-6 ring-offset-2 ring-offset-bg-deep"
              : isSecondLoneWolf
                ? "ring-2 ring-accent-3 ring-offset-2 ring-offset-bg-deep"
                : matchedMajority
                  ? "ring-2 ring-accent-5 ring-offset-2 ring-offset-bg-deep"
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
                  bottom: "calc(100% + 8px)",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-[40px] w-[40px] items-center justify-center rounded-full font-body text-[18px] font-bold text-bg-deep ${ringClass}`}
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  {isTopLoneWolf && (
                    <span className="font-body text-[14px] text-accent-6">LONE WOLF</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Spectrum labels */}
      <div className="relative z-10 flex w-full max-w-4xl justify-between px-2">
        <span className="font-body text-[20px] text-accent-6">DISAGREE</span>
        <span className="font-body text-[20px] text-text-muted">NEUTRAL</span>
        <span className="font-body text-[20px] text-accent-5">AGREE</span>
      </div>

      {/* Majority / Lone Wolf summary */}
      <div className="relative z-10 flex flex-wrap justify-center gap-8">
        {roundType === "lone-wolf" && loneWolves.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <GlassPanel
              glow
              glowColor="oklch(0.68 0.25 20 / 0.3)"
              rounded="2xl"
              className="flex flex-col items-center gap-3 p-6"
            >
              <Users className="h-8 w-8 text-accent-6" />
              <span className="font-display text-[28px] font-bold text-accent-6">LONE WOLVES</span>
              <div className="flex gap-2">
                {loneWolves.map((id) => {
                  const player = players.find((p) => p.sessionId === id);
                  return player ? (
                    <span key={id} className="font-body text-[22px] text-text-primary">
                      {player.name}
                    </span>
                  ) : null;
                })}
              </div>
              <p className="font-body text-[18px] text-text-muted">Against the crowd</p>
            </GlassPanel>
          </motion.div>
        )}

        {roundType === "majority" && matchedMajorityIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <GlassPanel
              glow
              glowColor="oklch(0.70 0.15 210 / 0.3)"
              rounded="2xl"
              className="flex flex-col items-center gap-3 p-6"
            >
              <Target className="h-8 w-8 text-accent-5" />
              <span className="font-display text-[28px] font-bold text-accent-5">
                MATCHED THE MAJORITY
              </span>
              <div className="flex gap-2">
                {matchedMajorityIds.map((id) => {
                  const player = players.find((p) => p.sessionId === id);
                  return player ? (
                    <span key={id} className="font-body text-[22px] text-text-primary">
                      {player.name}
                    </span>
                  ) : null;
                })}
              </div>
              <p className="font-body text-[18px] text-text-muted">Right on target</p>
            </GlassPanel>
          </motion.div>
        )}
      </div>
    </div>
  );
}

