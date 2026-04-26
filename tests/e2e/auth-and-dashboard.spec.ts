import { expect, test, type Page } from "@playwright/test";

import {
  demoOwnerEmail,
  demoOwnerPassword,
  demoBusinessSlug,
} from "./fixtures";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(demoOwnerEmail);
  await page.locator("#password").fill(demoOwnerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/workspaces$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Your workspaces" }),
  ).toBeVisible({ timeout: 20_000 });
}

async function openDemoBusiness(page: Page) {
  await page.goto(`/businesses/${demoBusinessSlug}/dashboard`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard$`),
    { timeout: 20_000 },
  );
  await expect(page.locator("h1")).toBeVisible({ timeout: 20_000 });

  const onboardingDialog = page.getByRole("dialog", {
    name: "Your inquiry form is live",
  });

  if (await onboardingDialog.isVisible()) {
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(onboardingDialog).toBeHidden();
  }
}

async function expectBodyScrollUnlocked(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.body.hasAttribute("data-scroll-locked")))
    .toBe(false);
}

test("owner can sign in, reach the dashboard overview, and sign out @smoke", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await signIn(page);
  await openDemoBusiness(page);

  await page
    .getByRole("button", { name: `Morgan Lee ${demoOwnerEmail}` })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
});

test("legacy account profile route redirects into business settings profile", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/account/profile");

  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard/settings/profile$`),
    { timeout: 20_000 },
  );
  await expect(page.locator("h1").filter({ hasText: "Profile" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(demoOwnerEmail);
});

test("dashboard user menu opens the new profile settings page", async ({
  page,
}) => {
  await signIn(page);
  await openDemoBusiness(page);

  await page
    .getByRole("button", { name: `Morgan Lee ${demoOwnerEmail}` })
    .click();
  await page.getByRole("menuitem", { name: "Your profile" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard/settings/profile$`),
    { timeout: 20_000 },
  );
  await expect(page.getByText("Owner profile")).toBeVisible();
  await expect(page.getByText("No avatar uploaded")).toBeVisible();
});

test("dashboard inquiry queue actions open filtered inquiry views", async ({
  page,
}) => {
  await signIn(page);
  await openDemoBusiness(page);

  const overdueHref = `/businesses/${demoBusinessSlug}/dashboard/inquiries?status=overdue`;
  const newHref = `/businesses/${demoBusinessSlug}/dashboard/inquiries?status=new`;

  const overdueLink = page.getByRole("link", { name: "All overdue" });
  await expect(overdueLink).toHaveAttribute("href", overdueHref);
  await overdueLink.click();
  await expect(page).toHaveURL(new RegExp(`${overdueHref}$`), {
    timeout: 20_000,
  });

  await openDemoBusiness(page);

  const newLink = page.getByRole("link", { name: "All new" });
  await expect(newLink).toHaveAttribute("href", newHref);
  await newLink.click();
  await expect(page).toHaveURL(new RegExp(`${newHref}$`), {
    timeout: 20_000,
  });
});

test("dashboard shows a branded not-found state for unknown records", async ({
  page,
}) => {
  await signIn(page);

  await page.goto(`/businesses/${demoBusinessSlug}/dashboard/inquiries/does-not-exist`);

  await expect(
    page.getByText("That dashboard record could not be found."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to overview" })).toBeVisible();
});

test("dashboard quick actions keep the top bar stable after scrolling", async ({
  page,
}) => {
  await signIn(page);
  await openDemoBusiness(page);

  const topbar = page.locator("header.dashboard-topbar");

  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
  });

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  const topBefore = await topbar.evaluate((element) =>
    Math.round(element.getBoundingClientRect().top),
  );

  await page.getByRole("button", { name: /Quick actions/i }).click();

  await expect(page.getByRole("dialog", { name: "Quick actions" })).toBeVisible();
  await expect(
    page.locator('[data-slot="dialog-overlay"][data-state="open"]'),
  ).toBeVisible();
  await expectBodyScrollUnlocked(page);

  const scrollAfter = await page.evaluate(() => window.scrollY);
  const topAfter = await topbar.evaluate((element) =>
    Math.round(element.getBoundingClientRect().top),
  );

  expect(Math.abs(topBefore)).toBeLessThanOrEqual(1);
  expect(Math.abs(topAfter)).toBeLessThanOrEqual(1);
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(1);
});

test("sending a draft quote shows a safe delivery error when email is unavailable", async ({
  page,
}) => {
  await signIn(page);

  await page.goto(
    `/businesses/${demoBusinessSlug}/dashboard/quotes/demo_quote_draft_1001`,
  );
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Send quote" }).click();
  await page.getByRole("menuitem", { name: "Send with Requo" }).click();

  await expect(
    page.getByText(
      "Quote email delivery is unavailable right now. Configure email and try again.",
    ),
  ).toBeVisible({ timeout: 20_000 });
});
