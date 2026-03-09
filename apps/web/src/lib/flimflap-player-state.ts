const MAX_LEVEL = 50;
const SCORE_HISTORY_MAX_ENTRIES = 12;
const SESSION_HISTORY_LIMIT = 8;
const DAILY_HISTORY_LIMIT = 21;
const BASE_REACTIONS = ["😂", "🔥", "💀", "👏"] as const;
const DEFAULT_BANNERS = ["campaign"] as const;

export type StoredProfile = {
  name: string;
  color: string;
  customization: string;
};

export type StoredScoreEntry = {
  score: number;
  at: string;
};

export type StoredScoreProfile = {
  version: number;
  bestScore: number;
  recentScores: StoredScoreEntry[];
};

export type DailyData = {
  date: string;
  bestScore: number;
  attempts: number;
  streak: number;
  lastPlayedDate: string;
  lastCompletedDate: string;
};

export type LevelProgress = {
  version: number;
  unlockedLevels: number[];
  clearedLevels: number[];
  personalBests: Record<number, number>;
  currentLevel: number;
  totalScore: number;
};

export type DailyChallengeProgress = {
  date: string;
  seed: number;
  targetScore: number;
  bestScore: number;
  attempts: number;
  completed: boolean;
};

export type MedalTier = "none" | "bronze" | "silver" | "gold" | "platinum";

export type SessionSummary = {
  at: string;
  score: number;
  bestScore: number;
  nearMisses: number;
  perfectPasses: number;
  medal: MedalTier;
  newBest: boolean;
  rank: number;
  rankDelta: number;
  roomRecord: boolean;
  rivalName: string | null;
  rivalSlot: number | null;
  bannerId: string;
  unlockedReactions: string[];
  dailyChallengeDate: string | null;
  dailyChallengeCompleted: boolean;
};

export type ProgressionProfile = {
  version: number;
  totalRuns: number;
  totalPipes: number;
  totalNearMisses: number;
  totalPerfectPasses: number;
  dailyStreak: number;
  lastDailyCompletionDate: string;
  unlockedReactions: string[];
  unlockedBanners: string[];
  currentBanner: string;
  sessions: SessionSummary[];
  dailyChallenges: DailyChallengeProgress[];
};

export type PlayerPersistenceState = {
  profile: StoredProfile;
  progression: ProgressionProfile;
  levelProgress: LevelProgress;
  scoreProfile: StoredScoreProfile;
  dailyData: DailyData;
};

export type PlayerStateSyncRequest = Partial<PlayerPersistenceState>;

export type PlayerIdentity = {
  userId: string;
  isAnonymous: boolean;
  email: string | null;
};

export type BackendPlayerPayload = {
  userId: string;
  isAnonymous: boolean;
  profile: StoredProfile;
  progression: ProgressionProfile;
  levelProgress: LevelProgress;
  scoreProfile: StoredScoreProfile;
  daily: DailyData;
};

const DEFAULT_PROFILE: StoredProfile = { name: "", color: "#39ff14", customization: "flim" };
const DEFAULT_SCORE_PROFILE: StoredScoreProfile = { version: 1, bestScore: 0, recentScores: [] };
const DEFAULT_LEVEL_PROGRESS: LevelProgress = {
  version: 2,
  unlockedLevels: [1],
  clearedLevels: [],
  personalBests: {},
  currentLevel: 1,
  totalScore: 0,
};

const DEFAULT_PROGRESSION: ProgressionProfile = {
  version: 1,
  totalRuns: 0,
  totalPipes: 0,
  totalNearMisses: 0,
  totalPerfectPasses: 0,
  dailyStreak: 0,
  lastDailyCompletionDate: "",
  unlockedReactions: [...BASE_REACTIONS],
  unlockedBanners: [...DEFAULT_BANNERS],
  currentBanner: DEFAULT_BANNERS[0],
  sessions: [],
  dailyChallenges: [],
};

const toString = (value: unknown): string => (typeof value === "string" ? value : "");
const toBool = (value: unknown): boolean => value === true;
const toInt = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const clampLevel = (level: number): number => Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));

const thresholdForLevel = (level: number): number => {
  const normalized = clampLevel(level);
  return Math.floor(5 + normalized * 2.5 + Math.pow(normalized, 1.15) * 0.8);
};

