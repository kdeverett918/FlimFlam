"use client";

import { haptics } from "@flimflam/ui";
import { useCallback, useEffect, useRef, useState } from "react";

interface MobileWheelProps {
  onSpin: () => void;
  spinResult?: { angle: number } | null;
  disabled?: boolean;
}

// Same segment colors as host wheel
const SEGMENT_COLORS = [
  "#16a34a",
  "#059669",
  "#2563eb",
  "#0891b2",
  "#15803d",
  "#0d9488",
  "#2563eb",
  "#0891b2",
  "#dc2626", // bust
  "#16a34a",
  "#059669",
  "#2563eb",
  "#15803d",
  "#0d9488",
  "#0891b2",
  "#7c3aed", // wild
  "#16a34a",
  "#059669",
  "#0891b2",
  "#ea580c", // pass
  "#15803d",
  "#0d9488",
  "#dc2626", // bust
  "#16a34a",
];

const SEGMENT_COUNT = 24;
const WHEEL_SIZE = 280;
const FLICK_VELOCITY_THRESHOLD = 0.3;

export function MobileWheel({ onSpin, spinResult, disabled = false }: MobileWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasFlung, setHasFlung] = useState(false);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // When server sends spinResult, animate to that angle
  useEffect(() => {
    if (spinResult && hasFlung) {
      const targetAngle = spinResult.angle;
      setRotation(targetAngle);
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
        setHasFlung(false);
        haptics.confirm();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [spinResult, hasFlung]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isAnimating) return;
      const touch = e.touches[0];
      if (!touch) return;
      touchStartRef.current = { y: touch.clientY, time: Date.now() };
    },
    [disabled, isAnimating],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isAnimating || !touchStartRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dy = touchStartRef.current.y - touch.clientY;
      const dt = Date.now() - touchStartRef.current.time;
      const velocity = Math.abs(dy) / Math.max(dt, 1);

      touchStartRef.current = null;

      if (velocity > FLICK_VELOCITY_THRESHOLD && dy > 0) {
        // Upward flick detected - trigger spin
        setHasFlung(true);
        // Start a free-spin animation while waiting for server
        setRotation((prev) => prev + 720 + Math.random() * 360);
        setIsAnimating(true);
        haptics.tap();
        onSpin();
      }
    },
    [disabled, isAnimating, onSpin],
  );

  const handleTapSpin = useCallback(() => {
    if (disabled || isAnimating) return;
    setHasFlung(true);
    setRotation((prev) => prev + 720 + Math.random() * 360);
    setIsAnimating(true);
    haptics.tap();
    onSpin();
  }, [disabled, isAnimating, onSpin]);

  const segAngle = 360 / SEGMENT_COUNT;

  return (
    <div className="flex flex-col items-center gap-4 px-4">
      <div
        ref={containerRef}
        className="relative"
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          touchAction: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pointer triangle */}
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

        {/* Wheel */}
        <div
          className="h-full w-full rounded-full border-3 overflow-hidden"
          style={{
            borderColor: "oklch(0.82 0.18 85 / 0.5)",
            transform: `rotate(${rotation}deg)`,
            transition: isAnimating ? "transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)" : "none",
          }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <title>Spin wheel</title>
            {SEGMENT_COLORS.map((color, idx) => {
              const startAngle = (idx * segAngle * Math.PI) / 180;
              const endAngle = ((idx + 1) * segAngle * Math.PI) / 180;
              const x1 = 100 + 98 * Math.cos(startAngle);
              const y1 = 100 + 98 * Math.sin(startAngle);
              const x2 = 100 + 98 * Math.cos(endAngle);
              const y2 = 100 + 98 * Math.sin(endAngle);
              const segKey = `seg-${color}-${startAngle.toFixed(2)}`;

              return (
                <path
                  key={segKey}
                  d={`M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} Z`}
                  fill={color}
                  stroke="oklch(0.08 0.02 248)"
                  strokeWidth="0.5"
                />
              );
            })}
            {/* Center hub */}
            <circle
              cx="100"
              cy="100"
              r="18"
              fill="oklch(0.15 0.02 248)"
              stroke="oklch(0.82 0.18 85)"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Center tap button */}
        <button
          type="button"
          aria-label="Spin the wheel"
          onClick={handleTapSpin}
          disabled={disabled || isAnimating}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-16 w-16 items-center justify-center rounded-full font-display text-xs font-bold text-white uppercase tracking-wider transition-all active:scale-90 disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, oklch(0.78 0.2 85), oklch(0.68 0.22 55))",
            boxShadow: "0 0 20px oklch(0.78 0.2 85 / 0.4)",
            touchAction: "manipulation",
          }}
        >
          {isAnimating ? "..." : "Spin!"}
        </button>
      </div>

      <p className="font-body text-xs text-text-dim text-center">Flick up or tap to spin</p>
    </div>
  );
}
