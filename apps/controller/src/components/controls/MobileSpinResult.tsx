"use client";

import { GlassPanel, haptics } from "@flimflam/ui";
import { motion } from "motion/react";
import { useEffect } from "react";

interface SpinSegment {
  type: string;
  value: number;
  label: string;
}

interface MobileSpinResultProps {
  segment: SpinSegment;
  currentTurnName: string;
  isMyTurn: boolean;
  roundCashAtRisk?: number;
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  cash: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400" },
  bust: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400" },
  pass: { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-400" },
  wild: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400" },
};

export function MobileSpinResult({
  segment,
  currentTurnName,
  isMyTurn,
  roundCashAtRisk = 0,
}: MobileSpinResultProps) {
  const fallback = { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400" };
  const style = TYPE_STYLES[segment.type] ?? fallback;

  useEffect(() => {
    if (segment.type === "bust") haptics.error();
    else if (segment.type === "pass") haptics.warn();
    else if (segment.type === "wild" || segment.value >= 2500) haptics.celebrate();
    else haptics.tap();
  }, [segment]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="px-4"
    >
      <GlassPanel
        className={`flex flex-col items-center gap-2 border ${style.border} ${style.bg} px-6 py-4`}
      >
        <span className={`font-display text-2xl font-black uppercase tracking-wider ${style.text}`}>
          {segment.label}
        </span>
        <p className="font-body text-sm text-text-muted">
          {isMyTurn ? "You spun" : `${currentTurnName} spun`} {segment.label}
        </p>
        {isMyTurn && roundCashAtRisk > 0 && segment.type !== "bust" && (
          <span className="rounded-full bg-red-500/10 px-3 py-0.5 font-mono text-xs text-red-400">
            At Risk: ${roundCashAtRisk.toLocaleString()}
          </span>
        )}
        {segment.type === "bust" && isMyTurn && roundCashAtRisk > 0 && (
          <span className="font-mono text-xs text-red-400">
            Lost ${roundCashAtRisk.toLocaleString()}!
          </span>
        )}
      </GlassPanel>
    </motion.div>
  );
}