const uniqueStrings = (values: unknown[], fallback: string[] = []): string[] => {
  const merged = new Set<string>(fallback);
  for (const value of values) {
    const next = toString(value);
    if (next) merged.add(next);
  }
  return [...merged];
};

const normalizeRecentScores = (value: unknown): StoredScoreEntry[] => {
  if (!Array.isArray(value)) return [];
  const deduped = new Map<string, StoredScoreEntry>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Partial<StoredScoreEntry>;
    const normalized = {
      score: toInt(candidate.score),
      at: toString(candidate.at) || new Date().toISOString(),
    };
    deduped.set(`${normalized.score}:${normalized.at}`, normalized);
  }
  return [...deduped.values()]
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
    .slice(0, SCORE_HISTORY_MAX_ENTRIES);
};

export const getEasternDateKey = (date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const buildDefaultDailyData = (today = getEasternDateKey()): DailyData => ({
  date: today,
  bestScore: 0,
  attempts: 0,
  streak: 0,
  lastPlayedDate: "",
  lastCompletedDate: "",
});

const normalizeStoredProfile = (value: unknown): StoredProfile => {
  if (!value || typeof value !== "object") return { ...DEFAULT_PROFILE };
  const candidate = value as Partial<StoredProfile>;
  return {
    name: toString(candidate.name).slice(0, 12),
    color: toString(candidate.color) || DEFAULT_PROFILE.color,
    customization: toString(candidate.customization) || DEFAULT_PROFILE.customization,
  };
};

const normalizeStoredScoreProfile = (value: unknown): StoredScoreProfile => {
  if (!value || typeof value !== "object") return { ...DEFAULT_SCORE_PROFILE };
  const candidate = value as Partial<StoredScoreProfile>;
  const recentScores = normalizeRecentScores(candidate.recentScores);
  return {
    version: 1,
    bestScore: Math.max(
      toInt(candidate.bestScore),
      recentScores.reduce((max, entry) => Math.max(max, entry.score), 0),
    ),
    recentScores,
  };
};

const normalizeDailyData = (value: unknown, today = getEasternDateKey()): DailyData => {
  if (!value || typeof value !== "object") return buildDefaultDailyData(today);
  const candidate = value as Partial<DailyData>;
  const sameDay = toString(candidate.date) === today;
  return {
    date: today,
    bestScore: sameDay ? toInt(candidate.bestScore) : 0,
    attempts: sameDay ? toInt(candidate.attempts) : 0,
    streak: toInt(candidate.streak),
    lastPlayedDate: toString(candidate.lastPlayedDate),
    lastCompletedDate: toString(candidate.lastCompletedDate),
  };
};

const normalizeLevelProgress = (value: unknown): LevelProgress => {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_LEVEL_PROGRESS,
      unlockedLevels: [...DEFAULT_LEVEL_PROGRESS.unlockedLevels],
      clearedLevels: [...DEFAULT_LEVEL_PROGRESS.clearedLevels],
      personalBests: {},
    };
  }

  const candidate = value as Partial<LevelProgress>;
  const personalBests: Record<number, number> = {};
  if (candidate.personalBests && typeof candidate.personalBests === "object") {
    for (const [rawLevel, rawScore] of Object.entries(candidate.personalBests)) {
      const level = Number(rawLevel);
      if (Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL) {
        personalBests[level] = toInt(rawScore);
      }
    }
  }

  const clearedLevels = Array.isArray(candidate.clearedLevels)
    ? [...new Set(candidate.clearedLevels.map((entry) => Number(entry)).filter(Number.isInteger))]
        .filter((level) => level >= 1 && level <= MAX_LEVEL)
        .sort((left, right) => left - right)
    : [];
  const contiguousClearedLevels: number[] = [];
  let expectedLevel = 1;
  for (const level of clearedLevels) {
    if (level !== expectedLevel) break;
    contiguousClearedLevels.push(level);
    expectedLevel += 1;
  }

  const highestCleared = contiguousClearedLevels[contiguousClearedLevels.length - 1] ?? 0;
  const highestUnlocked = Math.min(MAX_LEVEL, Math.max(1, highestCleared + 1));
  return {
    version: 2,
    unlockedLevels: Array.from({ length: highestUnlocked }, (_, index) => index + 1),
    clearedLevels: contiguousClearedLevels,
    personalBests,
    currentLevel: Math.min(MAX_LEVEL, Math.max(1, highestCleared + 1)),
    totalScore: Object.values(personalBests).reduce((total, score) => total + score, 0),
  };
};

