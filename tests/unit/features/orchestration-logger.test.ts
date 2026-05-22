import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createTimer, logOrchestration } from "@/features/ai/orchestrator/orchestration-logger";
import type { OrchestrationLogEntry } from "@/features/ai/orchestrator/types";

// Mock external dependencies
vi.mock("@/lib/ai", () => ({
  logAiInvocation: vi.fn().mockResolvedValue({ id: "atl_mock" }),
  recordUsage: vi.fn().mockResolvedValue(undefined),
}));

import { logAiInvocation, recordUsage } from "@/lib/ai";

// ---------------------------------------------------------------------------
// createTimer
// ---------------------------------------------------------------------------

describe("createTimer", () => {
  it("returns an object with an elapsed() method", () => {
    const timer = createTimer();
    expect(timer).toHaveProperty("elapsed");
    expect(typeof timer.elapsed).toBe("function");
  });

  it("returns elapsed milliseconds as a rounded integer", async () => {
    const timer = createTimer();
    // Wait a small amount
    await new Promise((resolve) => setTimeout(resolve, 50));
    const ms = timer.elapsed();
    expect(Number.isInteger(ms)).toBe(true);
    expect(ms).toBeGreaterThanOrEqual(40); // allow for timing variance
    expect(ms).toBeLessThan(200);
  });

  it("returns increasing values on subsequent calls", async () => {
    const timer = createTimer();
    const first = timer.elapsed();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = timer.elapsed();
    expect(second).toBeGreaterThanOrEqual(first);
  });
});

// ---------------------------------------------------------------------------
// logOrchestration
// ---------------------------------------------------------------------------

describe("logOrchestration", () => {
  const baseEntry: OrchestrationLogEntry = {
    conversationId: "conv_123",
    userId: "user_456",
    businessId: "biz_789",
    intentCategory: "data_query",
    promptModulesIncluded: ["base_identity", "safety_constraints"],
    promptModulesOmitted: ["analytics_guidance"],
    totalPromptTokens: 200,
    toolsInjectedCount: 3,
    memoryEntriesRetrieved: 2,
    memoryRetrievalMs: 120,
    intentClassificationMs: 80,
    totalOrchestrationOverheadMs: 350,
    model: "llama-3.1-8b-instant",
    provider: "groq",
    timestamp: "2024-01-15T10:30:00.000Z",
    phaseDurations: {
      classification: 80,
      memoryRetrieval: 120,
      promptComposition: 5,
      toolSelection: 2,
      streamSetup: 143,
    },
    status: "success",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes structured JSON to console.info", async () => {
    await logOrchestration(baseEntry);

    expect(console.info).toHaveBeenCalledOnce();
    const logged = JSON.parse(
      (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0],
    );
    expect(logged.type).toBe("orchestration");
    expect(logged.conversationId).toBe("conv_123");
    expect(logged.intentCategory).toBe("data_query");
    expect(logged.totalPromptTokens).toBe(200);
    expect(logged.phaseDurations.classification).toBe(80);
  });

  it("calls logAiInvocation for intent classification tokens", async () => {
    await logOrchestration(baseEntry);

    expect(logAiInvocation).toHaveBeenCalledWith({
      userId: "user_456",
      businessId: "biz_789",
      taskType: "intent_classification",
      model: "llama-3.1-8b-instant",
      provider: "groq",
      inputTokens: 200,
      outputTokens: 0,
      cacheHit: false,
      latencyMs: 80,
      status: "success",
      errorMessage: null,
    });
  });

  it("calls recordUsage with weight 1", async () => {
    await logOrchestration(baseEntry);

    expect(recordUsage).toHaveBeenCalledWith(
      "user_456",
      "biz_789",
      "intent_classification",
      1,
    );
  });

  it("does not call logAiInvocation when totalPromptTokens is 0", async () => {
    await logOrchestration({ ...baseEntry, totalPromptTokens: 0 });

    expect(logAiInvocation).not.toHaveBeenCalled();
  });

  it("records failed phase in error message when status is partial_failure", async () => {
    const failedEntry: OrchestrationLogEntry = {
      ...baseEntry,
      status: "partial_failure",
      failedPhase: "memory_retrieval",
      phaseDurations: {
        classification: 80,
        memoryRetrieval: -1,
        promptComposition: -1,
        toolSelection: -1,
        streamSetup: -1,
      },
    };

    await logOrchestration(failedEntry);

    expect(logAiInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        errorMessage: "Orchestration failed at phase: memory_retrieval",
      }),
    );
  });

  it("includes failedPhase as null in JSON when not present", async () => {
    await logOrchestration(baseEntry);

    const logged = JSON.parse(
      (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0],
    );
    expect(logged.failedPhase).toBeNull();
  });
});
