"use client";

import { haptics } from "@flimflam/ui";
import { useCallback } from "react";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

interface LetterPickerProps {
  mode: "consonant" | "vowel" | "bonus";
  usedLetters: Set<string>;
  onPick: (letter: string) => void;
}

export function LetterPicker({ mode, usedLetters, onPick }: LetterPickerProps) {
  const handlePick = useCallback(
    (letter: string) => {
      haptics.tap();
      onPick(letter);
    },
    [onPick],
  );

  const isDisabled = (letter: string): boolean => {
    if (usedLetters.has(letter)) return true;
    if (mode === "consonant" && VOWELS.has(letter)) return true;
    if (mode === "vowel" && !VOWELS.has(letter)) return true;
    return false;
  };

  return (
    <div className="flex w-full flex-col gap-3 px-4">
      <p className="text-center font-body text-lg font-medium text-text-primary">
        {mode === "consonant" && "Pick a consonant"}
        {mode === "vowel" && "Buy a vowel"}
        {mode === "bonus" && "Choose your letters"}
      </p>

      <div className="grid grid-cols-7 gap-1.5">
        {ALPHABET.map((letter) => {
          const disabled = isDisabled(letter);
          const isVowel = VOWELS.has(letter);

          return (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onClick={() => handlePick(letter)}
              aria-label={`Letter ${letter}`}
              className={`flex h-12 w-full min-w-[48px] items-center justify-center rounded-lg font-display text-lg font-bold transition-all active:scale-90 ${
                disabled
                  ? "bg-white/[0.03] text-text-dim opacity-40"
                  : isVowel
                    ? "border border-accent-wheel/40 bg-accent-wheel/15 text-accent-wheel"
                    : "border border-white/[0.1] bg-white/[0.06] text-text-primary"
              }`}
              style={{
                touchAction: "manipulation",
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
