import { expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test("controller reconnects after refresh", async ({ page, browser }) => {
  await page.goto("/");

  await waitForColyseusHealthy(page);
  const { code } = await createRoom(page);

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });

  await c1.controllerPage.reload();

  // After reload, the room hook should reconnect using sessionStorage token.
  await expect(c1.controllerPage).toHaveURL(/\/play$/);
  await expect(c1.controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(c1.controllerPage).toHaveURL(/\/play$/);
  await expect(page.getByText("Alice")).toBeVisible({ timeout: 30_000 });

  await c1.context.close();
});
