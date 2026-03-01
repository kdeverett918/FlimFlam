import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.PARTYLINE_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canvasHasInkAtCenter(canvas: HTMLCanvasElement): Promise<boolean> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width / 2)));
  const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height / 2)));
  const [r, g, b, a] = Array.from(ctx.getImageData(x, y, 1, 1).data);

  // "#0d0b14" background (Neon Arena dark canvas)
  const bg = { r: 13, g: 11, b: 20 };
  const diff = Math.abs((r ?? 0) - bg.r) + Math.abs((g ?? 0) - bg.g) + Math.abs((b ?? 0) - bg.b);

  return (a ?? 0) > 0 && diff > 25;
}

test("quick draw completes end-to-end", async ({ page, browser }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

  const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
  expect(match).not.toBeNull();
  const code = match?.[1] ?? "";

  const joinController = async (name: string) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const controllerPage = await context.newPage();
    await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);
    await controllerPage.getByLabel("Your Name").fill(name);
    await controllerPage.getByRole("button", { name: /^join$/i }).click();
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(controllerPage.getByRole("heading", { name: /you're in!/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(controllerPage.getByText(/waiting for the host/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 30_000 });
    return { context, controllerPage };
  };

  const c1 = await joinController("Alice");
  const c2 = await joinController("Bob");
  const c3 = await joinController("Casey");

  const controllers = [c1.controllerPage, c2.controllerPage, c3.controllerPage];

  // Select game and set difficulty.
  await page.getByRole("button", { name: /quick draw/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  const totalRounds = 3;

  for (let round = 1; round <= totalRounds; round++) {
    // Wait for the drawer UI to appear on one controller.
    const deadline = Date.now() + 30_000;
    let drawerIndex = -1;
    while (Date.now() < deadline) {
      for (let i = 0; i < controllers.length; i++) {
        const isDrawer = await controllers[i].getByText("Your Word").isVisible();
        if (isDrawer) {
          drawerIndex = i;
          break;
        }
      }
      if (drawerIndex !== -1) break;
      await sleep(200);
    }
    expect(drawerIndex).not.toBe(-1);

    const drawerPage = controllers[drawerIndex];
    if (!drawerPage) {
      throw new Error("Drawer controller page missing");
    }
    const guesserPages = controllers.filter((_, i) => i !== drawerIndex);
    expect(guesserPages.length).toBe(2);

    const wordCard = drawerPage.getByText("Your Word").locator("..");
    const wordText = await wordCard.locator(".font-display").first().textContent();
    const word = (wordText ?? "").trim();
    expect(word).not.toBe("");

    // Draw a diagonal line (should cross the center of the host canvas).
    const drawerCanvas = drawerPage.locator("canvas").first();
    await expect(drawerCanvas).toBeVisible();
    const box = await drawerCanvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("Drawer canvas missing bounding box");

    await drawerPage.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await drawerPage.mouse.down();
    await drawerPage.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 12 });
    await drawerPage.mouse.up();

    // Verify the host canvas shows the stroke. We run this check in parallel with
    // controller guessing to avoid racing the (scaled-down) phase timers in CI.
    let inkCheck: Promise<void> | undefined;
    if (round === 1) {
      const hostCanvas = page.locator("canvas").first();
      await expect(hostCanvas).toBeVisible();

      inkCheck = expect
        .poll(async () => hostCanvas.evaluate(canvasHasInkAtCenter), { timeout: 10_000 })
        .toBe(true);
    }

    const g1 = guesserPages[0];
    const g2 = guesserPages[1];
    if (!g1 || !g2) {
      throw new Error("Guesser controller pages missing");
    }

    const g1Input = g1.getByPlaceholder("Type your guess...");
    const g1GuessButton = g1.getByRole("button", { name: /^guess$/i });

    const g2Input = g2.getByPlaceholder("Type your guess...");
    const g2GuessButton = g2.getByRole("button", { name: /^guess$/i });

    await Promise.all([g1Input.waitFor({ timeout: 20_000 }), g2Input.waitFor({ timeout: 20_000 })]);

    await Promise.all([g1Input.fill(word), g2Input.fill(word)]);
    await Promise.all([g1GuessButton.click(), g2GuessButton.click()]);

    await Promise.all([
      expect(g1.getByText(/you got it!/i)).toBeVisible({ timeout: 20_000 }),
      expect(g2.getByText(/you got it!/i)).toBeVisible({ timeout: 20_000 }),
    ]);

    if (inkCheck) {
      await inkCheck;
    }

    // Host should reveal the word after all guessers are correct.
    await page.getByRole("heading", { name: /^THE WORD WAS$/i }).waitFor({ timeout: 30_000 });
  }

  await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: /^FINAL SCORES$/ })).toBeVisible();
  await expect(page.getByText("Alice")).toBeVisible();
  await expect(page.getByText("Bob")).toBeVisible();
  await expect(page.getByText("Casey")).toBeVisible();

  await c1.context.close();
  await c2.context.close();
  await c3.context.close();
});
