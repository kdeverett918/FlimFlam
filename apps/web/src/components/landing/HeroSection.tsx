"use client";

import {
  AnimatedBackground,
  fireParticleEffect,
  haptics,
  sounds,
  useReducedMotion,
} from "@flimflam/ui";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { FlimflamLogo } from "@/components/landing/FlimflamLogo";

const TAGLINE = "Game night just got ridiculous.";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      // Phase 1: Radial gradient bloom (0 -> 0.7s)
      tl.fromTo(
        bloomRef.current,
        { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: "power2.out" },
        0,
      );

      // Phase 2: Logo deblur (0.3 -> 1.2s)
      tl.fromTo(
        logoRef.current,
        { scale: 0.92, opacity: 0, filter: "blur(6px)" },
        { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "power2.out" },
        0.3,
      );

      // Sound at T+700ms
      tl.call(
        () => {
          sounds.reveal();
        },
        [],
        0.7,
      );

      // Phase 3: Tagline character-by-character spring type (1.2s -> ~2.0s)
      const chars = taglineRef.current?.querySelectorAll(".hero-char");
      if (chars && chars.length > 0) {
        tl.fromTo(
          chars,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.03,
            ease: "back.out(2)",
          },
          1.2,
        );
      }

      // Haptic at T+1600ms
      tl.call(
        () => {
          haptics.confirm();
        },
        [],
        1.6,
      );

      // Phase 4: Sparkle particle at logo position (T+1.8s)
      tl.call(
        () => {
          void fireParticleEffect("sparkle-trail", {
            origin: { x: 0.5, y: 0.25 },
            scale: 0.6,
          });
        },
        [],
        1.8,
      );
    },
    { scope: containerRef, dependencies: [reducedMotion] },
  );

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-col items-center gap-4 pt-4 sm:pt-8 lg:pt-12"
    >
      <AnimatedBackground variant="vibrant" />

      {/* Radial bloom behind logo */}
      <div
        ref={bloomRef}
        className="pointer-events-none absolute -inset-32 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.75 0.22 25 / 0.35) 0%, oklch(0.72 0.25 350 / 0.15) 40%, transparent 70%)",
          filter: "blur(40px)",
          opacity: reducedMotion ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* Logo with deblur animation */}
      <h1 className="relative flex w-full max-w-[680px] flex-col items-center gap-3">
        <div
          ref={logoRef}
          style={{
            opacity: reducedMotion ? 1 : 0,
          }}
        >
          <FlimflamLogo reducedMotion={reducedMotion} />
        </div>
        <span className="sr-only">FLIMFLAM arcade series</span>
      </h1>

      {/* Tagline with character-by-character animation */}
      <div
        ref={taglineRef}
        className="font-display text-lg font-bold text-text-primary sm:text-2xl lg:text-4xl"
        style={{
          textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)",
        }}
        aria-label={TAGLINE}
      >
        {TAGLINE.split("").map((char, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative character animation
            key={i}
            className="hero-char inline-block"
            style={{
              opacity: reducedMotion ? 1 : 0,
              whiteSpace: char === " " ? "pre" : undefined,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>

      <p
        className="max-w-xl text-center font-body text-sm text-text-muted sm:text-base lg:text-lg"
        style={{
          textShadow: "0 2px 8px oklch(0.09 0.02 250 / 0.6)",
          opacity: reducedMotion ? 1 : undefined,
          animation: reducedMotion ? undefined : "fade-in-up 0.6s ease-out 2s forwards",
        }}
      >
        One screen. Every phone. Jump in instantly, save progress when you want.
      </p>
    </div>
  );
}
