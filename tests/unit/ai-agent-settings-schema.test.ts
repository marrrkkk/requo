import { describe, expect, it } from "vitest";

import { businessAiAgentSettingsSchema } from "@/features/settings/schemas";

describe("businessAiAgentSettingsSchema", () => {
  it("accepts a valid payload with defaults", () => {
    const parsed = businessAiAgentSettingsSchema.safeParse({
      aiAgentEnabled: "on",
      tone: "professional",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.aiAgentEnabled).toBe(true);
      expect(parsed.data.tone).toBe("professional");
    }
  });

  it("defaults disabled and friendly when omitted", () => {
    const parsed = businessAiAgentSettingsSchema.safeParse({});

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.aiAgentEnabled).toBe(false);
      expect(parsed.data.tone).toBe("friendly");
    }
  });

  it("rejects an unsupported tone", () => {
    const parsed = businessAiAgentSettingsSchema.safeParse({
      tone: "aggressive",
    });

    expect(parsed.success).toBe(false);
  });

  it("treats a switch as 'on' only when the field equals 'on'", () => {
    const parsed = businessAiAgentSettingsSchema.safeParse({
      aiAgentEnabled: "off",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.aiAgentEnabled).toBe(false);
    }
  });
});