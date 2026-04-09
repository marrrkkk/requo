import "server-only";

import { eq } from "drizzle-orm";

import { normalizeOptionalTextValue } from "@/features/account/schemas";
import { createBusinessRecordForUser } from "@/features/businesses/mutations";
import type { BusinessType } from "@/features/inquiries/business-types";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

type CompleteOnboardingForUserInput = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  businessName: string;
  businessType: BusinessType;
  countryCode: string;
  shortDescription: string;
  fullName: string;
  jobTitle: string;
  phone: string;
};

export async function completeOnboardingForUser({
  user,
  businessName,
  businessType,
  countryCode,
  shortDescription,
  fullName,
  jobTitle,
  phone,
}: CompleteOnboardingForUserInput) {
  await ensureProfileForUser(user);

  const now = new Date();

  return db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        fullName,
        jobTitle,
        phone: normalizeOptionalTextValue(phone),
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(profiles.userId, user.id));

    return createBusinessRecordForUser({
      tx,
      countryCode,
      user,
      name: businessName,
      businessType,
      shortDescription: normalizeOptionalTextValue(shortDescription),
      activitySource: "onboarding",
      activitySummary: "Business created during onboarding.",
      now,
    });
  });
}
