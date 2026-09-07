"use server";

import { headers } from "next/headers";
import {
  createAgentSession,
  loadSessionByToken,
} from "@/features/ai-agent/session-service";
import { db } from "@/lib/db/client";
import { aiAgentSessions, businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { checkAgentSessionLimit } from "@/lib/ai/conversation-limits";
import {
  assertPublicActionRateLimit,
  getPublicActionClientIpAddress,
} from "@/lib/public-action-rate-limit";
import { createInquiryParamsSchema } from "@/features/ai-agent/schemas";
import type {
  AgentSessionState,
  ProposedInquiry,
} from "@/features/ai-agent/types";

type CreateSessionResult =
  | {
      success: true;
      sessionToken: string;
      expiresAt: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Create a new agent session for a business (public action, no auth required).
 * Used by the public chat page to start a conversation.
 */
export async function createAgentSessionAction({
  businessSlug,
  metadata,
}: {
  businessSlug: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
  };
}): Promise<CreateSessionResult> {
  try {
    // Load business by slug
    const [business] = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        plan: businesses.plan,
        aiAgentEnabled: businesses.aiAgentEnabled,
      })
      .from(businesses)
      .where(eq(businesses.slug, businessSlug))
      .limit(1);

    if (!business) {
      return {
        success: false,
        error: "Business not found",
      };
    }

    if (!business.aiAgentEnabled) {
      return {
        success: false,
        error: "AI agent is not available for this business",
      };
    }

    if (!hasFeatureAccess(business.plan, "aiAgent")) {
      return {
        success: false,
        error: "AI agent is not available on this plan",
      };
    }

    // Anonymous session creation is rate-limited per IP so an
    // unauthenticated caller cannot mint sessions without bound.
    const headerStore = await headers();
    const clientIp = getPublicActionClientIpAddress(headerStore);
    const creationAllowed = await assertPublicActionRateLimit({
      action: "public-inquiry-submit",
      scope: `ai-agent-create:${clientIp}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    if (!creationAllowed) {
      return {
        success: false,
        error: "Too many conversations started. Please try again later.",
      };
    }

    // Per-business monthly session bucket (separate from owner allowance).
    const bucket = await checkAgentSessionLimit({
      businessId: business.id,
      plan: business.plan,
    });
    if (!bucket.allowed) {
      return {
        success: false,
        error: bucket.message,
      };
    }

    // Create session
    const result = await createAgentSession({
      businessId: business.id,
      metadata,
    });

    return {
      success: true,
      sessionToken: result.publicToken,
      expiresAt: result.expiresAt.toISOString(),
    };
  } catch (error) {
    console.error("Create agent session error:", error);
    return {
      success: false,
      error: "Failed to start conversation. Please try again.",
    };
  }
}

type ApproveProposalResult =
  | { success: true; inquiryId: string }
  | { success: false; error: string };

/**
 * Approve a staged Proposed Inquiry (visitor authorised by session token).
 *
 * The only path from proposal to Inquiry: a row-locked read-modify-write that
 * consumes the proposal exactly once, so a double-click or replayed request
 * cannot produce two Inquiries. The Inquiry is created through the existing
 * Agent submission path, so notifications, activity and follow-up behaviour
 * match a form submission.
 *
 * If the plan or Agent toggle lapsed between proposal and approval, the staged
 * proposal is still honoured — Inquiry intake was never gated. Further model
 * work stays refused (the chat boundary), but the lead is not lost. The lapse
 * is logged and both entitlement checks are re-run here.
 *
 * Error messages deliberately avoid the phrases the customer client treats as
 * a dead session ("Invalid or expired session", "not enabled",
 * "not available on this plan") — an approval failure must not throw the
 * visitor out of their own conversation.
 */
export async function approveAgentProposalAction({
  sessionToken,
  values,
  proposalId,
}: {
  sessionToken: string;
  values: unknown;
  proposalId?: string;
}): Promise<ApproveProposalResult> {
  const parsedValues = createInquiryParamsSchema.safeParse(values);
  if (!parsedValues.success) {
    const first = parsedValues.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Please review the highlighted fields.",
    };
  }

  const allowed = await assertPublicActionRateLimit({
    action: "public-inquiry-submit",
    scope: `ai-agent-approve:${sessionToken.slice(0, 16)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts. Please wait a moment before trying again.",
    };
  }

  const sessionData = await loadSessionByToken(sessionToken);
  if (!sessionData) {
    return {
      success: false,
      error: "That conversation could not be found. Please start a new one.",
    };
  }

  const sessionId = sessionData.id;

  // Consume the pending proposal exactly once under a row lock.
  type ConsumeOutcome =
    | { kind: "consumed"; proposal: ProposedInquiry; businessId: string }
    | { kind: "already"; inquiryId: string }
    | { kind: "sending" }
    | { kind: "missing" }
    | { kind: "gone" };

  let consume: ConsumeOutcome;
  try {
    consume = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          id: aiAgentSessions.id,
          businessId: aiAgentSessions.businessId,
          state: aiAgentSessions.state,
          expiresAt: aiAgentSessions.expiresAt,
        })
        .from(aiAgentSessions)
        .where(eq(aiAgentSessions.publicToken, sessionToken))
        .for("update")
        .limit(1);

      if (!row || row.expiresAt < new Date()) {
        return { kind: "gone" } as ConsumeOutcome;
      }

      const state = (row.state ?? {}) as AgentSessionState;
      const pending = state.proposedInquiry;

      if (!pending || pending.status !== "pending") {
        if (
          pending?.status === "approved" &&
          typeof pending.inquiryId === "string"
        ) {
          return {
            kind: "already",
            inquiryId: pending.inquiryId,
          } as ConsumeOutcome;
        }
        if (pending?.status === "approved") {
          return { kind: "sending" } as ConsumeOutcome;
        }
        return { kind: "missing" } as ConsumeOutcome;
      }

      if (proposalId && pending.id !== proposalId) {
        // Superseded by a revision — the old card is no longer sendable.
        if (
          (state as AgentSessionState).proposedInquiry?.status === "approved"
        ) {
          const current = (state as AgentSessionState).proposedInquiry;
          if (current?.inquiryId) {
            return {
              kind: "already",
              inquiryId: current.inquiryId,
            } as ConsumeOutcome;
          }
        }
        return { kind: "missing" } as ConsumeOutcome;
      }

      const approved: ProposedInquiry = {
        id: pending.id,
        values: {
          customerName: parsedValues.data.customerName,
          customerEmail: parsedValues.data.customerEmail ?? null,
          customerContactMethod: parsedValues.data.customerContactMethod,
          customerContactHandle: parsedValues.data.customerContactHandle,
          serviceCategory: parsedValues.data.serviceCategory,
          details: parsedValues.data.details,
          budgetText: parsedValues.data.budgetText,
          requestedDeadline: parsedValues.data.requestedDeadline,
          additionalFields: parsedValues.data.additionalFields,
        },
        proposedAt: pending.proposedAt,
        status: "approved",
      };

      await tx
        .update(aiAgentSessions)
        .set({
          state: { ...(state as Record<string, unknown>), proposedInquiry: approved },
          updatedAt: new Date(),
        })
        .where(eq(aiAgentSessions.id, row.id));

      return {
        kind: "consumed",
        proposal: approved,
        businessId: row.businessId,
      } as ConsumeOutcome;
    });
  } catch (error) {
    console.error("[ai-agent] Failed to consume proposal.", error);
    return {
      success: false,
      error: "Could not send that inquiry. Please try again.",
    };
  }

  if (consume.kind === "gone") {
    return {
      success: false,
      error: "That conversation could not be found. Please start a new one.",
    };
  }
  if (consume.kind === "already") {
    return { success: true, inquiryId: consume.inquiryId };
  }
  if (consume.kind === "sending") {
    return {
      success: false,
      error: "That inquiry is already being sent. Please wait a moment.",
    };
  }
  if (consume.kind === "missing") {
    return {
      success: false,
      error:
        "That proposal is no longer available. Please continue the conversation for a new one.",
    };
  }

  // Re-run both entitlement checks at approval time. A lapse is logged but
  // honoured — intake was never a paid feature.
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: businesses.plan,
      aiAgentEnabled: businesses.aiAgentEnabled,
    })
    .from(businesses)
    .where(eq(businesses.id, consume.businessId))
    .limit(1);

  if (!business) {
    return {
      success: false,
      error: "Could not send that inquiry. Please try again.",
    };
  }

  if (
    !business.aiAgentEnabled ||
    !hasFeatureAccess(business.plan as "free" | "pro" | "business", "aiAgent")
  ) {
    console.info("[ai-agent] Honouring staged proposal despite lapsed gate.", {
      businessId: business.id,
      plan: business.plan,
      agentEnabled: business.aiAgentEnabled,
      proposalId: consume.proposal.id,
    });
  }

  let inquiryId: string;
  try {
    const { createAgentInquirySubmission } = await import(
      "@/features/inquiries/mutations"
    );
    const result = await createAgentInquirySubmission({
      business: { id: business.id, name: business.name, slug: business.slug },
      submission: {
        customerName: consume.proposal.values.customerName,
        customerEmail: consume.proposal.values.customerEmail ?? null,
        customerContactMethod: consume.proposal.values.customerContactMethod,
        customerContactHandle: consume.proposal.values.customerContactHandle,
        serviceCategory: consume.proposal.values.serviceCategory,
        requestedDeadline: consume.proposal.values.requestedDeadline,
        budgetText: consume.proposal.values.budgetText,
        details: consume.proposal.values.details,
        submittedFieldSnapshot: {
          version: 1,
          businessType: "general_project_services",
          fields: [
            {
              id: "agent-collected",
              label: "Collected by",
              value: "Public chat",
              displayValue: "Public chat",
            },
          ],
        },
      },
      sessionId,
    });
    inquiryId = result.inquiryId;
  } catch (error) {
    console.error("[ai-agent] Proposal approval submission failed.", error);
    // The proposal was already consumed; surface a retry via a fresh revision
    // rather than silently losing the lead — the transcript still holds the
    // values, so the visitor can continue the conversation.
    return {
      success: false,
      error: "Could not send that inquiry. Please try again.",
    };
  }

  // Complete the session and record the Inquiry it produced. The card becomes
  // its submitted, read-only state in place.
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          id: aiAgentSessions.id,
          state: aiAgentSessions.state,
        })
        .from(aiAgentSessions)
        .where(eq(aiAgentSessions.id, sessionId))
        .for("update")
        .limit(1);
      if (!row) return;
      const state = (row.state ?? {}) as AgentSessionState;
      const current = state.proposedInquiry;
      const stamped: ProposedInquiry =
        current && current.id === consume.proposal.id
          ? { ...current, status: "approved", inquiryId }
          : { ...consume.proposal, status: "approved", inquiryId };

      await tx
        .update(aiAgentSessions)
        .set({
          status: "completed",
          inquiryId,
          completedAt: new Date(),
          updatedAt: new Date(),
          state: {
            ...(state as Record<string, unknown>),
            proposedInquiry: stamped,
          },
        })
        .where(eq(aiAgentSessions.id, sessionId));
    });
  } catch (error) {
    console.error("[ai-agent] Failed to complete session after approval.", error);
    // The Inquiry exists — return success so the visitor sees the receipt.
  }

  // Persist a tool row plus a short assistant line so a reloaded transcript
  // says what happened rather than ending abruptly.
  try {
    const { addAgentMessage } = await import(
      "@/features/ai-agent/message-service"
    );
    await addAgentMessage({
      sessionId,
      role: "tool",
      content: JSON.stringify({
        proposalId: consume.proposal.id,
        status: "approved",
        inquiryId,
      }),
      toolName: "propose_inquiry",
      toolCallId: `approve-${consume.proposal.id}`,
    });
    await addAgentMessage({
      sessionId,
      role: "assistant",
      content:
        "Thanks — your inquiry has been sent. The business will review it and get back to you soon.",
    });
  } catch (error) {
    console.error("[ai-agent] Failed to persist approval transcript.", error);
  }

  return { success: true, inquiryId };
}

type DiscardProposalResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Discard a staged Proposed Inquiry. Quiet, immediate, no confirmation:
 * declining costs nothing. Clears the proposal, tells the model it was
 * declined (via the persisted transcript) so the conversation can respond
 * sensibly, and leaves the chat open.
 */
export async function discardAgentProposalAction({
  sessionToken,
  proposalId,
}: {
  sessionToken: string;
  proposalId?: string;
}): Promise<DiscardProposalResult> {
  const allowed = await assertPublicActionRateLimit({
    action: "public-inquiry-submit",
    scope: `ai-agent-discard:${sessionToken.slice(0, 16)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts. Please wait a moment before trying again.",
    };
  }

  const sessionData = await loadSessionByToken(sessionToken);
  if (!sessionData) {
    return {
      success: false,
      error: "That conversation could not be found. Please start a new one.",
    };
  }

  const sessionId = sessionData.id;

  try {
    const outcome = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          id: aiAgentSessions.id,
          state: aiAgentSessions.state,
          expiresAt: aiAgentSessions.expiresAt,
        })
        .from(aiAgentSessions)
        .where(eq(aiAgentSessions.publicToken, sessionToken))
        .for("update")
        .limit(1);

      if (!row || row.expiresAt < new Date()) return { kind: "gone" as const };

      const state = (row.state ?? {}) as AgentSessionState;
      const pending = state.proposedInquiry;
      if (!pending || pending.status !== "pending") return { kind: "missing" as const };
      if (proposalId && pending.id !== proposalId) {
        return { kind: "missing" as const };
      }

      const { proposedInquiry: _removed, ...rest } = state as AgentSessionState & Record<string, unknown>;
      await tx
        .update(aiAgentSessions)
        .set({ state: rest, updatedAt: new Date() })
        .where(eq(aiAgentSessions.id, row.id));

      return { kind: "cleared" as const, proposalId: pending.id };
    });

    if (outcome.kind === "gone") {
      return {
        success: false,
        error: "That conversation could not be found. Please start a new one.",
      };
    }
    if (outcome.kind === "missing") {
      return {
        success: false,
        error: "There is no proposal to discard.",
      };
    }

    try {
      const { addAgentMessage } = await import(
        "@/features/ai-agent/message-service"
      );
      await addAgentMessage({
        sessionId,
        role: "tool",
        content: JSON.stringify({
          proposalId: outcome.proposalId,
          status: "discarded",
        }),
        toolName: "propose_inquiry",
        toolCallId: `discard-${outcome.proposalId}`,
      });
      await addAgentMessage({
        sessionId,
        role: "assistant",
        content:
          "No problem — I've discarded that. Let me know how you'd like to proceed.",
      });
    } catch (error) {
      console.error("[ai-agent] Failed to persist discard transcript.", error);
    }

    return { success: true };
  } catch (error) {
    console.error("[ai-agent] Failed to discard proposal.", error);
    return {
      success: false,
      error: "Could not discard that proposal. Please try again.",
    };
  }
}
