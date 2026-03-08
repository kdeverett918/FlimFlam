"use client";

import { GlassPanel, haptics } from "@flimflam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { TextInput } from "@/components/controls/TextInput";

interface CtrlGuessingProps {
  isCurrentGuesser: boolean;
  isGuessAlongPlayer: boolean;
  question: string;
  teamBadge: React.ReactNode;
  guessAlongPoints: number | null;
  onSubmit: (text: string) => void;
  onGuessAlongSubmit: (text: string) => void;
  errorNonce?: number;
}

export function CtrlGuessing({
  isCurrentGuesser,
  isGuessAlongPlayer,
  question,
  teamBadge,
  guessAlongPoints,
  onSubmit,
  onGuessAlongSubmit,
  errorNonce,
}: CtrlGuessingProps) {
  const [flyingText, setFlyingText] = useState<string | null>(null);
  const prevPointsRef = useRef(guessAlongPoints);

  // Detect point increases for flying text toast
  useEffect(() => {
    if (
      guessAlongPoints !== null &&
      prevPointsRef.current !== null &&
      guessAlongPoints > prevPointsRef.current
    ) {
      const delta = guessAlongPoints - prevPointsRef.current;
      setFlyingText(`+${delta}`);
      haptics.confirm();
      const timer = setTimeout(() => setFlyingText(null), 1200);
      prevPointsRef.current = guessAlongPoints;
      return () => clearTimeout(timer);
    }
    prevPointsRef.current = guessAlongPoints;
  }, [guessAlongPoints]);

  if (isCurrentGuesser) {
    return (
      <div data-testid="survey-smash-guesser-input" className="flex flex-col gap-4 pb-4 pt-4">
        {teamBadge}
        <TextInput
          prompt={question || "Name something..."}
          placeholder="Type your answer..."
          onSubmit={onSubmit}
          resetNonce={errorNonce}
        />
      </div>
    );
  }
  if (isGuessAlongPlayer) {
    return (
      <div
        data-testid="survey-smash-guess-along-input"
        className="relative flex flex-col gap-4 pb-4 pt-4"
      >
        {teamBadge}
        {guessAlongPoints !== null && (
          <div className="relative mx-4 flex justify-center">
            <span className="rounded-full border border-accent-surveysmash/30 bg-accent-surveysmash/12 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
              Guess Along: {guessAlongPoints.toLocaleString()} pts
            </span>

            {/* Flying text toast */}
            <AnimatePresence>
              {flyingText && (
                <motion.span
                  key={flyingText + Date.now()}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -40, scale: 1.3 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute -top-2 font-mono text-lg font-black text-success"
                  style={{ textShadow: "0 0 12px oklch(0.72 0.2 145 / 0.5)" }}
                >
                  {flyingText}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
        <TextInput
          prompt={`Guess Along: ${question}`}
          placeholder="Predict a board answer..."
          onSubmit={onGuessAlongSubmit}
          resetNonce={errorNonce}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
      <GlassPanel
        data-testid="controller-context-card"
        className="flex flex-col items-center gap-3 px-6 py-5"
      >
        {question && (
          <p className="text-center font-display text-sm font-bold text-text-primary">{question}</p>
        )}
        <p className="font-body text-xs text-text-muted">Watching the guesses...</p>
      </GlassPanel>
      {teamBadge}
    </div>
  );
}
