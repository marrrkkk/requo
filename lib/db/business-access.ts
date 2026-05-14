import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { cache } from "react";

import {
  getUserBusinessContextCacheTags,
  getUserMembershipsCacheTags,
  membershipShellCacheLife,
} from "@/lib/cache/shell-tags";
import { getCachedEffectivePlanForUser } from "@/lib/billing/subscription-service";

import type {
  BusinessRecordState,
  BusinessRecordView,
} from "@/features/businesses/lifecycle";
import {
  getBusinessRecordState,
  getBusinessViewCondition,
} from "@/features/businesses/lifecycle";
import type { BusinessType } from "@/features/inquiries/business-types";
import type { BusinessPlan } from "@/lib/plans/plans";
import {
  type BusinessMemberRole,
  businessMemberRoleMeta,
  canManageBusinessAdministration,
  canManageBusinessMembers,
  canManageBusinessWorkspace,
  canManageOperationalBusinessSettings,
  hasBusinessRoleAccess,
} from "@/lib/business-members";
import {
  getOptionalSession,
  requireUser,
  type AuthUser,
} from "@/lib/auth/session";
import { activeBusinessSlugCookieName } from "@/features/businesses/routes";
import { db } from "@/lib/db/client";
import {
  user,
  businessInquiryForms,
  businessMembers,
  businesses,
} from "@/lib/db/schema";

export type BusinessContext = {
  membershipId: string;
  role: BusinessMemberRole;
  memberJoinedAt: Date;
  business: {
    id: string;
    plan: BusinessPlan;
    name: string;
    slug: string;
    businessType: BusinessType;
    logoStoragePath: string | null;
    defaultCurrency: string;
    publicInquiryEnabled: boolean;
    recordState: BusinessRecordState;
    archivedAt: Date | null;
    lockedAt: Date | null;
    deletedAt: Date | null;
  };
};

export type BusinessActionBlockedReason =
  | "business_required"
  | "insufficient_role"
  | "business_locked_by_plan"
  | "business_not_active";

export type BusinessActionContextResult =
  | {
      ok: true;
      user: AuthUser;
      businessContext: BusinessContext;
    }
  | {
      ok: false;
      error: string;
      reason: BusinessActionBlockedReason;
    };

export type BusinessMessagingSettings = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  contactEmail: string | null;
  defaultEmailSignature: string | null;
  quoteEmailTemplate: import("@/features/settings/email-templates").QuoteEmailTemplateConfig | null;
  notifyOnNewInquiry: boolean;
  notifyOnQuoteSent: boolean;
  notifyOnQuoteResponse: boolean;
  notifyOnMemberInviteResponse: boolean;
  notifyInAppOnNewInquiry: boolean;
  notifyInAppOnQuoteSent: boolean;
  notifyInAppOnQuoteResponse: boolean;
  notifyInAppOnMemberInviteResponse: boolean;
  notifyPushOnNewInquiry: boolean;
  notifyPushOnQuoteSent: boolean;
  notifyPushOnQuoteResponse: boolean;
  notifyPushOnMemberInviteResponse: boolean;
  notifyOnFollowUpReminder: boolean;
  notifyInAppOnFollowUpReminder: boolean;
  notifyOnQuoteExpiring: boolean;
  notifyInAppOnQuoteExpiring: boolean;
};

function getBusinessRoleSortExpression() {
  return sql`case
    when ${businessMembers.role} = 'owner' then 0
    when ${businessMembers.role} = 'manager' then 1
    else 2
  end`;
}

