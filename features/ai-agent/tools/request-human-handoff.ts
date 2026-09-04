/**
 * Request Human Handoff Tool
 *
 * Files an Inquiry carrying the details the customer actually provided
 * (through the shared handoff submission path, flagged as escalated) and
 * marks the session as requiring human assistance.
 */

import { tool } from "ai";
import type { ToolExecutionOptions } from "ai";
import { z } from "zod";
import { requestHumanHandoffParamsSchema } from "@/features/ai-agent/schemas";
import type { AgentToolContext } from "@/features/ai-agent/tools/types";
import { requestSessionHandoff } from "@/features/ai-agent/session-service";
import { createAgentHandoffSubmission } from "@/features/inquiries/mutations";

type RequestHandoffInput = z.infer<typeof requestHumanHandoffParamsSchema>;

export const requestHumanHandoffTool = tool<RequestHandoffInput, { handoffRequested: boolean; message: string }>({
  description:
    "Request human assistance when you cannot help the customer. Use this when: (1) you've searched for information multiple times without finding an answer, (2) the customer explicitly asks to speak with a person, or (3) the request is outside your capabilities.",
  inputSchema: requestHumanHandoffParamsSchema,
  execute: async (params, options: ToolExecutionOptions) => {
    const context = options.experimental_context as AgentToolContext;

    try {
      const { business, sessionId, state } = context;
      const values = state.values;

      // Carry what the customer actually provided — never placeholders.
      // When the name is genuinely unknown, say who it is (a chat visitor)
      // rather than filing "Unknown" as if it were their name.
      const customerName =
        values.customerName ??
        values.customerContactHandle ??
        values.customerEmail ??
        "Chat visitor";
      const contactMethod = values.customerContactMethod ?? "chat";
      const contactHandle =
        values.customerContactHandle ?? values.customerEmail ?? "";

      const collectedBits = [
        values.serviceCategory ? `Service: ${values.serviceCategory}` : null,
        values.details ? `Details: ${values.details}` : null,
        params.customerMessage ? `Customer message: ${params.customerMessage}` : null,
      ].filter(Boolean);

      const details =
        collectedBits.length > 0
          ? [`Handoff reason: ${params.reason}`, ...collectedBits].join("\n")
          : `Handoff reason: ${params.reason}\nCustomer requested human assistance during the chat.`;

      await createAgentHandoffSubmission({
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
        },
        submission: {
          customerName,
          customerEmail: values.customerEmail ?? null,
          customerContactMethod: contactMethod,
          customerContactHandle: contactHandle,
          serviceCategory: values.serviceCategory ?? "General Inquiry",
          details,
          submittedFieldSnapshot: {
            version: 1,
            businessType: "general_project_services",
            fields: [
              {
                id: "agent-handoff",
                label: "Handoff reason",
                value: params.reason,
                displayValue: params.reason,
              },
            ],
          },
        },
        sessionId,
      });

      // Mark session as handoff
      await requestSessionHandoff({
        sessionId,
        reason: params.reason,
        recommendation: params.customerMessage
          ? `Customer message: ${params.customerMessage}`
          : undefined,
      });

      return {
        handoffRequested: true,
        message:
          "I've notified the team that you need assistance. Someone will reach out to you shortly to help with your request.",
      };
    } catch (error) {
      console.error("Request handoff tool error:", error);
      throw new Error(
        "Failed to request human assistance. Please contact us directly.",
      );
    }
  },
});
