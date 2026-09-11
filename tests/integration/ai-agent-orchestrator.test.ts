import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("@/lib/ai/registry", () => ({
  registry: { languageModel: vi.fn() },
}));

const orchestratorEnv = vi.hoisted(() => ({
  groq: true,
  cerebras: true,
  gemini: true,
  openrouter: true,
  mistral: true,
  cloudflare: true,
  nvidia: true,
}));

vi.mock("@/lib/env", () => ({
  isGroqConfigured: orchestratorEnv.groq,
  isCerebrasConfigured: orchestratorEnv.cerebras,
  isGeminiConfigured: orchestratorEnv.gemini,
  isOpenRouterConfigured: orchestratorEnv.openrouter,
  isMistralConfigured: orchestratorEnv.mistral,
  isCloudflareAiConfigured: orchestratorEnv.cloudflare,
  isNvidiaNimConfigured: orchestratorEnv.nvidia,
}));

const orchestratorCache = vi.hoisted(() => ({ map: new Map<string, unknown>() }));

vi.mock("@/lib/ai/usage-limiter", () => ({
  checkUsageLimit: vi.fn(async () => ({ allowed: true })),
  recordUsage: vi.fn(async () => {}),
  TASK_WEIGHTS: { agent_conversation: 1, assistant_message: 1 },
}));

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: vi.fn(async (key: string) => orchestratorCache.map.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      orchestratorCache.map.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      orchestratorCache.map.delete(key);
    }),
    increment: vi.fn(async (key: string) => {
      const next = (Number(orchestratorCache.map.get(key) ?? 0) || 0) + 1;
      orchestratorCache.map.set(key, next);
      return next;
    }),
    incrementBy: vi.fn(async (key: string, amount: number) => {
      const next = (Number(orchestratorCache.map.get(key) ?? 0) || 0) + amount;
      orchestratorCache.map.set(key, next);
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

vi.mock("@/features/memory/retrieval", () => ({
  retrieveBusinessKnowledge: vi.fn(async () => ({ evidence: [], usedRag: false })),
}));

vi.mock("@/features/inquiries/qualification/qualify-inquiry", () => ({
  qualifyInquiry: vi.fn(async () => ({})),
}));

vi.mock("@/features/inquiries/defaults", () => ({
  enqueueAiDraftQuoteOnQualify: vi.fn(async () => ({})),
  maybeSendInquiryAckEmail: vi.fn(async () => ({ ok: true })),
}));

import { aiAgentSessions, businesses } from "@/lib/db/schema";
import { runAgent } from "@/features/ai-agent/orchestrator";
import { loadConversationHistory } from "@/features/ai-agent/message-service";
import { loadAgentRun } from "@/features/ai-agent/telemetry";
import { registry } from "@/lib/ai/registry";
import { checkUsageLimit, recordUsage } from "@/lib/ai/usage-limiter";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  createActiveAgentSession,
} from "@/tests/support/ai-agent";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";
import {
  firstModelCall,
  mockModelForTurns,
  readStreamText,
  textTurn,
  toolCallTurn,
} from "@/tests/support/mock-model";

const prefix = "test_ai_agent_orchestrator";
let ids: WorkflowFixtureIds;

/**
 * Serialized first model call. AI SDK v6 delivers the system prompt as prompt
 * entries rather than a top-level `system` field, so the rendered prompt is
 * read off the recorded call.
 */
function modelPromptText(model: ReturnType<typeof mockModelForTurns>): string {
  const recorded = firstModelCall(model) as unknown as { prompt?: unknown };
  return JSON.stringify(recorded?.prompt ?? null);
}

async function enableAgent() {
  await testDb
    .update(businesses)
    .set({ aiAgentEnabled: true, plan: "pro", aiAgentConfig: {} })
    .where(eq(businesses.id, ids.businessId));
}

describe("ai-agent orchestrator runAgent (provider seam)", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  beforeEach(async () => {
    vi.clearAllMocks();
    orchestratorCache.map.clear();
    orchestratorEnv.groq = true;
    orchestratorEnv.cerebras = true;
    orchestratorEnv.gemini = true;
    orchestratorEnv.openrouter = true;
    orchestratorEnv.mistral = true;
    orchestratorEnv.cloudflare = true;
    orchestratorEnv.nvidia = true;
    await enableAgent();
  });

  it("rejects an unknown session token before invoking any AI work", async () => {
    const model = mockModelForTurns([textTurn("Hello")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await expect(
      runAgent({ sessionToken: "f".repeat(64), userMessage: "Hi" }),
    ).rejects.toThrow("Invalid or expired session");

    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("rejects sessions for businesses that have not enabled the agent", async () => {
    await testDb
      .update(businesses)
      .set({ aiAgentEnabled: false })
      .where(eq(businesses.id, ids.businessId));

    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await expect(
      runAgent({ sessionToken: session.publicToken, userMessage: "Hi" }),
    ).rejects.toThrow("AI agent is not enabled for this business");

    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("rejects when the plan no longer includes the agent (downgrade takes effect)", async () => {
    await testDb
      .update(businesses)
      .set({ plan: "free" })
      .where(eq(businesses.id, ids.businessId));

    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await expect(
      runAgent({ sessionToken: session.publicToken, userMessage: "Hi" }),
    ).rejects.toThrow("AI agent is not available on this plan");

    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("rejects when no suitable model is available", async () => {
    orchestratorEnv.groq = false;
    orchestratorEnv.cerebras = false;
    orchestratorEnv.gemini = false;
    orchestratorEnv.openrouter = false;
    orchestratorEnv.mistral = false;
    orchestratorEnv.cloudflare = false;
    orchestratorEnv.nvidia = false;
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await expect(
      runAgent({ sessionToken: session.publicToken, userMessage: "Hi" }),
    ).rejects.toThrow("No suitable AI model available");

    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("sends the user's text to the model on the first turn and persists both sides", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([
      textTurn("Thanks! What service are you looking for?"),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await runAgent({
      sessionToken: session.publicToken,
      userMessage: "I need two window decals.",
    });

    expect(response.status).toBe(200);
    const body = await readStreamText(response);
    expect(body).toContain("Thanks! What service are you looking for?");

    // The model received the user's text — the central regression assertion.
    const call = firstModelCall(model);
    expect(String(call.system)).toContain("Workflow Business");
    expect(call.messages).toEqual([
      { role: "user", content: "I need two window decals." },
    ]);

    // The user turn is persisted before the model turn, with provider/model.
    const history = await loadConversationHistory(session.sessionId);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      role: "user",
      content: "I need two window decals.",
    });
    expect(history[1]).toMatchObject({
      role: "assistant",
      content: "Thanks! What service are you looking for?",
      provider: "groq",
      model: "openai/gpt-oss-20b",
    });

    expect(checkUsageLimit).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: ids.businessId }),
    );
    expect(recordUsage).toHaveBeenCalledWith(
      "system:ai-agent",
      ids.businessId,
      "agent_conversation",
      1,
    );

    const latestRun = await testDb.query.aiAgentRuns.findFirst({
      where: (runs, { eq: rawEq }) => rawEq(runs.sessionId, session.sessionId),
      orderBy: (runs, { desc }) => [desc(runs.startedAt)],
    });
    expect(latestRun).toMatchObject({
      businessId: ids.businessId,
      status: "completed",
      model: "openai/gpt-oss-20b",
      provider: "groq",
    });

    const loaded = await loadAgentRun(latestRun!.id);
    expect(loaded?.status).toBe("completed");
  });

  it("sends the full prior conversation on later turns", async () => {
    const session = await createActiveAgentSession(ids.businessId);

    const first = mockModelForTurns([textTurn("Great — what is your email?")]);
    vi.mocked(registry.languageModel).mockReturnValue(first as never);
    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "I need storefront signage.",
      }),
    );

    const second = mockModelForTurns([textTurn("Thanks, Ana! Noted.")]);
    vi.mocked(registry.languageModel).mockReturnValue(second as never);
    const response = await runAgent({
      sessionToken: session.publicToken,
      userMessage: "I'm Ana, ana@example.com.",
    });
    await readStreamText(response);

    const call = firstModelCall(second);
    expect(call.messages).toEqual([
      { role: "user", content: "I need storefront signage." },
      { role: "assistant", content: "Great — what is your email?" },
      { role: "user", content: "I'm Ana, ana@example.com." },
    ]);
  });

  it("advances qualification state as the conversation progresses", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Thanks!")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Hi, I'm Ana Torres, ana@example.com.",
      }),
    );

    const [stored] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, session.sessionId));

    const state = stored.state as {
      collected: Record<string, boolean>;
      values: Record<string, string | null>;
      missing: string[];
    };
    expect(state.values.customerName).toBe("Ana Torres");
    expect(state.values.customerEmail).toBe("ana@example.com");
    expect(state.missing).not.toContain("customerName");
    expect(state.missing).not.toContain("customerContactHandle");
  });

  it("reaches the owner's configured tone in the system prompt", async () => {
    await testDb
      .update(businesses)
      .set({ aiAgentConfig: { tone: "professional" } })
      .where(eq(businesses.id, ids.businessId));

    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello.")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Hi",
      }),
    );

    // AI SDK v6 delivers the system prompt as prompt entries (not a top-level
    // `system` field), so assert on the serialized prompt the model received.
    const promptText = modelPromptText(model);
    expect(promptText).toContain("business-like");
    expect(promptText).not.toContain("warm, approachable");
  });

  it("reaches Business Instructions in the system prompt", async () => {
    await testDb
      .update(businesses)
      .set({
        aiAgentConfig: {
          tone: "friendly",
          instructions:
            "We quote by square footage and never promise same-day service.",
        },
      })
      .where(eq(businesses.id, ids.businessId));

    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello.")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Hi",
      }),
    );

    const promptText = modelPromptText(model);
    expect(promptText).toContain("BUSINESS GUIDANCE");
    expect(promptText).toContain("We quote by square footage");
  });

  it("omits the Business Instructions block when none are configured", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello.")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Hi",
      }),
    );

    expect(modelPromptText(model)).not.toContain("BUSINESS GUIDANCE");
  });

  it("a scripted propose_inquiry call stages a proposal and creates no inquiry", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([
      toolCallTurn("propose_inquiry", "call_1", {
        customerName: "Sam Rivera",
        customerContactMethod: "email",
        customerContactHandle: "sam@example.com",
        customerEmail: "sam@example.com",
        serviceCategory: "Banners",
        details: "Two vinyl banners for a weekend sale.",
      }),
      textTurn("Review what I'll send below."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await runAgent({
      sessionToken: session.publicToken,
      userMessage: "Please file it: Sam Rivera, sam@example.com, banners, two vinyl banners for a weekend sale.",
    });
    const body = await readStreamText(response);
    expect(body).toContain("Review what I'll send below.");

    // No Inquiry row — the model lost commit authority.
    const { inquiries } = await import("@/lib/db/schema");
    const rows = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.businessId, ids.businessId));
    expect(
      rows.find((row) => row.customerEmail === "sam@example.com"),
    ).toBeUndefined();

    // A staged Proposed Inquiry sits on the session; the session itself is
    // unchanged until approval completes it.
    const [stored] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, session.sessionId));
    expect(stored.status).toBe("active");
    expect(stored.inquiryId).toBeNull();
    const state = stored.state as {
      proposedInquiry?: {
        id: string;
        values: Record<string, unknown>;
        status: string;
      } | null;
    };
    expect(state.proposedInquiry).toMatchObject({
      id: expect.any(String),
      status: "pending",
      values: expect.objectContaining({
        customerName: "Sam Rivera",
        serviceCategory: "Banners",
      }),
    });
  });

  it("a second proposing turn supersedes the first; the session holds one proposal", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const first = mockModelForTurns([
      toolCallTurn("propose_inquiry", "call_1", {
        customerName: "Sam Rivera",
        customerContactMethod: "email",
        customerContactHandle: "sam@example.com",
        serviceCategory: "Banners",
        details: "Two vinyl banners.",
      }),
      textTurn("First draft."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(first as never);
    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Sam Rivera, sam@example.com, banners, two vinyl banners.",
      }),
    );

    const second = mockModelForTurns([
      toolCallTurn("propose_inquiry", "call_2", {
        customerName: "Sam Rivera",
        customerContactMethod: "email",
        customerContactHandle: "sam@example.com",
        serviceCategory: "Banners",
        details: "Three vinyl banners.",
      }),
      textTurn("Revised."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(second as never);
    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Actually make it three banners.",
      }),
    );

    const [stored] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, session.sessionId));
    const state = stored.state as {
      proposedInquiry?: { id: string; values: { details: string } } | null;
    };
    expect(state.proposedInquiry?.values.details).toContain("Three");
  });

  it("card values sent with a chat request persist before the model runs", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const proposing = mockModelForTurns([
      toolCallTurn("propose_inquiry", "call_1", {
        customerName: "Sam Rivera",
        customerContactMethod: "email",
        customerContactHandle: "sam@example.com",
        serviceCategory: "Banners",
        details: "Two vinyl banners.",
      }),
      textTurn("Draft ready."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(proposing as never);
    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Sam Rivera, sam@example.com, banners, two vinyl banners.",
      }),
    );

    const followUp = mockModelForTurns([textTurn("Noted.")]);
    vi.mocked(registry.languageModel).mockReturnValue(followUp as never);
    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "Actually the budget is closer to 2,000.",
        proposedInquiryValues: { budgetText: "closer to 2,000" },
      }),
    );

    const [stored] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, session.sessionId));
    const state = stored.state as {
      proposedInquiry?: { values: Record<string, unknown> } | null;
    };
    expect(state.proposedInquiry?.values).toMatchObject({
      budgetText: "closer to 2,000",
    });

    const { firstModelCall } = await import("@/tests/support/mock-model");
    const call = firstModelCall(followUp);
    expect(JSON.stringify(call.system)).toContain("closer to 2,000");
  });

  it("marks the run failed when the stream throws immediately", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("unreachable")]);
    model.doStream = async () => {
      throw new Error("Provider unavailable");
    };
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await expect(
      runAgent({ sessionToken: session.publicToken, userMessage: "Hi" }),
    ).rejects.toThrow("Provider unavailable");

    const latestRun = await testDb.query.aiAgentRuns.findFirst({
      where: (runs, { eq: rawEq }) => rawEq(runs.sessionId, session.sessionId),
      orderBy: (runs, { desc }) => [desc(runs.startedAt)],
    });

    expect(latestRun).toMatchObject({ status: "failed" });
    expect(latestRun?.error).toBe("Provider unavailable");
  });

  it("tells the model to use the services and business-info tools", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([
      textTurn("We do branding, web, and marketing design."),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "What services do you offer?",
      }),
    );

    // AI SDK v6 delivers the system prompt as prompt entries (not a top-level
    // `system` field), so assert on the serialized prompt the model received.
    const recorded = model.doStreamCalls[0] as unknown as {
      prompt?: unknown;
    };
    const promptText = JSON.stringify(recorded.prompt);
    expect(promptText).toContain("get_services");
    expect(promptText).toContain("get_business_info");
  });

  it("recovers when the first candidate fails and attributes the serving model", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Recovered via fallback.")]);
    const serveScripted = model.doStream.bind(model);
    let doStreamCalls = 0;
    model.doStream = (async (
      options: Parameters<typeof serveScripted>[0],
    ) => {
      doStreamCalls += 1;
      if (doStreamCalls === 1) throw new Error("first candidate refused");
      return serveScripted(options);
    }) as typeof model.doStream;
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const body = await readStreamText(
      await runAgent({
        sessionToken: session.publicToken,
        userMessage: "What services do you offer?",
      }),
    );
    expect(body).toContain("Recovered via fallback.");

    const latestRun = await testDb.query.aiAgentRuns.findFirst({
      where: (runs, { eq: rawEq }) => rawEq(runs.sessionId, session.sessionId),
      orderBy: (runs, { desc }) => [desc(runs.startedAt)],
    });

    // A recovered turn ends clean: completed, no error text, and the run
    // names the model that actually served it rather than the first
    // candidate that refused.
    expect(latestRun).toMatchObject({
      status: "completed",
      error: null,
      model: "openai/gpt-oss-120b",
      provider: "groq",
    });
    const metadata = latestRun?.metadata as {
      servingModelId?: string;
      attemptTrail?: Array<{ modelId: string }>;
    };
    expect(metadata.servingModelId).toBe("groq:openai/gpt-oss-120b");
    expect(metadata.attemptTrail?.map((t) => t.modelId)).toEqual([
      "groq:openai/gpt-oss-20b",
    ]);

    const history = await loadConversationHistory(session.sessionId);
    expect(history.at(-1)).toMatchObject({
      role: "assistant",
      content: "Recovered via fallback.",
      provider: "groq",
      model: "openai/gpt-oss-120b",
    });
  });
});
