"use client";

import { AnimatedBackground } from "@flimflam/ui";
import { useEffect, useState } from "react";

const MESSAGES = [
  "The world is forming...",
  "The story unfolds...",
  "Something is brewing...",
  "Crunching the numbers...",
  "Reading the stars...",
  "Consulting the oracle...",
  "Weaving the narrative...",
  "Shuffling possibilities...",
];

interface WaitingScreenProps {
  phase?: string;
}

export function WaitingScreen({ phase }: WaitingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Pick contextual message for known AI phases
  const contextualMessage = (() => {
    switch (phase) {
      case "generating":
        return "The world is forming";
      case "ai-narrating":
        return "The story unfolds";
      case "generating-prompt":
        return "Cooking up a question";
      case "generating-questions":
        return "Reality is shifting";
      case "ai-generating":
        return "AI is crafting hot takes based on your topics";
      case "picking-drawer":
        return "Picking the artist";
      case "drawing":
        return "Watch the artist draw";
      case "board-generating":
        return "The AI is building your custom quiz board...";
      case "board-reveal":
        return "Check out the board on the main screen!";
      case "appeal-judging":
        return "The AI judge is deliberating...";
      case "appeal-result":
        return "The verdict is in! Check the main screen!";
      case "clue-result":
        return "See the results on the main screen!";
      default:
        return MESSAGES[messageIndex];
    }
  })();

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
      <AnimatedBackground variant="subtle" />

      {/* Larger animated dots with coral/teal */}
      <div className="flex items-center gap-4">
        <div
          className="h-4 w-4 rounded-full animate-dot-pulse"
          style={{ backgroundColor: "oklch(0.72 0.22 25)", animationDelay: "0s" }}
        />
        <div
          className="h-4 w-4 rounded-full animate-dot-pulse"
          style={{ backgroundColor: "oklch(0.70 0.15 185)", animationDelay: "0.2s" }}
        />
        <div
          className="h-4 w-4 rounded-full animate-dot-pulse"
          style={{ backgroundColor: "oklch(0.72 0.22 25)", animationDelay: "0.4s" }}
        />
      </div>

      {/* Rotating flavor text */}
      <p className="text-center font-body text-xl font-medium text-text-primary">
        {contextualMessage}
      </p>

      {/* Bottom hint */}
      <p className="text-center font-body text-sm text-text-muted">Watch the main screen!</p>
    </div>
  );
}
