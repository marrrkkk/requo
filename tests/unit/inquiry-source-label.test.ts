import { describe, expect, it } from "vitest";

import {
  AI_AGENT_SOURCES,
  getInquirySourceLabel,
} from "@/features/inquiries/utils";

describe("getInquirySourceLabel", () => {
  it("labels agent-collected inquiries as AI agent", () => {
    expect(getInquirySourceLabel("ai_agent")).toBe("AI agent");
    expect(getInquirySourceLabel("ai_agent_handoff")).toBe("AI agent");
    expect(getInquirySourceLabel("ai")).toBe("AI agent");
  });

  it("labels unknown and null sources as Manual", () => {
    expect(getInquirySourceLabel("public-inquiry-page")).toBe("Manual");
    expect(getInquirySourceLabel("manual-dashboard")).toBe("Manual");
    expect(getInquirySourceLabel(null)).toBe("Manual");
    expect(getInquirySourceLabel(undefined)).toBe("Manual");
  });
});

describe("AI_AGENT_SOURCES", () => {
  it("recognizes every source string the agent writes", () => {
    expect(AI_AGENT_SOURCES.has("ai_agent")).toBe(true);
    expect(AI_AGENT_SOURCES.has("ai_agent_handoff")).toBe(true);
    // Backward-compatible with legacy "ai" source
    expect(AI_AGENT_SOURCES.has("ai")).toBe(true);
  });
});