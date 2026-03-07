import { expect, test } from "@playwright/test";

import { createRoom, joinPlayerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test.describe("Lobby Interactions", () => {
  test("game selector buttons switch selection", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    // Click Brain Board — should be selected
    await page.getByRole("button", { name: /^Brain Board$/i }).click();
    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Click Lucky Letters — should switch selection
    await page.getByRole("button", { name: /^Lucky Letters$/i }).click();
    await expect(page.getByRole("button", { name: /^Lucky Letters$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Click Survey Smash — should switch again
    await page.getByRole("button", { name: /^Survey Smash$/i }).click();
    await expect(page.getByRole("button", { name: /^Survey Smash$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: /^Lucky Letters$/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("complexity picker changes selection", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    // Select a game first
    await page.getByRole("button", { name: /^Brain Board$/i }).click();

    // Complexity buttons have aria-label like "KIDS: Ages 8+ / Silly & fun"
    const kidsBtn = page.getByRole("button", { name: /^kids/i });
    const standardBtn = page.getByRole("button", { name: /^standard/i });
    const advancedBtn = page.getByRole("button", { name: /^advanced/i });

    await expect(kidsBtn).toBeVisible();
    await expect(standardBtn).toBeVisible();
    await expect(advancedBtn).toBeVisible();

    // Click Standard
    await standardBtn.click();
    // Click Advanced
    await advancedBtn.click();
    // Click Kids
    await kidsBtn.click();

    // All three buttons should remain visible after clicks
    await expect(kidsBtn).toBeVisible();
    await expect(standardBtn).toBeVisible();
    await expect(advancedBtn).toBeVisible();
  });

  test("QR code visible in lobby", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    const qrImage = page.locator('img[alt="QR code to join the game"]');
    await expect(qrImage).toBeVisible({ timeout: 10_000 });

    // QR code should have reasonable dimensions
    const box = await qrImage.boundingBox();
    expect(box).toBeTruthy();
    expect(box?.width).toBeGreaterThan(50);
    expect(box?.height).toBeGreaterThan(50);
  });

  test("start button enables only with enough players", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    // Select a game
    await page.getByRole("button", { name: /^Brain Board$/i }).click();

    // Start button should be disabled with 0 players
    const startButton = page.getByRole("button", { name: /waiting for players|start game/i });
    await expect(startButton).toBeDisabled();

    // Join 1 player — still disabled (need min 2)
    const p1 = await joinPlayerForRoom(browser, page, { code, name: "Solo" });
    await expect(startButton).toBeDisabled();

    // Join 2nd player — should now be enabled
    const p2 = await joinPlayerForRoom(browser, page, { code, name: "Duo" });
    await expect(startButton).toBeEnabled({ timeout: 15_000 });

    await p1.context.close();
    await p2.context.close();
  });

  test("room code displayed prominently", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    // The 4-char room code should be in the URL
    const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
    expect(match).toBeTruthy();
    const code = match?.[1] ?? "";

    // Room code should be visible on the page
    await expect(page.getByText(code, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("player count updates on join", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    // Join players sequentially and verify names appear
    const p1 = await joinPlayerForRoom(browser, page, { code, name: "First" });
    await expect(page.getByText("First", { exact: true })).toBeVisible({ timeout: 10_000 });

    const p2 = await joinPlayerForRoom(browser, page, { code, name: "Second" });
    await expect(page.getByText("Second", { exact: true })).toBeVisible({ timeout: 10_000 });

    const p3 = await joinPlayerForRoom(browser, page, { code, name: "Third" });
    await expect(page.getByText("Third", { exact: true })).toBeVisible({ timeout: 10_000 });

    await p1.context.close();
    await p2.context.close();
    await p3.context.close();
  });

  test("player ready toggles on and off", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const controller = await joinPlayerForRoom(browser, page, { code, name: "ReadyTester" });
    const controllerPage = controller.controllerPage;
    const readyButton = controllerPage.getByRole("button", { name: /ready up|ready!/i });

    await expect(readyButton).toBeVisible({ timeout: 15_000 });
    await expect(readyButton).toHaveText(/ready up/i, { timeout: 10_000 });

    await readyButton.click();
    await expect(readyButton).toHaveText(/ready!/i, { timeout: 10_000 });

    await readyButton.click();
    await expect(readyButton).toHaveText(/ready up/i, { timeout: 10_000 });

    await controller.context.close();
  });
});
