"use client";

import { useCallback } from "react";

interface HostControlsProps {
  isHost: boolean;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  phase: string;
}

export function HostControls({ isHost, sendMessage, phase }: HostControlsProps) {
  const handleSkip = useCallback(() => {
    sendMessage("host:skip-phase");
  }, [sendMessage]);

  const handleEnd = useCallback(() => {
    sendMessage("host:end-game");
  }, [sendMessage]);

  const handleRestart = useCallback(() => {
    sendMessage("host:restart-game");
  }, [sendMessage]);

  if (!isHost) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {phase !== "final-scores" && (
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-lg border border-white/20 bg-bg-surface/90 px-3 py-1.5 font-display text-xs font-bold text-text-muted uppercase tracking-wider backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
        >
          Skip
        </button>
      )}
      <button
        type="button"
        onClick={handleEnd}
        className="rounded-lg border border-accent-6/30 bg-accent-6/10 px-3 py-1.5 font-display text-xs font-bold text-accent-6 uppercase tracking-wider backdrop-blur-sm transition-all hover:bg-accent-6/20 active:scale-95"
      >
        End
      </button>
      {phase === "final-scores" && (
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 font-display text-xs font-bold text-success uppercase tracking-wider backdrop-blur-sm transition-all hover:bg-success/20 active:scale-95"
        >
          Restart
        </button>
      )}
    </div>
  );
}
