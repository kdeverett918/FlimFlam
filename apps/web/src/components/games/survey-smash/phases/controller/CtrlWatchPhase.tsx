import { GlassPanel } from "@flimflam/ui";

interface CtrlWatchPhaseProps {
  teamBadge: React.ReactNode;
}

export function CtrlWatchPhase({ teamBadge }: CtrlWatchPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-6">
      <GlassPanel
        data-testid="controller-context-card"
        className="flex flex-col items-center gap-3 px-6 py-5"
      >
        <p className="text-center font-body text-lg text-text-muted">Watch the board!</p>
      </GlassPanel>
      {teamBadge}
    </div>
  );
}
