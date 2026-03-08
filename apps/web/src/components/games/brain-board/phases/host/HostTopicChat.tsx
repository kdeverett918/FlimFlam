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
    <div className="flex flex-col items-center justify-center gap-8 p-8 lg:flex-row lg:items-start lg:gap-12">
      {/* Left side: Chat messages (60% on desktop) */}
      <div className="flex w-full flex-col gap-4 lg:w-[60%]">
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
          className="flex w-full flex-col gap-4"
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
                className={`px-6 py-4 ${
                  msg.isAI ? "border-l-4 border-accent-brainboard/50 bg-accent-brainboard/5" : ""
                }`}
                style={!msg.isAI ? { borderLeft: "4px solid var(--color-text-muted)" } : undefined}
              >
                <div className="flex items-center gap-2">
                  {msg.isAI && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-brainboard/20">
                      <span className="text-xs">🧠</span>
                    </div>
                  )}
                  <p
                    className={`font-display text-sm font-bold uppercase tracking-wider ${msg.isAI ? "text-accent-brainboard" : "text-text-muted"}`}
                  >
                    {msg.isAI ? "AI Host" : msg.sender}
                  </p>
                </div>
                <p className="mt-1 font-body text-[clamp(16px,2vw,24px)] text-text-primary">
                  {msg.message}
                </p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right side: Floating topic cloud (40% on desktop) */}
      {topicPreview.length > 0 && (
        <div className="w-full lg:w-[40%] lg:sticky lg:top-8">
          <GlassPanel className="w-full px-6 py-6">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-accent-brainboard mb-4">
              We Heard
            </p>
            <div
              data-testid="brainboard-topic-chips"
              className="flex flex-wrap gap-3 justify-center"
            >
              {topicPreview.map((topic, idx) => {
                // Vary sizes for cloud effect
                const sizes = ["text-base", "text-lg", "text-xl", "text-base", "text-lg"];
                const sizeClass = sizes[idx % sizes.length];
                const opacities = [1, 0.9, 0.85, 0.95, 0.8];
                const opacity = opacities[idx % opacities.length];

                return (
                  <motion.span
                    key={topic}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity,
                      scale: 1,
                      y: [0, -3, 0, 3, 0],
                    }}
                    transition={{
                      opacity: { delay: 0.8 + idx * 0.15, duration: 0.4 },
                      scale: { delay: 0.8 + idx * 0.15, type: "spring", stiffness: 200 },
                      y: {
                        delay: 1.5 + idx * 0.3,
                        duration: 3 + idx * 0.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      },
                    }}
                    className={`rounded-full border border-accent-brainboard/35 bg-accent-brainboard/15 px-4 py-2 font-body ${sizeClass} text-accent-brainboard cursor-default`}
                  >
                    {topic}
                  </motion.span>
                );
              })}
            </div>
            <p className="mt-4 font-body text-[clamp(13px,1.5vw,18px)] text-text-muted text-center">
              These topics will shape your board when chat ends.
            </p>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
