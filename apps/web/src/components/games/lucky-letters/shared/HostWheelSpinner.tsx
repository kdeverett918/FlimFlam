"use client";

import {
  ANIMATION_EASINGS,
  GlassPanel,
  fireParticleEffect,
  haptics,
  soundManager,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

const CASH_COLORS = [
  "#16a34a",
  "#059669",
  "#2563eb",
  "#0891b2",
  "#15803d",
  "#0d9488",
  "#2563eb",
  "#0891b2",
];

function getSegmentColor(type: string, cashIndex: number): string {
  switch (type) {
    case "bust":
      return "#dc2626";
    case "pass":
      return "#ea580c";
    case "wild":
      return "#7c3aed";
    default:
      return CASH_COLORS[cashIndex % CASH_COLORS.length] ?? "#16a34a";
  }
}

const WHEEL_VISUAL_SEGMENTS: Array<{ type: string; label: string; color: string }> = (() => {
  const segments = [
    { type: "cash", label: "$500" },
    { type: "cash", label: "$550" },
    { type: "cash", label: "$600" },
    { type: "cash", label: "$650" },
    { type: "cash", label: "$700" },
    { type: "cash", label: "$800" },
    { type: "cash", label: "$900" },
    { type: "cash", label: "$2,500" },
    { type: "bust", label: "BUST" },
    { type: "cash", label: "$500" },
    { type: "cash", label: "$600" },
    { type: "cash", label: "$700" },
    { type: "cash", label: "$300" },
    { type: "cash", label: "$450" },
    { type: "cash", label: "$350" },
    { type: "wild", label: "WILD" },
    { type: "cash", label: "$500" },
    { type: "cash", label: "$850" },
    { type: "cash", label: "$550" },
    { type: "pass", label: "PASS" },
    { type: "cash", label: "$650" },
    { type: "cash", label: "$750" },
    { type: "bust", label: "BUST" },
    { type: "cash", label: "$400" },
  ];
  let cashIdx = 0;
  return segments.map((s) => {
    const color = getSegmentColor(s.type, cashIdx);
    if (s.type === "cash") cashIdx++;
    return { ...s, color };
  });
})();

const LED_COUNT = 36;

function getLandingFlashColor(type: string): string {
  switch (type) {
    case "cash":
      return "oklch(0.82 0.18 85 / 0.6)";
    case "bust":
      return "oklch(0.68 0.25 20 / 0.6)";
    case "pass":
      return "oklch(0.75 0.15 70 / 0.4)";
    case "wild":
      return "oklch(0.7 0.25 290 / 0.6)";
    default:
      return "oklch(0.82 0.18 85 / 0.4)";
  }
}

function getLandingRingColor(type: string): string {
  switch (type) {
    case "bust":
      return "#dc2626";
    case "wild":
      return "#a855f7";
    case "pass":
      return "#f59e0b";
    default:
      return "oklch(0.82 0.18 85)";
  }
}

export function HostWheelSpinner({
  spinning,
  angle,
  landed,
}: { spinning: boolean; angle: number; landed?: { type: string; label: string } | null }) {
  const reducedMotion = useReducedMotion();
  const segments = WHEEL_VISUAL_SEGMENTS;
  const segAngle = 360 / segments.length;
  const wheelSize = 420;
  const prevLandedRef = useRef<{ type: string; label: string } | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [flashColor, setFlashColor] = useState("transparent");
  const [ringColor, setRingColor] = useState("oklch(0.82 0.18 85)");
  const [pointerBounce, setPointerBounce] = useState(false);
  const [spotlightSegment, setSpotlightSegment] = useState<number | null>(null);

  // Rotation motion value for realistic deceleration
  const rotation = useMotionValue(0);
  const prevSpinning = useRef(false);
  const prevAngle = useRef(0);

  useEffect(() => {
    if (spinning && !prevSpinning.current) {
      // Start spin with realistic deceleration curve
      const target = angle + 1800;
      animate(rotation, target, {
        duration: 3.5,
        ease: [0.12, 0.82, 0.2, 1],
      });
    } else if (!spinning && prevSpinning.current) {
      // Snap to final angle
      rotation.set(angle);
    } else if (!spinning) {
      rotation.set(angle);
    }
    prevSpinning.current = spinning;
    prevAngle.current = angle;
  }, [spinning, angle, rotation]);

  // Landing reactions
  useEffect(() => {
    if (landed && !prevLandedRef.current) {
      // Trigger tier-specific reaction
      const type = landed.type;
      setFlashColor(getLandingFlashColor(type));
      setRingColor(getLandingRingColor(type));
      setShowFlash(true);
      setPointerBounce(true);

      // Sound + haptics based on type
      if (type === "cash") {
        soundManager.playSfx("lucky.ding");
        haptics.celebrate();
        if (!reducedMotion) {
          void fireParticleEffect("golden-rain", { scale: 0.4, origin: { x: 0.5, y: 0.4 } });
        }
      } else if (type === "bust") {
        sounds.buzz();
        haptics.error();
      } else if (type === "pass") {
        sounds.tick();
        haptics.warn();
      } else if (type === "wild") {
        sounds.correct();
        haptics.celebrate();
        if (!reducedMotion) {
          void fireParticleEffect("sparkle-trail", { scale: 0.6, origin: { x: 0.5, y: 0.4 } });
        }
      }

      // Calculate spotlight segment from angle
      const normalizedAngle = (360 - (angle % 360) + 360) % 360;
      const segIndex = Math.floor(normalizedAngle / segAngle) % segments.length;
      setSpotlightSegment(segIndex);

      // Clear flash after animation
      const flashTimer = setTimeout(() => setShowFlash(false), 600);
      const bounceTimer = setTimeout(() => setPointerBounce(false), 500);
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(bounceTimer);
      };
    }
    if (!landed) {
      setSpotlightSegment(null);
      setRingColor("oklch(0.82 0.18 85)");
    }
    prevLandedRef.current = landed ?? null;
  }, [landed, angle, reducedMotion, segAngle, segments.length]);

  // LED chase animation during spin
  const [ledPhase, setLedPhase] = useState(0);
  useEffect(() => {
    if (!spinning || reducedMotion) return;
    const interval = setInterval(() => {
      setLedPhase((p) => (p + 1) % LED_COUNT);
    }, 60);
    return () => clearInterval(interval);
  }, [spinning, reducedMotion]);

  const rotateStr = useTransform(rotation, (v) => `rotate(${v}deg)`);

  return (
    <div
      className="relative"
      style={{ width: wheelSize, height: wheelSize }}
      data-testid="lucky-wheel"
    >
      {/* Flash overlay */}
      {showFlash && !reducedMotion && (
        <motion.div
          className="absolute inset-0 z-20 rounded-full pointer-events-none"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            background: `radial-gradient(circle, ${flashColor}, transparent 70%)`,
          }}
        />
      )}

      {/* Pointer with bounce */}
      <motion.div
        className="absolute -top-4 left-1/2 z-10 -translate-x-1/2"
        animate={
          pointerBounce && !reducedMotion
            ? { y: [0, 8, -2, 4, 0], rotate: [0, -5, 3, -1, 0] }
            : { y: 0, rotate: 0 }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: 0,
          height: 0,
          borderLeft: "16px solid transparent",
          borderRight: "16px solid transparent",
          borderTop: "34px solid oklch(0.82 0.2 85)",
          filter: "drop-shadow(0 3px 8px oklch(0 0 0 / 0.6))",
        }}
      />

      {/* Metallic gold outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #b8860b, #ffd700, #daa520, #b8860b,
            #ffd700, #daa520, #b8860b, #ffd700,
            #daa520, #b8860b, #ffd700, #daa520
          )`,
          padding: 8,
          boxShadow: spinning
            ? `0 0 60px ${flashColor || "oklch(0.82 0.18 85 / 0.4)"}`
            : landed
              ? `0 0 40px ${getLandingFlashColor(landed.type)}`
              : "0 0 20px oklch(0.82 0.18 85 / 0.15)",
          transition: "box-shadow 0.5s ease",
        }}
      >
        <div className="h-full w-full rounded-full" style={{ background: "transparent" }} />
      </div>

      {/* LED dots on outer ring */}
      {!reducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {Array.from({ length: LED_COUNT }).map((_, i) => {
            const ledAngle = (i * 360) / LED_COUNT;
            const rad = (ledAngle * Math.PI) / 180;
            const radius = wheelSize / 2 - 2;
            const cx = wheelSize / 2 + radius * Math.cos(rad);
            const cy = wheelSize / 2 + radius * Math.sin(rad);
            const isActive = spinning ? (i - ledPhase + LED_COUNT) % LED_COUNT < 4 : !!landed;
            const ledColor = landed ? getLandingRingColor(landed.type) : "#ffd700";
            return (
              <div
                key={`led-${ledAngle}`}
                className="absolute rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  left: cx - 2.5,
                  top: cy - 2.5,
                  backgroundColor: isActive ? ledColor : "rgba(255,215,0,0.15)",
                  boxShadow: isActive ? `0 0 6px ${ledColor}` : "none",
                  transition: spinning ? "none" : "all 0.3s ease",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Wheel body */}
      <motion.div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: 8,
          transform: rotateStr,
          transformOrigin: "center center",
          borderWidth: 3,
          borderStyle: "solid",
          borderColor: ringColor,
          transition: "border-color 0.3s ease",
        }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <title>Lucky Letters spinner</title>
          <defs>
            {/* Spotlight gradient for winning segment */}
            <radialGradient id="segSpotlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          {segments.map((seg, i) => {
            const startAngle = (i * segAngle * Math.PI) / 180;
            const endAngle = ((i + 1) * segAngle * Math.PI) / 180;
            const x1 = 100 + 98 * Math.cos(startAngle);
            const y1 = 100 + 98 * Math.sin(startAngle);
            const x2 = 100 + 98 * Math.cos(endAngle);
            const y2 = 100 + 98 * Math.sin(endAngle);
            const midAngle = ((i + 0.5) * segAngle * Math.PI) / 180;
            const textX = 100 + 62 * Math.cos(midAngle);
            const textY = 100 + 62 * Math.sin(midAngle);
            const textRot = (i + 0.5) * segAngle;
            const isSpotlit = spotlightSegment === i && landed;
            return (
              <g key={`seg-${i}-${seg.label}-${seg.color}`} data-testid="lucky-wheel-segment">
                <path
                  d={`M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="oklch(0.08 0.02 248)"
                  strokeWidth="0.5"
                  opacity={isSpotlit ? 1 : spotlightSegment !== null ? 0.6 : 1}
                  style={{ transition: "opacity 0.4s ease" }}
                />
                {isSpotlit && (
                  <path
                    d={`M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} Z`}
                    fill="url(#segSpotlight)"
                  />
                )}
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={seg.type === "cash" ? "5" : "5.5"}
                  fontWeight="bold"
                  transform={`rotate(${textRot}, ${textX}, ${textY})`}
                  style={{
                    textShadow: isSpotlit ? "0 0 4px rgba(255,255,255,0.8)" : "none",
                  }}
                >
                  {seg.label}
                </text>
              </g>
            );
          })}
          {/* 3D brass center hub */}
          <circle
            cx="100"
            cy="100"
            r="14"
            fill="url(#brassHub)"
            stroke="oklch(0.82 0.18 85)"
            strokeWidth="1.5"
          />
          <defs>
            <radialGradient id="brassHub" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#b8860b" />
              <stop offset="100%" stopColor="#8b6914" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="5" fill="oklch(0.82 0.18 85)" />
          <circle cx="98" cy="98" r="2" fill="rgba(255,255,255,0.4)" />
        </svg>
      </motion.div>

      {/* Landing label */}
      {landed && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: ANIMATION_EASINGS.crispOut }}
          className="pointer-events-none absolute left-1/2 top-full mt-4 -translate-x-1/2"
        >
          <GlassPanel
            glow
            glowColor={
              landed.type === "cash"
                ? "oklch(0.82 0.18 85 / 0.25)"
                : landed.type === "wild"
                  ? "oklch(0.7 0.25 290 / 0.25)"
                  : landed.type === "bust"
                    ? "oklch(0.68 0.25 20 / 0.25)"
                    : undefined
            }
            className="flex min-w-[200px] flex-col items-center gap-1 px-5 py-3"
          >
            <span className="font-body text-xs uppercase tracking-[0.35em] text-text-muted">
              {spinning ? "Prize In Play" : "Landed On"}
            </span>
            <motion.span
              className="font-display text-2xl font-black"
              style={{
                color:
                  landed.type === "bust"
                    ? "#ef4444"
                    : landed.type === "wild"
                      ? "#a855f7"
                      : landed.type === "pass"
                        ? "#f59e0b"
                        : "oklch(0.82 0.18 85)",
              }}
              animate={
                !reducedMotion && landed.type === "wild"
                  ? {
                      color: ["#a855f7", "#ec4899", "#3b82f6", "#a855f7"],
                    }
                  : undefined
              }
              transition={
                landed.type === "wild"
                  ? { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }
                  : undefined
              }
            >
              {landed.label}
            </motion.span>
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}
