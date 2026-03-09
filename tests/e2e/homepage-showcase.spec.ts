import { expect, test } from "@playwright/test";

import { waitForColyseusHealthy } from "./e2e-helpers";

test.describe("Homepage Landing", () => {
  test("renders the current landing contract", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /flimflam arcade series/i })).toBeVisible();
    await expect(page.locator('[aria-label="Game night just got ridiculous."]')).toBeVisible();
    await expect(
      page.getByText(
        /one screen\. every phone\. jump in instantly, save progress when you want\./i,
      ),
    ).toBeVisible();

    await expect(page.getByText(/zero app installs/i)).toBeVisible();
    await expect(page.getByText(/saved flimflap runs/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /^4 games, one party$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /flimflap/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^join game$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^create game$/i })).toHaveCount(0);

    await expect(page.locator('input[aria-label^="Room code character"]')).toHaveCount(4);
    await expect(page.locator("#action-player-name")).toBeVisible();
    await expect(page.getByTestId("join-form-submit")).toBeVisible();
    await expect(page.getByRole("button", { name: /or create a new game/i })).toBeVisible();
  });

  test("create flow supports keyboard submit and exposes color selection state", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);

    await page.getByRole("button", { name: /or create a new game/i }).click();

    await expect(page.getByRole("heading", { name: /^create game$/i })).toBeVisible();

    const hostNameInput = page.locator("#create-host-name");
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
