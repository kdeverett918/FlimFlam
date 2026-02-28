"use client";

import { useCallback, useMemo, useState } from "react";

const CATEGORY_EMOJIS: Record<string, string> = {
  politics: "🏛️",
  dating: "❤️",
  workplace: "💼",
  food: "🍜",
  technology: "💻",
  lifestyle: "✨",
  wildcard: "🎲",
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
    () => (categories.length > 0 ? categories : Object.keys(CATEGORY_EMOJIS)),
    [categories],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = topic.trim();
    if (!trimmed || !selectedCategory || submitted) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
    onSubmit(trimmed, selectedCategory);
    setSubmitted(true);
  }, [topic, selectedCategory, submitted, onSubmit]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pb-16 pt-8">
        <span className="text-4xl">{"✅"}</span>
        <p className="text-center text-lg text-text-muted">
          Topic submitted! Waiting for others...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-16 pt-4">
      <h2 className="text-center font-display text-xl text-text-primary">
        Pick a topic for Hot Take
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {categoryOptions.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
              selectedCategory === category
                ? "border-accent-2 bg-accent-2/20"
                : "border-bg-card bg-bg-card"
            }`}
          >
            <span className="text-2xl">{CATEGORY_EMOJIS[category] ?? "🧩"}</span>
            <span className="font-display text-sm capitalize text-text-primary">{category}</span>
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div className="flex flex-col gap-3">
          <label htmlFor="hot-take-topic" className="text-sm text-text-muted">
            What angle should we argue about? (example: "remote work etiquette")
          </label>
          <textarea
            id="hot-take-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 140))}
            placeholder="Type your topic..."
            maxLength={140}
            rows={2}
            className="w-full rounded-xl border-2 border-bg-card bg-bg-card p-4 text-text-primary placeholder-text-muted focus:border-accent-2 focus:outline-none"
          />
          <span className="text-right text-xs text-text-muted">{topic.length}/140</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!topic.trim()}
            className="h-14 w-full rounded-xl bg-accent-2 font-display text-lg uppercase tracking-wider text-bg-dark transition-all active:scale-95 disabled:opacity-40"
          >
            LOCK IT IN
          </button>
        </div>
      )}
    </div>
  );
}
