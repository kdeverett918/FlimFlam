"use client";

import { useCallback } from "react";

interface HostControlsProps {
  isHost: boolean;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  phase: string;
}

export function HostControls({ isHost, sendMessage, phase }: HostControlsProps) {
  const handleSkip = useCallback(() => {
    sendMessage("host:skip");
  }, [sendMessage]);

  const handleEnd = useCallback(() => {
    sendMessage("host:end-game");
  }, [sendMessage]);

  const handleRestart = useCallback(() => {
    sendMessage("host:restart-game");
  }, [sendMessage]);

  if (!isHost) return null;

  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-bg-surface/80 px-2 py-2 shadow-[0_18px_45px_oklch(0_0_0/0.24)] backdrop-blur-xl">
      {phase !== "final-scores" && (
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-full border border-white/20 bg-bg-surface/90 px-3 py-1.5 font-display text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
        >
          Skip
        </button>
      )}
      <button
        type="button"
        onClick={handleEnd}
        className="rounded-full border border-accent-6/30 bg-accent-6/10 px-3 py-1.5 font-display text-[11px] font-bold text-accent-6 uppercase tracking-[0.2em] backdrop-blur-sm transition-all hover:bg-accent-6/20 active:scale-95"
      >
        End
      </button>
      {phase === "final-scores" && (
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-full border border-success/30 bg-success/10 px-3 py-1.5 font-display text-[11px] font-bold text-success uppercase tracking-[0.2em] backdrop-blur-sm transition-all hover:bg-success/20 active:scale-95"
        >
          Restart
        </button>
      )}
    </div>
  );
}
