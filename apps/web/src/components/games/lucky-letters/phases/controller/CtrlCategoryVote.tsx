"use client";

import { CategoryVoteCards } from "@/components/controls/CategoryVoteCards";

export function CtrlCategoryVote({
  categories,
  onVote,
}: {
  categories: string[];
  onVote: (selected: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4 pb-4 pt-6">
      <p
        className="text-center font-display text-xl font-black uppercase"
        style={{ color: "oklch(0.78 0.2 85)", textShadow: "0 0 24px oklch(0.78 0.2 85 / 0.5)" }}
      >
        Pick Categories
      </p>
      <CategoryVoteCards categories={categories} maxSelections={3} onVote={onVote} />
    </div>
  );
}
