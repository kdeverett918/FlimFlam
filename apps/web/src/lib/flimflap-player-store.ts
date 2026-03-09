import {
  buildDefaultPlayerState,
  mergePlayerStates,
  normalizePlayerState,
  type PlayerPersistenceState,
  type PlayerStateSyncRequest,
} from "@/lib/flimflap-player-state";
import { getFlimFlapSupabaseAdmin } from "@/lib/flimflap-supabase";

type PlayerProfileRow = {
  user_id: string;
  display_name: string | null;
  color: string | null;
  customization: string | null;
};

type PlayerProgressRow = {
  user_id: string;
  progression: unknown;
  level_progress: unknown;
  score_profile: unknown;
  daily_data: unknown;
};

const buildStateFromRows = (
  profileRow: PlayerProfileRow | null,
  progressRow: PlayerProgressRow | null,
): PlayerPersistenceState =>
  normalizePlayerState({
    profile: {
      name: profileRow?.display_name ?? "",
      color: profileRow?.color ?? "",
      customization: profileRow?.customization ?? "",
    },
    progression: progressRow?.progression,
    levelProgress: progressRow?.level_progress,
    scoreProfile: progressRow?.score_profile,
    dailyData: progressRow?.daily_data,
  });

const persistPlayerState = async (
  userId: string,
  state: PlayerPersistenceState,
): Promise<void> => {
  const supabase = getFlimFlapSupabaseAdmin();
  const now = new Date().toISOString();

  const profileResult = await supabase.from("player_profiles").upsert(
    {
      user_id: userId,
      display_name: state.profile.name,
      color: state.profile.color,
      customization: state.profile.customization,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  const progressResult = await supabase.from("player_progress").upsert(
    {
      user_id: userId,
      progression: state.progression,
      level_progress: state.levelProgress,
      score_profile: state.scoreProfile,
      daily_data: state.dailyData,
      updated_at: now,
      last_synced_at: now,
    },
    { onConflict: "user_id" },
  );
  if (progressResult.error) {
    throw new Error(progressResult.error.message);
  }
};

export const loadFlimFlapPlayerState = async (
  userId: string,
): Promise<PlayerPersistenceState> => {
  const supabase = getFlimFlapSupabaseAdmin();

  const [profileResult, progressResult] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("user_id, display_name, color, customization")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("player_progress")
      .select("user_id, progression, level_progress, score_profile, daily_data")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  if (progressResult.error) {
    throw new Error(progressResult.error.message);
  }

  const profileRow = (profileResult.data ?? null) as PlayerProfileRow | null;
  const progressRow = (progressResult.data ?? null) as PlayerProgressRow | null;
  if (!profileRow && !progressRow) {
    return buildDefaultPlayerState();
  }

  return buildStateFromRows(profileRow, progressRow);
};

export const syncFlimFlapPlayerState = async (
  userId: string,
  incomingState: PlayerStateSyncRequest,
): Promise<PlayerPersistenceState> => {
  const currentState = await loadFlimFlapPlayerState(userId);
  const nextState = mergePlayerStates(currentState, incomingState);
  await persistPlayerState(userId, nextState);
  return nextState;
};
