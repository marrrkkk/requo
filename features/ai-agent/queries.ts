import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db/client";
import { aiAgentSessions, aiAgentMessages, businesses, inquiries } from "@/lib/db/schema";
import type { BusinessPlan } from "@/lib/plans/plans";

export type PublicAgentBusiness = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  aiAgentEnabled: boolean;
  plan: BusinessPlan;
};

/**
 * Load the minimum business fields needed for the public agent chat page.
 * Returns null when the business doesn't exist, is soft-deleted, or the
 * agent is disabled.
 */
export const getPublicAgentBusiness = cache(
  async (slug: string): Promise<PublicAgentBusiness | null> => {
    const [row] = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        shortDescription: businesses.shortDescription,
        aiAgentEnabled: businesses.aiAgentEnabled,
        plan: businesses.plan,
      })
      .from(businesses)
      .where(eq(businesses.slug, slug))
      .limit(1);

    if (!row) return null;
    return row;
  },
);

// ---------------------------------------------------------------------------
// Inquiry-scoped transcript
// ---------------------------------------------------------------------------
//
// Privacy boundary: an Agent Session becomes visible to the business only
// through an Inquiry it produced. There is no browse or search over Agent
// Sessions — the transcript below is the only path, attached read-only to
// the Inquiry it produced, and scoped to that Inquiry's business.

export type AgentTranscriptMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

/**
 * Load the originating public-chat transcript for an inquiry, if the inquiry
 * was produced by the Agent (created or escalated). Business-scoped through
 * the inquiry itself. Returns null when there is no linked session.
 */
export const getAgentTranscriptForInquiry = cache(
  async (
    businessId: string,
    inquiryId: string,
  ): Promise<AgentTranscriptMessage[] | null> => {
    const [inquiry] = await db
      .select({ id: inquiries.id })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.id, inquiryId),
          eq(inquiries.businessId, businessId),
        ),
      )
      .limit(1);

    if (!inquiry) return null;

    const [session] = await db
      .select({ id: aiAgentSessions.id })
      .from(aiAgentSessions)
      .where(
        and(
          eq(aiAgentSessions.inquiryId, inquiryId),
          eq(aiAgentSessions.businessId, businessId),
        ),
      )
      .limit(1);

    if (!session) return null;

    const rows = await db
      .select({
        id: aiAgentMessages.id,
        role: aiAgentMessages.role,
        content: aiAgentMessages.content,
        createdAt: aiAgentMessages.createdAt,
      })
      .from(aiAgentMessages)
      .where(eq(aiAgentMessages.sessionId, session.id))
      .orderBy(asc(aiAgentMessages.createdAt))
      .limit(100);

    return rows
      .filter((row) => row.role === "user" || row.role === "assistant")
      .map((row) => ({
        id: row.id,
        role: row.role as "user" | "assistant",
        content: row.content,
        createdAt: row.createdAt,
      }));
  },
);
