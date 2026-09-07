import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import { ownerAssistantMessages, ownerAssistantSessions } from "@/lib/db/schema";

import {
  loadOrCreateSession,
  addMessage,
  updateSessionState,
  listRecentSessions,
} from "@/features/owner-assistant/session-service";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_owner_assistant_sessions";
let ids: WorkflowFixtureIds;

describe("owner assistant sessions & messages", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  describe("loadOrCreateSession", () => {
    it("creates a new session when sessionId is not provided", async () => {
      const session = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
      });

      expect(session.sessionId).toMatch(/^oas_/);
      expect(session.businessId).toBe(ids.businessId);
      expect(session.userId).toBe(ids.ownerUserId);
      expect(session.messages).toEqual([]);
      expect(session.state.lastMentioned).toEqual({});
    });

    it("loads existing session when sessionId is provided", async () => {
      // Create a session
      const created = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
      });

      // Add a message
      await addMessage({
        sessionId: created.sessionId,
        role: "user",
        content: "Hello assistant",
      });

      // Load the same session
      const loaded = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
        sessionId: created.sessionId,
      });

      expect(loaded.sessionId).toBe(created.sessionId);
      expect(loaded.messages).toHaveLength(1);
      expect(loaded.messages[0].content).toBe("Hello assistant");
    });

    it("creates new session if provided sessionId does not exist", async () => {
      const session = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
        sessionId: "oas_nonexistent",
      });

      // Should create new session, not fail
      expect(session.sessionId).toMatch(/^oas_/);
      expect(session.sessionId).not.toBe("oas_nonexistent");
    });
  });

  describe("addMessage", () => {
    it("persists a message and updates session timestamp", async () => {
      const session = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
      });

      await addMessage({
        sessionId: session.sessionId,
        role: "user",
        content: "Test message",
      });

      const [message] = await testDb
        .select()
        .from(ownerAssistantMessages)
        .where(eq(ownerAssistantMessages.sessionId, session.sessionId))
        .limit(1);

      expect(message).toBeDefined();
      expect(message.role).toBe("user");
      expect(message.content).toBe("Test message");

      const [updatedSession] = await testDb
        .select()
        .from(ownerAssistantSessions)
        .where(eq(ownerAssistantSessions.id, session.sessionId))
        .limit(1);

      expect(updatedSession.lastMessageAt).toBeDefined();
    });

    it("stores tool metadata for tool messages", async () => {
      const session = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
      });

      await addMessage({
        sessionId: session.sessionId,
        role: "tool",
        content: "Search results",
        toolName: "search_inquiries",
        toolCallId: "call_123",
      });

      const [message] = await testDb
        .select()
        .from(ownerAssistantMessages)
        .where(eq(ownerAssistantMessages.sessionId, session.sessionId))
        .limit(1);

      expect(message.toolName).toBe("search_inquiries");
      expect(message.toolCallId).toBe("call_123");
    });
  });

  describe("updateSessionState", () => {
    it("updates session state JSONB field", async () => {
      const session = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
      });

      await updateSessionState({
        sessionId: session.sessionId,
        state: {
          lastMentioned: {
            inquiryId: "inq_test123",
            quoteId: "quo_test456",
          },
        },
      });

      const [updated] = await testDb
        .select()
        .from(ownerAssistantSessions)
        .where(eq(ownerAssistantSessions.id, session.sessionId))
        .limit(1);

      expect(updated.state).toEqual({
        lastMentioned: {
          inquiryId: "inq_test123",
          quoteId: "quo_test456",
        },
      });
    });
  });

  describe("listRecentSessions", () => {
    it("returns sessions ordered by last message timestamp", async () => {
      // Create two sessions
      const session1 = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
      });

      await addMessage({
        sessionId: session1.sessionId,
        role: "user",
        content: "First session",
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      const session2 = await loadOrCreateSession({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        userRole: "owner",
        plan: "free",
      });

      await addMessage({
        sessionId: session2.sessionId,
        role: "user",
        content: "Second session",
      });

      const recent = await listRecentSessions({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        limit: 10,
      });

      expect(recent.length).toBeGreaterThanOrEqual(2);
      // Most recent should be first
      expect(recent[0].id).toBe(session2.sessionId);
      expect(recent[1].id).toBe(session1.sessionId);
    });

    it("filters by businessId and userId", async () => {
      const sessions = await listRecentSessions({
        businessId: ids.businessId,
        userId: ids.ownerUserId,
        limit: 10,
      });

      // All sessions should belong to the specified business and user
      type SessionRow = Awaited<
        ReturnType<typeof listRecentSessions>
      >[number];

      sessions.forEach((session: SessionRow) => {
        expect(session.businessId).toBe(ids.businessId);
        expect(session.userId).toBe(ids.ownerUserId);
      });
    });
  });
});
