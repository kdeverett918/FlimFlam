"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel, createScopedTimeline, sounds, withReducedMotion } from "@flimflam/ui";
import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

import { AnswerBoard } from "../../shared/AnswerBoard";
import { TeamScoreBar } from "../../shared/TeamScoreBar";
import type { RevealedAnswer, SurveyAnswer, TeamData } from "../../shared/ss-types";

interface HostAnswerRevealProps {
  question: string;
  answerCount: number;
  revealedAnswers: RevealedAnswer[];
  allAnswers: SurveyAnswer[] | undefined;
  dramaticStage: "idle" | "pause" | "build" | "reveal";
  sequentialRevealCount: number;
  totalAnswers: number;
  teams: TeamData[];
  controllingTeamId: string;
  teamMode: boolean;
  players: PlayerData[];
  reducedMotion: boolean;
  strikeOverlay: React.ReactNode;
}

export function HostAnswerReveal({
  question,
  answerCount,
  revealedAnswers,
  allAnswers,
  dramaticStage,
  sequentialRevealCount,
  totalAnswers,
  teams,
  controllingTeamId,
  teamMode,
  players,
  reducedMotion,
  strikeOverlay,
}: HostAnswerRevealProps) {
  const resolvedCount = Math.min(totalAnswers, sequentialRevealCount);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [dimActive, setDimActive] = useState(false);

  useGSAP(
    () => {
      if (reducedMotion || !containerRef.current) return;
      const tl = createScopedTimeline(containerRef, { paused: true });

      // Phase 1: Dim overlay + heartbeat
      tl.call(() => {
        setDimActive(true);
        sounds.dim();
      });

      // Phase 2: Camera zoom on board
      if (boardRef.current) {
        tl.fromTo(
          boardRef.current,
          { scale: 0.95 },
          { scale: 1.0, duration: 0.6, ease: "power2.out" },
          0.3,
        );
      }

      // Phase 3: Light bar sweep
      const lightBar = containerRef.current.querySelector("[data-light-bar]");
      if (lightBar) {
        tl.fromTo(
          lightBar,
          { y: "-100%" },
          { y: "100%", duration: 0.8, ease: "power1.inOut" },
          0.2,
        );
      }

      const result = withReducedMotion(tl, reducedMotion, () => {
        setDimActive(false);
      });
      if (result) {
        result.play();
      }
    },
    { scope: containerRef, dependencies: [dramaticStage] },
  );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-6 p-8"
    >
      {strikeOverlay}

      {/* Dim overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-10 bg-black/30 transition-opacity duration-500"
        style={{ opacity: dimActive && dramaticStage !== "idle" ? 1 : 0 }}
      />

      {/* Light bar sweep element */}
      <div
        data-light-bar
        className="pointer-events-none absolute inset-x-0 z-20 h-1"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, oklch(0.68 0.25 25 / 0.4) 50%, transparent 100%)",
          boxShadow: "0 0 30px oklch(0.68 0.25 25 / 0.3)",
          transform: "translateY(-100%)",
        }}
      />

      <h2
        className="z-30 font-display text-[clamp(32px,4vw,48px)] text-accent-surveysmash font-bold uppercase tracking-wider"
        style={{ textShadow: "0 0 30px oklch(0.68 0.25 25 / 0.4)" }}
      >
        The People Say...
      </h2>

      <GlassPanel className="z-30 max-w-3xl px-8 py-4 mb-2">
        <p className="text-center font-display text-[clamp(20px,2.5vw,32px)] font-bold text-text-primary">
          {question}
        </p>
      </GlassPanel>

      <div ref={boardRef} className="z-30">
        <AnswerBoard
          totalCount={answerCount}
          revealedAnswers={revealedAnswers}
          allAnswers={allAnswers}
          showAll
          maxRevealRank={dramaticStage === "reveal" ? sequentialRevealCount : 0}
          revealStep={resolvedCount}
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="z-30">
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
