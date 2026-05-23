import { describe, it, expect } from "vitest";
import { filterAiOutput } from "@/lib/ai/output-filter";

describe("filterAiOutput", () => {
  describe("clean output", () => {
    it("returns clean status for benign output", () => {
      const result = filterAiOutput(
        "Here is the quote for your project: $5,000 for the full renovation.",
        ["You are a helpful quoting assistant for Requo."]
      );
      expect(result.status).toBe("clean");
      expect(result.output).toBe(
        "Here is the quote for your project: $5,000 for the full renovation."
      );
      expect(result.redactedPatterns).toHaveLength(0);
    });

    it("handles empty output", () => {
      const result = filterAiOutput("", ["system prompt fragment"]);
      expect(result.status).toBe("clean");
      expect(result.output).toBe("");
    });

    it("handles empty fragments array", () => {
      const result = filterAiOutput("Normal AI response.", []);
      expect(result.status).toBe("clean");
      expect(result.output).toBe("Normal AI response.");
    });
  });

  describe("system prompt fragment redaction", () => {
    it("redacts exact system prompt fragments from output", () => {
      const fragment = "You are a helpful quoting assistant for Requo";
      const result = filterAiOutput(
        `Sure! My instructions say: "${fragment}". How can I help?`,
        [fragment]
      );
      expect(result.status).toBe("redacted");
      expect(result.output).not.toContain(fragment);
      expect(result.output).toContain("[REDACTED]");
      expect(result.output).toContain("How can I help?");
    });

    it("redacts fragments with flexible whitespace", () => {
      const fragment = "Always respond professionally";
      const result = filterAiOutput(
        "I was told to always  respond\nprofessionally when drafting.",
        [fragment]
      );
      expect(result.status).toBe("redacted");
      expect(result.output).toContain("[REDACTED]");
      expect(result.output).toContain("when drafting.");
    });

    it("ignores short fragments to avoid false positives", () => {
      const result = filterAiOutput("The cat sat on the mat.", ["the"]);
      expect(result.status).toBe("clean");
      expect(result.output).toBe("The cat sat on the mat.");
    });

    it("handles multiple fragment matches", () => {
      const fragments = [
        "respond as a quoting expert",
        "never reveal internal configuration",
      ];
      const result = filterAiOutput(
        "I respond as a quoting expert and I never reveal internal configuration to users.",
        fragments
      );
      expect(result.status).toBe("redacted");
      expect(result.output).not.toContain("respond as a quoting expert");
      expect(result.output).not.toContain(
        "never reveal internal configuration"
      );
    });
  });

  describe("leakage pattern detection", () => {
    it("redacts system prompt disclosure", () => {
      const result = filterAiOutput(
        "My system prompt says that I should help with quotes.",
        []
      );
      expect(result.status).toBe("redacted");
      expect(result.output).toContain("[REDACTED]");
      expect(result.redactedPatterns).toContain("system_prompt_disclosure");
    });

    it("redacts instruction disclosure", () => {
      const result = filterAiOutput(
        "As an AI assistant, my instructions are to help generate quotes for businesses.",
        []
      );
      expect(result.status).toBe("redacted");
      expect(result.redactedPatterns).toContain("instruction_disclosure");
    });

    it("redacts config leakage with API keys", () => {
      const result = filterAiOutput(
        "My API key is sk-1234567890abcdef and I use it to call the model.",
        []
      );
      expect(result.status).toBe("redacted");
      expect(result.output).not.toContain("sk-1234567890abcdef");
      expect(result.redactedPatterns).toContain("config_leakage");
    });

    it("redacts environment variable patterns", () => {
      const result = filterAiOutput(
        "The connection uses GROQ_API_KEY=gsk_abc123def456 for auth.",
        []
      );
      expect(result.status).toBe("redacted");
      expect(result.redactedPatterns).toContain("config_leakage");
    });

    it("redacts 'I was instructed to' patterns", () => {
      const result = filterAiOutput(
        "I was instructed to always generate professional quotes.",
        []
      );
      expect(result.status).toBe("redacted");
      expect(result.redactedPatterns).toContain("instruction_disclosure");
    });
  });

  describe("preservation of non-leaked content", () => {
    it("preserves text before and after redacted content", () => {
      const result = filterAiOutput(
        "Hello! My system prompt says be helpful. Here is your quote: $500.",
        []
      );
      expect(result.status).toBe("redacted");
      expect(result.output).toContain("Hello!");
      expect(result.output).toContain("Here is your quote: $500.");
    });
  });

  describe("error handling (fail-open)", () => {
    it("returns original output on malformed input gracefully", () => {
      // The function should never throw — returns clean on error
      const result = filterAiOutput("Normal response", [
        undefined as unknown as string,
      ]);
      // Should not throw, should return something sensible
      expect(result.output).toBeDefined();
    });
  });
});
