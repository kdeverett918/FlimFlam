import { expect, test } from "@playwright/test";

import {
  createRoom,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test("host reconnects after refresh and retains control privileges", async ({ page, browser }) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);
  const controllers = await joinControllersForRoom(browser, page, code, ["Alice", "Bob", "Casey"]);

  await page.reload();

  await expect(page.getByText("Alice", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Bob", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Casey", { exact: true })).toBeVisible({ timeout: 60_000 });

  await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "kids" });
  await expect(page.getByRole("button", { name: /^skip$/i })).toBeVisible({ timeout: 30_000 });

  for (const controller of controllers) {
    await controller.context.close();
  }
});