const normalizeProgressionProfile = (value: unknown): ProgressionProfile => {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_PROGRESSION,
      unlockedReactions: [...DEFAULT_PROGRESSION.unlockedReactions],
      unlockedBanners: [...DEFAULT_PROGRESSION.unlockedBanners],
      sessions: [],
      dailyChallenges: [],
    };
  }

  const candidate = value as Partial<ProgressionProfile>;
  const sessions = Array.isArray(candidate.sessions)
    ? candidate.sessions
        .filter((entry): entry is SessionSummary => Boolean(entry && typeof entry === "object"))
        .slice(0, SESSION_HISTORY_LIMIT)
    : [];
  const dailyChallenges = Array.isArray(candidate.dailyChallenges)
    ? candidate.dailyChallenges
        .filter(
          (entry): entry is DailyChallengeProgress => Boolean(entry && typeof entry === "object"),
        )
        .slice(0, DAILY_HISTORY_LIMIT)
    : [];
  const unlockedBanners = uniqueStrings(
    Array.isArray(candidate.unlockedBanners) ? candidate.unlockedBanners : [],
    [...DEFAULT_BANNERS],
  );
  return {
    version: 1,
    totalRuns: toInt(candidate.totalRuns),
    totalPipes: toInt(candidate.totalPipes),
    totalNearMisses: toInt(candidate.totalNearMisses),
    totalPerfectPasses: toInt(candidate.totalPerfectPasses),
    dailyStreak: toInt(candidate.dailyStreak),
    lastDailyCompletionDate: toString(candidate.lastDailyCompletionDate),
    unlockedReactions: uniqueStrings(
      Array.isArray(candidate.unlockedReactions) ? candidate.unlockedReactions : [],
      [...BASE_REACTIONS],
    ),
    unlockedBanners,
    currentBanner:
      toString(candidate.currentBanner) && unlockedBanners.includes(toString(candidate.currentBanner))
        ? toString(candidate.currentBanner)
        : (unlockedBanners[unlockedBanners.length - 1] ?? DEFAULT_BANNERS[0]),
    sessions,
    dailyChallenges,
  };
};

export const buildDefaultPlayerState = (today = getEasternDateKey()): PlayerPersistenceState => ({
  profile: { ...DEFAULT_PROFILE },
  progression: normalizeProgressionProfile(DEFAULT_PROGRESSION),
  levelProgress: normalizeLevelProgress(DEFAULT_LEVEL_PROGRESS),
  scoreProfile: normalizeStoredScoreProfile(DEFAULT_SCORE_PROFILE),
  dailyData: buildDefaultDailyData(today),
});

export const normalizePlayerState = (
  value: unknown,
  today = getEasternDateKey(),
): PlayerPersistenceState => {
  if (!value || typeof value !== "object") return buildDefaultPlayerState(today);
  const candidate = value as Partial<PlayerPersistenceState>;
  return {
    profile: normalizeStoredProfile(candidate.profile),
    progression: normalizeProgressionProfile(candidate.progression),
    levelProgress: normalizeLevelProgress(candidate.levelProgress),
    scoreProfile: normalizeStoredScoreProfile(candidate.scoreProfile),
    dailyData: normalizeDailyData(candidate.dailyData, today),
  };
};

