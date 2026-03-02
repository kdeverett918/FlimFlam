import { expect, test } from "@playwright/test";

const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

test.describe("Homepage Game Showcase", () => {
  test("homepage renders with branding", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to render (motion animations).
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("CREATE ROOM CTA buttons work", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Verify there is at least one CREATE ROOM button.
    const createButtons = page.getByRole("button", { name: /create.*room/i });
    const buttonCount = await createButtons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(1);

    // Click the first CREATE ROOM button — should navigate to room creation.
    // We need the server running for this to work.
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

    await createButtons.first().click();
    await expect(page).toHaveURL(/\/room\/(new|[A-Z0-9]{4})/, { timeout: 60_000 });
  });
});
