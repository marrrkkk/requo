import "server-only";

import { db } from "@/lib/db/client";
import { writeAuditLog } from "@/features/audit/mutations";
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
import type {
  InquiryStatus,
  InquiryWorkflowStatus,
} from "@/features/inquiries/types";
import { inquirySources } from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import { and, eq } from "drizzle-orm";

type InquirySubmissionBusinessRef = Pick<
  PublicInquiryBusiness,
  "id" | "name" | "slug" | "form"
>;

type CreateInquirySubmissionInput = {
  business: InquirySubmissionBusinessRef;
  submission: PublicInquirySubmissionInput;
  actorUserId: string | null;
  source: string;
  activity: {
    type: string;
    summary: string;
  };
  notifyInAppOnNewInquiry: boolean;
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

function normalizeLegacyArchivedInquiryStatus(status: InquiryStatus) {
  return status === "archived" ? "waiting" : status;
}

async function createInquirySubmission({
  business,
  submission,
  actorUserId,
  source,
  activity,
  notifyInAppOnNewInquiry,
}: CreateInquirySubmissionInput): Promise<CreatePublicInquirySubmissionResult> {
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
        customerEmail: submission.customerEmail ?? null,
        customerContactMethod: submission.customerContactMethod,
        customerContactHandle: submission.customerContactHandle,
        serviceCategory: submission.serviceCategory,
        requestedDeadline: submission.requestedDeadline ?? null,
        budgetText: submission.budgetText ?? null,
        details: submission.details,
        submittedFieldSnapshot: submission.submittedFieldSnapshot,
        source,
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
        actorUserId,
        type: activity.type,
        summary: activity.summary,
        metadata: {
          source,
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

      if (notifyInAppOnNewInquiry && notificationSettings?.notifyInAppOnNewInquiry) {
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

export async function createPublicInquirySubmission({
  business,
  submission,
}: {
  business: InquirySubmissionBusinessRef;
  submission: PublicInquirySubmissionInput;
}): Promise<CreatePublicInquirySubmissionResult> {
  return createInquirySubmission({
    business,
    submission,
    actorUserId: null,
    source: inquirySources.publicInquiryPage,
    activity: {
      type: "inquiry.submitted_public",
      summary: "Inquiry submitted through the public inquiry page.",
    },
    notifyInAppOnNewInquiry: true,
  });
}

export async function createManualInquirySubmission({
  business,
  submission,
  actorUserId,
  source = inquirySources.manualDashboard,
}: {
  business: InquirySubmissionBusinessRef;
  submission: PublicInquirySubmissionInput;
  actorUserId: string;
  source?: string;
}): Promise<CreatePublicInquirySubmissionResult> {
  return createInquirySubmission({
    business,
    submission,
    actorUserId,
    source,
    activity: {
      type:
        source === "ai"
          ? "inquiry.created_ai"
          : "inquiry.created_manual",
      summary:
        source === "ai"
          ? "Inquiry created from an AI-confirmed action."
          : "Inquiry created manually from the dashboard.",
    },
    notifyInAppOnNewInquiry: false,
  });
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
  nextStatus: InquiryWorkflowStatus;
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
        archivedAt: inquiries.archivedAt,
        deletedAt: inquiries.deletedAt,
        businessId: businesses.id,
        customerName: inquiries.customerName,
        serviceCategory: inquiries.serviceCategory,
      })
      .from(inquiries)
      .innerJoin(businesses, eq(inquiries.businessId, businesses.id))
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!existingInquiry) {
      return null;
    }

    if (existingInquiry.deletedAt) {
      return {
        changed: false,
        locked: true,
        lockedReason: "trash" as const,
        previousStatus: existingInquiry.status,
        nextStatus: existingInquiry.status,
      };
    }

    if (existingInquiry.archivedAt) {
      return {
        changed: false,
        locked: true,
        lockedReason: "archived" as const,
        previousStatus: existingInquiry.status,
        nextStatus: existingInquiry.status,
      };
    }

    if (existingInquiry.status === nextStatus) {
      return {
        changed: false,
        locked: false,
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
      locked: false,
      previousStatus: existingInquiry.status,
      nextStatus,
    };
  });
}

