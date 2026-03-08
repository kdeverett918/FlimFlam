import type { PlayerData } from "@flimflam/shared";
import { motion } from "motion/react";
import { PlayerAvatar, getPlayerColor, getPlayerName } from "../../shared/bb-helpers";

interface HostPowerPlayWagerProps {
  selectorSessionId: string | null;
  players: PlayerData[];
}

export function HostPowerPlayWager({ selectorSessionId, players }: HostPowerPlayWagerProps) {
  const selName = getPlayerName(players, selectorSessionId);
  const selColor = getPlayerColor(players, selectorSessionId);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, -3, 3, 0] }}
        transition={{ duration: 0.8, type: "spring" }}
        className="font-display text-[clamp(56px,8vw,96px)] font-black"
        style={{
          color: "oklch(0.82 0.2 85)",
          textShadow:
            "0 0 40px oklch(0.82 0.2 85 / 0.6), 0 0 80px oklch(0.82 0.2 85 / 0.3), 0 4px 12px oklch(0 0 0 / 0.5)",
        }}
      >
        POWER PLAY!
      </motion.div>
      <div className="flex items-center gap-4">
        <PlayerAvatar name={selName} color={selColor} size={72} />
        <span className="font-display text-[clamp(32px,4vw,48px)] font-bold text-text-primary">
          {selName}
        </span>
      </div>
      <span className="font-body text-[clamp(24px,3vw,36px)] text-text-muted">is wagering...</span>
    </div>
  );
}
