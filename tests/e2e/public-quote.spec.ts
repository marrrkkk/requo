import { expect, test } from "@playwright/test";

import { demoQuotePublicToken } from "./fixtures";

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

  await expect(page.getByText("Quote accepted")).toBeVisible();
  await expect(
    page.getByText("Looks good. Please move ahead and confirm the production timeline."),
  ).toBeVisible();
});