type UpdateInquiryFieldsForBusinessInput = {
  businessId: string;
  inquiryId: string;
  actorUserId: string;
  fields: Partial<{
    subject: string | null;
    customerName: string;
    customerEmail: string | null;
    customerContactMethod: string;
    customerContactHandle: string;
    serviceCategory: string;
    requestedDeadline: string | null;
    budgetText: string | null;
    details: string;
  }>;
};

export async function updateInquiryFieldsForBusiness({
  businessId,
  inquiryId,
  actorUserId,
  fields,
}: UpdateInquiryFieldsForBusinessInput) {
  const now = new Date();
  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as UpdateInquiryFieldsForBusinessInput["fields"];

  if (!Object.keys(cleanFields).length) {
    return {
      updated: false,
      locked: false,
    } as const;
  }

  return db.transaction(async (tx) => {
    const [existingInquiry] = await tx
      .select({
        id: inquiries.id,
        archivedAt: inquiries.archivedAt,
        deletedAt: inquiries.deletedAt,
        businessId: businesses.id,
        customerName: inquiries.customerName,
        serviceCategory: inquiries.serviceCategory,
      })
      .from(inquiries)
      .innerJoin(businesses, eq(inquiries.businessId, businesses.id))
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!existingInquiry) {
      return null;
    }

    if (existingInquiry.deletedAt || existingInquiry.archivedAt) {
      return {
        updated: false,
        locked: true,
        lockedReason: existingInquiry.deletedAt ? "trash" : "archived",
      } as const;
    }

    await tx
      .update(inquiries)
      .set({
        ...cleanFields,
        updatedAt: now,
      })
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId,
      actorUserId,
      type: "inquiry.updated",
      summary: "Inquiry details updated.",
      metadata: {
        changedFields: Object.keys(cleanFields),
      },
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      businessId: existingInquiry.businessId,
      actorUserId,
      entityType: "request",
      entityId: inquiryId,
      action: "request.updated",
      metadata: {
        changedFields: Object.keys(cleanFields),
        customerName: existingInquiry.customerName,
        serviceCategory: existingInquiry.serviceCategory,
      },
      createdAt: now,
    });

    return {
      updated: true,
      locked: false,
    } as const;
  });
}

type UpdateInquiryRecordStateForBusinessInput = {
  businessId: string;
  inquiryId: string;
  actorUserId: string;
};

export async function archiveInquiryForBusiness({
  businessId,
  inquiryId,
  actorUserId,
}: UpdateInquiryRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingInquiry] = await tx
      .select({
        id: inquiries.id,
        status: inquiries.status,
        archivedAt: inquiries.archivedAt,
        deletedAt: inquiries.deletedAt,
        businessId: businesses.id,
        customerName: inquiries.customerName,
        serviceCategory: inquiries.serviceCategory,
      })
      .from(inquiries)
      .innerJoin(businesses, eq(inquiries.businessId, businesses.id))
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!existingInquiry) {
      return null;
    }

    if (existingInquiry.deletedAt) {
      return {
        changed: false,
        locked: true,
        lockedReason: "trash" as const,
      };
    }

    if (existingInquiry.archivedAt) {
      return {
        changed: false,
        locked: false,
      };
    }

    await tx
      .update(inquiries)
      .set({
        archivedAt: now,
        archivedBy: actorUserId,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      })
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId,
      actorUserId,
      type: "inquiry.archived",
      summary: "Inquiry archived.",
      metadata: {
        previousStatus: existingInquiry.status,
      },
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      businessId: existingInquiry.businessId,
      actorUserId,
      entityType: "request",
      entityId: inquiryId,
      action: "request.archived",
      metadata: {
        customerName: existingInquiry.customerName,
        serviceCategory: existingInquiry.serviceCategory,
      },
      createdAt: now,
    });

    return {
      changed: true,
      locked: false,
    };
  });
}

