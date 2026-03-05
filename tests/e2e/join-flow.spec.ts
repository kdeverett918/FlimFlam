import { expect, test } from "@playwright/test";

import { createRoom, joinPlayerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test("host creates room and players join", async ({ page, browser }) => {
  await page.goto("/");

  await waitForColyseusHealthy(page);
  const { code } = await createRoom(page);

  // Production safety: host must persist the server-issued host token to prevent
  // host takeover / reclaim issues. This should be set shortly after join.
  await expect
    .poll(
      async () =>
        await page.evaluate(
          () => (sessionStorage.getItem("flimflam_reconnect_token") ?? "").length,
        ),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);

  const c1 = await joinPlayerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinPlayerForRoom(browser, page, { code, name: "Bob" });
  const c3 = await joinPlayerForRoom(browser, page, { code, name: "Casey" });

  await expect(page.getByText("Alice")).toBeVisible();
  await expect(page.getByText("Bob")).toBeVisible();
  await expect(page.getByText("Casey")).toBeVisible();

  await expect(page.getByText(/\b3\s*\/\s*8\b/)).toBeVisible();

  await c1.context.close();
  await c2.context.close();
  await c3.context.close();
});
