import { describe, it, expect } from "vitest";

import {
  aiTaskTypes,
  AI_TASK_REGISTRY,
  getTaskConfig,
  validateInvocationPayload,
  taskConfigSchema,
} from "@/features/ai/task-registry";
import type { AiTaskType } from "@/features/ai/task-registry";

// ---------------------------------------------------------------------------
// getTaskConfig
// ---------------------------------------------------------------------------

describe("getTaskConfig", () => {
  it("returns a valid config for each known task type", () => {
    for (const taskType of aiTaskTypes) {
      const config = getTaskConfig(taskType);
      expect(config.taskType).toBe(taskType);
      expect(config.requiredContextFields.length).toBeGreaterThan(0);
    }
  });

  it("throws for an unknown task type with valid types listed", () => {
    expect(() => getTaskConfig("nonexistent_task")).toThrowError(
      /Unknown AI task type "nonexistent_task"/,
    );
    expect(() => getTaskConfig("nonexistent_task")).toThrowError(
      /inquiry_summary/,
    );
  });

  it("throws for an empty string", () => {
    expect(() => getTaskConfig("")).toThrowError(/Unknown AI task type/);
  });
});

// ---------------------------------------------------------------------------
// validateInvocationPayload
// ---------------------------------------------------------------------------

describe("validateInvocationPayload", () => {
  it("passes when all required fields are present and non-empty", () => {
    expect(() =>
      validateInvocationPayload("inquiry_summary", {
        inquiryDetails: "Customer wants a quote",
        customerName: "Jane Doe",
        serviceCategory: "Plumbing",
      }),
    ).not.toThrow();
  });

  it("throws when a required field is missing", () => {
    expect(() =>
      validateInvocationPayload("inquiry_summary", {
        inquiryDetails: "Customer wants a quote",
        customerName: "Jane Doe",
        // serviceCategory missing
      }),
    ).toThrowError(/serviceCategory/);
  });

  it("throws when a required field is empty string", () => {
    expect(() =>
      validateInvocationPayload("inquiry_summary", {
        inquiryDetails: "Customer wants a quote",
        customerName: "",
        serviceCategory: "Plumbing",
      }),
    ).toThrowError(/customerName/);
  });

  it("throws when a required field is null", () => {
    expect(() =>
      validateInvocationPayload("inquiry_summary", {
        inquiryDetails: "Customer wants a quote",
        customerName: null,
        serviceCategory: "Plumbing",
      }),
    ).toThrowError(/customerName/);
  });

  it("lists all missing fields in the error message", () => {
    expect(() =>
      validateInvocationPayload("inquiry_summary", {}),
    ).toThrowError(/inquiryDetails, customerName, serviceCategory/);
  });

  it("validates quote_draft with all required fields", () => {
    expect(() =>
      validateInvocationPayload("quote_draft", {
        inquiryText: "Need a bathroom renovation",
        customerName: "John",
        customerEmail: "john@example.com",
        pricingBlocks: "Block A",
        businessMemorySummary: "We do renovations",
        revisionContext: "fresh",
        currentItems: "none",
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AI_TASK_REGISTRY schema validation
// ---------------------------------------------------------------------------

describe("AI_TASK_REGISTRY", () => {
  it("contains exactly 9 task types", () => {
    expect(Object.keys(AI_TASK_REGISTRY)).toHaveLength(9);
  });

  it("all entries pass Zod schema validation", () => {
    for (const taskType of aiTaskTypes) {
      const result = taskConfigSchema.safeParse(AI_TASK_REGISTRY[taskType]);
      expect(result.success, `${taskType} failed schema validation`).toBe(true);
    }
  });

  it("cheap tier tasks have maxOutputTokens <= 256", () => {
    const cheapTasks: AiTaskType[] = [
      "inquiry_summary",
      "followup_message",
      "form_suggestion",
    ];

    for (const taskType of cheapTasks) {
      const config = AI_TASK_REGISTRY[taskType];
      expect(config.qualityTier).toBe("cheap");
      expect(config.maxOutputTokens).toBeLessThanOrEqual(256);
    }
  });

  it("balanced tier tasks have maxOutputTokens <= 4096", () => {
    const balancedTasks: AiTaskType[] = [
      "quote_draft",
      "quote_improvement",
      "business_memory_summary",
    ];

    for (const taskType of balancedTasks) {
      const config = AI_TASK_REGISTRY[taskType];
      expect(config.qualityTier).toBe("balanced");
      expect(config.maxOutputTokens).toBeLessThanOrEqual(4096);
    }
  });

  it("streaming is only permitted for quote_draft, quote_improvement, assistant_message, and assistant_tool_call", () => {
    for (const taskType of aiTaskTypes) {
      const config = AI_TASK_REGISTRY[taskType];
      if (
        taskType === "quote_draft" ||
        taskType === "quote_improvement" ||
        taskType === "assistant_message" ||
        taskType === "assistant_tool_call"
      ) {
        expect(config.streamingPermitted).toBe(true);
      } else {
        expect(config.streamingPermitted).toBe(false);
      }
    }
  });
});
