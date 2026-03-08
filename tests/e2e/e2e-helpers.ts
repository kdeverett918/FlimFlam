import {
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  expect,
} from "@playwright/test";

const BRAIN_BOARD_CLUE_SELECTOR = 'button[aria-label*=" for "]:enabled';

type SurveySmashHostState = {
  phase: string | null;
  round: number | null;
  totalRounds: number | null;
  strikes: number | null;
  currentGuesserIndex: number | null;
  faceOffSubmissions: number | null;
  revealedAnswerCount: number | null;
  lightningQuestionIndex: number | null;
};

type BrainBoardHostState = {
  phase: string | null;
  round: number | null;
};

type LuckyLettersHostState = {
  phase: string | null;
  round: number | null;
  totalRounds: number | null;
};

async function readSurveySmashHostState(hostPage: Page): Promise<SurveySmashHostState> {
  const stateRoot = hostPage.locator('[data-testid="survey-smash-host-state"]').first();
  const [
    phase,
    round,
    totalRounds,
    strikes,
    currentGuesserIndex,
    faceOffSubmissions,
    revealedAnswerCount,
    lightningQuestionIndex,
  ] = await Promise.all([
    stateRoot.getAttribute("data-phase").catch(() => null),
    stateRoot.getAttribute("data-round").catch(() => null),
    stateRoot.getAttribute("data-total-rounds").catch(() => null),
    stateRoot.getAttribute("data-strikes").catch(() => null),
    stateRoot.getAttribute("data-current-guesser-index").catch(() => null),
    stateRoot.getAttribute("data-faceoff-submissions").catch(() => null),
    stateRoot.getAttribute("data-revealed-answer-count").catch(() => null),
    stateRoot.getAttribute("data-lightning-question-index").catch(() => null),
  ]);

  const parseNumberAttr = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    phase,
    round: parseNumberAttr(round),
    totalRounds: parseNumberAttr(totalRounds),
    strikes: parseNumberAttr(strikes),
    currentGuesserIndex: parseNumberAttr(currentGuesserIndex),
    faceOffSubmissions: parseNumberAttr(faceOffSubmissions),
    revealedAnswerCount: parseNumberAttr(revealedAnswerCount),
    lightningQuestionIndex: parseNumberAttr(lightningQuestionIndex),
  };
}

async function readBrainBoardHostState(hostPage: Page): Promise<BrainBoardHostState> {
  const stateRoot = hostPage.locator('[data-testid="brain-board-host-state"]').first();
  const [phase, round] = await Promise.all([
    stateRoot.getAttribute("data-phase").catch(() => null),
    stateRoot.getAttribute("data-round").catch(() => null),
  ]);

  return {
    phase,
    round: round ? Number.parseInt(round, 10) : null,
  };
}

async function readLuckyLettersHostState(hostPage: Page): Promise<LuckyLettersHostState> {
  const stateRoot = hostPage.locator('[data-testid="lucky-host-state"]').first();
  const [phase, round, totalRounds] = await Promise.all([
    stateRoot.getAttribute("data-phase").catch(() => null),
    stateRoot.getAttribute("data-round").catch(() => null),
    stateRoot.getAttribute("data-total-rounds").catch(() => null),
  ]);

  const parseNumberAttr = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    phase,
    round: parseNumberAttr(round),
    totalRounds: parseNumberAttr(totalRounds),
  };
}

function canSubmitSurveySmashPhase(phase: string | null): boolean {
  return ["face-off", "guessing", "steal-chance", "lightning-round"].includes(phase ?? "");
}

function canSkipSurveySmashPhase(phase: string | null): boolean {
  return [
    "question-reveal",
    "face-off",
    "guessing",
    "steal-chance",
    "strike",
    "answer-reveal",
    "round-result",
    "lightning-round-reveal",
  ].includes(phase ?? "");
}

async function advanceSurveySmashWithSkip(
  hostPage: Page,
  skipButton: Locator,
  previousState: SurveySmashHostState,
): Promise<boolean> {
  if (!canSkipSurveySmashPhase(previousState.phase)) return false;
  if (!(await skipButton.isVisible().catch(() => false))) return false;

  await skipButton.click().catch(() => {});
  await expect
    .poll(
      async () => {
        const nextState = await readSurveySmashHostState(hostPage);
        return (
          nextState.phase !== previousState.phase ||
          nextState.round !== previousState.round ||
          nextState.totalRounds !== previousState.totalRounds ||
          nextState.strikes !== previousState.strikes ||
          nextState.currentGuesserIndex !== previousState.currentGuesserIndex ||
          nextState.faceOffSubmissions !== previousState.faceOffSubmissions ||
          nextState.revealedAnswerCount !== previousState.revealedAnswerCount ||
          nextState.lightningQuestionIndex !== previousState.lightningQuestionIndex
        );
      },
      { timeout: 5_000 },
    )
    .toBe(true)
    .catch(() => {});
  return true;
}

export async function waitForSurveySmashHostPhase(
  hostPage: Page,
  phase: string,
  timeoutMs = 15_000,
): Promise<void> {
  await expect
    .poll(async () => (await readSurveySmashHostState(hostPage)).phase, { timeout: timeoutMs })
    .toBe(phase);
}

async function waitForSurveySmashHostState(
  hostPage: Page,
  expected: { phase: string; round?: number },
  timeoutMs = 15_000,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const state = await readSurveySmashHostState(hostPage);
        return (
          state.phase === expected.phase &&
          (expected.round === undefined || state.round === expected.round)
        );
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

async function advanceSurveySmashToHostState(
  hostPage: Page,
  predicate: (state: SurveySmashHostState) => boolean,
  timeoutMs = 60_000,
  label = "target state",
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });

  while (Date.now() < deadline) {
    const state = await readSurveySmashHostState(hostPage);
    if (predicate(state)) {
      return;
    }

    const advanced = await advanceSurveySmashWithSkip(hostPage, skipButton, state).catch(
      () => false,
    );
    if (!advanced) {
      await hostPage.waitForTimeout(200);
    }
  }

  throw new Error(`Timed out advancing Survey Smash host to ${label}`);
}

// biome-ignore lint/correctness/noUnusedVariables: utility available for E2E tests
async function clickSurveySmashSkipAndWait(
  hostPage: Page,
  expected: { phase: string; round?: number },
  timeoutMs = 10_000,
): Promise<void> {
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  await expect(skipButton).toBeVisible({ timeout: timeoutMs });
  await skipButton.click();
  await waitForSurveySmashHostState(hostPage, expected, timeoutMs);
}

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
  await waitForHostHealthy(page);
  await gotoWithHostRetry(page, "/");
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

