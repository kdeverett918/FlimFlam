import { expect, test } from "@playwright/test";

import {
  createRoom,
  findLuckyLettersTurnActor,
  joinPlayerForRoom,
  skipToPhase,
  waitForColyseusHealthy,
} from "./e2e-helpers";

test("lucky letters starts and shows round-intro on host and controllers", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);

  const c1 = await joinPlayerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinPlayerForRoom(browser, page, { code, name: "Bob" });

  // Select Lucky Letters + Kids difficulty and start.
  await page.getByRole("button", { name: /lucky letters/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Host should show "ROUND 1" on the round-intro screen.
  await skipToPhase(page, /choose your categories/i);
  await page.getByRole("button", { name: /^skip$/i }).click();

  // Both controllers should show "Round 1 of 3" in the round-intro card.
  await expect(c1.controllerPage.getByText(/Round 1 of 3/i)).toBeVisible({ timeout: 15_000 });
  await expect(c2.controllerPage.getByText(/Round 1 of 3/i)).toBeVisible({ timeout: 15_000 });

  // Both controllers should show the "Get ready!" text.
  await expect(c1.controllerPage.getByText("Get ready!")).toBeVisible();
  await expect(c2.controllerPage.getByText("Get ready!")).toBeVisible();

  // Both controllers should display the Lucky Letters game badge.
  await expect(c1.controllerPage.getByText("Lucky Letters")).toBeVisible();
  await expect(c2.controllerPage.getByText("Lucky Letters")).toBeVisible();

  await c1.context.close();
  await c2.context.close();
});

test("lucky letters spin and consonant guess flow", async ({ page, browser }) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);

  const c1 = await joinPlayerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinPlayerForRoom(browser, page, { code, name: "Bob" });

  // Select Lucky Letters + Kids difficulty and start.
  await page.getByRole("button", { name: /lucky letters/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Wait for round-intro to appear on host.
  await skipToPhase(page, /choose your categories/i);

  // Skip round-intro to advance to spinning.
  const skipBtn = page.getByRole("button", { name: /^skip$/i });
  await skipBtn.click();

  const { activePage, watchingPage, activeName } = await findLuckyLettersTurnActor(
    page,
    [c1.controllerPage, c2.controllerPage],
    ["Alice", "Bob"],
  );

  // Active player should see the spin button.
  const spinBtn = activePage.getByRole("button", { name: /spin the wheel/i });
  await expect(spinBtn).toBeVisible({ timeout: 15_000 });

  // Watching player should see "[Name]'s turn".
  await expect(watchingPage.getByText(new RegExp(`${activeName}.s turn`, "i"))).toBeVisible({
    timeout: 15_000,
  });

  // Active player spins the wheel.
  await spinBtn.click();

  // Host should show the spinning wheel animation and then the result.
  // After the spin animation (~3.5s), the phase advances.
  // We wait for either "Pick a consonant!" (cash/wild result) or a turn change.
  const hostConsonantPrompt = page.getByText("Pick a consonant!");
  const hostSpinPhase = page.getByText("Spin the Wheel!"); // Phase label on host

  // Wait for the spin to resolve — either we get consonant picking or the turn moves
  // (bust/pass). Both are valid outcomes.
  await expect(hostConsonantPrompt.or(hostSpinPhase)).toBeVisible({ timeout: 15_000 });

  // If the active player got to guess a consonant, pick one.
  const letterPicker = activePage.getByText("Pick a consonant");
  const hasLetterPicker = await letterPicker.isVisible().catch(() => false);

  if (hasLetterPicker) {
    // Pick the letter "T" (common consonant, likely in most puzzles).
    const letterT = activePage.getByRole("button", { name: "Letter T" });
    await expect(letterT).toBeVisible();
    await letterT.click();

    // After picking, the host should show the letter result.
    // Either "X times!" (found) or "Not in the puzzle!" (not found).
    await expect(page.getByText(/times?!/i).or(page.getByText("Not in the puzzle!"))).toBeVisible({
      timeout: 15_000,
    });
  }

  // End the game via host button.
  const endBtn = page.getByRole("button", { name: /^end$/i });
  await endBtn.click();

  // Both controllers should return to lobby ("You're in!" screen).
  await expect(c1.controllerPage.getByText("You're in!")).toBeVisible({ timeout: 30_000 });
  await expect(c2.controllerPage.getByText("You're in!")).toBeVisible({ timeout: 30_000 });

  await c1.context.close();
  await c2.context.close();
});

test("lucky letters controller shows puzzle board during gameplay", async ({ page, browser }) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);

  const c1 = await joinPlayerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinPlayerForRoom(browser, page, { code, name: "Bob" });

  // Select Lucky Letters + Kids difficulty and start.
  await page.getByRole("button", { name: /lucky letters/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Wait for round-intro then skip to spinning.
  await skipToPhase(page, /choose your categories/i);
  await page.getByRole("button", { name: /^skip$/i }).click();

  for (const controllerPage of [c1.controllerPage, c2.controllerPage]) {
    await expect(controllerPage.getByText("0%")).toBeVisible({ timeout: 15_000 });
  }

  const { activePage } = await findLuckyLettersTurnActor(
    page,
    [c1.controllerPage, c2.controllerPage],
    ["Alice", "Bob"],
  );
  await expect(activePage.getByRole("button", { name: /solve/i })).toBeVisible();

  await c1.context.close();
  await c2.context.close();
});
