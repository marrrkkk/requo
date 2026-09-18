import { expect, test } from "@playwright/test";

test("solutions journey carries one record from inquiry to paid", async ({
  page,
}) => {
  await page.goto("/solutions/contractors-home-services#workflow");
  await page.waitForLoadState("networkidle");

  const workflow = page.locator("#workflow");
  await workflow.scrollIntoViewIfNeeded();

  await expect(
    workflow.getByRole("heading", {
      name: "One kitchen renovation. Inquiry to paid.",
    }),
  ).toBeVisible();

  const tabs = workflow.getByRole("tab");
  await expect(tabs).toHaveCount(4);
  await expect(workflow.getByText(/Sarah Jenkins/).first()).toBeVisible();

  await workflow.getByRole("tab", { name: "Paid" }).click();

  await expect(
    workflow.getByRole("heading", { name: "Approval becomes an invoice." }),
  ).toBeVisible();
  const panel = workflow.getByRole("tabpanel");
  await expect(panel.getByText("Balance due")).toBeVisible();
  await expect(panel.getByText("$0", { exact: true })).toBeVisible();
  // The identity bar still names the same record.
  await expect(workflow.getByText(/Sarah Jenkins/).first()).toBeVisible();
});

test("solutions journey renders industry-specific stages", async ({
  page,
}) => {
  await page.goto("/solutions/creative-marketing#workflow");
  await page.waitForLoadState("networkidle");

  const workflow = page.locator("#workflow");
  await workflow.scrollIntoViewIfNeeded();

  await expect(
    workflow.getByRole("heading", {
      name: "One brand project. Brief to paid.",
    }),
  ).toBeVisible();
  await expect(workflow.getByRole("tab", { name: "Approval" })).toBeVisible();

  await workflow.getByRole("tab", { name: "Approval" }).click();
  await expect(
    workflow.getByRole("heading", { name: "Approval locks the version." }),
  ).toBeVisible();
});

test("hero secondary CTA deep-links to the workflow section", async ({
  page,
}) => {
  await page.goto("/solutions/contractors-home-services");
  await page.waitForLoadState("networkidle");

  await page.getByRole("link", { name: "See the contractor workflow" }).click();
  await expect(page).toHaveURL(/#workflow$/);

  const workflow = page.locator("#workflow");
  await expect(
    workflow.getByRole("heading", {
      name: "One kitchen renovation. Inquiry to paid.",
    }),
  ).toBeVisible();
});

test("solutions journey works on a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/solutions/creative-marketing#workflow");
  await page.waitForLoadState("networkidle");

  const workflow = page.locator("#workflow");
  await workflow.scrollIntoViewIfNeeded();

  await expect(
    workflow.getByRole("heading", {
      name: "One brand project. Brief to paid.",
    }),
  ).toBeVisible();
  await expect(workflow.getByRole("tab")).toHaveCount(4);

  for (const name of ["Brief", "Quote", "Approval", "Paid"]) {
    await workflow.getByRole("tab", { name }).click();
    await expect(workflow.getByRole("tab", { name, selected: true })).toBeVisible();
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("solutions journey renders in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/solutions/contractors-home-services#workflow");
  await page.waitForLoadState("networkidle");

  const workflow = page.locator("#workflow");
  await workflow.scrollIntoViewIfNeeded();

  await expect(
    workflow.getByRole("heading", {
      name: "One kitchen renovation. Inquiry to paid.",
    }),
  ).toBeVisible();
  await workflow.getByRole("tab", { name: "Paid" }).click();
  await expect(
    workflow.getByRole("heading", { name: "Approval becomes an invoice." }),
  ).toBeVisible();
});

test("solutions journey swaps instantly under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/solutions/contractors-home-services#workflow");
  await page.waitForLoadState("networkidle");

  const workflow = page.locator("#workflow");
  await workflow.scrollIntoViewIfNeeded();

  for (const name of [
    "Project inquiry",
    "Quote",
    "Follow-up",
    "Paid",
  ]) {
    await workflow.getByRole("tab", { name }).click();
    await expect(workflow.getByRole("tab", { name, selected: true })).toBeVisible();
  }
  await expect(
    workflow.getByRole("heading", { name: "Approval becomes an invoice." }),
  ).toBeVisible();
});

test("solutions journey stepper supports keyboard travel", async ({
  page,
}) => {
  await page.goto("/solutions/contractors-home-services#workflow");
  await page.waitForLoadState("networkidle");

  const workflow = page.locator("#workflow");
  await workflow.scrollIntoViewIfNeeded();

  await workflow.getByRole("tab", { name: "Project inquiry" }).focus();
  await page.keyboard.press("ArrowRight");

  await expect(
    workflow.getByRole("tab", { name: "Quote", selected: true }),
  ).toBeVisible();
  await expect(
    workflow.getByRole("heading", { name: "Price it without starting over." }),
  ).toBeVisible();
});
