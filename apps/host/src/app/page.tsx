"use client";

import { AnimatedBackground } from "@partyline/ui";
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
    <main className="flex min-h-screen flex-col items-center justify-center">
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
            className="font-display text-[120px] font-extrabold leading-none tracking-[-0.02em] text-text-primary"
            style={{
              textShadow: "0 0 40px oklch(0.7 0.18 265 / 0.4), 0 0 80px oklch(0.7 0.2 330 / 0.2)",
            }}
          >
            PARTYLINE
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="font-body text-[28px] text-text-muted"
        >
          Party games. Reimagined.
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
          className="group relative h-[72px] overflow-hidden rounded-2xl border border-accent-1/50 bg-white/[0.04] px-16 font-display text-[36px] font-semibold text-accent-1 transition-all duration-300 hover:border-accent-1 hover:shadow-[0_0_40px_oklch(0.7_0.18_265/0.3)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Button shimmer effect */}
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-accent-1/10 to-transparent" />
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

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="flex flex-col items-center gap-2 text-[20px] text-text-muted"
        >
          <p>Display this screen on a shared TV or monitor</p>
          <p>Players join from their phones</p>
        </motion.div>
      </div>
    </main>
  );
}
