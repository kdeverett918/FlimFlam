import { expect, test } from "@playwright/test";

test("hot take game completes end-to-end", async ({ page, browser }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

  const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
  expect(match).not.toBeNull();
  const code = match?.[1] ?? "";

  const joinController = async (name: string) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const controllerPage = await context.newPage();
    await controllerPage.goto(`http://127.0.0.1:3001/?code=${code}`);
    await controllerPage.getByLabel("Your Name").fill(name);
    await controllerPage.getByRole("button", { name: /^join$/i }).click();
    await expect(controllerPage).toHaveURL(/\/play$/);
    await expect(controllerPage.getByText(/waiting for the host/i)).toBeVisible();
    return { context, controllerPage };
  };

  const c1 = await joinController("Alice");
  const c2 = await joinController("Bob");
  const c3 = await joinController("Casey");

  // Select game and set difficulty.
  await page.getByRole("button", { name: /hot take/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Play 3 rounds (kids mode).
  for (let i = 0; i < 3; i++) {
    const submit1 = c1.controllerPage.getByRole("button", { name: /^submit$/i });
    const submit2 = c2.controllerPage.getByRole("button", { name: /^submit$/i });
    const submit3 = c3.controllerPage.getByRole("button", { name: /^submit$/i });

    await Promise.all([submit1.waitFor(), submit2.waitFor(), submit3.waitFor()]);

    await Promise.all([submit1.click(), submit2.click(), submit3.click()]);

    // Timer scaling can make the "Submitted!" state very brief, so just assert the submit buttons go away.
    await Promise.all([
      expect(submit1).toBeHidden(),
      expect(submit2).toBeHidden(),
      expect(submit3).toBeHidden(),
    ]);

    if (i === 0) {
      // Results view may be brief with timer scaling, so wait for it to appear at least once.
      await page.waitForFunction(() => document.body.innerText.includes("THE RESULTS"), null, {
        timeout: 20_000,
      });
    }
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
