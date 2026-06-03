import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { truncateToolOutput } from "@/lib/ai/tool-truncator";

describe("truncateToolOutput", () => {
  describe("no truncation needed", () => {
    it("returns output unchanged when under 4000 chars", () => {
      const output = "Hello world\nSecond line\n";
      const result = truncateToolOutput(output, false);
      expect(result).toEqual({
        output,
        truncated: false,
        originalLength: output.length,
      });
    });

    it("returns output unchanged when exactly 4000 chars", () => {
      const output = "x".repeat(4000);
      const result = truncateToolOutput(output, false);
      expect(result).toEqual({
        output,
        truncated: false,
        originalLength: 4000,
      });
    });
  });

  describe("error-flagged outputs", () => {
    it("skips truncation for error-flagged outputs regardless of length", () => {
      const output = "E".repeat(10000);
      const result = truncateToolOutput(output, true);
      expect(result).toEqual({
        output,
        truncated: false,
        originalLength: 10000,
      });
    });
  });

  describe("text mode truncation", () => {
    it("truncates at last complete line boundary before 4000 chars", () => {
      // Create output with lines that exceed 4000 chars
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}: ${"a".repeat(50)}`);
      const output = lines.join("\n");
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      expect(result.truncated).toBe(true);
      expect(result.originalLength).toBe(output.length);

      // The truncation note is appended
      expect(result.output).toContain("[truncated — showing first");
      expect(result.output).toContain(`of ${output.length}]`);

      // Content before the note should end at a line boundary
      const noteIndex = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteIndex);
      expect(content.length).toBeLessThanOrEqual(4000);
      // Should not end mid-line (no partial line)
      expect(content).toBe(content.trimEnd() ? content : content);
    });

    it("handles single long line without newlines", () => {
      const output = "x".repeat(5000);
      const result = truncateToolOutput(output, false);
      expect(result.truncated).toBe(true);

      // Should truncate to exactly 4000 chars of content
      const noteStart = result.output.indexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);
      expect(content.length).toBe(4000);
    });

    it("truncation note is excluded from the 4000-char content limit", () => {
      // Create output where the last line boundary is very close to 4000
      // so that content + note definitely exceeds 4000
      // Use lines of exactly 100 chars each (including newline)
      const line = "x".repeat(99); // 99 chars + \n = 100 chars per line
      const lines = Array.from({ length: 50 }, () => line);
      const output = lines.join("\n"); // 50 * 100 - 1 = 4999 chars
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      expect(result.truncated).toBe(true);

      // Content portion is at or below 4000
      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);
      expect(content.length).toBeLessThanOrEqual(4000);

      // The note itself adds characters beyond the content limit
      const note = result.output.slice(noteStart + 1);
      expect(note).toMatch(/^\[truncated — showing first \d+ chars of \d+\]$/);

      // Total output = content + \n + note, which exceeds content alone
      expect(result.output.length).toBeGreaterThan(content.length);
    });
  });

  describe("JSON mode truncation", () => {
    it("detects JSON output starting with {", () => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < 200; i++) {
        obj[`key${i}`] = "a".repeat(30);
      }
      const output = JSON.stringify(obj, null, 2);
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      expect(result.truncated).toBe(true);

      // Extract content before the truncation note
      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);

      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("detects JSON output starting with [", () => {
      const arr = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        name: `Item ${i} with some extra text to fill space`,
      }));
      const output = JSON.stringify(arr, null, 2);
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      expect(result.truncated).toBe(true);

      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);

      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("closes open brackets in nested JSON", () => {
      const nested = {
        data: {
          items: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            values: [1, 2, 3, 4, 5],
            meta: { created: "2024-01-01", tags: ["a", "b"] },
          })),
        },
      };
      const output = JSON.stringify(nested, null, 2);
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);

      // Should be valid JSON (all brackets closed)
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("handles JSON with string values containing special characters", () => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        obj[`key${i}`] = `value with "quotes" and {braces} and [brackets] and \\backslash`;
      }
      const output = JSON.stringify(obj, null, 2);
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);

      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("content portion stays within 4000 chars for JSON", () => {
      const arr = Array.from({ length: 300 }, (_, i) => `item-${i}-${"x".repeat(20)}`);
      const output = JSON.stringify(arr);
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);

      expect(content.length).toBeLessThanOrEqual(4000);
    });
  });

  describe("truncation note format", () => {
    it("includes correct character counts in the note", () => {
      const output = "line\n".repeat(1000);
      const result = truncateToolOutput(output, false);

      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);
      const note = result.output.slice(noteStart + 1);

      expect(note).toBe(
        `[truncated — showing first ${content.length} chars of ${output.length}]`
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = truncateToolOutput("", false);
      expect(result).toEqual({
        output: "",
        truncated: false,
        originalLength: 0,
      });
    });

    it("handles JSON with leading whitespace", () => {
      const arr = Array.from({ length: 2000 }, (_, i) => i);
      const output = "  " + JSON.stringify(arr);
      expect(output.length).toBeGreaterThan(4000);

      const result = truncateToolOutput(output, false);
      expect(result.truncated).toBe(true);
      // Should detect as JSON due to trimStart check
      const noteStart = result.output.lastIndexOf("\n[truncated");
      const content = result.output.slice(0, noteStart);
      // The content starts with whitespace + JSON, brackets should be closed
      expect(content.length).toBeLessThanOrEqual(4000);
    });
  });
});
