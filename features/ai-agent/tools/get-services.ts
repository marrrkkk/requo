/**
 * Get Services Tool
 *
 * Lists the business's live services (live, non-archived inquiry forms) so
 * the agent can offer a concrete offering to the prospective customer.
 */

import { and, eq, isNull } from "drizzle-orm";
import { tool } from "ai";
import type { ToolExecutionOptions } from "ai";

import { getServicesParamsSchema } from "@/features/ai-agent/schemas";
import type { AgentToolContext } from "@/features/ai-agent/tools/types";
import { db } from "@/lib/db/client";
import { businessInquiryForms } from "@/lib/db/schema";

export const getServicesTool = tool<
  Record<string, never>,
  {
    services: Array<{
      value: string;
      label: string;
      description?: string;
      highlights?: string[];
      url?: string;
    }>;
  }
>({
  description:
    "Get the list of services that the business offers, including descriptions, highlights, and inquiry URLs. Use this to understand offerings and direct customers.",
  inputSchema: getServicesParamsSchema,
  execute: async (_params, options: ToolExecutionOptions) => {
    const context = options.experimental_context as AgentToolContext;
    const { businessId } = context;

    const rows = await db
      .select({
        name: businessInquiryForms.name,
        slug: businessInquiryForms.slug,
        inquiryPageConfig: businessInquiryForms.inquiryPageConfig,
      })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          isNull(businessInquiryForms.archivedAt),
          eq(businessInquiryForms.publicInquiryEnabled, true),
        ),
      )
      .orderBy(businessInquiryForms.name);

    const businessSlug = context.business?.slug;

    return {
      services: rows.map((row) => {
        const pageConfig = row.inquiryPageConfig;
        const description =
          pageConfig?.description ||
          pageConfig?.headline ||
          undefined;
        const highlights =
          pageConfig?.cards && pageConfig.cards.length > 0
            ? pageConfig.cards.map((c) => c.title)
            : undefined;
        const url = businessSlug
          ? `/inquire/${businessSlug}/${row.slug}`
          : undefined;

        return {
          value: row.slug,
          label: row.name,
          ...(description ? { description } : {}),
          ...(highlights ? { highlights } : {}),
          ...(url ? { url } : {}),
        };
      }),
    };
  },
});
