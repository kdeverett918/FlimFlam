"use client";

import { GameShowcase } from "@/components/home/GameShowcase";
import { AnimatedBackground, GradientText } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Loader2, Monitor, Smartphone, Users } from "lucide-react";
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
    <main className="flex min-h-screen flex-col items-center bg-bg-deep">
      <AnimatedBackground />

      {/* ── Hero Section (compact) ── */}
      <section className="relative z-10 flex w-full flex-col items-center gap-6 px-4 pb-10 pt-16 sm:gap-8 sm:px-6 sm:pb-14 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center gap-3"
        >
          <h1
            className="font-display font-extrabold leading-none tracking-[-0.02em]"
            style={{ fontSize: "clamp(3.5rem, 9vw, 8rem)" }}
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
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-body tracking-wide text-text-muted"
            style={{
              fontSize: "clamp(1.25rem, 3vw, 2rem)",
              textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)",
            }}
          >
            Classic Game Shows. One Screen. Your Phones.
          </motion.p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleCreateRoom}
          disabled={loading}
          aria-label="Create a new game room"
          className="group relative h-16 overflow-hidden rounded-2xl border border-primary/50 bg-white/[0.04] px-12 font-display text-2xl font-bold tracking-wider text-primary uppercase transition-all duration-300 hover:border-primary hover:shadow-[0_0_40px_oklch(0.72_0.22_25/0.3)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-50 sm:h-[76px] sm:px-16 sm:text-4xl"
          style={{ backdropFilter: "blur(16px)" }}
        >
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
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
      </section>

      {/* ── Quick Stats Bar ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-center gap-6 px-4 py-6 sm:gap-10"
      >
        {[
          { label: "Classic Game Shows", value: "3" },
          { label: "Players", value: "3-8" },
          { label: "No App Download", value: "" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 backdrop-blur-sm"
          >
            {stat.value && (
              <span className="font-mono text-lg font-bold text-primary sm:text-xl">
                {stat.value}
              </span>
            )}
            <span
              className="font-body text-sm text-text-muted sm:text-base"
              style={{ fontSize: "clamp(0.8rem, 1.5vw, 1rem)" }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </motion.section>

      {/* ── Game Showcase ── */}
      <section className="relative z-10 w-full py-8">
        <GameShowcase />
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="mb-10 text-center font-display font-semibold tracking-wide text-text-muted"
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
            textShadow: "0 2px 12px oklch(0.09 0.02 250 / 0.8)",
          }}
        >
          HOW IT WORKS
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            {
              icon: Monitor,
              step: "1",
              title: "Host Creates Room",
              desc: "Display this screen on a shared TV or monitor and tap Create Room.",
            },
            {
              icon: Smartphone,
              step: "2",
              title: "Players Join on Phones",
              desc: "Enter the 4-letter room code at play.flimflam.gg — no app needed.",
            },
            {
              icon: Users,
              step: "3",
              title: "Play!",
              desc: "Pick a game show, choose your difficulty, and compete for the win!",
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 + i * 0.15 }}
              className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center backdrop-blur-sm"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-8 w-8 text-primary" />
              </div>
              <span className="font-mono text-sm text-text-dim">Step {item.step}</span>
              <h3
                className="font-display font-bold text-text-primary"
                style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)" }}
              >
                {item.title}
              </h3>
              <p
                className="font-body leading-relaxed text-text-muted"
                style={{ fontSize: "clamp(0.95rem, 2vw, 1.125rem)" }}
              >
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 flex w-full flex-col items-center gap-2 border-t border-white/[0.06] px-4 py-8">
        <span className="font-display text-lg font-bold tracking-wider text-text-dim">
          FLIMFLAM
        </span>
        <span className="font-body text-sm text-text-dim">flimflam.gg</span>
      </footer>
    </main>
  );
}
