import { tool } from "ai";

import {
  draftInquiryToolInputSchema,
  draftQuoteToolInputSchema,
  scheduleFollowUpToolInputSchema,
  updateInquiryStatusToolInputSchema,
  validateAiActionProposal,
  type AiActionType,
} from "@/features/ai/action-proposal-schemas";
import type { AiToolExecutionContext } from "./types";

// ---------------------------------------------------------------------------
// AI SDK Action Tools — Write Actions for the Dashboard Assistant
//
// These tools produce structured action proposals that the AI embeds in its
// response. The client renders them as confirmable action buttons. When the
// user confirms, the client calls the action execution API with the payload.
//
// Tools here NEVER mutate the database. They only return a structured
// proposal block that the user must explicitly confirm.
// ---------------------------------------------------------------------------

function buildActionProposalBlock(proposal: {
  action: AiActionType;
  businessId: string;
  businessSlug: string;
  payload: Record<string, unknown>;
}) {
  const validated = validateAiActionProposal(proposal);

  if (!validated.ok) {
    const summary = validated.issues
      .slice(0, 4)
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join("; ");
    return (
      `Error: Draft data failed validation and cannot be shown for confirmation. ` +
      `Fix these fields and call the tool again: ${summary}`
    );
  }

  return `[ACTION_PROPOSAL]${JSON.stringify({
    action: proposal.action,
    businessId: proposal.businessId,
    businessSlug: proposal.businessSlug,
    payload: validated.payload,
  })}[/ACTION_PROPOSAL]`;
}

/**
 * Creates action tools (write-intent) bound to a specific business context.
 * Results are embedded as `[ACTION_PROPOSAL]...[/ACTION_PROPOSAL]` blocks
 * that the client parses into interactive buttons.
 */
export function createActionTools(ctx: AiToolExecutionContext) {
  return {
    draft_inquiry: tool({
      description:
        "Propose creating a new inquiry from information discussed in the conversation. " +
        "IMPORTANT: Before calling this tool, you MUST first fetch real data using search_inquiries, get_customer_history, or get the details from the user directly. " +
        "Never guess customer info. " +
        "Use supported contact methods: email, phone, facebook, instagram, whatsapp, or other. " +
        "Dates must be YYYY-MM-DD. " +
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: draftInquiryToolInputSchema,
      execute: async (args) => {
        return buildActionProposalBlock({
          action: "create_inquiry",
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            customerName: args.customerName,
            customerEmail: args.customerEmail ?? null,
            customerContactMethod: args.customerContactMethod,
            customerContactHandle: args.customerContactHandle,
            serviceCategory: args.serviceCategory,
            details: args.details,
            budgetText: args.budgetText,
            requestedDeadline: args.requestedDeadline,
          },
        });
      },
    }),

    draft_quote: tool({
      description:
        "Propose creating a new quote with line items. " +
        "IMPORTANT: Before calling this tool, you MUST first call get_pricing_library to check available pricing. " +
        "Then call get_inquiry_details (if linked to an inquiry) to get customer data. " +
        "NEVER invent prices — only use prices found in the pricing library or past quotes. " +
        "If no matching price exists, use 0 for unitPriceInCents and note that the owner needs to set the price. " +
        "Use supported contact methods: email, phone, facebook, instagram, whatsapp, or other. " +
        "validUntil must be YYYY-MM-DD. Quantities must be whole numbers >= 1. Prices are in cents. " +
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: draftQuoteToolInputSchema,
      execute: async (args) => {
        return buildActionProposalBlock({
          action: "create_quote",
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            title: args.title,
            customerName: args.customerName,
            customerEmail: args.customerEmail ?? null,
            customerContactMethod: args.customerContactMethod,
            customerContactHandle: args.customerContactHandle,
            notes: args.notes ?? null,
            validUntil: args.validUntil,
            inquiryId: args.inquiryId ?? null,
            items: args.items,
            discountInCents: args.discountInCents ?? 0,
          },
        });
      },
    }),

    schedule_follow_up: tool({
      description:
        "Propose scheduling a follow-up for an inquiry or quote. " +
        "IMPORTANT: Before calling this tool, you MUST first call get_inquiry_details or get_quote_details to get the correct entity ID. " +
        "Never guess IDs. Requires either inquiryId or quoteId from a previous tool call. " +
        "dueDate must be YYYY-MM-DD. " +
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: scheduleFollowUpToolInputSchema,
      execute: async (args) => {
        if (!args.inquiryId && !args.quoteId) {
          return "Error: Either inquiryId or quoteId must be provided for a follow-up.";
        }

        return buildActionProposalBlock({
          action: "create_follow_up",
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            title: args.title,
            reason: args.reason,
            channel: args.channel,
            dueDate: args.dueDate,
            inquiryId: args.inquiryId ?? null,
            quoteId: args.quoteId ?? null,
            recurrence: args.recurrence ?? "none",
          },
        });
      },
    }),

    update_inquiry_status: tool({
      description:
        "Propose changing the status of an inquiry. " +
        "IMPORTANT: Before calling this tool, you MUST first call get_inquiry_details to verify the inquiry exists and get its current status. " +
        "Never guess inquiry IDs. " +
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: updateInquiryStatusToolInputSchema,
      execute: async (args) => {
        return buildActionProposalBlock({
          action: "update_inquiry_status",
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            inquiryId: args.inquiryId,
            status: args.status,
            reason: args.reason ?? null,
          },
        });
      },
    }),
  };
}
