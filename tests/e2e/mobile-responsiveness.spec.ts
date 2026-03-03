import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";
const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

// ---------------------------------------------------------------------------
// Viewport configurations
// ---------------------------------------------------------------------------

const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "Pixel 7", width: 412, height: 915 },
  { name: "iPhone 15 Pro Max", width: 428, height: 926 },
];

const DESKTOP_VIEWPORTS = [
  { name: "Tablet 768", width: 768, height: 1024 },
  { name: "Small Desktop 1024", width: 1024, height: 768 },
  { name: "Desktop 1440", width: 1440, height: 900 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function checkNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow).toBe(false);
}

async function checkMinTouchTargets(page: Page, selector: string, minSize = 48) {
  const elements = page.locator(selector);
  const count = await elements.count();
  for (let i = 0; i < count; i++) {
    const box = await elements.nth(i).boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(minSize);
    }
  }
}

async function checkMinFontSize(page: Page, selector: string, minPx = 14) {
  const elements = page.locator(selector);
  const count = await elements.count();
  for (let i = 0; i < count; i++) {
    const fontSize = await elements
      .nth(i)
      .evaluate((el) => Number.parseFloat(window.getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(minPx);
  }
}

async function waitForColyseusHealth(page: Page) {
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
}

/** Create a room on the host page and return the 4-char room code. */
async function createRoomOnHost(page: Page): Promise<string> {
  await page.goto("/");
  await waitForColyseusHealth(page);
  await page
    .getByRole("button", { name: /create a new game room/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });
  const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
  expect(match).not.toBeNull();
  return match?.[1] ?? "";
}

// ---------------------------------------------------------------------------
// 1. Host Homepage — Mobile viewports
// ---------------------------------------------------------------------------

test.describe("Host Homepage — Mobile Responsiveness", () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test.describe(`@ ${vp.name} (${vp.width}x${vp.height})`, () => {
      test("no horizontal overflow", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto("/");

        // Wait for the page to render (motion animations)
        await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

        await checkNoHorizontalOverflow(page);
        await context.close();
      });

      test("FLIMFLAM heading is visible and not clipped", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto("/");

        const heading = page.locator("h1");
        await expect(heading).toBeVisible({ timeout: 10_000 });
        await expect(heading).toContainText("FLIMFLAM");

        // Heading bounding box should be fully within the viewport width
        const box = await heading.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1); // 1px tolerance
        }

        await context.close();
      });

      test("CREATE ROOM button is visible and clickable", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto("/");

        const createBtn = page.getByRole("button", { name: /create a new game room/i }).first();
        await expect(createBtn).toBeVisible({ timeout: 10_000 });

        // Button should be tappable (>= 48px height)
        const box = await createBtn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(48);
        }

        await context.close();
      });

      test("body text has readable font size (>= 16px)", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto("/");

        // Wait for content
        await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

        // Check paragraph text is readable
        await checkMinFontSize(page, "main p", 16);
        await context.close();
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Controller Join Page — Mobile viewports
// ---------------------------------------------------------------------------

test.describe("Controller Join Page — Mobile Responsiveness", () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test.describe(`@ ${vp.name} (${vp.width}x${vp.height})`, () => {
      test("page loads and logo heading is visible", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(CONTROLLER_URL);

        const logo = page.locator('img[alt="FLIMFLAM Party Game"]');
        await expect(logo).toBeVisible({ timeout: 10_000 });

        const heading = page.locator("h1");
        await expect(heading).toBeVisible({ timeout: 10_000 });
        await expect(heading).toHaveText("FLIMFLAM");

        await context.close();
      });

      test("no horizontal overflow", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(CONTROLLER_URL);
        await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

        await checkNoHorizontalOverflow(page);
        await context.close();
      });

      test("room code inputs have minimum touch target height", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(CONTROLLER_URL);

        const codeInputs = page.locator('input[aria-label^="Room code"]');
        await expect(codeInputs).toHaveCount(4, { timeout: 10_000 });

        await checkMinTouchTargets(page, 'input[aria-label^="Room code"]', 48);
        await context.close();
      });

      test("name input is visible with proper touch target height", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(CONTROLLER_URL);

        const nameInput = page.getByLabel("Your Name");
        await expect(nameInput).toBeVisible({ timeout: 10_000 });

        const box = await nameInput.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(48);
        }

        await context.close();
      });

      test("avatar color swatches have minimum touch target size", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(CONTROLLER_URL);

        // Avatar buttons have aria-label starting with "Select color:"
        const swatches = page.locator('button[aria-label^="Select color"]');
        const count = await swatches.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          const box = await swatches.nth(i).boundingBox();
          expect(box).not.toBeNull();
          if (box) {
            // Avatar picker buttons are 56x56 inline style, should be >= 48px
            expect(box.height).toBeGreaterThanOrEqual(48);
            expect(box.width).toBeGreaterThanOrEqual(48);
          }
        }

        await context.close();
      });

      test("join button is full width and has proper touch target", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(CONTROLLER_URL);

        const joinBtn = page.getByRole("button", { name: /^join$/i });
        await expect(joinBtn).toBeVisible({ timeout: 10_000 });

        const box = await joinBtn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          // Button should be >= 48px tall (accounting for scale(0.95) on disabled state)
          expect(box.height).toBeGreaterThanOrEqual(48 * 0.95);
          // Button should span most of the viewport width (full width minus padding)
          // Subtract 2px tolerance for sub-pixel rounding and framer-motion scale animation
          const expectedMinWidth = Math.min(vp.width - 48, 384 - 48) - 2;
          expect(box.width).toBeGreaterThanOrEqual(expectedMinWidth);
        }

        await context.close();
      });

      test("all visible text meets minimum font size (>= 14px)", async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await page.goto(CONTROLLER_URL);
        await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

        // Check labels and body text (excluding the character counter which is intentionally xs)
        await checkMinFontSize(page, "main label", 14);
        await context.close();
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Controller Join Page — Desktop viewports
// ---------------------------------------------------------------------------

test.describe("Controller Join Page — Desktop Responsiveness", () => {
  for (const vp of DESKTOP_VIEWPORTS) {
    test(`@ ${vp.name} (${vp.width}x${vp.height}): logo and labels are centered`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      await page.goto(CONTROLLER_URL);

      const logo = page.locator('img[alt="FLIMFLAM Party Game"]');
      await expect(logo).toBeVisible({ timeout: 10_000 });

      const roomCodeLabel = page.getByText("Room Code", { exact: true }).first();
      const nameLabel = page.locator('label[for="player-name"]').first();
      const colorLabel = page.getByText("Pick your color", { exact: true }).first();
      const nameCounter = page.locator("form span.font-mono.text-xs").first();

      await expect(roomCodeLabel).toBeVisible();
      await expect(nameLabel).toBeVisible();
      await expect(colorLabel).toBeVisible();
      await expect(nameCounter).toBeVisible();

      const [roomCodeAlign, nameAlign, colorAlign, counterAlign] = await Promise.all([
        roomCodeLabel.evaluate((el) => window.getComputedStyle(el).textAlign),
        nameLabel.evaluate((el) => window.getComputedStyle(el).textAlign),
        colorLabel.evaluate((el) => window.getComputedStyle(el).textAlign),
        nameCounter.evaluate((el) => window.getComputedStyle(el).textAlign),
      ]);

      expect(roomCodeAlign).toBe("center");
      expect(nameAlign).toBe("center");
      expect(colorAlign).toBe("center");
      expect(counterAlign).toBe("center");

      await checkNoHorizontalOverflow(page);
      await context.close();
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Controller Game UI — Mobile viewports (requires server)
// ---------------------------------------------------------------------------

test.describe("Controller Game UI — Mobile Responsiveness", () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test(`@ ${vp.name}: connected controller renders without overflow`, async ({
      page,
      browser,
    }) => {
      // Create room on host
      const code = await createRoomOnHost(page);

      // Join from controller at this viewport
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const controllerPage = await context.newPage();
      await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);

      // Fill join form
      await controllerPage.getByLabel("Your Name").fill(`Player_${vp.name.replace(/\s+/g, "")}`);
      await controllerPage.getByRole("button", { name: /^join$/i }).click();

      // Wait for /play and connection
      await expect(controllerPage).toHaveURL(/\/play$/, { timeout: 30_000 });
      await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
        timeout: 60_000,
      });

      // Verify lobby waiting state renders.
      await expect(controllerPage.getByRole("heading", { name: /^you're in!$/i })).toBeVisible({
        timeout: 15_000,
      });

      // No horizontal overflow
      await checkNoHorizontalOverflow(controllerPage);

      // Check all visible buttons have proper touch targets
      const buttons = controllerPage.locator("button:visible");
      const buttonCount = await buttons.count();
      for (let i = 0; i < buttonCount; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box && box.height > 0) {
          // Skip tiny decorative elements; real interactive buttons should be >= 40px
          // (we use 40 here since some secondary buttons may be slightly under 48)
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }

      await context.close();
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Controller WaitingScreen renders correctly
// ---------------------------------------------------------------------------

test.describe("Controller WaitingScreen — Mobile Responsiveness", () => {
  test("WaitingScreen animated dots are visible and no overflow at iPhone SE", async ({
    page,
    browser,
  }) => {
    const code = await createRoomOnHost(page);

    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const controllerPage = await context.newPage();
    await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);

    await controllerPage.getByLabel("Your Name").fill("WaitPlayer");
    await controllerPage.getByRole("button", { name: /^join$/i }).click();

    await expect(controllerPage).toHaveURL(/\/play$/, { timeout: 30_000 });
    await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
      timeout: 60_000,
    });

    // In lobby state we see "You're in!"
    await expect(controllerPage.getByRole("heading", { name: /^you're in!$/i })).toBeVisible({
      timeout: 15_000,
    });

    await checkNoHorizontalOverflow(controllerPage);
    await context.close();
  });
});

// ---------------------------------------------------------------------------
// 6. Host Lobby — Desktop / Tablet viewports
// ---------------------------------------------------------------------------

test.describe("Host Lobby — Desktop Responsiveness", () => {
  for (const vp of DESKTOP_VIEWPORTS) {
    test(`@ ${vp.name} (${vp.width}x${vp.height}): lobby elements are visible and readable`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      await page.goto("/");

      await waitForColyseusHealth(page);
      await page
        .getByRole("button", { name: /create a new game room/i })
        .first()
        .click();
      await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

      // Room code is displayed with mono font and is centered
      const codeDisplay = page.locator(".font-mono").first();
      await expect(codeDisplay).toBeVisible({ timeout: 10_000 });
      const codeBox = await codeDisplay.boundingBox();
      expect(codeBox).not.toBeNull();
      if (codeBox) {
        // Room code should be horizontally within the viewport
        expect(codeBox.x).toBeGreaterThanOrEqual(0);
        expect(codeBox.x + codeBox.width).toBeLessThanOrEqual(vp.width + 1);
      }

      // QR code image is visible
      const qrImage = page.locator('img[alt="QR code to join the game"]');
      await expect(qrImage).toBeVisible({ timeout: 15_000 });

      // Game selector buttons (5 games) are present
      const gameButtons = page.locator("button").filter({ has: page.locator(".font-display") });
      const gameCount = await gameButtons.count();
      expect(gameCount).toBeGreaterThanOrEqual(5);

      // Complexity picker buttons are visible
      await expect(page.getByRole("button", { name: /^kids/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /standard/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /advanced/i })).toBeVisible();

      // Player section heading is visible
      await expect(page.getByRole("heading", { name: /^PLAYERS$/ })).toBeVisible();

      // Start/waiting button is visible
      const startOrWait = page
        .getByRole("button")
        .filter({ hasText: /start game|waiting for players/i });
      await expect(startOrWait).toBeVisible();

      // No horizontal overflow
      await checkNoHorizontalOverflow(page);

      await context.close();
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Host Lobby with players — room code readable, player slots visible
// ---------------------------------------------------------------------------

test.describe("Host Lobby with Players — Layout Integrity", () => {
  test("player avatars render and room code is readable at 1024px", async ({ page, browser }) => {
    const code = await createRoomOnHost(page);

    // Join a player
    const controllerCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const controllerPage = await controllerCtx.newPage();
    await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);
    await controllerPage.getByLabel("Your Name").fill("LayoutTestPlayer");
    await controllerPage.getByRole("button", { name: /^join$/i }).click();
    await expect(controllerPage).toHaveURL(/\/play$/, { timeout: 30_000 });
    await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
      timeout: 60_000,
    });

    // Verify player shows up on host
    await expect(page.getByText("LayoutTestPlayer")).toBeVisible({ timeout: 30_000 });

    // Room code is still readable
    const codeText = page.locator(".font-mono").first();
    await expect(codeText).toBeVisible();
    const fontSize = await codeText.evaluate((el) =>
      Number.parseFloat(window.getComputedStyle(el).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(36); // Should be large for readability

    // Player count shows 1 / 8
    await expect(page.getByText(/\b1\s*\/\s*8\b/)).toBeVisible();

    // No overflow
    await checkNoHorizontalOverflow(page);

    await controllerCtx.close();
  });
});
