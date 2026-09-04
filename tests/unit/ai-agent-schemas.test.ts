import { describe, expect, it } from "vitest";

import {
  addMessageInputSchema,
  agentChatRequestSchema,
  agentConfigSchema,
  agentToneSchema,
  completeSessionInputSchema,
  createInquiryParamsSchema,
  createSessionInputSchema,
  getBusinessInfoParamsSchema,
  getServicesParamsSchema,
  messageMetadataSchema,
  qualificationStateSchema,
  requestHandoffInputSchema,
  requestHumanHandoffParamsSchema,
  runMetadataSchema,
  searchKnowledgeParamsSchema,
  sessionMetadataSchema,
  startRunInputSchema,
  updateRunInputSchema,
  updateSessionStateInputSchema,
} from "@/features/ai-agent/schemas";

describe("ai-agent candidate state schemas", () => {
  it("accepts a valid agent config", () => {
    const parsed = agentConfigSchema.safeParse({
      tone: "professional",
      handoffTriggers: { maxSearchAttempts: 3, keywords: ["manager"] },
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts an empty agent config with defaults", () => {
    const parsed = agentConfigSchema.safeParse({});

    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown agent tone", () => {
    expect(agentConfigSchema.safeParse({ tone: "robotic" }).success).toBe(false);
    expect(agentToneSchema.safeParse("casual").success).toBe(true);
  });

  it("rejects out-of-range handoff search attempts", () => {
    expect(
      agentConfigSchema.safeParse({
        handoffTriggers: { maxSearchAttempts: 0 },
      }).success,
    ).toBe(false);
    expect(
      agentConfigSchema.safeParse({
        handoffTriggers: { maxSearchAttempts: 11 },
      }).success,
    ).toBe(false);
  });

  it("accepts a complete qualification state", () => {
    const parsed = qualificationStateSchema.safeParse({
      collected: { customerName: true, details: true },
      values: { customerName: "Taylor Nguyen", details: "Two door decals" },
      missing: ["serviceCategory"],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a qualification state missing required keys", () => {
    expect(
      qualificationStateSchema.safeParse({
        collected: {},
        values: {},
      }).success,
    ).toBe(false);
    expect(
      qualificationStateSchema.safeParse({ collected: {}, values: {}, missing: "name" }).success,
    ).toBe(false);
  });

  it("allows extra metadata on session metadata while validating known fields", () => {
    const parsed = sessionMetadataSchema.safeParse({
      searchAttempts: 2,
      customKey: "kept",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.customKey).toBe("kept");
    }

    expect(
      sessionMetadataSchema.safeParse({ searchAttempts: -1 }).success,
    ).toBe(false);
  });

  it("validates message metadata token counts", () => {
    expect(
      messageMetadataSchema.safeParse({ inputTokens: 0, outputTokens: 500 }).success,
    ).toBe(true);
    expect(
      messageMetadataSchema.safeParse({ inputTokens: -5 }).success,
    ).toBe(false);
  });

  it("validates run metadata tool calls", () => {
    const parsed = runMetadataSchema.safeParse({
      stepCount: 2,
      toolCalls: [{ toolName: "get_business_info", toolCallId: "call_1", args: {}, result: {} }],
    });

    expect(parsed.success).toBe(true);

    expect(
      runMetadataSchema.safeParse({ stepCount: 0 }).success,
    ).toBe(false);
    expect(
      runMetadataSchema.safeParse({ stepCount: 1.5 }).success,
    ).toBe(false);
  });
});

describe("ai-agent API request schema", () => {
  it("accepts a valid chat request", () => {
    const parsed = agentChatRequestSchema.safeParse({
      sessionToken: "a".repeat(64),
      content: "What do you offer?",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts the UI-transport message shape without legacy content", () => {
    const parsed = agentChatRequestSchema.safeParse({
      sessionToken: "a".repeat(64),
      messages: [
        { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a request with neither content nor messages", () => {
    expect(
      agentChatRequestSchema.safeParse({ sessionToken: "a".repeat(64) }).success,
    ).toBe(false);
  });

  it("rejects a missing session token", () => {
    expect(agentChatRequestSchema.safeParse({ content: "Hi" }).success).toBe(false);
    expect(
      agentChatRequestSchema.safeParse({ sessionToken: "", content: "Hi" }).success,
    ).toBe(false);
  });

  it("rejects empty or oversized message content", () => {
    expect(
      agentChatRequestSchema.safeParse({ sessionToken: "tok", content: "" }).success,
    ).toBe(false);
    expect(
      agentChatRequestSchema.safeParse({
        sessionToken: "tok",
        content: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
});

describe("ai-agent service input schemas", () => {
  it("validates session creation input", () => {
    expect(
      createSessionInputSchema.safeParse({ businessId: "biz_x" }).success,
    ).toBe(true);
    expect(
      createSessionInputSchema.safeParse({ businessId: "" }).success,
    ).toBe(false);
    expect(
      createSessionInputSchema.safeParse({}).success,
    ).toBe(false);
  });

  it("validates add message input", () => {
    expect(
      addMessageInputSchema.safeParse({
        sessionId: "ags_x",
        role: "assistant",
        content: "Sure!",
      }).success,
    ).toBe(true);
    expect(
      addMessageInputSchema.safeParse({
        sessionId: "ags_x",
        role: "tool",
        content: "{}",
        toolName: "get_business_info",
        toolCallId: "call_1",
      }).success,
    ).toBe(true);
    expect(
      addMessageInputSchema.safeParse({ sessionId: "ags_x", role: "narrator", content: "x" }).success,
    ).toBe(false);
    expect(
      addMessageInputSchema.safeParse({ sessionId: "ags_x", role: "user", content: "" }).success,
    ).toBe(false);
  });

  it("validates session state, completion, and handoff inputs", () => {
    const state = { collected: {}, values: {}, missing: ["details"] };
    expect(
      updateSessionStateInputSchema.safeParse({ sessionId: "ags_x", state }).success,
    ).toBe(true);
    expect(
      completeSessionInputSchema.safeParse({ sessionId: "ags_x", inquiryId: "inq_x" }).success,
    ).toBe(true);
    expect(
      requestHandoffInputSchema.safeParse({
        sessionId: "ags_x",
        reason: "Customer asked for a person",
      }).success,
    ).toBe(true);
    expect(
      requestHandoffInputSchema.safeParse({ sessionId: "ags_x", reason: "" }).success,
    ).toBe(false);
  });

  it("validates run input schemas", () => {
    expect(
      startRunInputSchema.safeParse({
        businessId: "biz_x",
        sessionId: "ags_x",
        model: "gpt-4o-mini",
        provider: "openrouter",
      }).success,
    ).toBe(true);
    expect(
      updateRunInputSchema.safeParse({
        runId: "agr_x",
        status: "completed",
        inputTokens: 10,
        outputTokens: 20,
        estimatedCostCents: 0.5,
      }).success,
    ).toBe(true);
    expect(
      updateRunInputSchema.safeParse({ runId: "", status: "paused" }).success,
    ).toBe(false);
  });
});

describe("ai-agent tool parameter schemas", () => {
  it("validates the search knowledge query bounds", () => {
    expect(searchKnowledgeParamsSchema.safeParse({ query: "pricing" }).success).toBe(true);
    expect(searchKnowledgeParamsSchema.safeParse({ query: "" }).success).toBe(false);
    expect(
      searchKnowledgeParamsSchema.safeParse({ query: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("accepts parameterless tools", () => {
    expect(getBusinessInfoParamsSchema.safeParse({}).success).toBe(true);
    expect(getServicesParamsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid create inquiry input", () => {
    const valid = {
      customerName: "Taylor Nguyen",
      customerContactMethod: "email",
      customerContactHandle: "taylor@example.com",
      serviceCategory: "Window graphics",
      details: "Two storefront panels",
    };

    expect(createInquiryParamsSchema.safeParse(valid).success).toBe(true);
    expect(
      createInquiryParamsSchema.safeParse({
        ...valid,
        customerName: "",
      }).success,
    ).toBe(false);
    expect(
      createInquiryParamsSchema.safeParse({
        ...valid,
        customerEmail: "not-an-email",
      }).success,
    ).toBe(false);
    expect(
      createInquiryParamsSchema.safeParse({
        ...valid,
        details: "",
      }).success,
    ).toBe(false);
  });

  it("accepts optional create inquiry fields", () => {
    const parsed = createInquiryParamsSchema.safeParse({
      customerName: "Taylor Nguyen",
      customerContactMethod: "email",
      customerContactHandle: "taylor@example.com",
      serviceCategory: "Window graphics",
      details: "Two storefront panels",
      customerEmail: "taylor@example.com",
      budgetText: "$500 - $1,000",
      requestedDeadline: "2026-06-01",
      additionalFields: { preferredLanguage: "en" },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.additionalFields).toEqual({ preferredLanguage: "en" });
    }
  });

  it("validates the human handoff request", () => {
    expect(
      requestHumanHandoffParamsSchema.safeParse({ reason: "Too complex for me" }).success,
    ).toBe(true);
    expect(
      requestHumanHandoffParamsSchema.safeParse({
        reason: "Too complex for me",
        customerMessage: "Can a person call me?",
      }).success,
    ).toBe(true);
    expect(
      requestHumanHandoffParamsSchema.safeParse({ reason: "" }).success,
    ).toBe(false);
  });
});