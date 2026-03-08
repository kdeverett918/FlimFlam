import { expect, test } from "@playwright/test";

import { waitForColyseusHealthy } from "./e2e-helpers";

test.describe("Homepage Landing", () => {
  test("renders the current landing contract", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('img[alt="FLIMFLAM Party Game"]').first()).toBeVisible();
    await expect(page.getByText(/game night just got ridiculous\./i)).toBeVisible();
    await expect(
      page.getByText(/everyone plays on one screen\. no app downloads\. no accounts\./i),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: /^join game$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^create game$/i })).toBeVisible();

    await expect(page.locator('input[aria-label^="Room code character"]')).toHaveCount(4);
    await expect(page.locator("#join-player-name")).toBeVisible();
    await expect(page.locator("#host-name")).toBeVisible();
    await expect(page.getByTestId("join-form-submit")).toBeVisible();
    await expect(page.getByTestId("create-room-cta")).toBeVisible();
  });

  test("create flow supports keyboard submit and exposes color selection state", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    const hostNameInput = page.locator("#host-name");
    const createColorButtons = page.locator('button[aria-label^="Select color "]');

    await expect(createColorButtons.first()).toHaveAttribute("aria-pressed", "true");
    await createColorButtons.nth(1).click();
    await expect(createColorButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(createColorButtons.first()).toHaveAttribute("aria-pressed", "false");

    await hostNameInput.fill("ABCDEFGHIJKLMNOPQRSTUV");
    await expect(hostNameInput).toHaveValue("ABCDEFGHIJKLMNOPQRST");

    await hostNameInput.press("Enter");

    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/i, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /^players$/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
