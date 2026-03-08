import type { PlayerData } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/bb-helpers";

interface HostPowerPlayAnswerProps {
  selectorSessionId: string | null;
  players: PlayerData[];
  powerPlayWager: number | null;
  currentClueQuestion: string | null;
}

export function HostPowerPlayAnswer({
  selectorSessionId,
  players,
  powerPlayWager,
  currentClueQuestion,
}: HostPowerPlayAnswerProps) {
  const selName = getPlayerName(players, selectorSessionId);
  const selColor = getPlayerColor(players, selectorSessionId);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <span
        className="font-display text-[clamp(32px,4vw,48px)] font-black"
        style={{ color: "oklch(0.82 0.2 85)", textShadow: "0 0 24px oklch(0.82 0.2 85 / 0.5)" }}
      >
        POWER PLAY
      </span>
      {powerPlayWager !== null && (
        <span className="font-mono text-[clamp(28px,3.5vw,44px)] font-bold text-accent-3">
          Wager: ${powerPlayWager.toLocaleString()}
        </span>
      )}
      {currentClueQuestion && (
        <GlassPanel glow glowColor="oklch(0.82 0.2 85 / 0.25)" className="max-w-4xl px-12 py-8">
          <p className="text-center font-body text-[clamp(28px,3.5vw,48px)] leading-snug text-text-primary">
            {currentClueQuestion}
          </p>
        </GlassPanel>
      )}
      <div className="flex items-center gap-4">
        <PlayerAvatar name={selName} color={selColor} size={72} />
        <span className="font-display text-[clamp(32px,4vw,48px)] font-bold text-text-primary">
          {selName}
        </span>
      </div>
      <span className="font-body text-[clamp(20px,2.5vw,28px)] text-text-muted">
        is answering...
      </span>
    </div>
  );
}
