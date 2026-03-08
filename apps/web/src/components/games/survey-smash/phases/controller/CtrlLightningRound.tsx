import { GlassPanel } from "@flimflam/ui";

import { QuickGuessInput } from "@/components/controls/QuickGuessInput";

interface CtrlLightningRoundProps {
  isLightningPlayer: boolean;
  question: string;
  qIndex: string | number;
  totalQ: string | number;
  teamBadge: React.ReactNode;
  onSubmit: (text: string) => void;
}

export function CtrlLightningRound({
  isLightningPlayer,
  question,
  qIndex,
  totalQ,
  teamBadge,
  onSubmit,
}: CtrlLightningRoundProps) {
  if (isLightningPlayer) {
    return (
      <div className="flex flex-col gap-4 pb-4 pt-4">
        {teamBadge}
        <div className="flex justify-center">
          <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
            {qIndex}/{totalQ}
          </span>
        </div>
        <div data-testid="survey-smash-lightning-input">
          <QuickGuessInput
            prompt={question || "Quick!"}
            placeholder="Quick! Type your answer..."
            onSubmit={onSubmit}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
      <GlassPanel
        data-testid="controller-context-card"
        className="flex flex-col items-center gap-3 px-6 py-5"
      >
        <p className="font-display text-lg font-bold text-accent-surveysmash uppercase">
          Lightning Round
        </p>
        <span className="rounded-full bg-accent-surveysmash/15 px-3 py-1 font-mono text-xs font-bold text-accent-surveysmash">
          {qIndex}/{totalQ}
        </span>
      </GlassPanel>
      {teamBadge}
    </div>
  );
}
