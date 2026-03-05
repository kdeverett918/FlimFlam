"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { Check, Sparkles, X, Zap } from "lucide-react";
import { motion } from "motion/react";

interface ClueResultData {
  results: Array<{
    sessionId: string;
    answer: string;
    correct: boolean;
    delta: number;
    judgedBy?: string;
    judgeExplanation?: string;
  }>;
  correctAnswer: string;
  question: string;
  value: number;
  isPowerPlay: boolean;
}

interface BrainBoardClueResultProps {
  clueResult: ClueResultData;
  players: PlayerData[];
  mySessionId: string | null;
}

export function BrainBoardClueResult({
  clueResult,
  players,
  mySessionId,
}: BrainBoardClueResultProps) {
  const { results, correctAnswer, question, value, isPowerPlay } = clueResult;

  const getPlayerName = (sessionId: string): string => {
    const player = players.find((p) => p.sessionId === sessionId);
    return player?.name ?? "Player";
  };

  const getPlayerColor = (sessionId: string): string => {
    const player = players.find((p) => p.sessionId === sessionId);
    return player?.avatarColor ?? "#6366f1";
  };

  // Collect any AI judge explanations from results
  const judgeExplanation = results.find((r) => r.judgeExplanation)?.judgeExplanation;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex w-full flex-col gap-4 px-4 pb-20"
    >
      {/* Question reminder */}
      <p className="text-center font-body text-sm text-text-muted">{question}</p>

      {/* Power Play badge */}
      {isPowerPlay && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
          className="flex items-center justify-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-1.5 font-display text-xs font-bold text-amber-400 uppercase tracking-widest">
            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
            Power Play
          </span>
        </motion.div>
      )}

      {/* Correct Answer Banner */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.15 }}
      >
        <GlassPanel
          glow
          glowColor="oklch(0.72 0.18 150 / 0.35)"
          className="flex flex-col items-center gap-2 border border-success/30 bg-success/10 px-5 py-4"
        >
          <span className="font-body text-xs font-medium text-success uppercase tracking-wider">
            Correct Answer
          </span>
          <span className="font-display text-2xl font-black text-text-primary">
            {correctAnswer}
          </span>
          <span className="font-mono text-sm font-bold text-success">
            ${value.toLocaleString()}
          </span>
        </GlassPanel>
      </motion.div>

      {/* Player Results List */}
      <div className="flex flex-col gap-2">
        {results.map((result, index) => {
          const isMe = result.sessionId === mySessionId;
          const playerName = getPlayerName(result.sessionId);
          const avatarColor = getPlayerColor(result.sessionId);

          return (
            <motion.div
              key={result.sessionId}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 24,
                delay: 0.3 + index * 0.12,
              }}
            >
              <GlassPanel
                className={`flex items-center gap-3 px-3 py-3 ${
                  isMe ? "border border-accent-brainboard/30 bg-accent-brainboard/8" : ""
                }`}
              >
                {/* Left: Avatar + Name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ backgroundColor: avatarColor }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`truncate font-body text-sm ${
                        isMe ? "font-bold text-text-primary" : "font-medium text-text-primary"
                      }`}
                    >
                      {playerName}
                      {isMe && (
                        <span className="ml-1.5 rounded bg-accent-brainboard/15 px-1 py-0.5 text-[10px] font-bold text-accent-brainboard uppercase">
                          You
                        </span>
                      )}
                    </span>
                    <span className="truncate font-body text-xs text-text-muted">
                      {result.answer || "No answer"}
                    </span>
                  </div>
                </div>

                {/* Right: Correct/Wrong icon + Delta */}
                <div className="flex shrink-0 items-center gap-2">
                  {result.correct ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15">
                      <Check className="h-4 w-4 text-success" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15">
                      <X className="h-4 w-4 text-destructive" strokeWidth={3} />
                    </div>
                  )}
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      result.delta >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {result.delta >= 0 ? "+" : ""}${Math.abs(result.delta).toLocaleString()}
                  </span>
                </div>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>

      {/* AI Judge Explanation */}
      {judgeExplanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + results.length * 0.12 + 0.15, duration: 0.4 }}
        >
          <GlassPanel className="flex items-start gap-2.5 px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-brainboard" strokeWidth={2} />
            <p className="font-body text-xs leading-relaxed text-text-muted">{judgeExplanation}</p>
          </GlassPanel>
        </motion.div>
      )}
    </motion.div>
  );
}