export async function unarchiveInquiryForBusiness({
  businessId,
  inquiryId,
  actorUserId,
}: UpdateInquiryRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingInquiry] = await tx
      .select({
        id: inquiries.id,
        status: inquiries.status,
        archivedAt: inquiries.archivedAt,
        deletedAt: inquiries.deletedAt,
        businessId: businesses.id,
        customerName: inquiries.customerName,
        serviceCategory: inquiries.serviceCategory,
      })
      .from(inquiries)
      .innerJoin(businesses, eq(inquiries.businessId, businesses.id))
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!existingInquiry) {
      return null;
    }

    if (existingInquiry.deletedAt) {
      return {
        changed: false,
        locked: true,
        lockedReason: "trash" as const,
      };
    }

    const nextStatus = normalizeLegacyArchivedInquiryStatus(existingInquiry.status);

    if (!existingInquiry.archivedAt && nextStatus === existingInquiry.status) {
      return {
        changed: false,
        locked: false,
      };
    }

    await tx
      .update(inquiries)
      .set({
        status: nextStatus,
        archivedAt: null,
        archivedBy: null,
        updatedAt: now,
      })
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId,
      actorUserId,
      type: "inquiry.unarchived",
      summary: "Inquiry restored to active.",
      metadata: {
        previousStatus: existingInquiry.status,
        restoredStatus: nextStatus,
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      changed: true,
      locked: false,
      status: nextStatus,
    };
  });
}

export async function trashInquiryForBusiness({
  businessId,
  inquiryId,
  actorUserId,
}: UpdateInquiryRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingInquiry] = await tx
      .select({
        id: inquiries.id,
        status: inquiries.status,
        archivedAt: inquiries.archivedAt,
        deletedAt: inquiries.deletedAt,
        businessId: businesses.id,
        customerName: inquiries.customerName,
        serviceCategory: inquiries.serviceCategory,
      })
      .from(inquiries)
      .innerJoin(businesses, eq(inquiries.businessId, businesses.id))
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!existingInquiry) {
      return null;
    }

    if (existingInquiry.deletedAt) {
      return {
        changed: false,
      };
    }

    const nextStatus = normalizeLegacyArchivedInquiryStatus(existingInquiry.status);

    await tx
      .update(inquiries)
      .set({
        status: nextStatus,
        archivedAt: null,
        archivedBy: null,
        deletedAt: now,
        deletedBy: actorUserId,
        updatedAt: now,
      })
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId,
      actorUserId,
      type: "inquiry.trashed",
      summary: "Inquiry moved to trash.",
      metadata: {
        previousStatus: existingInquiry.status,
        restoredStatus: nextStatus,
        wasArchived: Boolean(existingInquiry.archivedAt),
      },
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      businessId: existingInquiry.businessId,
      actorUserId,
      entityType: "request",
      entityId: inquiryId,
      action: "request.trashed",
      metadata: {
        customerName: existingInquiry.customerName,
        serviceCategory: existingInquiry.serviceCategory,
      },
      createdAt: now,
    });

    return {
      changed: true,
    };
  });
}

export async function restoreInquiryFromTrashForBusiness({
  businessId,
  inquiryId,
  actorUserId,
}: UpdateInquiryRecordStateForBusinessInput) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingInquiry] = await tx
      .select({
        id: inquiries.id,
        status: inquiries.status,
        deletedAt: inquiries.deletedAt,
        businessId: businesses.id,
        customerName: inquiries.customerName,
        serviceCategory: inquiries.serviceCategory,
      })
      .from(inquiries)
      .innerJoin(businesses, eq(inquiries.businessId, businesses.id))
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!existingInquiry) {
      return null;
    }

    if (!existingInquiry.deletedAt) {
      return {
        changed: false,
      };
    }

    const nextStatus = normalizeLegacyArchivedInquiryStatus(existingInquiry.status);

    await tx
      .update(inquiries)
      .set({
        status: nextStatus,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      })
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)));

    await tx.insert(activityLogs).values({
      id: createId("act"),
      businessId,
      inquiryId,
      actorUserId,
      type: "inquiry.restored_from_trash",
      summary: "Inquiry restored from trash.",
      metadata: {
        previousStatus: existingInquiry.status,
        restoredStatus: nextStatus,
      },
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      businessId: existingInquiry.businessId,
      actorUserId,
      entityType: "request",
      entityId: inquiryId,
      action: "request.restored",
      metadata: {
        customerName: existingInquiry.customerName,
        serviceCategory: existingInquiry.serviceCategory,
      },
      createdAt: now,
    });

    return {
      changed: true,
      status: nextStatus,
    };
  });
}
