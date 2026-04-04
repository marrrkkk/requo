import "server-only";

import { eq } from "drizzle-orm";

import { createInquiryPageConfigDefaults } from "@/features/inquiries/page-config";
import { ensureProfileForUser } from "@/lib/auth/workspace-bootstrap";
import { db } from "@/lib/db/client";
import { activityLogs, workspaceMembers, workspaces } from "@/lib/db/schema";

type CreateWorkspaceForUserInput = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  name: string;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function slugifyWorkspaceName(value: string) {
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
    const [existingWorkspace] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (!existingWorkspace) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export async function createWorkspaceForUser({
  user,
  name,
}: CreateWorkspaceForUserInput) {
  const trimmedName = name.trim();
  const now = new Date();
  const slug = await getAvailableWorkspaceSlug(slugifyWorkspaceName(trimmedName));
  const workspaceId = createId("ws");

  await ensureProfileForUser(user);

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: workspaceId,
      name: trimmedName,
      slug,
      contactEmail: user.email,
      inquiryPageConfig: createInquiryPageConfigDefaults({
        workspaceName: trimmedName,
      }),
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

    await tx.insert(activityLogs).values({
      id: createId("act"),
      workspaceId,
      actorUserId: user.id,
      type: "workspace.created",
      summary: "Workspace created.",
      metadata: {
        source: "workspace-hub",
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    id: workspaceId,
    slug,
  };
}
