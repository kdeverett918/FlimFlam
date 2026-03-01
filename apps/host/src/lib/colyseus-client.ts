"use client";

import { Client } from "colyseus.js";

function resolveColyseusUrl(): string {
  const url = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_COLYSEUS_URL : undefined;

  if (process.env.NODE_ENV === "production") {
    if (!url || /localhost|127\.0\.0\.1/.test(url)) {
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
