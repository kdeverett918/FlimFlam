"use client";

import { useCallback, useState } from "react";

interface AbilityButtonProps {
  abilityName: string;
  abilityDescription: string;
  abilityId: string;
  onUse: (abilityId: string) => void;
}

export function AbilityButton({
  abilityName,
  abilityDescription,
  abilityId,
  onUse,
}: AbilityButtonProps) {
  const [used, setUsed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleTap = useCallback(() => {
    if (used) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }

    // Confirmed — use the ability
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    onUse(abilityId);
    setUsed(true);
    setConfirming(false);
  }, [used, confirming, abilityId, onUse]);

  const handleCancel = useCallback(() => {
    setConfirming(false);
  }, []);

  if (used) {
    return (
      <div className="mx-4 flex flex-col items-center gap-3 rounded-xl border-2 border-text-muted/20 bg-bg-card p-6 opacity-60">
        <div className="font-display text-lg text-text-muted">{abilityName}</div>
        <p className="text-sm text-text-muted">Ability used</p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="mx-4 flex flex-col gap-3 rounded-xl border-2 border-accent-3 bg-accent-3/10 p-6 animate-fade-in-up">
        <p className="text-center text-lg font-medium text-accent-3">Use {abilityName}?</p>
        <p className="text-center text-sm text-text-muted">This cannot be undone.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="h-12 flex-1 rounded-xl border-2 border-text-muted/30 bg-bg-card font-medium text-text-muted transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTap}
            className="h-12 flex-1 rounded-xl bg-accent-3 font-display text-bg-dark transition-all active:scale-95"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      className="mx-4 flex w-[calc(100%-2rem)] flex-col items-center gap-2 rounded-xl border-2 border-accent-4 bg-accent-4/10 p-6 transition-all animate-glow-pulse active:scale-95"
    >
      <span className="font-display text-xl text-accent-4">{abilityName}</span>
      <span className="text-sm text-text-muted">{abilityDescription}</span>
      <span className="mt-2 text-xs font-medium text-accent-4/80 uppercase tracking-wider">
        Tap to activate
      </span>
    </button>
  );
}
