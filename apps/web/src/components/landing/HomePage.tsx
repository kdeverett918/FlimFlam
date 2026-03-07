"use client";

import { JoinForm } from "@/components/landing/JoinForm";
import { AVATAR_COLORS } from "@flimflam/shared";
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
  const [creatorName, setCreatorName] = useState("");
  const [creatorColor, setCreatorColor] = useState<string>(AVATAR_COLORS[0] ?? "#6366f1");
  const [creating, setCreating] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  const safeAreaPadding = {
    paddingTop: "max(2rem, env(safe-area-inset-top))",
    paddingRight: "max(1rem, env(safe-area-inset-right))",
    paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
    paddingLeft: "max(1rem, env(safe-area-inset-left))",
  } as const;

  const handleCreateRoom = useCallback(() => {
    // Clear stale reconnection tokens so we never rejoin an old room
    for (const key of ["flimflam_reconnect_token", "flimflam_room_code"]) {
      try {
        sessionStorage.removeItem(key);
      } catch {}
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    const name = encodeURIComponent(creatorName.trim() || "Host");
    const color = encodeURIComponent(creatorColor);
    setCreating(true);
    router.push(`/room/new?name=${name}&color=${color}`);
  }, [creatorName, creatorColor, router]);

  const handleJoin = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      // Clear stale reconnection tokens so we don't rejoin an old room
      for (const key of ["flimflam_reconnect_token", "flimflam_room_code"]) {
        try {
          sessionStorage.removeItem(key);
        } catch {}
        try {
          localStorage.removeItem(key);
        } catch {}
      }
      const encodedName = encodeURIComponent(name);
      const encodedColor = encodeURIComponent(color);
      router.push(`/room/${code.toUpperCase()}?name=${encodedName}&color=${encodedColor}`);
      return true;
    },
    [router],
  );

  return (
    <main
      className="landing-page flex min-h-dvh flex-col items-center gap-8 overflow-x-hidden px-4 py-8 sm:gap-12 lg:gap-16"
      style={safeAreaPadding}
    >
      <AnimatedBackground variant="vibrant" />
      <FloatingEmoji count={8} />

      {/* Logo and tagline */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <h1 className="relative flex w-full max-w-[480px] flex-col items-center gap-3 lg:max-w-[560px]">
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
            className="h-auto w-full max-w-[280px] object-contain drop-shadow-[0_0_40px_oklch(0.75_0.22_25/0.4)] sm:max-w-[400px] lg:max-w-[560px]"
          />
          <span className="sr-only">FLIMFLAM</span>
        </h1>

        <motion.p
          variants={fadeInUp}
          className="font-display text-lg font-bold text-text-primary sm:text-2xl lg:text-4xl"
          style={{
            textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)",
          }}
        >
          Game night just got ridiculous.
        </motion.p>

        <motion.p
          variants={fadeInUp}
          className="max-w-xl text-center font-body text-sm text-text-muted sm:text-base lg:text-lg"
          style={{ textShadow: "0 2px 8px oklch(0.09 0.02 250 / 0.6)" }}
        >
          Everyone plays on one screen. No app downloads. No accounts.
        </motion.p>
      </motion.div>

      {/* Two-column layout on desktop, stacked on mobile */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-stretch gap-6 lg:flex-row lg:gap-8">
        {/* JOIN GAME — prominent on mobile (shown first) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="order-1 flex w-full flex-col items-center rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm lg:order-2 lg:flex-1"
        >
          <h2 className="mb-4 font-display text-xl font-bold text-text-primary uppercase tracking-wider sm:text-2xl">
            Join Game
          </h2>
          <p className="mb-4 text-center font-body text-sm text-text-muted sm:text-base">
            Join the party from your phone.
          </p>
          <JoinForm onJoin={handleJoin} error={error} />
        </motion.div>

        {/* CREATE GAME */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="order-2 flex w-full flex-col items-center rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm lg:order-1 lg:flex-1"
        >
          <h2 className="mb-4 font-display text-xl font-bold text-text-primary uppercase tracking-wider sm:text-2xl">
            Create Game
          </h2>

          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <div className="w-full">
              <label
                className="mb-2 block text-center font-body text-sm font-semibold text-text-primary/80"
                htmlFor="host-name"
              >
                Your Name
              </label>
              <input
                id="host-name"
                type="text"
                maxLength={16}
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Enter your name"
                className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg font-medium text-text-primary placeholder:text-text-dim transition-all focus:border-primary/60 focus:shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)]"
              />
            </div>

            {/* Avatar color - simple row */}
            <div className="flex flex-wrap justify-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCreatorColor(c)}
                  className={`h-11 w-11 rounded-full border-2 transition-all ${
                    creatorColor === c
                      ? "scale-110 border-white shadow-[0_0_12px_var(--tw-shadow-color)]"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={
                    {
                      backgroundColor: c,
                      "--tw-shadow-color": c,
                    } as React.CSSProperties
                  }
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              data-testid="create-room-cta"
              onClick={handleCreateRoom}
              disabled={creating}
              aria-label="Create a new game room"
              className="group relative h-14 w-full overflow-hidden rounded-xl font-display text-xl font-black text-white uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_50px_oklch(0.75_0.22_25/0.5)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:text-2xl"
              style={{
                background: "linear-gradient(135deg, oklch(0.75 0.22 25), oklch(0.72 0.25 350))",
                boxShadow: "0 0 30px oklch(0.75 0.22 25 / 0.4), 0 4px 20px oklch(0 0 0 / 0.3)",
              }}
            >
              <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative flex items-center justify-center gap-3">
                {creating ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    CREATING...
                  </>
                ) : (
                  "CREATE GAME"
                )}
              </span>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {error && (
        <p className="relative z-10 text-center font-body text-sm font-medium text-accent-6">
          {error}
        </p>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
        className="relative z-10 text-center font-body text-sm text-text-muted sm:text-base"
        style={{ textShadow: "0 2px 8px oklch(0.09 0.02 250 / 0.6)" }}
      >
        Everyone plays on one screen. Share the room code and go!
      </motion.p>
    </main>
  );
}
