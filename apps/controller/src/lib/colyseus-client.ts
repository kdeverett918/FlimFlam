import { Client } from "colyseus.js";

let clientInstance: Client | null = null;

export function getColyseusClient(): Client {
  if (clientInstance) {
    return clientInstance;
  }

  const url =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_COLYSEUS_URL
      ? process.env.NEXT_PUBLIC_COLYSEUS_URL
      : "ws://localhost:2567";

  clientInstance = new Client(url);
  return clientInstance;
}
