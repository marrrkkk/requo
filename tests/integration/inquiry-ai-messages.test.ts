import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import {
  businesses,
  businessInquiryForms,
  businessMembers,
  inquiries,
  inquiryMessages,
  user,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

import {
  createInquiryAssistantMessageForBusiness,
  createInquiryUserMessageForBusiness,
  decodeInquiryMessageCursor,
  getPaginatedInquiryMessagesForBusiness,
  inquiryBelongsToBusiness,
  updateInquiryAssistantMessageForBusiness,
} from "@/features/ai/messages";

const ownerUserId = "test_ai_messages_owner";
const otherUserId = "test_ai_messages_other";
const workspaceId = "test_ai_messages_workspace";
const otherWorkspaceId = "test_ai_messages_workspace_other";
const businessId = "test_ai_messages_business";
const otherBusinessId = "test_ai_messages_business_other";
const formId = "test_ai_messages_form";
const otherFormId = "test_ai_messages_form_other";
const inquiryId = "test_ai_messages_inquiry";
const emptyInquiryId = "test_ai_messages_empty_inquiry";
const otherInquiryId = "test_ai_messages_other_inquiry";
const preset = createInquiryFormPreset({
  businessType: "general_project_services",
  businessName: "AI Messages Business",
});
const otherPreset = createInquiryFormPreset({
  businessType: "general_project_services",
  businessName: "Other AI Messages Business",
});

describe("features/ai/messages", () => {
  beforeAll(async () => {
    const now = new Date("2026-04-01T00:00:00.000Z");

    await testDb
      .delete(inquiryMessages)
      .where(inArray(inquiryMessages.inquiryId, [
        inquiryId,
        emptyInquiryId,
        otherInquiryId,
      ]));
    await testDb
      .delete(inquiries)
      .where(inArray(inquiries.id, [inquiryId, emptyInquiryId, otherInquiryId]));
    await testDb
      .delete(businessInquiryForms)
      .where(inArray(businessInquiryForms.id, [formId, otherFormId]));
    await testDb
      .delete(businessMembers)
      .where(inArray(businessMembers.businessId, [businessId, otherBusinessId]));
    await testDb
      .delete(businesses)
      .where(inArray(businesses.id, [businessId, otherBusinessId]));
    await testDb
      .delete(workspaceMembers)
      .where(inArray(workspaceMembers.userId, [ownerUserId, otherUserId]));
    await testDb
      .delete(workspaces)
      .where(inArray(workspaces.id, [workspaceId, otherWorkspaceId]));
    await testDb.delete(user).where(inArray(user.id, [ownerUserId, otherUserId]));

    await testDb.insert(user).values([
      {
        id: ownerUserId,
        name: "AI Messages Owner",
        email: "ai-messages-owner@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherUserId,
        name: "AI Messages Other",
        email: "ai-messages-other@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(workspaces).values([
      {
        id: workspaceId,
        name: "AI Messages Workspace",
        slug: "ai-messages-workspace",
        plan: "free",
        ownerUserId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherWorkspaceId,
        name: "AI Messages Other Workspace",
        slug: "ai-messages-workspace-other",
        plan: "free",
        ownerUserId: otherUserId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(workspaceMembers).values([
      {
        id: "test_ai_messages_workspace_member",
        workspaceId,
        userId: ownerUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "test_ai_messages_workspace_member_other",
        workspaceId: otherWorkspaceId,
        userId: otherUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businesses).values([
      {
        id: businessId,
        workspaceId,
        name: "AI Messages Business",
        slug: "ai-messages-business",
        businessType: "general_project_services",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherBusinessId,
        workspaceId: otherWorkspaceId,
        name: "AI Messages Other Business",
        slug: "ai-messages-business-other",
        businessType: "general_project_services",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businessMembers).values([
      {
        id: "test_ai_messages_business_member",
        businessId,
        userId: ownerUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "test_ai_messages_business_member_other",
        businessId: otherBusinessId,
        userId: otherUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businessInquiryForms).values([
      {
        id: formId,
        businessId,
        name: "AI Messages Form",
        slug: "ai-messages-form",
        businessType: preset.businessType,
        isDefault: true,
        publicInquiryEnabled: true,
        inquiryFormConfig: preset.inquiryFormConfig,
        inquiryPageConfig: preset.inquiryPageConfig,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherFormId,
        businessId: otherBusinessId,
        name: "AI Messages Other Form",
        slug: "ai-messages-form-other",
        businessType: otherPreset.businessType,
        isDefault: true,
        publicInquiryEnabled: true,
        inquiryFormConfig: otherPreset.inquiryFormConfig,
        inquiryPageConfig: otherPreset.inquiryPageConfig,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(inquiries).values([
      {
        id: inquiryId,
        businessId,
        businessInquiryFormId: formId,
        status: "new",
        subject: "AI Messages Inquiry",
        customerName: "Customer One",
        customerEmail: "customer-one@example.com",
        serviceCategory: "Printing",
        details: "Need a quote.",
        submittedFieldSnapshot: {
          businessType: "general_project_services",
          fields: [],
          version: 1,
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: emptyInquiryId,
        businessId,
        businessInquiryFormId: formId,
        status: "new",
        subject: "Empty AI Messages Inquiry",
        customerName: "Customer Empty",
        customerEmail: "customer-empty@example.com",
        serviceCategory: "Printing",
        details: "Need another quote.",
        submittedFieldSnapshot: {
          businessType: "general_project_services",
          fields: [],
          version: 1,
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherInquiryId,
        businessId: otherBusinessId,
        businessInquiryFormId: otherFormId,
        status: "new",
        subject: "Other AI Messages Inquiry",
        customerName: "Customer Other",
        customerEmail: "customer-other@example.com",
        serviceCategory: "Printing",
        details: "Need an isolated quote.",
        submittedFieldSnapshot: {
          businessType: "general_project_services",
          fields: [],
          version: 1,
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  afterAll(async () => {
    await testDb
      .delete(inquiryMessages)
      .where(inArray(inquiryMessages.inquiryId, [
        inquiryId,
        emptyInquiryId,
        otherInquiryId,
      ]));
    await testDb
      .delete(inquiries)
      .where(inArray(inquiries.id, [inquiryId, emptyInquiryId, otherInquiryId]));
    await testDb
      .delete(businessInquiryForms)
      .where(inArray(businessInquiryForms.id, [formId, otherFormId]));
    await testDb
      .delete(businessMembers)
      .where(inArray(businessMembers.businessId, [businessId, otherBusinessId]));
    await testDb
      .delete(businesses)
      .where(inArray(businesses.id, [businessId, otherBusinessId]));
    await testDb
      .delete(workspaceMembers)
      .where(inArray(workspaceMembers.userId, [ownerUserId, otherUserId]));
    await testDb
      .delete(workspaces)
      .where(inArray(workspaces.id, [workspaceId, otherWorkspaceId]));
    await testDb.delete(user).where(inArray(user.id, [ownerUserId, otherUserId]));
    await closeTestDb();
  });

  it("returns an empty page for an inquiry with no saved messages", async () => {
    const page = await getPaginatedInquiryMessagesForBusiness({
      businessId,
      inquiryId: emptyInquiryId,
      limit: 30,
    });

    expect(page).toEqual({
      messages: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("returns the latest page chronologically and paginates older messages by cursor", async () => {
    const baseTime = Date.parse("2026-04-02T00:00:00.000Z");

    await testDb
      .delete(inquiryMessages)
      .where(eq(inquiryMessages.inquiryId, inquiryId));
    const messageRows = Array.from({ length: 5 }, (_, index) => ({
        id: `test_ai_msg_${index + 1}`,
        inquiryId,
        role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `Message ${index + 1}`,
        status: "completed" as const,
        metadata: {},
        createdAt: new Date(baseTime + index * 1000),
        updatedAt: new Date(baseTime + index * 1000),
      }));

    await testDb.insert(inquiryMessages).values(messageRows);

    const latestPage = await getPaginatedInquiryMessagesForBusiness({
      businessId,
      inquiryId,
      limit: 3,
    });

    expect(latestPage.messages.map((message) => message.id)).toEqual([
      "test_ai_msg_3",
      "test_ai_msg_4",
      "test_ai_msg_5",
    ]);
    expect(latestPage.hasMore).toBe(true);
    expect(latestPage.nextCursor).not.toBeNull();

    const decodedCursor = decodeInquiryMessageCursor(latestPage.nextCursor!);

    expect(decodedCursor.ok).toBe(true);

    if (!decodedCursor.ok) {
      throw new Error("Expected a valid cursor.");
    }

    const olderPage = await getPaginatedInquiryMessagesForBusiness({
      businessId,
      inquiryId,
      limit: 3,
      before: decodedCursor.cursor,
    });

    expect(olderPage.messages.map((message) => message.id)).toEqual([
      "test_ai_msg_1",
      "test_ai_msg_2",
    ]);
    expect(olderPage.hasMore).toBe(false);
    expect(olderPage.nextCursor).toBeNull();
  });

  it("creates user messages and saves completed assistant provider metadata", async () => {
    const userMessage = await createInquiryUserMessageForBusiness({
      businessId,
      inquiryId: emptyInquiryId,
      content: "Summarize this inquiry.",
      metadata: {
        intent: "summarize-inquiry",
      },
    });

    expect(userMessage).toMatchObject({
      inquiryId: emptyInquiryId,
      role: "user",
      content: "Summarize this inquiry.",
      status: "completed",
    });

    const assistantMessage = await createInquiryAssistantMessageForBusiness({
      businessId,
      inquiryId: emptyInquiryId,
      status: "generating",
      metadata: {
        intent: "summarize-inquiry",
        title: "Inquiry summary",
      },
    });

    expect(assistantMessage).toMatchObject({
      role: "assistant",
      status: "generating",
    });

    const completed = await updateInquiryAssistantMessageForBusiness({
      businessId,
      inquiryId: emptyInquiryId,
      messageId: assistantMessage!.id,
      content: "Here is the summary.",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      status: "completed",
      metadata: {
        latencyMs: 1250,
      },
    });

    expect(completed).toMatchObject({
      id: assistantMessage!.id,
      role: "assistant",
      content: "Here is the summary.",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      status: "completed",
      metadata: expect.objectContaining({
        intent: "summarize-inquiry",
        title: "Inquiry summary",
        latencyMs: 1250,
      }),
    });
  });

  it("updates assistant messages as failed with error metadata", async () => {
    const assistantMessage = await createInquiryAssistantMessageForBusiness({
      businessId,
      inquiryId: emptyInquiryId,
      status: "generating",
    });

    const failed = await updateInquiryAssistantMessageForBusiness({
      businessId,
      inquiryId: emptyInquiryId,
      messageId: assistantMessage!.id,
      content: "",
      provider: "gemini",
      model: "gemini-2.5-flash",
      status: "failed",
      metadata: {
        errorReason: "Provider timed out.",
      },
    });

    expect(failed).toMatchObject({
      id: assistantMessage!.id,
      status: "failed",
      provider: "gemini",
      model: "gemini-2.5-flash",
      metadata: expect.objectContaining({
        errorReason: "Provider timed out.",
      }),
    });
  });

  it("does not create or read messages through the wrong business scope", async () => {
    await expect(
      inquiryBelongsToBusiness({
        businessId: otherBusinessId,
        inquiryId,
      }),
    ).resolves.toBe(false);

    await expect(
      createInquiryUserMessageForBusiness({
        businessId: otherBusinessId,
        inquiryId,
        content: "This should not be saved.",
      }),
    ).resolves.toBeNull();

    const wrongScopePage = await getPaginatedInquiryMessagesForBusiness({
      businessId: otherBusinessId,
      inquiryId,
      limit: 30,
    });

    expect(wrongScopePage.messages).toEqual([]);
  });
});