export async function driveSurveySmashToFaceOff(
  hostPage: Page,
  actorPages: Page[] = [hostPage],
  timeoutMs = 30_000,
): Promise<void> {
  await advanceSurveySmashToHostState(
    hostPage,
    (state) => state.round === 1 && state.phase === "face-off",
    timeoutMs,
    "face-off",
  );

  await expect
    .poll(
      async () => {
        const hostState = await readSurveySmashHostState(hostPage);
        if (hostState.phase !== "face-off") {
          return false;
        }

        const progressVisible = await hostPage
          .locator('[data-testid="submission-progress"]')
          .first()
          .isVisible()
          .catch(() => false);
        if (progressVisible) {
          return true;
        }

        for (const actorPage of actorPages) {
          if (actorPage.isClosed()) continue;
          const faceOffSurface = actorPage
            .locator('main [data-testid="survey-smash-faceoff-input"]')
            .first();
          if (await faceOffSurface.isVisible().catch(() => false)) {
            return true;
          }
        }

        return false;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

export async function driveSurveySmashToStealChance(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 90_000,
  options: { allowPastStealWindow?: boolean } = {},
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const actorPages = [hostPage, ...controllerPages];
  let missCounter = 0;

  while (Date.now() < deadline) {
    const state = await readSurveySmashHostState(hostPage);
    const advancedPastStealWindow =
      missCounter >= 3 &&
      (state.phase === "answer-reveal" ||
        state.phase === "round-result" ||
        state.phase === "final-scores");

    if (options.allowPastStealWindow && advancedPastStealWindow) {
      return false;
    }

    if (state.phase === "steal-chance") {
      await expect
        .poll(
          async () => {
            if (
              await hostPage
                .getByText(/snag/i)
                .first()
                .isVisible()
                .catch(() => false)
            ) {
              return true;
            }

            for (const actorPage of actorPages) {
              if (
                await actorPage
                  .locator('main [data-testid="survey-smash-steal-input"]')
                  .first()
                  .isVisible()
                  .catch(() => false)
              ) {
                return true;
              }
            }

            return false;
          },
          { timeout: 10_000 },
        )
        .toBe(true);
      return true;
    }

    if (state.phase === "face-off") {
      const submitted = await submitSurveySmashInput(actorPages, "e2e-faceoff");
      if (submitted) {
        await hostPage.waitForTimeout(250).catch(() => {});
        continue;
      }
    }

    if (state.phase === "guessing") {
      const guesser = await findStrictSurveySmashGuesser(actorPages, 2_000).catch(() => null);
      if (guesser) {
        await submitTextAnswer(guesser, `wrong-steal-${missCounter++}`).catch(() => {});
        await expect
          .poll(
            async () => {
              const nextState = await readSurveySmashHostState(hostPage);
              return (
                nextState.phase !== state.phase ||
                nextState.round !== state.round ||
                nextState.strikes !== state.strikes ||
                nextState.currentGuesserIndex !== state.currentGuesserIndex ||
                nextState.revealedAnswerCount !== state.revealedAnswerCount
              );
            },
            { timeout: 3_000 },
          )
          .toBe(true)
          .catch(() => {});
        continue;
      }
      await hostPage.waitForTimeout(250);
      continue;
    }

    // Never skip `strike` here. Survey Smash advances from the third strike into
    // `steal-chance`, but a host skip on `strike` jumps straight to round-result
    // and hides the steal window we are explicitly trying to verify.
    const safeSkipPhases = new Set(["question-reveal", "answer-reveal", "round-result"]);
    const advanced = safeSkipPhases.has(state.phase ?? "")
      ? await advanceSurveySmashWithSkip(hostPage, skipButton, state).catch(() => false)
      : false;
    if (!advanced) {
      await hostPage.waitForTimeout(250);
    }
  }

  throw new Error("Timed out advancing Survey Smash to steal-chance");
}

export async function driveSurveySmashToGuessing(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 90_000,
): Promise<void> {
  await advanceSurveySmashToHostState(
    hostPage,
    (state) => state.phase === "guessing",
    timeoutMs,
    "guessing",
  );

  await expect
    .poll(
      async () => {
        const hostGuessAlong = await hostPage
          .locator('[data-testid="guess-along-status"]')
          .first()
          .isVisible()
          .catch(() => false);
        if (hostGuessAlong) {
          return true;
        }

        for (const controllerPage of controllerPages) {
          const guesserSurface = controllerPage
            .locator('main [data-testid="survey-smash-guesser-input"]')
            .first();
          if (await guesserSurface.isVisible().catch(() => false)) {
            return true;
          }

          const guessAlongSurface = controllerPage
            .locator('main [data-testid="survey-smash-guess-along-input"]')
            .first();
          if (await guessAlongSurface.isVisible().catch(() => false)) {
            return true;
          }

          const contextCard = controllerPage
            .locator('main [data-testid="controller-context-card"]')
            .first();
          if (await contextCard.isVisible().catch(() => false)) {
            return true;
          }
        }

        return false;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
}

/**
 * Fill a TextInput and click Submit on a controller page.
 */
export async function submitTextAnswer(controllerPage: Page, answer: string): Promise<void> {
  const appRoot = controllerPage.locator("main");
  const scopedInputContainers = [
    '[data-testid="survey-smash-faceoff-input"]',
    '[data-testid="survey-smash-guesser-input"]',
    '[data-testid="survey-smash-steal-input"]',
    '[data-testid="survey-smash-guess-along-input"]',
  ];
  let inputScope: Locator = appRoot;

  for (const selector of scopedInputContainers) {
    const candidate = appRoot.locator(selector).first();
    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    const candidateTextbox = candidate.getByRole("textbox").first();
    if (await candidateTextbox.isVisible().catch(() => false)) {
      inputScope = candidate;
      break;
    }
  }

  const textbox = inputScope.getByRole("textbox").first();
  if (!(await textbox.isVisible().catch(() => false))) {
    await appRoot
      .evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      })
      .catch(() => {});
    await textbox.scrollIntoViewIfNeeded({ timeout: 1_500 }).catch(() => {});
  }
  await expect(textbox).toBeVisible({ timeout: 5_000 });
  await textbox.click({ timeout: 2_000 }).catch(() => {});
  await textbox.fill("", { timeout: 2_000 }).catch(() => {});
  await textbox.pressSequentially(answer, { delay: 20 }).catch(async () => {
    await textbox.type(answer, { delay: 20, timeout: 2_000 }).catch(async () => {
      await textbox.fill(answer, { timeout: 2_000 });
    });
  });
  await textbox
    .evaluate((element, value) => {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return;
      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      valueSetter?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, answer)
    .catch(() => {});
  await expect
    .poll(async () => textbox.inputValue().catch(() => null), {
      timeout: 5_000,
    })
    .toBe(answer)
    .catch(() => {});
  const submitButton = inputScope.getByRole("button", { name: /^submit$/i }).first();
  await submitButton.scrollIntoViewIfNeeded({ timeout: 1_500 }).catch(() => {});
  await expect(submitButton).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(async () => submitButton.isEnabled().catch(() => false), {
      timeout: 10_000,
    })
    .toBe(true);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await submitButton.click({ timeout: 5_000 });
      await expect
        .poll(
          async () => {
            const textboxVisible = await textbox.isVisible().catch(() => false);
            if (!textboxVisible) return true;
            const value = await textbox.inputValue().catch(() => null);
            return value === "" || value === null;
          },
          { timeout: 5_000 },
        )
        .toBe(true)
        .catch(() => {});
      return;
    } catch (error) {
      const textboxStillVisible = await textbox.isVisible().catch(() => false);
      const scopeStillVisible = await inputScope.isVisible().catch(() => false);
      if (!textboxStillVisible && !scopeStillVisible) {
        return;
      }
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
  const appRoot = controllerPage.locator("main");
  const controlState = controllerPage.locator('[data-testid="survey-smash-control-state"]').first();
  const lightningScope = appRoot.locator('[data-testid="survey-smash-lightning-input"]').first();
  await expect(lightningScope).toBeVisible({ timeout: 1_500 });
  const inputScope = lightningScope;
  const progressChip = appRoot.getByText(/^\d+\/\d+$/).first();
  const previousProgress = (await progressChip.textContent().catch(() => null))?.trim() ?? null;
  const previousQuestionIndex = await controlState
    .getAttribute("data-lightning-question-index")
    .catch(() => null);
  const lightningQuestionCount = await controlState
    .getAttribute("data-lightning-question-count")
    .catch(() => null);
  const previousQuestionIndexNumber =
    previousQuestionIndex !== null ? Number.parseInt(previousQuestionIndex, 10) : Number.NaN;
  const lightningQuestionCountNumber =
    lightningQuestionCount !== null ? Number.parseInt(lightningQuestionCount, 10) : Number.NaN;
  const isLastLightningQuestion =
    Number.isFinite(previousQuestionIndexNumber) &&
    Number.isFinite(lightningQuestionCountNumber) &&
    previousQuestionIndexNumber >= lightningQuestionCountNumber - 1;
  const textbox = inputScope.getByRole("textbox").first();
  await textbox.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => {});
  await expect(textbox).toBeVisible({ timeout: 1_500 });
  await textbox.click({ timeout: 2_000 }).catch(() => {});
  await textbox.fill("", { timeout: 2_000 }).catch(() => {});
  let filled = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    filled = await textbox
      .fill(answer, { timeout: 1_500 })
      .then(() => true)
      .catch(() => false);
    if (filled) {
      break;
    }
    await controllerPage.waitForTimeout(150).catch(() => {});
  }
  if (!filled) {
    throw new Error(`Failed to fill Survey Smash lightning answer: ${answer}`);
  }
  await expect
    .poll(async () => textbox.inputValue().catch(() => null), {
      timeout: 5_000,
    })
    .toBe(answer)
    .catch(() => {});
  const guessButton = inputScope.getByRole("button", { name: /^guess$/i }).first();
  await guessButton.scrollIntoViewIfNeeded({ timeout: 1_500 }).catch(() => {});
  await expect(guessButton).toBeVisible({ timeout: 5_000 });
  await expect
    .poll(async () => guessButton.isEnabled().catch(() => false), {
      timeout: 3_000,
    })
    .toBe(true)
    .catch(() => {});

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await guessButton.click({ timeout: 1_500 });
      break;
    } catch (error) {
      const textboxStillVisible = await textbox.isVisible().catch(() => false);
      const scopeStillVisible = await inputScope.isVisible().catch(() => false);
      if (!textboxStillVisible && !scopeStillVisible) {
        return;
      }
      if (attempt === 3) {
        throw error;
      }
      await controllerPage.waitForTimeout(150);
    }
  }

  await expect
    .poll(
      async () => {
        const phase = await controlState.getAttribute("data-phase").catch(() => null);
        if (isLastLightningQuestion) {
          return phase === "lightning-round-reveal";
        }
        if (phase !== "lightning-round") {
          return true;
        }
        const nextQuestionIndex = await controlState
          .getAttribute("data-lightning-question-index")
          .catch(() => null);
        if (
          previousQuestionIndex !== null &&
          nextQuestionIndex !== null &&
          nextQuestionIndex !== previousQuestionIndex
        ) {
          return true;
        }
        const progress = (await progressChip.textContent().catch(() => null))?.trim() ?? null;
        if (previousProgress && progress && progress !== previousProgress) {
          return true;
        }
        return false;
      },
      { timeout: 5_000 },
    )
    .toBe(true);

  await controllerPage.waitForTimeout(400);
}

