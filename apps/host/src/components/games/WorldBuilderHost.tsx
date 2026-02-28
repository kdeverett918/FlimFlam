"use client";

import { Scoreboard } from "@/components/game/Scoreboard";
import { Timer } from "@/components/game/Timer";
import { TypewriterText } from "@/components/game/TypewriterText";
import type { PlayerData, ScoreEntry, WorldState } from "@partyline/shared";
import { AnimatedBackground, GlassPanel } from "@partyline/ui";
import type { Room } from "colyseus.js";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Globe, Loader2, Star, Zap } from "lucide-react";
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
          <AnimatedBackground variant="subtle" />
          <p className="font-display text-[36px] text-text-muted">World Builder - {phase}</p>
        </div>
      );
  }
}

function GeneratingView() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8">
      <AnimatedBackground />

      {/* Animated concentric rings */}
      <div className="relative h-[200px] w-[200px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-accent-2/40"
          style={{ boxShadow: "0 0 20px oklch(0.7 0.2 330 / 0.2)" }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="absolute inset-4 rounded-full border-2 border-accent-2/60"
          style={{ boxShadow: "0 0 16px oklch(0.7 0.2 330 / 0.3)" }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="absolute inset-8 rounded-full border-2 border-accent-2/80"
          style={{ boxShadow: "0 0 12px oklch(0.7 0.2 330 / 0.4)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Globe className="h-16 w-16 text-accent-2" />
        </div>
      </div>

      <h2
        className="font-display text-[56px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.7 0.2 330 / 0.4)" }}
      >
        BUILDING YOUR WORLD
      </h2>
      <p className="font-body text-[28px] text-text-muted">
        The AI is crafting a unique scenario...
      </p>
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />

      {timerEndTime && (
        <div className="absolute right-12 top-12 z-10">
          <Timer endTime={timerEndTime} />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        <GlassPanel
          glow
          glowColor="oklch(0.7 0.2 330 / 0.25)"
          rounded="2xl"
          className="max-w-4xl p-10 text-center"
        >
          <h2 className="mb-4 font-display text-[48px] font-bold text-accent-2">THE SETTING</h2>
          <p className="font-body text-[36px] leading-relaxed text-text-primary">{setting}</p>
        </GlassPanel>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10"
      >
        <GlassPanel rounded="2xl" className="max-w-4xl p-10 text-center">
          <h2 className="mb-4 font-display text-[48px] font-bold text-accent-6">THE SITUATION</h2>
          <p className="font-body text-[32px] leading-relaxed text-text-muted">{situation}</p>
        </GlassPanel>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 font-body text-[28px] text-accent-2"
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
    <div className="relative flex min-h-screen flex-col p-12">
      <AnimatedBackground variant="subtle" />

      {/* Header */}
      <div className="relative z-10 mb-8 flex items-center justify-between">
        <div className="font-display text-[32px] font-semibold text-text-muted">
          ROUND {round} / {totalRounds}
        </div>
        {timerEndTime && <Timer endTime={timerEndTime} />}
      </div>

      {/* Narrative */}
      <GlassPanel rounded="2xl" className="relative z-10 mb-8 max-w-5xl p-8">
        <p className="font-body text-[32px] leading-relaxed text-text-primary">{narrative}</p>
      </GlassPanel>

      {/* World state summary */}
      {worldState && (
        <GlassPanel rounded="2xl" className="relative z-10 mb-8 w-full max-w-5xl p-6">
          <div className="mb-4 grid grid-cols-2 gap-6 font-body text-[20px] text-text-muted">
            <div>
              <span className="font-display font-semibold text-text-primary">Location:</span>{" "}
              {worldState.location || "Unknown"}
            </div>
            <div>
              <span className="font-display font-semibold text-text-primary">Time Pressure:</span>{" "}
              {worldState.timePressure || "None"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 font-body text-[18px] text-text-muted">
            <div>
              <div className="mb-2 font-display text-[18px] font-semibold text-accent-4">
                RESOURCES
              </div>
              <ul className="list-disc pl-5">
                {(worldState.keyResources ?? []).slice(0, 5).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 font-display text-[18px] font-semibold text-accent-6">
                THREATS
              </div>
              <ul className="list-disc pl-5">
                {(worldState.threats ?? []).slice(0, 5).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 font-display text-[18px] font-semibold text-accent-2">
                OPPORTUNITIES
              </div>
              <ul className="list-disc pl-5">
                {(worldState.opportunities ?? []).slice(0, 5).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Player action status */}
      <div className="relative z-10 mt-auto flex flex-col items-center gap-6">
        <h3 className="font-display text-[40px] font-bold text-accent-2">
          PLAYERS ARE DECIDING...
        </h3>
        <div className="flex items-center gap-4">
          <GlassPanel rounded="2xl" className="h-4 w-[300px] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent-2"
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? (submitted / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </GlassPanel>
          <span className="font-mono text-[32px] font-bold text-text-primary">
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
                  className="flex h-[60px] w-[60px] items-center justify-center rounded-full font-body text-[28px] font-bold text-bg-deep"
                  style={{
                    backgroundColor: player.avatarColor,
                    boxShadow: hasSubmitted ? `0 0 16px ${player.avatarColor}60` : "none",
                  }}
                >
                  {hasSubmitted ? "\u2713" : player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-body text-[18px] text-text-muted">{player.name}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AINarratingView({ round, totalRounds }: { round: number; totalRounds: number }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8">
      <AnimatedBackground />

      <div className="relative z-10 font-display text-[28px] font-semibold text-text-muted">
        ROUND {round} / {totalRounds}
      </div>

      {/* Dramatic loading animation */}
      <div className="relative z-10">
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px oklch(0.7 0.2 330 / 0.3)",
              "0 0 60px oklch(0.7 0.2 330 / 0.5)",
              "0 0 20px oklch(0.7 0.2 330 / 0.3)",
            ],
          }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="flex h-[160px] w-[160px] items-center justify-center rounded-full bg-bg-surface"
        >
          <Loader2 className="h-20 w-20 animate-spin text-accent-2" />
        </motion.div>
      </div>

      <h2
        className="relative z-10 font-display text-[56px] font-bold text-text-primary"
        style={{ textShadow: "0 0 30px oklch(0.7 0.2 330 / 0.3)" }}
      >
        THE AI NARRATES
      </h2>
      <p className="relative z-10 font-body text-[28px] text-text-muted">
        Weaving your actions into the story
      </p>
    </div>
  );
}

function NarrationDisplayView({ payload }: { payload: Record<string, unknown> }) {
  const narration = (payload.narration as string) ?? "";

  return (
    <div className="relative flex min-h-screen items-center justify-center p-16">
      <AnimatedBackground variant="subtle" />
      <GlassPanel
        glow
        glowColor="oklch(0.7 0.2 330 / 0.15)"
        rounded="2xl"
        className="relative z-10 max-w-5xl p-12"
      >
        <TypewriterText
          text={narration}
          speed={35}
          className="font-body text-[36px] leading-relaxed text-text-primary"
        />
      </GlassPanel>
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <AnimatedBackground variant="subtle" />

      {timerEndTime && (
        <div className="absolute right-12 top-12 z-10">
          <Timer endTime={timerEndTime} />
        </div>
      )}
      <h2 className="relative z-10 mb-6 font-display text-[56px] font-bold text-accent-2">
        THE REVEAL
      </h2>

      <div className="relative z-10 flex w-full max-w-5xl flex-col gap-6">
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
              >
                <GlassPanel rounded="2xl" className="flex items-start gap-6 p-6">
                  <div
                    className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full font-body text-[30px] font-bold text-bg-deep"
                    style={{ backgroundColor: player?.avatarColor ?? "#666" }}
                  >
                    {player?.name.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <span className="font-display text-[28px] font-semibold text-text-primary">
                        {player?.name ?? "Unknown"}
                      </span>
                      <span className="rounded-full bg-accent-2/15 px-3 py-1 font-display text-[18px] text-accent-2">
                        {reveal.roleName}
                      </span>
                    </div>
                    <p className="font-body text-[22px] leading-relaxed text-text-muted">
                      {reveal.secretObjective || "No objective revealed."}
                    </p>

                    <div className="mt-2 flex items-center gap-4">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-surface">
                        <motion.div
                          className="h-full rounded-full bg-accent-2"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ type: "spring", stiffness: 120, damping: 18 }}
                        />
                      </div>
                      <span className="w-[72px] text-right font-mono text-[20px] font-bold text-accent-2">
                        {progress}%
                      </span>
                    </div>
                  </div>
                </GlassPanel>
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 p-12">
      <AnimatedBackground variant="subtle" />

      <h1 className="relative z-10 font-display text-[64px] font-bold text-accent-2">
        FINAL SCORES
      </h1>

      <div className="relative z-10 w-full max-w-4xl">
        <Scoreboard scores={scores} />
      </div>

      {/* Bonus awards */}
      {bonusAwards && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="relative z-10 flex flex-wrap justify-center gap-6"
        >
          {bonusAwards.bestAction && (
            <BonusCard
              title="Best Action"
              icon={<Award className="h-8 w-8 text-accent-2" />}
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
              icon={<Zap className="h-8 w-8 text-accent-6" />}
              playerName={
                players.find((p) => p.sessionId === bonusAwards.chaosAgent?.sessionId)?.name ??
                "Unknown"
              }
              reason={bonusAwards.chaosAgent.reason}
              points={bonusAwards.chaosAgent.points}
            />
          )}
          {bonusAwards.mvpMoment && (
            <GlassPanel glow rounded="2xl" className="flex flex-col items-center gap-2 p-6">
              <Star className="h-8 w-8 text-accent-4" />
              <span className="font-display text-[24px] font-bold text-accent-4">MVP Moment</span>
              <p className="max-w-xs text-center font-body text-[20px] text-text-muted">
                {bonusAwards.mvpMoment.description}
              </p>
            </GlassPanel>
          )}
        </motion.div>
      )}
    </div>
  );
}

function BonusCard({
  title,
  icon,
  playerName,
  reason,
  points,
}: {
  title: string;
  icon: React.ReactNode;
  playerName: string;
  reason: string;
  points: number;
}) {
  return (
    <GlassPanel glow rounded="2xl" className="flex flex-col items-center gap-2 p-6">
      {icon}
      <span className="font-display text-[24px] font-bold text-accent-2">{title}</span>
      <span className="font-display text-[28px] font-semibold text-text-primary">{playerName}</span>
      <p className="max-w-xs text-center font-body text-[20px] text-text-muted">{reason}</p>
      <span className="font-mono text-[24px] font-bold text-accent-2">+{points} pts</span>
    </GlassPanel>
  );
}
