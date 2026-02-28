"use client";

import { GlassPanel, haptics } from "@partyline/ui";
import { Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 8000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleTap = useCallback(() => {
    if (used) return;
    if (!confirming) {
      haptics.tap();
      setConfirming(true);
      return;
    }

    haptics.confirm();
    onUse(abilityId);
    setUsed(true);
    setConfirming(false);
  }, [used, confirming, abilityId, onUse]);

  const handleCancel = useCallback(() => {
    haptics.tap();
    setConfirming(false);
  }, []);

  if (used) {
    return (
      <GlassPanel className="mx-4 flex flex-col items-center gap-3 p-6 opacity-50">
        <div className="font-display text-lg text-text-dim line-through">{abilityName}</div>
        <p className="font-body text-sm text-text-dim">Ability used</p>
      </GlassPanel>
    );
  }

  if (confirming) {
    return (
      <GlassPanel className="mx-4 flex flex-col gap-3 border-accent-3/30 p-6 animate-fade-in-up">
        <p className="text-center font-display text-lg font-bold text-accent-3">
          Use {abilityName}?
        </p>
        <p className="text-center font-body text-sm text-text-muted">This cannot be undone.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="h-12 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] font-body font-medium text-text-muted transition-all active:scale-95"
            style={{
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTap}
            className="h-12 flex-1 rounded-xl bg-accent-3 font-display text-bg-deep transition-all active:scale-95"
            style={{
              boxShadow: "0 0 16px oklch(0.75 0.18 85 / 0.25)",
            }}
          >
            Confirm
          </button>
        </div>
      </GlassPanel>
    );
  }

  return (
    <button type="button" onClick={handleTap} className="mx-4 w-[calc(100%-2rem)]">
      <GlassPanel
        glow
        glowColor="oklch(0.75 0.15 195 / 0.3)"
        className="flex flex-col items-center gap-2 p-6 transition-all animate-glow-breathe active:scale-95"
      >
        <Zap className="h-6 w-6 text-accent-4" />
        <span className="font-display text-xl text-accent-4">{abilityName}</span>
        <span className="font-body text-sm text-text-muted">{abilityDescription}</span>
        <span className="mt-2 font-body text-xs font-medium text-accent-4/80 uppercase tracking-wider">
          Tap to activate
        </span>
      </GlassPanel>
    </button>
  );
}
