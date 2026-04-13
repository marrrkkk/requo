import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { db } from "@/lib/db/client";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { slugifyPublicName, appendRandomSlugSuffix } from "@/lib/slugs";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

const renameWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(60, "Workspace name must be at most 60 characters."),
});

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(60, "Workspace name must be at most 60 characters."),
});

export async function renameWorkspace(
  workspaceId: string,
  rawInput: { name: string },
) {
  const parsed = renameWorkspaceSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      error: "Invalid input.",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<"name", string[] | undefined>
      >,
    };
  }

  await db
    .update(workspaces)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));

  return { success: "Workspace renamed." };
}

export async function createWorkspace(
  userId: string,
  rawInput: { name: string },
) {
  const parsed = createWorkspaceSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      error: "Invalid input.",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<"name", string[] | undefined>
      >,
    };
  }

  const now = new Date();
  const workspaceId = createId("ws");

  let slugCandidate =
    slugifyPublicName(parsed.data.name, { fallback: "workspace" }) + "-ws";

  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 10) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slugCandidate))
      .limit(1);

    if (!existing) break;

    slugCandidate = appendRandomSlugSuffix(slugCandidate, {
      fallback: "workspace",
    });
    attempts++;
  }

  await db.insert(workspaces).values({
    id: workspaceId,
    name: parsed.data.name,
    slug: slugCandidate,
    plan: "free",
    ownerUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    id: createId("wm"),
    workspaceId,
    userId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  return {
    success: "Workspace created.",
    workspace: { id: workspaceId, slug: slugCandidate },
  };
}
