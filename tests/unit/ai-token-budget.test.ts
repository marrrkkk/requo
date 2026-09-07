import { describe, expect, it } from "vitest";
import {
  compactMessages,
  estimateChatRequestTokens,
  estimateTokens,
  measurePromptOverhead,
} from "@/lib/ai/token-budget";

describe("AI token budgets", () => {
  it("uses a deterministic four-characters-per-token estimate", () => {
    expect(estimateTokens("12345678")).toBe(2);
  });

  it("keeps the opening and recent context while summarizing omitted turns", () => {
    const messages = Array.from({ length: 24 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message ${index} `.repeat(20),
    }));

    const compacted = compactMessages(messages, 400, 8);

    expect(compacted[0]).toEqual(messages[0]);
    expect(compacted.some((message) => message.content.startsWith("Earlier context summary:"))).toBe(true);
    expect(compacted.at(-1)).toEqual(messages.at(-1));
  });

  it("trims on tokens even when the message count is under keep-count", () => {
    // Three large messages under keepMessages=16 but over budget — the old
    // count short-circuit returned these untouched.
    const messages = Array.from({ length: 3 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "x".repeat(8000),
    }));
    const compacted = compactMessages(messages, 1000, 16);
    expect(compacted.length).toBeLessThan(messages.length);
  });

  it("reaches the estimate with a measured overhead figure", () => {
    const messages = [{ content: "hello" }];
    const base = estimateChatRequestTokens(messages, 100);
    const measured = estimateChatRequestTokens(messages, 100, 2800);
    expect(measured - base).toBe(2800 - 250);
  });

  it("measures system prompt plus tool schema overhead", () => {
    const overhead = measurePromptOverhead("system prompt here", {
      search: { description: "search", parameters: { type: "object" } },
    });
    expect(overhead).toBeGreaterThan(estimateTokens("system prompt here"));
  });
});
