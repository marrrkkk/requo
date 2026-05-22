import { describe, it, expect, beforeEach, vi } from "vitest";

import { buildPrompt } from "@/features/ai/orchestrator/prompt-builder";
import { clearCache } from "@/features/ai/orchestrator/prompt-cache";
import type { IntentResult, PromptModuleName } from "@/features/ai/orchestrator/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIntentResult(
  modules: string[] = [],
): IntentResult {
  return {
    intent: "general_question",
    toolCategories: [],
    memoryCategories: [],
    promptModules: modules,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildPrompt", () => {
  beforeEach(() => {
    clearCache();
    vi.restoreAllMocks();
  });

  it("always includes base_identity and safety_constraints even when no modules requested", () => {
    const result = buildPrompt(makeIntentResult([]), null, null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.includedModules).toContain("base_identity");
    expect(result.includedModules).toContain("safety_constraints");
    expect(result.omittedModules).toHaveLength(0);
  });

  it("includes requested modules sorted by priority", () => {
    const result = buildPrompt(
      makeIntentResult(["formatting_rules", "tool_usage_instructions"]),
      null,
      null,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Priority order: base_identity(1), safety_constraints(2), tool_usage_instructions(3), formatting_rules(4)
    expect(result.includedModules).toEqual([
      "base_identity",
      "safety_constraints",
      "tool_usage_instructions",
      "formatting_rules",
    ]);
  });

  it("deduplicates mandatory modules when also present in requested list", () => {
    const result = buildPrompt(
      makeIntentResult(["base_identity", "safety_constraints", "sales_support"]),
      null,
      null,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const baseCount = result.includedModules.filter(
      (m) => m === "base_identity",
    ).length;
    expect(baseCount).toBe(1);
    expect(result.includedModules).toContain("sales_support");
  });

  it("warns and ignores unrecognized module names", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = buildPrompt(
      makeIntentResult(["unknown_module", "formatting_rules"]),
      null,
      null,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unrecognized prompt module"),
    );
    expect(result.includedModules).not.toContain("unknown_module" as PromptModuleName);
    expect(result.includedModules).toContain("formatting_rules");
  });

  it("omits lowest-priority modules when budget is exceeded", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    // Request all modules — some will be omitted due to budget
    const allModules: PromptModuleName[] = [
      "tool_usage_instructions",
      "formatting_rules",
      "quoting_guidance",
      "follow_up_guidance",
      "sales_support",
      "analytics_guidance",
    ];

    const result = buildPrompt(makeIntentResult(allModules), null, null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // All included + omitted should equal the unique set of requested + mandatory
    const total =
      result.includedModules.length + result.omittedModules.length;
    expect(total).toBe(8); // 6 requested + 2 mandatory (deduplicated)

    // Verify budget constraint: estimate tokens of final prompt
    const estimatedTokens = Math.ceil(result.systemPrompt.length / 4);
    expect(estimatedTokens).toBeLessThanOrEqual(1600);

    // If modules were omitted, verify they are the lowest priority ones
    if (result.omittedModules.length > 0) {
      expect(infoSpy).toHaveBeenCalled();
      // Omitted modules should have higher priority numbers (lower priority)
      // than included optional modules
      const includedPriorities = result.includedModules.map(
        (m) => ({ name: m, priority: getPriority(m) }),
      );
      const omittedPriorities = result.omittedModules.map(
        (m) => ({ name: m, priority: getPriority(m) }),
      );

      const maxIncluded = Math.max(...includedPriorities.map((p) => p.priority));
      const minOmitted = Math.min(...omittedPriorities.map((p) => p.priority));
      // All omitted modules should have priority >= some included optional module
      // (since we include in priority order and omit when budget exceeded)
      expect(minOmitted).toBeGreaterThanOrEqual(maxIncluded);
    }
  });

  it("returns error when mandatory modules exceed budget with large additional sections", () => {
    // Create a huge memory context that leaves no room for mandatory modules
    const hugeMemory = "x".repeat(6400); // 6400 chars = 1600 tokens by itself

    const result = buildPrompt(makeIntentResult([]), hugeMemory, null);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain("Mandatory modules");
  });

  it("includes memory context in the final prompt", () => {
    const result = buildPrompt(
      makeIntentResult([]),
      "Customer prefers email contact",
      null,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.systemPrompt).toContain("RELEVANT CONTEXT:");
    expect(result.systemPrompt).toContain("Customer prefers email contact");
  });

  it("includes conversation summary in the final prompt", () => {
    const result = buildPrompt(
      makeIntentResult([]),
      null,
      "Previously discussed pricing for landscaping services",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.systemPrompt).toContain("CONVERSATION SUMMARY:");
    expect(result.systemPrompt).toContain(
      "Previously discussed pricing for landscaping services",
    );
  });

  it("counts memory and summary against the token budget", () => {
    // Large memory + summary should cause some optional modules to be omitted
    const memory = "m".repeat(2000); // ~500 tokens
    const summary = "s".repeat(2000); // ~500 tokens

    const allModules: PromptModuleName[] = [
      "tool_usage_instructions",
      "formatting_rules",
      "quoting_guidance",
      "follow_up_guidance",
      "sales_support",
      "analytics_guidance",
    ];

    const result = buildPrompt(makeIntentResult(allModules), memory, summary);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // With ~1000 tokens used by memory+summary, fewer modules should fit
    expect(result.omittedModules.length).toBeGreaterThan(0);

    // Total prompt (including memory+summary) should still be within budget
    const estimatedTokens = Math.ceil(result.systemPrompt.length / 4);
    expect(estimatedTokens).toBeLessThanOrEqual(1600);
  });

  it("uses prompt cache for rendered segments", () => {
    // Call twice — second should use cache
    const result1 = buildPrompt(makeIntentResult([]), null, null);
    const result2 = buildPrompt(makeIntentResult([]), null, null);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (!result1.ok || !result2.ok) return;

    expect(result1.systemPrompt).toBe(result2.systemPrompt);
  });
});

// Helper to get priority without importing internal constant
function getPriority(moduleName: PromptModuleName): number {
  const priorities: Record<PromptModuleName, number> = {
    base_identity: 1,
    safety_constraints: 2,
    tool_usage_instructions: 3,
    formatting_rules: 4,
    quoting_guidance: 5,
    follow_up_guidance: 6,
    sales_support: 7,
    analytics_guidance: 8,
  };
  return priorities[moduleName];
}
