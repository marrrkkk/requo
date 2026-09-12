import { describe, expect, it } from "vitest";

import {
  AI_AGENT_SOURCES,
  getInquirySourceLabel,
} from "@/features/inquiries/utils";

describe("getInquirySourceLabel", () => {
  it("labels canonical sources with human-readable names", () => {
    expect(getInquirySourceLabel("service_form")).toBe("Service Form");
    expect(getInquirySourceLabel("ai_assistant")).toBe("AI Assistant");
    expect(getInquirySourceLabel("manual")).toBe("Manual");
    expect(getInquirySourceLabel("api")).toBe("API");
  });

  it("maps legacy sources forward", () => {
    expect(getInquirySourceLabel("public-inquiry-page")).toBe("Service Form");
    expect(getInquirySourceLabel("manual-dashboard")).toBe("Manual");
    expect(getInquirySourceLabel("ai_agent")).toBe("AI Assistant");
    expect(getInquirySourceLabel("ai_agent_handoff")).toBe("AI Assistant");
    expect(getInquirySourceLabel("ai")).toBe("AI Assistant");
  });

  it("labels unknown and null sources as Unknown", () => {
    expect(getInquirySourceLabel(null)).toBe("Unknown");
    expect(getInquirySourceLabel(undefined)).toBe("Unknown");
    expect(getInquirySourceLabel("something-else")).toBe("Unknown");
  });
});

describe("AI_AGENT_SOURCES", () => {
  it("recognizes every source string the agent writes", () => {
    expect(AI_AGENT_SOURCES.has("ai_agent")).toBe(true);
    expect(AI_AGENT_SOURCES.has("ai_agent_handoff")).toBe(true);
    // Backward-compatible with legacy "ai" source
    expect(AI_AGENT_SOURCES.has("ai")).toBe(true);
    expect(AI_AGENT_SOURCES.has("ai_assistant")).toBe(true);
  });
});