async function waitForSurveySmashLightningAdvance(
  hostPage: Page,
  actorPage: Page,
  previousHostState: SurveySmashHostState,
  timeoutMs = 8_000,
): Promise<void> {
  const controlState = actorPage.locator('[data-testid="survey-smash-control-state"]').first();
  const [previousActorPhase, previousActorQuestionIndex] = await Promise.all([
    controlState.getAttribute("data-phase").catch(() => null),
    controlState.getAttribute("data-lightning-question-index").catch(() => null),
  ]);

  await expect
    .poll(
      async () => {
        const nextHostState = await readSurveySmashHostState(hostPage);
        if (nextHostState.phase === "lightning-round-reveal") {
          return true;
        }
        if (nextHostState.phase === "final-scores") {
          throw new Error("Survey Smash reached final scores before lightning reveal");
        }
        if (
          nextHostState.lightningQuestionIndex !== previousHostState.lightningQuestionIndex ||
          nextHostState.phase !== previousHostState.phase
        ) {
          return true;
        }

        const [nextActorPhase, nextActorQuestionIndex] = await Promise.all([
          controlState.getAttribute("data-phase").catch(() => null),
          controlState.getAttribute("data-lightning-question-index").catch(() => null),
        ]);

        return (
          nextActorPhase !== previousActorPhase ||
          nextActorQuestionIndex !== previousActorQuestionIndex
        );
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

export async function submitSurveySmashLightningGuess(
  pages: Page[],
  answer: string,
  timeoutMs = 30_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const actor = await findSurveySmashLightningActor(pages, Math.min(5_000, timeoutMs));
      await submitQuickGuess(actor, answer);
      return actor;
    } catch (error) {
      lastError = error;
      await pages[0]?.waitForTimeout(150).catch(() => {});
    }
  }

  throw (
    (lastError as Error | null) ?? new Error("Timed out submitting Survey Smash lightning guess")
  );
}

export async function answerSurveySmashLightningQuestion(
  hostPage: Page,
  controllerPages: Page[],
  answer: string,
  timeoutMs = 180_000,
): Promise<Page> {
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const deadline = Date.now() + timeoutMs;
  const actorPages = [hostPage, ...controllerPages];
  const lightningResults = hostPage.getByText(/lightning round results/i).first();
  let missCounter = 0;
  let lastError: unknown = null;
  let lightningPhaseDiagnostics: string[] | null = null;

  while (Date.now() < deadline) {
    const actor = await findVisibleSurveySmashLightningActor(actorPages);
    if (actor) {
      await actor.bringToFront().catch(() => {});
    }
    if (actor && (await waitForSurveySmashLightningInput(actor, 1_500))) {
      const previousHostState = await readSurveySmashHostState(hostPage);
      try {
        await submitQuickGuess(actor, answer);
        await waitForSurveySmashLightningAdvance(hostPage, actor, previousHostState);
        return actor;
      } catch (error) {
        lastError = error;
        await hostPage.waitForTimeout(120).catch(() => {});
        continue;
      }
    }

    const hostState = await readSurveySmashHostState(hostPage);
    const hasLightningResults = await lightningResults.isVisible().catch(() => false);
    if (hasLightningResults || hostState.phase === "lightning-round-reveal") {
      const diagnostics = await describeSurveySmashLightningPages(actorPages);
      throw new Error(
        `Survey Smash advanced to lightning results before the test submitted a lightning answer. live=${lightningPhaseDiagnostics?.join(" | ") ?? "n/a"} final=${diagnostics.join(" | ")}`,
      );
    }
    if (hostState.phase === "final-scores") {
      const diagnostics = await describeSurveySmashLightningPages(actorPages);
      throw new Error(
        `Survey Smash advanced to final scores before the test submitted a lightning answer. live=${lightningPhaseDiagnostics?.join(" | ") ?? "n/a"} final=${diagnostics.join(" | ")}`,
      );
    }

    if (hostState.phase === "lightning-round") {
      if (lightningPhaseDiagnostics === null) {
        lightningPhaseDiagnostics = await describeSurveySmashLightningPages(actorPages);
      }
      await hostPage.waitForTimeout(150).catch(() => {});
      continue;
    }

    const isFinalRoundBoundary =
      hostState.phase === "round-result" &&
      hostState.round !== null &&
      hostState.totalRounds !== null &&
      hostState.round >= hostState.totalRounds;
    if (isFinalRoundBoundary) {
      await hostPage.waitForTimeout(250).catch(() => {});
      continue;
    }

    switch (hostState.phase) {
      case "face-off": {
        const submitted = await submitSurveySmashInput(actorPages, "e2e-faceoff");
        if (submitted) {
          await hostPage.waitForTimeout(200).catch(() => {});
          continue;
        }
        break;
      }
      case "guessing": {
        const guesser = await findStrictSurveySmashGuesser(actorPages, 2_000).catch(() => null);
        if (guesser) {
          await submitTextAnswer(guesser, `wrong-lightning-${missCounter++}`).catch(() => {});
          await hostPage.waitForTimeout(250).catch(() => {});
          continue;
        }
        break;
      }
      case "steal-chance": {
        const submitted = await submitSurveySmashInput(actorPages, "e2e-steal");
        if (submitted) {
          await hostPage.waitForTimeout(200).catch(() => {});
          continue;
        }
        break;
      }
      default:
        break;
    }

    const safeSkipPhases = new Set([
      "question-reveal",
      "strike",
      "answer-reveal",
      "round-result",
      "lightning-round-reveal",
    ]);
    const advanced = safeSkipPhases.has(hostState.phase ?? "")
      ? await advanceSurveySmashWithSkip(hostPage, skipButton, hostState).catch(() => false)
      : false;
    if (!advanced) {
      await hostPage.waitForTimeout(150).catch(() => {});
    }
  }

  throw (
    (lastError as Error | null) ??
    new Error("Timed out driving and submitting a Survey Smash lightning answer")
  );
}

export async function finishSurveySmashLightningRound(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 45_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const actorPages = [hostPage, ...controllerPages];
  const lightningResults = hostPage.getByText(/lightning round results/i).first();
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  let syntheticAnswerCounter = 0;

  while (Date.now() < deadline) {
    if (await lightningResults.isVisible().catch(() => false)) {
      return;
    }

    const hostState = await readSurveySmashHostState(hostPage);
    if (hostState.phase === "final-scores") {
      throw new Error("Survey Smash reached final scores before exposing lightning results");
    }

    if (hostState.phase === "lightning-round") {
      const actor = await findVisibleSurveySmashLightningActor(actorPages);
      if (actor && (await waitForSurveySmashLightningInput(actor, 1_500))) {
        const previousHostState = await readSurveySmashHostState(hostPage);
        await submitQuickGuess(actor, `e2e-lightning-finish-${syntheticAnswerCounter++}`).catch(
          () => {},
        );
        await waitForSurveySmashLightningAdvance(hostPage, actor, previousHostState).catch(
          () => {},
        );
        await hostPage.waitForTimeout(180).catch(() => {});
        continue;
      }
    }

    if (hostState.phase === "lightning-round-reveal") {
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click().catch(() => {});
        await hostPage.waitForTimeout(220).catch(() => {});
        continue;
      }
    }

    await hostPage.waitForTimeout(180).catch(() => {});
  }

  throw new Error("Timed out waiting for Survey Smash lightning results");
}

/**
 * Poll actor pages to find all that currently have a visible textbox (for face-off).
 */
export async function findFaceOffPlayers(
  actorPages: Page[],
  expectedCount = 2,
  timeoutMs = 20_000,
): Promise<Page[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found: Page[] = [];
    for (const actorPage of actorPages) {
      const faceOffSurface = actorPage
        .locator('main [data-testid="survey-smash-faceoff-input"]')
        .first();
      if (await faceOffSurface.isVisible().catch(() => false)) {
        found.push(actorPage);
        continue;
      }
      const textbox = actorPage.locator("main").getByRole("textbox").first();
      if (await textbox.isVisible().catch(() => false)) {
        found.push(actorPage);
      }
    }
    if (found.length >= expectedCount) return found;
    await actorPages[0]?.waitForTimeout(150);
  }
  throw new Error(`Timed out waiting for ${expectedCount} face-off players`);
}

/**
 * Poll actor pages to find the one with the active guess/submit input.
 */
export async function findActiveGuesser(actorPages: Page[], timeoutMs = 15_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  let fallback: Page | null = null;

  while (Date.now() < deadline) {
    for (const page of actorPages) {
      if (page.isClosed()) continue;
      const appRoot = page.locator("main");
      const guesserSurface = appRoot.locator('[data-testid="survey-smash-guesser-input"]').first();
      if (!(await guesserSurface.isVisible().catch(() => false))) {
        continue;
      }

      const textbox = guesserSurface.getByRole("textbox").first();
      if (await textbox.isVisible().catch(() => false)) {
        return page;
      }

      const guessAlongSurface = appRoot
        .locator('[data-testid="survey-smash-guess-along-input"]')
        .first();
      if (await guessAlongSurface.isVisible().catch(() => false)) {
        fallback = page;
        continue;
      }

      const fallbackTextbox = appRoot.getByRole("textbox").first();
      if (!(await fallbackTextbox.isVisible().catch(() => false))) continue;

      const submitButton = appRoot.getByRole("button", { name: /^submit$/i }).first();
      const guessButton = appRoot.getByRole("button", { name: /^guess$/i }).first();
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
    await actorPages[0]?.waitForTimeout(150);
  }

  throw new Error("Timed out waiting for active Survey Smash guesser");
}

export async function findStrictSurveySmashGuesser(
  actorPages: Page[],
  timeoutMs = 15_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const page of actorPages) {
      if (page.isClosed()) continue;
      const guesserSurface = page
        .locator('main [data-testid="survey-smash-guesser-input"]')
        .first();
      if (!(await guesserSurface.isVisible().catch(() => false))) {
        continue;
      }
      const textbox = guesserSurface.getByRole("textbox").first();
      if (await textbox.isVisible().catch(() => false)) {
        return page;
      }
    }

    await actorPages[0]?.waitForTimeout(150);
  }

  throw new Error("Timed out waiting for strict Survey Smash guesser");
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
export type LuckyLettersTurnMode =
  | "spinning"
  | "guess-consonant"
  | "buy-vowel"
  | "solve-attempt"
  | "bonus-round";

