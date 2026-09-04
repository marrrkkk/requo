/**
 * Get Quote Stats Tool
 */

import { tool } from "ai";
import type { ToolExecutionOptions } from "ai";
import { z } from "zod";
import { getQuoteStatsSchema } from "../schemas";
import { getQuoteStatsQuery } from "../queries";
import { centsToDollars } from "../permissions";
import type { ErrorResult, ToolExecutionContext } from "../types";

type GetQuoteStatsInput = z.infer<typeof getQuoteStatsSchema>;

type StatEntry = {
  label: string;
  value: string | number;
  format?: "number" | "currency" | "percent";
  currency?: string;
};

type GetQuoteStatsOutput =
  | {
      type: "stats_summary";
      data: { stats: StatEntry[] };
      summary: string;
    }
  | ErrorResult;

export const getQuoteStatsTool = tool<GetQuoteStatsInput, GetQuoteStatsOutput>({
  description:
    "Get aggregate statistics about quotes including pipeline value, acceptance rate, and average quote value. Money values are in dollars. Archived and deleted quotes are excluded.",
  inputSchema: getQuoteStatsSchema,
  execute: async (params: GetQuoteStatsInput, options: ToolExecutionOptions) => {
    const context = options.experimental_context as ToolExecutionContext;

    try {
      const stats = await getQuoteStatsQuery(context.businessId, params);
      const pipelineDollars = centsToDollars(stats.pipelineValue);
      const acceptedDollars = centsToDollars(stats.acceptedValue);
      const averageDollars = centsToDollars(stats.averageQuoteValue);

      const statusBreakdown = Object.entries(stats.byStatus)
        .map(([status, count]) => `${count} ${status}`)
        .join(", ");

      const pipelineText =
        pipelineDollars > 0
          ? ` Pipeline value: $${pipelineDollars.toLocaleString()}.`
          : "";
      const acceptanceText =
        Number(stats.acceptanceRate) > 0
          ? ` Acceptance rate: ${Number(stats.acceptanceRate).toFixed(1)}%.`
          : "";

      return {
        type: "stats_summary",
        data: {
          stats: [
            { label: "Total quotes", value: Number(stats.total) },
            ...Object.entries(stats.byStatus).map(([status, count]) => ({
              label: status,
              value: Number(count),
            })),
            {
              label: "Pipeline value",
              value: pipelineDollars,
              format: "currency" as const,
              currency: "USD",
            },
            {
              label: "Accepted value",
              value: acceptedDollars,
              format: "currency" as const,
              currency: "USD",
            },
            {
              label: "Average quote",
              value: averageDollars,
              format: "currency" as const,
              currency: "USD",
            },
            {
              label: "Acceptance rate",
              value: Number(stats.acceptanceRate),
              format: "percent" as const,
            },
            {
              label: "View rate",
              value: Number(stats.viewRate),
              format: "percent" as const,
            },
          ],
        },
        summary: `You have ${stats.total} quotes: ${statusBreakdown}.${pipelineText}${acceptanceText}`,
      };
    } catch (error) {
      return {
        type: "error",
        error: "INTERNAL_ERROR",
        message: "Failed to get quote statistics",
        summary: "An error occurred while calculating quote statistics",
        details: error instanceof Error ? error.message : "Unknown error",
        retryable: true,
      };
    }
  },
});
