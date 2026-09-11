import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

const authState = vi.hoisted(() => ({
  userId: "",
}));

vi.mock("@/lib/auth/session", () => {
  const session = async () => ({ user: { id: authState.userId } });
  const user = async () => ({ id: authState.userId });
  return {
    getSession: vi.fn(session),
    getOptionalSession: vi.fn(session),
    requireSession: vi.fn(session),
    requireUser: vi.fn(user),
    getCurrentUser: vi.fn(user),
  };
});

vi.mock("@/lib/ai/registry", () => ({
  registry: { languageModel: vi.fn() },
}));

const assistantEnv = vi.hoisted(() => ({
  groq: true,
  cerebras: true,
  gemini: true,
  openrouter: true,
  mistral: true,
  cloudflare: true,
  nvidia: true,
}));

vi.mock("@/lib/env", () => ({
  // The route graph reaches the email senders through the assistant's quote
  // tools, and `lib/email/providers/resend.ts` reads `env` at module scope.
  env: {},
  isResendConfigured: false,
  isGroqConfigured: assistantEnv.groq,
  isCerebrasConfigured: assistantEnv.cerebras,
  isGeminiConfigured: assistantEnv.gemini,
  isOpenRouterConfigured: assistantEnv.openrouter,
  isMistralConfigured: assistantEnv.mistral,
  isCloudflareAiConfigured: assistantEnv.cloudflare,
  isNvidiaNimConfigured: assistantEnv.nvidia,
}));

const assistantCache = vi.hoisted(() => ({ map: new Map<string, unknown>() }));

vi.mock("@/lib/ai/usage-limiter", () => ({
  checkUsageLimit: vi.fn(async () => ({ allowed: true })),
  recordUsage: vi.fn(async () => {}),
  TASK_WEIGHTS: { agent_conversation: 1, assistant_message: 1 },
}));

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: vi.fn(async (key: string) => assistantCache.map.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      assistantCache.map.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      assistantCache.map.delete(key);
    }),
    increment: vi.fn(async (key: string) => {
      const next = (Number(assistantCache.map.get(key) ?? 0) || 0) + 1;
      assistantCache.map.set(key, next);
      return next;
    }),
    incrementBy: vi.fn(async (key: string, amount: number) => {
      const next = (Number(assistantCache.map.get(key) ?? 0) || 0) + amount;
      assistantCache.map.set(key, next);
      return next;
    }),
  },
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/features/inquiries/qualification/qualify-inquiry", () => ({
  qualifyInquiry: vi.fn(async () => ({})),
}));

vi.mock("@/features/inquiries/defaults", () => ({
  enqueueAiDraftQuoteOnQualify: vi.fn(async () => ({})),
  maybeSendInquiryAckEmail: vi.fn(async () => ({ ok: true })),
}));

import { POST } from "@/app/api/ai/owner-assistant/chat/route";
import { registry } from "@/lib/ai/registry";
import {
  auditLogs,
  businesses,
  inquiries,
  ownerAssistantMessages,
  ownerAssistantSessions,
  quotes,
} from "@/lib/db/schema";
import { createAssistantSession } from "@/features/owner-assistant/session-service";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";
import {
  firstModelCall,
  mockModelForTurns,
  textTurn,
  toolCallTurn,
} from "@/tests/support/mock-model";

const prefix = "test_assistant_chat_route";
let ids: WorkflowFixtureIds;

