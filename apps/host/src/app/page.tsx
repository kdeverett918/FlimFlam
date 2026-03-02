"use client";

import { GameShowcase } from "@/components/home/GameShowcase";
import { AnimatedBackground, GradientText } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = useCallback(async () => {
    setLoading(true);
    router.push("/room/new");
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 py-16">
      <AnimatedBackground />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <h1
            className="font-display font-extrabold leading-none tracking-[-0.02em]"
            style={{
              fontSize: "clamp(3rem, 8vw, 7rem)",
            }}
          >
            <GradientText
              animated
              style={{
                textShadow:
                  "0 0 40px oklch(0.72 0.22 25 / 0.4), 0 0 80px oklch(0.70 0.15 185 / 0.2)",
              }}
            >
              FLIMFLAM
            </GradientText>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="font-body text-text-muted"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}
        >
          Games that get weird.
        </motion.p>

        {/* Create room button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleCreateRoom}
          disabled={loading}
          aria-label="Create a new game room"
          className="group relative h-[72px] overflow-hidden rounded-2xl border border-primary/50 bg-white/[0.04] px-16 font-display text-[36px] font-semibold text-primary transition-all duration-300 hover:border-primary hover:shadow-[0_0_40px_oklch(0.72_0.22_25/0.3)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Button shimmer effect */}
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
          <span className="relative flex items-center gap-3">
            {loading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                CONNECTING...
              </>
            ) : (
              "CREATE ROOM"
            )}
          </span>
        </motion.button>
      </div>

      {/* Game showcase */}
      <div className="relative z-10">
        <GameShowcase />
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="font-display text-[32px] font-semibold text-text-muted"
        >
          Ready to play?
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleCreateRoom}
          disabled={loading}
          aria-label="Create a new game room"
          className="group relative h-[64px] overflow-hidden rounded-2xl border border-primary/50 bg-white/[0.04] px-12 font-display text-[28px] font-semibold text-primary transition-all duration-300 hover:border-primary hover:shadow-[0_0_40px_oklch(0.72_0.22_25/0.3)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
          <span className="relative flex items-center gap-3">
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                CONNECTING...
              </>
            ) : (
              "CREATE ROOM"
            )}
          </span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="flex flex-col items-center gap-2 text-[24px] text-text-muted"
        >
          <p>Display this screen on a shared TV or monitor</p>
          <p>Players join from their phones</p>
        </motion.div>
      </div>
    </main>
  );
}