export const mergePlayerStates = (
  left: unknown,
  right: unknown,
  today = getEasternDateKey(),
): PlayerPersistenceState => {
  const previous = normalizePlayerState(left, today);
  const incoming = normalizePlayerState(right, today);
  const personalBests: Record<number, number> = {};
  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    const best = Math.max(
      previous.levelProgress.personalBests[level] ?? 0,
      incoming.levelProgress.personalBests[level] ?? 0,
    );
    if (best > 0) personalBests[level] = best;
  }

  const clearedLevels = [...new Set([
    ...previous.levelProgress.clearedLevels,
    ...incoming.levelProgress.clearedLevels,
  ])]
    .sort((a, b) => a - b)
    .filter((level, index) => level === index + 1);

  const mergedLevelProgress = normalizeLevelProgress({ personalBests, clearedLevels });
  const recentScores = normalizeRecentScores([
    ...previous.scoreProfile.recentScores,
    ...incoming.scoreProfile.recentScores,
  ]);
  const unlockedBanners = uniqueStrings(
    [...previous.progression.unlockedBanners, ...incoming.progression.unlockedBanners],
    [...DEFAULT_BANNERS],
  );

  return {
    profile:
      incoming.profile.name.trim() || incoming.profile.color !== DEFAULT_PROFILE.color
        ? incoming.profile
        : previous.profile,
    progression: {
      ...incoming.progression,
      totalRuns: Math.max(previous.progression.totalRuns, incoming.progression.totalRuns),
      totalPipes: Math.max(previous.progression.totalPipes, incoming.progression.totalPipes),
      totalNearMisses: Math.max(
        previous.progression.totalNearMisses,
        incoming.progression.totalNearMisses,
      ),
      totalPerfectPasses: Math.max(
        previous.progression.totalPerfectPasses,
        incoming.progression.totalPerfectPasses,
      ),
      dailyStreak: Math.max(previous.progression.dailyStreak, incoming.progression.dailyStreak),
      lastDailyCompletionDate:
        previous.progression.lastDailyCompletionDate.localeCompare(
          incoming.progression.lastDailyCompletionDate,
        ) >= 0
          ? previous.progression.lastDailyCompletionDate
          : incoming.progression.lastDailyCompletionDate,
      unlockedReactions: uniqueStrings(
        [...previous.progression.unlockedReactions, ...incoming.progression.unlockedReactions],
        [...BASE_REACTIONS],
      ),
      unlockedBanners,
      currentBanner:
        unlockedBanners.includes(incoming.progression.currentBanner)
          ? incoming.progression.currentBanner
          : (unlockedBanners[unlockedBanners.length - 1] ?? DEFAULT_BANNERS[0]),
      sessions: [...incoming.progression.sessions, ...previous.progression.sessions].slice(
        0,
        SESSION_HISTORY_LIMIT,
      ),
      dailyChallenges: [...incoming.progression.dailyChallenges, ...previous.progression.dailyChallenges]
        .slice(0, DAILY_HISTORY_LIMIT),
    },
    levelProgress: mergedLevelProgress,
    scoreProfile: {
      version: 1,
      bestScore: Math.max(previous.scoreProfile.bestScore, incoming.scoreProfile.bestScore),
      recentScores,
    },
    dailyData: {
      date: today,
      bestScore: Math.max(previous.dailyData.bestScore, incoming.dailyData.bestScore),
      attempts: Math.max(previous.dailyData.attempts, incoming.dailyData.attempts),
      streak: Math.max(previous.dailyData.streak, incoming.dailyData.streak),
      lastPlayedDate:
        Date.parse(previous.dailyData.lastPlayedDate) >= Date.parse(incoming.dailyData.lastPlayedDate)
          ? previous.dailyData.lastPlayedDate
          : incoming.dailyData.lastPlayedDate,
      lastCompletedDate:
        Date.parse(previous.dailyData.lastCompletedDate) >=
        Date.parse(incoming.dailyData.lastCompletedDate)
          ? previous.dailyData.lastCompletedDate
          : incoming.dailyData.lastCompletedDate,
    },
  };
};

export const coercePlayerStateSyncRequest = (value: unknown): PlayerStateSyncRequest => {
  if (!value || typeof value !== "object") return {};
  const candidate = value as Record<string, unknown>;
  const next: PlayerStateSyncRequest = {};
  if (candidate.profile) next.profile = candidate.profile as PlayerPersistenceState["profile"];
  if (candidate.progression) {
    next.progression = candidate.progression as PlayerPersistenceState["progression"];
  }
  if (candidate.levelProgress) {
    next.levelProgress = candidate.levelProgress as PlayerPersistenceState["levelProgress"];
  }
  if (candidate.scoreProfile) {
    next.scoreProfile = candidate.scoreProfile as PlayerPersistenceState["scoreProfile"];
  }
  if (candidate.dailyData ?? candidate.daily) {
    next.dailyData = (candidate.dailyData ?? candidate.daily) as PlayerPersistenceState["dailyData"];
  }
  return next;
};

export const toBackendPlayerPayload = (
  identity: PlayerIdentity,
  state: PlayerPersistenceState,
): BackendPlayerPayload => ({
  userId: identity.userId,
  isAnonymous: identity.isAnonymous,
  profile: state.profile,
  progression: state.progression,
  levelProgress: state.levelProgress,
  scoreProfile: state.scoreProfile,
  daily: state.dailyData,
});

export const hasLevelThreshold = (level: number, score: number): boolean =>
  score >= thresholdForLevel(level);
