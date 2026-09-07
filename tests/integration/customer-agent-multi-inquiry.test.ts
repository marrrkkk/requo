import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

const unified = vi.hoisted(() => ({
  qualifyInquiry: vi.fn(async () => ({})),
  enqueueAiDraftQuoteOnQualify: vi.fn(async () => ({})),
  maybeSendInquiryAckEmail: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/features/inquiries/qualification/qualify-inquiry", () => ({
  qualifyInquiry: unified.qualifyInquiry,
}));

vi.mock("@/features/inquiries/defaults", () => ({
  enqueueAiDraftQuoteOnQualify: unified.enqueueAiDraftQuoteOnQualify,
  maybeSendInquiryAckEmail: unified.maybeSendInquiryAckEmail,
}));

vi.mock("@/lib/public-action-rate-limit", () => ({
  assertPublicActionRateLimit: vi.fn(async () => true),
  getPublicActionClientIpAddress: vi.fn(() => "203.0.113.50"),
}));

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

async function proposeAndApprove(
  publicToken: string,
  values: Record<string, unknown>,
) {
  const { proposeInquiryTool } = await import(
    "@/features/ai-agent/tools/propose-inquiry"
  );
  const { approveAgentProposalAction } = await import(
    "@/features/ai-agent/actions"
  );

  const context = await createAgentToolContext(publicToken);
  const proposed = await runAgentTool<{
    proposal: { id: string; values: Record<string, unknown> };
    message: string;
  }>(
    proposeInquiryTool,
    values,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { experimental_context: context } as any,
  );

  const approved = await approveAgentProposalAction({
    sessionToken: publicToken,
    values: proposed.proposal.values,
    proposalId: proposed.proposal.id,
  });

  if (!approved.success) {
    throw new Error(`Approval failed: ${approved.error}`);
  }

  return approved;
}

describe("customer agent multi-inquiry (approval-gated)", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("allows creating multiple inquiries in one session, each with its own approval", async () => {
    const { publicToken } = await createActiveAgentSession(ids.businessId);

    // Each proposal stages exactly one card and commits nothing until approved.
    const result1 = await proposeAndApprove(publicToken, {
      customerName: "John Smith",
      customerEmail: "john@example.com",
      customerContactMethod: "email",
      customerContactHandle: "john@example.com",
      serviceCategory: "Website Development",
      details: "Need an e-commerce site",
    });

    expect(result1.inquiryId).toBeDefined();

    const result2 = await proposeAndApprove(publicToken, {
      customerName: "John Smith",
      customerEmail: "john@example.com",
      customerContactMethod: "email",
      customerContactHandle: "john@example.com",
      serviceCategory: "Mobile App Development",
      details: "Need a mobile app for my bakery",
    });

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

    const result1 = await proposeAndApprove(publicToken, {
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerContactMethod: "email",
      customerContactHandle: "jane@example.com",
      serviceCategory: "Consulting",
      details: "Need business consulting",
    });

    const result2 = await proposeAndApprove(publicToken, {
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerContactMethod: "email",
      customerContactHandle: "jane@example.com",
      serviceCategory: "Training",
      details: "Need staff training",
    });

    // Check metadata tracks both
    const finalSession = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, sessionId))
      .limit(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = finalSession[0].metadata as any;
    expect(metadata.createdInquiryIds).toContain(result1.inquiryId);
    expect(metadata.createdInquiryIds).toContain(result2.inquiryId);
    expect(metadata.lastCreatedInquiryId).toBe(result2.inquiryId);
  });

  it("session status is completed after approval", async () => {
    const { sessionId, publicToken } = await createActiveAgentSession(ids.businessId);

    await proposeAndApprove(publicToken, {
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerContactMethod: "email",
      customerContactHandle: "test@example.com",
      serviceCategory: "General",
      details: "Test inquiry",
    });

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
