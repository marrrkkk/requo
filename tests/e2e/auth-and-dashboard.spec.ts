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

  await expect(page).toHaveURL(/\/businesses$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Choose a business" }),
  ).toBeVisible({ timeout: 20_000 });
}

async function openDemoBusiness(page: Page) {
  await page.goto(`/businesses/${demoBusinessSlug}/dashboard`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard$`),
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("heading", { name: "BrightSide Print Studio" }),
  ).toBeVisible({ timeout: 20_000 });
}

test("owner can sign in, reach the dashboard overview, and sign out", async ({
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
  const waitingHref = `/businesses/${demoBusinessSlug}/dashboard/inquiries?status=waiting`;

  const overdueLink = page.getByRole("link", { name: "All overdue" });
  await expect(overdueLink).toHaveAttribute("href", overdueHref);
  await overdueLink.click();
  await expect(page).toHaveURL(new RegExp(`${overdueHref}$`), {
    timeout: 20_000,
  });

  await openDemoBusiness(page);

  const waitingLink = page.getByRole("link", { name: "All waiting" });
  await expect(waitingLink).toHaveAttribute("href", waitingHref);
  await waitingLink.click();
  await expect(page).toHaveURL(new RegExp(`${waitingHref}$`), {
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

test("sending a draft quote shows a safe delivery error when email is unavailable", async ({
  page,
}) => {
  await signIn(page);

  await page.goto(
    `/businesses/${demoBusinessSlug}/dashboard/quotes/demo_quote_draft_1001`,
  );
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Send quote email" }).click();

  await expect(
    page.getByText(
      "Quote email delivery is unavailable right now. Configure email and try again.",
    ),
  ).toBeVisible({ timeout: 20_000 });
});