export type LuckyLettersTurnActor = {
  activePage: Page;
  watchingPage: Page;
  activeName: string;
  watchingName: string;
  activeKind: "host" | "controller";
  mode: LuckyLettersTurnMode;
};

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
      { timeout: 120_000 },
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
      { timeout: 120_000 },
    )
    .toBe(200);
}

const HOST_SESSION_KEYS = ["flimflam_reconnect_token", "flimflam_room_code"] as const;

const TRANSIENT_PAGE_CONTEXT_ERROR =
  /Execution context was destroyed|Cannot find context with specified id|Most likely the page has been closed/i;
const TRANSIENT_NAVIGATION_ERROR =
  /net::ERR_CONNECTION_REFUSED|net::ERR_CONNECTION_RESET|net::ERR_CONNECTION_ABORTED|net::ERR_ABORTED/i;

async function gotoWithHostRetry(
  page: Page,
  targetUrl: string,
  opts?: { waitUntil?: "load" | "domcontentloaded"; attempts?: number },
): Promise<void> {
  const attempts = opts?.attempts ?? 4;
  const waitUntil = opts?.waitUntil ?? "domcontentloaded";
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await page.goto(targetUrl, { waitUntil });
      return;
    } catch (error) {
      lastError = error;
      if (!TRANSIENT_NAVIGATION_ERROR.test(String(error))) {
        throw error;
      }
      await waitForHostHealthy(page);
      await page.waitForTimeout(200 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`[e2e] failed navigation after ${attempts} attempts: ${targetUrl}`);
}

async function reloadWithHostRetry(
  page: Page,
  opts?: { waitUntil?: "load" | "domcontentloaded"; attempts?: number },
): Promise<void> {
  const attempts = opts?.attempts ?? 4;
  const waitUntil = opts?.waitUntil ?? "domcontentloaded";
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await page.reload({ waitUntil });
      return;
    } catch (error) {
      lastError = error;
      if (!TRANSIENT_NAVIGATION_ERROR.test(String(error))) {
        throw error;
      }

      await waitForHostHealthy(page);
      const currentUrl = page.url();
      if (currentUrl) {
        try {
          await gotoWithHostRetry(page, currentUrl, { waitUntil, attempts: 1 });
          return;
        } catch (gotoError) {
          lastError = gotoError;
          if (!TRANSIENT_NAVIGATION_ERROR.test(String(gotoError))) {
            throw gotoError;
          }
        }
      }

      await page.waitForTimeout(200 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`[e2e] failed reload after ${attempts} attempts: ${page.url()}`);
}

async function readRoomCodeInputs(codeInputs: Locator[]): Promise<string> {
  const values = await Promise.all(codeInputs.map((input) => input.inputValue().catch(() => "")));
  return values.join("");
}

async function clearRoomCodeInputs(codeInputs: Locator[]): Promise<void> {
  for (const input of codeInputs) {
    await input.click();
    await input.fill("");
  }
}

async function typeRoomCodeSequentially(
  codeInputs: Locator[],
  normalizedCode: string,
): Promise<void> {
  const firstInput = codeInputs[0];
  if (!firstInput) return;

  await clearRoomCodeInputs(codeInputs);
  await firstInput.click();
  await firstInput.pressSequentially(normalizedCode, { delay: 35 });
  await expect
    .poll(async () => readRoomCodeInputs(codeInputs), {
      timeout: 5_000,
    })
    .toBe(normalizedCode);
}

