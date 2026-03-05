import { type Locator, type Page, expect, test } from "@playwright/test";

import {
  APP_URL,
  createRoom,
  expectNoHorizontalOverflow,
  joinPlayerForRoom,
  selectGameAndStart,
  waitForColyseusHealthy,
} from "./e2e-helpers";

const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPhone 15 Pro Max", width: 428, height: 926 },
] as const;

async function expectTouchTargetAtLeast(locator: Locator, minSize = 44) {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const box = await locator.nth(i).boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(minSize);
      expect(box.width).toBeGreaterThanOrEqual(minSize);
    }
  }
}

test.describe("Mobile Responsiveness", () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test(`host homepage @ ${vp.name} has no overflow and tappable CTA`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      await page.goto("/");

      await expect(page.locator('img[alt="FLIMFLAM Party Game"]').first()).toBeVisible();
      const createRoomButton = page
        .getByRole("button", { name: /create a new game room/i })
        .first();
      await expect(createRoomButton).toBeVisible();

      const box = await createRoomButton.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }

      await expectNoHorizontalOverflow(page);
      await context.close();
    });
  }

  for (const vp of MOBILE_VIEWPORTS) {
    test(`controller join page @ ${vp.name} keeps input ergonomics`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      await page.goto(APP_URL);

      await expect(page.locator('img[alt="FLIMFLAM Party Game"]')).toBeVisible();
      await expect(page.getByText(/join the party from your phone/i)).toBeVisible();

      const codeInputs = page.locator('input[aria-label^="Room code character"]');
      await expect(codeInputs).toHaveCount(4);
      await expectTouchTargetAtLeast(codeInputs);

      const nameInput = page.getByLabel("Your Name");
      await expect(nameInput).toBeVisible();
      const nameBox = await nameInput.boundingBox();
      expect(nameBox).not.toBeNull();
      if (nameBox) {
        expect(nameBox.height).toBeGreaterThanOrEqual(44);
      }

      const colorButtons = page.locator('button[aria-label^="Select color"]');
      await expect(colorButtons.first()).toBeVisible();
      await expectTouchTargetAtLeast(colorButtons);

      await expectNoHorizontalOverflow(page);
      await context.close();
    });
  }

  test("host lobby @ mobile viewport keeps all core modules visible", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto("/");
    await waitForColyseusHealthy(page);

    await createRoom(page);

    await expect(page.getByRole("heading", { name: /^players$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^select game$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^difficulty$/i })).toBeVisible();

    await expect(page.getByRole("button", { name: /^Brain Board$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Lucky Letters$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Survey Smash$/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /waiting for players|start game/i }),
    ).toBeVisible();
    await expect(page.locator('img[alt="QR code to join the game"]')).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await context.close();
  });

  test("controller in-game experience remains usable on mobile", async ({ page, browser }) => {
    await page.goto("/");
    await waitForColyseusHealthy(page);
    const { code } = await createRoom(page);

    const c1 = await joinPlayerForRoom(browser, page, { code, name: "MobileA" });
    const c2 = await joinPlayerForRoom(browser, page, { code, name: "MobileB" });

    await selectGameAndStart(page, { gameName: "Survey Smash", complexity: "kids" });

    // Force into a phase where one controller has a submit action.
    const skipButton = page.getByRole("button", { name: /^skip$/i });
    await skipButton.click(); // question-reveal -> face-off
    await skipButton.click(); // face-off -> guessing

    const controllers = [c1.controllerPage, c2.controllerPage];
    let active: Page | null = null;
    for (let i = 0; i < 40; i++) {
      for (const controller of controllers) {
        if (
          await controller
            .getByRole("button", { name: /^submit$/i })
            .isVisible()
            .catch(() => false)
        ) {
          active = controller;
          break;
        }
      }
      if (active) break;
      await page.waitForTimeout(200);
    }

    expect(active).not.toBeNull();
    if (!active) {
      throw new Error("No active mobile controller found for Survey Smash guessing phase");
    }

    await expect(active.locator("button[aria-label^='React with']")).toHaveCount(8);
    await expectTouchTargetAtLeast(active.locator("button[aria-label^='React with']"));
    await expectNoHorizontalOverflow(active);

    await c1.context.close();
    await c2.context.close();
  });
});
