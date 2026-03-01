"use client";

import { Client } from "colyseus.js";

function resolveColyseusUrl(): string {
  const url = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_COLYSEUS_URL : undefined;
  const allowLocalhost =
    process.env.PARTYLINE_E2E === "1" || process.env.PARTYLINE_ALLOW_LOCALHOST_COLYSEUS === "1";

  if (process.env.NODE_ENV === "production") {
    if (!url || /localhost|127\.0\.0\.1/.test(url)) {
      if (allowLocalhost) return url ?? "ws://localhost:2567";
      throw new Error(
        "Missing NEXT_PUBLIC_COLYSEUS_URL for production build. Refusing to fall back to localhost.",
      );
    }
  }

  return url ?? "ws://localhost:2567";
}

let clientInstance: Client | null = null;

export function getColyseusClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(resolveColyseusUrl());
  }
  return clientInstance;
}

export function resetColyseusClient(): void {
  clientInstance = null;
}
