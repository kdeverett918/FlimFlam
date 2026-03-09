"use client";

import { Boogaloo } from "next/font/google";

const boogaloo = Boogaloo({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const LETTERS = [
  {
    char: "F",
    className: "logo-letter-f1",
    color: "#ff3cac",
    animation: "flimflam-logo-wobble-f1 0.9s ease-in-out infinite",
  },
  {
    char: "L",
    className: "logo-letter-l1",
    color: "#ffe000",
    animation: "flimflam-logo-wobble-l 1.1s ease-in-out infinite",
  },
  {
    char: "I",
    className: "logo-letter-i",
    color: "#00f5d4",
    animation: "flimflam-logo-wobble-i 0.8s ease-in-out infinite",
  },
  {
    char: "M",
    className: "logo-letter-m1",
    color: "#ff7700",
    animation: "flimflam-logo-wobble-m 1.3s ease-in-out infinite",
  },
  {
    char: "F",
    className: "logo-letter-f2",
    color: "#a855f7",
    animation: "flimflam-logo-wobble-f2 0.75s ease-in-out infinite",
  },
  {
    char: "L",
    className: "logo-letter-l2",
    color: "#ff3cac",
    animation: "flimflam-logo-wobble-l 1s ease-in-out infinite",
  },
  {
    char: "A",
    className: "logo-letter-a",
    color: "#00f5d4",
    animation: "flimflam-logo-wobble-a 1.2s ease-in-out infinite",
  },
  {
    char: "M",
    className: "logo-letter-m2",
    color: "#ffe000",
    animation: "flimflam-logo-wobble-m2 0.95s ease-in-out infinite",
  },
] as const;

interface FlimflamLogoProps {
  reducedMotion?: boolean;
}

export function FlimflamLogo({ reducedMotion = false }: FlimflamLogoProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flimflam-logo-wordmark" aria-hidden="true">
        {LETTERS.slice(0, 4).map((letter) => (
          <span
            key={letter.className}
            className={`${boogaloo.className} flimflam-logo-letter ${letter.className}`}
            style={{
              color: letter.color,
              animation: reducedMotion ? "none" : letter.animation,
            }}
          >
            {letter.char}
          </span>
        ))}
        <span className="flimflam-logo-gap" />
        {LETTERS.slice(4).map((letter) => (
          <span
            key={letter.className}
            className={`${boogaloo.className} flimflam-logo-letter ${letter.className}`}
            style={{
              color: letter.color,
              animation: reducedMotion ? "none" : letter.animation,
            }}
          >
            {letter.char}
          </span>
        ))}
      </div>

      <div className="flimflam-logo-subtitle" aria-hidden="true">
        arcade series
      </div>

      <style jsx>{`
        @keyframes flimflam-logo-wobble-f1 {
          0%,
          100% {
            transform: rotate(-4deg) scale(1.05);
          }
          50% {
            transform: rotate(3deg) scale(0.97);
          }
        }

        @keyframes flimflam-logo-wobble-l {
          0%,
          100% {
            transform: rotate(2deg) translateY(-4px);
          }
          50% {
            transform: rotate(-3deg) translateY(4px);
          }
        }

        @keyframes flimflam-logo-wobble-i {
          0%,
          100% {
            transform: scaleX(0.9) scaleY(1.1);
          }
          50% {
            transform: scaleX(1.1) scaleY(0.9);
          }
        }

        @keyframes flimflam-logo-wobble-m {
          0%,
          100% {
            transform: rotate(-2deg);
          }
          50% {
            transform: rotate(4deg) translateY(-2px);
          }
        }

        @keyframes flimflam-logo-wobble-f2 {
          0%,
          100% {
            transform: rotate(5deg) scale(0.95);
          }
          50% {
            transform: rotate(-3deg) scale(1.05);
          }
        }

        @keyframes flimflam-logo-wobble-a {
          0%,
          100% {
            transform: translateY(0) rotate(1deg);
          }
          50% {
            transform: translateY(-6px) rotate(-3deg);
          }
        }

        @keyframes flimflam-logo-wobble-m2 {
          0%,
          100% {
            transform: scaleY(1.08) rotate(-2deg);
          }
          50% {
            transform: scaleY(0.93) rotate(3deg);
          }
        }

        .flimflam-logo-wordmark {
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          gap: clamp(0.02em, 0.35vw, 0.08em);
          filter: drop-shadow(0 0 30px rgb(255 60 172 / 0.4));
        }

        .flimflam-logo-letter {
          display: inline-block;
          font-size: clamp(4.5rem, 13vw, 7.5rem);
          line-height: 0.88;
          text-shadow:
            0 0 18px color-mix(in srgb, currentColor 60%, transparent),
            0 0 36px color-mix(in srgb, currentColor 28%, transparent);
          will-change: transform;
        }

        .flimflam-logo-gap {
          display: inline-block;
          width: clamp(0.7rem, 2vw, 1.75rem);
        }

        .flimflam-logo-subtitle {
          color: rgb(255 255 255 / 0.3);
          font-family: var(--font-mono);
          font-size: clamp(0.65rem, 1.1vw, 0.78rem);
          letter-spacing: 0.6em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
