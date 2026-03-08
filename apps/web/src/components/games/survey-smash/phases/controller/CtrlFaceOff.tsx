"use client";

import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";

import { TextInput } from "@/components/controls/TextInput";

interface CtrlFaceOffProps {
  isFaceOffPlayer: boolean;
  question: string;
  teamBadge: React.ReactNode;
  onSubmit: (text: string) => void;
  errorNonce?: number;
}

export function CtrlFaceOff({
  isFaceOffPlayer,
  question,
  teamBadge,
  onSubmit,
  errorNonce,
}: CtrlFaceOffProps) {
  if (isFaceOffPlayer) {
    return (
      <div data-testid="survey-smash-faceoff-input" className="flex flex-col gap-4 pb-4 pt-4">
        {teamBadge}
        {/* FIRST! urgency label that pulses */}
        <div className="flex justify-center">
          <motion.span
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            className="rounded-full bg-accent-surveysmash/20 border border-accent-surveysmash/40 px-4 py-1.5 font-display text-sm font-black uppercase tracking-wider text-accent-surveysmash"
            style={{ textShadow: "0 0 12px oklch(0.68 0.25 25 / 0.3)" }}
          >
            FIRST!
          </motion.span>
        </div>
        <TextInput
          prompt={question || "Name the top answer!"}
          placeholder="Type your answer..."
          onSubmit={onSubmit}
          resetNonce={errorNonce}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
      <GlassPanel className="flex flex-col items-center gap-3 px-6 py-5">
        <p className="font-display text-base font-bold uppercase text-accent-surveysmash">
          Face-Off
        </p>
        {question && (
          <p className="text-center font-display text-sm font-bold text-text-primary">{question}</p>
        )}
      </GlassPanel>
      {teamBadge}
    </div>
  );
}
