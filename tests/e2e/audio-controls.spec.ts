import { expect, test } from "@playwright/test";

const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

test.describe("Volume Control", () => {
  test("volume control button is visible on room page", async ({ page }) => {
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

    // Verify the volume control button is visible (aria-label "Mute audio" or "Unmute audio").
    const volumeBtn = page.getByRole("button", { name: /mute audio|unmute audio/i });
    await expect(volumeBtn).toBeVisible({ timeout: 10_000 });
  });

  test("clicking volume button expands slider panel", async ({ page }) => {
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

    const volumeBtn = page.getByRole("button", { name: /mute audio|unmute audio/i });
    await expect(volumeBtn).toBeVisible({ timeout: 10_000 });

    // Initially, the volume slider should not be visible.
    const volumeSlider = page.getByRole("slider", { name: /volume/i });
    await expect(volumeSlider).toHaveCount(0);

    // Click the volume button to expand.
    await volumeBtn.click();

    // The slider should now be visible.
    await expect(volumeSlider).toBeVisible({ timeout: 5_000 });

    // The close button should also be visible.
    const closeBtn = page.getByRole("button", { name: /close volume control/i });
    await expect(closeBtn).toBeVisible();
  });

  test("volume slider can be closed", async ({ page }) => {
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

    const volumeBtn = page.getByRole("button", { name: /mute audio|unmute audio/i });
    await expect(volumeBtn).toBeVisible({ timeout: 10_000 });

    // Open the slider.
    await volumeBtn.click();

    const volumeSlider = page.getByRole("slider", { name: /volume/i });
    await expect(volumeSlider).toBeVisible({ timeout: 5_000 });

    // Close it.
    const closeBtn = page.getByRole("button", { name: /close volume control/i });
    await closeBtn.click();

    // Slider should disappear.
    await expect(volumeSlider).toHaveCount(0, { timeout: 5_000 });
  });

  test("mute toggle changes button label", async ({ page }) => {
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

    // First click opens the slider panel.
    const volumeBtn = page.getByRole("button", { name: /mute audio/i });
    await expect(volumeBtn).toBeVisible({ timeout: 10_000 });
    await volumeBtn.click();

    // Volume slider should now be visible.
    const volumeSlider = page.getByRole("slider", { name: /volume/i });
    await expect(volumeSlider).toBeVisible({ timeout: 5_000 });

    // Second click toggles mute — aria-label should switch to "Unmute audio".
    await volumeBtn.click();
    await expect(page.getByRole("button", { name: /unmute audio/i })).toBeVisible({
      timeout: 5_000,
    });

    // Third click unmutes — aria-label should switch back to "Mute audio".
    const unmuteBtn = page.getByRole("button", { name: /unmute audio/i });
    await unmuteBtn.click();
    await expect(page.getByRole("button", { name: /mute audio/i })).toBeVisible({
      timeout: 5_000,
    });
  });
});
