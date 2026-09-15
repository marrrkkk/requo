/**
 * Single model-facing seam for conversational surface tests.
 *
 * A `MockLanguageModelV3` from the AI SDK's own test utilities stands in at
 * the provider boundary. Everything above it is real: the route handler, the
 * orchestrator, session and message services, tool execution, and the test
 * database. The mock can be scripted to emit text, a tool call, or a tool
 * call followed by text, which makes multi-step tool behaviour testable.
 *
 * Usage:
 *   const model = mockModelForTurns([textTurn("Hello")]);
 *   vi.mocked(registry.languageModel).mockReturnValue(model);
 *   // drive through the route handler, consume the full response body,
 *   // then assert rows + `model.doStreamCalls[0]` (the prompt the model saw).
 */

import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";

type MockModelInit = NonNullable<
  ConstructorParameters<typeof MockLanguageModelV3>[0]
>;

function usage() {
  return {
    inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 8, text: 8, reasoning: undefined },
  };
}

/** A single assistant-text turn. */
export function textTurn(text: string) {
  return {
    stream: simulateReadableStream({
      chunks: [
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: text },
        { type: "text-end", id: "text-1" },
        {
          type: "finish",
          finishReason: { unified: "stop", raw: undefined },
          logprobs: undefined,
          usage: usage(),
        },
      ],
    }),
  };
}

/** A turn that emits one tool call (followed by a finish for the tool step). */
export function toolCallTurn(
  toolName: string,
  toolCallId: string,
  input: unknown,
) {
  const inputJson = JSON.stringify(input);
  return {
    stream: simulateReadableStream({
      chunks: [
        { type: "tool-input-start", id: toolCallId, toolName },
        { type: "tool-input-delta", id: toolCallId, delta: inputJson },
        { type: "tool-input-end", id: toolCallId },
        // AI SDK v6 requires the assembled tool call as its own part; the
        // `tool-input-*` parts alone stream the arguments for the UI and do not
        // cause the SDK to execute the tool.
        { type: "tool-call", toolCallId, toolName, input: inputJson },
        {
          type: "finish",
          // `tool-calls` (plural) is the v6 unified reason; the singular form
          // makes the SDK treat the turn as terminal and skip tool execution.
          finishReason: { unified: "tool-calls", raw: undefined },
          logprobs: undefined,
          usage: usage(),
        },
      ],
    }),
  };
}

/**
 * Build a mock model scripted for a sequence of steps. Accepts any mix of
 * `textTurn(...)` / `toolCallTurn(...)` results; the mock serves one entry
 * per model call in order.
 */
export function mockModelForTurns(
  turns: Array<ReturnType<typeof textTurn> | ReturnType<typeof toolCallTurn>>,
) {
  return new MockLanguageModelV3({
    provider: "mock",
    modelId: "mock-model",
    doStream: turns as unknown as MockModelInit["doStream"],
  });
}

/** Read a UI message stream response fully (required for onFinish persistence). */
export async function readStreamText(response: Response): Promise<string> {
  return response.text();
}

/**
 * AI SDK v6 delivers the prompt as a single `prompt` array of typed messages:
 * `{ role: 'system', content: string }` and role messages whose content is an
 * array of parts. The pre-v6 `system` / `messages` fields no longer exist, so
 * this normalizer flattens the prompt back into the readable shape tests
 * assert on while still exposing the raw `prompt` for serialized checks.
 */
type RecordedPromptMessage = { role?: string; content?: unknown };

type RecordedModelCall = {
  system: string | undefined;
  messages: Array<{ role: string; content: string }>;
  prompt: RecordedPromptMessage[] | undefined;
};

/** Flatten a prompt message's content (string, or part array) to text. */
function promptMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && "text" in part
          ? String((part as { text: unknown }).text)
          : "",
      )
      .join("");
  }
  return "";
}

/** Extract the model-call prompt from the mock for content assertions. */
export function firstModelCall(model: MockLanguageModelV3): RecordedModelCall {
  const call = model.doStreamCalls[0] as unknown as {
    prompt?: RecordedPromptMessage[];
    system?: unknown;
    messages?: unknown;
  };
  const prompt = Array.isArray(call?.prompt) ? call.prompt : undefined;

  if (!prompt) {
    // Defensive fallback for a pre-v6 call shape. The current SDK never hits
    // this, but tests should fail on assertions rather than property access.
    return {
      system: call?.system as string | undefined,
      messages: (call?.messages as Array<{ role: string; content: string }>) ?? [],
      prompt: undefined,
    };
  }

  const systemMessage = prompt.find((message) => message?.role === "system");

  return {
    system: systemMessage ? promptMessageText(systemMessage.content) : undefined,
    messages: prompt
      .filter((message) => message?.role !== "system")
      .map((message) => ({
        role: String(message?.role ?? ""),
        content: promptMessageText(message?.content),
      })),
    prompt,
  };
}
