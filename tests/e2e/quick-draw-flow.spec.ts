import { expect, test } from "@playwright/test";

import { createRoom, waitForColyseusHealthy } from "./e2e-helpers";

const DEFAULT_HEALTH_URL = "http://127.0.0.1:3567/health";

function getServerBaseUrl(): string {
  return (process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? DEFAULT_HEALTH_URL).replace(
    /\/health$/,
    "",
  );
}

test.describe("Backend API", () => {
  test("health endpoint returns operational metadata", async ({ page }) => {
    await waitForColyseusHealthy(page);

    const res = await page.request.get(
      process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? DEFAULT_HEALTH_URL,
    );
    expect(res.status()).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("number");
    expect(typeof body.maxNameLength).toBe("number");
  });

  test("games manifest endpoint matches active game registry", async ({ page }) => {
    await waitForColyseusHealthy(page);

    const res = await page.request.get(`${getServerBaseUrl()}/api/games`);
    expect(res.status()).toBe(200);

    const games = (await res.json()) as Array<{ id: string }>;
    expect(games.map((g) => g.id).sort()).toEqual(["brain-board", "lucky-letters", "survey-smash"]);
  });

  test("room resolve endpoint enforces validation and resolves active rooms", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    const base = getServerBaseUrl();

    const invalid = await page.request.post(`${base}/api/rooms/resolve`, {
      data: { code: "!!??" },
    });
    expect(invalid.status()).toBe(400);

    const notFound = await page.request.post(`${base}/api/rooms/resolve`, {
      data: { code: "ZZZZ" },
    });
    expect(notFound.status()).toBe(404);

    const { code } = await createRoom(page);
    const ok = await page.request.post(`${base}/api/rooms/resolve`, { data: { code } });
    expect(ok.status()).toBe(200);

    const body = (await ok.json()) as { roomId?: string };
    expect(typeof body.roomId).toBe("string");
    expect((body.roomId ?? "").length).toBeGreaterThan(0);
  });
});
