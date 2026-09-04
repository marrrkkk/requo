import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import { aiAgentSessions, inquiries } from "@/lib/db/schema";

import { testDb, closeTestDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";
import { createActiveAgentSession, createAgentToolContext, runAgentTool } from "@/tests/support/ai-agent";

const prefix = "test_multi_inquiry";
let ids: WorkflowFixtureIds;

describe("customer agent multi-inquiry", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("allows creating multiple inquiries in one session", async () => {
    const { sessionId, publicToken } = await createActiveAgentSession(ids.businessId);

    // Import the tool
    const { createInquiryTool } = await import("@/features/ai-agent/tools/create-inquiry");

    // Create tool context
    const context = await createAgentToolContext(publicToken);

    // Create first inquiry
    const result1 = await runAgentTool<{ inquiryId: string; message: string }>(
      createInquiryTool,
      {
        customerName: "John Smith",
        customerEmail: "john@example.com",
        customerContactMethod: "email",
        customerContactHandle: "john@example.com",
        serviceCategory: "Website Development",
        details: "Need an e-commerce site",
      },
      { experimental_context: context } as any,
    );

    expect(result1.inquiryId).toBeDefined();
    expect(result1.message).toContain("Is there anything else");

    // Reload context for second inquiry
    const context2 = await createAgentToolContext(publicToken);

    const result2 = await runAgentTool<{ inquiryId: string; message: string }>(
      createInquiryTool,
      {
        customerName: "John Smith",
        customerEmail: "john@example.com",
        customerContactMethod: "email",
        customerContactHandle: "john@example.com",
        serviceCategory: "Mobile App Development",
        details: "Need a mobile app for my bakery",
      },
      { experimental_context: context2 } as any,
    );

    expect(result2.inquiryId).toBeDefined();
    expect(result2.inquiryId).not.toBe(result1.inquiryId);

    // Verify both inquiries exist
    const allInquiries = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.businessId, ids.businessId));

    const sessionInquiries = allInquiries.filter(
      (inq) =>
        inq.id === result1.inquiryId || inq.id === result2.inquiryId,
    );

    expect(sessionInquiries).toHaveLength(2);
    expect(sessionInquiries[0].source).toBe("ai_agent");
    expect(sessionInquiries[1].source).toBe("ai_agent");
  });

  it("tracks all created inquiry IDs in session metadata", async () => {
    const { sessionId, publicToken } = await createActiveAgentSession(ids.businessId);

    const { createInquiryTool } = await import("@/features/ai-agent/tools/create-inquiry");

    const context = await createAgentToolContext(publicToken);

    // Create first inquiry
    const result1 = await runAgentTool<{ inquiryId: string; message: string }>(
      createInquiryTool,
      {
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerContactMethod: "email",
        customerContactHandle: "jane@example.com",
        serviceCategory: "Consulting",
        details: "Need business consulting",
      },
      { experimental_context: context } as any,
    );

    // Reload and create second
    const context2 = await createAgentToolContext(publicToken);

    const result2 = await runAgentTool<{ inquiryId: string; message: string }>(
      createInquiryTool,
      {
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerContactMethod: "email",
        customerContactHandle: "jane@example.com",
        serviceCategory: "Training",
        details: "Need staff training",
      },
      { experimental_context: context2 } as any,
    );

    // Check metadata tracks both
    const finalSession = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, sessionId))
      .limit(1);

    const metadata = finalSession[0].metadata as any;
    expect(metadata.createdInquiryIds).toContain(result1.inquiryId);
    expect(metadata.createdInquiryIds).toContain(result2.inquiryId);
    expect(metadata.lastCreatedInquiryId).toBe(result2.inquiryId);
  });

  it("session status is completed after inquiry creation", async () => {
    const { sessionId, publicToken } = await createActiveAgentSession(ids.businessId);

    const { createInquiryTool } = await import("@/features/ai-agent/tools/create-inquiry");

    const context = await createAgentToolContext(publicToken);

    await runAgentTool<{ inquiryId: string; message: string }>(
      createInquiryTool,
      {
        customerName: "Test User",
        customerEmail: "test@example.com",
        customerContactMethod: "email",
        customerContactHandle: "test@example.com",
        serviceCategory: "General",
        details: "Test inquiry",
      },
      { experimental_context: context } as any,
    );

    // A session that reached its goal is completed, never swept to abandoned.
    const [session] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, sessionId))
      .limit(1);

    expect(session.status).toBe("completed");
    expect(session.completedAt).toBeInstanceOf(Date);
  });
});
