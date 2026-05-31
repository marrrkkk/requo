import type { LanguageModelMiddleware } from "ai";

/**
 * Middleware that strips reasoning parts from assistant messages before
 * sending to providers that don't support them (e.g., Cerebras).
 *
 * During multi-step tool calling, some models include reasoning in their
 * responses. The AI SDK preserves this in step messages. When fallback
 * models or providers that reject `reasoning_content` receive these
 * messages, they error. This middleware removes reasoning parts cleanly.
 */
export const stripReasoningMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  transformParams: async ({ params }) => {
    // params.prompt is LanguageModelV3Prompt = Array<LanguageModelV3Message>
    const filteredPrompt = params.prompt.map((message) => {
      if (message.role === "assistant" && Array.isArray(message.content)) {
        return {
          ...message,
          content: message.content.filter(
            (part) => part.type !== "reasoning",
          ),
        };
      }
      return message;
    });

    return {
      ...params,
      prompt: filteredPrompt,
    };
  },
};
