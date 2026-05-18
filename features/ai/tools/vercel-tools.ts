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
      description: "Count total inquiries for the business, optionally filtered by status. Returns the count and breakdown by status.",
      inputSchema: z.object({
        status: z
          .enum(["new", "waiting", "quoted", "won", "lost", "overdue", "archived"])
          .optional()
          .describe("Filter by inquiry status. Omit to get all."),
      }),
      execute: async ({ status }) => {
        const result = await executeToolCall(ctx, { tool: "count_inquiries", args: { status } });
        return result.result;
      },
    }),

    count_quotes: tool({
      description: "Count total quotes for the business, optionally filtered by status. Returns the count, breakdown by status, and total value.",
      inputSchema: z.object({
        status: z
          .enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "voided"])
          .optional()
          .describe("Filter by quote status. Omit to get all."),
      }),
      execute: async ({ status }) => {
        const result = await executeToolCall(ctx, { tool: "count_quotes", args: { status } });
        return result.result;
      },
    }),

    search_inquiries: tool({
      description: "Search inquiries by customer name, email, subject, service category, or details content. Returns matching inquiries with key details.",
      inputSchema: z.object({
        query: z.string().describe("Search term to match against customer name, email, subject, category, or details."),
        status: z
          .enum(["new", "waiting", "quoted", "won", "lost", "overdue", "archived"])
          .optional()
          .describe("Optionally filter results by status."),
        limit: z.number().optional().describe("Maximum results to return (default 10, max 25)."),
      }),
      execute: async ({ query, status, limit }) => {
        const result = await executeToolCall(ctx, { tool: "search_inquiries", args: { query, status, limit } });
        return result.result;
      },
    }),

    search_quotes: tool({
      description: "Search quotes by customer name, email, quote number, title, or notes. Returns matching quotes with key details.",
      inputSchema: z.object({
        query: z.string().describe("Search term to match against customer name, email, quote number, title, or notes."),
        status: z
          .enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "voided"])
          .optional()
          .describe("Optionally filter results by status."),
        limit: z.number().optional().describe("Maximum results to return (default 10, max 25)."),
      }),
      execute: async ({ query, status, limit }) => {
        const result = await executeToolCall(ctx, { tool: "search_quotes", args: { query, status, limit } });
        return result.result;
      },
    }),

    get_inquiry_details: tool({
      description: "Get full details of a specific inquiry by ID, including customer info, status, notes, and related quotes.",
      inputSchema: z.object({
        inquiry_id: z.string().describe("The inquiry ID to look up."),
      }),
      execute: async ({ inquiry_id }) => {
        const result = await executeToolCall(ctx, { tool: "get_inquiry_details", args: { inquiry_id } });
        return result.result;
      },
    }),

    get_quote_details: tool({
      description: "Get full details of a specific quote by ID or quote number, including line items, status, and customer info.",
      inputSchema: z.object({
        quote_id: z.string().describe("The quote ID or quote number (e.g., Q-1001) to look up."),
      }),
      execute: async ({ quote_id }) => {
        const result = await executeToolCall(ctx, { tool: "get_quote_details", args: { quote_id } });
        return result.result;
      },
    }),

    get_business_stats: tool({
      description: "Get comprehensive business statistics including inquiry counts by status, quote counts by status, total quoted value, conversion rates, and recent activity summary.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_business_stats", args: {} });
        return result.result;
      },
    }),

    get_recent_activity: tool({
      description: "Get recent activity log entries for the business. Shows what happened recently (inquiries created, quotes sent, etc.).",
      inputSchema: z.object({
        limit: z.number().optional().describe("Number of recent activities to return (default 10, max 50)."),
        type: z.string().optional().describe("Filter by activity type (e.g., inquiry_created, quote_sent, quote_accepted)."),
      }),
      execute: async ({ limit, type }) => {
        const result = await executeToolCall(ctx, { tool: "get_recent_activity", args: { limit, type } });
        return result.result;
      },
    }),

    get_follow_ups: tool({
      description: "Get follow-ups for the business, optionally filtered by status or due date bucket.",
      inputSchema: z.object({
        status: z.enum(["pending", "completed", "skipped"]).optional().describe("Filter by follow-up status."),
        bucket: z.enum(["overdue", "today", "upcoming"]).optional().describe("Filter by due date bucket."),
        limit: z.number().optional().describe("Maximum results to return (default 10, max 25)."),
      }),
      execute: async ({ status, bucket, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_follow_ups", args: { status, bucket, limit } });
        return result.result;
      },
    }),

    list_inquiries: tool({
      description: "List inquiries for the business with pagination, ordered by most recent. Use this when the user wants to see their inquiries without a specific search term.",
      inputSchema: z.object({
        status: z
          .enum(["new", "waiting", "quoted", "won", "lost", "overdue", "archived"])
          .optional()
          .describe("Filter by inquiry status."),
        limit: z.number().optional().describe("Maximum results to return (default 10, max 25)."),
        offset: z.number().optional().describe("Number of records to skip for pagination (default 0)."),
      }),
      execute: async ({ status, limit, offset }) => {
        const result = await executeToolCall(ctx, { tool: "list_inquiries", args: { status, limit, offset } });
        return result.result;
      },
    }),

    list_quotes: tool({
      description: "List quotes for the business with pagination, ordered by most recent. Use this when the user wants to see their quotes without a specific search term.",
      inputSchema: z.object({
        status: z
          .enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "voided"])
          .optional()
          .describe("Filter by quote status."),
        limit: z.number().optional().describe("Maximum results to return (default 10, max 25)."),
        offset: z.number().optional().describe("Number of records to skip for pagination (default 0)."),
      }),
      execute: async ({ status, limit, offset }) => {
        const result = await executeToolCall(ctx, { tool: "list_quotes", args: { status, limit, offset } });
        return result.result;
      },
    }),

    get_analytics_overview: tool({
      description: "Get comprehensive business analytics for the last 30 days: funnel metrics (form views → inquiries → quotes → accepted), conversion rates, revenue, and follow-up health.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_analytics_overview", args: {} });
        return result.result;
      },
    }),

    get_revenue_summary: tool({
      description: "Get revenue metrics: total quoted value, accepted value, average deal size, win rate, and completed job value for a given period.",
      inputSchema: z.object({
        days: z.number().optional().describe("Number of days to look back (default 30, max 365)."),
      }),
      execute: async ({ days }) => {
        const result = await executeToolCall(ctx, { tool: "get_revenue_summary", args: { days } });
        return result.result;
      },
    }),

    get_stale_inquiries: tool({
      description: "Find inquiries that have not been responded to and are older than a threshold. Useful for identifying leads that need attention.",
      inputSchema: z.object({
        days: z.number().optional().describe("Minimum age in days to be considered stale (default 2)."),
        limit: z.number().optional().describe("Maximum results to return (default 10)."),
      }),
      execute: async ({ days, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_stale_inquiries", args: { days, limit } });
        return result.result;
      },
    }),

    get_expiring_quotes: tool({
      description: "Find sent quotes that will expire within a given number of days. Useful for follow-up prioritization.",
      inputSchema: z.object({
        days: z.number().optional().describe("Find quotes expiring within this many days (default 7)."),
        limit: z.number().optional().describe("Maximum results to return (default 10)."),
      }),
      execute: async ({ days, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_expiring_quotes", args: { days, limit } });
        return result.result;
      },
    }),

    get_customer_history: tool({
      description: "Find all inquiries and quotes for a specific customer by name or email. Shows the full history of interactions with that customer.",
      inputSchema: z.object({
        customer: z.string().describe("Customer name or email to search for."),
      }),
      execute: async ({ customer }) => {
        const result = await executeToolCall(ctx, { tool: "get_customer_history", args: { customer } });
        return result.result;
      },
    }),

    get_service_categories: tool({
      description: "List all service categories with the number of inquiries in each. Shows what services are most requested.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await executeToolCall(ctx, { tool: "get_service_categories", args: {} });
        return result.result;
      },
    }),

    get_pricing_library: tool({
      description: "Search the pricing library for reusable quote entries (blocks and packages). Shows available pre-configured pricing items.",
      inputSchema: z.object({
        query: z.string().optional().describe("Search term to filter entries by name or description. Omit to list all."),
        limit: z.number().optional().describe("Maximum results to return (default 10)."),
      }),
      execute: async ({ query, limit }) => {
        const result = await executeToolCall(ctx, { tool: "get_pricing_library", args: { query, limit } });
        return result.result;
      },
    }),

    get_inquiry_notes: tool({
      description: "Get internal notes for a specific inquiry. Shows notes added by the business owner or team.",
      inputSchema: z.object({
        inquiry_id: z.string().describe("The inquiry ID to get notes for."),
      }),
      execute: async ({ inquiry_id }) => {
        const result = await executeToolCall(ctx, { tool: "get_inquiry_notes", args: { inquiry_id } });
        return result.result;
      },
    }),
  };
}
