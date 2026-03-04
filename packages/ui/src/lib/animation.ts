export const ANIMATION_EASINGS = {
  crispOut: [0.16, 1, 0.3, 1] as const,
  smoothInOut: [0.45, 0, 0.55, 1] as const,
  snapIn: [0.2, 0.9, 0.3, 1] as const,
};

export const ANIMATION_DURATIONS = {
  quick: 0.2,
  standard: 0.35,
  reveal: 0.5,
  dramatic: 0.8,
  dramaticPauseMs: 450,
  dramaticBuildMs: 700,
  sequentialStepMs: 350,
};

export const ANIMATION_STAGGERS = {
  tight: 0.08,
  normal: 0.14,
  dramatic: 0.22,
};