async function getCachedBusinessMemberships(
  userId: string,
  view: BusinessRecordView | "all" = "active",
) {
  "use cache";

  cacheLife(membershipShellCacheLife);
  cacheTag(...getUserMembershipsCacheTags(userId));

  const publicInquiryEnabledSelection = sql<boolean>`coalesce((
    select ${businessInquiryForms.publicInquiryEnabled}
    from ${businessInquiryForms}
    where ${businessInquiryForms.businessId} = ${businesses.id}
      and ${businessInquiryForms.isDefault} = true
      and ${businessInquiryForms.archivedAt} is null
    limit 1
  ), false)`;

  const memberships = await db
    .select({
      membershipId: businessMembers.id,
      role: businessMembers.role,
      memberJoinedAt: businessMembers.createdAt,
      businessId: businesses.id,
      businessPlan: businesses.plan,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessType: businesses.businessType,
      businessLogoStoragePath: businesses.logoStoragePath,
      defaultCurrency: businesses.defaultCurrency,
      publicInquiryEnabled: publicInquiryEnabledSelection,
      recordState: getBusinessRecordState,
      archivedAt: businesses.archivedAt,
      lockedAt: businesses.lockedAt,
      deletedAt: businesses.deletedAt,
      ownerUserId: businesses.ownerUserId,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(
      and(
        eq(businessMembers.userId, userId),
        view === "all" ? undefined : getBusinessViewCondition(view),
      ),
    )
    .orderBy(
      getBusinessRoleSortExpression(),
      asc(businesses.name),
      asc(businesses.createdAt),
    );

  return memberships.map((membership) => ({
    membershipId: membership.membershipId,
    role: membership.role,
    memberJoinedAt: membership.memberJoinedAt,
    ownerUserId: membership.ownerUserId,
    business: {
      id: membership.businessId,
      plan: membership.businessPlan as BusinessPlan,
      name: membership.businessName,
      slug: membership.businessSlug,
      businessType: membership.businessType,
      logoStoragePath: membership.businessLogoStoragePath,
      defaultCurrency: membership.defaultCurrency,
      publicInquiryEnabled: membership.publicInquiryEnabled,
      recordState: membership.recordState,
      archivedAt: membership.archivedAt,
      lockedAt: membership.lockedAt,
      deletedAt: membership.deletedAt,
    },
  }));
}

export const getBusinessMembershipsForUser = cache(async (
  userId: string,
  view: BusinessRecordView | "all" = "active",
) => {
  const memberships = await getCachedBusinessMemberships(userId, view);

  return applyEffectiveBusinessPlans(memberships);
});

async function getCachedBusinessContextForMembershipSlug(
  userId: string,
  businessSlug: string,
  includeInactive = true,
) {
  "use cache";

  cacheLife(membershipShellCacheLife);
  cacheTag(...getUserBusinessContextCacheTags(userId, businessSlug));

  const publicInquiryEnabledSelection = sql<boolean>`coalesce((
    select ${businessInquiryForms.publicInquiryEnabled}
    from ${businessInquiryForms}
    where ${businessInquiryForms.businessId} = ${businesses.id}
      and ${businessInquiryForms.isDefault} = true
      and ${businessInquiryForms.archivedAt} is null
    limit 1
  ), false)`;

  const [context] = await db
    .select({
      membershipId: businessMembers.id,
      role: businessMembers.role,
      memberJoinedAt: businessMembers.createdAt,
      businessId: businesses.id,
      businessPlan: businesses.plan,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessType: businesses.businessType,
      businessLogoStoragePath: businesses.logoStoragePath,
      defaultCurrency: businesses.defaultCurrency,
      publicInquiryEnabled: publicInquiryEnabledSelection,
      recordState: getBusinessRecordState,
      archivedAt: businesses.archivedAt,
      lockedAt: businesses.lockedAt,
      deletedAt: businesses.deletedAt,
      ownerUserId: businesses.ownerUserId,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businesses.slug, businessSlug),
        includeInactive ? undefined : getBusinessViewCondition("active"),
      ),
    )
    .limit(1);

  if (!context) {
    return null;
  }

  return {
    membershipId: context.membershipId,
    role: context.role,
    memberJoinedAt: context.memberJoinedAt,
    ownerUserId: context.ownerUserId,
    business: {
      id: context.businessId,
      plan: context.businessPlan as BusinessPlan,
      name: context.businessName,
      slug: context.businessSlug,
      businessType: context.businessType,
      logoStoragePath: context.businessLogoStoragePath,
      defaultCurrency: context.defaultCurrency,
      publicInquiryEnabled: context.publicInquiryEnabled,
      recordState: context.recordState,
      archivedAt: context.archivedAt,
      lockedAt: context.lockedAt,
      deletedAt: context.deletedAt,
    },
  };
}

export const getBusinessContextForMembershipSlug = cache(async (
  userId: string,
  businessSlug: string,
  includeInactive = true,
) => {
  const context = await getCachedBusinessContextForMembershipSlug(
    userId,
    businessSlug,
    includeInactive,
  );

  return applyEffectiveBusinessPlan(context);
});

/**
 * Resolve the effective plan for each unique owner in one pass. All
 * businesses owned by the same user inherit that user's account plan, so
 * there's no need to look up the plan per business (which would fan out
 * to `2 * N` queries). For a user who owns all N of their businesses this
 * collapses to a single cached subscription read.
 */
async function getEffectivePlanByOwnerMap(ownerUserIds: string[]) {
  const uniqueOwnerUserIds = Array.from(new Set(ownerUserIds));
  const entries = await Promise.all(
    uniqueOwnerUserIds.map(async (ownerUserId) => {
      try {
        return [
          ownerUserId,
          await getCachedEffectivePlanForUser(ownerUserId),
        ] as const;
      } catch (error) {
        console.error(
          "Failed to resolve effective plan for owner.",
          { ownerUserId },
          error,
        );

        return [ownerUserId, null] as const;
      }
    }),
  );

  return new Map(entries);
}

type MembershipRowWithOwner = BusinessContext & { ownerUserId: string };

async function applyEffectiveBusinessPlans(
  rows: MembershipRowWithOwner[],
): Promise<BusinessContext[]> {
  if (rows.length === 0) {
    return [];
  }

  const planByOwner = await getEffectivePlanByOwnerMap(
    rows.map((row) => row.ownerUserId),
  );

  return rows.map((row) => {
    const plan = planByOwner.get(row.ownerUserId) ?? row.business.plan;
    const context: BusinessContext = {
      membershipId: row.membershipId,
      role: row.role,
      memberJoinedAt: row.memberJoinedAt,
      business: row.business,
    };

    if (plan === row.business.plan) {
      return context;
    }

    return {
      ...context,
      business: {
        ...context.business,
        plan,
      },
    } satisfies BusinessContext;
  });
}

async function applyEffectiveBusinessPlan(
  row: MembershipRowWithOwner | null,
): Promise<BusinessContext | null> {
  if (!row) {
    return null;
  }

  const plan =
    (await getEffectivePlanByOwnerMap([row.ownerUserId])).get(
      row.ownerUserId,
    ) ?? row.business.plan;
  const context: BusinessContext = {
    membershipId: row.membershipId,
    role: row.role,
    memberJoinedAt: row.memberJoinedAt,
    business: row.business,
  };

  if (plan === row.business.plan) {
    return context;
  }

  return {
    ...context,
    business: {
      ...context.business,
      plan,
    },
  } satisfies BusinessContext;
}

const getActiveBusinessSlug = cache(async () => {
  const cookieStore = await cookies();

  return cookieStore.get(activeBusinessSlugCookieName)?.value ?? null;
});

export const getBusinessContextForUser = cache(async (
  userId: string,
  businessSlug?: string | null,
) => {
  const requestedBusinessSlug =
    businessSlug === undefined ? await getActiveBusinessSlug() : businessSlug;

  if (requestedBusinessSlug) {
    const scopedContext = await getBusinessContextForMembershipSlug(
      userId,
      requestedBusinessSlug,
      false,
    );

    if (scopedContext) {
      return scopedContext;
    }
  }

  const memberships = await getBusinessMembershipsForUser(userId, "active");

  return memberships[0] ?? null;
});

export async function requireBusinessContextForUser(
  userId: string,
  businessSlug?: string | null,
) {
  const context = await getBusinessContextForUser(userId, businessSlug);

  if (!context) {
    throw new Error("No business membership found for the current user.");
  }

  return context;
}

export const requireCurrentBusinessContext = cache(async () => {
  const user = await requireUser();
  const businessContext = await requireBusinessContextForUser(user.id);

  return {
    user,
    businessContext,
  };
});

export async function requireOwnerBusinessContext() {
  const { user, businessContext } = await requireCurrentBusinessContext();

  if (!canManageBusinessAdministration(businessContext.role)) {
    throw new Error("The current user does not have owner access.");
  }

  return {
    user,
    businessContext,
  };
}

export async function getCurrentBusinessRequestContext() {
  const session = await getOptionalSession();

  if (!session) {
    return null;
  }

  const businessContext = await getBusinessContextForUser(session.user.id);

  if (!businessContext) {
    return null;
  }

  return {
    user: session.user,
    businessContext,
  };
}

export async function getBusinessRequestContextForSlug(slug: string) {
  const session = await getOptionalSession();

  if (!session) {
    return null;
  }

  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    return null;
  }

  return {
    user: session.user,
    businessContext,
  };
}

