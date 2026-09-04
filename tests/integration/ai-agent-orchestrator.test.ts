import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("@/lib/ai/registry", () => ({
  registry: { languageModel: vi.fn() },
}));

vi.mock("@/lib/ai/capacity-selector", () => ({
  selectModels: vi.fn(async () => ["mock:model"]),
}));

vi.mock("@/lib/ai/usage-limiter", () => ({
  checkUsageLimit: vi.fn(async () => ({ allowed: true })),
  recordUsage: vi.fn(async () => {}),
  TASK_WEIGHTS: { agent_conversation: 1, assistant_message: 1 },
}));

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    incrementBy: vi.fn(async () => {}),
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
import { selectModels } from "@/lib/ai/capacity-selector";
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
    vi.mocked(selectModels).mockResolvedValue(["mock:model"]);
    await enableAgent();
  });

  it("rejects an unknown session token before invoking any AI work", async () => {
    const model = mockModelForTurns([textTurn("Hello")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    await expect(
      runAgent({ sessionToken: "f".repeat(64), userMessage: "Hi" }),
    ).rejects.toThrow("Invalid or expired session");

    expect(selectModels).not.toHaveBeenCalled();
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
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    vi.mocked(selectModels).mockResolvedValueOnce([]);

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
      provider: "mock",
      model: "model",
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
      model: "model",
      provider: "mock",
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

    const call = firstModelCall(model);
    expect(String(call.system)).toContain("business-like");
    expect(String(call.system)).not.toContain("warm, approachable");
  });

  it("a scripted create_inquiry call writes a real inquiry and completes the session", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([
      toolCallTurn("create_inquiry", "call_1", {
        customerName: "Sam Rivera",
        customerContactMethod: "email",
        customerContactHandle: "sam@example.com",
        customerEmail: "sam@example.com",
        serviceCategory: "Banners",
        details: "Two vinyl banners for a weekend sale.",
      }),
      textTurn("Your inquiry is in!"),
    ]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await runAgent({
      sessionToken: session.publicToken,
      userMessage: "Please file it: Sam Rivera, sam@example.com, banners, two vinyl banners for a weekend sale.",
    });
    const body = await readStreamText(response);
    expect(body).toContain("Your inquiry is in!");

    const { inquiries } = await import("@/lib/db/schema");
    const rows = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.businessId, ids.businessId));
    const created = rows.find((row) => row.customerEmail === "sam@example.com");
    expect(created).toMatchObject({
      source: "ai_agent",
      aiAssisted: true,
      escalated: false,
    });

    const [stored] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, session.sessionId));
    expect(stored.status).toBe("completed");
    expect(stored.inquiryId).toBe(created!.id);
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
});
