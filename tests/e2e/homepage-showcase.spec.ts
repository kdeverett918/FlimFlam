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
    // Use exact text to avoid matching tag + description copies simultaneously.
    await expect(page.getByText("storytelling", { exact: true })).toBeVisible();
    await expect(page.getByText("bluffing", { exact: true })).toBeVisible();
    await expect(page.getByText("drawing", { exact: true })).toBeVisible();
    await expect(page.getByText("buzzer", { exact: true })).toBeVisible();
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

  test("game showcase renders as a grid without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const heading = page.getByRole("heading", { name: /^THE GAMES$/ });
    await expect(heading).toBeVisible();

    // Current design uses a responsive grid (1 col -> 2 col -> 3 col) rather than
    // a horizontal scroll container.
    const section = heading.locator("..");
    const grid = section.locator("div.grid").first();
    await expect(grid).toBeAttached();

    const display = await grid.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("grid");

    const hasOverflow = await grid.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(hasOverflow).toBe(false);
  });
});
