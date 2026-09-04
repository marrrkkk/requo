"use server";

import { headers } from "next/headers";
import { createAgentSession } from "@/features/ai-agent/session-service";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { checkAgentSessionLimit } from "@/lib/ai/conversation-limits";
import {
  assertPublicActionRateLimit,
  getPublicActionClientIpAddress,
} from "@/lib/public-action-rate-limit";

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
