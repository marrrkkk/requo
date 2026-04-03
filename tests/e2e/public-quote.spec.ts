import { expect, test } from "@playwright/test";

import {
  demoExpiredQuotePublicToken,
  demoQuotePublicToken,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

test("public quote page validates long customer messages", async ({ page }) => {
  await page.goto(`/quote/${demoQuotePublicToken}`);
  await page.waitForLoadState("networkidle");

  await page
    .getByLabel("Message for the business")
    .fill("a".repeat(1_201));
  await page.getByRole("button", { name: "Accept quote" }).click();

  await expect(
    page.getByText("Customer response messages must be 1,200 characters or fewer."),
  ).toBeVisible();
});

test("customer can accept a sent quote from the public quote page", async ({
  page,
}) => {
  await page.goto(`/quote/${demoQuotePublicToken}`);
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", { level: 1, name: "Foundry Labs booth kit" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept quote" })).toBeVisible();

  await page
    .getByLabel("Message for the business")
    .fill("Looks good. Please move ahead and confirm the production timeline.");
  await page.getByRole("button", { name: "Accept quote" }).click();

  await expect(page.getByText("Quote accepted")).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText("This quote has already been accepted and recorded."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText("Looks good. Please move ahead and confirm the production timeline."),
  ).toBeVisible({ timeout: 20_000 });
});

test("expired public quote links stay read-only", async ({ page }) => {
  await page.goto(`/quote/${demoExpiredQuotePublicToken}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Quote no longer active")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept quote" })).toHaveCount(0);
});

test("invalid public quote links show the public not-found state", async ({
  page,
}) => {
  await page.goto("/quote/not-a-real-public-token");

  await expect(
    page.getByText("This public page is unavailable."),
  ).toBeVisible();
});
