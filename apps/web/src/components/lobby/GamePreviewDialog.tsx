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
          className="absolute inset-x-0 top-0 h-[4px] rounded-t-xl"
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
              className="flex h-12 w-12 items-center justify-center rounded-xl sm:h-14 sm:w-14"
              style={{
                background: accent ? `${accent.replace(")", " / 0.12)")}` : "oklch(1 0 0 / 0.08)",
                boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.08)",
              }}
            >
              <span className="text-[24px] sm:text-[28px]">{game.icon}</span>
            </div>
            <div>
              <DialogTitle className={`font-display text-xl font-bold sm:text-[28px] ${textClass}`}>
                {game.name}
              </DialogTitle>
              <DialogDescription className="font-body text-sm text-text-muted italic sm:text-base">
                {preview.tagline}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Full description */}
        <p className="font-body text-sm leading-relaxed text-text-primary/85 sm:text-[15px]">
          {preview.fullDescription}
        </p>

        {/* How to play */}
        <GlassPanel variant="glass" rounded="xl" depth="shallow" className="p-3 sm:p-4">
          <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-text-muted sm:text-sm">
            How to Play
          </h4>
          <ol className="space-y-2">
            {preview.howToPlay.map((step, i) => (
              <li
                key={step}
                className="flex gap-2.5 font-body text-[13px] leading-relaxed text-text-primary/80 sm:gap-3 sm:text-[14px]"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold sm:text-[11px]"
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
              className="rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 py-1 font-body text-[12px] text-text-primary/70 sm:px-3 sm:text-[13px]"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-5 text-[13px] text-text-muted sm:text-[14px]">
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
            className="h-10 rounded-xl border-2 border-white/20 bg-bg-surface/90 px-4 font-display text-sm uppercase tracking-wider text-text-primary backdrop-blur transition-all hover:bg-bg-surface active:scale-95 sm:h-11 sm:px-5"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onPlayGame(game.id)}
            className="h-10 rounded-xl px-5 font-display text-sm font-bold uppercase tracking-wider text-white transition-all hover:shadow-[0_0_30px_oklch(0.75_0.22_25/0.4)] active:scale-95 sm:h-11 sm:px-6"
            style={{
              background: "linear-gradient(135deg, oklch(0.75 0.22 25), oklch(0.72 0.25 350))",
              boxShadow: "0 0 16px oklch(0.75 0.22 25 / 0.3)",
            }}
          >
            Play This Game
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
