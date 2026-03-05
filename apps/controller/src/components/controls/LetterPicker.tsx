"use client";

import { haptics } from "@flimflam/ui";
import { useCallback } from "react";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

interface LetterPickerProps {
  mode: "consonant" | "vowel" | "bonus";
  usedLetters: Set<string>;
  onPick: (letter: string) => void;
  roundCash?: number;
}

export function LetterPicker({ mode, usedLetters, onPick, roundCash }: LetterPickerProps) {
  const handlePick = useCallback(
    (letter: string) => {
      haptics.tap();
      onPick(letter);
    },
    [onPick],
  );

  const handleDisabledTap = useCallback(() => {
    haptics.error();
  }, []);

  const isDisabled = (letter: string): boolean => {
    if (usedLetters.has(letter)) return true;
    if (mode === "consonant" && VOWELS.has(letter)) return true;
    if (mode === "vowel" && !VOWELS.has(letter)) return true;
    return false;
  };

  const isUsed = (letter: string): boolean => usedLetters.has(letter);

  return (
    <div className="flex w-full flex-col gap-3 px-4">
      <div className="flex flex-col items-center gap-1">
        <p className="text-center font-body text-lg font-medium text-text-primary">
          {mode === "consonant" && "Pick a consonant"}
          {mode === "vowel" && "Buy a vowel ($250)"}
          {mode === "bonus" && "Choose your letters"}
        </p>
        {mode === "vowel" && roundCash !== undefined && (
          <span className="font-mono text-sm font-bold text-accent-wheel">
            Your cash: ${roundCash.toLocaleString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {ALPHABET.map((letter) => {
          const disabled = isDisabled(letter);
          const used = isUsed(letter);
          const isVowel = VOWELS.has(letter);

          return (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onClick={disabled ? handleDisabledTap : () => handlePick(letter)}
              onPointerDown={disabled ? handleDisabledTap : undefined}
              aria-label={`Letter ${letter}`}
              className={`relative flex h-12 w-full min-w-[48px] flex-col items-center justify-center rounded-lg font-display text-lg font-bold transition-all active:scale-90 ${
                disabled
                  ? "bg-white/[0.03] text-text-dim opacity-20"
                  : isVowel
                    ? "border border-accent-wheel/40 bg-accent-wheel/15 text-accent-wheel"
                    : "border border-white/[0.1] bg-white/[0.06] text-text-primary"
              }`}
              style={{
                touchAction: "manipulation",
              }}
            >
              <span className={used ? "line-through decoration-2" : ""}>{letter}</span>
              {/* Vowel cost label in vowel mode */}
              {mode === "vowel" && isVowel && !used && !disabled && (
                <span className="absolute -bottom-0.5 font-mono text-[8px] font-bold text-accent-wheel/60">
                  $250
                </span>
              )}
              {/* X overlay for used letters */}
              {used && (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-black text-red-500/40"
                  aria-hidden="true"
                >
                  X
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