function chatRequest(body: unknown) {
  return new Request("http://localhost/api/ai/owner-assistant/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function uiMessages(text: string) {
  return [{ id: "m1", role: "user", parts: [{ type: "text", text }] }];
}

describe("owner-assistant chat API route (provider seam)", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
    authState.userId = ids.ownerUserId;
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  beforeEach(() => {
    vi.clearAllMocks();
    assistantCache.map.clear();
    assistantEnv.groq = true;
    assistantEnv.cerebras = true;
    assistantEnv.gemini = true;
    assistantEnv.openrouter = true;
    assistantEnv.mistral = true;
    assistantEnv.cloudflare = true;
    assistantEnv.nvidia = true;
    authState.userId = ids.ownerUserId;
  });

  it("recovers past a dead head identifier without losing the turn", async () => {
    const healthy = mockModelForTurns([textTurn("Still here.")]);
    vi.mocked(registry.languageModel).mockImplementation(((modelId: string) => {
      if (modelId === "google:gemini-2.5-flash-lite") {
        return {
          provider: "mock",
          modelId,
          doGenerate: async () => {
            throw Object.assign(new Error("model_not_found"), { status: 404 });
          },
          doStream: async () => {
            throw Object.assign(new Error("model_not_found"), { status: 404 });
          },
        } as never;
      }
      return healthy as never;
    }) as never);

    const response = await POST(
      chatRequest({ businessSlug: ids.businessSlug, messages: uiMessages("Hello?") }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Still here.");
  });

  it("sends the user's text to the model on the first turn and persists both sides", async () => {
    const model = mockModelForTurns([textTurn("You have 3 open inquiries.")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({ businessSlug: ids.businessSlug, messages: uiMessages("How many open inquiries?") }),
    );

    expect(response.status).toBe(200);
    const sessionId = response.headers.get("X-Session-Id");
    expect(sessionId).toMatch(/^oas_/);
    expect(await response.text()).toContain("You have 3 open inquiries.");

    // The model received the user's text — the central regression assertion.
    const call = firstModelCall(model);
    expect(call.messages).toEqual([
      { role: "user", content: "How many open inquiries?" },
    ]);

    // The user turn is persisted before the model turn, with no provider on input.
    const rows = await testDb
      .select()
      .from(ownerAssistantMessages)
      .where(eq(ownerAssistantMessages.sessionId, sessionId!));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ role: "user", content: "How many open inquiries?" });
    expect(rows[1]).toMatchObject({
      role: "assistant",
      content: "You have 3 open inquiries.",
      provider: "google",
      model: "gemini-2.5-flash-lite",
    });
  });

  it("injects Business Instructions into the assistant system prompt", async () => {
    await testDb
      .update(businesses)
      .set({
        aiAgentConfig: { instructions: "We only take projects over $5,000." },
      })
      .where(eq(businesses.id, ids.businessId));

    try {
      const model = mockModelForTurns([textTurn("Understood.")]);
      vi.mocked(registry.languageModel).mockReturnValue(model as never);

      const response = await POST(
        chatRequest({
          businessSlug: ids.businessSlug,
          messages: uiMessages("What size projects do we take on?"),
        }),
      );
      await response.text();

      // AI SDK v6 delivers the system prompt as prompt entries (not a top-level
      // `system` field), so assert on the serialized prompt the model received.
      const recorded = firstModelCall(model) as unknown as { prompt?: unknown };
      const promptText = JSON.stringify(recorded?.prompt ?? null);
      expect(promptText).toContain("## Business Instructions");
      expect(promptText).toContain("We only take projects over $5,000.");
    } finally {
      await testDb
        .update(businesses)
        .set({ aiAgentConfig: {} })
        .where(eq(businesses.id, ids.businessId));
    }
  });

  it("continues the server-created session instead of starting a new one", async () => {
    const first = mockModelForTurns([textTurn("First answer.")]);
    vi.mocked(registry.languageModel).mockReturnValue(first as never);

    const firstResponse = await POST(
      chatRequest({ businessSlug: ids.businessSlug, messages: uiMessages("First question?") }),
    );
    const sessionId = firstResponse.headers.get("X-Session-Id")!;
    await firstResponse.text();

    const second = mockModelForTurns([textTurn("Second answer.")]);
    vi.mocked(registry.languageModel).mockReturnValue(second as never);

    const secondResponse = await POST(
      chatRequest({
        businessSlug: ids.businessSlug,
        sessionId,
        messages: uiMessages("Follow-up?"),
      }),
    );
    expect(secondResponse.headers.get("X-Session-Id")).toBe(sessionId);
    await secondResponse.text();

    const call = firstModelCall(second);
    expect(call.messages).toEqual([
      { role: "user", content: "First question?" },
      { role: "assistant", content: "First answer." },
      { role: "user", content: "Follow-up?" },
    ]);

    const sessions = await testDb
      .select()
      .from(ownerAssistantSessions)
      .where(
        and(
          eq(ownerAssistantSessions.businessId, ids.businessId),
          eq(ownerAssistantSessions.userId, ids.ownerUserId),
        ),
      );
    expect(sessions.filter((s) => s.id === sessionId)).toHaveLength(1);
  });

  it("a scripted create_inquiry call writes a real inquiry plus an audit record", async () => {
    const model = mockModelForTurns([
      toolCallTurn("create_inquiry", "call_1", {
        customerName: "Casey Morgan",
        customerEmail: "casey+assistant@example.com",
        serviceCategory: "Consulting",
        details: "Two-hour discovery call.",
      }),
      textTurn("Done — inquiry created."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({
        businessSlug: ids.businessSlug,
        messages: uiMessages("Log an inquiry for Casey Morgan, casey+assistant@example.com, consulting, two-hour discovery call."),
      }),
    );
    const body = await response.text();
    expect(body).toContain("Done");

    const stored = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.customerEmail, "casey+assistant@example.com"));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      businessId: ids.businessId,
      status: "new",
      aiAssisted: true,
    });

    const audits = await testDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.businessId, ids.businessId),
          eq(auditLogs.entityId, stored[0].id),
        ),
      );
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorUserId: ids.ownerUserId,
      entityType: "request",
      action: "request.created",
    });
  });

  it("refuses a gated tool for a role that may not use it, writing nothing", async () => {
    authState.userId = ids.staffUserId;

    const quoteId = `${prefix}_quote_staff`;
    await testDb.insert(quotes).values({
      id: quoteId,
      businessId: ids.businessId,
      quoteNumber: "Q-900",
      publicToken: "staff-token",
      title: "Quote",
      customerName: "Staff Customer",
      validUntil: "2026-12-31",
    });

    const model = mockModelForTurns([
      toolCallTurn("send_quote", "call_1", { quoteId, deliveryMethod: "link" }),
      textTurn("I can't send that."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({
        businessSlug: ids.businessSlug,
        messages: uiMessages("Send that quote please."),
      }),
    );
    const body = await response.text();
    expect(body).toContain("PERMISSION_DENIED");

    const [quote] = await testDb
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId));
    expect(quote.status).toBe("draft");
  });

  it("stages confirmation for send_quote without executing it", async () => {
    const quoteId = `${prefix}_quote_owner`;
    await testDb.insert(quotes).values({
      id: quoteId,
      businessId: ids.businessId,
      quoteNumber: "Q-901",
      publicToken: "owner-token",
      title: "Quote",
      customerName: "Owner Customer",
      validUntil: "2026-12-31",
    });

    const model = mockModelForTurns([
      toolCallTurn("send_quote", "call_1", { quoteId, deliveryMethod: "link" }),
      textTurn("Please confirm sending."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({
        businessSlug: ids.businessSlug,
        messages: uiMessages("Send quote Q-901 please."),
      }),
    );
    const body = await response.text();
    expect(body).toContain("confirmation_required");

    const [quote] = await testDb
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId));
    expect(quote.status).toBe("draft");
  });

  it("refuses at the daily bucket on a free plan with an upgrade signal", async () => {
    authState.userId = ids.outsiderUserId;

    const { sessionId } = await createAssistantSession({
      businessId: ids.otherBusinessId,
      userId: ids.outsiderUserId,
    });

    // Free plan allows 25 assistant messages per day.
    await testDb.insert(ownerAssistantMessages).values(
      Array.from({ length: 25 }, (_, index) => ({
        id: `${prefix}_bucket_${index}`,
        sessionId,
        role: "user" as const,
        content: `Earlier message ${index}`,
        metadata: {},
      })),
    );

    const model = mockModelForTurns([textTurn("unreachable")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({
        businessSlug: ids.otherBusinessSlug,
        sessionId,
        messages: uiMessages("One more question?"),
      }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ upgradeRequired: true });
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("never resolves a session that belongs to another business", async () => {
    const { sessionId } = await createAssistantSession({
      businessId: ids.businessId,
      userId: ids.ownerUserId,
      initialMessage: "Private thread.",
    });

    // Outsider presents the foreign session id against their own business.
    authState.userId = ids.outsiderUserId;
    const model = mockModelForTurns([textTurn("Fresh answer.")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({
        businessSlug: ids.otherBusinessSlug,
        sessionId,
        messages: uiMessages("Hello?"),
      }),
    );

    const canonical = response.headers.get("X-Session-Id");
    expect(canonical).not.toBe(sessionId);
    await response.text();

    const call = firstModelCall(model);
    expect(call.messages).toEqual([{ role: "user", content: "Hello?" }]);
  });
});
