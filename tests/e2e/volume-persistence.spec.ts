import { type Page, expect, test } from "@playwright/test";

import {
  closeAllControllers,
  createRoom,
  joinControllersForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

async function openVolumeSlider(page: Page): Promise<void> {
  const volumeBtn = page.getByRole("button", { name: /mute audio|unmute audio/i });
  await expect(volumeBtn).toBeVisible({ timeout: 10_000 });
  // First click opens the slider panel
  const slider = page.getByRole("slider", { name: /volume/i });
  if (!(await slider.isVisible().catch(() => false))) {
    await volumeBtn.click();
    await expect(slider).toBeVisible({ timeout: 5_000 });
  }
}

test.describe("Volume Persistence Across Games", () => {
  test("volume slider changes reported volume value", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    await openVolumeSlider(page);

    const slider = page.getByRole("slider", { name: /volume/i });

    // Set volume to 0.5 via slider
    await slider.fill("0.5");
    const display = page.locator("span").filter({ hasText: /^50$/ });
    await expect(display).toBeVisible({ timeout: 5_000 });

    // Set volume to max
    await slider.fill("1");
    const maxDisplay = page.locator("span").filter({ hasText: /^100$/ });
    await expect(maxDisplay).toBeVisible({ timeout: 5_000 });
  });

  test("mute state persists when switching between games", async ({ page, browser }) => {
    test.setTimeout(180_000);

    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);
    const controllers = await joinControllersForRoom(browser, page, code, ["Ari", "Bea"]);

    // Unlock audio
    const volumeBtn = page.getByRole("button", { name: /mute audio/i });
    await expect(volumeBtn).toBeVisible({ timeout: 10_000 });
    await volumeBtn.click(); // opens slider

    // Mute
    await volumeBtn.click(); // toggles mute
    await expect(page.getByRole("button", { name: /unmute audio/i })).toBeVisible({
      timeout: 5_000,
    });

    // Start first game
    await selectGameAndStart(page, { gameName: "Brain Board", complexity: "kids" });

    // Volume button should still show muted after game starts
    await expect(page.getByRole("button", { name: /unmute audio/i })).toBeVisible({
      timeout: 10_000,
    });

    // End game back to lobby
    const endButton = page.getByRole("button", { name: /^end$/i });
    for (let i = 0; i < 20; i++) {
      if (await endButton.isVisible().catch(() => false)) {
        await endButton.click({ force: true });
        break;
      }
      await page.waitForTimeout(300);
    }

    // Wait for lobby
    await expect(page.getByRole("button", { name: /start game|waiting for players/i })).toBeVisible(
      { timeout: 30_000 },
    );

    // Volume should still be muted
    await expect(page.getByRole("button", { name: /unmute audio/i })).toBeVisible({
      timeout: 10_000,
    });

    // Start second game
    await selectGameAndStart(page, { gameName: "Lucky Letters", complexity: "kids" });

    // Volume should still be muted after switching games
    await expect(page.getByRole("button", { name: /unmute audio/i })).toBeVisible({
      timeout: 10_000,
    });

    await closeAllControllers(controllers);
  });
});
