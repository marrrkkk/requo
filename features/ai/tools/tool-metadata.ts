import type { IntentCategory } from "../orchestrator/types";

// ---------------------------------------------------------------------------
// Tool Metadata — Maps each tool to a category and intent triggers
//
// Used by the Tool Selector to filter tools based on classified intent.
// Each entry defines which intent categories cause that tool to be included
// in the model's tool set for a given request.
// ---------------------------------------------------------------------------

export type ToolMetadataCategory =
  | "data_query"
  | "quote_management"
  | "follow_up_management"
  | "analytics"
  | "knowledge"
  | "customer_lookup";

export type ToolMetadata = {
  name: string;
  category: ToolMetadataCategory;
  intentTriggers: IntentCategory[];
};

/**
 * Metadata for all tools from `createDashboardTools`.
 */
export const dashboardToolMetadata: ToolMetadata[] = [
  {
    name: "count_inquiries",
    category: "data_query",
    intentTriggers: ["data_query", "analytics", "general_question"],
  },
  {
    name: "count_quotes",
    category: "data_query",
    intentTriggers: ["data_query", "analytics", "general_question"],
  },
  {
    name: "search_inquiries",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "follow_up_action", "general_question"],
  },
  {
    name: "search_quotes",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "general_question"],
  },
  {
    name: "get_inquiry_details",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "follow_up_action", "general_question"],
  },
  {
    name: "get_quote_details",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "follow_up_action", "general_question"],
  },
  {
    name: "get_business_stats",
    category: "analytics",
    intentTriggers: ["data_query", "analytics", "general_question"],
  },
  {
    name: "get_recent_activity",
    category: "analytics",
    intentTriggers: ["data_query", "analytics", "general_question"],
  },
  {
    name: "get_follow_ups",
    category: "follow_up_management",
    intentTriggers: ["follow_up_action", "data_query", "general_question"],
  },
  {
    name: "list_inquiries",
    category: "data_query",
    intentTriggers: ["data_query", "general_question"],
  },
  {
    name: "list_quotes",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "general_question"],
  },
  {
    name: "get_analytics_overview",
    category: "analytics",
    intentTriggers: ["analytics", "general_question"],
  },
  {
    name: "get_revenue_summary",
    category: "analytics",
    intentTriggers: ["analytics", "general_question"],
  },
  {
    name: "get_stale_inquiries",
    category: "data_query",
    intentTriggers: ["data_query", "follow_up_action", "workflow_guidance"],
  },
  {
    name: "get_expiring_quotes",
    category: "quote_management",
    intentTriggers: ["quote_action", "follow_up_action", "workflow_guidance"],
  },
  {
    name: "get_customer_history",
    category: "customer_lookup",
    intentTriggers: ["data_query", "quote_action", "follow_up_action", "memory_recall", "general_question"],
  },
  {
    name: "get_service_categories",
    category: "data_query",
    intentTriggers: ["data_query", "analytics", "general_question"],
  },
  {
    name: "get_pricing_library",
    category: "knowledge",
    intentTriggers: ["quote_action", "memory_recall", "general_question"],
  },
  {
    name: "get_inquiry_notes",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "follow_up_action"],
  },
  {
    name: "get_inquiry_conversation",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "follow_up_action"],
  },
  {
    name: "get_inquiry_attachments",
    category: "data_query",
    intentTriggers: ["data_query", "general_question"],
  },
  {
    name: "get_job_pipeline",
    category: "data_query",
    intentTriggers: ["data_query", "analytics", "workflow_guidance"],
  },
  {
    name: "get_response_times",
    category: "analytics",
    intentTriggers: ["analytics", "workflow_guidance"],
  },
  {
    name: "get_period_comparison",
    category: "analytics",
    intentTriggers: ["analytics", "general_question"],
  },
  {
    name: "get_business_knowledge",
    category: "knowledge",
    intentTriggers: ["memory_recall", "general_question", "workflow_guidance"],
  },
  {
    name: "get_quote_customer_response",
    category: "quote_management",
    intentTriggers: ["data_query", "quote_action", "follow_up_action"],
  },
];

/**
 * Metadata for all tools from `createActionTools`.
 */
export const actionToolMetadata: ToolMetadata[] = [
  {
    name: "draft_inquiry",
    category: "data_query",
    intentTriggers: ["data_query", "quote_action", "follow_up_action", "workflow_guidance"],
  },
  {
    name: "draft_quote",
    category: "quote_management",
    intentTriggers: ["quote_action", "workflow_guidance"],
  },
  {
    name: "schedule_follow_up",
    category: "follow_up_management",
    intentTriggers: ["follow_up_action", "workflow_guidance"],
  },
  {
    name: "update_inquiry_status",
    category: "data_query",
    intentTriggers: ["data_query", "workflow_guidance"],
  },
];

/**
 * Combined metadata for all tools, indexed by tool name for fast lookup.
 */
export const toolMetadataMap: Map<string, ToolMetadata> = new Map(
  [...dashboardToolMetadata, ...actionToolMetadata].map((meta) => [meta.name, meta]),
);
