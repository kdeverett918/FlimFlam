import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { PlayerIdentity } from "@/lib/flimflap-player-state";

let cachedConfigKey: string | null = null;
let cachedAdminClient: SupabaseClient | null = null;

const readSupabaseUrl = (): string =>
  process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";

const readSupabaseServiceRoleKey = (): string =>
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

export const isFlimFlapSupabaseConfigured = (): boolean =>
  readSupabaseUrl().length > 0 && readSupabaseServiceRoleKey().length > 0;

export const getFlimFlapSupabaseAdmin = (): SupabaseClient => {
  const supabaseUrl = readSupabaseUrl();
  const serviceRoleKey = readSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("FlimFlap Supabase server credentials are not configured.");
  }

  const cacheKey = `${supabaseUrl}::${serviceRoleKey}`;
  if (cachedConfigKey === cacheKey && cachedAdminClient) {
    return cachedAdminClient;
  }

  cachedConfigKey = cacheKey;
  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedAdminClient;
};

export const verifyFlimFlapAccessToken = async (
  accessToken: string | null | undefined,
): Promise<PlayerIdentity | null> => {
  if (!accessToken || !isFlimFlapSupabaseConfigured()) {
    return null;
  }

  const supabase = getFlimFlapSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  const authUser = data.user as typeof data.user & { is_anonymous?: boolean };
  return {
    userId: data.user.id,
    isAnonymous: authUser.is_anonymous === true,
    email: data.user.email ?? null,
  };
};
