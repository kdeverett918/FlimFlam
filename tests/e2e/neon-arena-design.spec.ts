import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.PARTYLINE_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";

test.describe("Neon Arena Design System", () => {
  test("host home page has dark theme and correct visual elements", async ({ page }) => {
    await page.goto("/");

    // Verify dark background - the body/html should have a near-black background
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Expect a very dark color (close to oklch(0.08 0.02 280) ~= #0e0e19)
    expect(bgColor).not.toBe("rgb(255, 255, 255)");

    // Verify "PARTYLINE" logo is present with display font
    const logo = page.locator("h1");
    await expect(logo).toHaveText("PARTYLINE");
    const fontFamily = await logo.evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toMatch(/space[ _-]?grotesk/);

    // Verify tagline is present
    await expect(page.getByText("Party games. Reimagined.")).toBeVisible();

    // Verify "CREATE ROOM" button exists
    const createBtn = page.getByRole("button", { name: /create room/i });
    await expect(createBtn).toBeVisible();

    // Verify AnimatedBackground is present (the noise SVG)
    const noiseSvg = page.locator('svg[aria-hidden="true"]');
    await expect(noiseSvg).toBeAttached();

    // Verify info text is present
    await expect(page.getByText(/display this screen/i)).toBeVisible();
    await expect(page.getByText(/players join from their phones/i)).toBeVisible();
  });

  test("controller join page has dark theme and glass inputs", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(CONTROLLER_URL);

    // Verify "PARTYLINE" logo on controller
    const logo = page.locator("h1");
    await expect(logo).toHaveText("PARTYLINE");

    // Verify room code inputs exist (4 individual inputs)
    const codeInputs = page.locator('input[aria-label^="Room code"]');
    await expect(codeInputs).toHaveCount(4);

    // Verify each code input has glass styling (backdrop-blur class)
    const firstInput = codeInputs.first();
    const classes = await firstInput.getAttribute("class");
    expect(classes).toContain("glass-input");

    // Verify name input exists
    const nameInput = page.getByLabel("Your Name");
    await expect(nameInput).toBeVisible();

    // Verify join button
    const joinBtn = page.getByRole("button", { name: /^join$/i });
    await expect(joinBtn).toBeVisible();

    // Verify subtitle text
    await expect(page.getByText(/join the party/i)).toBeVisible();

    await context.close();
  });

  test("lobby loads with Neon Arena theme after room creation", async ({ page }) => {
    await page.goto("/");

    // Ensure server is ready
    await expect
      .poll(
        async () => {
          try {
            const res = await page.request.get("http://127.0.0.1:2567/health");
            return res.status();
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);

    await page.getByRole("button", { name: /create room/i }).click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

    // Verify room code is displayed with mono font
    const codeDisplay = page.locator(".font-mono").first();
    await expect(codeDisplay).toBeVisible();

    // Verify game selector cards are present (5 games)
    const gameButtons = page.locator("button").filter({ has: page.locator(".font-display") });
    const count = await gameButtons.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Verify complexity picker exists
    await expect(page.getByRole("button", { name: /^kids/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /standard/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /advanced/i })).toBeVisible();

    // Verify "START GAME" or waiting text exists
    const startOrWait = page
      .getByRole("button")
      .filter({ hasText: /start game|waiting for players/i });
    await expect(startOrWait).toBeVisible();
  });

  test("controller game flow applies glass styling", async ({ page, browser }) => {
    await page.goto("/");

    // Ensure server is ready
    await expect
      .poll(
        async () => {
          try {
            const res = await page.request.get("http://127.0.0.1:2567/health");
            return res.status();
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(200);

    await page.getByRole("button", { name: /create room/i }).click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

    const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
    expect(match).not.toBeNull();
    const code = match?.[1] ?? "";

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const controllerPage = await context.newPage();
    await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);

    await controllerPage.getByLabel("Your Name").fill("TestPlayer");
    await controllerPage.getByRole("button", { name: /^join$/i }).click();
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(controllerPage.getByRole("heading", { name: /you're in!/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(controllerPage.getByText(/waiting for the host/i)).toBeVisible({ timeout: 60_000 });

    // Verify the player name appears on the host
    await expect(page.getByText("TestPlayer")).toBeVisible();

    await context.close();
  });
});
