import "server-only";

import { db } from "@/lib/db/client";
import {
  resolveSafeContentType,
  sanitizeStorageFileName,
} from "@/lib/files";
import {
  activityLogs,
  businesses,
  inquiries,
  inquiryAttachments,
  inquiryNotes,
} from "@/lib/db/schema";
import { insertBusinessNotification } from "@/features/notifications/mutations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  publicInquiryAttachmentBucket,
  publicInquiryExtensionToMimeType,
  type PublicInquirySubmissionInput,
} from "@/features/inquiries/schemas";
import type { InquiryStatus } from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import { and, eq } from "drizzle-orm";

type CreatePublicInquirySubmissionInput = {
  business: PublicInquiryBusiness;
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

export async function createPublicInquirySubmission({
  business,
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
    const safeContentType = resolveSafeContentType(attachment, {
      extensionToMimeType: publicInquiryExtensionToMimeType,
      fallback: "application/octet-stream",
    });
    const storagePath = `${business.id}/${inquiryId}/${sanitizeStorageFileName(
      attachment.name,
      "attachment",
    )}`;

    const { error } = await storageClient.storage
      .from(publicInquiryAttachmentBucket)
      .upload(storagePath, attachment, {
        contentType: safeContentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload inquiry attachment: ${error.message}`);
    }

    uploadedStoragePath = storagePath;
    preparedAttachment = {
      id: createId("iat"),
      fileName: attachment.name,
      contentType: safeContentType,
      fileSize: attachment.size,
      storagePath,
    };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(inquiries).values({
        id: inquiryId,
        businessId: business.id,
        businessInquiryFormId: business.form.id,
        status: "new",
        subject: submission.serviceCategory,
        customerName: submission.customerName,
        customerEmail: submission.customerEmail,
        customerPhone: submission.customerPhone ?? null,
        companyName: submission.companyName ?? null,
        serviceCategory: submission.serviceCategory,
        requestedDeadline: submission.requestedDeadline ?? null,
        budgetText: submission.budgetText ?? null,
        details: submission.details,
        submittedFieldSnapshot: submission.submittedFieldSnapshot,
        source: "public-inquiry-page",
        quoteRequested: true,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      if (preparedAttachment) {
        await tx.insert(inquiryAttachments).values({
          id: preparedAttachment.id,
          businessId: business.id,
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
        businessId: business.id,
        inquiryId,
        actorUserId: null,
        type: "inquiry.submitted_public",
        summary: "Inquiry submitted through the public inquiry page.",
        metadata: {
          source: "public-inquiry-page",
          businessSlug: business.slug,
          inquiryFormId: business.form.id,
          inquiryFormSlug: business.form.slug,
          inquiryFormName: business.form.name,
          hasAttachment: Boolean(preparedAttachment),
          serviceCategory: submission.serviceCategory,
        },
        createdAt: now,
        updatedAt: now,
      });

      const [notificationSettings] = await tx
        .select({
          notifyInAppOnNewInquiry: businesses.notifyInAppOnNewInquiry,
        })
        .from(businesses)
        .where(eq(businesses.id, business.id))
        .limit(1);

      if (notificationSettings?.notifyInAppOnNewInquiry) {
        await insertBusinessNotification(tx, {
          businessId: business.id,
          inquiryId,
          type: "public_inquiry_submitted",
          title: `New inquiry from ${submission.customerName}`,
          summary: `${submission.serviceCategory} via ${business.form.name}`,
          metadata: {
            customerEmail: submission.customerEmail,
            customerName: submission.customerName,
            hasAttachment: Boolean(preparedAttachment),
            inquiryFormId: business.form.id,
            inquiryFormName: business.form.name,
            inquiryFormSlug: business.form.slug,
            serviceCategory: submission.serviceCategory,
          },
          now,
        });
      }
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

type AddInquiryNoteForBusinessInput = {
  businessId: string;
  inquiryId: string;
  authorUserId: string;
  body: string;
};

export async function addInquiryNoteForBusiness({
  businessId,
  inquiryId,
  authorUserId,
  body,
}: AddInquiryNoteForBusinessInput) {
  const noteId = createId("note");
  const activityId = createId("act");
  const now = new Date();

  return db.transaction(async (tx) => {
    const [inquiry] = await tx
      .select({ id: inquiries.id })
      .from(inquiries)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!inquiry) {
      return null;
    }

    await tx.insert(inquiryNotes).values({
      id: noteId,
      businessId,
      inquiryId,
      authorUserId,
      body,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(activityLogs).values({
      id: activityId,
      businessId,
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

type ChangeInquiryStatusForBusinessInput = {
  businessId: string;
  inquiryId: string;
  actorUserId: string;
  nextStatus: InquiryStatus;
};

export async function changeInquiryStatusForBusiness({
  businessId,
  inquiryId,
  actorUserId,
  nextStatus,
}: ChangeInquiryStatusForBusinessInput) {
  const activityId = createId("act");
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingInquiry] = await tx
      .select({
        id: inquiries.id,
        status: inquiries.status,
      })
      .from(inquiries)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
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
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)));

    await tx.insert(activityLogs).values({
      id: activityId,
      businessId,
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
