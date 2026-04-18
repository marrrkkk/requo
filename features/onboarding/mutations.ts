import "server-only";

import { and, eq } from "drizzle-orm";

import { getEffectivePlan } from "@/lib/billing/subscription-service";
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

/**
 * First workspace membership for a user (onboarding uses a single workspace).
 */
export async function getFirstWorkspaceIdForUser(
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  return row?.workspaceId ?? null;
}

type OnboardingUser = {
  id: string;
  name: string;
  email: string;
};

/**
 * Creates a free workspace for checkout, or returns the user's existing workspace
 * and keeps the workspace name in sync.
 */
export async function ensureWorkspaceForOnboarding(
  user: OnboardingUser,
  workspaceName: string,
): Promise<{ workspaceId: string; workspaceSlug: string }> {
  await ensureProfileForUser(user);

  const nameTrimmed = workspaceName.trim();
  const now = new Date();

  const [existingMembership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);

  if (existingMembership) {
    const [ws] = await db
      .select({
        id: workspaces.id,
        slug: workspaces.slug,
        name: workspaces.name,
        ownerUserId: workspaces.ownerUserId,
      })
      .from(workspaces)
      .where(eq(workspaces.id, existingMembership.workspaceId))
      .limit(1);

    if (!ws || ws.ownerUserId !== user.id) {
      throw new Error("Workspace access denied.");
    }

    if (ws.name !== nameTrimmed) {
      await db
        .update(workspaces)
        .set({ name: nameTrimmed, updatedAt: now })
        .where(eq(workspaces.id, ws.id));
    }

    return { workspaceId: ws.id, workspaceSlug: ws.slug };
  }

  return db.transaction(async (tx) => {
    let workspaceSlugCandidate = slugifyPublicName(nameTrimmed, {
      fallback: "workspace",
    });

    while (true) {
      const [existing] = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, workspaceSlugCandidate))
        .limit(1);

      if (!existing) break;
      workspaceSlugCandidate = appendRandomSlugSuffix(workspaceSlugCandidate, {
        fallback: "workspace",
      });
    }

    const workspaceId = createId("ws");

    await tx.insert(workspaces).values({
      id: workspaceId,
      name: nameTrimmed,
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

    return { workspaceId, workspaceSlug: workspaceSlugCandidate };
  });
}

export async function verifyOnboardingPaidPlanForUser(
  userId: string,
  workspaceSlug: string,
  expectedPlan: "pro" | "business",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);

  if (!ws) {
    return { ok: false, error: "Workspace not found." };
  }

  const [member] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, ws.id),
      ),
    )
    .limit(1);

  if (!member) {
    return { ok: false, error: "Workspace not found." };
  }

  const effective = await getEffectivePlan(ws.id);
  if (effective !== expectedPlan) {
    return {
      ok: false,
      error: "Complete payment for your selected plan to continue.",
    };
  }

  return { ok: true };
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

      await tx
        .update(workspaces)
        .set({
          name: workspaceName,
          updatedAt: now,
        })
        .where(eq(workspaces.id, workspaceId));
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
