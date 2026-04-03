import { expect, test } from "@playwright/test";

import { demoOwnerEmail, demoOwnerPassword } from "./fixtures";

test("owner can sign in, reach the dashboard overview, and sign out", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email address").fill(demoOwnerEmail);
  await page.getByLabel("Password").fill(demoOwnerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Clear view of the work",
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(
    page.getByRole("banner").getByText("BrightSide Print Studio"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
});
