"use client";

import gsap from "gsap";
import * as React from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { emitMotionEvent } from "../lib/audio";
import { cn } from "../lib/utils";
import { AnimatedCounter } from "./animated-counter";
import { ConfettiBurst } from "./confetti-burst";

export interface PodiumPlayer {
  name: string;
  score: number;
  color: string;
}

export interface PodiumLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Players sorted: 1st, 2nd, 3rd */
  players: PodiumPlayer[];
  onComplete?: () => void;
}

const PODIUM_HEIGHTS = ["h-48", "h-36", "h-28"] as const;
const PODIUM_ORDER = [1, 0, 2] as const; // visual order: 2nd, 1st, 3rd

function PodiumLayout({ players, onComplete, className, ...props }: PodiumLayoutProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const onCompleteRef = React.useRef(onComplete);
  const [showConfetti, setShowConfetti] = React.useState(false);

  React.useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    emitMotionEvent("podium-layout.animate", {
      playerCount: players.length,
    });

    const columns = container.querySelectorAll("[data-podium-col]");
    const avatars = container.querySelectorAll("[data-podium-avatar]");
    const crown = container.querySelector("[data-podium-crown]");

    if (reduced) {
      gsap.set(columns, { y: 0, opacity: 1 });
      gsap.set(avatars, { y: 0, opacity: 1, scale: 1 });
      if (crown) gsap.set(crown, { y: 0, opacity: 1 });
      setShowConfetti(true);
      onCompleteRef.current?.();
      return;
    }

    // Set initial states
    gsap.set(columns, { y: 80, opacity: 0 });
    gsap.set(avatars, { y: -30, opacity: 0, scale: 0.5 });
    if (crown) gsap.set(crown, { y: -40, opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        setShowConfetti(true);
        onCompleteRef.current?.();
      },
    });

    // Stagger columns rising: 3rd first, then 2nd, then 1st
    // columns are in visual order [2nd, 1st, 3rd] so animate indices [2, 0, 1]
    const colArray = Array.from(columns);
    const riseOrder = [2, 0, 1]; // 3rd place col, 2nd place col, 1st place col

    for (let i = 0; i < riseOrder.length; i++) {
      const colIdx = riseOrder[i];
      if (colIdx === undefined || !colArray[colIdx]) continue;
      tl.to(
        colArray[colIdx],
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(1.4)",
        },
        i * 0.2,
      );
    }

    // Avatars land on podiums with bounce
    const avatarArray = Array.from(avatars);
    for (let i = 0; i < riseOrder.length; i++) {
      const colIdx = riseOrder[i];
      if (colIdx === undefined || !avatarArray[colIdx]) continue;
      tl.to(
        avatarArray[colIdx],
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "bounce.out",
        },
        0.3 + i * 0.2,
      );
    }

    // Crown descends onto 1st place
    if (crown) {
      tl.to(
        crown,
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "bounce.out",
        },
        0.9,
      );
    }

    return () => {
      tl.kill();
    };
  }, [players, reduced]);

  const displayPlayers = PODIUM_ORDER.map((placeIdx) => ({
    player: players[placeIdx],
    place: placeIdx,
  }));

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-end justify-center gap-3", className)}
      {...props}
    >
      {displayPlayers.map(({ player, place }) => {
        if (!player) return null;
        const isFirst = place === 0;
        const initial = player.name.charAt(0).toUpperCase();
        const heightClass = PODIUM_HEIGHTS[place] ?? "h-28";

        return (
          <div key={place} data-podium-col className="flex flex-col items-center gap-2">
            {/* Crown for 1st place */}
            {isFirst && (
              <div
                data-podium-crown
                className="text-3xl"
                style={{ opacity: 0 }}
                aria-label="Winner crown"
              >
                👑
              </div>
            )}

            {/* Avatar */}
            <div
              data-podium-avatar
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg"
              style={{
                backgroundColor: player.color,
                opacity: 0,
              }}
            >
              {initial}
            </div>

            {/* Name */}
            <span className="text-sm font-semibold text-white/90 truncate max-w-[5rem]">
              {player.name}
            </span>

            {/* Score */}
            <AnimatedCounter
              value={player.score}
              duration={1200}
              className="text-lg font-mono font-bold text-white"
            />

            {/* Podium column */}
            <div
              className={cn(
                "w-20 rounded-t-lg",
                heightClass,
                isFirst
                  ? "bg-gradient-to-t from-amber-600 to-amber-400"
                  : place === 1
                    ? "bg-gradient-to-t from-slate-500 to-slate-300"
                    : "bg-gradient-to-t from-amber-800 to-amber-600",
              )}
            >
              <div className="flex h-full items-start justify-center pt-3">
                <span className="text-2xl font-black text-white/80">{place + 1}</span>
              </div>
            </div>
          </div>
        );
      })}

      <ConfettiBurst trigger={showConfetti} preset="win" />
    </div>
  );
}
PodiumLayout.displayName = "PodiumLayout";

export { PodiumLayout };
