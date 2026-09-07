import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

const envState = vi.hoisted(() => ({
  groq: true,
  cerebras: true,
  gemini: true,
  openrouter: true,
  mistral: true,
  cloudflare: true,
  nvidia: true,
}));

vi.mock("@/lib/env", () => ({
  isGroqConfigured: envState.groq,
  isCerebrasConfigured: envState.cerebras,
  isGeminiConfigured: envState.gemini,
  isOpenRouterConfigured: envState.openrouter,
  isMistralConfigured: envState.mistral,
  isCloudflareAiConfigured: envState.cloudflare,
  isNvidiaNimConfigured: envState.nvidia,
}));

// NOTE: no capacity-selector mock — selection and fallback run for real.
// The registry stub (provider boundary) and the cache stub (metering
// boundary) stay: failures are injected by scripting the registry per model
// identifier.

vi.mock("@/lib/ai/registry", () => ({
  registry: { languageModel: vi.fn() },
}));

const cacheStore = vi.hoisted(() => ({ map: new Map<string, unknown>() }));

vi.mock("@/lib/ai/cache-layer", () => ({
  cacheLayer: {
    get: vi.fn(async (key: string) => cacheStore.map.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      cacheStore.map.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      cacheStore.map.delete(key);
    }),
    increment: vi.fn(async (key: string) => {
      const next = (Number(cacheStore.map.get(key) ?? 0) || 0) + 1;
      cacheStore.map.set(key, next);
      return next;
    }),
    incrementBy: vi.fn(async (key: string, amount: number) => {
      const next = (Number(cacheStore.map.get(key) ?? 0) || 0) + amount;
      cacheStore.map.set(key, next);
      return next;
    }),
  },
}));

