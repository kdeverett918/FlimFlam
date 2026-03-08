"use client";

import type { PlayerData } from "@flimflam/shared";
import {
  GlassPanel,
  createScopedTimeline,
  soundManager,
  sounds,
  useReducedMotion,
  withReducedMotion,
} from "@flimflam/ui";
import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

import { TeamScoreBar } from "../../shared/TeamScoreBar";
import type { TeamData } from "../../shared/ss-types";

interface HostQuestionRevealProps {
  question: string;
  round: number;
  totalRounds: number;
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
  strikeOverlay: React.ReactNode;
}

export function HostQuestionReveal({
  question,
  round,
  totalRounds,
  teams,
  controllingTeamId,
  teamMode,
  players,
  strikeOverlay,
}: HostQuestionRevealProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setShowContent] = useState(reducedMotion);
  const [spotlightVisible, setSpotlightVisible] = useState(!reducedMotion);

  useGSAP(
    () => {
      if (reducedMotion || !containerRef.current) {
        setShowContent(true);
        setSpotlightVisible(false);
        return;
      }

      const tl = createScopedTimeline(containerRef);

      // Start with blackout
      tl.set("[data-blackout]", { opacity: 1 });
      tl.set("[data-spotlight]", { opacity: 0, scale: 0.3 });
      tl.set("[data-round-label]", { opacity: 0, y: -20 });
      tl.set("[data-question-panel]", { opacity: 0, scale: 0.6 });
      tl.set("[data-score-bar]", { opacity: 0, y: 30 });

      // Phase 1: Spotlight snaps on (0.3s)
      tl.to("[data-spotlight]", { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }, 0.3);
      tl.call(
        () => {
          soundManager.playSfx("survey.drumroll");
          setShowContent(true);
        },
        [],
        0.3,
      );

      // Phase 2: Round number typewriters in
      tl.to(
        "[data-round-label]",
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        },
        0.6,
      );

      // Phase 3: Question scales in with dramatic reveal
      tl.to(
        "[data-question-panel]",
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "back.out(1.7)",
        },
        1.0,
      );
      tl.call(() => sounds.reveal(), [], 1.0);

      // Phase 4: Fade blackout, show score bar
      tl.to("[data-blackout]", { opacity: 0, duration: 0.5 }, 1.4);
      tl.call(() => setSpotlightVisible(false), [], 1.6);
      tl.to("[data-score-bar]", { opacity: 1, y: 0, duration: 0.4 }, 1.6);

      const result = withReducedMotion(tl, reducedMotion, () => {
        setShowContent(true);
        setSpotlightVisible(false);
      });
      if (result) result.play();
    },
    { scope: containerRef, dependencies: [round] },
  );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-8 p-8 min-h-[60vh]"
    >
      {strikeOverlay}

      {/* Full blackout overlay */}
      <div
        data-blackout
        className="pointer-events-none fixed inset-0 z-10 bg-bg-deep"
        style={{ opacity: reducedMotion ? 0 : 1 }}
      />

      {/* Spotlight circle */}
      {spotlightVisible && (
        <div
          data-spotlight
          className="pointer-events-none fixed inset-0 z-20"
          style={{
            background:
              "radial-gradient(ellipse 500px 400px at 50% 45%, oklch(0.68 0.25 25 / 0.15) 0%, transparent 70%)",
            opacity: 0,
          }}
        />
      )}

      <div
        data-round-label
        className="z-30 font-display text-[clamp(24px,3vw,36px)] text-accent-surveysmash uppercase tracking-wider"
        style={{
          textShadow: "0 0 40px oklch(0.68 0.25 25 / 0.5)",
          opacity: reducedMotion ? 1 : 0,
        }}
      >
        Round {round} of {totalRounds}
      </div>

      <div data-question-panel style={{ opacity: reducedMotion ? 1 : 0 }} className="z-30">
        <GlassPanel glow glowColor="oklch(0.68 0.25 25 / 0.3)" className="max-w-4xl px-12 py-10">
          <p className="text-center font-display text-[clamp(32px,4.5vw,56px)] font-bold leading-snug text-text-primary">
            {question}
          </p>
        </GlassPanel>
      </div>

      <div data-score-bar className="z-30" style={{ opacity: reducedMotion ? 1 : 0 }}>
        <TeamScoreBar
          teams={teams}
          controllingTeamId={controllingTeamId}
          teamMode={teamMode}
          players={players}
        />
      </div>
    </div>
  );
}
