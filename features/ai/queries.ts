import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { buildWorkspaceKnowledgeContext } from "@/features/knowledge/queries";
import type { InquiryAssistantContext } from "@/features/ai/types";
import { db } from "@/lib/db/client";
import {
  inquiries,
  inquiryNotes,
  user,
  workspaces,
} from "@/lib/db/schema";

type GetInquiryAssistantContextForWorkspaceInput = {
  workspaceId: string;
  inquiryId: string;
};

export async function getInquiryAssistantContextForWorkspace({
  workspaceId,
  inquiryId,
}: GetInquiryAssistantContextForWorkspaceInput): Promise<InquiryAssistantContext | null> {
  const [workspaceRow, inquiryRow, notes, knowledge] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        shortDescription: workspaces.shortDescription,
        contactEmail: workspaces.contactEmail,
        defaultCurrency: workspaces.defaultCurrency,
        defaultEmailSignature: workspaces.defaultEmailSignature,
        defaultQuoteNotes: workspaces.defaultQuoteNotes,
        aiTonePreference: workspaces.aiTonePreference,
        inquiryHeadline: workspaces.inquiryHeadline,
        publicInquiryEnabled: workspaces.publicInquiryEnabled,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1),
    db
      .select({
        id: inquiries.id,
        customerName: inquiries.customerName,
        customerEmail: inquiries.customerEmail,
        customerPhone: inquiries.customerPhone,
        serviceCategory: inquiries.serviceCategory,
        requestedDeadline: inquiries.requestedDeadline,
        budgetText: inquiries.budgetText,
        subject: inquiries.subject,
        details: inquiries.details,
        source: inquiries.source,
        status: inquiries.status,
        submittedAt: inquiries.submittedAt,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.workspaceId, workspaceId)))
      .limit(1),
    db
      .select({
        id: inquiryNotes.id,
        body: inquiryNotes.body,
        createdAt: inquiryNotes.createdAt,
        authorName: user.name,
      })
      .from(inquiryNotes)
      .leftJoin(user, eq(inquiryNotes.authorUserId, user.id))
      .where(
        and(
          eq(inquiryNotes.workspaceId, workspaceId),
          eq(inquiryNotes.inquiryId, inquiryId),
        ),
      )
      .orderBy(desc(inquiryNotes.createdAt))
      .limit(6),
    buildWorkspaceKnowledgeContext(workspaceId),
  ]);

  const workspace = workspaceRow[0];
  const inquiry = inquiryRow[0];

  if (!workspace || !inquiry) {
    return null;
  }

  return {
    workspace,
    inquiry,
    notes,
    knowledge,
  };
}
