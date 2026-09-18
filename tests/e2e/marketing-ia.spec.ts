import { expect, test } from "@playwright/test";

import { registerSmokeGuard } from "./smoke-registry";

registerSmokeGuard();

test("@smoke solutions hub lists all industries with one H1", async ({
  page,
}) => {
  await page.goto("/solutions");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle(/Quote Software by Industry/);
  const h1s = page.locator("h1");
  await expect(h1s).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Quote software by industry" }),
  ).toBeVisible();

  for (const name of [
    "Contractors & Home Services",
    "Professional Services",
    "Creative & Marketing",
    "Events & Production",
    "Cleaning & Outdoor Services",
    "Print & Custom Services",
  ]) {
    await expect(
      page.getByRole("link", { name: new RegExp(name) }).first(),
    ).toBeVisible();
  }
});

test("@smoke feature page targets its query with FAQ schema", async ({
  page,
}) => {
  await page.goto("/features/quotes");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle(/Quote Tracking Software/);
  const h1s = page.locator("h1");
  await expect(h1s).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      name: "Quote tracking software for service businesses",
    }),
  ).toBeVisible();
  await expect(page.getByText("What is quote tracking software?")).toBeVisible();

  const schemas = await page.locator('script[type="application/ld+json"]').allInnerTexts();
  expect(schemas.some((s) => s.includes('"FAQPage"'))).toBe(true);
  expect(schemas.some((s) => s.includes('"BreadcrumbList"'))).toBe(true);
});

test("@smoke about page corroborates the organization", async ({ page }) => {
  await page.goto("/about");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle(/About Requo/);
  await expect(page.getByRole("heading", { name: "What is Requo?" })).toBeVisible();
  await expect(page.getByText("Lucena City")).toBeVisible();
  await expect(page.getByText("support@requo.app")).toBeVisible();
  await expect(page.getByRole("link", { name: "Security" })).toBeVisible();
});

test("@smoke comparison page renders an honest table", async ({ page }) => {
  await page.goto("/compare/spreadsheets");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle(/Spreadsheets/);
  await expect(
    page.getByRole("heading", { name: "Quoting in Requo vs spreadsheets" }),
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Requo" })).toBeVisible();
  await expect(page.getByText("What do spreadsheets still do better?")).toBeVisible();
});

test("@smoke guide carries a matching HowTo schema", async ({ page }) => {
  await page.goto("/guides/inquiry-to-accepted-quote");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle(/Inquiry to Accepted Quote/);
  await expect(
    page.getByRole("heading", { name: "From inquiry to accepted quote" }),
  ).toBeVisible();

  const schemas = await page.locator('script[type="application/ld+json"]').allInnerTexts();
  const howTo = schemas.find((s) => s.includes('"HowTo"'));
  expect(howTo).toBeDefined();
  expect(howTo).toContain("Capture the inquiry with details and files");
});

test("@smoke pricing page has query H1, FAQ, and USD note", async ({
  page,
}) => {
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle(/Requo Pricing/);
  await expect(
    page.getByRole("heading", {
      name: "Requo pricing: free, Pro, and Business plans",
    }),
  ).toBeVisible();
  await expect(page.getByText("Subscriptions are billed in USD")).toBeVisible();
  await expect(
    page.getByText("What does a Requo subscription cost?"),
  ).toBeVisible();
});

test("@smoke pricing.md mirrors the plan catalog", async ({ page }) => {
  const response = await page.goto("/pricing.md");
  expect(response?.headers()["content-type"]).toContain("text/plain");
  const body = (await response?.text()) ?? "";
  expect(body).toContain("# Requo Pricing");
  expect(body).toContain("Pro");
  expect(body).toContain("$9");
  expect(body).toContain("$24");
});

test("solution page carries FAQ schema and feature cross-links", async ({
  page,
}) => {
  await page.goto("/solutions/contractors-home-services");
  await page.waitForLoadState("networkidle");

  const schemas = await page.locator('script[type="application/ld+json"]').allInnerTexts();
  expect(schemas.some((s) => s.includes('"FAQPage"'))).toBe(true);
  await expect(
    page.getByRole("link", { name: "AI drafting" }),
  ).toBeVisible();
});
