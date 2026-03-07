"use client";

import { haptics } from "@flimflam/ui";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpinSegment {
  type: string;
  value: number;
  label: string;
}

interface MobileWheelProps {
  onSpin?: () => void;
  spinResult?: { angle: number } | null;
  landedSegment?: SpinSegment | null;
  disabled?: boolean;
}

const WHEEL_SEGMENTS: Array<{ type: string; label: string; color: string }> = [
  { type: "cash", label: "$500", color: "#16a34a" },
  { type: "cash", label: "$550", color: "#059669" },
  { type: "cash", label: "$600", color: "#2563eb" },
  { type: "cash", label: "$650", color: "#0891b2" },
  { type: "cash", label: "$700", color: "#15803d" },
  { type: "cash", label: "$800", color: "#0d9488" },
  { type: "cash", label: "$900", color: "#2563eb" },
  { type: "cash", label: "$2,500", color: "#0891b2" },
  { type: "bust", label: "BUST", color: "#dc2626" },
  { type: "cash", label: "$500", color: "#16a34a" },
  { type: "cash", label: "$600", color: "#059669" },
  { type: "cash", label: "$700", color: "#2563eb" },
  { type: "cash", label: "$300", color: "#15803d" },
  { type: "cash", label: "$450", color: "#0d9488" },
  { type: "cash", label: "$350", color: "#0891b2" },
  { type: "wild", label: "WILD", color: "#7c3aed" },
  { type: "cash", label: "$500", color: "#16a34a" },
  { type: "cash", label: "$850", color: "#059669" },
  { type: "cash", label: "$550", color: "#0891b2" },
  { type: "pass", label: "PASS", color: "#ea580c" },
  { type: "cash", label: "$650", color: "#15803d" },
  { type: "cash", label: "$750", color: "#0d9488" },
  { type: "bust", label: "BUST", color: "#dc2626" },
  { type: "cash", label: "$400", color: "#16a34a" },
];

const WHEEL_SIZE = 280;
const FLICK_VELOCITY_THRESHOLD = 0.3;

export function MobileWheel({
  onSpin,
  spinResult,
  landedSegment = null,
  disabled = false,
}: MobileWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const lastAnimatedAngleRef = useRef<number | null>(null);
  const canSpin = !disabled && typeof onSpin === "function";

  useEffect(() => {
    if (!spinResult) return;
    if (spinResult.angle === lastAnimatedAngleRef.current) return;

    lastAnimatedAngleRef.current = spinResult.angle;
    setRotation(spinResult.angle);
    setIsAnimating(true);

    const timer = setTimeout(() => {
      setIsAnimating(false);
      haptics.confirm();
    }, 3500);

    return () => clearTimeout(timer);
  }, [spinResult]);

  const triggerSpin = useCallback(() => {
    if (!canSpin || isAnimating) return;
    setRotation((prev) => prev + 720 + Math.random() * 360);
    setIsAnimating(true);
    haptics.tap();
    onSpin?.();
  }, [canSpin, isAnimating, onSpin]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!canSpin || isAnimating) return;
      const touch = e.touches[0];
      if (!touch) return;
      touchStartRef.current = { y: touch.clientY, time: Date.now() };
    },
    [canSpin, isAnimating],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!canSpin || isAnimating || !touchStartRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dy = touchStartRef.current.y - touch.clientY;
      const dt = Date.now() - touchStartRef.current.time;
      const velocity = Math.abs(dy) / Math.max(dt, 1);
      touchStartRef.current = null;

      if (velocity > FLICK_VELOCITY_THRESHOLD && dy > 0) {
        triggerSpin();
      }
    },
    [canSpin, isAnimating, triggerSpin],
  );

  const segAngle = 360 / WHEEL_SEGMENTS.length;

  return (
    <div className="flex flex-col items-center gap-4 px-4" data-testid="lucky-mobile-wheel">
      <div
        className="relative"
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          touchAction: canSpin ? "none" : "auto",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute -top-3 left-1/2 z-10 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "24px solid oklch(0.82 0.18 85)",
            filter: "drop-shadow(0 2px 4px oklch(0 0 0 / 0.5))",
          }}
        />

        <div
          className="h-full w-full overflow-hidden rounded-full border-[3px]"
          style={{
            borderColor: "oklch(0.82 0.18 85 / 0.55)",
            boxShadow: landedSegment
              ? "0 0 28px oklch(0.82 0.18 85 / 0.22)"
              : "0 0 16px oklch(0.82 0.18 85 / 0.12)",
            transform: `rotate(${rotation}deg)`,
            transition: isAnimating ? "transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)" : "none",
          }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <title>Spin wheel</title>
            {WHEEL_SEGMENTS.map((segment, idx) => {
              const startAngle = (idx * segAngle * Math.PI) / 180;
              const endAngle = ((idx + 1) * segAngle * Math.PI) / 180;
              const x1 = 100 + 98 * Math.cos(startAngle);
              const y1 = 100 + 98 * Math.sin(startAngle);
              const x2 = 100 + 98 * Math.cos(endAngle);
              const y2 = 100 + 98 * Math.sin(endAngle);
              const textAngle = ((idx + 0.5) * segAngle * Math.PI) / 180;
              const textX = 100 + 64 * Math.cos(textAngle);
              const textY = 100 + 64 * Math.sin(textAngle);
              const textRotation = (idx + 0.5) * segAngle;

              return (
                <g key={`${segment.label}-${idx}`}>
                  <path
                    d={`M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} Z`}
                    fill={segment.color}
                    stroke="oklch(0.08 0.02 248)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={segment.type === "cash" ? "5" : "5.5"}
                    fontWeight="bold"
                    transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
            <circle
              cx="100"
              cy="100"
              r="18"
              fill="oklch(0.15 0.02 248)"
              stroke="oklch(0.82 0.18 85)"
              strokeWidth="2"
            />
            <circle cx="100" cy="100" r="5" fill="oklch(0.82 0.18 85)" />
          </svg>
        </div>

        <button
          type="button"
          aria-label="Spin the wheel"
          onClick={triggerSpin}
          disabled={!canSpin || isAnimating}
          className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-90 disabled:cursor-default disabled:opacity-45"
          style={{
            background: "linear-gradient(135deg, oklch(0.78 0.2 85), oklch(0.68 0.22 55))",
            boxShadow: "0 0 20px oklch(0.78 0.2 85 / 0.4)",
            touchAction: "manipulation",
          }}
        >
          {isAnimating ? "..." : canSpin ? "Spin!" : "Watch"}
        </button>
      </div>

      {landedSegment ? (
        <div className="flex flex-col items-center gap-1">
          <span className="font-body text-[10px] uppercase tracking-[0.3em] text-text-dim">
            {isAnimating ? "Prize In Play" : "Landed On"}
          </span>
          <span
            data-testid="lucky-prize-label"
            className="font-display text-lg font-black text-accent-luckyletters"
          >
            {landedSegment.label}
          </span>
        </div>
      ) : (
        <p className="text-center font-body text-xs text-text-dim">
          {canSpin ? "Flick up or tap to spin" : "Watching the wheel"}
        </p>
      )}
    </div>
  );
}
