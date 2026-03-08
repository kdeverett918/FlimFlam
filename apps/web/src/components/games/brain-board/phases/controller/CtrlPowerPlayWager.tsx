"use client";

import { NumberInput } from "@/components/controls/NumberInput";
import { WaitingScreen } from "@/components/game/WaitingScreen";
import { Zap } from "lucide-react";

export interface CtrlPowerPlayWagerProps {
  isPowerPlayPlayer: boolean;
  maxWager: number;
  onSubmit: (wager: number) => void;
}

export function CtrlPowerPlayWager({
  isPowerPlayPlayer,
  maxWager,
  onSubmit,
}: CtrlPowerPlayWagerProps) {
  if (!isPowerPlayPlayer) {
    return <WaitingScreen phase="power-play-wager" gameId="brain-board" />;
  }

  return (
    <div className="flex flex-col gap-4 pb-4 pt-4">
      <div className="mx-4 rounded-2xl border border-amber-400/30 animate-power-play-pulse">
        <div className="flex flex-col items-center gap-3 px-6 py-5">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6" style={{ color: "oklch(0.82 0.2 85)" }} />
            <p
              className="font-display text-2xl font-black uppercase"
              style={{
                color: "oklch(0.82 0.2 85)",
                textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)",
              }}
            >
              Power Play!
            </p>
            <Zap className="h-6 w-6" style={{ color: "oklch(0.82 0.2 85)" }} />
          </div>
          <p className="font-body text-sm text-text-muted">Only you can answer this one</p>
        </div>
      </div>
      <NumberInput min={5} max={maxWager} label="Set your wager:" onSubmit={onSubmit} />
    </div>
  );
}
