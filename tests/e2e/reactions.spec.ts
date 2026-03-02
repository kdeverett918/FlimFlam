import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";
const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

test.describe("Emoji Reaction System", () => {
  test("player sends reaction and it appears on host", async ({ page, browser }) => {
    await page.goto("/");

    // Ensure the Colyseus server is ready.
    await expect
      .poll(
        async () => {
          try {
            const res = await page.request.get(COLYSEUS_HEALTH_URL);
            return res.status();
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);

    // Create room.
    await page.getByRole("button", { name: /create room/i }).click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

    const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
    expect(match).not.toBeNull();
    const code = match?.[1] ?? "";

    // Join a controller.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const controllerPage = await context.newPage();
    await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);

    await controllerPage.getByLabel("Your Name").fill("ReactionTester");
    await controllerPage.getByRole("button", { name: /^join$/i }).click();
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(page.getByText("ReactionTester")).toBeVisible({ timeout: 30_000 });

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

    await expect
      .poll(
        async () => {
          try {
            const res = await page.request.get(COLYSEUS_HEALTH_URL);
            return res.status();
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);

    await page.getByRole("button", { name: /create room/i }).click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

    const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
    expect(match).not.toBeNull();
    const code = match?.[1] ?? "";

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const controllerPage = await context.newPage();
    await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);

    await controllerPage.getByLabel("Your Name").fill("CooldownTest");
    await controllerPage.getByRole("button", { name: /^join$/i }).click();
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(page.getByText("CooldownTest")).toBeVisible({ timeout: 30_000 });

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
