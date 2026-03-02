import { expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test("world builder game completes end-to-end", async ({ page, browser }) => {
  await page.goto("/");

  await waitForColyseusHealthy(page);
  const { code } = await createRoom(page);

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });
  const c3 = await joinControllerForRoom(browser, page, { code, name: "Casey" });

  // Select game and set difficulty.
  await page.getByRole("button", { name: /world builder/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  const skipButton = page.getByRole("button", { name: /^skip$/i });

  const readyUp = async (controllerPage: typeof c1.controllerPage) => {
    // World Builder has a role reveal "Ready" button; if it appears, click it to skip the timer.
    const readyButton = controllerPage.getByRole("button", { name: /^ready$/i });
    await readyButton.click({ timeout: 20_000 }).catch(() => {});
  };

  await Promise.all([
    readyUp(c1.controllerPage),
    readyUp(c2.controllerPage),
    readyUp(c3.controllerPage),
  ]);

  // Wait until the first action-input phase appears on host.
  await page.waitForFunction(() => document.body.innerText.includes("PLAYERS ARE DECIDING"), null, {
    timeout: 60_000,
  });

  const submitAction = async (controllerPage: typeof c1.controllerPage, text: string) => {
    const input = controllerPage.getByPlaceholder("Describe your action...");
    const submitButton = controllerPage.getByRole("button", { name: /^submit$/i });
    await input.waitFor({ timeout: 20_000 });
    await submitButton.waitFor({ timeout: 20_000 });
    await input.fill(text);
    await submitButton.click();
    await expect(controllerPage.getByText(/submitted!/i)).toBeVisible();
  };

  // Play 3 rounds (kids mode).
  for (let round = 1; round <= 3; round++) {
    const gameAlreadyComplete = await page.evaluate(() =>
      document.body.innerText.includes("FINAL SCORES"),
    );
    if (gameAlreadyComplete) break;

    // The host "Skip" button (and fast timers in CI) can advance the game all the way into end-game
    // phases before this loop gets to the next round. Treat those as terminal states instead of
    // hanging forever waiting for the action-input screen.
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes("PLAYERS ARE DECIDING") ||
          text.includes("THE REVEAL") ||
          text.includes("FINAL SCORES")
        );
      },
      null,
      { timeout: 60_000 },
    );

    const shouldStop = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("THE REVEAL") || text.includes("FINAL SCORES");
    });
    if (shouldStop) break;

    await Promise.all([
      submitAction(c1.controllerPage, `Alice action ${round}`),
      submitAction(c2.controllerPage, `Bob action ${round}`),
      submitAction(c3.controllerPage, `Casey action ${round}`),
    ]);

    // Fast-forward narration + reveal timers so the test doesn't depend on real-time delays.
    await page.waitForFunction(
      () => !document.body.innerText.includes("PLAYERS ARE DECIDING"),
      null,
      { timeout: 20_000 },
    );

    if (round < 3) {
      const start = Date.now();
      while (Date.now() - start < 20_000) {
        if (await page.evaluate(() => document.body.innerText.includes("PLAYERS ARE DECIDING")))
          break;
        await skipButton.click();
        await page.waitForTimeout(250);
      }
    }
  }

  // Skip the final reveal into final scores.
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    if (await page.evaluate(() => document.body.innerText.includes("FINAL SCORES"))) break;
    await skipButton.click();
    await page.waitForTimeout(250);
  }

  await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: /^FINAL SCORES$/ })).toBeVisible();
  await expect(page.getByText("Alice")).toBeVisible();
  await expect(page.getByText("Bob")).toBeVisible();
  await expect(page.getByText("Casey")).toBeVisible();

  await c1.context.close();
  await c2.context.close();
  await c3.context.close();
});
