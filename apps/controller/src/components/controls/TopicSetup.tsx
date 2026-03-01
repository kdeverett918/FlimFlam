"use client";

import { GlassPanel, haptics } from "@flimflam/ui";
import {
  Briefcase,
  Check,
  Dice5,
  Heart,
  Landmark,
  Monitor,
  Puzzle,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  politics: <Landmark className="h-5 w-5" />,
  dating: <Heart className="h-5 w-5" />,
  workplace: <Briefcase className="h-5 w-5" />,
  food: <UtensilsCrossed className="h-5 w-5" />,
  technology: <Monitor className="h-5 w-5" />,
  lifestyle: <Sparkles className="h-5 w-5" />,
  wildcard: <Dice5 className="h-5 w-5" />,
};

interface TopicSetupProps {
  categories: string[];
  onSubmit: (topic: string, category: string) => void;
}

export function TopicSetup({ categories, onSubmit }: TopicSetupProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const categoryOptions = useMemo(
    () => (categories.length > 0 ? categories : Object.keys(CATEGORY_ICONS)),
    [categories],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = topic.trim();
    if (!trimmed || !selectedCategory || submitted) return;
    haptics.confirm();
    onSubmit(trimmed, selectedCategory);
    setSubmitted(true);
  }, [topic, selectedCategory, submitted, onSubmit]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8 animate-fade-in-up">
        <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-7 w-7 text-accent-5" strokeWidth={3} />
          </div>
          <p className="text-center font-body text-lg text-text-muted">
            Topic submitted! Waiting for others...
          </p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-16 pt-4">
      <h2 className="text-center font-display text-xl font-bold text-text-primary">
        Pick a topic for Hot Take
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {categoryOptions.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                haptics.tap();
                setSelectedCategory(category);
              }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? "border-primary/50 bg-white/[0.08] shadow-[0_0_12px_oklch(0.72_0.22_25_/_0.15)]"
                  : "border-white/[0.08] bg-white/[0.04]"
              }`}
              style={{
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                transform: isSelected ? "scale(1.02)" : "scale(1)",
              }}
            >
              <span className={isSelected ? "text-primary" : "text-text-muted"}>
                {CATEGORY_ICONS[category] ?? <Puzzle className="h-5 w-5" />}
              </span>
              <span className="font-display text-sm capitalize text-text-primary">{category}</span>
            </button>
          );
        })}
      </div>

      {selectedCategory && (
        <div className="flex flex-col gap-3 animate-fade-in-up">
          <label htmlFor="hot-take-topic" className="font-body text-sm text-text-muted">
            What angle should we argue about? (example: "remote work etiquette")
          </label>
          <textarea
            id="hot-take-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 140))}
            onFocus={(e) => {
              haptics.tap();
              setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
            }}
            placeholder="Type your topic..."
            maxLength={140}
            rows={2}
            className="glass-input w-full rounded-xl p-4 font-body text-text-primary placeholder:text-text-dim focus:border-primary/50 focus:shadow-[0_0_12px_oklch(0.72_0.22_25_/_0.15)]"
          />
          <span className="text-right font-mono text-xs text-text-muted">{topic.length}/140</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!topic.trim()}
            className="h-14 w-full rounded-xl bg-primary font-display text-lg uppercase tracking-wider text-white transition-all active:scale-95 disabled:opacity-40"
            style={{
              boxShadow: topic.trim() ? "0 0 16px oklch(0.72 0.22 25 / 0.25)" : "none",
            }}
          >
            LOCK IT IN
          </button>
        </div>
      )}
    </div>
  );
}
