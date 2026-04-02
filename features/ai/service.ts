import "server-only";

import type { AiAssistantRequestInput } from "@/features/ai/schemas";
import {
  buildAiAssistantInput,
  buildAiAssistantInstructions,
  getAiAssistantTitle,
  isReplyLikeIntent,
} from "@/features/ai/prompts";
import type { AiAssistantResult, InquiryAssistantContext } from "@/features/ai/types";
import {
  defaultOpenRouterModel,
  getOpenRouterClient,
} from "@/lib/openrouter/client";

const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getErrorStatusCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unknown AI request failure.";
}

async function generateTextWithRetry(params: {
  model: string;
  instructions: string;
  input: string;
}) {
  const client = getOpenRouterClient();

  if (!client) {
    throw new Error(
      "OpenRouter is not configured yet. Add OPENROUTER_API_KEY to enable the assistant.",
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = client.callModel({
        model: params.model,
        instructions: params.instructions,
        input: params.input,
        temperature: 0.2,
        maxOutputTokens: 700,
      });

      const text = await result.getText();

      if (!text.trim()) {
        throw new Error("The AI assistant returned an empty response.");
      }

      return text.trim();
    } catch (error) {
      lastError = error;

      const statusCode = getErrorStatusCode(error);
      const isRetryable =
        statusCode !== null && retryableStatusCodes.has(statusCode);

      if (!isRetryable || attempt === 1) {
        break;
      }

      await sleep(400 * (attempt + 1));
    }
  }

  throw new Error(getErrorMessage(lastError));
}

export async function generateInquiryAssistantResult(input: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}): Promise<AiAssistantResult> {
  const model = defaultOpenRouterModel;
  const output = await generateTextWithRetry({
    model,
    instructions: buildAiAssistantInstructions(input.request.intent),
    input: buildAiAssistantInput(input.context, input.request),
  });

  return {
    intent: input.request.intent,
    title: getAiAssistantTitle(input.request.intent),
    output,
    model,
    canInsertIntoReply: isReplyLikeIntent(input.request.intent),
  };
}
