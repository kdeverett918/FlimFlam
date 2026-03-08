import { GlassPanel } from "@flimflam/ui";

export function CtrlAllInCategory() {
  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-8">
      <GlassPanel
        glow
        glowColor="oklch(0.68 0.22 265 / 0.3)"
        className="flex flex-col items-center gap-4 px-8 py-8 animate-all-in-glow"
      >
        <p
          className="font-display text-2xl font-black uppercase text-accent-brainboard"
          style={{ textShadow: "0 0 24px oklch(0.68 0.22 265 / 0.5)" }}
        >
          All-In Round
        </p>
        <p className="font-body text-sm text-text-muted">One final question. Wager everything.</p>
      </GlassPanel>
    </div>
  );
}
