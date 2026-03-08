"use client";

import { AVATAR_COLORS, MAX_NAME_LENGTH } from "@flimflam/shared";
import { AnimatedBackground, MotionCard, sounds, useReducedMotion } from "@flimflam/ui";
import { Check, Clock, Loader2, Users } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { JoinForm } from "@/components/landing/JoinForm";

// ─── Game data ──────────────────────────────────────────────────────────────
const GAMES = [
  {
    name: "Brain Board",
    icon: "🧠",
    tagline: "AI-powered trivia with a twist",
    tags: ["AI Generated", "Strategy", "Wagering"],
    players: "2-8",
    duration: "20-30 min",
    accent: "oklch(0.68 0.22 265)",
  },
  {
    name: "Survey Smash",
    icon: "📊",
    tagline: "Guess what the crowd thinks",
    tags: ["Teams", "Fast-Paced", "Social"],
    players: "3-10",
    duration: "15-25 min",
    accent: "oklch(0.68 0.25 25)",
  },
  {
    name: "Lucky Letters",
    icon: "🎰",
    tagline: "Spin the wheel, solve the puzzle",
    tags: ["Word Game", "Wheel Spin", "Bonus Round"],
    players: "2-6",
    duration: "20-30 min",
    accent: "oklch(0.78 0.20 85)",
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [creatorName, setCreatorName] = useState("");
  const [creatorColor, setCreatorColor] = useState<string>(AVATAR_COLORS[0] ?? "#6366f1");
  const [creating, setCreating] = useState(false);
  const [error, _setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const clearStaleTokens = useCallback(() => {
    for (const key of ["flimflam_reconnect_token", "flimflam_room_code"]) {
      try {
        sessionStorage.removeItem(key);
      } catch {}
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }, []);

  const handleCreateRoom = useCallback(() => {
    if (creating) return;
    clearStaleTokens();
    const name = encodeURIComponent(creatorName.trim() || "Host");
    const color = encodeURIComponent(creatorColor);
    setCreating(true);
    router.push(`/room/new?name=${name}&color=${color}`);
  }, [creatorColor, creatorName, creating, router, clearStaleTokens]);

  const handleJoin = useCallback(
    async (code: string, name: string, color: string): Promise<boolean> => {
      clearStaleTokens();
      const encodedName = encodeURIComponent(name);
      const encodedColor = encodeURIComponent(color);
      router.push(`/room/${code.toUpperCase()}?name=${encodedName}&color=${encodedColor}`);
      return true;
    },
    [router, clearStaleTokens],
  );

  const safeAreaPadding = {
    paddingTop: "max(2rem, env(safe-area-inset-top))",
    paddingRight: "max(1rem, env(safe-area-inset-right))",
    paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
    paddingLeft: "max(1rem, env(safe-area-inset-left))",
  } as const;

  return (
    <main
      className="landing-page flex min-h-dvh flex-col items-center gap-8 overflow-x-hidden px-4 py-8 sm:gap-12 lg:gap-16"
      style={safeAreaPadding}
    >
      <AnimatedBackground variant="vibrant" />

      {/* ─── Logo + Tagline ─── */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <h1 className="relative flex w-full max-w-[480px] flex-col items-center gap-3 lg:max-w-[560px]">
          <motion.div
            className="pointer-events-none absolute -inset-32 -z-10"
            animate={{ opacity: [0.8, 1, 0.8], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
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
          initial={reducedMotion ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="font-display text-lg font-bold text-text-primary sm:text-2xl lg:text-4xl"
          style={{ textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)" }}
        >
          Game night just got ridiculous.
        </motion.p>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="max-w-xl text-center font-body text-sm text-text-muted sm:text-base lg:text-lg"
        >
          Everyone plays on one screen. No app downloads. No accounts.
        </motion.p>
      </motion.div>

      {/* ─── Two-column: Create + Join ─── */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-stretch gap-6 lg:flex-row lg:gap-8">
        {/* CREATE GAME — first */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex w-full flex-col items-center rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm lg:flex-1"
        >
          <h2 className="mb-4 font-display text-xl font-bold text-text-primary uppercase tracking-wider sm:text-2xl">
            Create Game
          </h2>

          <form
            className="flex w-full max-w-sm flex-col items-center gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateRoom();
            }}
          >
            <div className="w-full">
              <label
                className="mb-2 block text-center font-body text-sm font-semibold text-text-primary/80"
                htmlFor="host-name"
              >
                Your Name
              </label>
              <input
                ref={nameInputRef}
                id="host-name"
                type="text"
                maxLength={MAX_NAME_LENGTH}
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Enter your name"
                className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg font-medium text-text-primary placeholder:text-text-dim transition-all focus:border-primary/60 focus:shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)]"
              />
            </div>

            {/* Color picker — wrapped grid */}
            <div className="w-full">
              <span className="mb-2 block text-center font-body text-sm font-medium text-text-muted">
                Pick your color
              </span>
              <div className="grid grid-cols-8 gap-2 justify-items-center">
                {AVATAR_COLORS.map((c) => {
                  const isSelected = creatorColor === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCreatorColor(c);
                        sounds.select();
                      }}
                      className="relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                      style={{
                        backgroundColor: c,
                        boxShadow: isSelected
                          ? `0 0 0 2px oklch(0.09 0.02 250), 0 0 0 4px ${c}, 0 0 16px ${c}60`
                          : `0 2px 6px ${c}40`,
                        transform: isSelected ? "scale(1.2)" : "scale(1)",
                      }}
                      aria-label={`Select color ${c}`}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <Check className="h-4 w-4 text-white drop-shadow-md" strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              data-testid="create-room-cta"
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
          </form>
        </motion.div>

        {/* JOIN GAME — second */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex w-full flex-col items-center rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm lg:flex-1"
        >
          <h2 className="mb-4 font-display text-xl font-bold text-text-primary uppercase tracking-wider sm:text-2xl">
            Join Game
          </h2>
          <p className="mb-4 text-center font-body text-sm text-text-muted sm:text-base">
            Join the party from your phone.
          </p>
          <JoinForm onJoin={handleJoin} error={error} />
        </motion.div>
      </div>

      {/* ─── Game Preview Cards ─── */}
      <motion.div
        className="relative z-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        {GAMES.map((game, i) => (
          <motion.div
            key={game.name}
            initial={reducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <MotionCard
              className="h-full p-5"
              glowColor={`${game.accent.replace(")", " / 0.25)")}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-4xl leading-none">{game.icon}</span>
                <div>
                  <h3 className="font-display text-base font-bold text-text-primary sm:text-lg">
                    {game.name}
                  </h3>
                  <p className="font-body text-xs text-text-muted sm:text-sm">{game.tagline}</p>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 font-body text-xs text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 font-body text-xs text-text-dim">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {game.players}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {game.duration}
                </span>
              </div>
            </MotionCard>
          </motion.div>
        ))}
      </motion.div>

      {error && (
        <p className="relative z-10 text-center font-body text-sm font-medium text-accent-6">
          {error}
        </p>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="relative z-10 pb-4 text-center font-body text-sm text-text-muted sm:text-base"
      >
        Everyone plays on one screen. Share the room code and go!
      </motion.p>
    </main>
  );
}
