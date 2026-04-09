import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import type { BusinessType } from "@/features/inquiries/business-types";
import { getSession, requireUser, type AuthUser } from "@/lib/auth/session";
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
  role: "owner" | "member";
  business: {
    id: string;
    name: string;
    slug: string;
    businessType: BusinessType;
    logoStoragePath: string | null;
    defaultCurrency: string;
    publicInquiryEnabled: boolean;
  };
};

export type BusinessMessagingSettings = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  contactEmail: string | null;
  defaultEmailSignature: string | null;
  notifyOnNewInquiry: boolean;
  notifyOnQuoteSent: boolean;
  notifyOnQuoteResponse: boolean;
  notifyInAppOnNewInquiry: boolean;
  notifyInAppOnQuoteResponse: boolean;
};

export type OwnerBusinessActionContext =
  | {
      ok: true;
      user: AuthUser;
      businessContext: BusinessContext;
    }
  | {
      ok: false;
      error: string;
    };

export const getBusinessMembershipsForUser = cache(async (userId: string) => {
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
      businessId: businesses.id,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessType: businesses.businessType,
      businessLogoStoragePath: businesses.logoStoragePath,
      defaultCurrency: businesses.defaultCurrency,
      publicInquiryEnabled: publicInquiryEnabledSelection,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(eq(businessMembers.userId, userId))
    .orderBy(
      sql`case when ${businessMembers.role} = 'owner' then 0 else 1 end`,
      asc(businesses.name),
      asc(businesses.createdAt),
    );

  return memberships.map((membership) => ({
    membershipId: membership.membershipId,
    role: membership.role,
    business: {
      id: membership.businessId,
      name: membership.businessName,
      slug: membership.businessSlug,
      businessType: membership.businessType,
      logoStoragePath: membership.businessLogoStoragePath,
      defaultCurrency: membership.defaultCurrency,
      publicInquiryEnabled: membership.publicInquiryEnabled,
    },
  })) satisfies BusinessContext[];
});

export const getBusinessContextForMembershipSlug = cache(async (
  userId: string,
  businessSlug: string,
) => {
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
      businessId: businesses.id,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessType: businesses.businessType,
      businessLogoStoragePath: businesses.logoStoragePath,
      defaultCurrency: businesses.defaultCurrency,
      publicInquiryEnabled: publicInquiryEnabledSelection,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businesses.slug, businessSlug),
      ),
    )
    .limit(1);

  if (!context) {
    return null;
  }

  return {
    membershipId: context.membershipId,
    role: context.role,
    business: {
      id: context.businessId,
      name: context.businessName,
      slug: context.businessSlug,
      businessType: context.businessType,
      logoStoragePath: context.businessLogoStoragePath,
      defaultCurrency: context.defaultCurrency,
      publicInquiryEnabled: context.publicInquiryEnabled,
    },
  } satisfies BusinessContext;
});

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
    );

    if (scopedContext) {
      return scopedContext;
    }
  }

  const memberships = await getBusinessMembershipsForUser(userId);

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

  if (businessContext.role !== "owner") {
    throw new Error("The current user does not have owner access.");
  }

  return {
    user,
    businessContext,
  };
}

export async function getCurrentBusinessRequestContext() {
  const session = await getSession();

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
  const session = await getSession();

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

export async function getOwnerBusinessActionContext(): Promise<OwnerBusinessActionContext> {
  const user = await requireUser();
  const businessContext = await getBusinessContextForUser(user.id);

  if (!businessContext) {
    return {
      ok: false,
      error: "Create a business first, then try again.",
    };
  }

  if (businessContext.role !== "owner") {
    return {
      ok: false,
      error: "Only the business owner can do that.",
    };
  }

  return {
    ok: true,
    user,
    businessContext,
  };
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
      notifyOnNewInquiry: businesses.notifyOnNewInquiry,
      notifyOnQuoteSent: businesses.notifyOnQuoteSent,
      notifyOnQuoteResponse: businesses.notifyOnQuoteResponse,
      notifyInAppOnNewInquiry: businesses.notifyInAppOnNewInquiry,
      notifyInAppOnQuoteResponse: businesses.notifyInAppOnQuoteResponse,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business satisfies BusinessMessagingSettings | undefined;
});
