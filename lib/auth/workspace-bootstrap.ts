import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { activityLogs, profiles, workspaceMembers, workspaces } from "@/lib/db/schema";

type BootstrapUser = {
  id: string;
  name: string;
  email: string;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "workspace";
}

async function getAvailableWorkspaceSlug(baseSlug: string) {
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (!existing[0]) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export async function bootstrapWorkspaceForUser(user: BootstrapUser) {
  const workspaceBaseName =
    user.name.trim() || user.email.split("@")[0] || "QuoteFlow";
  const workspaceName = `${workspaceBaseName}'s Workspace`;
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
        membershipId: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, user.id))
      .orderBy(
        sql`case when ${workspaceMembers.role} = 'owner' then 0 else 1 end`,
        workspaceMembers.createdAt,
      )
      .limit(1);

    if (!existingMembership) {
      const workspaceSlug = await getAvailableWorkspaceSlug(
        slugify(workspaceBaseName),
      );
      const workspaceId = createId("ws");
      const membershipId = createId("wm");
      const activityId = createId("act");

      await tx.insert(workspaces).values({
        id: workspaceId,
        name: workspaceName,
        slug: workspaceSlug,
        contactEmail: user.email,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(workspaceMembers).values({
        id: membershipId,
        workspaceId,
        userId: user.id,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(activityLogs).values({
        id: activityId,
        workspaceId,
        actorUserId: user.id,
        type: "workspace.created",
        summary: "Workspace created during initial signup bootstrap.",
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
        .update(workspaceMembers)
        .set({
          role: "owner",
          updatedAt: now,
        })
        .where(eq(workspaceMembers.id, existingMembership.membershipId));
    }
  });
}
