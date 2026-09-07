import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import { loadOrCreateSession, addMessage } from "@/features/owner-assistant/session-service";

import { closeTestDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix1 = "test_oa_tenant_a";
const prefix2 = "test_oa_tenant_b";
let idsA: WorkflowFixtureIds;
let idsB: WorkflowFixtureIds;

describe("owner assistant tenant isolation", () => {
  beforeAll(async () => {
    idsA = await createWorkflowFixture(prefix1);
    idsB = await createWorkflowFixture(prefix2);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix1);
    await cleanupWorkflowFixture(prefix2);
    await closeTestDb();
  }, 30_000);

  it("cannot load another business's session", async () => {
    // Create session in Business A
    const sessionA = await loadOrCreateSession({
      businessId: idsA.businessId,
      userId: idsA.ownerUserId,
      userRole: "owner",
      plan: "free",
    });

    await addMessage({
      sessionId: sessionA.sessionId,
      role: "user",
      content: "Business A secret data",
    });

    // Attempt to load Business A's session from Business B's context
    const attemptedLoad = await loadOrCreateSession({
      businessId: idsB.businessId, // Different business
      userId: idsB.ownerUserId, // Different user
      userRole: "owner",
      plan: "free",
      sessionId: sessionA.sessionId, // Try to access A's session
    });

    // Should create new session, not return A's session
    expect(attemptedLoad.sessionId).not.toBe(sessionA.sessionId);
    expect(attemptedLoad.messages).toEqual([]); // No messages from A
  });

  it("cannot load another user's session within same business", async () => {
    // Create session for owner
    const ownerSession = await loadOrCreateSession({
      businessId: idsA.businessId,
      userId: idsA.ownerUserId,
      userRole: "owner",
      plan: "free",
    });

    await addMessage({
      sessionId: ownerSession.sessionId,
      role: "user",
      content: "Owner private data",
    });

    // Attempt to load as staff member (different user, same business)
    const attemptedLoad = await loadOrCreateSession({
      businessId: idsA.businessId, // Same business
      userId: idsA.staffUserId, // Different user
      userRole: "staff",
      plan: "free",
      sessionId: ownerSession.sessionId, // Try to access owner's session
    });

    // Should create new session, not return owner's session
    expect(attemptedLoad.sessionId).not.toBe(ownerSession.sessionId);
    expect(attemptedLoad.messages).toEqual([]);
  });

  it("user can access their own sessions across multiple calls", async () => {
    const session = await loadOrCreateSession({
      businessId: idsA.businessId,
      userId: idsA.ownerUserId,
      userRole: "owner",
      plan: "free",
    });

    await addMessage({
      sessionId: session.sessionId,
      role: "user",
      content: "My data",
    });

    // Load again with correct businessId + userId
    const reloaded = await loadOrCreateSession({
      businessId: idsA.businessId,
      userId: idsA.ownerUserId,
      userRole: "owner",
      plan: "free",
      sessionId: session.sessionId,
    });

    expect(reloaded.sessionId).toBe(session.sessionId);
    expect(reloaded.messages).toHaveLength(1);
    expect(reloaded.messages[0].content).toBe("My data");
  });

  it("listRecentSessions only returns user's own sessions", async () => {
    // Create sessions for both users in Business A
    const ownerSession = await loadOrCreateSession({
      businessId: idsA.businessId,
      userId: idsA.ownerUserId,
      userRole: "owner",
      plan: "free",
    });

    const staffSession = await loadOrCreateSession({
      businessId: idsA.businessId,
      userId: idsA.staffUserId,
      userRole: "staff",
      plan: "free",
    });

    await addMessage({
      sessionId: ownerSession.sessionId,
      role: "user",
      content: "Owner session",
    });

    await addMessage({
      sessionId: staffSession.sessionId,
      role: "user",
      content: "Staff session",
    });

    // List as owner
    const { listRecentSessions } = await import("@/features/owner-assistant/session-service");
    const ownerList = await listRecentSessions({
      businessId: idsA.businessId,
      userId: idsA.ownerUserId,
      limit: 10,
    });

    // Owner should only see their own sessions
    type SessionRow = Awaited<ReturnType<typeof listRecentSessions>>[number];
    const ownerSessionIds = ownerList.map((s: SessionRow) => s.id);
    expect(ownerSessionIds).toContain(ownerSession.sessionId);
    expect(ownerSessionIds).not.toContain(staffSession.sessionId);

    // List as staff
    const staffList = await listRecentSessions({
      businessId: idsA.businessId,
      userId: idsA.staffUserId,
      limit: 10,
    });

    // Staff should only see their own sessions
    const staffSessionIds = staffList.map((s: SessionRow) => s.id);
    expect(staffSessionIds).toContain(staffSession.sessionId);
    expect(staffSessionIds).not.toContain(ownerSession.sessionId);
  });
});