export async function getBusinessActionContext({
  businessSlug,
  minimumRole = "staff",
  requireActiveBusiness = false,
  unauthorizedMessage,
}: {
  businessSlug?: string | null;
  minimumRole?: BusinessMemberRole;
  requireActiveBusiness?: boolean;
  unauthorizedMessage?: string;
} = {}): Promise<BusinessActionContextResult> {
  const user = await requireUser();
  const businessContext = businessSlug
    ? await getBusinessContextForMembershipSlug(user.id, businessSlug, true)
    : await getBusinessContextForUser(user.id);

  if (!businessContext) {
    return {
      ok: false,
      error: "Create a business first, then try again.",
      reason: "business_required",
    };
  }

  if (!hasBusinessRoleAccess(businessContext.role, minimumRole)) {
    return {
      ok: false,
      error:
        unauthorizedMessage ??
        `${businessMemberRoleMeta[minimumRole].label} access is required for that action.`,
      reason: "insufficient_role",
    };
  }

  if (
    requireActiveBusiness &&
    businessContext.business.recordState !== "active"
  ) {
    if (businessContext.business.recordState === "locked") {
      return {
        ok: false,
        error:
          "This business is locked on your current plan. Upgrade to unlock operational actions.",
        reason: "business_locked_by_plan",
      };
    }

    return {
      ok: false,
      error: "Restore this business before doing that.",
      reason: "business_not_active",
    };
  }

  return {
    ok: true,
    user,
    businessContext,
  };
}

