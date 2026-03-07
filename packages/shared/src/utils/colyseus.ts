export interface RuntimePublicConfig {
  colyseusUrl?: string;
  hostUrl?: string;
}

declare global {
  interface Window {
    __FLIMFLAM_RUNTIME_CONFIG__?: Partial<RuntimePublicConfig> | undefined;
  }
}

export function readRuntimePublicConfig(): RuntimePublicConfig {
  if (typeof window === "undefined") return {};

  const config = window.__FLIMFLAM_RUNTIME_CONFIG__;
  if (!config || typeof config !== "object") return {};

  return {
    colyseusUrl: typeof config.colyseusUrl === "string" ? config.colyseusUrl : undefined,
    hostUrl: typeof config.hostUrl === "string" ? config.hostUrl : undefined,
  };
}

export function resolveColyseusWsUrlFromEnv(opts: {
  envUrl?: string;
  nodeEnv?: string;
  hostname?: string;
}): string {
  const url = opts.envUrl;
  const nodeEnv = opts.nodeEnv ?? "development";
  const isLocalBrowserOrigin = opts.hostname === "localhost" || opts.hostname === "127.0.0.1";

  if (nodeEnv === "production") {
    if (!url || /localhost|127\.0\.0\.1/.test(url)) {
      // Allow local e2e / local "production build" runs (where the frontend itself
      // is served from localhost), but fail hard for real deployments.
      if (isLocalBrowserOrigin) return url ?? "ws://localhost:2567";
      throw new Error(
        "Missing NEXT_PUBLIC_COLYSEUS_URL for production build. Refusing to fall back to localhost.",
      );
    }
  }

  return url ?? "ws://localhost:2567";
}

export function resolveNextPublicColyseusWsUrl(): string {
  const runtimeConfig = readRuntimePublicConfig();
  const url =
    typeof window !== "undefined"
      ? (runtimeConfig.colyseusUrl ?? process.env.NEXT_PUBLIC_COLYSEUS_URL)
      : undefined;
  const hostname = typeof window !== "undefined" ? window.location.hostname : undefined;

  return resolveColyseusWsUrlFromEnv({
    envUrl: url,
    nodeEnv: process.env.NODE_ENV,
    hostname,
  });
}

export function wsUrlToHttpUrl(wsUrl: string): string {
  if (wsUrl.startsWith("wss://")) return `https://${wsUrl.slice("wss://".length)}`;
  if (wsUrl.startsWith("ws://")) return `http://${wsUrl.slice("ws://".length)}`;
  if (wsUrl.startsWith("https://") || wsUrl.startsWith("http://")) return wsUrl;
  return wsUrl;
}

export function resolveNextPublicColyseusHttpUrl(): string {
  return wsUrlToHttpUrl(resolveNextPublicColyseusWsUrl());
}

export function resolveNextPublicHostUrl(): string {
  const runtimeConfig = readRuntimePublicConfig();

  if (runtimeConfig.hostUrl) return runtimeConfig.hostUrl;

  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_HOST_URL) return process.env.NEXT_PUBLIC_HOST_URL;
    if (window.location?.origin) return window.location.origin;
  }

  if (process.env.NEXT_PUBLIC_HOST_URL) return process.env.NEXT_PUBLIC_HOST_URL;
  return process.env.NODE_ENV === "production" ? "https://flimflam.gg" : "http://localhost:3000";
}

export type ResolveRoomIdResult =
  | { ok: true; roomId: string }
  | {
      ok: false;
      error:
        | "invalid_code"
        | "not_found"
        | "rate_limited"
        | "server_error"
        | "bad_response"
        | "network_error";
      status?: number;
    };

export async function resolveRoomIdByCode(
  httpBaseUrl: string,
  code: string,
): Promise<ResolveRoomIdResult> {
  try {
    const res = await fetch(`${httpBaseUrl}/api/rooms/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (res.status === 400) return { ok: false, error: "invalid_code", status: res.status };
    if (res.status === 404) return { ok: false, error: "not_found", status: res.status };
    if (res.status === 429) return { ok: false, error: "rate_limited", status: res.status };
    if (!res.ok) return { ok: false, error: "server_error", status: res.status };

    const data = (await res.json()) as { roomId?: unknown } | null;
    if (!data || typeof data.roomId !== "string" || !data.roomId.trim()) {
      return { ok: false, error: "bad_response", status: res.status };
    }

    return { ok: true, roomId: data.roomId };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
