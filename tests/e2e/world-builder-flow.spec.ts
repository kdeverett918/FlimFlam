import { expect, test } from "@playwright/test";

import {
  createRoom,
  joinPlayerForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test("lobby enforces minimum players and starts selected game cleanly", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);

  const startButton = page.getByRole("button", { name: /waiting for players|start game/i });
  await expect(startButton).toBeDisabled();
  await expect(page.getByText(/min 2 players/i)).toBeVisible();

  await page.getByRole("button", { name: /^Brain Board$/i }).click();
  await expect(page.getByRole("button", { name: /^Brain Board$/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const p1 = await joinPlayerForRoom(browser, page, { code, name: "Solo" });
  await expect(startButton).toBeDisabled();

  const p2 = await joinPlayerForRoom(browser, page, { code, name: "Duo" });
  await expect(startButton).toBeEnabled({ timeout: 15_000 });

  await selectGameAndStart(page, { gameName: "Lucky Letters", complexity: "kids" });
  await expect(page.getByText(/round 1/i)).toBeVisible({ timeout: 20_000 });
  await expect(p1.controllerPage.getByText(/Lucky Letters/i)).toBeVisible({ timeout: 20_000 });
  await expect(p2.controllerPage.getByText(/Lucky Letters/i)).toBeVisible({ timeout: 20_000 });

  await p1.context.close();
  await p2.context.close();
});
