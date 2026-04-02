import "server-only";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  inquiries,
  inquiryAttachments,
  inquiryNotes,
} from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  publicInquiryAttachmentBucket,
  type PublicInquirySubmissionInput,
} from "@/features/inquiries/schemas";
import type { InquiryStatus } from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";
import type { PublicInquiryWorkspace } from "@/features/inquiries/types";
import { and, eq } from "drizzle-orm";

type CreatePublicInquirySubmissionInput = {
  workspace: PublicInquiryWorkspace;
  submission: PublicInquirySubmissionInput;
};

type CreatePublicInquirySubmissionResult = {
  inquiryId: string;
  attachmentName: string | null;
};

type PreparedAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  storagePath: string;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized.slice(0, 120) || "attachment";
}

export async function createPublicInquirySubmission({
  workspace,
  submission,
}: CreatePublicInquirySubmissionInput): Promise<CreatePublicInquirySubmissionResult> {
  const inquiryId = createId("inq");
  const activityId = createId("act");
  const now = new Date();
  const attachment = submission.attachment;
  const storageClient = attachment ? createSupabaseAdminClient() : null;

  let uploadedStoragePath: string | null = null;
  let preparedAttachment: PreparedAttachment | null = null;

  if (attachment && storageClient) {
    const storagePath = `${workspace.id}/${inquiryId}/${sanitizeFileName(
      attachment.name,
    )}`;

    const { error } = await storageClient.storage
      .from(publicInquiryAttachmentBucket)
      .upload(storagePath, attachment, {
        contentType: attachment.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload inquiry attachment: ${error.message}`);
    }

    uploadedStoragePath = storagePath;
    preparedAttachment = {
      id: createId("iat"),
      fileName: attachment.name,
      contentType: attachment.type,
      fileSize: attachment.size,
      storagePath,
    };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(inquiries).values({
        id: inquiryId,
        workspaceId: workspace.id,
        status: "new",
        subject: submission.serviceCategory,
        customerName: submission.customerName,
        customerEmail: submission.customerEmail,
        customerPhone: submission.customerPhone ?? null,
        serviceCategory: submission.serviceCategory,
        requestedDeadline: submission.deadline ?? null,
        budgetText: submission.budget ?? null,
        companyName: null,
        details: submission.details,
        source: "public-inquiry-page",
        quoteRequested: true,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      if (preparedAttachment) {
        await tx.insert(inquiryAttachments).values({
          id: preparedAttachment.id,
          workspaceId: workspace.id,
          inquiryId,
          fileName: preparedAttachment.fileName,
          contentType: preparedAttachment.contentType,
          fileSize: preparedAttachment.fileSize,
          storagePath: preparedAttachment.storagePath,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx.insert(activityLogs).values({
        id: activityId,
        workspaceId: workspace.id,
        inquiryId,
        actorUserId: null,
        type: "inquiry.submitted_public",
        summary: "Inquiry submitted through the public inquiry page.",
        metadata: {
          source: "public-inquiry-page",
          workspaceSlug: workspace.slug,
          hasAttachment: Boolean(preparedAttachment),
          serviceCategory: submission.serviceCategory,
        },
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    if (uploadedStoragePath && storageClient) {
      const { error: storageCleanupError } = await storageClient.storage
        .from(publicInquiryAttachmentBucket)
        .remove([uploadedStoragePath]);

      if (storageCleanupError) {
        console.error(
          "Failed to clean up uploaded inquiry attachment after a database error.",
          storageCleanupError,
        );
      }
    }

    throw error;
  }

  return {
    inquiryId,
    attachmentName: preparedAttachment?.fileName ?? null,
  };
}

type AddInquiryNoteForWorkspaceInput = {
  workspaceId: string;
  inquiryId: string;
  authorUserId: string;
  body: string;
};

export async function addInquiryNoteForWorkspace({
  workspaceId,
  inquiryId,
  authorUserId,
  body,
}: AddInquiryNoteForWorkspaceInput) {
  const noteId = createId("note");
  const activityId = createId("act");
  const now = new Date();

  return db.transaction(async (tx) => {
    const [inquiry] = await tx
      .select({ id: inquiries.id })
      .from(inquiries)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.workspaceId, workspaceId)))
      .limit(1);

    if (!inquiry) {
      return null;
    }

    await tx.insert(inquiryNotes).values({
      id: noteId,
      workspaceId,
      inquiryId,
      authorUserId,
      body,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(activityLogs).values({
      id: activityId,
      workspaceId,
      inquiryId,
      actorUserId: authorUserId,
      type: "inquiry.note_added",
      summary: "Internal note added.",
      metadata: {
        noteId,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      noteId,
    };
  });
}

type ChangeInquiryStatusForWorkspaceInput = {
  workspaceId: string;
  inquiryId: string;
  actorUserId: string;
  nextStatus: InquiryStatus;
};

export async function changeInquiryStatusForWorkspace({
  workspaceId,
  inquiryId,
  actorUserId,
  nextStatus,
}: ChangeInquiryStatusForWorkspaceInput) {
  const activityId = createId("act");
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingInquiry] = await tx
      .select({
        id: inquiries.id,
        status: inquiries.status,
      })
      .from(inquiries)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.workspaceId, workspaceId)))
      .limit(1);

    if (!existingInquiry) {
      return null;
    }

    if (existingInquiry.status === nextStatus) {
      return {
        changed: false,
        previousStatus: existingInquiry.status,
        nextStatus,
      };
    }

    await tx
      .update(inquiries)
      .set({
        status: nextStatus,
        updatedAt: now,
      })
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.workspaceId, workspaceId)));

    await tx.insert(activityLogs).values({
      id: activityId,
      workspaceId,
      inquiryId,
      actorUserId,
      type: "inquiry.status_changed",
      summary: `Inquiry moved from ${getInquiryStatusLabel(
        existingInquiry.status,
      )} to ${getInquiryStatusLabel(nextStatus)}.`,
      metadata: {
        previousStatus: existingInquiry.status,
        nextStatus,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      previousStatus: existingInquiry.status,
      nextStatus,
    };
  });
}
