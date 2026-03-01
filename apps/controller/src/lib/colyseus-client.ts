import {
  resolveNextPublicColyseusHttpUrl,
  resolveNextPublicColyseusWsUrl,
} from "@partyline/shared";
import { Client } from "colyseus.js";

let clientInstance: Client | null = null;

export const resolveColyseusWsUrl = resolveNextPublicColyseusWsUrl;
export const resolveColyseusHttpUrl = resolveNextPublicColyseusHttpUrl;

export function getColyseusClient(): Client {
  if (clientInstance) {
    return clientInstance;
  }

  clientInstance = new Client(resolveColyseusWsUrl());
  return clientInstance;
}
