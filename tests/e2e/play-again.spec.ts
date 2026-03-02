import { expect, test } from "@playwright/test";

const CONTROLLER_URL = process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";
const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:2567/health";

test.describe("Play Again / New Game flow", () => {
  test("final scores shows Play Again and New Game buttons, Play Again restarts game", async ({
    page,
    browser,
  }) => {
    await page.goto("/");

    // Ensure the Colyseus server is ready.
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

    // Create room.
    await page.getByRole("button", { name: /create room/i }).click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

    const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
    expect(match).not.toBeNull();
    const code = match?.[1] ?? "";

    // Helper to join a controller.
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

    // Select Hot Take (no AI needed) and start.
    await page.getByRole("button", { name: /hot take/i }).click();
    await page.getByRole("button", { name: /^kids/i }).click();

    const startButton = page.getByRole("button", { name: /start game/i });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    let gameOver = false;

    // Play through the game on each controller.
    const playController = async (controllerPage: typeof page) => {
      const deadline = Date.now() + 60_000;

      while (!gameOver && Date.now() < deadline) {
        // Handle topic-setup phase (player input mode).
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
          await submit.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
          continue;
        }

        await controllerPage.waitForTimeout(100);
      }
    };

    const controllerRuns = Promise.all([
      playController(c1.controllerPage),
      playController(c2.controllerPage),
      playController(c3.controllerPage),
    ]);

    // Wait for final scores.
    await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
      timeout: 60_000,
    });
    gameOver = true;
    await controllerRuns;

    // Verify the final scores screen shows Play Again and New Game buttons.
    const playAgainBtn = page.getByRole("button", { name: /play again/i });
    const newGameBtn = page.getByRole("button", { name: /new game/i });

    await expect(playAgainBtn).toBeVisible({ timeout: 10_000 });
    await expect(newGameBtn).toBeVisible({ timeout: 10_000 });

    // Click "Play Again" — should restart the game (leave final-scores).
    await playAgainBtn.click();

    // After restart, the game should go back to an active phase (not lobby, not final-scores).
    // The host should stop showing "FINAL SCORES".
    await expect(page.getByRole("heading", { name: /^FINAL SCORES$/ })).toHaveCount(0, {
      timeout: 30_000,
    });

    await c1.context.close();
    await c2.context.close();
    await c3.context.close();
  });

  test("New Game button returns to lobby", async ({ page, browser }) => {
    await page.goto("/");

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

    const c1 = await joinController("Dan");
    const c2 = await joinController("Eve");
    const c3 = await joinController("Faye");

    // Start a Hot Take game.
    await page.getByRole("button", { name: /hot take/i }).click();
    await page.getByRole("button", { name: /^kids/i }).click();

    const startButton = page.getByRole("button", { name: /start game/i });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    let gameOver = false;

    const playController = async (controllerPage: typeof page) => {
      const deadline = Date.now() + 60_000;

      while (!gameOver && Date.now() < deadline) {
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
          await topic.fill("breakfast vs dinner").catch(() => {});
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
          await submit.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
          continue;
        }

        await controllerPage.waitForTimeout(100);
      }
    };

    const controllerRuns = Promise.all([
      playController(c1.controllerPage),
      playController(c2.controllerPage),
      playController(c3.controllerPage),
    ]);

    await page.waitForFunction(() => document.body.innerText.includes("FINAL SCORES"), null, {
      timeout: 60_000,
    });
    gameOver = true;
    await controllerRuns;

    // Click "New Game" — should return to lobby.
    const newGameBtn = page.getByRole("button", { name: /new game/i });
    await expect(newGameBtn).toBeVisible({ timeout: 10_000 });
    await newGameBtn.click();

    // Should return to the lobby — game selector buttons and complexity picker should be visible again.
    await expect(page.getByRole("button", { name: /^kids/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /standard/i })).toBeVisible();
    await expect(page.getByText("PLAYERS")).toBeVisible();

    await c1.context.close();
    await c2.context.close();
    await c3.context.close();
  });
});
