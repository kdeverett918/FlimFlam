"use client";

import { GlassPanel } from "@flimflam/ui";
import { Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface MicroAwardsProps {
  awards: Array<{ title: string; recipient: string; icon?: string }>;
}

export function MicroAwards({ awards }: MicroAwardsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <AnimatePresence>
        {awards.map((award, idx) => (
          <motion.div
            key={`${award.title}-${award.recipient}`}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{
              delay: idx * 0.4,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          >
            <GlassPanel
              variant="gradient"
              rounded="xl"
              depth="deep"
              className="flex flex-col items-center gap-2 px-6 py-4 min-w-[160px]"
            >
              {award.icon ? (
                <span className="text-2xl" role="img" aria-label={award.icon}>
                  {award.icon}
                </span>
              ) : (
                <Trophy size={28} className="text-yellow-400" aria-label="Trophy" />
              )}
              <span className="text-center font-bold text-sm text-text-primary">{award.title}</span>
              <span className="text-center text-xs text-text-muted">{award.recipient}</span>
            </GlassPanel>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
