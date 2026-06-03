import { describe, it, expect } from "vitest";

import { buildTaskContext } from "@/features/ai/context-builder";
import { AI_TASK_REGISTRY } from "@/features/ai/task-registry";

// ---------------------------------------------------------------------------
// buildTaskContext — basic assembly
// ---------------------------------------------------------------------------

describe("buildTaskContext", () => {
  it("includes only required fields from the registry", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "Customer wants a quote for plumbing",
        customerName: "Jane Doe",
        serviceCategory: "Plumbing",
        extraField: "This should not appear",
        anotherExtra: "Neither should this",
      },
    });

    const requiredFields =
      AI_TASK_REGISTRY.inquiry_summary.requiredContextFields;

    // All keys in assembledContext must be in requiredContextFields
    for (const key of Object.keys(result.assembledContext)) {
      expect(requiredFields).toContain(key);
    }

    // Extra fields must not be present
    expect(result.assembledContext).not.toHaveProperty("extraField");
    expect(result.assembledContext).not.toHaveProperty("anotherExtra");
  });

  it("assembles all available required fields when within budget", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "Short inquiry",
        customerName: "Jane",
        serviceCategory: "Plumbing",
      },
    });

    expect(result.assembledContext).toEqual({
      inquiryDetails: "Short inquiry",
      customerName: "Jane",
      serviceCategory: "Plumbing",
    });
    expect(result.totalCharacters).toBe(
      "Short inquiry".length + "Jane".length + "Plumbing".length,
    );
    expect(result.truncatedFields).toEqual([]);
  });

  it("skips null fields without error", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "Some inquiry",
        customerName: null,
        serviceCategory: "Plumbing",
      },
    });

    expect(result.assembledContext).toEqual({
      inquiryDetails: "Some inquiry",
      serviceCategory: "Plumbing",
    });
    expect(result.omittedFields).toContain("customerName");
  });

  it("skips empty string fields without error", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "Some inquiry",
        customerName: "",
        serviceCategory: "Plumbing",
      },
    });

    expect(result.assembledContext).not.toHaveProperty("customerName");
    expect(result.omittedFields).toContain("customerName");
  });

  it("skips undefined (missing) fields without error", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "Some inquiry",
        // customerName not provided at all
        serviceCategory: "Plumbing",
      },
    });

    expect(result.assembledContext).not.toHaveProperty("customerName");
    expect(result.omittedFields).toContain("customerName");
  });

  it("returns valid output when all fields are null/empty", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: null,
        customerName: null,
        serviceCategory: null,
      },
    });

    expect(result.assembledContext).toEqual({});
    expect(result.totalCharacters).toBe(0);
    expect(result.omittedFields).toEqual([
      "inquiryDetails",
      "customerName",
      "serviceCategory",
    ]);
    expect(result.truncatedFields).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildTaskContext — truncation behavior
// ---------------------------------------------------------------------------

describe("buildTaskContext — truncation", () => {
  it("respects the character budget by omitting lowest-priority fields", () => {
    // inquiry_summary has maxContextCharacters = 2000
    // requiredContextFields: ["inquiryDetails", "customerName", "serviceCategory"]
    // Priority order: inquiryDetails (highest) > customerName > serviceCategory (lowest)

    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "A".repeat(1500),
        customerName: "B".repeat(400),
        serviceCategory: "C".repeat(300), // total = 2200, exceeds 2000
      },
    });

    expect(result.totalCharacters).toBeLessThanOrEqual(2000);
  });

  it("omits fields in reverse priority order (last field removed first)", () => {
    // Total = 1500 + 400 + 300 = 2200, budget = 2000
    // Without serviceCategory = 1900, which is within budget
    // But 2200 - 1900 = 300 removed, and budget allows 2000 - 1900 = 100 chars of serviceCategory
    // So serviceCategory should be truncated, not fully omitted

    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "A".repeat(1500),
        customerName: "B".repeat(400),
        serviceCategory: "C".repeat(300),
      },
    });

    // serviceCategory should be truncated (partial inclusion)
    expect(result.truncatedFields).toContain("serviceCategory");
    expect(result.assembledContext.serviceCategory?.length).toBe(100);
    expect(result.assembledContext.inquiryDetails).toBe("A".repeat(1500));
    expect(result.assembledContext.customerName).toBe("B".repeat(400));
  });

  it("fully omits lowest-priority field when no room for partial inclusion", () => {
    // Total = 1500 + 500 + 300 = 2300, budget = 2000
    // Without serviceCategory = 2000, exactly at budget
    // Remaining budget for serviceCategory = 0, so it should be fully omitted

    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "A".repeat(1500),
        customerName: "B".repeat(500),
        serviceCategory: "C".repeat(300),
      },
    });

    expect(result.omittedFields).toContain("serviceCategory");
    expect(result.assembledContext).not.toHaveProperty("serviceCategory");
    expect(result.totalCharacters).toBeLessThanOrEqual(2000);
  });

  it("omits multiple fields if needed to fit budget", () => {
    // Total = 1900 + 500 + 300 = 2700, budget = 2000
    // Without serviceCategory = 2400, still over
    // Without customerName = 1900, within budget
    // So both serviceCategory and customerName should be affected

    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "A".repeat(1900),
        customerName: "B".repeat(500),
        serviceCategory: "C".repeat(300),
      },
    });

    expect(result.totalCharacters).toBeLessThanOrEqual(2000);
    expect(result.omittedFields).toContain("serviceCategory");
    // customerName may be truncated to fit
    expect(
      result.omittedFields.includes("customerName") ||
        result.truncatedFields.includes("customerName"),
    ).toBe(true);
  });

  it("never exceeds the character budget", () => {
    // Use quote_draft with maxContextCharacters = 6000
    const result = buildTaskContext({
      taskType: "quote_draft",
      availableData: {
        inquiryText: "X".repeat(3000),
        customerName: "Y".repeat(2000),
        customerEmail: "Z".repeat(1500),
        pricingBlocks: "P".repeat(1000),
        businessMemorySummary: "M".repeat(500),
      },
    });

    expect(result.totalCharacters).toBeLessThanOrEqual(6000);
  });

  it("reports correct totalCharacters after truncation", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {
        inquiryDetails: "A".repeat(1500),
        customerName: "B".repeat(400),
        serviceCategory: "C".repeat(300),
      },
    });

    // Verify totalCharacters matches actual content
    const actualTotal = Object.values(result.assembledContext).reduce(
      (sum, v) => sum + v.length,
      0,
    );
    expect(result.totalCharacters).toBe(actualTotal);
  });
});

// ---------------------------------------------------------------------------
// buildTaskContext — edge cases
// ---------------------------------------------------------------------------

describe("buildTaskContext — edge cases", () => {
  it("handles empty availableData object", () => {
    const result = buildTaskContext({
      taskType: "inquiry_summary",
      availableData: {},
    });

    expect(result.assembledContext).toEqual({});
    expect(result.totalCharacters).toBe(0);
    expect(result.truncatedFields).toEqual([]);
  });

  it("works with all task types", () => {
    const taskTypes = [
      "inquiry_summary",
      "quote_draft",
      "followup_message",
      "quote_improvement",
      "form_suggestion",
      "business_memory_summary",
    ] as const;

    for (const taskType of taskTypes) {
      const result = buildTaskContext({
        taskType,
        availableData: {},
      });

      expect(result).toHaveProperty("assembledContext");
      expect(result).toHaveProperty("totalCharacters");
      expect(result).toHaveProperty("omittedFields");
      expect(result).toHaveProperty("truncatedFields");
    }
  });
});
