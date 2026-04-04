import "server-only";

import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db/client";
import { replySnippets } from "@/lib/db/schema";
import {
  getWorkspaceReplySnippetsCacheTags,
  settingsWorkspaceCacheLife,
} from "@/lib/cache/workspace-tags";
import type { DashboardReplySnippet } from "@/features/inquiries/reply-snippet-types";

export async function getReplySnippetsForWorkspace(
  workspaceId: string,
): Promise<DashboardReplySnippet[]> {
  "use cache";

  cacheLife(settingsWorkspaceCacheLife);
  cacheTag(...getWorkspaceReplySnippetsCacheTags(workspaceId));

  return db
    .select({
      id: replySnippets.id,
      title: replySnippets.title,
      body: replySnippets.body,
      createdAt: replySnippets.createdAt,
      updatedAt: replySnippets.updatedAt,
    })
    .from(replySnippets)
    .where(eq(replySnippets.workspaceId, workspaceId))
    .orderBy(asc(replySnippets.title), asc(replySnippets.createdAt));
}
