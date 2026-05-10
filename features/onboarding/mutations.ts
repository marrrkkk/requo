import "server-only";

import { eq } from "drizzle-orm";

import {
  type StarterTemplateBusinessType,
} from "@/features/businesses/starter-templates";
import { createBusinessRecordForUser } from "@/features/businesses/mutations";
import type { BusinessType } from "@/features/inquiries/business-types";
import type { InquiryFormConfig } from "@/features/inquiries/form-config";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import { businessMembers, businesses, profiles } from "@/lib/db/schema";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

type CompleteOnboardingForUserInput = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  jobTitle: string;
  companySize: string;
  referralSource: string;
  businessName: string;
  businessType: BusinessType;
  starterTemplateBusinessType: StarterTemplateBusinessType;
  countryCode: string;
  defaultCurrency: string;
  customerContactChannel: string;
  inquiryFormConfigOverride?: InquiryFormConfig;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function completeOnboardingForUser({
  user,
  jobTitle,
  companySize,
  referralSource,
  businessName,
  businessType,
  starterTemplateBusinessType,
  countryCode,
  defaultCurrency,
  customerContactChannel,
  inquiryFormConfigOverride,
}: CompleteOnboardingForUserInput) {
  await ensureProfileForUser(user);

  const now = new Date();

  return db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        jobTitle,
        companySize,
        referralSource,
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(profiles.userId, user.id));

    // Check if user already has a business (e.g., from invite flow)
    const [existingMembership] = await tx
      .select({
        businessId: businessMembers.businessId,
        plan: businesses.plan,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .where(eq(businessMembers.userId, user.id))
      .limit(1);

    let currentPlan: plan = "free";

    if (existingMembership) {
      currentPlan = existingMembership.plan as plan;
    }

    return createBusinessRecordForUser({
      tx,
      businessId: createId("biz"),
      defaultCurrency,
      countryCode,
      user,
      name: businessName,
      businessType,
      starterTemplateBusinessType,
      shortDescription: null,
      customerContactChannel,
      inquiryFormConfigOverride,
      plan: currentPlan,
      activitySource: "onboarding",
      activitySummary: "Business created during onboarding.",
      now,
    });
  });
}
