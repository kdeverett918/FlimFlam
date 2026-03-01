"use client";

import { GlassPanel, haptics } from "@partyline/ui";
import { Check } from "lucide-react";
import { useCallback, useState } from "react";

interface BrainBattleTopicSubmitProps {
  sendMessage: (type: string, data?: Record<string, unknown>) => void;
}

export function BrainBattleTopicSubmit({ sendMessage }: BrainBattleTopicSubmitProps) {
  const [topic1, setTopic1] = useState("");
  const [topic2, setTopic2] = useState("");
  const [topic3, setTopic3] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    const topics = [topic1, topic2, topic3].filter((t) => t.trim().length > 0);
    if (topics.length === 0 || submitted) return;
    haptics.confirm();
    sendMessage("player:submit", { topics });
    setSubmitted(true);
  }, [topic1, topic2, topic3, submitted, sendMessage]);

  const hasAtLeastOne = topic1.trim() || topic2.trim() || topic3.trim();

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8 animate-fade-in-up">
        <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-7 w-7 text-accent-5" strokeWidth={3} />
          </div>
          <p className="font-display text-xl font-bold text-accent-5">Topics submitted!</p>
          <p className="text-center font-body text-sm text-text-muted">Watch the main screen</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-16 pt-4">
      <p className="text-center font-display text-lg font-bold text-text-primary">
        Submit topics for the board
      </p>
      <p className="text-center font-body text-sm text-text-muted">
        Suggest up to 3 categories you want to be quizzed on
      </p>

      {[
        { value: topic1, setter: setTopic1, label: "Topic 1" },
        { value: topic2, setter: setTopic2, label: "Topic 2" },
        { value: topic3, setter: setTopic3, label: "Topic 3" },
      ].map(({ value, setter, label }) => (
        <div key={label} className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => setter(e.target.value.slice(0, 40))}
            onFocus={() => haptics.tap()}
            placeholder={label}
            maxLength={40}
            className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg text-text-primary placeholder:text-text-dim transition-all focus:border-accent-7/50 focus:shadow-[0_0_12px_oklch(0.65_0.22_260_/_0.15)]"
          />
          {value.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-text-muted">
              {value.length}/40
            </span>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasAtLeastOne}
        className="h-14 w-full rounded-xl bg-accent-7 font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        style={{
          boxShadow: hasAtLeastOne ? "0 0 16px oklch(0.65 0.22 260 / 0.25)" : "none",
        }}
      >
        Submit Topics
      </button>
    </div>
  );
}
