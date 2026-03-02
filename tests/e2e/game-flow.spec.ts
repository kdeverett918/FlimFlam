import { expect, test } from "@playwright/test";

// Game flow E2E tests will be re-added when new game plugins are implemented.
test.describe("Game Flow", () => {
  test("placeholder — game flow infrastructure exists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });
});
