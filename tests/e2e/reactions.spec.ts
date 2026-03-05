import { expect, test } from "@playwright/test";

import { createRoom, joinPlayerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test.describe("Emoji Reaction System", () => {
  test("player sends reaction and it appears on host", async ({ page, browser }) => {
    await page.goto("/");

    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const { context, controllerPage } = await joinPlayerForRoom(browser, page, {
      code,
      name: "ReactionTester",
    });

    // Verify reaction bar is visible on controller (emoji buttons at bottom).
    const reactionButtons = controllerPage.locator('button[aria-label^="React with"]');
    await expect(reactionButtons.first()).toBeVisible({ timeout: 10_000 });

    // Count that all 8 emoji buttons are rendered.
    await expect(reactionButtons).toHaveCount(8);

    // Click a reaction emoji (fire emoji).
    const fireButton = controllerPage.getByRole("button", { name: /react with 🔥/i });
    await fireButton.click();

    // Verify the reaction overlay appears on the host screen.
    // The ReactionOverlay renders floating emojis with the emoji text and player name.
    const reactionEmoji = page.locator("text=🔥");
    await expect(reactionEmoji).toBeVisible({ timeout: 5_000 });

    // Verify the player name shows with the reaction.
    const playerLabel = page.locator("text=ReactionTester");
    // There may be multiple "ReactionTester" on screen (player list + reaction),
    // just verify at least one is visible in the reaction overlay area.
    await expect(playerLabel.first()).toBeVisible();

    await context.close();
  });

  test("reaction cooldown suppresses rapid clicks", async ({ page, browser }) => {
    await page.goto("/");

    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const { context, controllerPage } = await joinPlayerForRoom(browser, page, {
      code,
      name: "CooldownTest",
    });

    // Click a reaction.
    const laughButton = controllerPage.getByRole("button", { name: /react with 😂/i });
    await laughButton.click();

    // After clicking, reaction buttons should be disabled (cooldown active).
    const reactionButtons = controllerPage.locator('button[aria-label^="React with"]');
    const firstButton = reactionButtons.first();
    await expect(firstButton).toBeDisabled();

    // Wait for cooldown to expire (2 seconds) plus a small buffer.
    await controllerPage.waitForTimeout(2200);

    // After cooldown, buttons should be enabled again.
    await expect(firstButton).toBeEnabled();

    await context.close();
  });
});
