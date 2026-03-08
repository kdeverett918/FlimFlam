"use client";

import { useCallback } from "react";

export interface UseLuckyLettersActionsOptions {
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export interface LuckyLettersActionsResult {
  handleSpin: () => void;
  handleConsonantPick: (letter: string) => void;
  handleVowelPick: (letter: string) => void;
  handleSolveSubmit: (text: string) => void;
  handleChooseBuyVowel: () => void;
  handleChooseSolve: () => void;
  handleCategoryVote: (selected: string[]) => void;
  handleBonusPick: (letter: string) => void;
  handleBonusSolve: (text: string) => void;
}

export function useLuckyLettersActions({
  sendMessage,
}: UseLuckyLettersActionsOptions): LuckyLettersActionsResult {
  const handleSpin = useCallback(() => sendMessage("player:spin"), [sendMessage]);

  const handleConsonantPick = useCallback(
    (letter: string) => {
      sendMessage("player:guess-consonant", { letter });
    },
    [sendMessage],
  );

  const handleVowelPick = useCallback(
    (letter: string) => {
      sendMessage("player:buy-vowel", { letter });
    },
    [sendMessage],
  );

  const handleSolveSubmit = useCallback(
    (text: string) => {
      sendMessage("player:solve", { answer: text });
    },
    [sendMessage],
  );

  const handleChooseBuyVowel = useCallback(
    () => sendMessage("player:choose-action", { action: "buy-vowel" }),
    [sendMessage],
  );

  const handleChooseSolve = useCallback(
    () => sendMessage("player:choose-action", { action: "solve" }),
    [sendMessage],
  );

  const handleCategoryVote = useCallback(
    (selected: string[]) => sendMessage("player:category-vote", { categories: selected }),
    [sendMessage],
  );

  const handleBonusPick = useCallback(
    (letter: string) => sendMessage("player:bonus-pick", { letter }),
    [sendMessage],
  );

  const handleBonusSolve = useCallback(
    (text: string) => sendMessage("player:bonus-solve", { answer: text }),
    [sendMessage],
  );

  return {
    handleSpin,
    handleConsonantPick,
    handleVowelPick,
    handleSolveSubmit,
    handleChooseBuyVowel,
    handleChooseSolve,
    handleCategoryVote,
    handleBonusPick,
    handleBonusSolve,
  };
}
