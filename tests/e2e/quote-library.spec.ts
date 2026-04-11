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
}

test("owner can save a pricing block and insert it into a new quote", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const entryName = `Rush install ${Date.now()}`;
  const lineItemDescription = "Rush installation fee";
  const businessBasePath = `/businesses/${demoBusinessSlug}/dashboard`;

  await signIn(page);

  await page.goto(`${businessBasePath}/settings/pricing`);
  await page.waitForLoadState("networkidle");

  await page.getByRole("textbox", { name: "Name", exact: true }).fill(entryName);
  await page.getByRole("textbox", { name: "Description", exact: true }).fill(
    lineItemDescription,
  );
  await page.getByRole("spinbutton", { name: "Unit price" }).fill("125.00");
  await page.getByRole("button", { name: "Save pricing entry" }).click();

  await expect(page.getByText("No pricing blocks yet")).toBeHidden({
    timeout: 20_000,
  });
  await expect(
    page.locator('[data-slot="card-title"]').filter({ hasText: entryName }),
  ).toBeVisible({
    timeout: 20_000,
  });

  await page.goto(`${businessBasePath}/quotes/new`);
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Insert saved" }).click();
  await expect(page.getByText("Insert saved pricing")).toBeVisible();

  const pricingSheetEntry = page
    .getByTestId("quote-library-sheet-entry")
    .filter({ has: page.getByText(entryName, { exact: true }) });
  await page.getByPlaceholder("Search saved pricing").fill(entryName);
  await pricingSheetEntry.getByRole("button", { name: "Insert into quote" }).click();

  await expect(
    page.locator('input[id^="quote-item-description-"]').first(),
  ).toHaveValue(lineItemDescription);
  await page.getByLabel("Quote title").fill("Saved pricing test quote");
  await page.getByLabel("Customer name").fill("Taylor Nguyen");
  await page.getByLabel("Customer email").fill("taylor@example.com");
  await page.getByRole("button", { name: "Create draft quote" }).click();

  await expect(
    page,
  ).toHaveURL(new RegExp(`/businesses/${demoBusinessSlug}/dashboard/quotes/.+$`), {
    timeout: 20_000,
  });
  await expect(
    page.locator('input[id^="quote-item-description-"]').first(),
  ).toHaveValue(lineItemDescription, {
    timeout: 20_000,
  });
});
