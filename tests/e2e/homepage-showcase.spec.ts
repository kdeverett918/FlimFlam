import { expect, test } from "@playwright/test";

const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

test.describe("Homepage Game Showcase", () => {
  test("game showcase section is visible with all 6 game cards", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to render (motion animations).
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Verify "THE GAMES" section heading is present.
    await expect(page.getByText("THE GAMES")).toBeVisible({ timeout: 10_000 });

    // Verify all 6 game names are present.
    await expect(page.getByText("World Builder")).toBeVisible();
    await expect(page.getByText("Bluff Engine")).toBeVisible();
    await expect(page.getByText("Quick Draw")).toBeVisible();
    await expect(page.getByText("Reality Drift")).toBeVisible();
    await expect(page.getByText("Hot Take")).toBeVisible();
    await expect(page.getByText("Brain Battle")).toBeVisible();
  });

  test("each game card shows name and description", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Each game card should display its description.
    await expect(page.getByText(/AI-powered collaborative storytelling/i)).toBeVisible();
    await expect(page.getByText(/Fibbage-style bluffing/i)).toBeVisible();
    await expect(page.getByText(/Draw and guess/i)).toBeVisible();
    await expect(page.getByText(/Headline or Hallucination/i)).toBeVisible();
    await expect(page.getByText(/Rate spicy opinions/i)).toBeVisible();
    await expect(page.getByText(/AI builds a quiz board/i)).toBeVisible();
  });

  test("game cards show player count and AI badge where applicable", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // All games show player count range (3-8).
    const playerCounts = page.getByText("3-8");
    await expect(playerCounts.first()).toBeVisible();
    const count = await playerCounts.count();
    expect(count).toBe(6);

    // AI badge should be present on AI-required games (World Builder, Bluff Engine, Reality Drift, Brain Battle).
    const aiBadges = page.getByText("AI", { exact: true });
    const aiCount = await aiBadges.count();
    expect(aiCount).toBeGreaterThanOrEqual(4);
  });

  test("game cards show tags", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Spot-check some game tags.
    await expect(page.getByText("storytelling")).toBeVisible();
    await expect(page.getByText("bluffing")).toBeVisible();
    await expect(page.getByText("drawing")).toBeVisible();
    await expect(page.getByText("buzzer")).toBeVisible();
  });

  test("CREATE ROOM CTA buttons work", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Verify there are two CREATE ROOM buttons (top and bottom).
    const createButtons = page.getByRole("button", { name: /create.*room/i });
    const buttonCount = await createButtons.count();
    expect(buttonCount).toBe(2);

    // Verify the "Ready to play?" text near the bottom CTA.
    await expect(page.getByText("Ready to play?")).toBeVisible();

    // Verify "Display this screen" and "Players join from their phones" instructions.
    await expect(page.getByText(/display this screen/i)).toBeVisible();
    await expect(page.getByText(/players join from their phones/i)).toBeVisible();

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

  test("game showcase is horizontally scrollable", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // The game cards container should be scrollable (overflow-x-auto).
    // Verify that the scroll container exists and has scrollable content.
    const scrollContainer = page.locator(".scrollbar-hide");
    await expect(scrollContainer).toBeAttached();

    // The container's scrollWidth should be greater than its clientWidth
    // because 6 cards at 280px each = 1680px + gaps exceeds most viewports.
    const isScrollable = await scrollContainer.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    expect(isScrollable).toBe(true);
  });
});
