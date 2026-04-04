import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { getSession, requireUser, type AuthUser } from "@/lib/auth/session";
import { activeWorkspaceSlugCookieName } from "@/features/workspaces/routes";
import { db } from "@/lib/db/client";
import {
  user,
  workspaceInquiryForms,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

export type WorkspaceContext = {
  membershipId: string;
  role: "owner" | "member";
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoStoragePath: string | null;
    defaultCurrency: string;
    publicInquiryEnabled: boolean;
  };
};

export type WorkspaceMessagingSettings = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  contactEmail: string | null;
  defaultEmailSignature: string | null;
  notifyOnNewInquiry: boolean;
  notifyOnQuoteSent: boolean;
};

export type OwnerWorkspaceActionContext =
  | {
      ok: true;
      user: AuthUser;
      workspaceContext: WorkspaceContext;
    }
  | {
      ok: false;
      error: string;
    };

export const getWorkspaceMembershipsForUser = cache(async (userId: string) => {
  const publicInquiryEnabledSelection = sql<boolean>`coalesce((
    select ${workspaceInquiryForms.publicInquiryEnabled}
    from ${workspaceInquiryForms}
    where ${workspaceInquiryForms.workspaceId} = ${workspaces.id}
      and ${workspaceInquiryForms.isDefault} = true
      and ${workspaceInquiryForms.archivedAt} is null
    limit 1
  ), false)`;

  const memberships = await db
    .select({
      membershipId: workspaceMembers.id,
      role: workspaceMembers.role,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspaceLogoStoragePath: workspaces.logoStoragePath,
      defaultCurrency: workspaces.defaultCurrency,
      publicInquiryEnabled: publicInquiryEnabledSelection,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(
      sql`case when ${workspaceMembers.role} = 'owner' then 0 else 1 end`,
      asc(workspaces.name),
      asc(workspaces.createdAt),
    );

  return memberships.map((membership) => ({
    membershipId: membership.membershipId,
    role: membership.role,
    workspace: {
      id: membership.workspaceId,
      name: membership.workspaceName,
      slug: membership.workspaceSlug,
      logoStoragePath: membership.workspaceLogoStoragePath,
      defaultCurrency: membership.defaultCurrency,
      publicInquiryEnabled: membership.publicInquiryEnabled,
    },
  })) satisfies WorkspaceContext[];
});

export const getWorkspaceContextForMembershipSlug = cache(async (
  userId: string,
  workspaceSlug: string,
) => {
  const publicInquiryEnabledSelection = sql<boolean>`coalesce((
    select ${workspaceInquiryForms.publicInquiryEnabled}
    from ${workspaceInquiryForms}
    where ${workspaceInquiryForms.workspaceId} = ${workspaces.id}
      and ${workspaceInquiryForms.isDefault} = true
      and ${workspaceInquiryForms.archivedAt} is null
    limit 1
  ), false)`;

  const [context] = await db
    .select({
      membershipId: workspaceMembers.id,
      role: workspaceMembers.role,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      workspaceLogoStoragePath: workspaces.logoStoragePath,
      defaultCurrency: workspaces.defaultCurrency,
      publicInquiryEnabled: publicInquiryEnabledSelection,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug),
      ),
    )
    .limit(1);

  if (!context) {
    return null;
  }

  return {
    membershipId: context.membershipId,
    role: context.role,
    workspace: {
      id: context.workspaceId,
      name: context.workspaceName,
      slug: context.workspaceSlug,
      logoStoragePath: context.workspaceLogoStoragePath,
      defaultCurrency: context.defaultCurrency,
      publicInquiryEnabled: context.publicInquiryEnabled,
    },
  } satisfies WorkspaceContext;
});

const getActiveWorkspaceSlug = cache(async () => {
  const cookieStore = await cookies();

  return cookieStore.get(activeWorkspaceSlugCookieName)?.value ?? null;
});

export const getWorkspaceContextForUser = cache(async (
  userId: string,
  workspaceSlug?: string | null,
) => {
  const requestedWorkspaceSlug =
    workspaceSlug === undefined ? await getActiveWorkspaceSlug() : workspaceSlug;

  if (requestedWorkspaceSlug) {
    const scopedContext = await getWorkspaceContextForMembershipSlug(
      userId,
      requestedWorkspaceSlug,
    );

    if (scopedContext) {
      return scopedContext;
    }
  }

  const memberships = await getWorkspaceMembershipsForUser(userId);

  return memberships[0] ?? null;
});

export async function requireWorkspaceContextForUser(
  userId: string,
  workspaceSlug?: string | null,
) {
  const context = await getWorkspaceContextForUser(userId, workspaceSlug);

  if (!context) {
    throw new Error("No workspace membership found for the current user.");
  }

  return context;
}

export const requireCurrentWorkspaceContext = cache(async () => {
  const user = await requireUser();
  const workspaceContext = await requireWorkspaceContextForUser(user.id);

  return {
    user,
    workspaceContext,
  };
});

export async function requireOwnerWorkspaceContext() {
  const { user, workspaceContext } = await requireCurrentWorkspaceContext();

  if (workspaceContext.role !== "owner") {
    throw new Error("The current user does not have owner access.");
  }

  return {
    user,
    workspaceContext,
  };
}

export async function getCurrentWorkspaceRequestContext() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const workspaceContext = await getWorkspaceContextForUser(session.user.id);

  if (!workspaceContext) {
    return null;
  }

  return {
    user: session.user,
    workspaceContext,
  };
}

export async function getOwnerWorkspaceActionContext(): Promise<OwnerWorkspaceActionContext> {
  const user = await requireUser();
  const workspaceContext = await getWorkspaceContextForUser(user.id);

  if (!workspaceContext) {
    return {
      ok: false,
      error: "Create a workspace first, then try again.",
    };
  }

  if (workspaceContext.role !== "owner") {
    return {
      ok: false,
      error: "Only the workspace owner can do that.",
    };
  }

  return {
    ok: true,
    user,
    workspaceContext,
  };
}

export const getWorkspaceOwnerEmails = cache(async (workspaceId: string) => {
  const rows = await db
    .select({
      email: user.email,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, "owner"),
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

export const getWorkspaceMessagingSettings = cache(async (workspaceId: string) => {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      shortDescription: workspaces.shortDescription,
      contactEmail: workspaces.contactEmail,
      defaultEmailSignature: workspaces.defaultEmailSignature,
      notifyOnNewInquiry: workspaces.notifyOnNewInquiry,
      notifyOnQuoteSent: workspaces.notifyOnQuoteSent,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return workspace satisfies WorkspaceMessagingSettings | undefined;
});
