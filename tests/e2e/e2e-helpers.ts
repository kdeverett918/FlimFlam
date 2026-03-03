import { type Browser, type BrowserContext, type Page, expect } from "@playwright/test";

const BRAIN_BOARD_CLUE_SELECTOR = 'button[aria-label*=" for "]:enabled';

/* ------------------------------------------------------------------ */
/*  High-level helpers added for comprehensive E2E coverage            */
/* ------------------------------------------------------------------ */

/**
 * One-call setup: navigate → health check → create room → join players → select game → start.
 */
export async function startGame(
  page: Page,
  browser: Browser,
  opts: {
    game: string;
    complexity?: "kids" | "standard" | "advanced";
    playerNames: string[];
  },
): Promise<{ code: string; controllers: JoinedController[] }> {
  await page.goto("/");
  await waitForColyseusHealthy(page);
  const { code } = await createRoom(page);
  const controllers = await joinControllersForRoom(browser, page, code, opts.playerNames);
  await selectGameAndStart(page, {
    gameName: opts.game,
    complexity: opts.complexity ?? "kids",
  });
  return { code, controllers };
}

/**
 * Click Skip repeatedly until `text` appears on the host page.
 */
export async function skipToPhase(
  page: Page,
  text: string | RegExp,
  maxSkips = 200,
): Promise<void> {
  const pattern =
    typeof text === "string" ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : text;
  for (let i = 0; i < maxSkips; i++) {
    if (
      await page
        .getByText(pattern)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }
    const skipButton = page.getByRole("button", { name: /^skip$/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      // Brief pause then recheck target — catches transient phases
      await page.waitForTimeout(100);
      if (
        await page
          .getByText(pattern)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return;
      }
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Timed out before reaching phase with text: ${String(pattern)}`);
}

/**
 * Fill a TextInput and click Submit on a controller page.
 */
export async function submitTextAnswer(controllerPage: Page, answer: string): Promise<void> {
  const textbox = controllerPage.getByRole("textbox").first();
  await expect(textbox).toBeVisible({ timeout: 10_000 });
  await textbox.fill(answer);
  await controllerPage
    .getByRole("button", { name: /^submit$/i })
    .first()
    .click();
}

/**
 * Fill an input and click Guess (lightning round / quick-guess).
 * Waits for the "Sent" confirmation and the 350ms component throttle to clear.
 */
export async function submitQuickGuess(controllerPage: Page, answer: string): Promise<void> {
  const textbox = controllerPage.getByRole("textbox").first();
  await expect(textbox).toBeVisible({ timeout: 10_000 });
  await textbox.fill(answer);
  await controllerPage
    .getByRole("button", { name: /^guess$/i })
    .first()
    .click();
  // QuickGuessInput has a 350ms throttle — wait for it to clear
  await controllerPage.waitForTimeout(400);
}

/**
 * Poll controllers to find all that currently have a visible textbox (for face-off).
 */
export async function findFaceOffPlayers(
  controllerPages: Page[],
  expectedCount = 2,
  timeoutMs = 20_000,
): Promise<Page[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found: Page[] = [];
    for (const cp of controllerPages) {
      const textbox = cp.getByRole("textbox").first();
      if (await textbox.isVisible().catch(() => false)) {
        found.push(cp);
      }
    }
    if (found.length >= expectedCount) return found;
    await controllerPages[0]?.waitForTimeout(150);
  }
  throw new Error(`Timed out waiting for ${expectedCount} face-off players`);
}

/**
 * Poll controllers to find the one with the active guess/submit input.
 */
export async function findActiveGuesser(
  controllerPages: Page[],
  timeoutMs = 15_000,
): Promise<Page> {
  return findControllerWithButton(controllerPages, /^submit$/i, timeoutMs);
}

/**
 * Close all controller browser contexts.
 */
export async function closeAllControllers(controllers: JoinedController[]): Promise<void> {
  for (const controller of controllers) {
    await controller.context.close();
  }
}

export const CONTROLLER_URL = process.env.FLIMFLAM_E2E_CONTROLLER_URL ?? "http://127.0.0.1:3301";
export const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:3567/health";

export const DEFAULT_MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

export type JoinedController = { context: BrowserContext; controllerPage: Page };

export async function waitForColyseusHealthy(page: Page, url = COLYSEUS_HEALTH_URL): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          const res = await page.request.get(url);
          return res.status();
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 },
    )
    .toBe(200);
}

export async function createRoom(page: Page): Promise<{ code: string }> {
  // The homepage has two "CREATE ROOM" CTAs with the same aria-label.
  // Use the accessible name (not the visible text) and click the first CTA.
  const createRoomButton = page.getByRole("button", { name: /create a new game room/i }).first();
  await expect(createRoomButton).toBeVisible({ timeout: 30_000 });
  await expect(createRoomButton).toBeEnabled();
  await createRoomButton.click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/, { timeout: 60_000 });

  const match = page.url().match(/\/room\/([A-Z0-9]{4})$/);
  if (!match) {
    throw new Error(`[e2e] expected room code in URL, got: ${page.url()}`);
  }

  return { code: match[1] ?? "" };
}

export async function joinControllerForRoom(
  browser: Browser,
  hostPage: Page,
  {
    code,
    name,
    controllerUrl = CONTROLLER_URL,
  }: { code: string; name: string; controllerUrl?: string },
): Promise<JoinedController> {
  const context = await browser.newContext({ viewport: DEFAULT_MOBILE_VIEWPORT });
  const controllerPage = await context.newPage();
  const joinUrl = `${controllerUrl}/?code=${code}`;

  let joined = false;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    await controllerPage.goto(joinUrl);
    await controllerPage.getByLabel("Your Name").fill(name);
    await controllerPage.getByRole("button", { name: /^join$/i }).click();

    try {
      await expect(controllerPage).toHaveURL(/\/play$/, { timeout: 20_000 });
      await expect(hostPage.getByText(name, { exact: true })).toBeVisible({ timeout: 20_000 });
      joined = true;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await controllerPage.waitForTimeout(600);
      }
    }
  }

  if (!joined) {
    throw lastError instanceof Error ? lastError : new Error("Controller failed to join room");
  }

  // Ensure we actually landed in a connected /play state (not a transient redirect).
  await expect(controllerPage.getByText(/^connecting\.\.\.$/i)).toHaveCount(0, { timeout: 60_000 });

  // Avoid strict-mode collisions like "Eve" matching "everyone" in card copy.
  await expect(hostPage.getByText(name, { exact: true })).toBeVisible({ timeout: 30_000 });
  return { context, controllerPage };
}

export async function joinControllersForRoom(
  browser: Browser,
  hostPage: Page,
  code: string,
  names: string[],
): Promise<JoinedController[]> {
  const joined: JoinedController[] = [];
  for (const name of names) {
    joined.push(await joinControllerForRoom(browser, hostPage, { code, name }));
  }
  return joined;
}

export async function selectGameAndStart(
  hostPage: Page,
  {
    gameName,
    complexity = "kids",
  }: { gameName: string; complexity?: "kids" | "standard" | "advanced" },
): Promise<void> {
  await hostPage
    .getByRole("button", { name: new RegExp(`^${escapeRegex(gameName)}$`, "i") })
    .click();
  await hostPage
    .getByRole("button", { name: new RegExp(`^${escapeRegex(complexity)}`, "i") })
    .click();

  const startButton = hostPage.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled({ timeout: 30_000 });
  await startButton.click();
}

export async function forceToFinalScores(hostPage: Page, maxSkips = 120): Promise<void> {
  for (let i = 0; i < maxSkips; i++) {
    if (
      await hostPage
        .getByRole("heading", { name: /final scores/i })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }

    await hostPage.waitForTimeout(250);
  }

  throw new Error("Timed out before reaching final scores");
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

export async function findControllerWithButton(
  controllerPages: Page[],
  buttonName: RegExp,
  timeoutMs = 15_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const page of controllerPages) {
      const button = page.getByRole("button", { name: buttonName }).first();
      if (await button.isVisible().catch(() => false)) {
        return page;
      }
    }
    await controllerPages[0]?.waitForTimeout(150);
  }
  throw new Error(`Timed out waiting for button ${buttonName.toString()} on any controller`);
}

export async function findBrainBoardSelectorController(
  controllerPages: Page[],
  timeoutMs = 20_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const controller of controllerPages) {
      const clueButton = controller.locator(BRAIN_BOARD_CLUE_SELECTOR).first();
      if (await clueButton.isVisible().catch(() => false)) {
        return controller;
      }
    }
    await controllerPages[0]?.waitForTimeout(150);
  }
  throw new Error("Timed out waiting for Brain Board selector controller");
}

export async function driveBrainBoardToPhase(
  hostPage: Page,
  controllerPages: Page[],
  text: string | RegExp,
  maxSteps = 900,
): Promise<void> {
  const pattern =
    typeof text === "string" ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : text;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });

  for (let step = 0; step < maxSteps; step++) {
    if (
      await hostPage
        .getByText(pattern)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    let acted = false;

    for (const controller of controllerPages) {
      const clueButton = controller.locator(BRAIN_BOARD_CLUE_SELECTOR).first();
      if (await clueButton.isVisible().catch(() => false)) {
        await clueButton.click().catch(() => {});
        acted = true;
        break;
      }
    }
    if (acted) {
      await hostPage.waitForTimeout(150);
      continue;
    }

    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      acted = true;
    }

    await hostPage.waitForTimeout(acted ? 120 : 220);
  }

  throw new Error(`Timed out before reaching Brain Board phase with text: ${String(pattern)}`);
}

export async function driveBrainBoardToFinalScores(
  hostPage: Page,
  controllerPages: Page[],
): Promise<void> {
  await driveBrainBoardToPhase(hostPage, controllerPages, /final scores/i, 1_200);
  await expect(hostPage.getByRole("heading", { name: /final scores/i }).first()).toBeVisible({
    timeout: 20_000,
  });
}

export async function driveSurveySmashKidsToFinalScores(
  hostPage: Page,
  controllerPages: Page[],
): Promise<void> {
  await driveSurveySmashToFinalScores(hostPage, controllerPages);
}

export async function driveSurveySmashToFinalScores(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 120_000,
): Promise<void> {
  const finalScoresHeading = hostPage.getByRole("heading", { name: /final scores/i }).first();
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await finalScoresHeading.isVisible().catch(() => false)) {
      return;
    }

    const submitted = await submitSurveySmashInput(controllerPages, "e2e-final");
    if (submitted) {
      await hostPage.waitForTimeout(200);
      continue;
    }

    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click().catch(() => {});
    }
    await hostPage.waitForTimeout(250);
  }

  await expect(finalScoresHeading).toBeVisible({ timeout: 10_000 });
}

export async function driveSurveySmashToRoundResult(
  hostPage: Page,
  controllerPages: Page[],
  targetRound: number,
): Promise<void> {
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const finalScoresHeading = hostPage.getByRole("heading", { name: /final scores/i }).first();

  for (let round = 1; round <= targetRound; round++) {
    const roundResultHeading = hostPage
      .getByRole("heading", { name: new RegExp(`^round ${round} complete!?$`, "i") })
      .first();
    const deadline = Date.now() + 80_000;

    while (Date.now() < deadline) {
      if (await roundResultHeading.isVisible().catch(() => false)) {
        break;
      }

      if (await finalScoresHeading.isVisible().catch(() => false)) {
        if (round === targetRound) return;
      }

      const submitted = await submitSurveySmashInput(controllerPages, `e2e-r${round}`);
      if (submitted) {
        await hostPage.waitForTimeout(200);
        continue;
      }

      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click().catch(() => {});
      }
      await hostPage.waitForTimeout(250);
    }

    await expect(roundResultHeading).toBeVisible({ timeout: 10_000 });
    // round-result -> next round
    if (round < targetRound) {
      await expect(skipButton).toBeVisible({ timeout: 10_000 });
      await skipButton.click();
    }
  }
}

async function submitSurveySmashInput(controllerPages: Page[], seed: string): Promise<boolean> {
  let submitted = false;

  // Submit for ALL controllers with visible textboxes (face-off needs 2 submissions)
  for (const controllerPage of controllerPages) {
    const textbox = controllerPage.getByRole("textbox").first();
    if (!(await textbox.isVisible().catch(() => false))) continue;

    const answer = `${seed}-${Math.floor(Math.random() * 1_000_000)}`;
    await textbox.fill(answer).catch(() => {});

    const submitButton = controllerPage.getByRole("button", { name: /^submit$/i }).first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click().catch(() => {});
      submitted = true;
      continue;
    }

    const guessButton = controllerPage.getByRole("button", { name: /^guess$/i }).first();
    if (await guessButton.isVisible().catch(() => false)) {
      await guessButton.click().catch(() => {});
      submitted = true;
    }
  }

  return submitted;
}

export async function driveSurveySmashToPhase(
  hostPage: Page,
  controllerPages: Page[],
  text: string | RegExp,
  timeoutMs = 120_000,
): Promise<void> {
  const pattern =
    typeof text === "string" ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : text;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (
      await hostPage
        .getByText(pattern)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    const submitted = await submitSurveySmashInput(controllerPages, "e2e-phase");
    if (submitted) {
      await hostPage.waitForTimeout(200);
      continue;
    }

    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click().catch(() => {});
    }
    await hostPage.waitForTimeout(250);
  }

  throw new Error(`Timed out before reaching Survey Smash phase with text: ${String(pattern)}`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
