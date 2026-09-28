"use server";

import { z } from "zod";

import {
  addChangeOrderDelta,
  cancelChangeOrder,
  createDraftChangeOrder,
  decideChangeOrderByToken,
  deleteDraftChangeOrder,
  rebaseChangeOrder,
  submitChangeOrderForApproval,
  withdrawChangeOrder,
} from "@/features/change-orders/mutations";
import { getBusinessActionContext } from "@/lib/db/business-access";

export type ChangeOrderActionState = {
  error?: string;
  success?: string;
  changeOrderId?: string;
  customerToken?: string;
};

export async function createDraftChangeOrderAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const quoteId = formData.get("quoteId");
  const reason = formData.get("reason");

  if (typeof quoteId !== "string" || !quoteId || typeof reason !== "string" || !reason.trim()) {
    return { error: "A quote and a reason are required." };
  }

  try {
    const row = await createDraftChangeOrder({
      businessId: context.businessContext.business.id,
      quoteId,
      reason,
      customerExplanation: typeof formData.get("customerExplanation") === "string" ? String(formData.get("customerExplanation")) : null,
      actorUserId: context.user.id,
      actorRole: context.businessContext.role,
    });

    return { success: `Draft ${row.displayNumber} created.`, changeOrderId: row.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not draft the change." };
  }
}

const deltaSchema = z.object({
  changeOrderId: z.string().min(1).max(128),
  targetKind: z.enum(["line", "block", "schedule_item"]),
  targetQuoteItemId: z.string().max(128).nullable().optional(),
  targetBlockId: z.string().max(128).nullable().optional(),
  targetScheduleItemId: z.string().max(128).nullable().optional(),
  change: z.enum(["add", "modify", "remove"]),
  payload: z.string().max(20000).nullable().optional(),
});

export async function addChangeOrderDeltaAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const parsed = deltaSchema.safeParse({
    changeOrderId: formData.get("changeOrderId"),
    targetKind: formData.get("targetKind"),
    targetQuoteItemId: formData.get("targetQuoteItemId") || null,
    targetBlockId: formData.get("targetBlockId") || null,
    targetScheduleItemId: formData.get("targetScheduleItemId") || null,
    change: formData.get("change"),
    payload: formData.get("payload") || null,
  });

  if (!parsed.success) {
    return { error: "Invalid change." };
  }

  let payload: Record<string, unknown> | null = null;

  if (parsed.data.payload) {
    try {
      payload = JSON.parse(parsed.data.payload) as Record<string, unknown>;
    } catch {
      return { error: "Change payload must be valid JSON." };
    }
  }

  try {
    await addChangeOrderDelta({
      businessId: context.businessContext.business.id,
      changeOrderId: parsed.data.changeOrderId,
      targetKind: parsed.data.targetKind,
      targetQuoteItemId: parsed.data.targetQuoteItemId,
      targetBlockId: parsed.data.targetBlockId,
      targetScheduleItemId: parsed.data.targetScheduleItemId,
      change: parsed.data.change,
      payload,
      actorRole: context.businessContext.role,
    });

    return { success: "Change added.", changeOrderId: parsed.data.changeOrderId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add the change." };
  }
}

async function idAction(
  formData: FormData,
  minimumRole: "staff" | "manager",
  run: (input: { businessId: string; changeOrderId: string; actorUserId: string; actorRole: "staff" | "manager" | "owner" }) => Promise<unknown>,
  success: string,
): Promise<ChangeOrderActionState> {
  const context = await getBusinessActionContext({ minimumRole });

  if (!context.ok) {
    return { error: context.error };
  }

  const changeOrderId = formData.get("changeOrderId");

  if (typeof changeOrderId !== "string" || !changeOrderId) {
    return { error: "Invalid change order." };
  }

  try {
    await run({
      businessId: context.businessContext.business.id,
      changeOrderId,
      actorUserId: context.user.id,
      actorRole: context.businessContext.role,
    });

    return { success, changeOrderId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the change order." };
  }
}

export async function submitChangeOrderAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const changeOrderId = formData.get("changeOrderId");

  if (typeof changeOrderId !== "string" || !changeOrderId) {
    return { error: "Invalid change order." };
  }

  try {
    const result = await submitChangeOrderForApproval({
      businessId: context.businessContext.business.id,
      changeOrderId,
      actorUserId: context.user.id,
      actorRole: context.businessContext.role,
      actorName: context.user.name,
      actorEmail: context.user.email,
    });

    return { success: "Change sent for customer approval.", changeOrderId, customerToken: result.customerToken };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not submit the change order." };
  }
}

export async function withdrawChangeOrderAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  return idAction(formData, "staff", withdrawChangeOrder, "Change withdrawn.");
}

export async function cancelChangeOrderAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  return idAction(
    formData,
    "manager",
    (input) => cancelChangeOrder({ ...input, actorRole: input.actorRole }),
    "Change canceled.",
  );
}

export async function deleteDraftChangeOrderAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  return idAction(
    formData,
    "staff",
    (input) => deleteDraftChangeOrder({ businessId: input.businessId, changeOrderId: input.changeOrderId, actorRole: input.actorRole }),
    "Draft deleted.",
  );
}

export async function rebaseChangeOrderAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  return idAction(
    formData,
    "staff",
    (input) => rebaseChangeOrder({ ...input }),
    "Change rebased to the current quote.",
  );
}

const decideChangeOrderSchema = z.object({
  token: z.string().min(1).max(128),
  decision: z.enum(["approved", "rejected"]),
  approverName: z.string().max(120).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

/** Public customer decision on a change order (via the linked P1 token). */
export async function decideChangeOrderAction(
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  const parsed = decideChangeOrderSchema.safeParse({
    token: formData.get("token"),
    decision: formData.get("decision"),
    approverName: formData.get("approverName") || null,
    comment: formData.get("comment") || null,
  });

  if (!parsed.success) {
    return { error: "Invalid response." };
  }

  try {
    const result = await decideChangeOrderByToken(parsed.data);

    return result.state === "approved"
      ? { success: "Change approved. Thank you." }
      : { success: "Response recorded. Thank you." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record your response." };
  }
}

export async function decideChangeOrderForToken(
  token: string,
  _prevState: ChangeOrderActionState,
  formData: FormData,
): Promise<ChangeOrderActionState> {
  const decision = formData.get("decision");
  const approverName = formData.get("approverName");
  const comment = formData.get("comment");

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Invalid response." };
  }

  try {
    const result = await decideChangeOrderByToken({
      token,
      decision,
      approverName: typeof approverName === "string" && approverName ? approverName : null,
      comment: typeof comment === "string" && comment ? comment : null,
    });

    return result.state === "approved"
      ? { success: "Change approved. Thank you." }
      : { success: "Response recorded. Thank you." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record your response." };
  }
}
