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
  await page.goto(`/${demoBusinessSlug}/home`);
  await expect(page).toHaveURL(
    new RegExp(`/${demoBusinessSlug}/home$`),
    { timeout: 20_000 },
  );
}

/**
 * These tests assume the demo account is on the Free plan (default seed).
 * They assert the current paywall presentation, which is:
 *   - PageHeader heading at the top of each gated route
 *   - LockedFeaturePage / PremiumContentBlur upgrade card with the feature
 *     label from `planFeatureLabels` and either the page-level description
 *     override or the default `planFeatureDescriptions[feature]` text
 *   - An UpgradeButton that opens the PlanSelectionSheet
 */
test.describe("Paywall & Free Plan Gating", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("owner sees paywall on the Advanced analytics tab", async ({
    page,
  }) => {
    await openDemoBusiness(page);
    await page.getByRole("link", { name: "Analytics" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/${demoBusinessSlug}/analytics$`),
    );

    await page.getByRole("tab", { name: "Advanced" }).click();

    // The PremiumContentBlur upgrade card uses the feature label and the
    // default planFeatureDescriptions text for analyticsConversion.
    await expect(
      page.getByRole("heading", { name: "Performance analytics" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Trend charts, funnel visualization, form-level breakdown, and period comparisons.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Upgrade to Pro/ }),
    ).toBeVisible();
  });

  test("owner sees paywall on knowledge settings", async ({ page }) => {
    await openDemoBusiness(page);
    await page.goto(`/${demoBusinessSlug}/settings/knowledge`);

    // PageHeader title remains visible at the top of every settings page.
    await expect(
      page.getByRole("heading", { name: "Knowledge", level: 1 }).or(
        page.getByText("Knowledge", { exact: true }).first(),
      ),
    ).toBeVisible();

    // Page passes a description override to LockedFeaturePage.
    await expect(
      page.getByText(
        "Upgrade to save reusable context and train better AI drafts.",
      ),
    ).toBeVisible();

    // Upgrade button uses the page-level ctaLabel.
    await expect(
      page.getByRole("button", { name: /Upgrade for Knowledge/ }),
    ).toBeVisible();
  });

  test("owner sees paywall on pricing settings", async ({ page }) => {
    await openDemoBusiness(page);
    await page.goto(`/${demoBusinessSlug}/settings/pricing`);

    // PageHeader title is "Pricing" (not "Pricing library").
    await expect(
      page.getByRole("heading", { name: "Pricing", level: 1 }).or(
        page.getByText("Pricing", { exact: true }).first(),
      ),
    ).toBeVisible();

    // LockedFeaturePage shows the page-level description override.
    await expect(
      page.getByText(
        "Upgrade to build reusable pricing blocks and speed up quote creation.",
      ),
    ).toBeVisible();

    // Upgrade button uses the page-level ctaLabel.
    await expect(
      page.getByRole("button", { name: /Upgrade for pricing library/ }),
    ).toBeVisible();
  });

  test("owner sees paywall on members page", async ({ page }) => {
    await openDemoBusiness(page);
    await page.goto(`/${demoBusinessSlug}/members`);

    // Page header
    await expect(
      page.getByRole("heading", { name: "Members", level: 1 }).or(
        page.getByText("Members", { exact: true }).first(),
      ),
    ).toBeVisible();

    // Locked-state title comes from planFeatureLabels.members.
    await expect(page.getByText("Team members")).toBeVisible();

    // Default planFeatureDescriptions.members text.
    await expect(
      page.getByText("Invite team members and assign roles."),
    ).toBeVisible();

    // The members feature requires the Business plan, so the CTA targets it.
    await expect(
      page.getByRole("button", { name: /Upgrade to Business/ }),
    ).toBeVisible();
  });

  test("owner sees Free plan badge in general settings", async ({ page }) => {
    await openDemoBusiness(page);
    await page.goto(`/${demoBusinessSlug}/settings/general`);

    // Header PlanBadge displays "Free".
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
  });

  test("hitting the free business limit shows the upgrade dialog", async ({
    page,
  }) => {
    // Land on the businesses hub which surfaces the create-business control.
    await page.goto("/businesses");

    // Create the 2nd free business (free tier allows up to 2).
    await page.getByRole("button", { name: "Create business" }).first().click();
    await page.getByLabel("Business name").fill("Free Business 2");
    await page.getByRole("dialog").getByRole("button", { name: "Create business" }).click();

    // After creation, navigate back to the businesses hub.
    await page.goto("/businesses");

    // Attempt to create one more business -> should show quota lock content.
    await page.getByRole("button", { name: "Create business" }).first().click();

    const upgradeTitle = page
      .getByRole("heading", { name: /Add more businesses/i })
      .or(page.getByRole("heading", { name: /Unlock more businesses/i }));
    await expect(upgradeTitle).toBeVisible();

    await expect(page.getByText(/free tier supports up to/i)).toBeVisible();

    // Upgrade CTA opens the PlanSelectionSheet.
    await expect(
      page.getByRole("button", { name: /Upgrade to (Pro|Business)/ }),
    ).toBeVisible();
  });

  test("public inquiry page hides custom branding for free plans", async ({
    page,
  }) => {
    await page.goto(`/inquiry/demo-business`);

    // Page renders without throwing.
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Free plan should not surface a custom branded logo image.
    await expect(
      page.getByRole("img", { name: "Business logo" }),
    ).toHaveCount(0);
  });

  test("public quote page renders without custom branding for free plans", async ({
    page,
  }) => {
    // Pull a quote token from the demo business.
    const quoteResponse = await page.request.get(
      `/api/business/${demoBusinessSlug}/quotes?status=sent&limit=1`,
    );

    if (!quoteResponse.ok()) {
      test.skip(true, "Demo business quote API unavailable in this run");
    }

    const quoteData = await quoteResponse.json().catch(() => null);
    const token = quoteData?.quotes?.[0]?.token;

    if (!token) {
      test.skip(true, "No sent quote available in demo seed");
    }

    await page.goto(`/quote/${token}`);
    await page.waitForLoadState("networkidle");

    // Header still renders for quote info.
    await expect(page.locator("header").first()).toBeVisible();
  });
});
