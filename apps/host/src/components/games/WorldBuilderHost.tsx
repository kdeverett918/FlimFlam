"use client";

import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import { TypewriterText } from "@/components/game/TypewriterText";
import type { PlayerData, ScoreEntry, WorldState } from "@partyline/shared";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface WorldBuilderHostProps {
  phase: string;
  round: number;
  totalRounds: number;
  players: PlayerData[];
  payload: Record<string, unknown>;
  timerEndTime: number | null;
  room: Room | null;
}

export function WorldBuilderHost({
  phase,
  round,
  totalRounds,
  players,
  payload,
  timerEndTime,
}: WorldBuilderHostProps) {
  switch (phase) {
    case "generating":
      return <GeneratingView />;
    case "role-reveal":
      return <RoleRevealView payload={payload} timerEndTime={timerEndTime} />;
    case "action-input":
      return (
        <ActionInputView
          payload={payload}
          players={players}
          timerEndTime={timerEndTime}
          round={round}
          totalRounds={totalRounds}
        />
      );
    case "ai-narrating":
      return <AINarratingView round={round} totalRounds={totalRounds} />;
    case "narration-display":
      return <NarrationDisplayView payload={payload} />;
    case "reveal":
      return <RevealView payload={payload} players={players} timerEndTime={timerEndTime} />;
    case "final-scores":
      return <FinalScoresView payload={payload} players={players} />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-display text-[36px] text-text-muted">World Builder - {phase}</p>
        </div>
      );
  }
}

function GeneratingView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      {/* Animated world generation effect */}
      <div className="relative h-[200px] w-[200px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-accent-4/30 border-t-accent-4"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="absolute inset-4 rounded-full border-4 border-accent-2/30 border-t-accent-2"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="absolute inset-8 rounded-full border-4 border-accent-1/30 border-t-accent-1"
        />
        <div className="absolute inset-0 flex items-center justify-center text-[64px]">
          {"\uD83C\uDF0D"}
        </div>
      </div>
      <h2 className="animate-glow-pulse font-display text-[56px] text-text-primary">
        BUILDING YOUR WORLD
      </h2>
      <p className="text-[28px] text-text-muted">The AI is crafting a unique scenario...</p>
    </div>
  );
}

