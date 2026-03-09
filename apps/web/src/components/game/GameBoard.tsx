"use client";

interface GameBoardProps {
  board: React.ReactNode;
  controls: React.ReactNode;
  /** Optional floating overlay (e.g. host controls) */
  overlay?: React.ReactNode;
  wideRailOnWideScreens?: boolean;
}

export function GameBoard({
  board,
  controls,
  overlay,
  wideRailOnWideScreens = true,
}: GameBoardProps) {
  const scrollRegionClass = wideRailOnWideScreens
    ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden sm:overflow-hidden"
    : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden";
  const contentLayoutClass = wideRailOnWideScreens
    ? "mx-auto flex min-h-full w-full max-w-[1640px] flex-col gap-4 px-3 pb-4 pt-3 sm:grid sm:h-full sm:grid-cols-[minmax(0,1fr)_clamp(248px,34vw,360px)] sm:items-stretch sm:gap-3 sm:px-3 sm:pb-3 sm:pt-3 lg:grid-cols-[minmax(0,1fr)_clamp(288px,28vw,400px)] lg:gap-5 lg:px-5 lg:pb-5 lg:pt-4 xl:grid-cols-[minmax(0,1fr)_clamp(320px,26vw,420px)] xl:gap-6 xl:px-6 xl:pb-6"
    : "mx-auto flex min-h-full w-full max-w-[1640px] flex-col gap-4 px-3 pb-4 pt-3 sm:grid sm:h-full sm:grid-cols-[minmax(0,1fr)_clamp(260px,38vw,340px)] sm:items-stretch sm:gap-3 sm:px-3 sm:pb-3 sm:pt-3 lg:grid-cols-[minmax(0,1fr)_clamp(288px,32vw,380px)] lg:gap-5 lg:px-5 lg:pb-5 lg:pt-4 xl:grid-cols-[minmax(0,1fr)_clamp(300px,30vw,400px)] xl:gap-6 xl:px-6 xl:pb-6";
  const boardSurfaceClass = wideRailOnWideScreens
    ? "relative flex min-h-[min(44svh,28rem)] flex-1 overflow-hidden rounded-[28px] border border-white/12 bg-[radial-gradient(circle_at_top,oklch(0.18_0.05_255/0.72),transparent_42%),linear-gradient(180deg,oklch(0.12_0.025_252/0.94),oklch(0.08_0.018_248/0.98))] shadow-[0_30px_120px_oklch(0_0_0/0.38)] ring-1 ring-white/5 sm:min-h-0 sm:h-full"
    : "relative flex min-h-[min(30svh,18rem)] flex-1 overflow-hidden rounded-[28px] border border-white/12 bg-[radial-gradient(circle_at_top,oklch(0.18_0.05_255/0.72),transparent_42%),linear-gradient(180deg,oklch(0.12_0.025_252/0.94),oklch(0.08_0.018_248/0.98))] shadow-[0_30px_120px_oklch(0_0_0/0.38)] ring-1 ring-white/5 sm:min-h-0 sm:h-full";
  const controlsShellClass = wideRailOnWideScreens
    ? "relative mx-auto w-full max-w-6xl overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,oklch(0.14_0.03_252/0.9),oklch(0.09_0.02_248/0.96))] shadow-[0_24px_80px_oklch(0_0_0/0.3)] ring-1 ring-white/6 backdrop-blur-2xl sm:max-w-none sm:self-stretch"
    : "relative mx-auto w-full max-w-6xl overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,oklch(0.14_0.03_252/0.9),oklch(0.09_0.02_248/0.96))] shadow-[0_24px_80px_oklch(0_0_0/0.3)] ring-1 ring-white/6 backdrop-blur-2xl sm:max-w-none sm:self-stretch";
  const controlsBodyClass = wideRailOnWideScreens
    ? "min-h-[96px] sm:h-full sm:overflow-y-auto"
    : "min-h-[96px] sm:h-full sm:overflow-y-auto";

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className={scrollRegionClass}>
        <div className={contentLayoutClass}>
          <section className={boardSurfaceClass}>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,oklch(0_0_0/0.16))]" />
            <div className="relative min-h-full w-full">{board}</div>
          </section>

          <section className={controlsShellClass}>
            <div
              className={controlsBodyClass}
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom) + 0.9rem)",
              }}
            >
              {controls}
            </div>
          </section>
        </div>
      </div>

      {overlay}
    </div>
  );
}
