"use server";

import { z } from "zod";

import { uploadApprovalArtifactForBusiness } from "@/features/approvals/artifacts";
import {
  decideApprovalByToken,
  requestApprovalForBusiness,
  resubmitApprovalVersionForBusiness,
} from "@/features/approvals/mutations";
import { isApprovalSubjectType } from "@/features/approvals/snapshots";
import { getBusinessActionContext } from "@/lib/db/business-access";

export type ApprovalActionState = {
  error?: string;
  success?: string;
  customerToken?: string;
};

const requestApprovalSchema = z.object({
  subjectType: z.string().min(1),
  quoteId: z.string().min(1).max(128).nullable().optional(),
  inquiryId: z.string().min(1).max(128).nullable().optional(),
  scheduleItemId: z.string().min(1).max(128).nullable().optional(),
  artifactId: z.string().min(1).max(128).nullable().optional(),
  title: z.string().trim().min(1).max(200),
});

export async function requestApprovalAction(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const parsed = requestApprovalSchema.safeParse({
    subjectType: formData.get("subjectType"),
    quoteId: formData.get("quoteId") || null,
    inquiryId: formData.get("inquiryId") || null,
    scheduleItemId: formData.get("scheduleItemId") || null,
    artifactId: formData.get("artifactId") || null,
    title: formData.get("title"),
  });

  if (!parsed.success || !isApprovalSubjectType(parsed.data.subjectType)) {
    return { error: "Invalid approval request." };
  }

  try {
    const result = await requestApprovalForBusiness({
      businessId: context.businessContext.business.id,
      subjectType: parsed.data.subjectType,
      quoteId: parsed.data.quoteId,
      inquiryId: parsed.data.inquiryId,
      scheduleItemId: parsed.data.scheduleItemId,
      artifactId: parsed.data.artifactId,
      title: parsed.data.title,
      state: {},
      requesterUserId: context.user.id,
      requesterRole: context.businessContext.role,
      requesterName: context.user.name,
      requesterEmail: context.user.email,
    });

    return { success: "Approval requested. Share the customer link.", customerToken: result.customerToken };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not request approval." };
  }
}

export async function resubmitApprovalAction(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const chainId = formData.get("chainId");

  if (typeof chainId !== "string" || !chainId) {
    return { error: "Invalid approval chain." };
  }

  try {
    const result = await resubmitApprovalVersionForBusiness({
      businessId: context.businessContext.business.id,
      chainId,
      artifactId: typeof formData.get("artifactId") === "string" && formData.get("artifactId") ? String(formData.get("artifactId")) : null,
      requesterUserId: context.user.id,
      requesterRole: context.businessContext.role,
    });

    return { success: "New approval version requested.", customerToken: result.customerToken };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not resubmit approval." };
  }
}

export async function uploadApprovalArtifactAction(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState & { artifactId?: string }> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  try {
    const row = await uploadApprovalArtifactForBusiness({
      businessId: context.businessContext.business.id,
      uploaderUserId: context.user.id,
      file,
    });

    return { success: "File uploaded.", artifactId: row.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload the file." };
  }
}

const decideApprovalSchema = z.object({
  token: z.string().min(1).max(128),
  decision: z.enum(["approved", "changes_requested"]),
  approverName: z.string().max(120).nullable().optional(),
  approverEmail: z.string().max(200).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

/** Public customer decision. No session — bearer token + rate limit only. */
export async function decideApprovalAction(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const parsed = decideApprovalSchema.safeParse({
    token: formData.get("token"),
    decision: formData.get("decision"),
    approverName: formData.get("approverName") || null,
    approverEmail: formData.get("approverEmail") || null,
    comment: formData.get("comment") || null,
  });

  if (!parsed.success) {
    return { error: "Invalid response." };
  }

  try {
    const result = await decideApprovalByToken(parsed.data);

    return result.state === "approved"
      ? { success: "Approved. Thank you." }
      : { success: "Feedback sent to the business. Thank you." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record your response." };
  }
}

export async function decideApprovalForToken(
  token: string,
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const decision = formData.get("decision");
  const approverName = formData.get("approverName");
  const approverEmail = formData.get("approverEmail");
  const comment = formData.get("comment");

  if (decision !== "approved" && decision !== "changes_requested") {
    return { error: "Invalid response." };
  }

  try {
    const result = await decideApprovalByToken({
      token,
      decision,
      approverName: typeof approverName === "string" && approverName ? approverName : null,
      approverEmail: typeof approverEmail === "string" && approverEmail ? approverEmail : null,
      comment: typeof comment === "string" && comment ? comment : null,
    });

    return result.state === "approved"
      ? { success: "Approved. Thank you." }
      : { success: "Feedback sent to the business. Thank you." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record your response." };
  }
}
