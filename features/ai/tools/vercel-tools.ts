import { tool } from "ai";
import { z } from "zod";

import { executeToolCall } from "./executors";
import type { AiToolExecutionContext } from "./types";

// ---------------------------------------------------------------------------
// AI SDK Tools — Custom Tools for the Dashboard Assistant
//
// Following the Vercel AI SDK Foundations: Tools pattern.
// Each tool has: description, inputSchema (Zod), and execute function.
// Tools are read-only database queries scoped to the authorized business.
//
// Usage:
//   const tools = createDashboardTools(ctx);
//   streamText({ model, tools, ... });
// ---------------------------------------------------------------------------

/**
 * Creates tools bound to a specific business context.
 * Pass the result directly to `streamText` or `generateText` as the `tools` parameter.
 */
export function createDashboardTools(ctx: AiToolExecutionContext) {
  return {
    count_inquiries: tool({
      description: "Count inquiries by status. Returns: {count, breakdown}",
      inputSchema: z.object({
        status: z
          .enum(["new", "waiting", "quoted", "won", "lost", "overdue", "archived"])
          .nullable()
          .optional()
          .describe("Filter by status."),
      }),
      execute: async ({ status }) => {
        const result = await executeToolCall(ctx, { tool: "count_inquiries", args: { status: status ?? undefined } });
        return result.result;
      },
    }),

    count_quotes: tool({
      description: "Count quotes by status. Returns: {count, breakdown, totalValue}",
      inputSchema: z.object({
        status: z
          .enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "voided"])
          .nullable()
          .optional()
          .describe("Filter by status."),
      }),
      execute: async ({ status }) => {
        const result = await executeToolCall(ctx, { tool: "count_quotes", args: { status } });
        return result.result;
      },
    }),

    search_inquiries: tool({
      description: "Search inquiries by name, email, or service. Returns: {results[]}",
      inputSchema: z.object({
        query: z.string().describe("Search term."),
        status: z
          .enum(["new", "waiting", "quoted", "won", "lost", "overdue", "archived"]).nullable().optional()
          .describe("Filter by status."),
        limit: z.number().nullable().optional().describe("Max results (default 10, max 25)."),
      }),
      execute: async ({ query, status, limit }) => {
        const result = await executeToolCall(ctx, { tool: "search_inquiries", args: { query, status, limit } });
        return result.result;
      },
    }),

    search_quotes: tool({
      description: "Search quotes by name, email, or number. Returns: {results[]}",
      inputSchema: z.object({
        query: z.string().describe("Search term."),
        status: z
          .enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "voided"]).nullable().optional()
          .describe("Filter by status."),
        limit: z.number().nullable().optional().describe("Max results (default 10, max 25)."),
      }),
      execute: async ({ query, status, limit }) => {
        const result = await executeToolCall(ctx, { tool: "search_quotes", args: { query, status, limit } });
        return result.result;
      },
    }),

    get_inquiry_details: tool({
      description: "Get full inquiry details by ID. Returns: {inquiry}",
      inputSchema: z.object({
        inquiry_id: z.string().describe("Inquiry ID."),
      }),
      execute: async ({ inquiry_id }) => {
        const { getInquiryDetailsStructured } = await import("./structured-outputs");
        const result = await getInquiryDetailsStructured(ctx, { inquiry_id });
        return typeof result === "string" ? result : result;
      },
    }),

    get_quote_details: tool({
      description: "Get quote details by ID or number (Q-1001). Returns: {quote}",
      inputSchema: z.object({
        quote_id: z.string().describe("Quote ID or number."),
      }),
      execute: async ({ quote_id }) => {
        const { getQuoteDetailsStructured } = await import("./structured-outputs");
        const result = await getQuoteDetailsStructured(ctx, { quote_id });
        return typeof result === "string" ? result : result;
      },
    }),

    get_business_stats: tool({
      description: "Business overview: counts, conversion rates. Returns: {stats}",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_business_stats", args: {} });
        return result.result;
      },
    }),

    get_recent_activity: tool({
      description: "Recent activity log for the business. Returns: {entries[]}",
      inputSchema: z.object({
        limit: z.number().nullable().optional().describe("Number of recent activities to return (default 10, max 50)."),
        type: z.string().nullable().optional().describe("Filter by activity type (e.g., inquiry_created, quote_sent, quote_accepted)."),
      }),
      execute: async ({ limit, type }) => {
        const result = await executeToolCall(ctx, { tool: "get_recent_activity", args: { limit, type } });
        return result.result;
      },
    }),

    get_follow_ups: tool({
      description: "Get follow-ups by status or due bucket. Returns: {followUps[]}",
      inputSchema: z.object({
        status: z.enum(["pending", "completed", "skipped"]).nullable().optional().describe("Filter by follow-up status."),
        bucket: z.enum(["overdue", "today", "upcoming"]).nullable().optional().describe("Filter by due date bucket."),
        limit: z.number().nullable().optional().describe("Maximum results to return (default 10, max 25)."),
      }),
      execute: async ({ status, bucket, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_follow_ups", args: { status, bucket, limit } });
        return result.result;
      },
    }),

    list_inquiries: tool({
      description: "List inquiries paginated, most recent first. Returns: {items[]}",
      inputSchema: z.object({
        status: z
          .enum(["new", "waiting", "quoted", "won", "lost", "overdue", "archived"]).nullable().optional()
          .describe("Filter by status."),
        limit: z.number().nullable().optional().describe("Max results (default 10, max 25)."),
        offset: z.number().nullable().optional().describe("Skip records for pagination."),
      }),
      execute: async ({ status, limit, offset }) => {
        const { listInquiriesStructured } = await import("./structured-outputs");
        const result = await listInquiriesStructured(ctx, { status, limit, offset });
        return typeof result === "string" ? result : result;
      },
    }),

    list_quotes: tool({
      description: "List quotes paginated, most recent first. Returns: {items[]}",
      inputSchema: z.object({
        status: z
          .enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "voided"]).nullable().optional()
          .describe("Filter by status."),
        limit: z.number().nullable().optional().describe("Max results (default 10, max 25)."),
        offset: z.number().nullable().optional().describe("Skip records for pagination."),
      }),
      execute: async ({ status, limit, offset }) => {
        const { listQuotesStructured } = await import("./structured-outputs");
        const result = await listQuotesStructured(ctx, { status, limit, offset });
        return typeof result === "string" ? result : result;
      },
    }),

    get_analytics_overview: tool({
      description: "30-day funnel metrics and conversion rates. Returns: {funnel, rates}",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_analytics_overview", args: {} });
        return result.result;
      },
    }),

    get_revenue_summary: tool({
      description: "Revenue metrics for a period. Returns: {quoted, accepted, winRate}",
      inputSchema: z.object({
        days: z.number().nullable().optional().describe("Number of days to look back (default 30, max 365)."),
      }),
      execute: async ({ days }) => {
        const result = await executeToolCall(ctx, { tool: "get_revenue_summary", args: { days } });
        return result.result;
      },
    }),

    get_stale_inquiries: tool({
      description: "Find unresponded inquiries older than N days. Returns: {items[]}",
      inputSchema: z.object({
        days: z.number().nullable().optional().describe("Minimum age in days to be considered stale (default 2)."),
        limit: z.number().nullable().optional().describe("Maximum results to return (default 10)."),
      }),
      execute: async ({ days, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_stale_inquiries", args: { days, limit } });
        return result.result;
      },
    }),

    get_expiring_quotes: tool({
      description: "Find quotes expiring within N days. Returns: {items[]}",
      inputSchema: z.object({
        days: z.number().nullable().optional().describe("Find quotes expiring within this many days (default 7)."),
        limit: z.number().nullable().optional().describe("Maximum results to return (default 10)."),
      }),
      execute: async ({ days, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_expiring_quotes", args: { days, limit } });
        return result.result;
      },
    }),

    get_customer_history: tool({
      description: "All inquiries and quotes for a customer. Returns: {history[]}",
      inputSchema: z.object({
        customer: z.string().describe("Customer name or email to search for."),
      }),
      execute: async ({ customer }) => {
        const result = await executeToolCall(ctx, { tool: "get_customer_history", args: { customer } });
        return result.result;
      },
    }),

    get_service_categories: tool({
      description: "List service categories with inquiry counts. Returns: {categories[]}",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_service_categories", args: {} });
        return result.result;
      },
    }),

    get_pricing_library: tool({
      description: "Search reusable pricing blocks and packages. Returns: {entries[]}",
      inputSchema: z.object({
        query: z.string().nullable().optional().describe("Search term to filter entries by name or description. Omit to list all."),
        limit: z.number().nullable().optional().describe("Maximum results to return (default 10)."),
      }),
      execute: async ({ query, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_pricing_library", args: { query, limit } });
        return result.result;
      },
    }),

    get_inquiry_notes: tool({
      description: "Get internal notes for an inquiry. Returns: {notes[]}",
      inputSchema: z.object({
        inquiry_id: z.string().describe("The inquiry ID to get notes for."),
      }),
      execute: async ({ inquiry_id }) => {
        const result = await executeToolCall(ctx, { tool: "get_inquiry_notes", args: { inquiry_id } });
        return result.result;
      },
    }),

    get_inquiry_conversation: tool({
      description: "Get message history for an inquiry. Returns: {messages[]}",
      inputSchema: z.object({
        inquiry_id: z.string().describe("The inquiry ID to get the conversation for."),
      }),
      execute: async ({ inquiry_id }) => {
        const result = await executeToolCall(ctx, { tool: "get_inquiry_conversation", args: { inquiry_id } });
        return result.result;
      },
    }),

    get_inquiry_attachments: tool({
      description: "List file attachments for an inquiry. Returns: {files[]}",
      inputSchema: z.object({
        inquiry_id: z.string().describe("The inquiry ID to list attachments for."),
      }),
      execute: async ({ inquiry_id }) => {
        const result = await executeToolCall(ctx, { tool: "get_inquiry_attachments", args: { inquiry_id } });
        return result.result;
      },
    }),

    get_job_pipeline: tool({
      description: "Jobs by post-acceptance stage. Returns: {items[], counts}",
      inputSchema: z.object({
        status: z.enum(["none", "booked", "scheduled", "in_progress", "completed", "canceled"]).nullable().optional().describe("Filter by post-acceptance status. Omit to get all accepted quotes."),
        limit: z.number().nullable().optional().describe("Maximum results to return (default 10)."),
      }),
      execute: async ({ status, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_job_pipeline", args: { status, limit } });
        return result.result;
      },
    }),

    get_response_times: tool({
      description: "Average and median inquiry response times. Returns: {avg, median}",
      inputSchema: z.object({
        days: z.number().nullable().optional().describe("Number of days to analyze (default 30, max 90)."),
      }),
      execute: async ({ days }) => {
        const result = await executeToolCall(ctx, { tool: "get_response_times", args: { days } });
        return result.result;
      },
    }),

    get_period_comparison: tool({
      description: "Compare current vs previous period metrics. Returns: {current, previous}",
      inputSchema: z.object({
        days: z.number().nullable().optional().describe("Period length in days to compare (default 30). Compares last N days vs the N days before that."),
      }),
      execute: async ({ days }) => {
        const result = await executeToolCall(ctx, { tool: "get_period_comparison", args: { days } });
        return result.result;
      },
    }),

    get_business_knowledge: tool({
      description: "Search saved business knowledge entries. Returns: {entries[]}",
      inputSchema: z.object({
        query: z.string().nullable().optional().describe("Search term to filter knowledge entries. Omit to list all."),
      }),
      execute: async ({ query }) => {
        const result = await executeToolCall(ctx, { tool: "get_business_knowledge", args: { query } });
        return result.result;
      },
    }),

    get_quote_customer_response: tool({
      description: "Get customer feedback for a quote. Returns: {response, reason}",
      inputSchema: z.object({
        quote_id: z.string().describe("The quote ID or quote number to look up."),
      }),
      execute: async ({ quote_id }) => {
        const result = await executeToolCall(ctx, { tool: "get_quote_customer_response", args: { quote_id } });
        return result.result;
      },
    }),

    get_business_info: tool({
      description: "Business profile: name, type, plan, currency. Returns: {business}",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_business_info", args: {} });
        return result.result;
      },
    }),

    get_business_members: tool({
      description: "List business members with roles. Returns: {members[]}",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_business_members", args: {} });
        return result.result;
      },
    }),

    list_jobs: tool({
      description: "List jobs paginated, most recent first. Returns: {items[]}",
      inputSchema: z.object({
        status: z.enum(["todo", "in_progress", "done"]).nullable().optional().describe("Filter by status."),
        limit: z.number().nullable().optional().describe("Max results (default 10, max 25)."),
        offset: z.number().nullable().optional().describe("Skip records for pagination."),
      }),
      execute: async ({ status, limit, offset }) => {
        const { listJobsStructured } = await import("./structured-outputs");
        const result = await listJobsStructured(ctx, { status, limit, offset });
        return typeof result === "string" ? result : result;
      },
    }),

    get_job_details: tool({
      description: "Get job details by ID with items and progress. Returns: {job}",
      inputSchema: z.object({
        job_id: z.string().describe("Job ID."),
      }),
      execute: async ({ job_id }) => {
        const { getJobDetailsStructured } = await import("./structured-outputs");
        const result = await getJobDetailsStructured(ctx, { job_id });
        return typeof result === "string" ? result : result;
      },
    }),

    list_invoices: tool({
      description: "List invoices paginated, most recent first. Returns: {items[]}",
      inputSchema: z.object({
        status: z.enum(["draft", "sent", "viewed", "paid", "overdue", "voided"]).nullable().optional().describe("Filter by status."),
        limit: z.number().nullable().optional().describe("Max results (default 10, max 25)."),
        offset: z.number().nullable().optional().describe("Skip records for pagination."),
      }),
      execute: async ({ status, limit, offset }) => {
        const { listInvoicesStructured } = await import("./structured-outputs");
        const result = await listInvoicesStructured(ctx, { status, limit, offset });
        return typeof result === "string" ? result : result;
      },
    }),

    get_invoice_details: tool({
      description: "Get invoice details by ID or number (INV-1001). Returns: {invoice}",
      inputSchema: z.object({
        invoice_id: z.string().describe("Invoice ID or number."),
      }),
      execute: async ({ invoice_id }) => {
        const { getInvoiceDetailsStructured } = await import("./structured-outputs");
        const result = await getInvoiceDetailsStructured(ctx, { invoice_id });
        return typeof result === "string" ? result : result;
      },
    }),
  };
}
