import { expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test("host reconnects after refresh", async ({ page, browser }) => {
  await page.goto("/");

  await waitForColyseusHealthy(page);
  const { code } = await createRoom(page);

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });
  const c3 = await joinControllerForRoom(browser, page, { code, name: "Casey" });

  await page.reload();

  // After reload, the host hook should reconnect using the stored reconnection token.
  await expect(page.getByText("Alice", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Bob", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Casey", { exact: true })).toBeVisible({ timeout: 60_000 });

  await c1.context.close();
  await c2.context.close();
  await c3.context.close();
});
