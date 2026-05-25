import {
  actionConfigSchema,
  type ActionConfig,
  type ActionResult,
  type ActionType,
} from "../types";

import { executeCreateFollowUp } from "./create-follow-up";
import { executeSendEmail } from "./send-email";
import { executeSendNotification } from "./send-notification";
import { executeUpdateInquiryStatus } from "./update-inquiry-status";
import { executeUpdateQuoteStatus } from "./update-quote-status";
import { executeArchiveInquiry } from "./archive-inquiry";
import { executeCreateJobFromQuote } from "./create-job-from-quote";
import { executeGenerateInvoice } from "./generate-invoice";
import { executeGenerateDraftQuote } from "./generate-draft-quote";

// ---------------------------------------------------------------------------
// Action Executor Registry (Requirements 4.1, 4.2, 4.9)
// ---------------------------------------------------------------------------

export type ActionInput = {
  businessId: string;
  triggerPayload: unknown;
  actionConfig: ActionConfig;
};

type ActionExecutor = (input: ActionInput) => Promise<ActionResult>;

const executorRegistry: Record<ActionType, ActionExecutor> = {
  create_follow_up: executeCreateFollowUp,
  send_email: executeSendEmail,
  send_notification: executeSendNotification,
  update_inquiry_status: executeUpdateInquiryStatus,
  update_quote_status: executeUpdateQuoteStatus,
  archive_inquiry: executeArchiveInquiry,
  create_job_from_quote: executeCreateJobFromQuote,
  generate_invoice: executeGenerateInvoice,
  generate_draft_quote: executeGenerateDraftQuote,
};

/**
 * Dispatches action execution to the appropriate executor.
 * Validates actionConfig with Zod before execution (Requirement 4.9).
 * Returns a standardized ActionResult.
 */
export async function executeAction(
  actionType: ActionType,
  input: ActionInput,
): Promise<ActionResult> {
  // Validate actionConfig against the discriminated union schema
  const validation = actionConfigSchema.safeParse(input.actionConfig);

  if (!validation.success) {
    return {
      success: false,
      error: `Invalid action config for "${actionType}": ${validation.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const executor = executorRegistry[actionType];

  if (!executor) {
    return {
      success: false,
      error: `No executor registered for action type: ${actionType}`,
    };
  }

  try {
    return await executor({ ...input, actionConfig: validation.data });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}
