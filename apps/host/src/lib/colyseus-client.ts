"use client";

import {
  resolveNextPublicColyseusHttpUrl,
  resolveNextPublicColyseusWsUrl,
} from "@partyline/shared";
import { Client } from "colyseus.js";

export const resolveColyseusWsUrl = resolveNextPublicColyseusWsUrl;
export const resolveColyseusHttpUrl = resolveNextPublicColyseusHttpUrl;

let clientInstance: Client | null = null;

export function getColyseusClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(resolveColyseusWsUrl());
  }
  return clientInstance;
}

export function resetColyseusClient(): void {
  clientInstance = null;
}
