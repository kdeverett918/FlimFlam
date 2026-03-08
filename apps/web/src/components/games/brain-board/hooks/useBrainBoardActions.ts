"use client";

import { useCallback, useState } from "react";

export interface UseBrainBoardActionsOptions {
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export interface BrainBoardActionsResult {
  handleClueSelect: (clueId: string) => void;
  handleBrainBoardAnswer: (text: string) => void;
  handlePowerPlayWagerSubmit: (wager: number) => void;
  handlePowerPlayAnswer: (text: string) => void;
  handleAllInWager: (wager: number) => void;
  handleAllInAnswer: (text: string) => void;
  handleConfirmCategories: () => void;
  handleRerollBoard: () => void;
  handleChatMessage: (text: string) => void;
  handleSubmitCategories: (categories: string[]) => void;
}

export function useBrainBoardActions({
  sendMessage,
}: UseBrainBoardActionsOptions): BrainBoardActionsResult {
  const [, setLastSubmittedText] = useState<string | null>(null);

  const handleBrainBoardAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:answer", { answer: text });
    },
    [sendMessage],
  );

  const handleClueSelect = useCallback(
    (clueId: string) => {
      const [catStr, clueStr] = clueId.split(",");
      const categoryIndex = Number(catStr);
      const clueIndex = Number(clueStr);
      if (!Number.isNaN(categoryIndex) && !Number.isNaN(clueIndex)) {
        sendMessage("player:select-clue", { categoryIndex, clueIndex });
      }
    },
    [sendMessage],
  );

  const handlePowerPlayWagerSubmit = useCallback(
    (wager: number) => sendMessage("player:power-play-wager", { wager }),
    [sendMessage],
  );

  const handlePowerPlayAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:power-play-answer", { answer: text });
    },
    [sendMessage],
  );

  const handleAllInWager = useCallback(
    (wager: number) => sendMessage("player:all-in-wager", { wager }),
    [sendMessage],
  );

  const handleAllInAnswer = useCallback(
    (text: string) => {
      setLastSubmittedText(text.trim());
      sendMessage("player:all-in-answer", { answer: text });
    },
    [sendMessage],
  );

  const handleConfirmCategories = useCallback(
    () => sendMessage("player:confirm-categories"),
    [sendMessage],
  );

  const handleRerollBoard = useCallback(() => sendMessage("player:reroll-board"), [sendMessage]);

  const handleChatMessage = useCallback(
    (text: string) => sendMessage("player:chat-message", { message: text }),
    [sendMessage],
  );

  const handleSubmitCategories = useCallback(
    (categories: string[]) => sendMessage("player:submit-categories", { categories }),
    [sendMessage],
  );

  return {
    handleClueSelect,
    handleBrainBoardAnswer,
    handlePowerPlayWagerSubmit,
    handlePowerPlayAnswer,
    handleAllInWager,
    handleAllInAnswer,
    handleConfirmCategories,
    handleRerollBoard,
    handleChatMessage,
    handleSubmitCategories,
  };
}
