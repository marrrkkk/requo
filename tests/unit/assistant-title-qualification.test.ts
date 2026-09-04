import { describe, expect, it } from "vitest";

import { generateAssistantTitle } from "@/features/owner-assistant/session-service";
import {
  advanceQualificationFromMessage,
  REQUIRED_QUALIFICATION_FIELDS,
} from "@/features/ai-agent/session-service";
import type { QualificationState } from "@/features/ai-agent/types";

function emptyState(): QualificationState {
  return {
    collected: {},
    values: {},
    missing: [...REQUIRED_QUALIFICATION_FIELDS],
  };
}

describe("generateAssistantTitle", () => {
  it("uses the opening message verbatim when short", () => {
    expect(generateAssistantTitle("Show me this week's inquiries")).toBe(
      "Show me this week's inquiries",
    );
  });

  it("collapses whitespace and truncates long messages", () => {
    const title = generateAssistantTitle(
      "  Please   help  me understand why my conversion rate dropped\nlast quarter  ",
    );
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).not.toContain("\n");
    expect(title).not.toContain("  ");
  });

  it("falls back for empty input", () => {
    expect(generateAssistantTitle("   ")).toBe("New conversation");
  });
});

describe("advanceQualificationFromMessage", () => {
  it("extracts a name, email, and contact handle", () => {
    const next = advanceQualificationFromMessage(
      emptyState(),
      "Hi, I'm Ana Torres, ana@example.com.",
    );

    expect(next.values.customerName).toBe("Ana Torres");
    expect(next.values.customerEmail).toBe("ana@example.com");
    expect(next.values.customerContactMethod).toBe("email");
    expect(next.values.customerContactHandle).toBe("ana@example.com");
    expect(next.missing).not.toContain("customerName");
    expect(next.missing).not.toContain("customerContactHandle");
    // Service and details still need collecting for a short greeting.
    expect(next.missing).toContain("serviceCategory");
  });

  it("extracts a phone handle when no email is present", () => {
    const next = advanceQualificationFromMessage(
      emptyState(),
      "Please call me on +1 415 555 0123 about signage.",
    );

    expect(next.values.customerContactHandle).toContain("415 555 0123");
    expect(next.values.customerContactMethod).toBe("phone");
  });

  it("treats substantive free text as project details", () => {
    const next = advanceQualificationFromMessage(
      emptyState(),
      "We need two front-window panels and a door decal for our new cafe opening next month.",
    );

    expect(next.collected.details).toBe(true);
    expect(next.values.details).toContain("front-window panels");
  });

  it("leaves state untouched for greetings without extractable facts", () => {
    const next = advanceQualificationFromMessage(emptyState(), "Hello there!");

    expect(next).toEqual(emptyState());
  });

  it("never overwrites already-collected values", () => {
    const state: QualificationState = {
      collected: { customerName: true },
      values: { customerName: "Original Name" },
      missing: ["customerContactMethod", "customerContactHandle", "serviceCategory", "details"],
    };

    const next = advanceQualificationFromMessage(
      state,
      "Actually I'm Someone Else, other@example.com.",
    );

    expect(next.values.customerName).toBe("Original Name");
    expect(next.values.customerEmail).toBe("other@example.com");
  });
});
