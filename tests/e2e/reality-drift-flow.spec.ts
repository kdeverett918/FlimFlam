import { type Page, expect, test } from "@playwright/test";

test("reality drift game completes end-to-end", async ({ page, browser }) => {
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
  await page.getByRole("button", { name: /reality drift/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  const answerRound = async (controllerPage: Page) => {
    // Select the first option (label varies per question) then confirm.
    await controllerPage.locator("button").first().click();
    await controllerPage.getByRole("button", { name: /confirm vote/i }).click();
    await expect(controllerPage.getByText(/vote confirmed!/i)).toBeVisible();
  };

  const driftCheck = async (controllerPage: Page, choice: "real" | "drift") => {
    const buttonName = choice === "drift" ? /hallucination \u2014/i : /real \u2014/i;
    await controllerPage.getByRole("button", { name: buttonName }).click();
    await controllerPage.getByRole("button", { name: /confirm vote/i }).click();
    await expect(controllerPage.getByText(/vote confirmed!/i)).toBeVisible();
  };

  // Play 3 rounds (kids mode).
  for (let round = 1; round <= 3; round++) {
    await Promise.all([
      c1.controllerPage.getByText(/fill the blank/i).waitFor(),
      c2.controllerPage.getByText(/fill the blank/i).waitFor(),
      c3.controllerPage.getByText(/fill the blank/i).waitFor(),
    ]);

    await Promise.all([
      answerRound(c1.controllerPage),
      answerRound(c2.controllerPage),
      answerRound(c3.controllerPage),
    ]);

    await Promise.all([
      c1.controllerPage.getByText(/is this headline real or made up\?/i).waitFor(),
      c2.controllerPage.getByText(/is this headline real or made up\?/i).waitFor(),
      c3.controllerPage.getByText(/is this headline real or made up\?/i).waitFor(),
    ]);

    // Round 1 should always be real, so calling drift should apply a penalty.
    const choice = round === 1 ? "drift" : "real";
    await Promise.all([
      driftCheck(c1.controllerPage, choice),
      driftCheck(c2.controllerPage, choice),
      driftCheck(c3.controllerPage, choice),
    ]);

    if (round === 1) {
      await page.waitForFunction(() => document.body.innerText.includes("RESULTS"), null, {
        timeout: 20_000,
      });
      await expect(page.getByText("-150")).toHaveCount(3);
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
