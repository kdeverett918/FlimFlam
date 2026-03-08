"use client";

import { useCallback } from "react";

export interface UseSurveySmashActionsOptions {
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export interface SurveySmashActionsResult {
  handleTextSubmit: (text: string) => void;
  handleGuessAlongSubmit: (text: string) => void;
}

export function useSurveySmashActions({
  sendMessage,
}: UseSurveySmashActionsOptions): SurveySmashActionsResult {
  const handleTextSubmit = useCallback(
    (text: string) => {
      sendMessage("player:submit", { content: text });
    },
    [sendMessage],
  );

  const handleGuessAlongSubmit = useCallback(
    (text: string) => {
      sendMessage("player:guess-along", { content: text });
    },
    [sendMessage],
  );

  return {
    handleTextSubmit,
    handleGuessAlongSubmit,
  };
}
