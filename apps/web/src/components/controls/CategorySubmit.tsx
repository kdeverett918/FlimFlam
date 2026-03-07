"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel, haptics } from "@flimflam/ui";
import { Check, Sparkles, Tag } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CategorySubmitProps {
  players: PlayerData[];
  mySessionId: string | null;
  onSubmitCategories: (categories: string[]) => void;
  timerEndsAt: number;
  serverTimeOffset: number;
  submissions: Record<string, { name: string; submitted: boolean; categories?: string[] }>;
}

export function CategorySubmit({
  players: _players,
  mySessionId,
  onSubmitCategories,
  timerEndsAt,
  serverTimeOffset,
  submissions,
}: CategorySubmitProps) {
  const [cat1, setCat1] = useState("");
  const [cat2, setCat2] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((timerEndsAt - Date.now() + serverTimeOffset) / 1000)),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer countdown
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((timerEndsAt - Date.now() + serverTimeOffset) / 1000),
      );
      setSecondsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timerEndsAt, serverTimeOffset]);

  // Timer progress
  const timerTotalRef = useRef<number | null>(null);
  if (timerTotalRef.current === null && secondsLeft > 0) {
    timerTotalRef.current = secondsLeft;
  }
  const timerTotal = timerTotalRef.current ?? 30;
  const timerProgress = timerTotal > 0 ? Math.min(1, secondsLeft / timerTotal) : 0;
  const isUrgent = secondsLeft > 0 && secondsLeft <= 10;
  const timerColor =
    timerProgress > 0.5
      ? "oklch(0.72 0.16 195)" // cyan
      : timerProgress > 0.2
        ? "oklch(0.82 0.18 85)" // amber
        : "oklch(0.65 0.25 25)"; // red

  // Check if we already submitted (from reconnect)
  useEffect(() => {
    if (mySessionId && submissions[mySessionId]?.submitted) {
      setHasSubmitted(true);
    }
  }, [mySessionId, submissions]);

  const handleSubmit = useCallback(() => {
    const categories = [cat1.trim(), cat2.trim()].filter((c) => c.length >= 2);
    if (categories.length === 0) return;
    haptics.tap();
    onSubmitCategories(categories);
    setHasSubmitted(true);
  }, [cat1, cat2, onSubmitCategories]);

  const canSubmit = cat1.trim().length >= 2 || cat2.trim().length >= 2;

  const submittedCount = Object.values(submissions).filter((s) => s.submitted).length;
  const totalCount = Object.keys(submissions).length;

  if (hasSubmitted) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="shrink-0 px-4 pb-2 pt-3">
          <div className="flex items-center justify-center gap-2">
            <Check className="h-5 w-5 text-accent-3" strokeWidth={2.5} />
            <h2 className="font-display text-xl font-black tracking-wide text-accent-3 uppercase">
              Categories Locked In!
            </h2>
          </div>
        </div>

        {/* Timer */}
        <div className="shrink-0 px-4 pb-2">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                backgroundColor: timerColor,
                boxShadow: `0 0 8px ${timerColor}88`,
              }}
              initial={false}
              animate={{ width: `${timerProgress * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          {secondsLeft > 0 && (
            <p
              className={`mt-1 text-center font-display text-xs font-semibold ${
                isUrgent ? "animate-timer-pulse" : "text-white/40"
              }`}
              style={isUrgent ? { color: timerColor } : undefined}
            >
              {secondsLeft}s remaining
            </p>
          )}
        </div>

        {/* Submission status */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-3 text-center font-body text-sm text-text-muted">
            {submittedCount}/{totalCount} players submitted
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(submissions).map(([sid, info]) => (
              <GlassPanel
                key={sid}
                className={`px-4 py-3 ${info.submitted ? "border-accent-3/30" : "border-white/10"}`}
                rounded="xl"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${info.submitted ? "bg-accent-3" : "bg-white/20 animate-pulse"}`}
                  />
                  <span className="font-body text-sm text-text-primary">{info.name}</span>
                  {info.submitted && (
                    <Check className="ml-auto h-4 w-4 text-accent-3" strokeWidth={2.5} />
                  )}
                  {!info.submitted && (
                    <span className="ml-auto font-body text-xs text-text-dim">Thinking...</span>
                  )}
                </div>
                {info.submitted && info.categories && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {info.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-accent-brainboard/15 px-2.5 py-0.5 font-body text-xs text-accent-brainboard"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </GlassPanel>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="flex items-center justify-center gap-2">
          <Tag className="h-5 w-5 text-accent-brainboard" strokeWidth={2.5} />
          <h2 className="font-display text-xl font-black tracking-wide text-accent-brainboard uppercase">
            Pick Your Categories
          </h2>
          <Sparkles className="h-5 w-5 text-accent-brainboard" strokeWidth={2.5} />
        </div>
        <p className="mt-0.5 text-center font-body text-xs text-text-muted">
          Submit 2 topics for tonight's board
        </p>
      </div>

      {/* Timer Progress Bar */}
      <div className="shrink-0 px-4 pb-2">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              backgroundColor: timerColor,
              boxShadow: `0 0 8px ${timerColor}88`,
            }}
            initial={false}
            animate={{ width: `${timerProgress * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        {secondsLeft > 0 && (
          <p
            className={`mt-1 text-center font-display text-xs font-semibold ${
              isUrgent ? "animate-timer-pulse" : "text-white/40"
            }`}
            style={isUrgent ? { color: timerColor } : undefined}
          >
            {secondsLeft}s remaining
          </p>
        )}
      </div>

      {/* Inputs */}
      <div className="flex-1 px-4 py-3">
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="cat-submit-1"
              className="mb-1 block font-body text-xs font-medium text-text-muted"
            >
              Category 1
            </label>
            <input
              id="cat-submit-1"
              ref={inputRef}
              type="text"
              value={cat1}
              onChange={(e) => setCat1(e.target.value.slice(0, 60))}
              placeholder="e.g., 90s Movies"
              maxLength={60}
              className="glass-input h-12 w-full rounded-xl px-4 font-body text-sm text-text-primary placeholder:text-text-dim transition-all focus:border-accent-brainboard/50 focus:shadow-[0_0_12px_oklch(0.68_0.22_265_/_0.2)]"
            />
          </div>
          <div>
            <label
              htmlFor="cat-submit-2"
              className="mb-1 block font-body text-xs font-medium text-text-muted"
            >
              Category 2
            </label>
            <input
              id="cat-submit-2"
              type="text"
              value={cat2}
              onChange={(e) => setCat2(e.target.value.slice(0, 60))}
              placeholder="e.g., Space Exploration"
              maxLength={60}
              className="glass-input h-12 w-full rounded-xl px-4 font-body text-sm text-text-primary placeholder:text-text-dim transition-all focus:border-accent-brainboard/50 focus:shadow-[0_0_12px_oklch(0.68_0.22_265_/_0.2)]"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="shrink-0 border-t border-white/10 px-4 pb-16 pt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-brainboard font-display text-base font-bold uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-35 disabled:active:scale-100"
          style={{
            boxShadow: canSubmit ? "0 0 24px oklch(0.68 0.22 265 / 0.4)" : "none",
          }}
        >
          <Tag className="h-5 w-5" strokeWidth={2.5} />
          Lock In Categories
        </button>
      </div>
    </div>
  );
}
