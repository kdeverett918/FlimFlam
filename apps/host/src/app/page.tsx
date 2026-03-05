"use client";

import { GameShowcase } from "@/components/home/GameShowcase";
import { AnimatedBackground, FloatingEmoji } from "@flimflam/ui";
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
    transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] as const },
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
      className="landing-page flex min-h-[100svh] flex-col items-center justify-center gap-12 overflow-x-hidden sm:gap-16"
      style={safeAreaPadding}
    >
      <AnimatedBackground variant="vibrant" />
      <FloatingEmoji count={10} />

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Logo with radial spotlight */}
        <h1 className="relative flex w-full max-w-[560px] flex-col items-center gap-4">
          {/* Pulsing radial spotlight behind title */}
          <motion.div
            className="pointer-events-none absolute -inset-32 -z-10"
            animate={{
              opacity: [0.8, 1, 0.8],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.75 0.22 25 / 0.35) 0%, oklch(0.72 0.25 350 / 0.15) 40%, transparent 70%)",
              filter: "blur(40px)",
            }}
            aria-hidden="true"
          />
          <Image
            src="/flimflam-logo.png"
            alt="FLIMFLAM Party Game"
            width={688}
            height={384}
            priority
            className="h-auto w-full max-w-[560px] object-contain drop-shadow-[0_0_40px_oklch(0.75_0.22_25/0.4)]"
          />
          <span className="sr-only">FLIMFLAM</span>
        </h1>

        {/* Tagline */}
        <motion.p
          variants={fadeInUp}
          className="font-display font-bold text-text-primary"
          style={{
            fontSize: "clamp(1.25rem, 3.5vw, 2.25rem)",
            textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)",
          }}
        >
          Game night just got ridiculous.
        </motion.p>

        {/* Value proposition subtitle */}
        <motion.p
          variants={fadeInUp}
          className="max-w-xl text-center font-body text-base text-text-muted sm:text-lg"
          style={{ textShadow: "0 2px 8px oklch(0.09 0.02 250 / 0.6)" }}
        >
          Host on a shared screen. Players join from their phones. No app downloads. No accounts.
        </motion.p>

        {/* Create room button - solid gradient */}
        <motion.button
          variants={fadeInUp}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          data-testid="create-room-cta"
          onClick={handleCreateRoom}
          disabled={loading}
          aria-label="Create a new game room"
          className="group relative h-16 overflow-hidden rounded-2xl px-12 font-display text-3xl font-black text-white uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_50px_oklch(0.75_0.22_25/0.5)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-50 sm:h-[76px] sm:px-16 sm:text-4xl"
          style={{
            background: "linear-gradient(135deg, oklch(0.75 0.22 25), oklch(0.72 0.25 350))",
            boxShadow: "0 0 30px oklch(0.75 0.22 25 / 0.4), 0 4px 20px oklch(0 0 0 / 0.3)",
          }}
        >
          {/* Button shimmer effect */}
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="relative flex items-center gap-3">
            {loading ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin sm:h-8 sm:w-8" />
                CONNECTING...
              </>
            ) : (
              "LET'S PLAY!"
            )}
          </span>
        </motion.button>
      </motion.div>

      {/* Gradient divider */}
      <div className="relative z-10 mx-auto h-px w-full max-w-xs bg-gradient-to-r from-transparent via-fun-pink/40 to-transparent" />

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
