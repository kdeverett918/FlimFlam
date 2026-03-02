"use client";

import { useRoom } from "@/hooks/useRoom";
import { AnimatedBackground, GradientText } from "@flimflam/ui";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { JoinForm } from "./JoinForm";

interface JoinPageClientProps {
  initialCode: string;
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function JoinPageClient({ initialCode }: JoinPageClientProps) {
  const router = useRouter();
  const { joinRoom, error, connected } = useRoom();

  const handleJoin = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      return joinRoom(code, name, color);
    },
    [joinRoom],
  );

  useEffect(() => {
    if (connected) {
      router.replace("/play");
    }
  }, [connected, router]);

  if (connected) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-8">
        <AnimatedBackground variant="subtle" />
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
          <p className="font-body text-text-primary">Joining room...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-8"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <AnimatedBackground variant="subtle" />

      <motion.div
        className="mb-10 flex flex-col items-center gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Animated ring behind title */}
        <motion.div variants={fadeInUp} className="relative">
          <div
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full"
            style={{
              background: "radial-gradient(circle, oklch(0.75 0.22 25 / 0.15) 0%, transparent 70%)",
              filter: "blur(16px)",
            }}
            aria-hidden="true"
          />
          <h1
            className="font-display font-extrabold leading-none tracking-tight"
            style={{
              fontSize: "clamp(2rem, 10vw, 3rem)",
            }}
          >
            <GradientText
              animated
              style={{
                textShadow:
                  "0 0 32px oklch(0.78 0.22 25 / 0.5), 0 0 64px oklch(0.78 0.22 25 / 0.2)",
              }}
            >
              FLIMFLAM
            </GradientText>
          </h1>
        </motion.div>
        <motion.p variants={fadeInUp} className="font-body text-sm text-text-muted">
          Join the party from your phone
        </motion.p>
      </motion.div>

      <JoinForm initialCode={initialCode} onJoin={handleJoin} error={error} />
    </main>
  );
}
