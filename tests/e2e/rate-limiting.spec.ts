import { expect, test } from "@playwright/test";

import { COLYSEUS_HEALTH_URL, waitForColyseusHealthy } from "./e2e-helpers";

const RESOLVE_URL = `${COLYSEUS_HEALTH_URL.replace("/health", "")}/api/rooms/resolve`;

test.describe("Rate Limiting", () => {
  test("resolve endpoint returns 429 after exceeding 60 requests/minute", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    // Fire 70 rapid requests to the resolve endpoint.
    // The limit is 60/min per IP, so requests 61+ should get 429.
    const results = await page.evaluate(async (url: string) => {
      const statuses: number[] = [];
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 70; i++) {
        promises.push(
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: "ZZZZ" }),
          })
            .then((res) => {
              statuses.push(res.status);
            })
            .catch(() => {
              statuses.push(0);
            }),
        );
      }

      await Promise.all(promises);
      return statuses;
    }, RESOLVE_URL);

    // We should have some 429s in the results
    const count429 = results.filter((s) => s === 429).length;
    expect(count429).toBeGreaterThan(0);

    // The first batch should succeed (404 since ZZZZ doesn't exist)
    const count404 = results.filter((s) => s === 404).length;
    expect(count404).toBeGreaterThan(0);
    expect(count404).toBeLessThanOrEqual(60);
  });
});
