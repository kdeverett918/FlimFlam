import {
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  expect,
} from "@playwright/test";

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
  await expect(textbox).toBeVisible({ timeout: 20_000 });
  await textbox.fill(answer);
  const submitButton = controllerPage.getByRole("button", { name: /^submit$/i }).first();
  await expect(submitButton).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(async () => submitButton.isEnabled().catch(() => false), {
      timeout: 10_000,
    })
    .toBe(true);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await submitButton.click({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      await controllerPage.waitForTimeout(180);
    }
  }
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
  const deadline = Date.now() + timeoutMs;
  let fallback: Page | null = null;

  while (Date.now() < deadline) {
    for (const page of controllerPages) {
      if (page.isClosed()) continue;
      const textbox = page.getByRole("textbox").first();
      if (!(await textbox.isVisible().catch(() => false))) continue;

      const submitButton = page.getByRole("button", { name: /^submit$/i }).first();
      const guessButton = page.getByRole("button", { name: /^guess$/i }).first();
      const submitVisible = await submitButton.isVisible().catch(() => false);
      const guessVisible = await guessButton.isVisible().catch(() => false);
      const submitEnabled = submitVisible && (await submitButton.isEnabled().catch(() => false));
      const guessEnabled = guessVisible && (await guessButton.isEnabled().catch(() => false));
      if (submitEnabled || guessEnabled) {
        return page;
      }
      if (submitVisible || guessVisible) {
        fallback = page;
      }
    }

    if (fallback) return fallback;
    await controllerPages[0]?.waitForTimeout(150);
  }

  throw new Error("Timed out waiting for active Survey Smash guesser");
}

/**
 * Close all controller browser contexts.
 */
export async function closeAllControllers(controllers: JoinedController[]): Promise<void> {
  const closeWithTimeout = async (context: BrowserContext, timeoutMs = 4_000): Promise<void> => {
    await Promise.race([
      context.close().catch(() => {}),
      new Promise<void>((resolve) => {
        setTimeout(resolve, timeoutMs);
      }),
    ]);
  };

  for (const controller of controllers) {
    await closeWithTimeout(controller.context);
  }
}

export const APP_URL = process.env.FLIMFLAM_E2E_HOST_URL ?? "http://127.0.0.1:5310";
/** @deprecated Use APP_URL instead — kept for backward compatibility */
export const HOST_URL = APP_URL;
export const COLYSEUS_HEALTH_URL =
  process.env.FLIMFLAM_E2E_COLYSEUS_HEALTH_URL ?? "http://127.0.0.1:5567/health";

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

export async function waitForHostHealthy(page: Page, url = APP_URL): Promise<void> {
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

const HOST_SESSION_KEYS = ["flimflam_reconnect_token", "flimflam_room_code"] as const;

const TRANSIENT_PAGE_CONTEXT_ERROR =
  /Execution context was destroyed|Cannot find context with specified id|Most likely the page has been closed/i;

async function clearHostReconnectStorage(page: Page): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await page.evaluate((keys) => {
        for (const key of keys) {
          try {
            window.sessionStorage.removeItem(key);
          } catch {}
          try {
            window.localStorage.removeItem(key);
          } catch {}
        }
      }, HOST_SESSION_KEYS);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransient = TRANSIENT_PAGE_CONTEXT_ERROR.test(message);
      if (!isTransient || attempt === 4) {
        if (!isTransient) {
          throw error;
        }
        return;
      }
      await page.waitForTimeout(120);
    }
  }
}

