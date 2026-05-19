import type { Tool } from "ai";

import type { AiToolExecutionContext } from "../tools/types";
import { createDashboardTools } from "../tools/vercel-tools";
import { createActionTools } from "../tools/action-tools";
import { toolMetadataMap } from "../tools/tool-metadata";
import type { ToolMetadataCategory } from "../tools/tool-metadata";
import type { IntentResult, ToolCategory } from "./types";

// ---------------------------------------------------------------------------
// Tool Selector — Filters tools based on classified intent
//
// Returns only tools relevant to the current intent, reducing token usage
// and model confusion. Returns `undefined` when no tool categories are
// specified (model called without tools).
// ---------------------------------------------------------------------------

/**
 * Maps each ToolCategory to the ToolMetadataCategory values it covers.
 */
const TOOL_CATEGORY_MAP: Record<ToolCategory, ToolMetadataCategory[]> = {
  query_tools: ["data_query", "analytics", "knowledge", "customer_lookup"],
  action_tools: ["quote_management", "follow_up_management"],
};

/**
 * Select tools relevant to the classified intent.
 *
 * - Returns `undefined` if no tool categories are specified in the intent result
 * - Filters tools by matching intent triggers and category membership
 * - Logs a warning for any tool category that matches no registered tool
 * - Target: < 50ms
 */
export function selectTools(
  intentResult: IntentResult,
  ctx: AiToolExecutionContext,
): Record<string, Tool> | undefined {
  const { toolCategories, intent } = intentResult;

  // No tool categories means model should be called without tools
  if (!toolCategories || toolCategories.length === 0) {
    return undefined;
  }

  // Gather all available tools from both sources
  const allTools: Record<string, Tool> = {
    ...createDashboardTools(ctx),
    ...createActionTools(ctx),
  };

  // Determine which metadata categories are active based on requested tool categories
  const activeMetadataCategories = new Set<ToolMetadataCategory>();
  for (const tc of toolCategories) {
    const mapped = TOOL_CATEGORY_MAP[tc];
    if (mapped) {
      for (const cat of mapped) {
        activeMetadataCategories.add(cat);
      }
    }
  }

  // Filter tools: include if metadata exists AND (intent matches OR category matches)
  const filtered: Record<string, Tool> = {};
  const matchedCategories = new Set<ToolCategory>();

  for (const toolName of Object.keys(allTools)) {
    const metadata = toolMetadataMap.get(toolName);
    if (!metadata) continue;

    const intentMatches = metadata.intentTriggers.includes(intent);
    const categoryMatches = activeMetadataCategories.has(metadata.category);

    if (intentMatches || categoryMatches) {
      filtered[toolName] = allTools[toolName];

      // Track which tool categories were satisfied
      for (const tc of toolCategories) {
        const mapped = TOOL_CATEGORY_MAP[tc];
        if (mapped && mapped.includes(metadata.category)) {
          matchedCategories.add(tc);
        }
      }
    }
  }

  // Log warning for unmatched tool categories
  for (const tc of toolCategories) {
    if (!matchedCategories.has(tc)) {
      console.warn(
        `[tool-selector] Tool category "${tc}" matched no registered tools for intent "${intent}"`,
      );
    }
  }

  return filtered;
}
