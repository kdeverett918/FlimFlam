"use client";

import { AnimatedBackground } from "@flimflam/ui";
import { motion } from "framer-motion";

interface PhaseTransitionProps {
  label: string;
}

export function PhaseTransition({ label }: PhaseTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <AnimatedBackground />

      {/* White flash overlay */}
      <motion.div
        initial={{ opacity: 0.2 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute inset-0 bg-white pointer-events-none"
      />

      {/* Top light bar */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute left-0 right-0 top-[40%] h-[3px]"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0.72 0.22 25 / 0.8), transparent)",
        }}
      />

      {/* Phase label */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: [0.85, 1.02, 1], opacity: 1 }}
        exit={{ scale: 1.05, opacity: 0 }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          scale: {
            times: [0, 0.7, 1],
            duration: 0.6,
          },
        }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <h1
          className="font-display text-[80px] font-extrabold text-text-primary md:text-[112px]"
          style={{
            textShadow: "0 0 40px oklch(0.72 0.22 25 / 0.5), 0 0 80px oklch(0.70 0.15 185 / 0.25)",
          }}
        >
          {label}
        </h1>
      </motion.div>

      {/* Bottom light bar */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "-100%", opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute bottom-[40%] left-0 right-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.70 0.15 185 / 0.8), transparent)",
        }}
      />
    </motion.div>
  );
}
