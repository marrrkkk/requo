import "server-only";

import type { AiAssistantRequestInput } from "@/features/ai/schemas";
import {
  buildAiAssistantInput,
  buildAiAssistantInstructions,
  getAiAssistantTitle,
  isReplyLikeIntent,
} from "@/features/ai/prompts";
import type {
  AiAssistantResult,
  AiAssistantStreamEvent,
  InquiryAssistantContext,
} from "@/features/ai/types";
import {
  defaultOpenRouterModel,
  getOpenRouterClient,
} from "@/lib/openrouter/client";

const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

type InquiryAssistantChatRequest = {
  model: string;
  title: string;
  instructions: string;
  input: string;
  temperature: number;
  maxOutputTokens: number;
};

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

function getOpenRouterClientOrThrow() {
  const client = getOpenRouterClient();

  if (!client) {
    throw new Error(
      "OpenRouter is not configured yet. Add OPENROUTER_API_KEY to enable the assistant.",
    );
  }

  return client;
}

function createInquiryAssistantChatRequest(input: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}): InquiryAssistantChatRequest {
  return {
    model: defaultOpenRouterModel,
    title: getAiAssistantTitle(input.request.intent),
    instructions: buildAiAssistantInstructions(input.request.intent),
    input: buildAiAssistantInput(input.context, input.request),
    temperature: 0.2,
    maxOutputTokens: getAiAssistantMaxOutputTokens(input.request.intent),
  };
}

function buildChatMessages(request: InquiryAssistantChatRequest) {
  return [
    {
      role: "system" as const,
      content: request.instructions,
    },
    {
      role: "user" as const,
      content: request.input,
    },
  ];
}

async function withRetry<T>(callback: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await callback();
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

function extractTextFromMessageContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          typeof part === "object" &&
          part !== null &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return "";
      })
      .join("");
  }

  return "";
}

function extractTextFromChatResponse(response: {
  choices?: Array<{
    message?: {
      content?: unknown;
      refusal?: string | null;
    };
  }>;
}) {
  const message = response.choices?.[0]?.message;

  if (!message) {
    return "";
  }

  const content = extractTextFromMessageContent(message.content).trim();

  if (content) {
    return content;
  }

  if (typeof message.refusal === "string" && message.refusal.trim()) {
    return message.refusal.trim();
  }

  return "";
}

function extractTextDeltaFromStreamChunk(chunk: {
  choices?: Array<{
    delta?: {
      content?: string | null;
      refusal?: string | null;
    };
  }>;
}) {
  const delta = chunk.choices?.[0]?.delta;

  if (!delta) {
    return "";
  }

  if (typeof delta.content === "string" && delta.content) {
    return delta.content;
  }

  if (typeof delta.refusal === "string" && delta.refusal) {
    return delta.refusal;
  }

  return "";
}

function isChatCompletionTruncated(finishReason: unknown) {
  return finishReason === "length";
}

async function requestInquiryAssistantCompletion(
  request: InquiryAssistantChatRequest,
) {
  const client = getOpenRouterClientOrThrow();

  return withRetry(() =>
    client.chat.send({
      chatGenerationParams: {
        model: request.model,
        messages: buildChatMessages(request),
        temperature: request.temperature,
        maxCompletionTokens: request.maxOutputTokens,
        stream: false,
      },
    }),
  );
}

async function requestInquiryAssistantStream(request: InquiryAssistantChatRequest) {
  const client = getOpenRouterClientOrThrow();

  return withRetry(() =>
    client.chat.send({
      chatGenerationParams: {
        model: request.model,
        messages: buildChatMessages(request),
        temperature: request.temperature,
        maxCompletionTokens: request.maxOutputTokens,
        stream: true,
      },
    }),
  );
}

async function generateTextWithRetry(params: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}) {
  const request = createInquiryAssistantChatRequest(params);
  const response = await requestInquiryAssistantCompletion(request);
  const text = extractTextFromChatResponse(response);

  if (!text.trim()) {
    throw new Error("The AI assistant returned an empty response.");
  }

  return {
    text: text.trim(),
    model: response.model || request.model,
  };
}

export async function* createInquiryAssistantStream(input: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}): AsyncGenerator<AiAssistantStreamEvent> {
  const request = createInquiryAssistantChatRequest(input);

  yield {
    type: "meta",
    title: request.title,
    model: request.model,
  };

  try {
    const stream = await requestInquiryAssistantStream(request);
    let streamedText = "";
    let truncated = false;

    for await (const chunk of stream) {
      if (chunk.error?.message) {
        throw new Error(chunk.error.message);
      }

      const choice = chunk.choices?.[0];

      if (choice && isChatCompletionTruncated(choice.finishReason)) {
        truncated = true;
      }

      const delta = extractTextDeltaFromStreamChunk(chunk);

      if (!delta) {
        continue;
      }

      streamedText += delta;

      yield {
        type: "delta",
        value: delta,
      };
    }

    if (!streamedText.trim()) {
      throw new Error("The AI assistant returned an empty response.");
    }

    yield {
      type: "done",
      truncated,
    };
  } catch (error) {
    yield {
      type: "error",
      message: getErrorMessage(error),
    };
  }
}

export async function generateInquiryAssistantResult(input: {
  context: InquiryAssistantContext;
  request: AiAssistantRequestInput;
}): Promise<AiAssistantResult> {
  const title = getAiAssistantTitle(input.request.intent);
  const { text, model } = await generateTextWithRetry(input);

  return {
    intent: input.request.intent,
    title,
    output: text,
    model,
    canInsertIntoReply: isReplyLikeIntent(input.request.intent),
  };
}
