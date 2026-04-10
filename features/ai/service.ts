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

function getAiAssistantMaxOutputTokens(intent: AiAssistantRequestInput["intent"]) {
  switch (intent) {
    case "custom":
    case "rewrite-draft":
      return 1800;
    case "draft-first-reply":
    case "generate-follow-up-message":
      return 1400;
    case "summarize-inquiry":
    case "suggest-follow-up-questions":
    case "suggest-quote-line-items":
      return 1100;
  }
}

function isOutputTruncated(response: {
  status?: string | null;
  incompleteDetails?: { reason?: string | null } | null;
}) {
  return (
    response.status === "incomplete" &&
    response.incompleteDetails?.reason === "max_output_tokens"
  );
}

function createInquiryAssistantModelResult(input: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}) {
  const client = getOpenRouterClient();

  if (!client) {
    throw new Error(
      "OpenRouter is not configured yet. Add OPENROUTER_API_KEY to enable the assistant.",
    );
  }

  const model = defaultOpenRouterModel;
  const title = getAiAssistantTitle(input.request.intent);
  const result = client.callModel({
    model,
    instructions: buildAiAssistantInstructions(input.request.intent),
    input: buildAiAssistantInput(input.context, input.request),
    temperature: 0.2,
    maxOutputTokens: getAiAssistantMaxOutputTokens(input.request.intent),
  });

  return {
    model,
    title,
    result,
  };
}

async function generateTextWithRetry(params: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { result } = createInquiryAssistantModelResult(params);
      const [text, response] = await Promise.all([
        result.getText(),
        result.getResponse(),
      ]);

      if (!text.trim()) {
        throw new Error("The AI assistant returned an empty response.");
      }

      return {
        text: text.trim(),
        truncated: isOutputTruncated(response),
      };
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

export function createInquiryAssistantStream(input: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}) {
  return createInquiryAssistantModelResult(input);
}

export function isInquiryAssistantStreamTruncated(response: {
  status?: string | null;
  incompleteDetails?: { reason?: string | null } | null;
}) {
  return isOutputTruncated(response);
}

export async function generateInquiryAssistantResult(input: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}): Promise<AiAssistantResult> {
  const model = defaultOpenRouterModel;
  const title = getAiAssistantTitle(input.request.intent);
  const { text } = await generateTextWithRetry(input);

  return {
    intent: input.request.intent,
    title,
    output: text,
    model,
    canInsertIntoReply: isReplyLikeIntent(input.request.intent),
  };
}
