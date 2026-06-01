import "server-only";

import { stepCountIs, streamText } from "ai";

import { registry } from "@/lib/ai/registry";
import {
  selectModels,
  recordModelUsage,
  markModelExhausted,
} from "@/lib/ai/capacity-selector";
import { isRetryableError } from "@/lib/ai/errors";
import { buildConversationalSystemPrompt } from "@/features/inquiries/public-inquiry-chat-prompt";
import { createInquiryIntakeTools } from "@/features/inquiries/public-inquiry-chat-tools";

import type {
  PublicInquiryChatMessage,
  PublicInquiryChatStreamEvent,
  PublicInquiryChatExtractedFields,
} from "@/features/inquiries/public-inquiry-chat-schemas";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";

// ---------------------------------------------------------------------------
// Public Inquiry Chat — Service
//
// Orchestrates the conversational inquiry flow with tool-use. The AI
// assistant uses structured tools (validate_contact, confirm_details,
// submit_inquiry) to reliably collect inquiry data instead of relying
// solely on parsing a JSON block from freeform text.
// ---------------------------------------------------------------------------

type CreatePublicInquiryChatStreamInput = {
  business: PublicInquiryBusiness;
  messages: PublicInquiryChatMessage[];
};

/**
 * Creates an async generator that yields SSE events for the conversational
 * inquiry chat. Uses Vercel AI SDK's `streamText` with tools for structured
 * data collection.
 */
export async function* createPublicInquiryChatStream({
  business,
  messages,
}: CreatePublicInquiryChatStreamInput): AsyncGenerator<PublicInquiryChatStreamEvent> {
  const systemPrompt = buildConversationalSystemPrompt({
    businessName: business.name,
    businessDescription: business.shortDescription,
    formConfig: business.inquiryFormConfig,
    openingMessage:
      business.inquiryFormConfig.conversationalMode?.openingMessage,
    assistantName:
      business.inquiryFormConfig.conversationalMode?.assistantName ||
      `${business.name} Assistant`,
  });

  const tools = createInquiryIntakeTools(business.inquiryFormConfig);

  // Select tool-capable models
  const modelIds = await selectModels({
    needsTools: true,
    minQuality: 4,
  });

  if (modelIds.length === 0) {
    yield {
      type: "error",
      message: "No AI providers available. Please try again later.",
    };
    return;
  }

  const aiMessages = messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  let extracted: PublicInquiryChatExtractedFields | null = null;
  let succeeded = false;

  // Debug: log the conversation length and last message
  console.info(
    `[inquiry-chat-service] Starting stream: business="${business.slug}" messages=${messages.length} lastRole="${messages[messages.length - 1]?.role ?? "none"}" model-candidates=${modelIds.length}`,
  );

  for (const modelId of modelIds) {
    const startTime = Date.now();
    try {
      console.info(`[inquiry-chat-service] Trying model="${modelId}"`);

      const result = streamText({
        model: registry.languageModel(modelId),
        system: systemPrompt,
        messages: aiMessages,
        tools,
        stopWhen: stepCountIs(1), // Single tool call (submit_inquiry) at the end
        temperature: 0.5,
        maxOutputTokens: 1024,
        abortSignal: AbortSignal.timeout(25_000),
      });

      let fullContent = "";

      // Stream text deltas to the client (textStream handles tool rounds internally)
      for await (const chunk of result.textStream) {
        if (chunk) {
          fullContent += chunk;
          yield { type: "delta", value: chunk };
        }
      }

      // After streaming completes, check tool results for structured extraction
      const steps = await result.steps;
      console.info(
        `[inquiry-chat-service] Stream complete: model="${modelId}" steps=${steps.length} contentLength=${fullContent.length} toolCalls=${steps.reduce((n, s) => n + (s.toolResults?.length ?? 0), 0)}`,
      );

      for (const step of steps) {
        if (!step.toolResults) continue;
        for (const toolResult of step.toolResults) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tr = toolResult as any;
          if (
            tr.toolName === "submit_inquiry" &&
            tr.result &&
            typeof tr.result === "object" &&
            "success" in tr.result &&
            tr.result.success &&
            "fields" in tr.result
          ) {
            extracted = tr.result.fields as PublicInquiryChatExtractedFields;
          }
        }
      }

      // If tool-based extraction didn't fire, return null (no regex fallback)
      // Requirement 29: only the reliable tool-based extraction path is used

      // Emit debug info
      const [providerPrefix, ...modelParts] = modelId.split(":");
      const providerName = providerPrefix === "google" ? "gemini" : providerPrefix;
      const modelName = modelParts.join(":");
      const latencyMs = Date.now() - startTime;
      const usage = await result.usage;
      const toolCallNames: Array<{ name: string }> = [];
      for (const step of steps) {
        if (step.toolResults) {
          for (const tr of step.toolResults) {
            toolCallNames.push({ name: tr.toolName });
          }
        }
      }

      yield {
        type: "debug",
        info: {
          model: modelName,
          provider: providerName,
          latencyMs,
          inputTokens: usage?.inputTokens ?? undefined,
          outputTokens: usage?.outputTokens ?? undefined,
          totalTokens: usage?.totalTokens ?? undefined,
          steps: steps.length,
          toolCalls: toolCallNames.length > 0 ? toolCallNames : undefined,
        },
      };

      await recordModelUsage(modelId);
      succeeded = true;
      break;
    } catch (error) {
      console.warn(
        `[inquiry-chat-service] Failed with model="${modelId}":`,
        error instanceof Error ? error.message : error,
      );

      if (!isRetryableError(error)) {
        // Non-retryable — stop trying
        break;
      }

      await markModelExhausted(modelId);
      // Continue to next model
    }
  }

  if (!succeeded) {
    yield {
      type: "error",
      message:
        "The assistant could not respond right now. Please try again in a moment.",
    };
    return;
  }

  yield { type: "done", extracted };
}