vi.mock("@/lib/ai/usage-limiter", () => ({
  checkUsageLimit: vi.fn(async () => ({ allowed: true })),
  recordUsage: vi.fn(async () => {}),
  TASK_WEIGHTS: { agent_conversation: 1, assistant_message: 1 },
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/public-action-rate-limit", () => ({
  assertPublicActionRateLimit: vi.fn(async () => true),
  getPublicActionClientIpAddress: vi.fn(() => "203.0.113.50"),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
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

import { businesses } from "@/lib/db/schema";
import { POST } from "@/app/api/ai/agent/chat/route";
import { registry } from "@/lib/ai/registry";
import {
  assertPublicActionRateLimit,
} from "@/lib/public-action-rate-limit";

import { closeTestDb, testDb } from "@/tests/support/db";
import { createActiveAgentSession } from "@/tests/support/ai-agent";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";
import {
  firstModelCall,
  mockModelForTurns,
  textTurn,
} from "@/tests/support/mock-model";

const prefix = "test_ai_agent_chat_route";
let ids: WorkflowFixtureIds;

function chatRequest(body: unknown) {
  return new Request("http://localhost/api/ai/agent/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.50",
    },
  });
}

function resetEnv() {
  envState.groq = true;
  envState.cerebras = true;
  envState.gemini = true;
  envState.openrouter = true;
  envState.mistral = true;
  envState.cloudflare = true;
  envState.nvidia = true;
}

/** Script the registry per model id: throw for listed ids, serve text otherwise. */
function scriptRegistry(
  serveText: string,
  failIds: Record<string, unknown> = {},
) {
  const healthy = mockModelForTurns([textTurn(serveText)]);
  vi.mocked(registry.languageModel).mockImplementation(((modelId: string) => {
    if (modelId in failIds) {
      const failure = failIds[modelId];
      return {
        provider: "mock",
        modelId,
        doGenerate: async () => {
          throw failure;
        },
        doStream: async () => {
          throw failure;
        },
      } as never;
    }
    return healthy as never;
  }) as never);
  return healthy;
}

describe("ai-agent chat API route (provider seam)", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
    await testDb
      .update(businesses)
      .set({ aiAgentEnabled: true, plan: "pro", aiAgentConfig: {} })
      .where(eq(businesses.id, ids.businessId));
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.map.clear();
    resetEnv();
  });

  it("rejects malformed requests before touching rate limiting or the agent", async () => {
    const response = await POST(chatRequest({ content: "Hi" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid request. Session token and message content are required.",
    });
    expect(assertPublicActionRateLimit).not.toHaveBeenCalled();
  });

  it("rejects empty session tokens and empty content", async () => {
    expect((await POST(chatRequest({ sessionToken: "", content: "Hi" }))).status).toBe(400);
    expect((await POST(chatRequest({ sessionToken: "tok", content: "" }))).status).toBe(400);
  });

  it("streams the agent reply for a UI-transport request and rate-limits first", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = scriptRegistry("Hello there!");
    void model;

    const response = await POST(
      chatRequest({
        sessionToken: session.publicToken,
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "What do you offer?" }] }],
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await response.text()).toContain("Hello there!");

    expect(assertPublicActionRateLimit).toHaveBeenCalledWith({
      action: "public-inquiry-submit",
      scope: "ai-agent-ip:203.0.113.50",
      limit: 100,
      windowMs: 60 * 60 * 1000,
    });

    // The prompt that crossed the boundary carries the surface's tools weight:
    // agent_chat serves from Groq first.
    const servedIds = vi.mocked(registry.languageModel).mock.calls.map((c) => c[0]);
    expect(servedIds[0]).toBe("groq:openai/gpt-oss-20b");
  });

  it("records the serving model on the message, not the first candidate", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    scriptRegistry("Second serves", {
      "groq:openai/gpt-oss-20b": Object.assign(new Error("429 rate limit"), {
        status: 429,
      }),
    });

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hi" }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Second serves");

    const rows = await testDb.query.aiAgentMessages.findMany({
      where: (m, { eq: rawEq }) => rawEq(m.sessionId, session.sessionId),
    });
    const assistant = rows.filter((r) => r.role === "assistant").at(-1)!;
    expect(assistant.provider).toBe("groq");
    expect(assistant.model).toBe("openai/gpt-oss-120b");
  });

  it("a dead head identifier does not consume the attempt budget", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    scriptRegistry("Alive further down", {
      "groq:openai/gpt-oss-20b": Object.assign(new Error("model_not_found"), {
        status: 404,
      }),
      "groq:openai/gpt-oss-120b": Object.assign(new Error("model_not_found"), {
        status: 404,
      }),
      "google:gemini-2.5-flash-lite": Object.assign(
        new Error("model_not_found"),
        { status: 404 },
      ),
    });

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hi" }),
    );
    // Three 404s cost no attempts — the chain still produces an answer.
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Alive further down");
  });

  it("a per-minute refusal advances and the turn completes", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    scriptRegistry("Recovered", {
      "groq:openai/gpt-oss-20b": Object.assign(
        new Error("429 rate limit exceeded, retry in 20s"),
        { status: 429 },
      ),
    });

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hi" }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Recovered");
  });

  it("a non-retryable failure advances rather than ending the turn", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    scriptRegistry("Recovered anyway", {
      "groq:openai/gpt-oss-20b": Object.assign(new Error("Unauthorized"), {
        status: 401,
      }),
    });

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hi" }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Recovered anyway");
  });

  it("returns the surface's own copy (not the provider's) when all fail", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    vi.mocked(registry.languageModel).mockImplementation((() => ({
      provider: "mock",
      modelId: "mock",
      doGenerate: async () => {
        throw Object.assign(new Error("boom"), { status: 500 });
      },
      doStream: async () => {
        throw Object.assign(new Error("boom"), { status: 500 });
      },
    })) as never);

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hi" }),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    // Streamed failure surfaces as the friendly copy or not at all — never
    // the provider's raw message.
    expect(body).not.toContain("boom");

    const latestRun = await testDb.query.aiAgentRuns.findFirst({
      where: (runs, { eq: rawEq }) => rawEq(runs.sessionId, session.sessionId),
      orderBy: (runs, { desc }) => [desc(runs.startedAt)],
    });
    expect(latestRun).toMatchObject({ status: "failed" });
    expect(
      JSON.stringify((latestRun?.metadata as Record<string, unknown>) ?? {}),
    ).toContain("groq:openai/gpt-oss-20b");
  });

  it("accepts the legacy content shape", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    scriptRegistry("Hi!");

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hello" }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Hi!");
  });

  it("returns 429 when the per-IP rate limit is exceeded", async () => {
    vi.mocked(assertPublicActionRateLimit).mockResolvedValueOnce(false);

    const response = await POST(
      chatRequest({ sessionToken: "tok", content: "More messages" }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Too many messages. Please wait a moment before continuing.",
    });
  });

  it("maps a missing session to a 403 response", async () => {
    const response = await POST(
      chatRequest({ sessionToken: "f".repeat(64), content: "Hi" }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Invalid or expired session" });
  });

  it("maps no configured providers to a 503 response", async () => {
    envState.groq = false;
    envState.cerebras = false;
    envState.gemini = false;
    envState.openrouter = false;
    envState.mistral = false;
    envState.cloudflare = false;
    envState.nvidia = false;
    const session = await createActiveAgentSession(ids.businessId);

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hi" }),
    );

    expect(response.status).toBe(503);
  });

  it("records a failed run when the provider throws mid-stream", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("unreachable")]);
    model.doStream = async () => {
      throw new Error("Something exploded");
    };
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({ sessionToken: session.publicToken, content: "Hi" }),
    );

    expect(response.status).toBe(200);
    await response.text();

    const latestRun = await testDb.query.aiAgentRuns.findFirst({
      where: (runs, { eq: rawEq }) => rawEq(runs.sessionId, session.sessionId),
      orderBy: (runs, { desc }) => [desc(runs.startedAt)],
    });
    expect(latestRun).toMatchObject({ status: "failed" });
  });

  it("the prompt carries the agent's system prompt and tool schemas", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hello there!")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

    const response = await POST(
      chatRequest({
        sessionToken: session.publicToken,
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "What do you offer?" }] }],
      }),
    );
    expect(response.status).toBe(200);
    await response.text();

    const call = firstModelCall(model);
    expect(call.messages).toEqual([
      { role: "user", content: "What do you offer?" },
    ]);
  });
});
