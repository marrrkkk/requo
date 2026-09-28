"use server";

import { saveScheduleForQuote } from "@/features/schedules/mutations";
import { getBusinessActionContext } from "@/lib/db/business-access";

export type ScheduleActionState = {
  error?: string;
  success?: string;
};

export async function saveScheduleAction(
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const context = await getBusinessActionContext({ minimumRole: "staff" });

  if (!context.ok) {
    return { error: context.error };
  }

  const quoteId = formData.get("quoteId");
  const itemsRaw = formData.get("items");

  if (typeof quoteId !== "string" || !quoteId || typeof itemsRaw !== "string") {
    return { error: "Invalid schedule." };
  }

  let items: unknown;

  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: "Schedule items must be valid JSON." };
  }

  try {
    await saveScheduleForQuote({
      businessId: context.businessContext.business.id,
      quoteId,
      items,
      actorUserId: context.user.id,
      actorRole: context.businessContext.role,
    });

    return { success: "Payment schedule saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the schedule." };
  }
}
