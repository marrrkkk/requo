import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";

import { createBusinessForUser } from "@/features/businesses/mutations";
import { completeOnboardingForUser } from "@/features/onboarding/mutations";
import {
  businessInquiryForms,
  businessMembers,
  businesses,
  profiles,
  user,
} from "@/lib/db/schema";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_onboarding_svc";
const now = new Date("2026-06-01T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

async function cleanup() {
  const ownedBusinesses = await testDb
    .select({ id: businesses.id })
    .from(businesses)
    .where(like(businesses.ownerUserId, `${prefix}%`));

  for (const business of ownedBusinesses) {
    await testDb
      .delete(businessInquiryForms)
      .where(eq(businessInquiryForms.businessId, business.id));
  }

  await testDb.delete(businessMembers).where(like(businessMembers.userId, `${prefix}%`));
  await testDb.delete(businesses).where(like(businesses.ownerUserId, `${prefix}%`));
  await testDb.delete(profiles).where(like(profiles.userId, `${prefix}%`));
  await testDb.delete(user).where(like(user.id, `${prefix}%`));
}

async function createTestUser(userId: string) {
  await testDb.insert(user).values({
    id: userId,
    name: "Onboarding Services Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Plants an existing business + owner membership so
 * `completeOnboardingForUser` resolves `currentPlan` from it, mirroring the
 * invite-flow branch of the mutation.
 */
async function createExistingBusiness({
  id: bizId,
  ownerUserId,
  plan: bizPlan = "free",
}: {
  id: string;
  ownerUserId: string;
  plan?: plan;
}) {
  await testDb.insert(businesses).values({
    id: bizId,
    ownerUserId,
    name: bizId,
    slug: slug(bizId),
    plan: bizPlan,
    businessType: "general_project_services",
    defaultCurrency: "USD",
    createdAt: now,
    updatedAt: now,
  });

  await testDb.insert(businessMembers).values({
    id: `${bizId}_member`,
    businessId: bizId,
    userId: ownerUserId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });
}

function inputFor(
  userId: string,
  businessName: string,
  services: Array<{ name: string }>,
  overrides: Partial<Parameters<typeof completeOnboardingForUser>[0]> = {},
): Parameters<typeof completeOnboardingForUser>[0] {
  return {
    user: {
      id: userId,
      name: "Onboarding Services Owner",
      email: `${userId}@example.com`,
    },
    firstName: "Ora",
    lastName: "Owner",
    businessName,
    businessType: "general_project_services",
    starterWorkflow: "project_quote",
    countryCode: "US",
    defaultCurrency: "USD",
    customerContactChannel: "email",
    services,
    ...overrides,
  };
}

async function listForms(businessId: string) {
  return testDb
    .select()
    .from(businessInquiryForms)
    .where(eq(businessInquiryForms.businessId, businessId));
}

afterAll(async () => {
  await closeTestDb();
});

describe("onboarding creates named services", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("creates one form row per named service with the first as default", async () => {
    const userId = `${prefix}_multi_owner`;
    await createTestUser(userId);
    await createExistingBusiness({
      id: `${prefix}_multi_existing`,
      ownerUserId: userId,
      plan: "pro",
    });

    const business = await completeOnboardingForUser(
      inputFor(userId, "Multi Services Co", [
        { name: "Website design" },
        { name: "SEO audit" },
        { name: "Hosting" },
      ]),
    );

    const forms = await listForms(business.id);

    expect(forms).toHaveLength(3);
    expect(forms.filter((form) => form.isDefault)).toHaveLength(1);
    expect(forms.find((form) => form.isDefault)?.name).toBe("Website design");

    const seo = forms.find((form) => form.name === "SEO audit");
    expect(seo?.isDefault).toBe(false);
    expect(seo?.publicInquiryEnabled).toBe(true);
    expect(seo?.slug).toBe("seo-audit");
  });

  it("falls back to the type-derived preset when no services are sent", async () => {
    const userId = `${prefix}_fallback_owner`;
    await createTestUser(userId);

    const business = await completeOnboardingForUser(
      inputFor(userId, "Fallback Co", []),
    );

    const forms = await listForms(business.id);

    expect(forms).toHaveLength(1);
    expect(forms[0]?.name).toBe("Project inquiry");
    expect(forms[0]?.isDefault).toBe(true);
  });

  it("trims services beyond the free plan's one live service", async () => {
    const userId = `${prefix}_trim_owner`;
    await createTestUser(userId);

    const business = await completeOnboardingForUser(
      inputFor(userId, "Trim Co", [
        { name: "Website design" },
        { name: "SEO audit" },
        { name: "Hosting" },
        { name: "Extra one" },
      ]),
    );

    const forms = await listForms(business.id);

    expect(forms).toHaveLength(1);
    expect(forms[0]?.name).toBe("Website design");
    expect(forms[0]?.isDefault).toBe(true);
  });

  it("allows up to the pro-plan limit of five live services", async () => {
    const userId = `${prefix}_pro_owner`;
    await createTestUser(userId);
    await createExistingBusiness({
      id: `${prefix}_pro_existing`,
      ownerUserId: userId,
      plan: "pro",
    });

    const business = await completeOnboardingForUser(
      inputFor(userId, "Pro Services Co", [
        { name: "Service one" },
        { name: "Service two" },
        { name: "Service three" },
        { name: "Service four" },
        { name: "Service five" },
        { name: "Service six" },
      ]),
    );

    const forms = await listForms(business.id);

    expect(forms).toHaveLength(5);
    expect(forms.filter((form) => form.isDefault)).toHaveLength(1);
  });

  it("dedupes slugs when two services normalize to the same slug", async () => {
    const userId = `${prefix}_slug_owner`;
    await createTestUser(userId);
    await createExistingBusiness({
      id: `${prefix}_slug_existing`,
      ownerUserId: userId,
      plan: "pro",
    });

    const business = await completeOnboardingForUser(
      inputFor(userId, "Slug Co", [
        { name: "Deep cleaning" },
        { name: "Deep  Cleaning!" },
      ]),
    );

    const forms = await listForms(business.id);
    const slugs = forms.map((form) => form.slug);

    expect(forms).toHaveLength(2);
    expect(new Set(slugs).size).toBe(2);
    expect(slugs).toContain("deep-cleaning");
  });

  it("writes the workflow-aware form config to the default service row", async () => {
    const userId = `${prefix}_config_owner`;
    await createTestUser(userId);

    const business = await completeOnboardingForUser(
      inputFor(userId, "Config Co", [{ name: "" }], {
        businessType: "cleaning_services",
        starterWorkflow: "recurring_service",
      }),
    );

    const [form] = await listForms(business.id);
    const [businessRow] = await testDb
      .select({ inquiryFormConfig: businesses.inquiryFormConfig })
      .from(businesses)
      .where(eq(businesses.id, business.id));

    // Config fix: the default form row now matches the workflow-aware
    // business-level config instead of the type-derived preset.
    expect(form?.inquiryFormConfig).toEqual(businessRow?.inquiryFormConfig);
  });
});

describe("businesses hub creates named services", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  function hubInputFor(
    userId: string,
    businessId: string,
    services: Array<{ name: string }>,
    hubPlan: plan = "pro",
  ): Parameters<typeof createBusinessForUser>[0] {
    return {
      user: {
        id: userId,
        name: "Hub Services Owner",
        email: `${userId}@example.com`,
      },
      businessId,
      defaultCurrency: "USD",
      name: "Hub Services Co",
      businessType: "general_project_services" as const,
      plan: hubPlan,
      onboardingServices: services,
      activitySource: "business-hub",
      activitySummary: "Business created.",
    };
  }

  it("creates one form row per named service through the hub path", async () => {
    const userId = `${prefix}_hub_owner`;
    await createTestUser(userId);

    const business = await createBusinessForUser(
      hubInputFor(userId, `${prefix}_hub_biz`, [
        { name: "Sign design" },
        { name: "Sign installation" },
      ]),
    );

    const forms = await listForms(business.id);

    expect(forms).toHaveLength(2);
    expect(forms.find((form) => form.isDefault)?.name).toBe("Sign design");
    expect(forms.find((form) => form.name === "Sign installation")?.slug).toBe(
      "sign-installation",
    );
  });

  it("trims hub services beyond the free plan's one live service", async () => {
    const userId = `${prefix}_hub_free_owner`;
    await createTestUser(userId);

    const business = await createBusinessForUser(
      hubInputFor(
        userId,
        `${prefix}_hub_free_biz`,
        [{ name: "Sign design" }, { name: "Sign installation" }],
        "free",
      ),
    );

    const forms = await listForms(business.id);

    expect(forms).toHaveLength(1);
    expect(forms[0]?.name).toBe("Sign design");
  });
});