async function waitForHostLobbyReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}(?:[/?#]|$)/, { timeout: 20_000 });
  await expect
    .poll(
      async () =>
        (await page
          .getByRole("button", { name: /^brain board$/i })
          .first()
          .isVisible()) ||
        (await page
          .getByRole("button", { name: /^survey smash$/i })
          .first()
          .isVisible()) ||
        (await page
          .getByRole("button", { name: /^lucky letters$/i })
          .first()
          .isVisible()),
      { timeout: 20_000 },
    )
    .toBe(true);
}

export async function createRoom(page: Page): Promise<{ code: string }> {
  await waitForHostHealthy(page);
  await page.context().clearCookies();

  // Avoid reconnecting to stale rooms across retries/specs.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await clearHostReconnectStorage(page);

  for (let attempt = 1; attempt <= 4; attempt++) {
    if (attempt > 1) {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await clearHostReconnectStorage(page);
    }

    // Fill host name input before clicking create
    const hostNameInput = page.locator("#host-name").first();
    if (await hostNameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await hostNameInput.fill("Host");
    }

    // Home CTA naming can vary between aria-label and visible text across builds.
    const candidates: Locator[] = [
      page.getByTestId("create-room-cta").first(),
      page.getByRole("button", { name: /create a new game room/i }).first(),
      page.getByRole("button", { name: /^create room$/i }).first(),
      page.getByRole("button", { name: /^create game$/i }).first(),
    ];

    let createRoomButton: Locator | null = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 3_000 }).catch(() => false)) {
        createRoomButton = candidate;
        break;
      }
    }

    if (createRoomButton) {
      await expect(createRoomButton).toBeEnabled({ timeout: 10_000 });
      await createRoomButton.click();
    } else {
      await page.goto(`/room/new?e2e_retry=${attempt}`, { waitUntil: "domcontentloaded" });
    }

    // If CTA click did not navigate due transient hydration hiccup, force the create route.
    if (/\/$/.test(page.url())) {
      // The CTA click may have initiated a navigation that hasn't committed yet; avoid overlapping
      // navigations that manifest as `net::ERR_ABORTED` flake in Playwright.
      await page.waitForURL(/\/room\/new(?:[/?#]|$)/, { timeout: 2_000 }).catch(() => {});
    }

    if (/\/$/.test(page.url())) {
      try {
        await page.goto(`/room/new?e2e_force=${attempt}`, { waitUntil: "domcontentloaded" });
      } catch (error) {
        if (String(error).includes("net::ERR_ABORTED")) {
          // Overlapping navigation aborted; allow the poll loop below to continue and recover.
        } else {
          throw error;
        }
      }
    }

    const deadline = Date.now() + 45_000;
    let lastNudgeAt = Date.now();
    while (Date.now() < deadline) {
      const codeFromUrl = extractRoomCodeFromUrl(page.url());
      if (codeFromUrl) {
        await waitForHostLobbyReady(page);
        return { code: codeFromUrl };
      }

      if (Date.now() - lastNudgeAt > 6_000 && /\/room\/new(?:[/?#]|$)/.test(page.url())) {
        // Re-trigger room creation effect if app got stuck on /room/new.
        await page.reload({ waitUntil: "domcontentloaded" });
        lastNudgeAt = Date.now();
      }

      await page.waitForTimeout(150);
    }
  }

  throw new Error(`[e2e] expected room code in URL after retries, got: ${page.url()}`);
}

export async function joinPlayerForRoom(
  browser: Browser,
  hostPage: Page,
  { code, name }: { code: string; name: string },
): Promise<JoinedController> {
  const ensureNameInputValue = async (nameInput: Locator, targetName: string): Promise<void> => {
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await expect(nameInput).toBeEditable({ timeout: 15_000 });

    await nameInput.fill(targetName);
    const directValue = await nameInput.inputValue().catch(() => "");
    if (directValue.trim() === targetName) {
      return;
    }

    // Hydration/input binding can drop the initial fill; replay key events before retrying join.
    await nameInput.fill("");
    await nameInput.pressSequentially(targetName, { delay: 20 });
    await expect
      .poll(async () => (await nameInput.inputValue().catch(() => "")).trim(), {
        timeout: 5_000,
      })
      .toBe(targetName);
  };

  await waitForHostHealthy(hostPage);

  const normalizedCode = code.toUpperCase();

  let joined = false;
  let lastError: unknown = null;
  let context: BrowserContext | null = null;
  let controllerPage: Page | null = null;

  const maxJoinAttempts = 7;
  for (let attempt = 1; attempt <= maxJoinAttempts; attempt++) {
    try {
      if (context) {
        await (context as BrowserContext).close().catch(() => {});
      }
      context = await browser.newContext({ viewport: DEFAULT_MOBILE_VIEWPORT });
      controllerPage = await context.newPage();

      // Navigate to the unified app landing page
      await controllerPage.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
      await expect(controllerPage.getByLabel("Room code character 1")).toBeVisible({
        timeout: 15_000,
      });
      await expect(controllerPage.getByRole("button", { name: /^join$/i })).toBeVisible({
        timeout: 15_000,
      });
      const avatarOptions = controllerPage.locator('button[aria-label^="Select color:"]');
      await expect(avatarOptions.first()).toBeVisible({ timeout: 15_000 });

      const codeInputs: Locator[] = [];
      for (let i = 0; i < 4; i++) {
        codeInputs.push(controllerPage.getByLabel(`Room code character ${i + 1}`).first());
      }
      for (let i = 0; i < 4; i++) {
        const codeInput = codeInputs[i] as Locator;
        await codeInput.fill(normalizedCode[i] ?? "");
        await expect(codeInput).toHaveValue(normalizedCode[i] ?? "");
      }
      const nameInput = controllerPage.getByLabel("Your Name").first();
      await ensureNameInputValue(nameInput, name);

      const joinButton = controllerPage.getByRole("button", { name: /^join$/i });
      if (!(await joinButton.isEnabled().catch(() => false))) {
        // Hydration/input-binding race fallback: replay real key events.
        for (let i = 0; i < 4; i++) {
          const codeInput = codeInputs[i] as Locator;
          await codeInput.click();
          await codeInput.fill("");
          const next = normalizedCode[i] ?? "";
          if (next) {
            await codeInput.pressSequentially(next, { delay: 30 });
          }
        }

        await ensureNameInputValue(nameInput, name);

        if (
          !(await controllerPage
            .locator('button[aria-pressed="true"]')
            .first()
            .isVisible()
            .catch(() => false))
        ) {
          await avatarOptions.first().click();
        }
      }

      await expect
        .poll(
          async () => {
            if (!(await joinButton.isEnabled().catch(() => false))) return false;

            for (let i = 0; i < 4; i++) {
              const value = await codeInputs[i]?.inputValue().catch(() => "");
              if (value !== (normalizedCode[i] ?? "")) return false;
            }

            const nameValue = await nameInput.inputValue().catch(() => "");
            if (nameValue.trim() !== name) return false;

            return (controllerPage as Page)
              .locator('button[aria-pressed="true"]')
              .first()
              .isVisible()
              .catch(() => false);
          },
          { timeout: 20_000 },
        )
        .toBe(true);
      await joinButton.click();
      await expect(controllerPage).toHaveURL(/\/room\/[A-Z0-9]{4}(?:[/?#]|$)/, { timeout: 30_000 });
      await expect(hostPage.getByText(name, { exact: true })).toBeVisible({ timeout: 45_000 });
      joined = true;
      break;
    } catch (error) {
      lastError = error;
      if (context) {
        await context.close().catch(() => {});
        context = null;
        controllerPage = null;
      }
      if (attempt < maxJoinAttempts) {
        await hostPage.waitForTimeout(1_000).catch(() => {});
      }
    }
  }

  if (!joined || !context || !controllerPage) {
    throw lastError instanceof Error ? lastError : new Error("Player failed to join room");
  }

  // Avoid strict-mode collisions like "Eve" matching "everyone" in card copy.
  await expect(hostPage.getByText(name, { exact: true })).toBeVisible({ timeout: 30_000 });
  return { context, controllerPage };
}

/** @deprecated Use joinPlayerForRoom instead */
export const joinControllerForRoom = joinPlayerForRoom;

export async function joinControllersForRoom(
  browser: Browser,
  hostPage: Page,
  code: string,
  names: string[],
): Promise<JoinedController[]> {
  const joined: JoinedController[] = [];
  for (const name of names) {
    joined.push(await joinPlayerForRoom(browser, hostPage, { code, name }));
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

export async function forceToFinalScores(hostPage: Page, maxSkips = 300): Promise<void> {
  for (let i = 0; i < maxSkips; i++) {
    // Check for final scores heading
    if (
      await hostPage
        .getByRole("heading", { name: /final scores/i })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    // Also check for Restart button (only renders at phase === "final-scores")
    if (
      await hostPage
        .getByRole("button", { name: /^restart$/i })
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    // If error page appears, click TRY AGAIN to recover
    const tryAgainBtn = hostPage.getByRole("button", { name: /try again/i });
    if (await tryAgainBtn.isVisible().catch(() => false)) {
      await tryAgainBtn.click();
      await hostPage.waitForTimeout(1000);
      continue;
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

/**
 * Find the Brain Board selector page, including the host page (unified app:
 * host is also a player and can be the selector).
 */
export async function findBrainBoardSelector(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 20_000,
): Promise<Page> {
  const allPages = [hostPage, ...controllerPages];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const pg of allPages) {
      const clueButton = pg.locator(BRAIN_BOARD_CLUE_SELECTOR).first();
      if (await clueButton.isVisible().catch(() => false)) {
        return pg;
      }
    }
    await hostPage.waitForTimeout(150);
  }
  throw new Error("Timed out waiting for Brain Board selector (host or controller)");
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

    // Check host page AND controller pages for clue buttons (unified app:
    // host is also a player and can be the selector).
    for (const pg of [hostPage, ...controllerPages]) {
      const clueButton = pg.locator(BRAIN_BOARD_CLUE_SELECTOR).first();
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
      await hostPage.waitForTimeout(200).catch(() => {});
      continue;
    }

    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click().catch(() => {});
    }
    await hostPage.waitForTimeout(250).catch(() => {});
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
        await hostPage.waitForTimeout(200).catch(() => {});
        continue;
      }

      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click().catch(() => {});
      }
      await hostPage.waitForTimeout(250).catch(() => {});
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
  for (let index = 0; index < controllerPages.length; index += 1) {
    const controllerPage = controllerPages[index];
    if (!controllerPage || controllerPage.isClosed()) continue;

    const textbox = controllerPage.getByRole("textbox").first();
    if (!(await textbox.isVisible().catch(() => false))) continue;

    const answer = `${seed}-${index}-${Math.floor(Math.random() * 1_000_000)}`;
    await textbox.fill(answer).catch(() => {});

    const submitButton = controllerPage.getByRole("button", { name: /^submit$/i }).first();
    const submitVisible = await submitButton.isVisible().catch(() => false);
    const submitEnabled = submitVisible && (await submitButton.isEnabled().catch(() => false));
    if (submitVisible && submitEnabled) {
      const clicked = await submitButton
        .click()
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        submitted = true;
        continue;
      }
    }

    const guessButton = controllerPage.getByRole("button", { name: /^guess$/i }).first();
    const guessVisible = await guessButton.isVisible().catch(() => false);
    const guessEnabled = guessVisible && (await guessButton.isEnabled().catch(() => false));
    if (guessVisible && guessEnabled) {
      const clicked = await guessButton
        .click()
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        submitted = true;
      }
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
  const targetNeedsRevealBoard = /\bthe people say\b/i.test(String(pattern));
  const matchesTarget = async () => {
    const hasTargetText = await hostPage
      .getByText(pattern)
      .first()
      .isVisible()
      .catch(() => false);
    if (hasTargetText) return true;

    if (!targetNeedsRevealBoard) return false;

    const hasRevealBoard = await hostPage
      .locator('[data-testid="survey-answer-board"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasRevealBoard) return false;

    return hostPage
      .locator('[data-testid="survey-reveal-step"]')
      .first()
      .isVisible()
      .catch(() => false);
  };

  while (Date.now() < deadline) {
    if (hostPage.isClosed()) {
      throw new Error(`Survey Smash host page closed before phase: ${String(pattern)}`);
    }

    if (await matchesTarget()) {
      return;
    }

    const submitted = await submitSurveySmashInput(controllerPages, "e2e-phase");
    if (submitted) {
      await hostPage.waitForTimeout(160).catch(() => {});
      if (await matchesTarget()) {
        return;
      }
      continue;
    }

    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click().catch(() => {});
      if (await matchesTarget()) {
        return;
      }
    }
    await hostPage.waitForTimeout(220).catch(() => {});
  }

  throw new Error(`Timed out before reaching Survey Smash phase with text: ${String(pattern)}`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractRoomCodeFromUrl(rawUrl: string): string | null {
  const match = rawUrl.match(/\/room\/([A-Z0-9]{4})(?:[/?#]|$)/);
  return match?.[1] ?? null;
}
