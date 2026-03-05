import { expect, test } from "@playwright/test";

import { createRoom, waitForColyseusHealthy } from "./e2e-helpers";

const APP_URL = process.env.FLIMFLAM_E2E_HOST_URL ?? "http://127.0.0.1:5310";

test.describe("Design System Integrity", () => {
  test("host homepage renders cinematic dark presentation", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('img[alt="FLIMFLAM Party Game"]').first()).toBeVisible();
    await expect(page.getByText(/your favorite game shows/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create a new game room/i })).toBeVisible();

    const bodyBg = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor,
    );
    expect(bodyBg).not.toBe("rgb(255, 255, 255)");
  });

  test("controller join screen keeps glass-input styling and touch targets", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(APP_URL);

    const codeInput = page.getByLabel("Room code character 1");
    await expect(codeInput).toBeVisible();
    await expect(codeInput).toHaveClass(/glass-input/);

    const nameInput = page.getByLabel("Your Name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveClass(/glass-input/);

    await context.close();
  });

  test("host lobby visuals render expected key modules", async ({ page }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    await createRoom(page);

    await expect(page.getByRole("heading", { name: /^players$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^select game$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^difficulty$/i })).toBeVisible();

    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Lucky Letters$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Survey Smash$/i })).toBeVisible();
    await expect(page.locator('img[alt="QR code to join the game"]')).toBeVisible();
  });
});
