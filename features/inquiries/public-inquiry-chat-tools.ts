import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { InquiryFormConfig } from "@/features/inquiries/form-config";

// ---------------------------------------------------------------------------
// Public Inquiry Chat — Tools
//
// Vercel AI SDK tools that give the intake assistant structured capabilities:
// 1. submit_inquiry — called when all required fields are gathered
// 2. validate_contact — validates contact format before asking for confirmation
// 3. get_service_info — provides business service context
//
// These tools make the AI's data collection more reliable than relying on
// a raw JSON extraction block in the response text.
// ---------------------------------------------------------------------------

/**
 * Creates tools for the public inquiry intake assistant.
 * Only the submit_inquiry tool is exposed — validation and confirmation
 * are handled conversationally to avoid multi-turn tool state issues
 * (the API is stateless, tool results aren't persisted between requests).
 */
export function createInquiryIntakeTools(formConfig: InquiryFormConfig) {
  // Build dynamic custom field schema from form config
  const customFieldIds = formConfig.projectFields
    .filter((f) => f.kind === "custom")
    .map((f) => f.id);

  return {
    submit_inquiry: tool({
      description:
        "Submit the collected inquiry data. Call this ONLY when ALL required fields have been collected and the customer has confirmed. This finalizes the inquiry.",
      inputSchema: z.object({
        customerName: z
          .string()
          .min(1)
          .describe("Customer's full name."),
        customerContactMethod: z
          .enum(["email", "phone", "whatsapp", "instagram", "facebook", "x", "linkedin", "other"])
          .describe("How the customer wants to be contacted."),
        customerContactHandle: z
          .string()
          .min(1)
          .describe("The contact detail matching the method (email, phone number, handle)."),
        serviceCategory: z
          .string()
          .min(1)
          .describe("The type of service or project the customer needs."),
        details: z
          .string()
          .min(10)
          .describe(
            "A comprehensive summary of the customer's request. Combine all details they shared into a clear, well-written description.",
          ),
        requestedDeadline: z
          .string()
          .optional()
          .describe("Requested deadline in YYYY-MM-DD format, if provided."),
        budgetText: z
          .string()
          .optional()
          .describe("Budget amount or range, if provided."),
        customFields: z
          .record(z.string(), z.union([z.string(), z.array(z.string()), z.boolean()]))
          .optional()
          .describe(
            `Custom field values keyed by field ID. Valid IDs: ${customFieldIds.join(", ") || "none"}`,
          ),
      }),
      execute: async (fields) => {
        // The tool doesn't actually submit — it returns the validated data
        // so the service layer can emit it as extracted fields.
        return {
          success: true,
          message: "Inquiry data collected successfully.",
          fields,
        };
      },
    }),
  };
}
