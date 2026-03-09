import { type NextRequest, NextResponse } from "next/server";

import { loadFlimFlapPlayerState, syncFlimFlapPlayerState } from "@/lib/flimflap-player-store";
import {
  buildDefaultPlayerState,
  coercePlayerStateSyncRequest,
  mergePlayerStates,
  toBackendPlayerPayload,
  type BackendPlayerPayload,
  type PlayerIdentity,
  type PlayerStateSyncRequest,
} from "@/lib/flimflap-player-state";
import {
  isFlimFlapSupabaseConfigured,
  verifyFlimFlapAccessToken,
} from "@/lib/flimflap-supabase";

const DEV_BACKEND_ORIGIN = "http://127.0.0.1:2567";
const PROD_BACKEND_ORIGIN = "https://trumpybird.app";
const DEV_STUB_IDENTITY: PlayerIdentity = {
  userId: "local-dev-player",
  isAnonymous: true,
  email: null,
};

type LeaderboardEntry = {
  id: number;
  playerName: string;
  score: number;
  character: string;
  medal: "none" | "bronze" | "silver" | "gold" | "platinum";
  roomCode: string;
  createdAt: string;
};

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  total: number;
};

const EMPTY_LEADERBOARD_RESPONSE: LeaderboardResponse = {
  entries: [],
  total: 0,
};

function asOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

const isE2E = (): boolean => process.env.FLIMFLAM_E2E === "1";

const isDevelopment = (): boolean => process.env.NODE_ENV !== "production";

const noStoreHeaders = (headers?: HeadersInit): HeadersInit => ({
  "Cache-Control": "no-store",
  ...(headers ?? {}),
});

const readBearerToken = (request: NextRequest): string | null => {
  const authorization = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
};

const resolveLocalBackendMode = (): "supabase" | "stub" | "proxy" => {
  if (isFlimFlapSupabaseConfigured()) {
    return "supabase";
  }
  if (isE2E() || isDevelopment()) {
    return "stub";
  }
  return "proxy";
};

const readProgressSyncRequest = async (
  request: NextRequest,
): Promise<PlayerStateSyncRequest> => {
  const payload = (await request.json().catch(() => null)) as { local?: unknown } | null;
  return coercePlayerStateSyncRequest(payload?.local ?? null);
};

const buildJson = <T,>(
  body: T,
  init?: { status?: number; headers?: HeadersInit },
): NextResponse<T> =>
  NextResponse.json(body, {
    status: init?.status,
    headers: noStoreHeaders(init?.headers),
  });

const buildAuthError = (status: 401 | 503, error: string, message: string): NextResponse =>
  buildJson({ error, message }, { status });

async function readAuthenticatedIdentity(
  request: NextRequest,
): Promise<PlayerIdentity | NextResponse> {
  if (!isFlimFlapSupabaseConfigured()) {
    return buildAuthError(
      503,
      "backend_unavailable",
      "FlimFlap Supabase backend is not configured on this server.",
    );
  }

  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return buildAuthError(401, "unauthorized", "Missing bearer token.");
  }

  const identity = await verifyFlimFlapAccessToken(accessToken);
  if (!identity) {
    return buildAuthError(401, "unauthorized", "Session is invalid or expired.");
  }

  return identity;
}

async function buildStubbedProgressResponse(
  request: NextRequest,
  mode: "stub" | "e2e",
): Promise<NextResponse<BackendPlayerPayload>> {
  const incomingState = await readProgressSyncRequest(request);
  const state = mergePlayerStates(buildDefaultPlayerState(), incomingState);
  return buildJson(toBackendPlayerPayload(DEV_STUB_IDENTITY, state), {
    headers: {
      "x-flimflap-backend-mode": mode,
    },
  });
}

async function handleBackendStatusRequest() {
  const mode = resolveLocalBackendMode();
  return buildJson({
    enabled: mode !== "proxy",
    mode,
    authRequired: mode === "supabase",
  });
}

async function handlePlayerStateGetRequest(request: NextRequest) {
  const mode = resolveLocalBackendMode();
  if (mode === "stub") {
    return buildJson(toBackendPlayerPayload(DEV_STUB_IDENTITY, buildDefaultPlayerState()), {
      headers: {
        "x-flimflap-backend-mode": isE2E() ? "e2e" : "stub",
      },
    });
  }

  const identity = await readAuthenticatedIdentity(request);
  if (identity instanceof NextResponse) {
    return identity;
  }

  const state = await loadFlimFlapPlayerState(identity.userId);
  return buildJson(toBackendPlayerPayload(identity, state), {
    headers: {
      "x-flimflap-backend-mode": "supabase",
    },
  });
}

async function handlePlayerStatePutRequest(request: NextRequest) {
  const mode = resolveLocalBackendMode();
  if (mode === "stub") {
    const incomingState = coercePlayerStateSyncRequest(await request.json().catch(() => null));
    const state = mergePlayerStates(buildDefaultPlayerState(), incomingState);
    return buildJson(toBackendPlayerPayload(DEV_STUB_IDENTITY, state), {
      headers: {
        "x-flimflap-backend-mode": isE2E() ? "e2e" : "stub",
      },
    });
  }

  const identity = await readAuthenticatedIdentity(request);
  if (identity instanceof NextResponse) {
    return identity;
  }

  const incomingState = coercePlayerStateSyncRequest(await request.json().catch(() => null));
  const state = await syncFlimFlapPlayerState(identity.userId, incomingState);
  return buildJson(toBackendPlayerPayload(identity, state), {
    headers: {
      "x-flimflap-backend-mode": "supabase",
    },
  });
}

