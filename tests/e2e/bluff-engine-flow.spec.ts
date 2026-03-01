import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.PARTYLINE_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";

test("bluff engine game completes end-to-end", async ({ page, browser }) => {
  await page.goto("/");

  // Ensure the Colyseus server is ready before attempting to create a room.
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

  const joinController = async (name: string) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const controllerPage = await context.newPage();
    await controllerPage.goto(`${CONTROLLER_URL}/?code=${code}`);
    await controllerPage.getByLabel("Your Name").fill(name);
    await controllerPage.getByRole("button", { name: /^join$/i }).click();
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(page.getByText(name)).toBeVisible({ timeout: 30_000 });
    return { context, controllerPage };
  };

  const c1 = await joinController("Alice");
  const c2 = await joinController("Bob");
  const c3 = await joinController("Casey");

  // Select game and set difficulty.
  await page.getByRole("button", { name: /bluff engine/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Play 3 rounds (kids mode).
  for (let i = 0; i < 3; i++) {
    const a = `alice bluff ${i}`;
    const b = `bob bluff ${i}`;
    const c = `casey bluff ${i}`;

    await Promise.all([
      c1.controllerPage.locator("textarea").waitFor(),
      c2.controllerPage.locator("textarea").waitFor(),
      c3.controllerPage.locator("textarea").waitFor(),
    ]);

    await Promise.all([
      c1.controllerPage.locator("textarea").fill(a),
      c2.controllerPage.locator("textarea").fill(b),
      c3.controllerPage.locator("textarea").fill(c),
    ]);

    const submit1 = c1.controllerPage.getByRole("button", { name: /^submit$/i });
    const submit2 = c2.controllerPage.getByRole("button", { name: /^submit$/i });
    const submit3 = c3.controllerPage.getByRole("button", { name: /^submit$/i });

    await Promise.all([submit1.click(), submit2.click(), submit3.click()]);

    const confirm1 = c1.controllerPage.getByRole("button", { name: /confirm vote/i });
    const confirm2 = c2.controllerPage.getByRole("button", { name: /confirm vote/i });
    const confirm3 = c3.controllerPage.getByRole("button", { name: /confirm vote/i });

    await Promise.all([confirm1.waitFor(), confirm2.waitFor(), confirm3.waitFor()]);

    // Select any enabled option (the server disables each player's own answer).
    await Promise.all([
      c1.controllerPage.locator("button:not([disabled])").first().click(),
      c2.controllerPage.locator("button:not([disabled])").first().click(),
      c3.controllerPage.locator("button:not([disabled])").first().click(),
    ]);

    await Promise.all([confirm1.click(), confirm2.click(), confirm3.click()]);
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
