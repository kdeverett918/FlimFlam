"use client";

import { Client } from "colyseus.js";

const COLYSEUS_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567")
    : "ws://localhost:2567";

let clientInstance: Client | null = null;

export function getColyseusClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(COLYSEUS_URL);
  }
  return clientInstance;
}

export function resetColyseusClient(): void {
  clientInstance = null;
}
