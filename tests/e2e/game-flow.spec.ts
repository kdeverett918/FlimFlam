import { expect, test } from "@playwright/test";

import {
  autoplayHotTakeController,
  createRoom,
  joinControllerForRoom,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test("hot take game completes end-to-end", async ({ page, browser }) => {
  await page.goto("/");

  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });
  const c3 = await joinControllerForRoom(browser, page, { code, name: "Casey" });

  // Select game and set difficulty.
  await page.getByRole("button", { name: /hot take/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  let gameOver = false;

  const controllerRuns = Promise.all([
    autoplayHotTakeController(c1.controllerPage, {
      isGameOver: () => gameOver,
      topic: "remote work etiquette",
    }),
    autoplayHotTakeController(c2.controllerPage, {
      isGameOver: () => gameOver,
      topic: "remote work etiquette",
    }),
    autoplayHotTakeController(c3.controllerPage, {
      isGameOver: () => gameOver,
      topic: "remote work etiquette",
    }),
  ]);

  // Results view may be brief with timer scaling, so wait for it to appear at least once.
  await page.waitForFunction(() => document.body.innerText.includes("THE RESULTS"), null, {
    timeout: 30_000,
  });

  await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
    timeout: 60_000,
  });
  gameOver = true;

  const [votes1, votes2, votes3] = await controllerRuns;
  expect(votes1).toBeGreaterThan(0);
  expect(votes2).toBeGreaterThan(0);
  expect(votes3).toBeGreaterThan(0);

  await expect(page.getByRole("heading", { name: /^FINAL SCORES$/ })).toBeVisible();
  await expect(page.getByText("Alice")).toBeVisible();
  await expect(page.getByText("Bob")).toBeVisible();
  await expect(page.getByText("Casey")).toBeVisible();

  await c1.context.close();
  await c2.context.close();
  await c3.context.close();
});
