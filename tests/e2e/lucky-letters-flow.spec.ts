import { type Page, expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

/**
 * Find which of two controller pages has the spin button visible.
 * Returns the active controller page and the watching controller page.
 */
async function findActivePlayer(
  c1Page: Page,
  c2Page: Page,
  c1Name: string,
  c2Name: string,
): Promise<{ activePage: Page; watchingPage: Page; activeName: string; watchingName: string }> {
  // Wait for spinning phase to propagate to controllers
  const spinLabel = /spin the wheel/i;

  // Check both controllers — one should have the spin button
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const c1Visible = await c1Page
      .getByRole("button", { name: spinLabel })
      .isVisible()
      .catch(() => false);
    if (c1Visible) {
      return { activePage: c1Page, watchingPage: c2Page, activeName: c1Name, watchingName: c2Name };
    }
    const c2Visible = await c2Page
      .getByRole("button", { name: spinLabel })
      .isVisible()
      .catch(() => false);
    if (c2Visible) {
      return { activePage: c2Page, watchingPage: c1Page, activeName: c2Name, watchingName: c1Name };
    }
    await c1Page.waitForTimeout(200);
  }

  throw new Error("Neither controller showed the spin button within 15s");
}

test("lucky letters starts and shows round-intro on host and controllers", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await waitForColyseusHealthy(page);

  const { code } = await createRoom(page);

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });

  // Select Lucky Letters + Kids difficulty and start.
  await page.getByRole("button", { name: /lucky letters/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Host should show "ROUND 1" on the round-intro screen.
  await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });

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

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });

  // Select Lucky Letters + Kids difficulty and start.
  await page.getByRole("button", { name: /lucky letters/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Wait for round-intro to appear on host.
  await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });

  // Skip round-intro to advance to spinning.
  const skipBtn = page.getByRole("button", { name: /^skip$/i });
  await skipBtn.click();

  // Find which controller is the active player (has the spin button).
  const { activePage, watchingPage, activeName } = await findActivePlayer(
    c1.controllerPage,
    c2.controllerPage,
    "Alice",
    "Bob",
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

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });

  // Select Lucky Letters + Kids difficulty and start.
  await page.getByRole("button", { name: /lucky letters/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Wait for round-intro then skip to spinning.
  await expect(page.getByText("ROUND 1")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^skip$/i }).click();

  // Find the active player.
  const { activePage, watchingPage } = await findActivePlayer(
    c1.controllerPage,
    c2.controllerPage,
    "Alice",
    "Bob",
  );

  // Both controllers should show the puzzle category (from MobilePuzzleBoard).
  // The category is displayed as a pill badge on the puzzle board.
  // Kids puzzles use categories like "Thing", "Food & Drink", etc.
  // At least the active player's controller should show the puzzle board.
  // We check for the progress bar percentage indicator (part of MobilePuzzleBoard).
  await expect(activePage.getByText("0%")).toBeVisible({ timeout: 15_000 });

  // The watching player should also see the puzzle board.
  await expect(watchingPage.getByText("0%")).toBeVisible({ timeout: 15_000 });

  // Active player should also see "Solve" button and optionally "Buy a Vowel" button.
  await expect(activePage.getByRole("button", { name: /solve/i })).toBeVisible();

  await c1.context.close();
  await c2.context.close();
});
