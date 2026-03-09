import { expect, test } from "@playwright/test";

test.describe("FlimFlap Route", () => {
  test("redirects the legacy trumpybird path to flimflap", async ({ page }) => {
    await page.goto("/trumpybird");
    await expect(page).toHaveURL(/\/flimflap$/i);
  });

  test("serves the mounted FlimFlap client bundle from the new route", async ({ page }) => {
    await page.goto("/flimflap");

    await expect(page).toHaveTitle(/FlimFlap \| FLIMFLAM/i);
    await expect(page.locator("#root")).toBeVisible();
    await expect(page.locator('script[type="module"][src^="/flimflap/assets/"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: /single player/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __FLIMFLAP_BACKEND_URL__?: string }).__FLIMFLAP_BACKEND_URL__ ??
            null,
        ),
      )
      .not.toBeNull();
  });
});
