import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { activityLogs, replySnippets } from "@/lib/db/schema";
import type { ReplySnippetInput } from "@/features/inquiries/reply-snippet-schemas";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

type CreateReplySnippetForWorkspaceInput = {
  workspaceId: string;
  actorUserId: string;
  snippet: ReplySnippetInput;
};

export async function createReplySnippetForWorkspace({
  workspaceId,
  actorUserId,
  snippet,
}: CreateReplySnippetForWorkspaceInput) {
  const snippetId = createId("rsn");
  const now = new Date();

  return db.transaction(async (tx) => {
    await tx.insert(replySnippets).values({
      id: snippetId,
      workspaceId,
      title: snippet.title,
      body: snippet.body,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(activityLogs).values({
      id: createId("act"),
      workspaceId,
      actorUserId,
      type: "reply_snippet.created",
      summary: `Reply snippet ${snippet.title} created.`,
      metadata: {
        replySnippetId: snippetId,
        title: snippet.title,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: snippetId,
    };
  });
}

type UpdateReplySnippetForWorkspaceInput = {
  workspaceId: string;
  actorUserId: string;
  replySnippetId: string;
  snippet: ReplySnippetInput;
};

export async function updateReplySnippetForWorkspace({
  workspaceId,
  actorUserId,
  replySnippetId,
  snippet,
}: UpdateReplySnippetForWorkspaceInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingSnippet] = await tx
      .select({
        id: replySnippets.id,
      })
      .from(replySnippets)
      .where(
        and(
          eq(replySnippets.workspaceId, workspaceId),
          eq(replySnippets.id, replySnippetId),
        ),
      )
      .limit(1);

    if (!existingSnippet) {
      return null;
    }

    await tx
      .update(replySnippets)
      .set({
        title: snippet.title,
        body: snippet.body,
        updatedAt: now,
      })
      .where(
        and(
          eq(replySnippets.workspaceId, workspaceId),
          eq(replySnippets.id, replySnippetId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      workspaceId,
      actorUserId,
      type: "reply_snippet.updated",
      summary: `Reply snippet ${snippet.title} updated.`,
      metadata: {
        replySnippetId,
        title: snippet.title,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: replySnippetId,
    };
  });
}

type DeleteReplySnippetForWorkspaceInput = {
  workspaceId: string;
  actorUserId: string;
  replySnippetId: string;
};

export async function deleteReplySnippetForWorkspace({
  workspaceId,
  actorUserId,
  replySnippetId,
}: DeleteReplySnippetForWorkspaceInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingSnippet] = await tx
      .select({
        id: replySnippets.id,
        title: replySnippets.title,
      })
      .from(replySnippets)
      .where(
        and(
          eq(replySnippets.workspaceId, workspaceId),
          eq(replySnippets.id, replySnippetId),
        ),
      )
      .limit(1);

    if (!existingSnippet) {
      return null;
    }

    await tx
      .delete(replySnippets)
      .where(
        and(
          eq(replySnippets.workspaceId, workspaceId),
          eq(replySnippets.id, replySnippetId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: createId("act"),
      workspaceId,
      actorUserId,
      type: "reply_snippet.deleted",
      summary: `Reply snippet ${existingSnippet.title} deleted.`,
      metadata: {
        replySnippetId,
        title: existingSnippet.title,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: replySnippetId,
    };
  });
}
