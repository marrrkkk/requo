import { tool } from "ai";
import { z } from "zod";

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
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: z.object({
        customerName: z.string().describe("Customer's full name."),
        customerEmail: z
          .string()
          .optional()
          .describe("Customer's email address (optional)."),
        customerContactMethod: z
          .string()
          .describe("Preferred contact method: email, phone, sms, whatsapp, messenger, instagram, or other."),
        customerContactHandle: z
          .string()
          .describe("The contact handle (email address, phone number, etc)."),
        serviceCategory: z
          .string()
          .describe("Service category for the inquiry."),
        details: z
          .string()
          .describe("Description of what the customer needs."),
        budgetText: z
          .string()
          .optional()
          .describe("Customer's budget if mentioned."),
        requestedDeadline: z
          .string()
          .optional()
          .describe("Requested deadline if mentioned (ISO date string)."),
      }),
      execute: async (args) => {
        const proposal = {
          action: "create_inquiry" as const,
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            customerName: args.customerName,
            customerEmail: args.customerEmail || null,
            customerContactMethod: args.customerContactMethod,
            customerContactHandle: args.customerContactHandle,
            serviceCategory: args.serviceCategory,
            details: args.details,
            budgetText: args.budgetText || undefined,
            requestedDeadline: args.requestedDeadline || undefined,
          },
        };

        return `[ACTION_PROPOSAL]${JSON.stringify(proposal)}[/ACTION_PROPOSAL]`;
      },
    }),

    draft_quote: tool({
      description:
        "Propose creating a new quote with line items. " +
        "IMPORTANT: Before calling this tool, you MUST first call get_inquiry_details (if linked to an inquiry) or get_pricing_library to get real pricing data. " +
        "Never guess customer names, emails, or prices — use data from previous tool calls. " +
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: z.object({
        title: z.string().describe("Quote title (e.g. 'Kitchen renovation quote')."),
        customerName: z.string().describe("Customer's full name."),
        customerEmail: z
          .string()
          .optional()
          .describe("Customer's email address (optional)."),
        customerContactMethod: z
          .string()
          .describe("Preferred contact method."),
        customerContactHandle: z
          .string()
          .describe("Contact handle (email, phone, etc)."),
        notes: z.string().optional().describe("Internal notes for this quote."),
        validUntil: z
          .string()
          .describe("Quote validity date as ISO date string (e.g. 2025-02-15)."),
        inquiryId: z
          .string()
          .optional()
          .describe("Link to an existing inquiry ID if this quote is for a specific inquiry."),
        items: z.array(
          z.object({
            description: z.string().describe("Line item description."),
            quantity: z.number().describe("Quantity."),
            unitPriceInCents: z
              .number()
              .describe("Unit price in cents (e.g. 5000 = $50.00)."),
          }),
        ).describe("Quote line items."),
        discountInCents: z
          .number()
          .optional()
          .describe("Total discount in cents (optional, default 0)."),
      }),
      execute: async (args) => {
        const proposal = {
          action: "create_quote" as const,
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            title: args.title,
            customerName: args.customerName,
            customerEmail: args.customerEmail || null,
            customerContactMethod: args.customerContactMethod,
            customerContactHandle: args.customerContactHandle,
            notes: args.notes || null,
            validUntil: args.validUntil,
            inquiryId: args.inquiryId || null,
            items: args.items,
            discountInCents: args.discountInCents || 0,
          },
        };

        return `[ACTION_PROPOSAL]${JSON.stringify(proposal)}[/ACTION_PROPOSAL]`;
      },
    }),

    schedule_follow_up: tool({
      description:
        "Propose scheduling a follow-up for an inquiry or quote. " +
        "IMPORTANT: Before calling this tool, you MUST first call get_inquiry_details or get_quote_details to get the correct entity ID. " +
        "Never guess IDs. Requires either inquiryId or quoteId from a previous tool call. " +
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: z.object({
        title: z.string().describe("Short title for the follow-up (e.g. 'Check in on quote Q-1042')."),
        reason: z
          .string()
          .describe("Why this follow-up is needed (e.g. 'Customer hasn't responded to the quote')."),
        channel: z
          .enum(["email", "phone", "sms", "whatsapp", "messenger", "instagram", "other"])
          .describe("Communication channel for the follow-up."),
        dueDate: z
          .string()
          .describe("Due date as ISO date string (e.g. 2025-02-15)."),
        inquiryId: z
          .string()
          .optional()
          .describe("The inquiry ID this follow-up is for (provide either inquiryId or quoteId)."),
        quoteId: z
          .string()
          .optional()
          .describe("The quote ID this follow-up is for (provide either inquiryId or quoteId)."),
        recurrence: z
          .enum(["none", "daily", "every_3_days", "weekly", "biweekly", "monthly"])
          .optional()
          .describe("Recurrence pattern (default: none)."),
      }),
      execute: async (args) => {
        if (!args.inquiryId && !args.quoteId) {
          return "Error: Either inquiryId or quoteId must be provided for a follow-up.";
        }

        const proposal = {
          action: "create_follow_up" as const,
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            title: args.title,
            reason: args.reason,
            channel: args.channel,
            dueDate: args.dueDate,
            inquiryId: args.inquiryId || null,
            quoteId: args.quoteId || null,
            recurrence: args.recurrence || "none",
          },
        };

        return `[ACTION_PROPOSAL]${JSON.stringify(proposal)}[/ACTION_PROPOSAL]`;
      },
    }),

    update_inquiry_status: tool({
      description:
        "Propose changing the status of an inquiry. " +
        "IMPORTANT: Before calling this tool, you MUST first call get_inquiry_details to verify the inquiry exists and get its current status. " +
        "Never guess inquiry IDs. " +
        "The tool output renders as an interactive confirmation card — do NOT write any [ACTION_PROPOSAL] text manually.",
      inputSchema: z.object({
        inquiryId: z.string().describe("The inquiry ID to update."),
        status: z
          .enum(["new", "waiting", "quoted", "won", "lost"])
          .describe("The new status to set."),
        reason: z
          .string()
          .optional()
          .describe("Optional reason for the status change."),
      }),
      execute: async (args) => {
        const proposal = {
          action: "update_inquiry_status" as const,
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          payload: {
            inquiryId: args.inquiryId,
            status: args.status,
            reason: args.reason || null,
          },
        };

        return `[ACTION_PROPOSAL]${JSON.stringify(proposal)}[/ACTION_PROPOSAL]`;
      },
    }),
  };
}
