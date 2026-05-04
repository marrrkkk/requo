import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

import {
  aiConversations,
  aiMessages,
  businesses,
  businessMembers,
  user,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

vi.mock("@/features/memory/queries", () => ({
  buildBusinessMemoryContext: vi.fn(async () => ({
    memories: [],
    combinedText: "",
  })),
}));

import {
  createAiMessageForConversation,
  createAiUserMessage,
  createDashboardConversation,
  decodeAiMessageCursor,
  getOrCreateDefaultEntityConversation,
  getOrCreateLatestDashboardConversation,
  getPaginatedAiMessagesForConversation,
  listDashboardConversations,
} from "@/features/ai/conversations";
import { buildAiSurfaceContext } from "@/features/ai/surface-service";

const userId = "test_ai_conversations_user";
const workspaceId = "test_ai_conversations_workspace";
const businessId = "test_ai_conversations_business";
const otherBusinessId = "test_ai_conversations_business_other";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("features/ai/conversations", () => {
  beforeAll(async () => {
    const now = new Date("2026-04-01T00:00:00.000Z");

    await testDb
      .delete(aiMessages)
      .where(
        inArray(
          aiMessages.conversationId,
          testDb
            .select({ id: aiConversations.id })
            .from(aiConversations)
            .where(eq(aiConversations.workspaceId, workspaceId)),
        ),
      );
    await testDb
      .delete(aiConversations)
      .where(eq(aiConversations.workspaceId, workspaceId));
    await testDb
      .delete(businessMembers)
      .where(inArray(businessMembers.businessId, [businessId, otherBusinessId]));
    await testDb
      .delete(businesses)
      .where(inArray(businesses.id, [businessId, otherBusinessId]));
    await testDb
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    await testDb.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await testDb.delete(user).where(eq(user.id, userId));

    await testDb.insert(user).values({
      id: userId,
      name: "AI Conversations User",
      email: "ai-conversations@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(workspaces).values({
      id: workspaceId,
      name: "AI Conversations Workspace",
      slug: "ai-conversations-workspace",
      plan: "free",
      ownerUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(workspaceMembers).values({
      id: "test_ai_conversations_workspace_member",
      workspaceId,
      userId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(businesses).values([
      {
        id: businessId,
        workspaceId,
        name: "AI Conversations Business",
        slug: "ai-conversations-business",
        businessType: "general_project_services",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherBusinessId,
        workspaceId,
        name: "AI Conversations Other Business",
        slug: "ai-conversations-business-other",
        businessType: "general_project_services",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businessMembers).values([
      {
        id: "test_ai_conversations_business_member",
        businessId,
        userId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "test_ai_conversations_business_member_other",
        businessId: otherBusinessId,
        userId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  afterAll(async () => {
    await testDb
      .delete(aiMessages)
      .where(
        inArray(
          aiMessages.conversationId,
          testDb
            .select({ id: aiConversations.id })
            .from(aiConversations)
            .where(eq(aiConversations.workspaceId, workspaceId)),
        ),
      );
    await testDb
      .delete(aiConversations)
      .where(eq(aiConversations.workspaceId, workspaceId));
    await testDb
      .delete(businessMembers)
      .where(inArray(businessMembers.businessId, [businessId, otherBusinessId]));
    await testDb
      .delete(businesses)
      .where(inArray(businesses.id, [businessId, otherBusinessId]));
    await testDb
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    await testDb.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await testDb.delete(user).where(eq(user.id, userId));
    await closeTestDb();
  });

  it("keeps one default conversation per inquiry or quote entity", async () => {
    const inquiryConversation = await getOrCreateDefaultEntityConversation({
      userId,
      workspaceId,
      surface: "inquiry",
      entityId: "inq_default_one",
      title: "Default inquiry chat",
    });
    const sameInquiryConversation = await getOrCreateDefaultEntityConversation({
      userId,
      workspaceId,
      surface: "inquiry",
      entityId: "inq_default_one",
      title: "Renamed inquiry chat",
    });
    const otherInquiryConversation = await getOrCreateDefaultEntityConversation({
      userId,
      workspaceId,
      surface: "inquiry",
      entityId: "inq_default_two",
      title: "Other inquiry chat",
    });
    const quoteConversation = await getOrCreateDefaultEntityConversation({
      userId,
      workspaceId,
      surface: "quote",
      entityId: "quote_default_one",
      title: "Default quote chat",
    });

    expect(sameInquiryConversation.id).toBe(inquiryConversation.id);
    expect(otherInquiryConversation.id).not.toBe(inquiryConversation.id);
    expect(quoteConversation.id).not.toBe(inquiryConversation.id);
    expect(inquiryConversation).toMatchObject({
      surface: "inquiry",
      entityId: "inq_default_one",
      isDefault: true,
    });
    expect(quoteConversation).toMatchObject({
      surface: "quote",
      entityId: "quote_default_one",
      isDefault: true,
    });
  });

  it("allows multiple dashboard conversations and opens the most recent one", async () => {
    const firstConversation = await createDashboardConversation({
      userId,
      workspaceId,
      entityId: businessId,
      title: "First dashboard chat",
    });
    await sleep(5);
    const secondConversation = await createDashboardConversation({
      userId,
      workspaceId,
      entityId: businessId,
      title: "Second dashboard chat",
    });
    await sleep(5);
    const otherBusinessConversation = await createDashboardConversation({
      userId,
      workspaceId,
      entityId: otherBusinessId,
      title: "Other business dashboard chat",
    });

    const latestByCreation = await getOrCreateLatestDashboardConversation({
      userId,
      workspaceId,
      entityId: businessId,
    });

    expect(latestByCreation.id).toBe(secondConversation.id);

    await sleep(5);
    await createAiUserMessage({
      conversationId: firstConversation.id,
      content: "Summarize open inquiries.",
    });
    await sleep(5);
    await createAiMessageForConversation({
      conversationId: firstConversation.id,
      role: "assistant",
      content: "Two inquiries need follow-up today.",
      status: "completed",
    });

    const latestByActivity = await getOrCreateLatestDashboardConversation({
      userId,
      workspaceId,
      entityId: businessId,
    });
    const dashboardHistory = await listDashboardConversations({
      userId,
      workspaceId,
      entityId: businessId,
      limit: 10,
    });

    expect(latestByActivity.id).toBe(firstConversation.id);
    expect(dashboardHistory.map((conversation) => conversation.id)).toEqual(
      expect.arrayContaining([firstConversation.id, secondConversation.id]),
    );
    expect(
      dashboardHistory.find((conversation) => conversation.id === firstConversation.id)
        ?.lastMessagePreview,
    ).toBe("Two inquiries need follow-up today.");
    expect(dashboardHistory.map((conversation) => conversation.id)).not.toContain(
      otherBusinessConversation.id,
    );
  });

  it("returns latest messages first chronologically and paginates older messages by cursor", async () => {
    const conversation = await createDashboardConversation({
      userId,
      workspaceId,
      entityId: businessId,
      title: "Pagination dashboard chat",
    });

    for (const index of [1, 2, 3, 4, 5]) {
      await sleep(5);
      await createAiMessageForConversation({
        conversationId: conversation.id,
        role: index % 2 === 0 ? "assistant" : "user",
        content: `Message ${index}`,
        status: "completed",
      });
    }

    const latestPage = await getPaginatedAiMessagesForConversation({
      conversationId: conversation.id,
      userId,
      limit: 3,
    });

    expect(latestPage.messages.map((message) => message.content)).toEqual([
      "Message 3",
      "Message 4",
      "Message 5",
    ]);
    expect(latestPage.hasMore).toBe(true);
    expect(latestPage.nextCursor).not.toBeNull();

    const decodedCursor = decodeAiMessageCursor(latestPage.nextCursor!);

    expect(decodedCursor.ok).toBe(true);

    if (!decodedCursor.ok) {
      throw new Error("Expected a valid cursor.");
    }

    const olderPage = await getPaginatedAiMessagesForConversation({
      conversationId: conversation.id,
      userId,
      limit: 3,
      before: decodedCursor.cursor,
    });

    expect(olderPage.messages.map((message) => message.content)).toEqual([
      "Message 1",
      "Message 2",
    ]);
    expect(olderPage.hasMore).toBe(false);
    expect(olderPage.nextCursor).toBeNull();
  });

  it("includes current business profile details in dashboard AI context", async () => {
    const context = await buildAiSurfaceContext({
      surface: "dashboard",
      entityId: businessId,
      businessId,
    });

    expect(context).not.toBeNull();
    expect(context).toContain("Business profile");
    expect(context).toContain("- Name: AI Conversations Business");
    expect(context).toContain("- Created: 2026-04-01T00:00:00.000Z");
  });
});
