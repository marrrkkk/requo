import { expect, test, type Page } from "@playwright/test";

async function expectBodyScrollUnlocked(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.body.hasAttribute("data-scroll-locked")))
    .toBe(false);
}

test("marketing homepage highlights the signup-first workflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", {
      name: /Manage inquiries, quotes, and follow-up in one place\./,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Most of the work gets messy before the quote is ready\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /What the workspace actually covers\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /How Requo supports the workflow\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Common questions, answered clearly\./,
    }),
  ).toBeVisible();
  await expect(page.getByText("Does Requo replace my inbox?")).toBeVisible();
  await expect(page.getByText("Example workspace")).toBeVisible();
});

test("marketing homepage stays readable on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const mobileMenu = page.getByRole("button", { name: "Open navigation" });
  const primaryCta = page.getByRole("link", { name: "Start free" }).first();
  const secondaryCta = page.getByRole("link", { name: "See pricing" });

  await expect(mobileMenu).toBeVisible();
  await expect(primaryCta).toBeVisible();
  await expect(secondaryCta).toBeVisible();

  const primaryBox = await primaryCta.boundingBox();
  const secondaryBox = await secondaryCta.boundingBox();

  expect(primaryBox).not.toBeNull();
  expect(secondaryBox).not.toBeNull();

  if (primaryBox && secondaryBox) {
    expect(secondaryBox.y).toBeGreaterThan(primaryBox.y);
  }

  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });

  expect(hasHorizontalOverflow).toBe(false);

  const faqHeading = page.getByRole("heading", {
    name: /Common questions, answered clearly\./,
  });

  await faqHeading.scrollIntoViewIfNeeded();
  await expect(faqHeading).toBeVisible();
});

test("marketing mobile nav uses the shared backdrop without scroll locking", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open navigation" }).click();

  const overlay = page.locator('[data-slot="sheet-overlay"][data-state="open"]');

  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
  await expect(overlay).toBeVisible();
  await expectBodyScrollUnlocked(page);

  await overlay.click({ position: { x: 12, y: 12 } });

  await expect(page.getByRole("heading", { name: "Menu" })).toBeHidden();
});
