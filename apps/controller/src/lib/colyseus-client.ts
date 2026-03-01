import { Client } from "colyseus.js";

let clientInstance: Client | null = null;

function resolveColyseusUrl(): string {
  const url = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_COLYSEUS_URL : undefined;
  const isLocalBrowserOrigin =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (process.env.NODE_ENV === "production") {
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

export function getColyseusClient(): Client {
  if (clientInstance) {
    return clientInstance;
  }

  clientInstance = new Client(resolveColyseusUrl());
  return clientInstance;
}
