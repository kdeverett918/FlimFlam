"use client";

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
  const [dots, setDots] = useState("");

  // Cycle through messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "";
        return `${prev}.`;
      });
    }, 500);
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
      default:
        return MESSAGES[messageIndex];
    }
  })();

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
      {/* Spinner */}
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-text-muted/10" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent-1 animate-spin-slow" />
        <div
          className="absolute inset-2 rounded-full border-4 border-transparent border-t-accent-2 animate-spin-slow"
          style={{ animationDirection: "reverse", animationDuration: "2s" }}
        />
      </div>

      {/* Message */}
      <p className="text-center text-lg text-text-muted">
        {contextualMessage}
        {dots}
      </p>

      {/* Subtle hint */}
      <p className="text-center text-xs text-text-muted/50">Hang tight while the magic happens</p>
    </div>
  );
}
