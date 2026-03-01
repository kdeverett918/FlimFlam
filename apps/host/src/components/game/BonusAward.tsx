"use client";

import { GlassPanel } from "@flimflam/ui";

interface BonusAwardProps {
  title: string;
  icon: React.ReactNode;
  playerName: string;
  reason: string;
  points?: number;
  accentColor?: string;
}

export function BonusAward({
  title,
  icon,
  playerName,
  reason,
  points,
  accentColor = "text-accent-2",
}: BonusAwardProps) {
  return (
    <GlassPanel glow rounded="2xl" className="flex flex-col items-center gap-2 p-6">
      {icon}
      <span className={`font-display text-[24px] font-bold ${accentColor}`}>{title}</span>
      <span className="font-display text-[28px] font-semibold text-text-primary">{playerName}</span>
      <p className="max-w-xs text-center font-body text-[20px] text-text-muted">{reason}</p>
      {points !== undefined && points > 0 && (
        <span className={`font-mono text-[24px] font-bold ${accentColor}`}>+{points} pts</span>
      )}
    </GlassPanel>
  );
}
