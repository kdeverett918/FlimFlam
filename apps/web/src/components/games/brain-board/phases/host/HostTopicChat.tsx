"use client";

import { GlassPanel } from "@flimflam/ui";
import { motion } from "motion/react";
import type { BrainBoardGameState } from "../../shared/bb-types";

type ChatMessage = NonNullable<BrainBoardGameState["chatMessages"]>[number];

interface HostTopicChatProps {
  chatMessages: ChatMessage[];
  topicPreview: string[];
}

export function HostTopicChat({ chatMessages, topicPreview }: HostTopicChatProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-[clamp(36px,5vw,56px)] font-bold text-accent-brainboard"
        style={{ textShadow: "0 0 40px oklch(0.68 0.22 265 / 0.4)" }}
      >
        Topic Lab
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="font-body text-[clamp(18px,2.5vw,28px)] text-text-muted"
      >
        Chat with AI about tonight&apos;s topics...
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex w-full max-w-3xl flex-col gap-4"
      >
        {(chatMessages ?? []).slice(-8).map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.isAI ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 25 }}
          >
            <GlassPanel
              glow={msg.isAI}
              glowColor={msg.isAI ? "oklch(0.68 0.22 265 / 0.2)" : undefined}
              className={`px-6 py-4 ${msg.isAI ? "border border-accent-brainboard/30" : ""}`}
            >
              <p
                className={`font-display text-sm font-bold uppercase tracking-wider ${msg.isAI ? "text-accent-brainboard" : "text-text-muted"}`}
              >
                {msg.isAI ? "AI Host" : msg.sender}
              </p>
              <p className="mt-1 font-body text-[clamp(16px,2vw,24px)] text-text-primary">
                {msg.message}
              </p>
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>
      {topicPreview.length > 0 && (
        <GlassPanel className="w-full max-w-3xl px-6 py-4">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-accent-brainboard">
            We Heard
          </p>
          <div data-testid="brainboard-topic-chips" className="mt-3 flex flex-wrap gap-2">
            {topicPreview.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-accent-brainboard/35 bg-accent-brainboard/15 px-3 py-1 font-body text-[clamp(13px,1.5vw,18px)] text-accent-brainboard"
              >
                {topic}
              </span>
            ))}
          </div>
          <p className="mt-3 font-body text-[clamp(13px,1.5vw,18px)] text-text-muted">
            These topics will shape your board when chat ends.
          </p>
        </GlassPanel>
      )}
    </div>
  );
}
