import { expect, test } from "@playwright/test";

const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

test.describe("Homepage Game Showcase", () => {
  test("homepage renders with branding and game shows", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to render (motion animations).
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Verify FLIMFLAM branding
    await expect(page.getByText("FLIMFLAM")).toBeVisible();
  });

  test("game showcase shows 3 classic game show cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Verify all 3 game names are present.
    await expect(page.getByText("Jeopardy")).toBeVisible();
    await expect(page.getByText("Wheel of Fortune")).toBeVisible();
    await expect(page.getByText("Family Feud")).toBeVisible();
  });

  test("game cards show descriptions and tags", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Each game card should display its description.
    await expect(page.getByText(/Classic quiz show/i)).toBeVisible();
    await expect(page.getByText(/Spin the wheel/i)).toBeVisible();
    await expect(page.getByText(/Survey says/i)).toBeVisible();

    // Spot-check tags.
    await expect(page.getByText("trivia", { exact: true })).toBeVisible();
    await expect(page.getByText("puzzle", { exact: true })).toBeVisible();
    await expect(page.getByText("teams", { exact: true })).toBeVisible();
  });

  test("game cards show player count badges", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // All games show player count range (3-8).
    const playerCounts = page.getByText("3-8");
    await expect(playerCounts.first()).toBeVisible();
    const count = await playerCounts.count();
    expect(count).toBe(3);
  });

  test("no AI badges on game cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // No AI badges should be present.
    const aiBadges = page.getByText("AI", { exact: true });
    const aiCount = await aiBadges.count();
    expect(aiCount).toBe(0);
  });

  test("CREATE ROOM CTA button works", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Verify there is at least one CREATE ROOM button.
    const createButtons = page.getByRole("button", { name: /create.*room/i });
    const buttonCount = await createButtons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(1);

    // Click the first CREATE ROOM button — should navigate to room creation.
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

  test("how it works section is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("HOW IT WORKS")).toBeVisible();
    await expect(page.getByText("Host Creates Room")).toBeVisible();
    await expect(page.getByText("Players Join on Phones")).toBeVisible();
  });

  test("quick stats bar shows game info", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Classic Game Shows")).toBeVisible();
    await expect(page.getByText("No App Download")).toBeVisible();
  });
});
