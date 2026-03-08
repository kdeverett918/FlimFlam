export const ANIMATION_EASINGS = {
  crispOut: [0.16, 1, 0.3, 1] as const,
  smoothInOut: [0.45, 0, 0.55, 1] as const,
  snapIn: [0.2, 0.9, 0.3, 1] as const,
  dramaticReveal: [0.34, 1.56, 0.64, 1] as const,
  scoreFly: [0.22, 1.2, 0.36, 1] as const,
  cardFlip: [0.25, 0.46, 0.45, 0.94] as const,
};

export const ANIMATION_DURATIONS = {
  quick: 0.2,
  standard: 0.35,
  reveal: 0.5,
  dramatic: 0.8,
  dramaticPauseMs: 450,
  dramaticBuildMs: 700,
  sequentialStepMs: 350,
  dimOverlay: 0.4,
  cardFlip: 0.5,
  playerStagger: 0.3,
  scoreFly: 0.6,
  leaderboardShuffle: 0.8,
};

export const ANIMATION_STAGGERS = {
  tight: 0.08,
  normal: 0.14,
  dramatic: 0.22,
};

export const PARTICLE_LIMITS = {
  desktop: { maxParticles: 150, maxEmitters: 4 },
  mobile: { maxParticles: 60, maxEmitters: 2 },
  minimal: { maxParticles: 0, maxEmitters: 0 },
} as const;
