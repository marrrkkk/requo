import { expect, test, type Page } from "@playwright/test";

import { demoOwnerEmail, demoOwnerPassword } from "./fixtures";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(demoOwnerEmail);
  await page.getByLabel("Password").fill(demoOwnerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(
    page.getByText("Action center for BrightSide Print Studio"),
  ).toBeVisible({ timeout: 20_000 });
}

test("owner can sign in, reach the dashboard overview, and sign out", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await signIn(page);

  await page
    .getByRole("button", { name: "Morgan Lee demo@quoteflow.local" })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
});

test("dashboard shows a branded not-found state for unknown records", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/dashboard/inquiries/does-not-exist");

  await expect(
    page.getByText("That dashboard record could not be found."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to overview" })).toBeVisible();
});

test("sending a draft quote shows a safe delivery error when email is unavailable", async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/dashboard/quotes/demo_quote_draft_1001");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Send quote email" }).click();

  await expect(
    page.getByText(
      "Quote email delivery is unavailable right now. Configure email and try again.",
    ),
  ).toBeVisible();
});
