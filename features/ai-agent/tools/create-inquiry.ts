/**
 * Create Inquiry Tool
 *
 * Creates a qualified inquiry from collected customer information through the
 * shared submission path (`createAgentInquirySubmission`), preserving
 * AI attribution. On success the session is marked completed and its
 * qualification state is advanced to fully collected.
 */

import { tool } from "ai";
import type { ToolExecutionOptions } from "ai";
import { z } from "zod";
import { createInquiryParamsSchema } from "@/features/ai-agent/schemas";
import type { AgentToolContext } from "@/features/ai-agent/tools/types";
import {
  completeSession,
  updateSessionState,
  REQUIRED_QUALIFICATION_FIELDS,
} from "@/features/ai-agent/session-service";
import { createAgentInquirySubmission } from "@/features/inquiries/mutations";

type CreateInquiryInput = z.infer<typeof createInquiryParamsSchema>;

export const createInquiryTool = tool<CreateInquiryInput, { inquiryId: string; message: string }>({
  description:
    "Create an inquiry when you have collected all required information from the customer: name, contact method and handle, service category, and project details. Only call this when you have complete information.",
  inputSchema: createInquiryParamsSchema,
  execute: async (params, options: ToolExecutionOptions) => {
    const context = options.experimental_context as AgentToolContext;

    try {
      const { business, sessionId, state } = context;

      const { inquiryId } = await createAgentInquirySubmission({
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
        },
        submission: {
          customerName: params.customerName,
          customerEmail: params.customerEmail ?? null,
          customerContactMethod: params.customerContactMethod,
          customerContactHandle: params.customerContactHandle,
          serviceCategory: params.serviceCategory,
          requestedDeadline: params.requestedDeadline,
          budgetText: params.budgetText,
          details: params.details,
          submittedFieldSnapshot: {
            version: 1,
            businessType: "general_project_services",
            fields: [
              {
                id: "agent-collected",
                label: "Collected by",
                value: "Public chat",
                displayValue: "Public chat",
              },
            ],
          },
        },
        sessionId,
      });

      // Advance qualification: everything is now collected.
      const collected: Record<string, boolean> = { ...state.collected };
      for (const field of REQUIRED_QUALIFICATION_FIELDS) {
        collected[field] = true;
      }
      await updateSessionState({
        sessionId,
        state: {
          collected,
          values: {
            ...state.values,
            customerName: params.customerName,
            customerEmail: params.customerEmail ?? null,
            customerContactMethod: params.customerContactMethod,
            customerContactHandle: params.customerContactHandle,
            serviceCategory: params.serviceCategory,
            details: params.details,
          },
          missing: [],
        },
      });

      // A completed session must never be swept up as abandoned.
      await completeSession({ sessionId, inquiryId });

      return {
        inquiryId,
        message: `Your inquiry has been successfully submitted! We'll review your request for ${params.serviceCategory} and get back to you soon. Is there anything else I can help you with?`,
      };
    } catch (error) {
      console.error("Create inquiry tool error:", error);
      throw new Error(
        "Failed to create inquiry. Please try again or contact us directly.",
      );
    }
  },
});
