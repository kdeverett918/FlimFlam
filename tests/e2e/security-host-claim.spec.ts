import { expect, test } from "@playwright/test";
import { Client } from "colyseus.js";

function inferColyseusWsUrl(): string {
  const healthUrl = process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://localhost:3567/health";
  const wsBase = healthUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")
    .replace(/\/health$/, "");
  return wsBase;
}

test("host cannot be hijacked without server-issued token", async () => {
  const wsUrl = inferColyseusWsUrl();

  const hostClient = new Client(wsUrl);
  const hostRoom = await hostClient.create("party", { isHost: true, name: "Host" });

  const attackerClient = new Client(wsUrl);

  await expect(
    attackerClient.joinById(hostRoom.roomId, { isHost: true, name: "Evil" }),
  ).rejects.toThrow(/Host already assigned/i);

  hostRoom.leave(true);
});
