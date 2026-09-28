"use server";

import { isScopeBlockKind } from "@/features/scope-blocks/schemas";
import {
  upsertScopeBlockForQuote,
  waiveScopeBlockForQuote,
} from "@/features/scope-blocks/mutations";
import { getBusinessActionContext } from "@/lib/db/business-access";

export type ScopeBlockActionState = {
  error?: string;
  success?: string;
};

export async function upsertScopeBlockAction(
  _prevState: ScopeBlockActionState,
  formData: FormData,
): Promise<ScopeBlockActionState> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const quoteId = formData.get("quoteId");
  const kind = formData.get("kind");
  const contentRaw = formData.get("content");

  if (typeof quoteId !== "string" || !quoteId || !isScopeBlockKind(kind) || typeof contentRaw !== "string") {
    return { error: "Invalid scope section." };
  }

  let content: unknown;

  try {
    content = JSON.parse(contentRaw);
  } catch {
    return { error: "Scope content must be valid JSON." };
  }

  try {
    await upsertScopeBlockForQuote({
      businessId: context.businessContext.business.id,
      quoteId,
      kind,
      content,
      actorUserId: context.user.id,
    });

    return { success: "Scope section saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the scope section." };
  }
}

export async function waiveScopeBlockAction(
  _prevState: ScopeBlockActionState,
  formData: FormData,
): Promise<ScopeBlockActionState> {
  const context = await getBusinessActionContext({
    minimumRole: "manager",
    unauthorizedMessage: "Only an owner or manager can waive a required scope section.",
  });

  if (!context.ok) {
    return { error: context.error };
  }

  const blockId = formData.get("blockId");
  const reason = formData.get("reason");

  if (typeof blockId !== "string" || !blockId || typeof reason !== "string" || !reason.trim()) {
    return { error: "A waiver reason is required." };
  }

  try {
    await waiveScopeBlockForQuote({
      businessId: context.businessContext.business.id,
      blockId,
      reason,
      actorUserId: context.user.id,
      actorRole: context.businessContext.role,
      actorName: context.user.name,
      actorEmail: context.user.email,
    });

    return { success: "Required section waived and audit-logged." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not waive the section." };
  }
}
