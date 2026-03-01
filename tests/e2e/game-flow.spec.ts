import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.PARTYLINE_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";

test("hot take game completes end-to-end", async ({ page, browser }) => {
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

    // Ensure we actually landed in a connected /play state (not a transient redirect).
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
  await page.getByRole("button", { name: /hot take/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  let gameOver = false;

  const playController = async (controllerPage: typeof page) => {
    let votesSubmitted = 0;
    const deadline = Date.now() + 60_000;

    while (!gameOver && Date.now() < deadline) {
      // Hot Take "player input" mode (topic-setup) can be enabled in some environments.
      // Handle it defensively even though this e2e runs kids mode.
      const topicSetupHeading = controllerPage.getByRole("heading", {
        name: /pick a topic for hot take/i,
      });
      if (await topicSetupHeading.isVisible().catch(() => false)) {
        const categoryButton = controllerPage
          .getByRole("button")
          .filter({ hasText: /politics|dating|workplace|food|technology|lifestyle|wildcard/i })
          .first();
        await categoryButton.click().catch(() => {});

        const topic = controllerPage.getByPlaceholder(/type your topic/i);
        await topic.fill("remote work etiquette").catch(() => {});

        const lockItIn = controllerPage.getByRole("button", { name: /lock it in/i });
        await lockItIn.click().catch(() => {});

        await controllerPage
          .getByText(/topic submitted/i)
          .waitFor({ state: "visible", timeout: 10_000 })
          .catch(() => {});
        continue;
      }

      const submit = controllerPage.getByRole("button", { name: /^submit$/i });
      if (await submit.isVisible().catch(() => false)) {
        await submit.click();
        votesSubmitted++;

        // Timer scaling can make the "Submitted!" state brief, so just wait for the button to go away.
        await submit.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
        continue;
      }

      await controllerPage.waitForTimeout(100);
    }

    return votesSubmitted;
  };

  const controllerRuns = Promise.all([
    playController(c1.controllerPage),
    playController(c2.controllerPage),
    playController(c3.controllerPage),
  ]);

  // Results view may be brief with timer scaling, so wait for it to appear at least once.
  await page.waitForFunction(() => document.body.innerText.includes("THE RESULTS"), null, {
    timeout: 30_000,
  });

  await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
    timeout: 60_000,
  });
  gameOver = true;

  const [votes1, votes2, votes3] = await controllerRuns;
  expect(votes1).toBeGreaterThan(0);
  expect(votes2).toBeGreaterThan(0);
  expect(votes3).toBeGreaterThan(0);

  await expect(page.getByRole("heading", { name: /^FINAL SCORES$/ })).toBeVisible();
  await expect(page.getByText("Alice")).toBeVisible();
  await expect(page.getByText("Bob")).toBeVisible();
  await expect(page.getByText("Casey")).toBeVisible();

  await c1.context.close();
  await c2.context.close();
  await c3.context.close();
});
