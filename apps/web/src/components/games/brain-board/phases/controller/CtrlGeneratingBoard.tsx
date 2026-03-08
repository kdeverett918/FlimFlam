import { GlassPanel } from "@flimflam/ui";
import { Zap } from "lucide-react";

export function CtrlGeneratingBoard() {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <GlassPanel
        glow
        glowColor="oklch(0.68 0.22 265 / 0.3)"
        className="flex flex-col items-center gap-5 px-8 py-6"
      >
        <div className="relative">
          <div className="h-12 w-12 animate-spin-slow rounded-full border-2 border-accent-brainboard/30 border-t-accent-brainboard" />
          <Zap className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-accent-brainboard" />
        </div>
        <p className="font-display text-lg font-bold text-text-primary">Building Your Board</p>
        <p className="text-center font-body text-sm text-text-muted">
          AI is crafting custom trivia from your topics...
        </p>
      </GlassPanel>
    </div>
  );
}
