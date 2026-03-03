"use client";

import { useRoom } from "@/hooks/useRoom";
import { AnimatedBackground } from "@flimflam/ui";
import { motion } from "motion/react";
import Image from "next/image";
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
  const safeAreaPadding = {
    paddingTop: "max(2rem, env(safe-area-inset-top))",
    paddingRight: "max(1.5rem, env(safe-area-inset-right))",
    paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
    paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
  } as const;

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
      <main
        className="relative flex min-h-[100svh] w-full flex-col items-center justify-center py-8"
        style={safeAreaPadding}
      >
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
      className="relative flex min-h-[100svh] w-full flex-col items-center justify-center py-8"
      style={safeAreaPadding}
    >
      <AnimatedBackground variant="subtle" />

      <motion.div
        className="mb-6 flex w-full max-w-sm flex-col items-center gap-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Logo banner */}
        <motion.div variants={fadeInUp} className="relative flex justify-center">
          {/* Radial spotlight behind logo */}
          <div
            className="pointer-events-none absolute -inset-16 -z-10"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.75 0.22 25 / 0.2) 0%, oklch(0.74 0.15 185 / 0.08) 50%, transparent 70%)",
              filter: "blur(24px)",
            }}
            aria-hidden="true"
          />
          <h1 className="font-display font-extrabold leading-none tracking-tight">
            <Image
              src="/flimflam-logo.png"
              alt="FLIMFLAM Party Game"
              width={300}
              height={75}
              priority
              className="h-auto w-full max-w-[260px] min-[390px]:max-w-[300px] object-contain"
              style={{
                filter: "drop-shadow(0 0 32px oklch(0.75 0.22 25 / 0.4))",
              }}
              aria-hidden="true"
            />
            <span className="sr-only">FLIMFLAM</span>
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
