import "server-only";

import { eq } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import {
  type StarterTemplateBusinessType,
} from "@/features/businesses/starter-templates";
import { createBusinessRecordForUser } from "@/features/businesses/mutations";
import type { BusinessType } from "@/features/inquiries/business-types";
import type { InquiryFormConfig } from "@/features/inquiries/form-config";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import { profiles, workspaceMembers, workspaces } from "@/lib/db/schema";
import { appendRandomSlugSuffix, slugifyPublicName } from "@/lib/slugs";

type CompleteOnboardingForUserInput = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  workspaceName: string;
  businessName: string;
  businessType: BusinessType;
  starterTemplateBusinessType: StarterTemplateBusinessType;
  countryCode: string;
  defaultCurrency: string;
  inquiryFormConfigOverride?: InquiryFormConfig;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function completeOnboardingForUser({
  user,
  workspaceName,
  businessName,
  businessType,
  starterTemplateBusinessType,
  countryCode,
  defaultCurrency,
  inquiryFormConfigOverride,
}: CompleteOnboardingForUserInput) {
  await ensureProfileForUser(user);

  const now = new Date();

  return db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(profiles.userId, user.id));

    const [existingMembership] = await tx
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))
      .limit(1);

    let workspaceId: string;

    if (existingMembership) {
      workspaceId = existingMembership.workspaceId;

      await tx
        .update(workspaces)
        .set({
          name: workspaceName,
          updatedAt: now,
        })
        .where(eq(workspaces.id, workspaceId));
    } else {
      let workspaceSlugCandidate = slugifyPublicName(workspaceName, {
        fallback: "workspace",
      });

      while (true) {
        const [existing] = await tx
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, workspaceSlugCandidate))
          .limit(1);

        if (!existing) {
          break;
        }

        workspaceSlugCandidate = appendRandomSlugSuffix(
          workspaceSlugCandidate,
          {
            fallback: "workspace",
          },
        );
      }

      workspaceId = createId("ws");

      await tx.insert(workspaces).values({
        id: workspaceId,
        name: workspaceName,
        slug: workspaceSlugCandidate,
        plan: "free",
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

      await writeAuditLog(tx, {
        workspaceId,
        actorUserId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        entityType: "workspace",
        entityId: workspaceId,
        action: "workspace.created",
        metadata: {
          workspaceName,
          workspaceSlug: workspaceSlugCandidate,
          source: "onboarding",
        },
        createdAt: now,
      });
    }

    return createBusinessRecordForUser({
      tx,
      workspaceId,
      defaultCurrency,
      countryCode,
      user,
      name: businessName,
      businessType,
      starterTemplateBusinessType,
      shortDescription: null,
      inquiryFormConfigOverride,
      activitySource: "onboarding",
      activitySummary: "Business created during onboarding.",
      now,
    });
  });
}
