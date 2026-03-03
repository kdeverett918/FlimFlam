"use client";

import type { GameManifest, GamePreviewContent } from "@flimflam/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  GlassPanel,
} from "@flimflam/ui";
import { Clock, Users } from "lucide-react";

const ACCENT_SOLID: Record<string, string> = {
  "brain-board": "oklch(0.68 0.22 265)",
  "lucky-letters": "oklch(0.82 0.18 85)",
  "survey-smash": "oklch(0.74 0.25 25)",
};

const ACCENT_TEXT_CLASS: Record<string, string> = {
  "brain-board": "text-accent-brainboard",
  "lucky-letters": "text-accent-luckyletters",
  "survey-smash": "text-accent-surveysmash",
};

interface GamePreviewDialogProps {
  game: GameManifest | null;
  preview: GamePreviewContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayGame: (gameId: string) => void;
}

export function GamePreviewDialog({
  game,
  preview,
  open,
  onOpenChange,
  onPlayGame,
}: GamePreviewDialogProps) {
  if (!game || !preview) return null;

  const accent = ACCENT_SOLID[game.id];
  const textClass = ACCENT_TEXT_CLASS[game.id] ?? "text-text-primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{ maxHeight: "85vh", overflowY: "auto", width: "min(calc(100vw - 2rem), 42rem)" }}
      >
        {/* Top accent strip */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl"
          style={{
            background: accent
              ? `linear-gradient(90deg, transparent, ${accent}, transparent)`
              : undefined,
          }}
          aria-hidden="true"
        />

        <DialogHeader className="gap-3 pt-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl"
              style={{
                background: accent ? `${accent.replace(")", " / 0.12)")}` : "oklch(1 0 0 / 0.08)",
                boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.08)",
              }}
            >
              <span className="text-[28px]">{game.icon}</span>
            </div>
            <div>
              <DialogTitle className={`font-display text-[28px] font-bold ${textClass}`}>
                {game.name}
              </DialogTitle>
              <DialogDescription className="font-body text-base text-text-muted italic">
                {preview.tagline}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Full description */}
        <p className="font-body text-[15px] leading-relaxed text-text-primary/85">
          {preview.fullDescription}
        </p>

        {/* How to play */}
        <GlassPanel variant="glass" rounded="xl" depth="shallow" className="p-4">
          <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-text-muted">
            How to Play
          </h4>
          <ol className="space-y-2">
            {preview.howToPlay.map((step, i) => (
              <li
                key={step}
                className="flex gap-3 font-body text-[14px] leading-relaxed text-text-primary/80"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold"
                  style={{
                    background: accent
                      ? `${accent.replace(")", " / 0.18)")}`
                      : "oklch(1 0 0 / 0.1)",
                    color: accent ?? "oklch(1 0 0 / 0.7)",
                  }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </GlassPanel>

        {/* Highlights */}
        <div className="flex flex-wrap gap-2">
          {preview.highlights.map((h) => (
            <span
              key={h}
              className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1 font-body text-[13px] text-text-primary/70"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-5 text-[14px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {game.minPlayers}-{game.maxPlayers} players
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />~{game.estimatedMinutes} min
          </span>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 pt-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl border-2 border-white/20 bg-bg-surface/90 px-5 font-display text-sm text-text-primary uppercase tracking-wider backdrop-blur transition-all hover:bg-bg-surface active:scale-95"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onPlayGame(game.id)}
            className="h-11 rounded-xl border-2 border-primary/70 bg-primary/15 px-6 font-display text-sm font-bold text-primary uppercase tracking-wider transition-all hover:bg-primary/25 hover:border-primary hover:shadow-[0_0_24px_oklch(0.75_0.22_25/0.3)] active:scale-95"
          >
            Play This Game
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