export async function getOwnerBusinessActionContext() {
  return getBusinessActionContext({
    minimumRole: "owner",
    requireActiveBusiness: true,
    unauthorizedMessage: "Only the business owner can do that.",
  });
}

export async function getOperationalBusinessActionContext() {
  return getBusinessActionContext({
    minimumRole: "manager",
    requireActiveBusiness: true,
    unauthorizedMessage: "Only an owner or manager can do that.",
  });
}

export async function getWorkspaceBusinessActionContext() {
  return getBusinessActionContext({
    minimumRole: "staff",
    requireActiveBusiness: true,
    unauthorizedMessage: "You do not have access to that business action.",
  });
}

export async function getOwnerBusinessLifecycleActionContext() {
  return getBusinessActionContext({
    minimumRole: "owner",
    requireActiveBusiness: false,
    unauthorizedMessage: "Only the business owner can do that.",
  });
}

export function hasOperationalBusinessAccess(role: BusinessMemberRole) {
  return canManageOperationalBusinessSettings(role);
}

export function hasBusinessWorkspaceAccess(role: BusinessMemberRole) {
  return canManageBusinessWorkspace(role);
}

export function hasBusinessMemberManagementAccess(role: BusinessMemberRole) {
  return canManageBusinessMembers(role);
}

export const getBusinessOwnerEmails = cache(async (businessId: string) => {
  const rows = await db
    .select({
      email: user.email,
    })
    .from(businessMembers)
    .innerJoin(user, eq(businessMembers.userId, user.id))
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.role, "owner"),
      ),
    )
    .orderBy(asc(user.email));

  const dedupedEmails = new Map<string, string>();

  for (const row of rows) {
    const email = row.email.trim();

    if (!email) {
      continue;
    }

    const key = email.toLowerCase();

    if (!dedupedEmails.has(key)) {
      dedupedEmails.set(key, email);
    }
  }

  return Array.from(dedupedEmails.values());
});

export const getBusinessMessagingSettings = cache(async (businessId: string) => {
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      shortDescription: businesses.shortDescription,
      contactEmail: businesses.contactEmail,
      defaultEmailSignature: businesses.defaultEmailSignature,
      quoteEmailTemplate: businesses.quoteEmailTemplate,
      notifyOnNewInquiry: businesses.notifyOnNewInquiry,
      notifyOnQuoteSent: businesses.notifyOnQuoteSent,
      notifyOnQuoteResponse: businesses.notifyOnQuoteResponse,
      notifyInAppOnNewInquiry: businesses.notifyInAppOnNewInquiry,
      notifyInAppOnQuoteSent: businesses.notifyInAppOnQuoteSent,
      notifyInAppOnQuoteResponse: businesses.notifyInAppOnQuoteResponse,
      notifyOnMemberInviteResponse: businesses.notifyOnMemberInviteResponse,
      notifyInAppOnMemberInviteResponse: businesses.notifyInAppOnMemberInviteResponse,
      notifyPushOnNewInquiry: businesses.notifyPushOnNewInquiry,
      notifyPushOnQuoteSent: businesses.notifyPushOnQuoteSent,
      notifyPushOnQuoteResponse: businesses.notifyPushOnQuoteResponse,
      notifyPushOnMemberInviteResponse: businesses.notifyPushOnMemberInviteResponse,
      notifyOnFollowUpReminder: businesses.notifyOnFollowUpReminder,
      notifyInAppOnFollowUpReminder: businesses.notifyInAppOnFollowUpReminder,
      notifyOnQuoteExpiring: businesses.notifyOnQuoteExpiring,
      notifyInAppOnQuoteExpiring: businesses.notifyInAppOnQuoteExpiring,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business satisfies BusinessMessagingSettings | undefined;
});
