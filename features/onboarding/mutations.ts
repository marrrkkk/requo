import "server-only";

import { eq } from "drizzle-orm";

import { normalizeOptionalTextValue } from "@/features/account/schemas";
import { resolveCurrencyForCountry } from "@/features/businesses/locale";
import { createBusinessRecordForUser } from "@/features/businesses/mutations";
import type { BusinessType } from "@/features/inquiries/business-types";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import {
  profiles,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import type { WorkspacePlan } from "@/lib/plans/plans";
import { slugifyPublicName, appendRandomSlugSuffix } from "@/lib/slugs";

type CompleteOnboardingForUserInput = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  workspaceName: string;
  workspacePlan: WorkspacePlan;
  businessName: string;
  businessType: BusinessType;
  countryCode: string;
  fullName: string;
  jobTitle: string;
  referralSource: string;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function completeOnboardingForUser({
  user,
  workspaceName,
  workspacePlan,
  businessName,
  businessType,
  countryCode,
  fullName,
  jobTitle,
  referralSource,
}: CompleteOnboardingForUserInput) {
  await ensureProfileForUser(user);

  const now = new Date();

  return db.transaction(async (tx) => {
    // Update profile
    await tx
      .update(profiles)
      .set({
        fullName,
        jobTitle,
        referralSource: normalizeOptionalTextValue(referralSource),
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(profiles.userId, user.id));

    // Check if user already has a workspace (e.g., from invite acceptance)
    const [existingMembership] = await tx
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))
      .limit(1);

    let workspaceId: string;

    if (existingMembership) {
      workspaceId = existingMembership.workspaceId;
    } else {
      // Create workspace for the user with the provided name and plan
      let workspaceSlugCandidate = slugifyPublicName(workspaceName, { fallback: "workspace" });

      // Check slug uniqueness within transaction
      while (true) {
        const [existing] = await tx
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, workspaceSlugCandidate))
          .limit(1);

        if (!existing) break;
        workspaceSlugCandidate = appendRandomSlugSuffix(workspaceSlugCandidate, { fallback: "workspace" });
      }

      workspaceId = createId("ws");

      await tx.insert(workspaces).values({
        id: workspaceId,
        name: workspaceName,
        slug: workspaceSlugCandidate,
        plan: workspacePlan,
        ownerUserId: user.id,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(workspaceMembers).values({
        id: createId("wm"),
        workspaceId,
        userId: user.id,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      });
    }

    const defaultCurrency = resolveCurrencyForCountry(countryCode);

    if (!defaultCurrency) {
      throw new Error("A supported currency could not be resolved for that country.");
    }

    // Create the business inside the workspace
    return createBusinessRecordForUser({
      tx,
      workspaceId,
      defaultCurrency,
      countryCode,
      user,
      name: businessName,
      businessType,
      shortDescription: null,
      activitySource: "onboarding",
      activitySummary: "Business created during onboarding.",
      now,
    });
  });
}
