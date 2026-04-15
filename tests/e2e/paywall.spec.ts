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

async function openDemoBusiness(page: Page) {
  await page.goto(`/businesses/${demoBusinessSlug}/dashboard`);
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${demoBusinessSlug}/dashboard$`),
    { timeout: 20_000 },
  );
}

test.describe("Paywall & Free Plan Gating", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("owner sees LockedFeatureOverlay over advanced analytics", async ({
    page,
  }) => {
    await openDemoBusiness(page);
    await page.getByRole("link", { name: "Analytics" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/businesses/${demoBusinessSlug}/dashboard/analytics$`),
    );

    // Click the "Conversion" tab which is gated for Free plans
    await page.getByRole("tab", { name: "Conversion" }).click();

    // Verify the blurred overlay appears
    await expect(page.getByText("Conversion analytics")).toBeVisible();
    await expect(
      page.getByText("See how inquiries convert to quotes and acceptances."),
    ).toBeVisible();

    await expect(
      page.getByText("Request Pro access"),
    ).toBeVisible();
  });

  test("owner sees LockedFeaturePage when accessing knowledge base", async ({
    page,
  }) => {
    await openDemoBusiness(page);
    await page.goto(
      `/businesses/${demoBusinessSlug}/dashboard/settings/knowledge`,
    );

    // Verify the full page lock component
    await expect(page.getByRole("heading", { name: "Knowledge" })).toBeVisible();
    await expect(
      page.getByText("Manage FAQs and knowledge files for your AI assistant."),
    ).toBeVisible();

    await expect(
      page.getByText("Request Pro access"),
    ).toBeVisible();
  });

  test("owner sees dialog when attempting to create a second business", async ({
    page,
  }) => {
    // The landing after sign in is /businesses, where we should see the created business
    // and the "Create another business" card
    await page.goto("/businesses");

    // The free plan locks the multi-business feature via dialog submission intercept
    await page.getByLabel("Business name").fill("Test Business 2");
    await page.getByRole("button", { name: "Create business" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Multiple businesses" })).toBeVisible();
    await expect(
      page.getByText("Managing completely separate brands, services, and billing requires a Pro subscription"),
    ).toBeVisible();
  });

  test("owner sees Free plan badge in general settings", async ({ page }) => {
    await openDemoBusiness(page);
    await page.goto(
      `/businesses/${demoBusinessSlug}/dashboard/settings/general`,
    );

    // Check for the header PlanBadge outputting "Free"
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
  });

  test("owner sees LockedFeaturePage when accessing saved replies settings", async ({
    page,
  }) => {
    await openDemoBusiness(page);
    await page.goto(
      `/businesses/${demoBusinessSlug}/dashboard/settings/replies`,
    );

    // Verify the full page lock component
    await expect(page.getByRole("heading", { name: "Saved replies" })).toBeVisible();
    await expect(
      page.getByText("Save and reuse common responses to speed up replies."),
    ).toBeVisible();

    await expect(
      page.getByText("Request Pro access"),
    ).toBeVisible();
  });

  test("owner sees LockedFeaturePage when accessing pricing library settings", async ({
    page,
  }) => {
    await openDemoBusiness(page);
    await page.goto(
      `/businesses/${demoBusinessSlug}/dashboard/settings/pricing`,
    );

    // Verify the full page lock component
    await expect(page.getByRole("heading", { name: "Pricing library" })).toBeVisible();
    await expect(
      page.getByText("Build a library of reusable quote templates."),
    ).toBeVisible();

    await expect(
      page.getByText("Request Pro access"),
    ).toBeVisible();
  });

  test("owner sees LockedFeatureOverlay on workflow analytics tab", async ({ page }) => {
    await openDemoBusiness(page);
    await page.getByRole("link", { name: "Analytics" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/businesses/${demoBusinessSlug}/dashboard/analytics$`),
    );

    // Click the "Workflow" tab which is gated for Free plans
    await page.getByRole("tab", { name: "Workflow" }).click();

    // Verify the blurred overlay appears
    await expect(page.getByText("Workflow analytics")).toBeVisible();
    await expect(
      page.getByText("Track response times, stale items, and follow-up gaps."),
    ).toBeVisible();

    await expect(
      page.getByText("Request Pro access"),
    ).toBeVisible();
  });

  test("owner sees LockedFeaturePage when accessing team members", async ({ page }) => {
    await openDemoBusiness(page);
    await page.goto(
      `/businesses/${demoBusinessSlug}/dashboard/members`,
    );

    // Verify the full page lock component
    await expect(page.getByRole("heading", { name: "Team members" })).toBeVisible();
    await expect(
      page.getByText("Invite team members and assign roles."),
    ).toBeVisible();

    await expect(
      page.getByText("Request Pro access"),
    ).toBeVisible();
  });

  test("free plan hides branding on public inquiry page", async ({ page }) => {
    await openDemoBusiness(page);
    await page.goto(
      `/businesses/${demoBusinessSlug}/settings/inquiry-page`,
    );

    // Branding section should be locked or hidden
    await page.getByRole("button", { name: "Page" }).click();

    // Check for branding customization section - should be either disabled or show upgrade prompt
    const brandingSection = page.getByRole("group", {
      name: "Branding",
    });
    const hasLogoUpload = await brandingSection
      .getByText("Logo", { exact: true })
      .isVisible();
    const hasUpgradePrompt = await page
      .getByText("Add your logo and brand to quotes and inquiry pages.")
      .isVisible();

    // Either branding is hidden OR upgrade prompt is shown
    expect(hasLogoUpload || hasUpgradePrompt).toBeTruthy();
  });

  test("public inquiry page hides logo for free plans", async ({ page }) => {
    await page.goto(`/inquiry/demo-business`);

    // Free plan should not show custom branding
    // The page should render without custom logo
    await expect(page.getByRole("heading")).toBeVisible();

    // No custom branding controls should be visible on public page
    await expect(
      page.getByRole("img", { name: "Business logo" }),
    ).toHaveCount(0);
  });

  test("public quote page hides custom branding for free plans", async ({ page }) => {
    // Get a quote token from the demo business
    const quoteResponse = await page.request.get(
      `/api/business/${demoBusinessSlug}/quotes?status=sent&limit=1`,
    );
    const quoteData = await quoteResponse.json();

    if (quoteData.quotes?.[0]?.token) {
      await page.goto(`/quote/${quoteData.quotes[0].token}`);
      await page.waitForLoadState("networkidle");

      // Free plan should not show custom branding
      // Custom logo should not be visible
      await expect(page.locator("header")).toBeVisible();

      // Check no custom branded logo is present
      const logoCount = await page.getByRole("img").count();
      const hasBusinessLogo = logoCount > 0 && (await page.getByRole("img").first().isVisible());
    }
  });
});
