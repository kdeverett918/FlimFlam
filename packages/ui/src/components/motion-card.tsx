"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Glow color on hover (defaults to coral) */
  glowColor?: string;
  /** Disable all hover effects */
  disableHover?: boolean;
}

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  (
    {
      className,
      glowColor,
      disableHover = false,
      style,
      children,
      onMouseMove,
      onMouseLeave,
      ...props
    },
    ref,
  ) => {
    const glow = glowColor ?? "oklch(0.72 0.22 25 / 0.15)";
    const [tilt, setTilt] = React.useState({ rotateX: 0, rotateY: 0 });
    const [highlight, setHighlight] = React.useState({ x: 50, y: 50 });
    const cardRef = React.useRef<HTMLDivElement | null>(null);

    const supportsHover =
      typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

    const handleMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseMove?.(e);
        if (disableHover || !supportsHover) return;

        const el = cardRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setTilt({
          rotateX: (0.5 - y) * 12,
          rotateY: (x - 0.5) * 12,
        });
        setHighlight({ x: x * 100, y: y * 100 });
      },
      [disableHover, supportsHover, onMouseMove],
    );

    const handleMouseLeave = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseLeave?.(e);
        setTilt({ rotateX: 0, rotateY: 0 });
      },
      [onMouseLeave],
    );

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        cardRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );

    return (
      <div
        ref={setRefs}
        className={cn(
          "group relative rounded-xl border border-white/[0.15] bg-white/[0.08] p-6 text-text-primary",
          "backdrop-blur-xl backdrop-saturate-[1.2]",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          !disableHover && ["hover:-translate-y-1 hover:border-white/[0.22]", "hover:shadow-xl"],
          className,
        )}
        style={{
          ...(!disableHover
            ? ({
                "--motion-card-glow": glow,
                transform:
                  tilt.rotateX !== 0 || tilt.rotateY !== 0
                    ? `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`
                    : undefined,
                transition: "transform 0.15s ease-out, box-shadow 0.3s, border-color 0.3s",
              } as React.CSSProperties)
            : {}),
          ...style,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}

        {/* Hover glow overlay */}
        {!disableHover && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              boxShadow: `0 0 30px ${glow}, inset 0 0 30px ${glow}`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Specular highlight overlay */}
        {!disableHover && supportsHover && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle at ${highlight.x}% ${highlight.y}%, oklch(1 0 0 / 0.06), transparent 60%)`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  },
);
MotionCard.displayName = "MotionCard";

export { MotionCard };
