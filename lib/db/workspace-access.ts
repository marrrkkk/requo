import "server-only";

import { eq, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workspaceMembers, workspaces } from "@/lib/db/schema";

export type WorkspaceContext = {
  membershipId: string;
  role: "owner" | "member";
  workspace: {
    id: string;
    name: string;
    slug: string;
    defaultCurrency: string;
    publicInquiryEnabled: boolean;
  };
};

export async function getWorkspaceContextForUser(userId: string) {
  const [context] = await db
    .select({
      membershipId: workspaceMembers.id,
      role: workspaceMembers.role,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      defaultCurrency: workspaces.defaultCurrency,
      publicInquiryEnabled: workspaces.publicInquiryEnabled,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(
      sql`case when ${workspaceMembers.role} = 'owner' then 0 else 1 end`,
      workspaceMembers.createdAt,
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
      defaultCurrency: context.defaultCurrency,
      publicInquiryEnabled: context.publicInquiryEnabled,
    },
  } satisfies WorkspaceContext;
}

export async function requireWorkspaceContextForUser(userId: string) {
  const context = await getWorkspaceContextForUser(userId);

  if (!context) {
    throw new Error("No workspace membership found for the current user.");
  }

  return context;
}

export async function requireCurrentWorkspaceContext() {
  const user = await requireUser();
  const workspaceContext = await requireWorkspaceContextForUser(user.id);

  return {
    user,
    workspaceContext,
  };
}

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