function RoleRevealView({
  payload,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  timerEndTime: number | null;
}) {
  const setting = (payload.setting as string) ?? "A mysterious world";
  const situation = (payload.situation as string) ?? "An adventure awaits...";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      {timerEndTime && (
        <div className="absolute right-12 top-12">
          <Timer endTime={timerEndTime} />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <h2 className="font-display text-[48px] text-accent-4">THE SETTING</h2>
        <p className="max-w-4xl text-[36px] leading-relaxed text-text-primary">{setting}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <h2 className="font-display text-[48px] text-accent-1">THE SITUATION</h2>
        <p className="max-w-4xl text-[32px] leading-relaxed text-text-muted">{situation}</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-[28px] text-accent-2"
      >
        Check your phones for your secret role!
      </motion.p>
    </div>
  );
}

function ActionInputView({
  payload,
  players,
  timerEndTime,
  round,
  totalRounds,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
  round: number;
  totalRounds: number;
}) {
  const narrative = (payload.narrative as string) ?? "The story continues...";
  const submittedIds = (payload.submittedPlayerIds as string[]) ?? [];
  const worldState = (payload.worldState as WorldState | undefined) ?? undefined;
  const submitted = submittedIds.length;
  const total = players.length;

  return (
    <div className="flex min-h-screen flex-col p-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="font-display text-[32px] text-text-muted">
          ROUND {round} / {totalRounds}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      {/* Narrative */}
      <div className="mb-12 max-w-5xl">
        <p className="text-[32px] leading-relaxed text-text-primary">{narrative}</p>
      </div>

      {/* World state summary */}
      {worldState && (
        <div className="mb-12 w-full max-w-5xl rounded-2xl border border-bg-card bg-bg-card/40 p-6">
          <div className="mb-4 grid grid-cols-2 gap-6 text-[20px] text-text-muted">
            <div>
              <span className="font-display text-text-primary">Location:</span>{" "}
              {worldState.location || "Unknown"}
            </div>
            <div>
              <span className="font-display text-text-primary">Time Pressure:</span>{" "}
              {worldState.timePressure || "None"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-[18px] text-text-muted">
            <div>
              <div className="mb-2 font-display text-[18px] text-accent-4">RESOURCES</div>
              <ul className="list-disc pl-5">
                {(worldState.keyResources ?? []).slice(0, 5).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 font-display text-[18px] text-accent-1">THREATS</div>
              <ul className="list-disc pl-5">
                {(worldState.threats ?? []).slice(0, 5).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 font-display text-[18px] text-accent-2">OPPORTUNITIES</div>
              <ul className="list-disc pl-5">
                {(worldState.opportunities ?? []).slice(0, 5).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Player action status */}
      <div className="mt-auto flex flex-col items-center gap-6">
        <h3 className="font-display text-[40px] text-accent-2">PLAYERS ARE DECIDING...</h3>
        <div className="flex items-center gap-4">
          <div className="h-4 w-[300px] overflow-hidden rounded-full bg-bg-card">
            <motion.div
              className="h-full rounded-full bg-accent-2"
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? (submitted / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
          <span className="font-display text-[32px] text-text-primary">
            {submitted} / {total}
          </span>
        </div>

        {/* Player avatars with status */}
        <div className="flex gap-4">
          {players.map((player) => {
            const hasSubmitted = submittedIds.includes(player.sessionId);
            return (
              <motion.div
                key={player.sessionId}
                animate={{
                  opacity: hasSubmitted ? 1 : 0.4,
                  scale: hasSubmitted ? 1 : 0.9,
                }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-[28px] font-bold text-bg-dark"
                  style={{
                    backgroundColor: player.avatarColor,
                    boxShadow: hasSubmitted ? `0 0 16px ${player.avatarColor}60` : "none",
                  }}
                >
                  {hasSubmitted ? "\u2713" : player.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-[18px] text-text-muted">{player.name}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AINarratingView({ round, totalRounds }: { round: number; totalRounds: number }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="font-display text-[28px] text-text-muted">
        ROUND {round} / {totalRounds}
      </div>

      {/* Dramatic loading animation */}
      <div className="relative h-[160px] w-[160px]">
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px oklch(0.55 0.28 285 / 0.3)",
              "0 0 60px oklch(0.65 0.29 12 / 0.5)",
              "0 0 20px oklch(0.55 0.28 285 / 0.3)",
            ],
          }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="absolute inset-0 rounded-full bg-bg-card"
        />
        <div className="absolute inset-0 flex items-center justify-center text-[72px]">
          {"\u270D\uFE0F"}
        </div>
      </div>

      <h2 className="font-display text-[56px] text-text-primary">THE AI NARRATES{dots}</h2>
      <p className="text-[28px] text-text-muted">Weaving your actions into the story</p>
    </div>
  );
}

function NarrationDisplayView({ payload }: { payload: Record<string, unknown> }) {
  const narration = (payload.narration as string) ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center p-16">
      <div className="max-w-5xl">
        <TypewriterText
          text={narration}
          speed={35}
          className="text-[36px] leading-relaxed text-text-primary"
        />
      </div>
    </div>
  );
}

function RevealView({
  payload,
  players,
  timerEndTime,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
  timerEndTime: number | null;
}) {
  const roleReveals =
    (payload.roleReveals as
      | Record<string, { roleName: string; secretObjective: string; progress: number }>
      | undefined) ?? {};

  const revealEntries = players
    .map((player) => {
      const reveal = roleReveals[player.sessionId];
      if (!reveal) return null;
      return { player, reveal };
    })
    .filter(Boolean) as Array<{
    player: PlayerData;
    reveal: { roleName: string; secretObjective: string; progress: number };
  }>;

  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < revealEntries.length) {
      const remainingMs = timerEndTime ? Math.max(timerEndTime - Date.now(), 0) : 15_000;
      const intervalMs = Math.max(
        350,
        Math.floor((remainingMs * 0.85) / Math.max(revealEntries.length, 1)),
      );
      const timer = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, intervalMs);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, revealEntries.length, timerEndTime]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      {timerEndTime && (
        <div className="absolute right-12 top-12">
          <Timer endTime={timerEndTime} />
        </div>
      )}
      <h2 className="mb-6 font-display text-[56px] text-accent-1">THE REVEAL</h2>

      <div className="flex w-full max-w-5xl flex-col gap-6">
        <AnimatePresence>
          {revealEntries.slice(0, visibleCount).map((entry, index) => {
            const player = entry.player;
            const reveal = entry.reveal;
            const progress = Math.max(0, Math.min(100, reveal.progress ?? 0));
            return (
              <motion.div
                key={player.sessionId}
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 20, delay: index * 0.1 }}
                className="flex items-start gap-6 rounded-2xl border border-bg-card bg-bg-card/80 p-6"
              >
                <div
                  className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full text-[30px] font-bold text-bg-dark"
                  style={{ backgroundColor: player?.avatarColor ?? "#666" }}
                >
                  {player?.name.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-[28px] text-text-primary">
                      {player?.name ?? "Unknown"}
                    </span>
                    <span className="rounded-full bg-accent-4/15 px-3 py-1 font-display text-[18px] text-accent-4">
                      {reveal.roleName}
                    </span>
                  </div>
                  <p className="text-[22px] leading-relaxed text-text-muted">
                    {reveal.secretObjective || "No objective revealed."}
                  </p>

                  <div className="mt-2 flex items-center gap-4">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-card">
                      <motion.div
                        className="h-full rounded-full bg-accent-2"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      />
                    </div>
                    <span className="w-[72px] text-right font-display text-[20px] text-accent-2">
                      {progress}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FinalScoresView({
  payload,
  players,
}: {
  payload: Record<string, unknown>;
  players: PlayerData[];
}) {
  const bonusAwards = payload.bonusAwards as
    | {
        bestAction?: { sessionId: string; reason: string; points: number };
        chaosAgent?: { sessionId: string; reason: string; points: number };
        mvpMoment?: { description: string };
      }
    | undefined;

  const scores: ScoreEntry[] = players
    .map((p, i) => ({
      sessionId: p.sessionId,
      name: p.name,
      score: p.score,
      rank: i + 1,
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

      {/* Bonus awards */}
      {bonusAwards && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-wrap justify-center gap-6"
        >
          {bonusAwards.bestAction && (
            <BonusCard
              title="Best Action"
              emoji={"\uD83C\uDFC6"}
              playerName={
                players.find((p) => p.sessionId === bonusAwards.bestAction?.sessionId)?.name ??
                "Unknown"
              }
              reason={bonusAwards.bestAction.reason}
              points={bonusAwards.bestAction.points}
            />
          )}
          {bonusAwards.chaosAgent && (
            <BonusCard
              title="Chaos Agent"
              emoji={"\uD83C\uDF2A\uFE0F"}
              playerName={
                players.find((p) => p.sessionId === bonusAwards.chaosAgent?.sessionId)?.name ??
                "Unknown"
              }
              reason={bonusAwards.chaosAgent.reason}
              points={bonusAwards.chaosAgent.points}
            />
          )}
          {bonusAwards.mvpMoment && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-accent-4/30 bg-bg-card p-6">
              <span className="text-[32px]">{"\u2B50"}</span>
              <span className="font-display text-[24px] text-accent-4">MVP Moment</span>
              <p className="max-w-xs text-center text-[20px] text-text-muted">
                {bonusAwards.mvpMoment.description}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function BonusCard({
  title,
  emoji,
  playerName,
  reason,
  points,
}: {
  title: string;
  emoji: string;
  playerName: string;
  reason: string;
  points: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-accent-3/30 bg-bg-card p-6">
      <span className="text-[32px]">{emoji}</span>
      <span className="font-display text-[24px] text-accent-3">{title}</span>
      <span className="font-display text-[28px] text-text-primary">{playerName}</span>
      <p className="max-w-xs text-center text-[20px] text-text-muted">{reason}</p>
      <span className="font-display text-[24px] text-accent-2">+{points} pts</span>
    </div>
  );
}
