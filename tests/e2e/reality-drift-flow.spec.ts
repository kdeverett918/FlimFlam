import { type Page, expect, test } from "@playwright/test";

import { createRoom, joinControllerForRoom, waitForColyseusHealthy } from "./e2e-helpers";

test("reality drift game completes end-to-end", async ({ page, browser }) => {
  await page.goto("/");

  await waitForColyseusHealthy(page);
  const { code } = await createRoom(page);

  const c1 = await joinControllerForRoom(browser, page, { code, name: "Alice" });
  const c2 = await joinControllerForRoom(browser, page, { code, name: "Bob" });
  const c3 = await joinControllerForRoom(browser, page, { code, name: "Casey" });

  // Select game and set difficulty.
  await page.getByRole("button", { name: /reality drift/i }).click();
  await page.getByRole("button", { name: /^kids/i }).click();

  // Start game.
  const startButton = page.getByRole("button", { name: /start the game/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  const waitForAnswerPhase = async (controllerPage: Page) => {
    await expect
      .poll(async () => {
        const hasVoteConfirm = await controllerPage
          .getByRole("button", { name: /confirm vote/i })
          .isVisible()
          .catch(() => false);
        const hasSubmit = await controllerPage
          .getByRole("button", { name: /^submit$/i })
          .isVisible()
          .catch(() => false);
        return hasVoteConfirm || hasSubmit;
      })
      .toBe(true);
  };

  const answerRound = async (controllerPage: Page) => {
    const confirmVote = controllerPage.getByRole("button", { name: /confirm vote/i });
    if (await confirmVote.isVisible().catch(() => false)) {
      // Option-based answer mode.
      await controllerPage.locator("button:not([disabled])").first().click();
      await confirmVote.click();
      return;
    }

    // Fallback: free-text answer mode.
    const textarea = controllerPage.locator("textarea");
    const submit = controllerPage.getByRole("button", { name: /^submit$/i });
    await textarea.waitFor({ timeout: 20_000 });
    await textarea.fill("test answer");
    await submit.click();
  };

  const driftCheck = async (controllerPage: Page, choice: "real" | "drift") => {
    const buttonName = choice === "drift" ? /^hallucination\b/i : /^real\b/i;
    await controllerPage.getByRole("button", { name: buttonName }).click();
    await controllerPage.getByRole("button", { name: /confirm vote/i }).click();
  };

  // Play 3 rounds (kids mode).
  for (let round = 1; round <= 3; round++) {
    await Promise.all([
      waitForAnswerPhase(c1.controllerPage),
      waitForAnswerPhase(c2.controllerPage),
      waitForAnswerPhase(c3.controllerPage),
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
