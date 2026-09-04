import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import { aiAgentMessages, aiAgentSessions } from "@/lib/db/schema";

import {
  completeSession,
  expireAbandonedSessions,
  getSessionCountForBusiness,
  loadSessionById,
  loadSessionByToken,
  requestSessionHandoff,
  updateSessionMetadata,
  updateSessionState,
} from "@/features/ai-agent/session-service";
import {
  addAgentMessage,
  buildAiSdkMessages,
  countSessionMessages,
  countSessionMessagesByRole,
  loadConversationHistory,
  loadRecentMessages,
} from "@/features/ai-agent/message-service";

import { closeTestDb, testDb } from "@/tests/support/db";
import { createActiveAgentSession } from "@/tests/support/ai-agent";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_ai_agent_sessions";
let ids: WorkflowFixtureIds;

describe("ai-agent sessions & messages", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  describe("ai-agent session lifecycle", () => {
    it("creates an active session with initial qualification state and 24h expiry", async () => {
    const result = await createActiveAgentSession(ids.businessId);

    expect(result.sessionId).toMatch(/^ags_/);
    expect(result.publicToken).toMatch(/^[0-9a-f]{64}$/);
    expect(result.expiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);

    const [session] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, result.sessionId));

    expect(session).toMatchObject({
      id: result.sessionId,
      businessId: ids.businessId,
      status: "active",
      inquiryId: null,
    });

    expect(session.state).toEqual({
      collected: {},
      values: {},
      missing: ["customerName", "customerContactMethod", "customerContactHandle", "serviceCategory", "details"],
    });
    expect(session.completedAt).toBeNull();
  });

  it("loads a session by token with its business context", async () => {
    const result = await createActiveAgentSession(ids.businessId);
    const sessionData = await loadSessionByToken(result.publicToken);

    expect(sessionData).not.toBeNull();
    expect(sessionData?.id).toBe(result.sessionId);
    expect(sessionData?.business).toMatchObject({
      id: ids.businessId,
      slug: ids.businessSlug,
      plan: "pro",
    });
    expect(sessionData?.business.aiAgentEnabled).toBe(false);
  });

  it("returns null for unknown or expired sessions", async () => {
    expect(await loadSessionByToken("f".repeat(64))).toBeNull();

    const result = await createActiveAgentSession(ids.businessId);
    await testDb
      .update(aiAgentSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(aiAgentSessions.id, result.sessionId));

    expect(await loadSessionByToken(result.publicToken)).toBeNull();
  });

  it("persists updated qualification state and metadata", async () => {
    const result = await createActiveAgentSession(ids.businessId);

    await updateSessionState({
      sessionId: result.sessionId,
      state: {
        collected: { customerName: true, serviceCategory: true },
        values: { customerName: "Taylor Nguyen", serviceCategory: "Window graphics" },
        missing: ["customerContactMethod", "customerContactHandle", "details"],
      },
    });

    await updateSessionMetadata({
      sessionId: result.sessionId,
      metadata: { searchAttempts: 2, customRef: "kept" },
    });

    const [updated] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, result.sessionId));

    expect(updated.state).toEqual({
      collected: { customerName: true, serviceCategory: true },
      values: { customerName: "Taylor Nguyen", serviceCategory: "Window graphics" },
      missing: ["customerContactMethod", "customerContactHandle", "details"],
    });
    expect(updated.metadata).toEqual({ searchAttempts: 2, customRef: "kept" });
  });

  it("completes a session by linking it to an inquiry", async () => {
    const result = await createActiveAgentSession(ids.businessId);

    await completeSession({
      sessionId: result.sessionId,
      inquiryId: ids.inquiryId,
    });

    const [session] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, result.sessionId));

    expect(session.status).toBe("completed");
    expect(session.inquiryId).toBe(ids.inquiryId);
    expect(session.completedAt).toBeInstanceOf(Date);
  });

  it("marks a session for human handoff with reason and recommendation", async () => {
    const result = await createActiveAgentSession(ids.businessId);

    await requestSessionHandoff({
      sessionId: result.sessionId,
      reason: "Customer asked to speak with a person.",
      recommendation: "Customer message: Can someone call me?",
    });

    const [session] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, result.sessionId));

    expect(session.status).toBe("human_handoff");
    expect(session.metadata).toMatchObject({
      handoffReason: "Customer asked to speak with a person.",
      handoffRecommendation: "Customer message: Can someone call me?",
    });
    expect(session.completedAt).toBeInstanceOf(Date);
  });

  it("throws for handoffs on unknown sessions", async () => {
    await expect(
      requestSessionHandoff({
        sessionId: `${prefix}_missing_session`,
        reason: "No session exists.",
      }),
    ).rejects.toThrow("Session not found");
  });

  it("expires only active sessions that are past their expiry", async () => {
    const activeExpired = await createActiveAgentSession(ids.businessId);
    const activeFresh = await createActiveAgentSession(ids.businessId);

    await testDb
      .update(aiAgentSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(aiAgentSessions.id, activeExpired.sessionId));

    const count = await expireAbandonedSessions();

    expect(count).toBeGreaterThanOrEqual(1);

    const [expired] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, activeExpired.sessionId));
    const [fresh] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, activeFresh.sessionId));

    expect(expired.status).toBe("abandoned");
    expect(fresh.status).toBe("active");
  });

  it("counts sessions per business with optional status filter", async () => {
    const totalBefore = await getSessionCountForBusiness({ businessId: ids.businessId });
    const completedBefore = await getSessionCountForBusiness({
      businessId: ids.businessId,
      status: "completed",
    });
    const activeBefore = await getSessionCountForBusiness({
      businessId: ids.businessId,
      status: "active",
    });

    await createActiveAgentSession(ids.businessId);
    const sessionB = await createActiveAgentSession(ids.businessId);
    await completeSession({ sessionId: sessionB.sessionId, inquiryId: ids.inquiryId });

    expect(
      await getSessionCountForBusiness({ businessId: ids.businessId }),
    ).toBe(totalBefore + 2);
    expect(
      await getSessionCountForBusiness({ businessId: ids.businessId, status: "active" }),
    ).toBe(activeBefore + 1);
    expect(
      await getSessionCountForBusiness({ businessId: ids.businessId, status: "completed" }),
    ).toBe(completedBefore + 1);
    expect(
      await getSessionCountForBusiness({ businessId: ids.otherBusinessId }),
    ).toBe(0);
  });

  it("loads a session by id for internal use", async () => {
    const result = await createActiveAgentSession(ids.businessId);

    expect((await loadSessionById(result.sessionId))?.id).toBe(result.sessionId);
    expect(await loadSessionById("does-not-exist")).toBeNull();
  });
  });

  describe("ai-agent message service", () => {
  let sessionId: string;

  beforeAll(async () => {
    const result = await createActiveAgentSession(ids.businessId);
    sessionId = result.sessionId;
  }, 30_000);

  async function addMessages() {
    // Insert sequentially so createdAt is monotonic; concurrent inserts can
    // tie at millisecond resolution and make chronological ordering flaky.
    return [
      await addAgentMessage({
        sessionId,
        role: "user",
        content: "I need window graphics.",
        metadata: { latencyMs: 10 },
      }),
      await addAgentMessage({
        sessionId,
        role: "tool",
        content: '{"found":false}',
        toolName: "search_knowledge",
        toolCallId: "call_seek",
      }),
      await addAgentMessage({
        sessionId,
        role: "assistant",
        content: "Sure, what size?",
        metadata: { inputTokens: 12, outputTokens: 8 },
      }),
      await addAgentMessage({
        sessionId,
        role: "system",
        content: "ignored by history",
      }),
    ];
  }

  it("adds messages with role and metadata", async () => {
    const [message] = await addMessages();

    expect(message.sessionId).toBe(sessionId);
    expect(message.id).toMatch(/^agm_/);
    expect(message.role).toBe("user");
    expect(message.content).toBe("I need window graphics.");
    expect(message.metadata).toEqual({ latencyMs: 10 });
    expect(message.toolName).toBeNull();
    expect(message.toolCallId).toBeNull();
  });

  it("stores tool messages with tool context", async () => {
    await addAgentMessage({
      sessionId,
      role: "tool",
      content: "{}",
      toolName: "get_services",
      toolCallId: "call_services",
    });

    const messages = await loadConversationHistory(sessionId);
    const toolMessage = messages.find((m) => m.toolCallId === "call_services");

    expect(toolMessage).toMatchObject({
      role: "tool",
      toolName: "get_services",
      toolCallId: "call_services",
    });
    expect(toolMessage?.content).toBe("{}");
  });

  it("loads conversation history in chronological order with limit/offset", async () => {
    const messages = await loadConversationHistory(sessionId);
    const createdAt = messages.map((m) => m.createdAt.getTime());

    expect([...createdAt].sort((a, b) => a - b)).toEqual(createdAt);

    const limited = await loadConversationHistory(sessionId, { limit: 2 });
    expect(limited).toHaveLength(2);
    expect(limited[0].content).toBe(messages[0].content);

    const offset = await loadConversationHistory(sessionId, { offset: 2 });
    expect(offset[0].content).toBe(messages[2].content);
  });

  it("loads recent messages newest-first then returns chronological order", async () => {
    const recent = await loadRecentMessages(sessionId, 3);
    const chronological = await loadConversationHistory(sessionId);

    expect(recent).toEqual(chronological.slice(-3));
  });

  it("counts messages overall and by role", async () => {
    const total = await countSessionMessages(sessionId);
    const userCount = await countSessionMessagesByRole(sessionId, "user");

    expect(total).toBeGreaterThan(0);
    expect(userCount).toBeGreaterThan(0);

    const roleCounts = await Promise.all(
      ["user", "assistant", "tool", "system"].map((role) =>
        countSessionMessagesByRole(sessionId, role as "user"),
      ),
    );

    expect(roleCounts.reduce((sum, n) => sum + n, 0)).toBe(total);
  });

  it("builds AI SDK messages from user and assistant messages only", async () => {
    const sdk = await buildAiSdkMessages(sessionId);

    expect(sdk.length).toBeGreaterThan(0);
    expect(sdk.every((m) => m.role === "user" || m.role === "assistant")).toBe(true);
    expect(sdk.every((m) => !m.content.includes("ignored by history"))).toBe(true);
    expect(sdk[0]).toMatchObject({ role: "user", content: "I need window graphics." });
  });

  it("does not leak messages from other sessions", async () => {
    const other = await createActiveAgentSession(ids.otherBusinessId);
    await addAgentMessage({
      sessionId: other.sessionId,
      role: "user",
      content: "other business message",
    });

    const sdkMessages = await buildAiSdkMessages(sessionId);
    expect(sdkMessages.some((m) => m.content === "other business message")).toBe(false);
  });

  it("deletes messages when the session business is removed", async () => {
    const temp = await createActiveAgentSession(ids.otherBusinessId);
    await addAgentMessage({
      sessionId: temp.sessionId,
      role: "user",
      content: "cascade test",
    });

    await testDb
      .delete(aiAgentSessions)
      .where(eq(aiAgentSessions.id, temp.sessionId));

    expect(
      await testDb
        .select({ id: aiAgentMessages.id })
        .from(aiAgentMessages)
        .where(eq(aiAgentMessages.sessionId, temp.sessionId)),
    ).toHaveLength(0);
  });
  });
});