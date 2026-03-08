import { GlassPanel } from "@flimflam/ui";

import { TextInput } from "@/components/controls/TextInput";

interface CtrlStealChanceProps {
  isSnagTeam: boolean;
  question: string;
  teamBadge: React.ReactNode;
  onSubmit: (text: string) => void;
  errorNonce?: number;
}

export function CtrlStealChance({
  isSnagTeam,
  question,
  teamBadge,
  onSubmit,
  errorNonce,
}: CtrlStealChanceProps) {
  if (isSnagTeam) {
    return (
      <div className="flex flex-col gap-4 pb-4 pt-4" data-testid="survey-smash-steal-input">
        {teamBadge}
        <TextInput
          prompt={`Snag it! ${question}`}
          placeholder="Type your snag answer..."
          onSubmit={onSubmit}
          resetNonce={errorNonce}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
      <GlassPanel
        data-testid="controller-context-card"
        className="flex flex-col items-center gap-3 px-6 py-5"
      >
        <p className="font-display text-xs font-bold text-accent-surveysmash uppercase">
          Snag attempt!
        </p>
        {question && <p className="text-center font-body text-sm text-text-muted">{question}</p>}
      </GlassPanel>
      {teamBadge}
    </div>
  );
}
