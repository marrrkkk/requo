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

import {
  activityLogs,
  aiAgentSessions,
  businesses,
  businessNotifications,
  inquiries,
} from "@/lib/db/schema";
import { updateSessionState } from "@/features/ai-agent/session-service";
import { createInquiryTool } from "@/features/ai-agent/tools/create-inquiry";
import { requestHumanHandoffTool } from "@/features/ai-agent/tools/request-human-handoff";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  createActiveAgentSession,
  createAgentToolContext,
  runAgentTool,
} from "@/tests/support/ai-agent";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_ai_agent_inquiry";
let ids: WorkflowFixtureIds;

async function selectInquiry(inquiryId: string) {
  const rows = await testDb
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId));

  return rows[0];
}

describe("ai-agent tools", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  describe("create_inquiry tool", () => {
    it("creates a qualified inquiry, activity, notification, and completes the session", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const context = await createAgentToolContext(session.publicToken);

    const result = await runAgentTool<{ inquiryId: string; message: string }>(
      createInquiryTool,
      {
        customerName: "Taylor Nguyen",
        customerContactMethod: "email",
        customerContactHandle: "taylor+agent@example.com",
        customerEmail: "taylor+agent@example.com",
        serviceCategory: "Storefront signage",
        details: "Two front-window panels and a door decal.",
        budgetText: "$400 - $900",
        requestedDeadline: "2026-06-15",
      },
      { experimental_context: context },
    );

    expect(result).toEqual({
      inquiryId: expect.any(String),
      message: expect.stringContaining("successfully submitted"),
    });

    const stored = await selectInquiry(result.inquiryId);

    expect(stored).toMatchObject({
      businessId: ids.businessId,
      status: "new",
      subject: "Storefront signage",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor+agent@example.com",
      customerContactMethod: "email",
      customerContactHandle: "taylor+agent@example.com",
      serviceCategory: "Storefront signage",
      budgetText: "$400 - $900",
      requestedDeadline: "2026-06-15",
      source: "ai_agent",
      aiAssisted: true,
      escalated: false,
      quoteRequested: true,
    });
    expect(stored?.submittedFieldSnapshot).toMatchObject({ version: 1 });

    const activity = await testDb
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.inquiryId, result.inquiryId));

    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({
      businessId: ids.businessId,
      actorUserId: null,
      type: "inquiry.submitted_ai_agent",
      summary: "Inquiry submitted through AI agent conversation.",
    });

    // notifyInAppOnNewInquiry is enabled on the fixture business.
    const notification = await testDb
      .select()
      .from(businessNotifications)
      .where(eq(businessNotifications.inquiryId, result.inquiryId));

    expect(notification).toHaveLength(1);
    expect(notification[0]).toMatchObject({
      type: "public_inquiry_submitted",
      title: "New inquiry from Taylor Nguyen",
      summary: "Storefront signage",
    });

    const [storedSession] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, session.sessionId));

    expect(storedSession.status).toBe("completed");
    expect(storedSession.inquiryId).toBe(result.inquiryId);
    expect(storedSession.completedAt).toBeInstanceOf(Date);

    expect(unified.qualifyInquiry).toHaveBeenCalledWith({
      inquiryId: result.inquiryId,
      businessId: ids.businessId,
      inquiry: expect.objectContaining({
        customerName: "Taylor Nguyen",
        customerEmail: "taylor+agent@example.com",
        serviceCategory: "Storefront signage",
      }),
    });
    expect(unified.maybeSendInquiryAckEmail).toHaveBeenCalledWith({
      businessId: ids.businessId,
      inquiryId: result.inquiryId,
      customerEmail: "taylor+agent@example.com",
      customerName: "Taylor Nguyen",
      serviceCategory: "Storefront signage",
      details: "Two front-window panels and a door decal.",
    });

    await vi.waitFor(() => {
      expect(unified.enqueueAiDraftQuoteOnQualify).toHaveBeenCalledWith({
        businessId: ids.businessId,
        inquiryId: result.inquiryId,
        qualifiedAt: expect.any(String),
      });
    });
  });

  it("does not create notifications when the business disables in-app alerts", async () => {
    // The fixture's "other" business defaults to in-app alerts enabled; turn
    // them off to exercise the gating path.
    await testDb
      .update(businesses)
      .set({ notifyInAppOnNewInquiry: false })
      .where(eq(businesses.id, ids.otherBusinessId));

    const session = await createActiveAgentSession(ids.otherBusinessId);
    const context = await createAgentToolContext(session.publicToken);

    const result = await runAgentTool<{ inquiryId: string; message: string }>(
      createInquiryTool,
      {
        customerName: "Jordan Lee",
        customerContactMethod: "phone",
        customerContactHandle: "+1 415 555 0123",
        serviceCategory: "Vehicle decals",
        details: "A half-wrap for a van.",
      },
      { experimental_context: context },
    );

    const notifications = await testDb
      .select()
      .from(businessNotifications)
      .where(eq(businessNotifications.inquiryId, result.inquiryId));

    expect(notifications).toHaveLength(0);
    expect((await selectInquiry(result.inquiryId)).businessId).toBe(ids.otherBusinessId);
  });

  it("surfaces a friendly error when the inquiry insert fails", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const context = await createAgentToolContext(session.publicToken);

    // Force the transaction to fail by referencing a deleted business context.
    const brokenContext = {
      ...context,
      business: { ...context.business, id: "does-not-exist" },
    };

    await expect(
      runAgentTool<{ inquiryId: string; message: string }>(
        createInquiryTool,
        {
          customerName: "Riley Fox",
          customerContactMethod: "email",
          customerContactHandle: "riley@example.com",
          serviceCategory: "Wayfinding",
          details: "Office wayfinding package.",
        },
        { experimental_context: brokenContext },
      ),
    ).rejects.toThrow("Failed to create inquiry");
  });
  });

  describe("request_human_handoff tool", () => {
    it("creates a partial inquiry, activity, notification, and marks the session", async () => {
      const session = await createActiveAgentSession(ids.businessId);

    await updateSessionState({
      sessionId: session.sessionId,
      state: {
        collected: { customerName: true, serviceCategory: true, customerEmail: true, customerContactMethod: true, customerContactHandle: true },
        values: {
          customerName: "Priya Sharma",
          customerContactMethod: "email",
          customerContactHandle: "priya@example.com",
          customerEmail: "priya@example.com",
          serviceCategory: "Event signage",
        },
        missing: ["details"],
      },
    });

    const context = await createAgentToolContext(session.publicToken);

    const result = await runAgentTool<{ handoffRequested: boolean }>(
      requestHumanHandoffTool,
      {
        reason: "Customer asked to speak with a person about a large order.",
        customerMessage: "Please have a salesperson call me.",
      },
      { experimental_context: context },
    );

    expect(result.handoffRequested).toBe(true);

    const handoffInquiry = await testDb
      .select()
      .from(inquiries)
      .where(
        eq(
          inquiries.source,
          "ai_agent_handoff",
        ),
      )
      .orderBy(inquiries.createdAt);

    const created = handoffInquiry.find(
      (item) => item.customerContactHandle === "priya@example.com",
    );

    expect(created).toMatchObject({
      businessId: ids.businessId,
      status: "new",
      subject: "Event signage",
      customerName: "Priya Sharma",
      customerContactMethod: "email",
      customerContactHandle: "priya@example.com",
      serviceCategory: "Event signage",
      details: expect.stringContaining("Please have a salesperson call me."),
      source: "ai_agent_handoff",
      aiAssisted: true,
      escalated: true,
      quoteRequested: true,
    });

    const activity = await testDb
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.inquiryId, created!.id));

    expect(activity[0]).toMatchObject({
      type: "inquiry.submitted_ai_agent",
      summary: "Customer escalated to a human from the AI agent conversation.",
      actorUserId: null,
    });

    const notification = await testDb
      .select()
      .from(businessNotifications)
      .where(eq(businessNotifications.inquiryId, created!.id));

    expect(notification[0]).toMatchObject({
      title: "New inquiry from Priya Sharma",
    });

    const [storedSession] = await testDb
      .select()
      .from(aiAgentSessions)
      .where(eq(aiAgentSessions.id, session.sessionId));

    expect(storedSession.status).toBe("human_handoff");
    expect(storedSession.metadata).toMatchObject({
      handoffReason: "Customer asked to speak with a person about a large order.",
      handoffRecommendation: "Customer message: Please have a salesperson call me.",
    });
    expect(storedSession.completedAt).toBeInstanceOf(Date);
  });

  it("applies state fallbacks for partially collected information", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const context = await createAgentToolContext(session.publicToken);

    const result = await runAgentTool<{ handoffRequested: boolean }>(
      requestHumanHandoffTool,
      { reason: "Out of scope request." },
      { experimental_context: context },
    );

    expect(result.handoffRequested).toBe(true);

const rows = await testDb
      .select()
      .from(inquiries)
      .where(eq(inquiries.source, "ai_agent_handoff"));

    const fallback = rows.find((item) => item.customerName === "Chat visitor");

    expect(fallback).toMatchObject({
      subject: "General Inquiry",
      customerName: "Chat visitor",
      customerContactMethod: "chat",
      customerContactHandle: "",
      serviceCategory: "General Inquiry",
      source: "ai_agent_handoff",
      aiAssisted: true,
      escalated: true,
    });
    expect(fallback?.details).toContain("Out of scope request.");
  });
  });
});