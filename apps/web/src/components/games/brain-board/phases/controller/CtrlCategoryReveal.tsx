"use client";

import { CategoryReveal } from "@/components/controls/CategoryReveal";
import { GlassPanel } from "@flimflam/ui";

export interface CtrlCategoryRevealProps {
  isSelector: boolean;
  categories: string[];
  personalizationMessage: string | null;
  personalizationStatus: "pending" | "ai" | "curated" | null;
  onConfirm: () => void;
  onReroll: () => void;
}

export function CtrlCategoryReveal({
  isSelector,
  categories,
  personalizationMessage,
  personalizationStatus,
  onConfirm,
  onReroll,
}: CtrlCategoryRevealProps) {
  if (isSelector && categories.length > 0) {
    return (
      <CategoryReveal
        categories={categories}
        isSelector={true}
        onConfirm={onConfirm}
        onReroll={onReroll}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <GlassPanel
        data-testid="controller-context-card"
        className="flex w-full max-w-sm flex-col items-center gap-3 px-4 py-5"
      >
        <p className="text-center font-display text-lg font-bold text-text-primary">
          Categories revealed. Selector is choosing...
        </p>
        {categories.length > 0 && (
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-accent-brainboard/30 bg-accent-brainboard/10 px-3 py-1 font-body text-xs text-accent-brainboard uppercase"
              >
                {category}
              </span>
            ))}
          </div>
        )}
        {personalizationMessage && personalizationStatus && (
          <>
            <span
              data-testid="brainboard-personalization-badge"
              className={`rounded-full border px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wider ${
                personalizationStatus === "curated"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-accent-brainboard/30 bg-accent-brainboard/10 text-accent-brainboard"
              }`}
            >
              {personalizationStatus === "curated" ? "Curated" : "AI Personalized"}
            </span>
            <p
              data-testid="brainboard-personalization-message"
              className={`mt-1 text-center font-body text-xs ${personalizationStatus === "curated" ? "text-warning" : "text-text-muted"}`}
            >
              {personalizationMessage}
            </p>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
