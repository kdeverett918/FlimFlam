import { expect, test } from "@playwright/test";

// Play Again E2E tests will be re-added when new game plugins are implemented.
test.describe("Play Again / New Game flow", () => {
  test("placeholder — play again infrastructure exists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });
});
