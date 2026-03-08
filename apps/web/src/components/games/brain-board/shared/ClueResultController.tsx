"use client";

import type { PlayerData } from "@flimflam/shared";
import { AnimatedCounter, GlassPanel, haptics, sounds } from "@flimflam/ui";
import { Check, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { getPlayerColor, getPlayerName } from "./bb-helpers";
import type { ClueResultData } from "./bb-types";

interface ClueResultControllerProps {
  clueResult: ClueResultData;
  players: PlayerData[];
  mySessionId: string | null;
}

export function ClueResultController({
  clueResult,
  players,
  mySessionId,
}: ClueResultControllerProps) {
  const { results, correctAnswer, question, value, isPowerPlay } = clueResult;

  const myResult = useMemo(
    () => results.find((r) => r.sessionId === mySessionId),
    [results, mySessionId],
  );
  const otherResults = useMemo(
    () => results.filter((r) => r.sessionId !== mySessionId),
    [results, mySessionId],
  );

  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = results.length;

  const judgeExplanation = results.find((r) => r.judgeExplanation)?.judgeExplanation;

  // Haptic + sound feedback on mount
  useEffect(() => {
    if (myResult?.correct) {
      sounds.correct();
      haptics.confirm();
    } else {
      sounds.strike();
      haptics.error();
    }
  }, [myResult?.correct]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex w-full flex-col gap-4 px-4 pb-20"
    >
      {/* Question reminder */}
      <p className="text-center font-body text-sm text-text-muted">{question}</p>

      {/* Power Play badge */}
      {isPowerPlay && (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-1.5 font-display text-xs font-bold text-amber-400 uppercase tracking-widest">
            Power Play
          </span>
        </div>
      )}

      {/* Personal result card */}
      {myResult && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.1 }}
        >
          <GlassPanel
            glow
            glowColor={
              myResult.correct ? "oklch(0.72 0.18 150 / 0.35)" : "oklch(0.65 0.2 25 / 0.25)"
            }
            className={`flex flex-col items-center gap-3 px-5 py-5 border ${
              myResult.correct
                ? "border-success/30 bg-success/10"
                : "border-destructive/30 bg-destructive/8"
            }`}
          >
            <div className="flex items-center gap-2">
              {myResult.correct ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
                  <Check className="h-5 w-5 text-success" strokeWidth={3} />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/20">
                  <X className="h-5 w-5 text-destructive" strokeWidth={3} />
                </div>
              )}
              <span className="font-display text-lg font-bold text-text-primary">
                {myResult.correct ? "You got it!" : "Not quite..."}
              </span>
            </div>
            <span className="font-body text-sm text-text-muted italic">
              Your answer: {myResult.answer || "(no answer)"}
            </span>
            <AnimatedCounter
              value={myResult.delta}
              duration={1000}
              format={(v) => `${v >= 0 ? "+" : ""}$${Math.abs(v).toLocaleString()}`}
              className={`text-xl font-bold ${myResult.delta >= 0 ? "text-success" : "text-destructive"}`}
            />
          </GlassPanel>
        </motion.div>
      )}

      {/* Correct answer */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.25 }}
      >
        <GlassPanel className="flex flex-col items-center gap-1.5 px-5 py-3">
          <span className="font-body text-xs font-medium text-text-muted uppercase tracking-wider">
            Correct Answer
          </span>
          <span className="font-display text-xl font-black text-accent-brainboard">
            {correctAnswer}
          </span>
          <span className="font-mono text-sm font-bold text-success">
            ${value.toLocaleString()}
          </span>
        </GlassPanel>
      </motion.div>

      {/* Distribution stat */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="flex flex-col items-center gap-2"
      >
        <span className="font-body text-sm font-medium text-text-muted">
          {correctCount}/{totalCount} got it right
        </span>
        <div className="flex items-center gap-1.5">
          {results.map((r) => (
            <div
              key={r.sessionId}
              className={`h-2.5 w-2.5 rounded-full ${r.correct ? "bg-success" : "bg-white/20"}`}
              style={
                r.correct ? { backgroundColor: getPlayerColor(players, r.sessionId) } : undefined
              }
            />
          ))}
        </div>
      </motion.div>

      {/* What Others Picked */}
      {otherResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
          className="flex flex-col gap-2"
        >
          <span className="font-body text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
            What Others Picked
          </span>
          {otherResults.map((result, index) => {
            const pName = getPlayerName(players, result.sessionId);
            const pColor = getPlayerColor(players, result.sessionId);
            return (
              <motion.div
                key={result.sessionId}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 24,
                  delay: 0.6 + index * 0.1,
                }}
              >
                <GlassPanel className="flex items-center gap-3 px-3 py-2.5">
                  <div
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ backgroundColor: pColor }}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate font-body text-sm font-medium text-text-primary">
                      {pName}
                    </span>
                    <span className="truncate font-body text-xs text-text-muted">
                      {result.answer || "No answer"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {result.correct ? (
                      <Check className="h-4 w-4 text-success" strokeWidth={3} />
                    ) : (
                      <X className="h-4 w-4 text-destructive" strokeWidth={3} />
                    )}
                  </div>
                </GlassPanel>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* AI Judge Explanation */}
      {judgeExplanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + otherResults.length * 0.1, duration: 0.35 }}
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
