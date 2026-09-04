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
import { selectModels } from "@/lib/ai/capacity-selector";
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
    vi.mocked(selectModels).mockResolvedValue(["mock:model"]);
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
    const model = mockModelForTurns([textTurn("Hello there!")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

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

    // Behavioural assertion through the seam: the model saw the message.
    const call = firstModelCall(model);
    expect(call.messages).toEqual([
      { role: "user", content: "What do you offer?" },
    ]);
  });

  it("accepts the legacy content shape", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const model = mockModelForTurns([textTurn("Hi!")]);
    vi.mocked(registry.languageModel).mockReturnValue(model as never);

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

  it("maps an unavailable model to a 503 response", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    vi.mocked(selectModels).mockResolvedValueOnce([]);

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

    // The stream starts before the provider throws, so the failure surfaces
    // inside the stream — and is recorded on the run.
    expect(response.status).toBe(200);
    await response.text();

    const latestRun = await testDb.query.aiAgentRuns.findFirst({
      where: (runs, { eq: rawEq }) => rawEq(runs.sessionId, session.sessionId),
      orderBy: (runs, { desc }) => [desc(runs.startedAt)],
    });
    expect(latestRun).toMatchObject({ status: "failed" });
  });
});
