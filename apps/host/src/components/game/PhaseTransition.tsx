"use client";

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
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-dark/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
        }}
        className="flex flex-col items-center gap-6"
      >
        {/* Decorative lines */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="h-[2px] bg-gradient-to-r from-transparent via-accent-1 to-transparent"
        />

        <h1 className="animate-glow-pulse font-display text-[72px] text-text-primary md:text-[96px]">
          {label}
        </h1>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="h-[2px] bg-gradient-to-r from-transparent via-accent-4 to-transparent"
        />
      </motion.div>
    </motion.div>
  );
}