async function pasteRoomCode(codeInputs: Locator[], normalizedCode: string): Promise<void> {
  const firstInput = codeInputs[0];
  if (!firstInput) return;

  await clearRoomCodeInputs(codeInputs);
  await firstInput.evaluate((element, pastedCode) => {
    const input = element as HTMLInputElement;
    input.focus();
    const clipboardData = new DataTransfer();
    clipboardData.setData("text", pastedCode);
    input.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, normalizedCode);
  await expect
    .poll(async () => readRoomCodeInputs(codeInputs), {
      timeout: 5_000,
    })
    .toBe(normalizedCode);
}

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
  await gotoWithHostRetry(page, "/", { waitUntil: "domcontentloaded", attempts: 5 });
  await clearHostReconnectStorage(page);

  for (let attempt = 1; attempt <= 4; attempt++) {
    if (attempt > 1) {
      await gotoWithHostRetry(page, "/", { waitUntil: "domcontentloaded", attempts: 5 });
      await clearHostReconnectStorage(page);
    }

    const openCreateMode = async (): Promise<void> => {
      const switchToCreateButton = page
        .getByRole("button", { name: /or create a new game/i })
        .first();
      if (!(await switchToCreateButton.isVisible({ timeout: 1_500 }).catch(() => false))) {
        return;
      }
      await switchToCreateButton.click();
      await expect(page.getByTestId("create-room-cta").first()).toBeVisible({ timeout: 10_000 });
    };

    const findVisibleHostNameInput = async (): Promise<Locator | null> => {
      const candidates: Locator[] = [
        page.locator("#create-host-name").first(),
        page.locator("#host-name").first(),
      ];

      for (const candidate of candidates) {
        if (await candidate.isVisible({ timeout: 1_500 }).catch(() => false)) {
          return candidate;
        }
      }

      return null;
    };

    if (
      !(await page
        .getByTestId("create-room-cta")
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await openCreateMode().catch(() => {});
    }

    // Fill host name input before clicking create.
    const hostNameInput = await findVisibleHostNameInput();
    if (hostNameInput) {
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
      await gotoWithHostRetry(page, `/room/new?e2e_retry=${attempt}`, {
        waitUntil: "domcontentloaded",
        attempts: 5,
      });
    }

    // If CTA click did not navigate due transient hydration hiccup, force the create route.
    if (/\/$/.test(page.url())) {
      // The CTA click may have initiated a navigation that hasn't committed yet; avoid overlapping
      // navigations that manifest as `net::ERR_ABORTED` flake in Playwright.
      await page.waitForURL(/\/room\/new(?:[/?#]|$)/, { timeout: 2_000 }).catch(() => {});
    }

    if (/\/$/.test(page.url())) {
      try {
        await gotoWithHostRetry(page, `/room/new?e2e_force=${attempt}`, {
          waitUntil: "domcontentloaded",
          attempts: 5,
        });
      } catch (error) {
        if (TRANSIENT_NAVIGATION_ERROR.test(String(error))) {
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
        try {
          await reloadWithHostRetry(page, { waitUntil: "domcontentloaded", attempts: 4 });
        } catch (error) {
          if (!TRANSIENT_NAVIGATION_ERROR.test(String(error))) {
            throw error;
          }
          await waitForHostHealthy(page);
        }
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
  const encodedName = encodeURIComponent(name);
  const encodedColor = encodeURIComponent("#FF3366");

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

      const directJoinUrl = `${APP_URL}/room/${normalizedCode}?name=${encodedName}&color=${encodedColor}&e2e_join=${attempt}`;
      await controllerPage.goto(directJoinUrl, { waitUntil: "domcontentloaded" });
      const joinedViaDirectRoute = await expect
        .poll(
          async () => {
            const currentUrl = controllerPage?.url() ?? "";
            if (!new RegExp(`/room/${normalizedCode}(?:[/?#]|$)`, "i").test(currentUrl)) {
              return false;
            }

            const hasRetrySurface = await controllerPage
              ?.getByRole("button", { name: /try again/i })
              .first()
              .isVisible()
              .catch(() => false);
            if (hasRetrySurface) {
              return false;
            }

            return hostPage
              .getByText(name, { exact: true })
              .isVisible()
              .catch(() => false);
          },
          { timeout: 12_000 },
        )
        .toBe(true)
        .then(() => true)
        .catch(() => false);
      if (joinedViaDirectRoute) {
        joined = true;
        break;
      }

      // Navigate to the unified app landing page
      await controllerPage.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
      await expect(controllerPage.getByLabel("Room code character 1")).toBeVisible({
        timeout: 15_000,
      });
      await expect(controllerPage.getByRole("button", { name: /^join$/i })).toBeVisible({
        timeout: 15_000,
      });
      const avatarOptions = controllerPage.locator('button[aria-label^="Select color"]');
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
      const initialCodeValue = await readRoomCodeInputs(codeInputs);
      if (
        initialCodeValue !== normalizedCode ||
        !(await joinButton.isEnabled().catch(() => false))
      ) {
        await typeRoomCodeSequentially(codeInputs, normalizedCode);

        if (!(await joinButton.isEnabled().catch(() => false))) {
          await pasteRoomCode(codeInputs, normalizedCode);
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

            if ((await readRoomCodeInputs(codeInputs)) !== normalizedCode) return false;

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
  const gameButton = hostPage
    .getByRole("button", { name: new RegExp(`^${escapeRegex(gameName)}$`, "i") })
    .first();
  await expect(gameButton).toBeVisible({ timeout: 30_000 });
  await gameButton.click();

  const complexityPattern = new RegExp(`^${escapeRegex(complexity)}`, "i");
  const complexityButton = hostPage.getByRole("button", { name: complexityPattern }).first();
  const complexityRadio = hostPage.getByRole("radio", { name: complexityPattern }).first();

  if (await complexityButton.isVisible().catch(() => false)) {
    await complexityButton.click();
  } else {
    await expect(complexityRadio).toBeVisible({ timeout: 30_000 });
    await complexityRadio.click();
  }

  const startButton = hostPage.getByRole("button", { name: /start game/i });
  await expect(startButton).toBeEnabled({ timeout: 30_000 });
  await startButton.click();
}

export async function forceToFinalScores(hostPage: Page, maxSkips = 300): Promise<void> {
  const finalScoresRoot = hostPage.locator('[data-testid="final-scores-root"]').first();
  const finalScoresHeading = hostPage.getByRole("heading", { name: /final scores/i }).first();
  for (let i = 0; i < maxSkips; i++) {
    if (
      (await finalScoresRoot.isVisible().catch(() => false)) ||
      (await finalScoresHeading.isVisible().catch(() => false))
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

export async function driveLuckyLettersToPhase(
  hostPage: Page,
  controllerPages: Page[],
  text: string | RegExp,
  controllerNames: string[] = [],
  maxSteps = 600,
): Promise<void> {
  const pattern =
    typeof text === "string" ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : text;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const solveToken = process.env.FLIMFLAM_E2E_SOLVE_TOKEN ?? "__E2E_SOLVE__";
  const finalScoresRoot = hostPage.locator('[data-testid="final-scores-root"]').first();

  for (let step = 0; step < maxSteps; step += 1) {
    const hostState = await readLuckyLettersHostState(hostPage).catch(() => ({
      phase: null,
      round: null,
      totalRounds: null,
    }));

    if (
      hostState.phase === "final-scores" &&
      ((await finalScoresRoot.isVisible().catch(() => false)) ||
        (await hostPage
          .getByRole("heading", { name: /final scores/i })
          .first()
          .isVisible()
          .catch(() => false)))
    ) {
      return;
    }

    if (
      await hostPage
        .getByText(pattern)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    const inPassiveLuckyPhase =
      (await hostPage
        .getByText(/choose your categories|round \d+ of \d+|won the round!|the answer was/i)
        .first()
        .isVisible()
        .catch(() => false)) && (await skipButton.isVisible().catch(() => false));
    if (inPassiveLuckyPhase) {
      await skipButton.click().catch(() => {});
      await hostPage.waitForTimeout(180);
      continue;
    }

    const turnActor = await findLuckyLettersTurnActor(
      hostPage,
      controllerPages,
      controllerNames,
      750,
    ).catch(() => null);

    if (turnActor) {
      const appRoot = turnActor.activePage.locator("main");
      const solveButton = appRoot.getByRole("button", { name: /solve/i }).first();
      const textbox = appRoot.getByRole("textbox").first();
      const submitButton = appRoot.getByRole("button", { name: /^submit$/i }).first();
      const letterButton = appRoot.getByRole("button", { name: /^Letter [A-Z]$/ }).first();

      if (turnActor.mode === "spinning") {
        const canSolve =
          (await solveButton.isVisible().catch(() => false)) &&
          (await solveButton.isEnabled().catch(() => false));
        if (canSolve) {
          await solveButton.click().catch(() => {});
          await expect
            .poll(
              async () =>
                (await textbox.isVisible().catch(() => false)) ||
                (await hostPage
                  .getByText(/round \d+ complete|won the round!|bonus round/i)
                  .first()
                  .isVisible()
                  .catch(() => false)),
              { timeout: 2_000 },
            )
            .toBe(true)
            .catch(() => {});
          await hostPage.waitForTimeout(120);
          continue;
        }
      }

      const hasSubmitSurface =
        (await textbox.isVisible().catch(() => false)) &&
        (await submitButton.isVisible().catch(() => false));
      if (hasSubmitSurface) {
        await textbox.fill(solveToken).catch(() => {});
        await expect
          .poll(async () => submitButton.isEnabled().catch(() => false), { timeout: 2_000 })
          .toBe(true)
          .catch(() => {});
        await submitButton.click().catch(() => {});
        await hostPage.waitForTimeout(200);
        continue;
      }

      if (
        (turnActor.mode === "guess-consonant" ||
          turnActor.mode === "buy-vowel" ||
          turnActor.mode === "bonus-round") &&
        (await letterButton.isVisible().catch(() => false)) &&
        (await letterButton.isEnabled().catch(() => false))
      ) {
        await letterButton.click().catch(() => {});
        await hostPage.waitForTimeout(220);
        continue;
      }
    }

    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click().catch(() => {});
      await hostPage.waitForTimeout(180);
      continue;
    }

    await hostPage.waitForTimeout(180);
  }

  throw new Error(`Timed out before reaching Lucky Letters phase with text: ${String(pattern)}`);
}

async function detectLuckyLettersTurnMode(page: Page): Promise<LuckyLettersTurnMode | null> {
  if (page.isClosed()) return null;

  const appRoot = page.locator("main");
  const spinButton = appRoot.getByRole("button", { name: /spin the wheel/i }).first();
  const solveAction = appRoot.locator('[data-testid="lucky-solve-action"]').first();
  const buyVowelAction = appRoot.locator('[data-testid="lucky-buy-vowel-action"]').first();
  const textbox = appRoot.getByRole("textbox").first();
  const submitButton = appRoot.getByRole("button", { name: /^submit$/i }).first();
  const letterButton = appRoot.getByRole("button", { name: /^Letter [A-Z]$/ }).first();
  const consonantPrompt = appRoot.getByText(/pick a consonant/i).first();
  const vowelPrompt = appRoot.getByText(/buy a vowel/i).first();
  const bonusPrompt = appRoot.getByText(/choose your letters/i).first();

  const spinEnabled =
    (await spinButton.isVisible().catch(() => false)) &&
    (await spinButton.isEnabled().catch(() => false));
  const solveEnabled =
    (await solveAction.isVisible().catch(() => false)) &&
    (await solveAction.isEnabled().catch(() => false));
  const buyVowelEnabled =
    (await buyVowelAction.isVisible().catch(() => false)) &&
    (await buyVowelAction.isEnabled().catch(() => false));
  if (spinEnabled || solveEnabled || buyVowelEnabled) {
    return "spinning";
  }

  const hasSolveInput =
    (await textbox.isVisible().catch(() => false)) &&
    (await submitButton.isVisible().catch(() => false));
  if (hasSolveInput) {
    return "solve-attempt";
  }

  const letterEnabled =
    (await letterButton.isVisible().catch(() => false)) &&
    (await letterButton.isEnabled().catch(() => false));
  if (!letterEnabled) {
    return null;
  }

  if (await bonusPrompt.isVisible().catch(() => false)) {
    return "bonus-round";
  }
  if (await vowelPrompt.isVisible().catch(() => false)) {
    return "buy-vowel";
  }
  if (await consonantPrompt.isVisible().catch(() => false)) {
    return "guess-consonant";
  }

  return "guess-consonant";
}

export async function findLuckyLettersTurnActor(
  hostPage: Page,
  controllerPages: Page[],
  controllerNames: string[] = [],
  timeoutMs = 20_000,
): Promise<LuckyLettersTurnActor> {
  const actors = [
    ...controllerPages.map((page, index) => ({
      page,
      name: controllerNames[index] ?? `Player ${index + 1}`,
      kind: "controller" as const,
    })),
    { page: hostPage, name: "Host", kind: "host" as const },
  ];
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (let index = 0; index < actors.length; index += 1) {
      const actor = actors[index];
      if (!actor) continue;
      const mode = await detectLuckyLettersTurnMode(actor.page);
      if (!mode) continue;

      const preferredWatcher =
        actors.find((candidate, candidateIndex) => {
          return (
            candidateIndex !== index &&
            candidate.kind === "controller" &&
            !candidate.page.isClosed()
          );
        }) ??
        actors.find((candidate, candidateIndex) => {
          return candidateIndex !== index && !candidate.page.isClosed();
        }) ??
        actor;

      return {
        activePage: actor.page,
        watchingPage: preferredWatcher.page,
        activeName: actor.name,
        watchingName: preferredWatcher.name,
        activeKind: actor.kind,
        mode,
      };
    }

    await hostPage.waitForTimeout(150);
  }

  throw new Error("Timed out waiting for active Lucky Letters turn actor");
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
  return findPageWithButton(controllerPages, buttonName, timeoutMs);
}

export async function findPageWithButton(
  pages: Page[],
  buttonName: RegExp,
  timeoutMs = 15_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const page of pages) {
      const button = page.getByRole("button", { name: buttonName }).first();
      if (await button.isVisible().catch(() => false)) {
        return page;
      }
    }
    await pages[0]?.waitForTimeout(150);
  }
  throw new Error(`Timed out waiting for button ${buttonName.toString()} on any page`);
}

export async function findSurveySmashLightningActor(
  pages: Page[],
  timeoutMs = 15_000,
): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const actor = await findVisibleSurveySmashLightningActor(pages);
    if (actor) {
      await actor.bringToFront().catch(() => {});
    }
    if (actor && (await waitForSurveySmashLightningInput(actor, 2_500))) {
      return actor;
    }
    await pages[0]?.waitForTimeout(150);
  }
  const diagnostics = await describeSurveySmashLightningPages(pages);
  throw new Error(
    `Timed out waiting for the active Survey Smash lightning actor. ${diagnostics.join(" | ")}`,
  );
}

async function describeSurveySmashLightningPages(pages: Page[]): Promise<string[]> {
  const diagnostics = await Promise.all(
    pages.map(async (page, index) => {
      if (!page || page.isClosed()) {
        return `page${index + 1}: closed`;
      }
      const main = page.locator("main");
      const controlState = page.locator('[data-testid="survey-smash-control-state"]').first();
      const hostState = page.locator('[data-testid="survey-smash-host-state"]').first();
      const [
        phaseAttr,
        mySessionAttr,
        isHostAttr,
        isLightningAttr,
        lastPrivateActionAttr,
        roomPhaseAttr,
        eventPhaseAttr,
        gameStatePhaseAttr,
      ] = await Promise.all([
        controlState.getAttribute("data-phase").catch(() => null),
        controlState.getAttribute("data-my-session-id").catch(() => null),
        controlState.getAttribute("data-is-host").catch(() => null),
        controlState.getAttribute("data-is-lightning-player").catch(() => null),
        controlState.getAttribute("data-last-private-action").catch(() => null),
        controlState.getAttribute("data-room-phase").catch(() => null),
        controlState.getAttribute("data-event-phase").catch(() => null),
        controlState.getAttribute("data-game-state-phase").catch(() => null),
      ]);
      const lightningPlayerAttr = await hostState
        .getAttribute("data-lightning-player-id")
        .catch(() => null);
      const lightningScope = main.locator('[data-testid="survey-smash-lightning-input"]').first();
      const inputScope = (await lightningScope.isVisible().catch(() => false))
        ? lightningScope
        : main;
      const hasTextbox = await inputScope
        .getByRole("textbox")
        .first()
        .isVisible()
        .catch(() => false);
      const hasGuessButton = await inputScope
        .getByRole("button", { name: /^guess$/i })
        .first()
        .isVisible()
        .catch(() => false);
      const hasIndexChip = await main
        .getByText(/^\d+\/\d+$/)
        .first()
        .isVisible()
        .catch(() => false);
      const hasContextCard = await main
        .locator('[data-testid="controller-context-card"]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasFinalScores = await main
        .getByRole("heading", { name: /final scores/i })
        .first()
        .isVisible()
        .catch(() => false);
      const textSnippet = ((await main.textContent().catch(() => "")) || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      return `page${index + 1}: phase=${phaseAttr ?? "?"} roomPhase=${roomPhaseAttr ?? "?"} eventPhase=${eventPhaseAttr ?? "?"} gameStatePhase=${gameStatePhaseAttr ?? "?"} lastAction=${lastPrivateActionAttr ?? "?"} session=${mySessionAttr ?? "?"} host=${isHostAttr ?? "?"} lightning=${isLightningAttr ?? "?"} lightningPlayer=${lightningPlayerAttr ?? "?"} textbox=${hasTextbox} guess=${hasGuessButton} index=${hasIndexChip} context=${hasContextCard} final=${hasFinalScores} text="${textSnippet}"`;
    }),
  );
  return diagnostics;
}

async function waitForSurveySmashLightningInput(page: Page, timeoutMs = 5_000): Promise<boolean> {
  const lightningInput = page.locator('main [data-testid="survey-smash-lightning-input"]').first();
  const textbox = lightningInput.getByRole("textbox").first();
  const guessButton = lightningInput.getByRole("button", { name: /^guess$/i }).first();
  return await expect
    .poll(
      async () => {
        const surfaceVisible = await lightningInput.isVisible().catch(() => false);
        if (!surfaceVisible) return false;
        const [textboxVisible, guessButtonVisible] = await Promise.all([
          textbox.isVisible().catch(() => false),
          guessButton.isVisible().catch(() => false),
        ]);
        return textboxVisible && guessButtonVisible;
      },
      {
        timeout: timeoutMs,
      },
    )
    .toBe(true)
    .then(() => true)
    .catch(() => false);
}

async function findVisibleSurveySmashLightningActor(pages: Page[]): Promise<Page | null> {
  let matchedLightningPlayerPage: Page | null = null;

  for (const page of pages) {
    if (!page || page.isClosed()) continue;
    await page.bringToFront().catch(() => {});
    await page.waitForTimeout(250).catch(() => {});

    const main = page.locator("main");
    const controlState = page.locator('[data-testid="survey-smash-control-state"]').first();
    const hostState = page.locator('[data-testid="survey-smash-host-state"]').first();
    const [phase, isLightningPlayer, mySessionId, lightningPlayerId] = await Promise.all([
      controlState.getAttribute("data-phase").catch(() => null),
      controlState.getAttribute("data-is-lightning-player").catch(() => null),
      controlState.getAttribute("data-my-session-id").catch(() => null),
      hostState.getAttribute("data-lightning-player-id").catch(() => null),
    ]);
    const lightningScope = main.locator('[data-testid="survey-smash-lightning-input"]').first();
    const inputScope = (await lightningScope.isVisible().catch(() => false))
      ? lightningScope
      : main;
    const textbox = inputScope.getByRole("textbox").first();
    const guessButton = inputScope.getByRole("button", { name: /^guess$/i }).first();
    const hasTextbox = await textbox.isVisible().catch(() => false);
    const hasGuessButton = await guessButton.isVisible().catch(() => false);
    if (hasTextbox && hasGuessButton) {
      return page;
    }

    const matchesExpectedLightningPlayer =
      phase === "lightning-round" &&
      lightningPlayerId !== null &&
      mySessionId !== null &&
      lightningPlayerId === mySessionId;
    if (matchesExpectedLightningPlayer || isLightningPlayer === "true") {
      matchedLightningPlayerPage = page;
    }
  }

  return matchedLightningPlayerPage;
}

export async function findBrainBoardSelectorController(
  _controllerPages: Page[],
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

export async function driveBrainBoardToClueSelect(
  hostPage: Page,
  _controllerPages: Page[],
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });

  while (Date.now() < deadline) {
    const hostState = await readBrainBoardHostState(hostPage);
    if (hostState.phase === "clue-select") {
      return;
    }

    const canSkipToNext =
      hostState.phase === "category-submit" ||
      hostState.phase === "topic-chat" ||
      hostState.phase === "generating-board" ||
      hostState.phase === "category-reveal" ||
      hostState.phase === "clue-result" ||
      hostState.phase === "round-transition";

    if (canSkipToNext && (await skipButton.isVisible().catch(() => false))) {
      await skipButton.click().catch(() => {});
      await expect
        .poll(
          async () => {
            const nextState = await readBrainBoardHostState(hostPage);
            return nextState.phase !== hostState.phase;
          },
          { timeout: 5_000 },
        )
        .toBe(true)
        .catch(() => {});
      continue;
    }

    await hostPage.waitForTimeout(250);
  }

  throw new Error("Timed out driving Brain Board to clue-select");
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
  const allPages = [hostPage, ...controllerPages];
  let lastPhaseKey: string | null = null;
  let repeatedPhaseLoops = 0;

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

    const hostState = await readBrainBoardHostState(hostPage);
    const phaseKey = `${hostState.phase ?? "unknown"}:${hostState.round ?? "?"}`;
    if (phaseKey === lastPhaseKey) repeatedPhaseLoops += 1;
    else {
      lastPhaseKey = phaseKey;
      repeatedPhaseLoops = 0;
    }

    let acted = false;

    const fastSkipPhase =
      hostState.phase === "topic-chat" ||
      hostState.phase === "generating-board" ||
      hostState.phase === "category-reveal" ||
      hostState.phase === "clue-result" ||
      hostState.phase === "round-transition" ||
      hostState.phase === "all-in-category" ||
      hostState.phase === "all-in-wager" ||
      hostState.phase === "all-in-reveal" ||
      hostState.phase === "answering" ||
      hostState.phase === "power-play-answer" ||
      hostState.phase === "all-in-answer";

    if (fastSkipPhase && (await skipButton.isVisible().catch(() => false))) {
      await skipButton.click().catch(() => {});
      await hostPage.waitForTimeout(150);
      continue;
    }

    if (repeatedPhaseLoops >= 16 && (await skipButton.isVisible().catch(() => false))) {
      await skipButton.click().catch(() => {});
      await hostPage.waitForTimeout(150);
      continue;
    }

    for (const pg of allPages) {
      const confirmButton = pg
        .getByRole("button", {
          name: /confirm|let'?s play|play this board|use this board/i,
        })
        .first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click().catch(() => {});
        acted = true;
        break;
      }
    }
    if (acted) {
      await hostPage.waitForTimeout(150);
      continue;
    }

    // Check host page AND controller pages for clue buttons (unified app:
    // host is also a player and can be the selector).
    for (const pg of allPages) {
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

    for (const pg of allPages) {
      const wagerButton = pg.getByRole("button", { name: /lock in wager/i }).first();
      if (await wagerButton.isVisible().catch(() => false)) {
        await wagerButton.click().catch(() => {});
        acted = true;
        break;
      }
    }
    if (acted) {
      await hostPage.waitForTimeout(150);
      continue;
    }

    for (const pg of allPages) {
      const appRoot = pg.locator("main");
      const textbox = appRoot.getByRole("textbox").first();
      if (!(await textbox.isVisible().catch(() => false))) continue;

      const answer = `brain-board-e2e-${step}-${Math.floor(Math.random() * 1_000_000)}`;
      try {
        await submitTextAnswer(pg, answer);
        acted = true;
        break;
      } catch {
        const guessButton = appRoot.getByRole("button", { name: /^guess$/i }).first();
        if (await guessButton.isVisible().catch(() => false)) {
          await guessButton.click().catch(() => {});
          acted = true;
          break;
        }
      }
    }
    if (acted) {
      await hostPage.waitForTimeout(180);
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
  timeoutMs = 900_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const actorPages = [hostPage, ...controllerPages];
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const finalScoresRoot = hostPage.locator('[data-testid="final-scores-root"]').first();
  const finalScoresHeading = hostPage.getByRole("heading", { name: /final scores/i }).first();
  const restartButton = hostPage.getByRole("button", { name: /^restart$/i }).first();
  const playAgainButton = hostPage.getByRole("button", { name: /play again/i }).first();
  let lastPhase: string | null = null;
  let lastPhaseKey: string | null = null;
  let repeatedPhaseLoops = 0;

  while (Date.now() < deadline) {
    const hasFinalScoresRoot = await finalScoresRoot.isVisible().catch(() => false);
    const hasFinalScoresHeading = await finalScoresHeading.isVisible().catch(() => false);
    const hasRestart = await restartButton.isVisible().catch(() => false);
    const hasPlayAgain = await playAgainButton.isVisible().catch(() => false);
    if (hasFinalScoresRoot || hasFinalScoresHeading || hasRestart || hasPlayAgain) {
      return;
    }

    const hostState = await readBrainBoardHostState(hostPage);
    let acted = false;
    const phaseKey = `${hostState.phase ?? "unknown"}:${hostState.round ?? "?"}`;

    if (phaseKey === lastPhaseKey) repeatedPhaseLoops += 1;
    else {
      lastPhaseKey = phaseKey;
      repeatedPhaseLoops = 0;
    }

    if (hostState.phase !== lastPhase) {
      lastPhase = hostState.phase;
    }

    if (hostState.phase === "final-scores") {
      await expect(finalScoresRoot.or(finalScoresHeading)).toBeVisible({ timeout: 20_000 });
      return;
    }

    if (repeatedPhaseLoops >= 16 && (await skipButton.isVisible().catch(() => false))) {
      await skipButton.click().catch(() => {});
      await hostPage.waitForTimeout(200);
      continue;
    }

    switch (hostState.phase) {
      case "topic-chat":
      case "generating-board":
      case "category-reveal":
      case "clue-result":
      case "round-transition":
      case "all-in-category":
      case "all-in-reveal": {
        if (await skipButton.isVisible().catch(() => false)) {
          await skipButton.click().catch(() => {});
          acted = true;
        }
        break;
      }
      case "clue-select": {
        if (await skipButton.isVisible().catch(() => false)) {
          await skipButton.click().catch(() => {});
          acted = true;
        } else {
          for (const page of actorPages) {
            await page.bringToFront().catch(() => {});
            const clueButton = page.locator(BRAIN_BOARD_CLUE_SELECTOR).first();
            if (!(await clueButton.isVisible().catch(() => false))) continue;
            await clueButton.click().catch(() => {});
            acted = true;
            break;
          }
        }
        break;
      }
      case "answering":
      case "power-play-answer":
      case "all-in-answer": {
        if (await skipButton.isVisible().catch(() => false)) {
          await skipButton.click().catch(() => {});
          acted = true;
          break;
        }

        for (const page of actorPages) {
          await page.bringToFront().catch(() => {});
          const appRoot = page.locator("main");
          const textbox = appRoot.getByRole("textbox").first();
          if (!(await textbox.isVisible().catch(() => false))) continue;
          const answer = `brain-board-final-${hostState.phase}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          try {
            await submitTextAnswer(page, answer);
            acted = true;
          } catch {
            const guessButton = appRoot.getByRole("button", { name: /^guess$/i }).first();
            if (await guessButton.isVisible().catch(() => false)) {
              const enabled = await guessButton.isEnabled().catch(() => false);
              if (enabled) {
                await guessButton.click().catch(() => {});
                acted = true;
              }
            }
          }
        }
        if (!acted && (await skipButton.isVisible().catch(() => false))) {
          await skipButton.click().catch(() => {});
          acted = true;
        }
        break;
      }
      case "power-play-wager":
      case "all-in-wager": {
        for (const page of actorPages) {
          await page.bringToFront().catch(() => {});
          const wagerButton = page.getByRole("button", { name: /lock in wager/i }).first();
          if (!(await wagerButton.isVisible().catch(() => false))) continue;
          await wagerButton.click().catch(() => {});
          acted = true;
        }
        if (!acted && (await skipButton.isVisible().catch(() => false))) {
          await skipButton.click().catch(() => {});
          acted = true;
        }
        break;
      }
      default: {
        if (await skipButton.isVisible().catch(() => false)) {
          await skipButton.click().catch(() => {});
          acted = true;
        }
        break;
      }
    }

    if (acted) {
      await expect
        .poll(
          async () => {
            if (
              (await finalScoresRoot.isVisible().catch(() => false)) ||
              (await finalScoresHeading.isVisible().catch(() => false)) ||
              (await restartButton.isVisible().catch(() => false)) ||
              (await playAgainButton.isVisible().catch(() => false))
            ) {
              return true;
            }
            const nextState = await readBrainBoardHostState(hostPage);
            return nextState.phase !== hostState.phase || nextState.round !== hostState.round;
          },
          { timeout: 5_000 },
        )
        .toBe(true)
        .catch(() => {});
    } else {
      await hostPage.waitForTimeout(250);
    }
  }

  throw new Error("Timed out driving Brain Board to final scores");
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
  const finalScoresRoot = hostPage.locator('[data-testid="final-scores-root"]').first();
  const finalScoresHeading = hostPage.getByRole("heading", { name: /final scores/i }).first();
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const deadline = Date.now() + timeoutMs;
  const actorPages = [hostPage, ...controllerPages];

  while (Date.now() < deadline) {
    const hostState = await readSurveySmashHostState(hostPage);
    if (
      hostState.phase === "final-scores" ||
      (await finalScoresRoot.isVisible().catch(() => false)) ||
      (await finalScoresHeading.isVisible().catch(() => false))
    ) {
      return;
    }

    const advanced = canSkipSurveySmashPhase(hostState.phase)
      ? await advanceSurveySmashWithSkip(hostPage, skipButton, hostState).catch(() => false)
      : false;
    if (advanced) {
      continue;
    }

    const submitted = canSubmitSurveySmashPhase(hostState.phase)
      ? await submitSurveySmashInput(actorPages, "e2e-final")
      : false;
    if (submitted) {
      await hostPage.waitForTimeout(200).catch(() => {});
      continue;
    }

    const isFinalRoundBoundary =
      hostState.phase === "round-result" &&
      hostState.round !== null &&
      hostState.totalRounds !== null &&
      hostState.round >= hostState.totalRounds;
    if (isFinalRoundBoundary) {
      await expect
        .poll(
          async () => {
            const nextState = await readSurveySmashHostState(hostPage);
            return nextState.phase !== "round-result";
          },
          { timeout: 8_000 },
        )
        .toBe(true)
        .catch(() => {});
      continue;
    }

    await hostPage.waitForTimeout(250).catch(() => {});
  }

  throw new Error("Timed out driving Survey Smash to final scores");
}

export async function driveSurveySmashToRoundResult(
  hostPage: Page,
  controllerPages: Page[],
  targetRound: number,
): Promise<void> {
  await advanceSurveySmashToHostState(
    hostPage,
    (state) => state.round === targetRound && state.phase === "round-result",
    120_000,
    `round ${targetRound} result`,
  );
}

export async function driveSurveySmashToLightningRound(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 180_000,
): Promise<void> {
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const deadline = Date.now() + timeoutMs;
  const actorPages = [hostPage, ...controllerPages];
  const lightningHeading = hostPage.getByText(/^lightning round!?$/i).first();
  const lightningResults = hostPage.getByText(/lightning round results/i).first();
  const hasLightningActorSurface = async () => {
    for (const actorPage of actorPages) {
      if (!actorPage || actorPage.isClosed()) continue;
      const main = actorPage.locator("main");
      const lightningScope = main.locator('[data-testid="survey-smash-lightning-input"]').first();
      const inputScope = (await lightningScope.isVisible().catch(() => false))
        ? lightningScope
        : main;
      const hasTextbox = await inputScope
        .getByRole("textbox")
        .first()
        .isVisible()
        .catch(() => false);
      const hasGuessButton = await inputScope
        .getByRole("button", { name: /^guess$/i })
        .first()
        .isVisible()
        .catch(() => false);
      if (hasTextbox && hasGuessButton) {
        return true;
      }
    }
    return false;
  };
  let missCounter = 0;

  while (Date.now() < deadline) {
    const hostState = await readSurveySmashHostState(hostPage);
    const hasLightningResults = await lightningResults.isVisible().catch(() => false);
    const hasLightningHeading = await lightningHeading.isVisible().catch(() => false);
    const hasLightningActor = await hasLightningActorSurface();

    if (hasLightningResults) {
      throw new Error(
        "Survey Smash advanced to lightning results before the test observed lightning round",
      );
    }

    if (hostState.phase === "lightning-round" || hasLightningHeading) {
      return;
    }

    // A live lightning actor surface is enough to consider the round started.
    // The host board can trail behind controller input for a short beat.
    if (hasLightningActor) {
      return;
    }

    const isFinalRoundBoundary =
      hostState.phase === "round-result" &&
      hostState.round !== null &&
      hostState.totalRounds !== null &&
      hostState.round >= hostState.totalRounds;
    if (isFinalRoundBoundary) {
      await hostPage.waitForTimeout(250).catch(() => {});
      continue;
    }

    switch (hostState.phase) {
      case "face-off": {
        const submitted = await submitSurveySmashInput(actorPages, "e2e-faceoff");
        if (submitted) {
          await hostPage.waitForTimeout(250).catch(() => {});
          continue;
        }
        break;
      }
      case "guessing": {
        const guesser = await findStrictSurveySmashGuesser(actorPages, 2_000).catch(() => null);
        if (guesser) {
          await submitTextAnswer(guesser, `wrong-lightning-${missCounter++}`).catch(() => {});
          await hostPage.waitForTimeout(300).catch(() => {});
          continue;
        }
        break;
      }
      case "steal-chance": {
        const submitted = await submitSurveySmashInput(actorPages, "e2e-steal");
        if (submitted) {
          await hostPage.waitForTimeout(250).catch(() => {});
          continue;
        }
        break;
      }
      default:
        break;
    }

    const safeSkipPhases = new Set([
      "question-reveal",
      "strike",
      "answer-reveal",
      "round-result",
      "lightning-round-reveal",
    ]);
    const advanced = safeSkipPhases.has(hostState.phase ?? "")
      ? await advanceSurveySmashWithSkip(hostPage, skipButton, hostState).catch(() => false)
      : false;
    if (advanced) {
      continue;
    }

    await hostPage.waitForTimeout(250).catch(() => {});
  }

  throw new Error("Timed out before reaching Survey Smash lightning round");
}

export async function driveSurveySmashToLightningQuestion(
  hostPage: Page,
  controllerPages: Page[],
  timeoutMs = 180_000,
): Promise<Page> {
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const deadline = Date.now() + timeoutMs;
  const actorPages = [hostPage, ...controllerPages];
  const lightningResults = hostPage.getByText(/lightning round results/i).first();
  let missCounter = 0;

  while (Date.now() < deadline) {
    const actor = await findVisibleSurveySmashLightningActor(actorPages);
    if (actor) {
      await actor.bringToFront().catch(() => {});
    }
    if (actor && (await waitForSurveySmashLightningInput(actor, 2_500))) {
      return actor;
    }

    const hostState = await readSurveySmashHostState(hostPage);
    const hasLightningResults = await lightningResults.isVisible().catch(() => false);
    if (hasLightningResults) {
      const diagnostics = await describeSurveySmashLightningPages(actorPages);
      throw new Error(
        `Survey Smash advanced to lightning results before the test observed the active lightning actor. ${diagnostics.join(" | ")}`,
      );
    }

    const isFinalRoundBoundary =
      hostState.phase === "round-result" &&
      hostState.round !== null &&
      hostState.totalRounds !== null &&
      hostState.round >= hostState.totalRounds;
    if (isFinalRoundBoundary || hostState.phase === "lightning-round") {
      await hostPage.waitForTimeout(150).catch(() => {});
      continue;
    }

    switch (hostState.phase) {
      case "face-off": {
        const submitted = await submitSurveySmashInput(actorPages, "e2e-faceoff");
        if (submitted) {
          await hostPage.waitForTimeout(200).catch(() => {});
          continue;
        }
        break;
      }
      case "guessing": {
        const guesser = await findStrictSurveySmashGuesser(actorPages, 2_000).catch(() => null);
        if (guesser) {
          await submitTextAnswer(guesser, `wrong-lightning-${missCounter++}`).catch(() => {});
          await hostPage.waitForTimeout(250).catch(() => {});
          continue;
        }
        break;
      }
      case "steal-chance": {
        const submitted = await submitSurveySmashInput(actorPages, "e2e-steal");
        if (submitted) {
          await hostPage.waitForTimeout(200).catch(() => {});
          continue;
        }
        break;
      }
      default:
        break;
    }

    const safeSkipPhases = new Set([
      "question-reveal",
      "strike",
      "answer-reveal",
      "round-result",
      "lightning-round-reveal",
    ]);
    const advanced = safeSkipPhases.has(hostState.phase ?? "")
      ? await advanceSurveySmashWithSkip(hostPage, skipButton, hostState).catch(() => false)
      : false;
    if (!advanced) {
      await hostPage.waitForTimeout(150).catch(() => {});
    }
  }

  return findSurveySmashLightningActor(actorPages, 5_000);
}
async function submitSurveySmashInput(actorPages: Page[], seed: string): Promise<boolean> {
  let submitted = false;

  for (let index = 0; index < actorPages.length; index += 1) {
    const controllerPage = actorPages[index];
    if (!controllerPage || controllerPage.isClosed()) continue;

    const appRoot = controllerPage.locator("main");
    const scopedInputContainers = [
      '[data-testid="survey-smash-faceoff-input"]',
      '[data-testid="survey-smash-guesser-input"]',
      '[data-testid="survey-smash-steal-input"]',
      '[data-testid="survey-smash-guess-along-input"]',
    ];
    let inputScope: Locator = appRoot;

    for (const selector of scopedInputContainers) {
      const candidate = appRoot.locator(selector).first();
      if (!(await candidate.isVisible().catch(() => false))) continue;
      const candidateTextbox = candidate.getByRole("textbox").first();
      if (await candidateTextbox.isVisible().catch(() => false)) {
        inputScope = candidate;
        break;
      }
    }

    const textbox = inputScope.getByRole("textbox").first();
    if (!(await textbox.isVisible().catch(() => false))) continue;

    const answer = `${seed}-${index}-${Math.floor(Math.random() * 1_000_000)}`;
    await textbox.fill(answer, { timeout: 1_000 }).catch(() => {});

    const submitButton = inputScope.getByRole("button", { name: /^submit$/i }).first();
    const submitVisible = await submitButton.isVisible().catch(() => false);
    const submitEnabled = submitVisible && (await submitButton.isEnabled().catch(() => false));
    if (submitVisible && submitEnabled) {
      const clicked = await submitButton
        .click({ timeout: 1_000 })
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        submitted = true;
      }
    }

    const guessButton = inputScope.getByRole("button", { name: /^guess$/i }).first();
    const guessVisible = await guessButton.isVisible().catch(() => false);
    const guessEnabled = guessVisible && (await guessButton.isEnabled().catch(() => false));
    if (guessVisible && guessEnabled) {
      const clicked = await guessButton
        .click({ timeout: 1_000 })
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
  const patternText = String(pattern);
  const skipButton = hostPage.getByRole("button", { name: /^skip$/i });
  const deadline = Date.now() + timeoutMs;
  const actorPages = [hostPage, ...controllerPages];
  const targetNeedsRevealBoard = /\bthe people say\b/i.test(patternText);
  const targetNeedsFaceOffState = /\bvs\b|face-?off/i.test(patternText);
  const targetNeedsControllerGuessing = /\bis guessing\b/i.test(patternText);
  const targetNeedsActiveLightningRound =
    /\blightning round\b/i.test(patternText) && !/\bresults\b/i.test(patternText);
  const hasLightningControllerSurface = async () => {
    for (const actorPage of actorPages) {
      const guessButton = actorPage
        .locator("main")
        .getByRole("button", { name: /^guess$/i })
        .first();
      if (await guessButton.isVisible().catch(() => false)) {
        return true;
      }

      const hasIndexChip = await actorPage
        .locator("main")
        .getByText(/^\d+\/5$/)
        .first()
        .isVisible()
        .catch(() => false);
      if (hasIndexChip) {
        return true;
      }
    }

    return false;
  };
  const hasControllerGuessingSurface = async () => {
    if (!targetNeedsControllerGuessing) return true;

    for (const actorPage of actorPages) {
      const guesserSurface = actorPage
        .locator('main [data-testid="survey-smash-guesser-input"]')
        .first();
      if (await guesserSurface.isVisible().catch(() => false)) {
        return true;
      }

      const guessAlongSurface = actorPage
        .locator('main [data-testid="survey-smash-guess-along-input"]')
        .first();
      if (await guessAlongSurface.isVisible().catch(() => false)) {
        return true;
      }

      const guessAlongPrompt = actorPage
        .locator("main")
        .getByText(/guess along|watch the board/i)
        .first();
      if (await guessAlongPrompt.isVisible().catch(() => false)) {
        return true;
      }

      const contextCard = actorPage.locator('[data-testid="controller-context-card"]').first();
      if (await contextCard.isVisible().catch(() => false)) {
        return true;
      }
    }

    return false;
  };
  const matchesTarget = async () => {
    if (targetNeedsActiveLightningRound) {
      const hostState = await readSurveySmashHostState(hostPage);
      if (hostState.phase === "lightning-round") {
        return true;
      }

      const hasLightningResults = await hostPage
        .getByText(/lightning round results/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (hasLightningResults) return false;

      const hasLightningHeading = await hostPage
        .getByText(/^lightning round!?$/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (hasLightningHeading) {
        return true;
      }

      return hasLightningControllerSurface();
    }

    const hasTargetText = await hostPage
      .getByText(pattern)
      .first()
      .isVisible()
      .catch(() => false);
    if (hasTargetText) {
      return hasControllerGuessingSurface();
    }

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
  const hasFaceOffState = async () => {
    if (!targetNeedsFaceOffState) return false;

    const hostFaceOff = await hostPage
      .getByText(/face-off/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (hostFaceOff) return true;

    let activeTextboxes = 0;
    for (const actorPage of actorPages) {
      const textbox = actorPage.locator("main").getByRole("textbox").first();
      if (await textbox.isVisible().catch(() => false)) {
        activeTextboxes += 1;
      }
    }
    return activeTextboxes >= 2;
  };

  while (Date.now() < deadline) {
    if (hostPage.isClosed()) {
      throw new Error(`Survey Smash host page closed before phase: ${String(pattern)}`);
    }

    if ((await matchesTarget()) || (await hasFaceOffState())) {
      return;
    }

    if (await hasFaceOffState()) {
      return;
    }

    const submitted = await submitSurveySmashInput(actorPages, "e2e-phase");
    if (submitted) {
      await hostPage.waitForTimeout(160).catch(() => {});
      if ((await matchesTarget()) || (await hasFaceOffState())) {
        return;
      }
      continue;
    }

    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click().catch(() => {});
      if ((await matchesTarget()) || (await hasFaceOffState())) {
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
