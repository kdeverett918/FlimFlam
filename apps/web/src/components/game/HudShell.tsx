"use client";

import { MenuTrigger } from "@/components/navigation/PlayerMenu";
import { ReactionBar } from "@/components/game/ReactionBar";
import { ScoreBadge } from "@/components/game/ScoreBadge";
import { TimerBar } from "@/components/game/TimerBar";

export const HUD_TOP_DOCK_HEIGHT = 72;
export const HUD_BOTTOM_DOCK_COLLAPSED_HEIGHT = 72;
export const HUD_BOTTOM_DOCK_EXPANDED_HEIGHT = 144;
const STANDINGS_EXPANDED_PHASES = new Set([
  "clue-result",
  "round-result",
  "bonus-reveal",
  "all-in-reveal",
  "final-scores",
]);

// Host controls now live in PlayerMenu bottom sheet

interface PlayerStanding {
  sessionId: string;
  name: string;
  avatarColor: string;
  score: number;
}

interface HudShellProps {
  gameId: string;
  isHost: boolean;
  phase: string;
  timerEndTime: number | null;
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
  showReactions: boolean;
  showBottomDock: boolean;
  myScore: number;
  myColor: string;
  myRank: number;
  players: PlayerStanding[];
  mySessionId: string | null;
}

export function HudShell({
  gameId,
  isHost,
  phase,
  timerEndTime,
  sendMessage,
  showReactions,
  showBottomDock,
  myScore,
  myColor,
  myRank,
  players,
  mySessionId,
}: HudShellProps) {
  const bottomHeight = showReactions
    ? HUD_BOTTOM_DOCK_EXPANDED_HEIGHT
    : HUD_BOTTOM_DOCK_COLLAPSED_HEIGHT;
  const scoreMode = gameId === "lucky-letters" ? "cash" : "points";
  const allowStandingsPanel = STANDINGS_EXPANDED_PHASES.has(phase);

  return (
    <div data-testid="hud-root">
      <div
        data-testid="hud-top"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-bg-deep/60 backdrop-blur-xl border-b border-white/[0.06]"
        style={{ height: `calc(env(safe-area-inset-top) + ${HUD_TOP_DOCK_HEIGHT}px)` }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3 pt-[env(safe-area-inset-top)] sm:px-4">
          <div className="pointer-events-auto shrink-0">
            <MenuTrigger className="h-10 w-10 border-white/10 bg-white/5" />
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <TimerBar timerEndsAt={timerEndTime ?? 0} />
          </div>
          <div className="w-10 shrink-0" />
        </div>
      </div>

      {showBottomDock && (
        <div
          data-testid="hud-bottom"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 overflow-visible"
          style={{ height: `calc(env(safe-area-inset-bottom) + ${bottomHeight}px)` }}
        >
          <div className="relative h-full w-full">
            {showReactions && <ReactionBar sendMessage={sendMessage} />}
            <ScoreBadge
              avatarColor={myColor}
              score={myScore}
              rank={myRank}
              totalPlayers={players.length}
              players={players}
              mySessionId={mySessionId}
              scoreMode={scoreMode}
              allowExpansion={allowStandingsPanel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
