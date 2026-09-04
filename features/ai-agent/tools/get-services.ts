/**
 * Get Services Tool
 *
 * Lists available service categories from the inquiry form configuration.
 */

import { tool } from "ai";
import type { ToolExecutionOptions } from "ai";
import { getServicesParamsSchema } from "@/features/ai-agent/schemas";
import type { AgentToolContext } from "@/features/ai-agent/tools/types";
import type { InquiryFormConfig } from "@/features/inquiries/form-config";

export const getServicesTool = tool<Record<string, never>, { services: Array<{ value: string; label: string }> }>({
  description:
    "Get the list of services that the business offers. Use this to understand what service categories are available when helping customers.",
  inputSchema: getServicesParamsSchema,
  execute: async (_params, options: ToolExecutionOptions) => {
    const context = options.experimental_context as AgentToolContext;
    const { business } = context;
    const formConfig = business.inquiryFormConfig as InquiryFormConfig | null | undefined;

    // Extract service categories from project fields in the inquiry form config
    const serviceCategoryField = formConfig?.projectFields?.find(
      (f) => "id" in f && f.id === "serviceCategory",
    );

    if (
      serviceCategoryField &&
      "options" in serviceCategoryField &&
      Array.isArray(serviceCategoryField.options)
    ) {
      return {
        services: (serviceCategoryField.options as Array<{ value: string; label: string }>).map(
          (opt) => ({ value: opt.value, label: opt.label }),
        ),
      };
    }

    return { services: [] };
  },
});
