import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { AiChatMessage } from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGenerateWithFallback = vi.fn();

vi.mock("@/lib/ai/router", () => ({
  generateWithFallback: (...args: unknown[]) => mockGenerateWithFallback(...args),
}));

// Import after mocks
import {
  summarizeConversation,
  summarizeDroppedMessages,
} from "@/lib/ai/history-summarizer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessages(count: number): AiChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Message ${i + 1} content about topic ${i}`,
  })) as AiChatMessage[];
}

// ---------------------------------------------------------------------------
// Tests — summarizeConversation
// ---------------------------------------------------------------------------

describe("summarizeConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses heuristic for conversations with 12 or fewer messages", async () => {
    const messages = makeMessages(12);

    const result = await summarizeConversation(messages);

    expect(mockGenerateWithFallback).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
    // Should match heuristic output
    expect(result).toBe(summarizeDroppedMessages(messages));
  });

  it("uses heuristic for empty messages", async () => {
    const result = await summarizeConversation([]);

    expect(mockGenerateWithFallback).not.toHaveBeenCalled();
    expect(result).toBe("");
  });

  it("calls AI model for conversations exceeding 12 messages", async () => {
    mockGenerateWithFallback.mockResolvedValueOnce({
      text: "User asked about pricing. Assistant provided Q-001 quote details. User accepted the quote.",
      provider: "groq",
      model: "test-model",
    });

    const messages = makeMessages(15);
    const result = await summarizeConversation(messages);

    expect(mockGenerateWithFallback).toHaveBeenCalledOnce();
    expect(result).toBe(
      "User asked about pricing. Assistant provided Q-001 quote details. User accepted the quote.",
    );
  });

  it("uses cheap quality tier with 128 max output tokens", async () => {
    mockGenerateWithFallback.mockResolvedValueOnce({
      text: "Summary text",
      provider: "groq",
      model: "test-model",
    });

    const messages = makeMessages(15);
    await summarizeConversation(messages);

    expect(mockGenerateWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        qualityTier: "cheap",
        maxOutputTokens: 128,
      }),
    );
  });

  it("sends a system prompt requesting chronological summary", async () => {
    mockGenerateWithFallback.mockResolvedValueOnce({
      text: "Summary",
      provider: "groq",
      model: "test-model",
    });

    const messages = makeMessages(15);
    await summarizeConversation(messages);

    const callArgs = mockGenerateWithFallback.mock.calls[0][0];
    const systemMessage = callArgs.messages.find(
      (m: AiChatMessage) => m.role === "system",
    );
    expect(systemMessage?.content).toContain("chronological order");
    expect(systemMessage?.content).toContain("key events");
    expect(systemMessage?.content).toContain("decisions");
  });

  it("falls back to heuristic when AI call throws an error", async () => {
    mockGenerateWithFallback.mockRejectedValueOnce(
      new Error("All AI providers failed."),
    );

    const messages = makeMessages(15);
    const result = await summarizeConversation(messages);

    // Should still return a valid summary (from heuristic)
    expect(result).toBeTruthy();
    expect(result).toBe(summarizeDroppedMessages(messages));
  });

  it("falls back to heuristic when AI call times out (2s)", async () => {
    // Simulate a slow AI call that never resolves within 2s
    mockGenerateWithFallback.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ text: "Late response" }), 5_000)),
    );

    const messages = makeMessages(15);
    const resultPromise = summarizeConversation(messages);

    // Advance past the 2s timeout
    await vi.advanceTimersByTimeAsync(2_100);

    const result = await resultPromise;

    // Should fall back to heuristic
    expect(result).toBe(summarizeDroppedMessages(messages));
  });

  it("falls back to heuristic when AI returns empty text", async () => {
    mockGenerateWithFallback.mockResolvedValueOnce({
      text: "",
      provider: "groq",
      model: "test-model",
    });

    const messages = makeMessages(15);
    const result = await summarizeConversation(messages);

    expect(result).toBe(summarizeDroppedMessages(messages));
  });

  it("falls back to heuristic when AI returns whitespace-only text", async () => {
    mockGenerateWithFallback.mockResolvedValueOnce({
      text: "   \n  ",
      provider: "groq",
      model: "test-model",
    });

    const messages = makeMessages(15);
    const result = await summarizeConversation(messages);

    expect(result).toBe(summarizeDroppedMessages(messages));
  });

  it("trims whitespace from AI summary", async () => {
    mockGenerateWithFallback.mockResolvedValueOnce({
      text: "  Summary with spaces  \n",
      provider: "groq",
      model: "test-model",
    });

    const messages = makeMessages(15);
    const result = await summarizeConversation(messages);

    expect(result).toBe("Summary with spaces");
  });

  it("limits conversation text to 3000 characters for the AI call", async () => {
    mockGenerateWithFallback.mockResolvedValueOnce({
      text: "Summary of long conversation",
      provider: "groq",
      model: "test-model",
    });

    // Create messages with very long content
    const messages: AiChatMessage[] = Array.from({ length: 15 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: "x".repeat(500),
    }));

    await summarizeConversation(messages);

    const callArgs = mockGenerateWithFallback.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: AiChatMessage) => m.role === "user",
    );
    // The conversation text should be capped at 3000 chars
    expect(userMessage?.content.length).toBeLessThanOrEqual(3000);
  });
});

// ---------------------------------------------------------------------------
// Tests — summarizeDroppedMessages (heuristic)
// ---------------------------------------------------------------------------

describe("summarizeDroppedMessages", () => {
  it("returns empty string for empty messages", () => {
    expect(summarizeDroppedMessages([])).toBe("");
  });

  it("includes message count in output", () => {
    const messages = makeMessages(5);
    const result = summarizeDroppedMessages(messages);
    expect(result).toContain("[5 earlier messages omitted]");
  });

  it("extracts topics from user messages", () => {
    const messages: AiChatMessage[] = [
      { role: "user", content: "Tell me about pricing for landscaping services" },
      { role: "assistant", content: "Here are the pricing details." },
      { role: "user", content: "What about pricing for the premium landscaping package?" },
    ];

    const result = summarizeDroppedMessages(messages);
    expect(result).toContain("Topics discussed:");
    expect(result.toLowerCase()).toContain("pricing");
  });

  it("extracts quote number entities", () => {
    const messages: AiChatMessage[] = [
      { role: "user", content: "Show me quote Q-1234" },
      { role: "assistant", content: "Here is quote Q-1234 for $500.00" },
    ];

    const result = summarizeDroppedMessages(messages);
    expect(result).toContain("Q-1234");
  });

  it("extracts dollar amounts", () => {
    const messages: AiChatMessage[] = [
      { role: "user", content: "The total was $1,500.00" },
      { role: "assistant", content: "Confirmed." },
    ];

    const result = summarizeDroppedMessages(messages);
    expect(result).toContain("$1,500.00");
  });

  it("extracts key points from assistant messages", () => {
    const messages: AiChatMessage[] = [
      { role: "user", content: "What is the status?" },
      { role: "assistant", content: "The quote has been sent to the client. They should receive it shortly." },
    ];

    const result = summarizeDroppedMessages(messages);
    expect(result).toContain("Key points:");
  });
});
