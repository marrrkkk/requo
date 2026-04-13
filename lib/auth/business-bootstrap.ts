import { eq, sql } from "drizzle-orm";

import type { WorkspacePlan } from "@/lib/plans/plans";

import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import { createInquiryFormConfigDefaults } from "@/features/inquiries/form-config";
import { createInquiryPageConfigDefaults } from "@/features/inquiries/page-config";
import { db } from "@/lib/db/client";
import {
  activityLogs,
  profiles,
  businessInquiryForms,
  businessMembers,
  businesses,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { appendRandomSlugSuffix, slugifyPublicName } from "@/lib/slugs";

type BootstrapUser = {
  id: string;
  name: string;
  email: string;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function getAvailableSlug(
  table: typeof businesses | typeof workspaces,
  baseSlug: string,
) {
  let candidate = baseSlug;

  while (true) {
    const existing = await db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.slug, candidate))
      .limit(1);

    if (!existing[0]) {
      return candidate;
    }

    candidate = appendRandomSlugSuffix(baseSlug, {
      fallback: "item",
    });
  }
}

export async function ensureProfileForUser(user: BootstrapUser) {
  const now = new Date();

  const [existingProfile] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (existingProfile) {
    return;
  }

  await db.insert(profiles).values({
    userId: user.id,
    fullName: user.name,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Creates a workspace for a user if they don't already have one.
 * Returns the workspace ID.
 */
async function ensureWorkspaceForUser(
  user: BootstrapUser,
  now: Date,
  plan: WorkspacePlan = "free",
) {
  // Check if user already has a workspace
  const [existingMembership] = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);

  if (existingMembership) {
    return existingMembership.workspaceId;
  }

  const workspaceBaseName = user.name.trim() || user.email.split("@")[0] || "My";
  const workspaceName = `${workspaceBaseName}'s Workspace`;
  const workspaceSlug = await getAvailableSlug(
    workspaces,
    slugifyPublicName(workspaceBaseName, { fallback: "workspace" }) + "-ws",
  );
  const workspaceId = createId("ws");

  await db.insert(workspaces).values({
    id: workspaceId,
    name: workspaceName,
    slug: workspaceSlug,
    plan,
    ownerUserId: user.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    id: createId("wm"),
    workspaceId,
    userId: user.id,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  return workspaceId;
}

export async function bootstrapBusinessForUser(
  user: BootstrapUser,
  options?: { plan?: WorkspacePlan },
) {
  const businessBaseName =
    user.name.trim() || user.email.split("@")[0] || "Requo";
  const businessName = `${businessBaseName}'s Business`;
  const now = new Date();

  await db.transaction(async (tx) => {
    const [existingProfile] = await tx
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    if (!existingProfile) {
      await tx.insert(profiles).values({
        userId: user.id,
        fullName: user.name,
        createdAt: now,
        updatedAt: now,
      });
    }

    const [existingMembership] = await tx
      .select({
        membershipId: businessMembers.id,
        businessId: businessMembers.businessId,
        role: businessMembers.role,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .where(eq(businessMembers.userId, user.id))
      .orderBy(
        sql`case when ${businessMembers.role} = 'owner' then 0 else 1 end`,
        businessMembers.createdAt,
      )
      .limit(1);

    if (!existingMembership) {
      // Ensure the user has a workspace
      const workspaceId = await ensureWorkspaceForUser(user, now, options?.plan);

      const businessSlug = await getAvailableSlug(
        businesses,
        slugifyPublicName(businessBaseName, {
          fallback: "business",
        }),
      );
      const businessId = createId("biz");
      const membershipId = createId("bm");
      const activityId = createId("act");
      const defaultInquiryForm = createInquiryFormPreset({
        businessType: "general_project_services",
        businessName,
      });

      await tx.insert(businesses).values({
        id: businessId,
        workspaceId,
        name: businessName,
        slug: businessSlug,
        businessType: "general_project_services",
        contactEmail: user.email,
        inquiryFormConfig: createInquiryFormConfigDefaults({
          businessType: "general_project_services",
        }),
        inquiryPageConfig: createInquiryPageConfigDefaults({
          businessName,
          businessType: "general_project_services",
        }),
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(businessInquiryForms).values({
        id: createId("ifm"),
        businessId,
        name: defaultInquiryForm.name,
        slug: defaultInquiryForm.slug,
        businessType: defaultInquiryForm.businessType,
        isDefault: true,
        publicInquiryEnabled: defaultInquiryForm.publicInquiryEnabled,
        inquiryFormConfig: defaultInquiryForm.inquiryFormConfig,
        inquiryPageConfig: defaultInquiryForm.inquiryPageConfig,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(businessMembers).values({
        id: membershipId,
        businessId,
        userId: user.id,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(activityLogs).values({
        id: activityId,
        businessId,
        actorUserId: user.id,
        type: "business.created",
        summary: "Business created during initial signup bootstrap.",
        metadata: {
          source: "better-auth-signup",
        },
        createdAt: now,
        updatedAt: now,
      });

      return;
    }

    if (existingMembership.role !== "owner") {
      await tx
        .update(businessMembers)
        .set({
          role: "owner",
          updatedAt: now,
        })
        .where(eq(businessMembers.id, existingMembership.membershipId));
    }
  });
}
