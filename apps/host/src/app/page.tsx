"use client";

import { GameShowcase } from "@/components/home/GameShowcase";
import { AnimatedBackground } from "@flimflam/ui";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const safeAreaPadding = {
    paddingTop: "max(4rem, env(safe-area-inset-top))",
    paddingRight: "max(1rem, env(safe-area-inset-right))",
    paddingBottom: "max(4rem, env(safe-area-inset-bottom))",
    paddingLeft: "max(1rem, env(safe-area-inset-left))",
  } as const;

  const handleCreateRoom = useCallback(() => {
    setLoading(true);
    router.push("/room/new");
  }, [router]);

  const handlePlayGame = useCallback(
    (gameId: string) => {
      setLoading(true);
      router.push(`/room/new?game=${gameId}`);
    },
    [router],
  );

  return (
    <main
      className="flex min-h-[100svh] flex-col items-center justify-center gap-12 overflow-x-hidden sm:gap-16"
      style={safeAreaPadding}
    >
      <AnimatedBackground />

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Logo with radial spotlight */}
        <h1 className="relative flex w-full max-w-[560px] flex-col items-center gap-4">
          {/* Radial spotlight behind title */}
          <div
            className="pointer-events-none absolute -inset-32 -z-10"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.75 0.22 25 / 0.25) 0%, oklch(0.74 0.15 185 / 0.12) 40%, transparent 70%)",
              filter: "blur(40px)",
            }}
            aria-hidden="true"
          />
          <Image
            src="/flimflam-logo.png"
            alt="FLIMFLAM Party Game"
            width={560}
            height={140}
            priority
            className="h-auto w-full max-w-[560px] object-contain drop-shadow-[0_0_40px_oklch(0.75_0.22_25/0.4)]"
          />
          <span className="sr-only">FLIMFLAM</span>
        </h1>

        {/* Tagline */}
        <motion.p
          variants={fadeInUp}
          className="font-body text-text-muted"
          style={{
            fontSize: "clamp(1.25rem, 3.5vw, 2.25rem)",
            textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)",
          }}
        >
          Your favorite game shows — at your fingertips.
        </motion.p>

        {/* Value proposition subtitle */}
        <motion.p
          variants={fadeInUp}
          className="max-w-xl text-center font-body text-base text-text-dim sm:text-lg"
          style={{ textShadow: "0 2px 8px oklch(0.09 0.02 250 / 0.6)" }}
        >
          Host on a shared screen. Players join from their phones. No app downloads. No accounts.
        </motion.p>

        {/* Create room button */}
        <motion.button
          variants={fadeInUp}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleCreateRoom}
          disabled={loading}
          aria-label="Create a new game room"
          className="group relative h-14 overflow-hidden rounded-2xl border-2 border-primary/70 bg-primary/15 px-10 font-display text-2xl font-bold text-primary transition-all duration-300 hover:bg-primary/25 hover:border-primary hover:shadow-[0_0_40px_oklch(0.75_0.22_25/0.4)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-50 sm:h-[72px] sm:px-16 sm:text-4xl"
          style={{
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Button shimmer effect */}
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
          <span className="relative flex items-center gap-3">
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin sm:h-8 sm:w-8" />
                CONNECTING...
              </>
            ) : (
              "CREATE ROOM"
            )}
          </span>
        </motion.button>
      </motion.div>

      {/* Gradient divider */}
      <div className="relative z-10 mx-auto h-px w-full max-w-xs bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Game showcase */}
      <div className="relative z-10 w-full">
        <GameShowcase onPlayGame={handlePlayGame} />
      </div>

      {/* Bottom instruction */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
        className="relative z-10 text-center font-body text-base text-text-muted sm:text-xl"
        style={{ textShadow: "0 2px 8px oklch(0.09 0.02 250 / 0.6)" }}
      >
        Display this screen on a shared TV. Players join from their phones.
      </motion.p>
    </main>
  );
}