async function handleProgressSyncRequest(request: NextRequest) {
  const mode = resolveLocalBackendMode();
  if (mode === "stub") {
    return buildStubbedProgressResponse(request, isE2E() ? "e2e" : "stub");
  }

  const identity = await readAuthenticatedIdentity(request);
  if (identity instanceof NextResponse) {
    return identity;
  }

  const incomingState = await readProgressSyncRequest(request);
  const state = await syncFlimFlapPlayerState(identity.userId, incomingState);
  return buildJson(toBackendPlayerPayload(identity, state), {
    headers: {
      "x-flimflap-backend-mode": "supabase",
    },
  });
}

async function forwardFlimFlapBackendRequest(request: NextRequest, pathname: string) {
  const backendOrigin = resolveFlimFlapBackendOrigin();
  const target = new URL(`${pathname}${request.nextUrl.search}`, backendOrigin);
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(target, {
    method,
    headers: buildProxyHeaders(request, backendOrigin),
    body,
    cache: "no-store",
    redirect: "manual",
  });

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("x-flimflap-backend-mode", "proxy");
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

async function handleLeaderboardRequest(request: NextRequest) {
  const mode = resolveLocalBackendMode();
  if (mode === "stub") {
    return buildJson(EMPTY_LEADERBOARD_RESPONSE, {
      headers: {
        "x-flimflap-backend-mode": isE2E() ? "e2e" : "stub",
      },
    });
  }

  return forwardFlimFlapBackendRequest(request, "/api/leaderboard");
}

function buildProxyHeaders(request: NextRequest, targetOrigin: string) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.delete("host");
  headers.set("origin", targetOrigin);
  headers.set("referer", targetOrigin);
  return headers;
}

export function resolveFlimFlapBackendOrigin(): string {
  return (
    asOrigin(process.env.FLIMFLAP_BACKEND_URL) ??
    asOrigin(process.env.TRUMPYBIRD_BACKEND_URL) ??
    (process.env.NODE_ENV === "production" ? PROD_BACKEND_ORIGIN : DEV_BACKEND_ORIGIN)
  );
}

export function isFlimFlapBackendApiPath(pathname: string): boolean {
  return (
    pathname === "/api/backend/status" ||
    pathname === "/api/broadcast" ||
    pathname === "/api/leaderboard" ||
    pathname === "/api/me" ||
    pathname === "/api/player-state" ||
    pathname.startsWith("/api/progress/")
  );
}

export function buildFlimFlapRuntimeScript(runtimeConfig: {
  colyseusUrl: string | null;
  hostUrl: string | null;
}): string {
  const backendOrigin = resolveFlimFlapBackendOrigin();
  const serializedConfig = JSON.stringify(runtimeConfig).replace(/</g, "\\u003c");

  return `
    (() => {
      const backendOrigin = ${JSON.stringify(backendOrigin)};
      const currentOrigin = window.location.origin;
      const nativeFetch = window.fetch.bind(window);
      const shouldProxyPath = (pathname) =>
        pathname === "/api/backend/status" ||
        pathname === "/api/broadcast" ||
        pathname === "/api/leaderboard" ||
        pathname === "/api/me" ||
        pathname === "/api/player-state" ||
        pathname.startsWith("/api/progress/");
      const rewriteUrl = (value) => {
        try {
          const parsed = new URL(value, currentOrigin);
          if (parsed.origin !== backendOrigin || !shouldProxyPath(parsed.pathname)) {
            return null;
          }
          return currentOrigin + parsed.pathname + parsed.search;
        } catch {
          return null;
        }
      };

      window.__FLIMFLAM_RUNTIME_CONFIG__ = ${serializedConfig};
      window.__FLIMFLAP_BACKEND_URL__ = backendOrigin;
      window.__TRUMPYBIRD_BACKEND_URL__ = backendOrigin;

      window.fetch = (input, init) => {
        if (typeof input === "string" || input instanceof URL) {
          return nativeFetch(rewriteUrl(String(input)) ?? input, init);
        }

        if (input instanceof Request) {
          const rewritten = rewriteUrl(input.url);
          if (!rewritten) {
            return nativeFetch(input, init);
          }

          if (init) {
            return nativeFetch(rewritten, init);
          }

          return nativeFetch(new Request(rewritten, input));
        }

        return nativeFetch(input, init);
      };
    })();
  `;
}

export async function proxyFlimFlapBackendRequest(request: NextRequest, pathname: string) {
  if (pathname === "/api/backend/status") {
    return handleBackendStatusRequest();
  }

  if (pathname === "/api/leaderboard") {
    return handleLeaderboardRequest(request);
  }

  if (pathname === "/api/me") {
    return handlePlayerStateGetRequest(request);
  }

  if (pathname === "/api/player-state") {
    return request.method.toUpperCase() === "PUT"
      ? handlePlayerStatePutRequest(request)
      : handlePlayerStateGetRequest(request);
  }

  if (pathname === "/api/progress/sync-local") {
    return handleProgressSyncRequest(request);
  }

  if (isE2E() && pathname === "/api/broadcast") {
    return buildJson(
      { ok: true },
      {
        headers: {
          "x-flimflap-backend-mode": "e2e",
        },
      },
    );
  }

  return forwardFlimFlapBackendRequest(request, pathname);
}
