import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { loadAssistantSession } from "@/features/owner-assistant/session-service";
import { db } from "@/lib/db/client";
import { ownerAssistantMessages } from "@/lib/db/schema/owner-assistant";
import { asc, eq } from "drizzle-orm";

type RouteParams = {
  params: Promise<{ sessionId: string }>;
};

/**
 * Owner Assistant Session Load API Route
 *
 * GET /api/ai/owner-assistant/session/[sessionId]
 * Returns: Session metadata + messages (user, assistant, and tool rows so
 * structured tool results rehydrate after a reload).
 *
 * Read-only: never creates a session. Requires authentication and business
 * membership. Sessions are scoped to businessId + userId.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Authenticate user
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    // Get business context from URL (session record contains businessId, but we need to validate membership)
    const url = new URL(request.url);
    const businessSlug = url.searchParams.get("businessSlug");

    if (!businessSlug) {
      return NextResponse.json(
        { error: "businessSlug query parameter required" },
        { status: 400 },
      );
    }

    // Validate business access
    const result = await getBusinessActionContext({ businessSlug });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const { business } = result.businessContext;

    // Load session read-only (enforces businessId + userId scoping)
    const sessionData = await loadAssistantSession({
      businessId: business.id,
      userId: session.user.id,
      sessionId,
      messageLimit: 100,
    });

    if (!sessionData) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    // Full rows (including tool calls/results) for transcript rehydration.
    const rows = await db
      .select({
        id: ownerAssistantMessages.id,
        role: ownerAssistantMessages.role,
        content: ownerAssistantMessages.content,
        toolName: ownerAssistantMessages.toolName,
        toolCallId: ownerAssistantMessages.toolCallId,
        createdAt: ownerAssistantMessages.createdAt,
      })
      .from(ownerAssistantMessages)
      .where(eq(ownerAssistantMessages.sessionId, sessionData.sessionId))
      // (createdAt, id) keeps same-millisecond tool rows in a stable order.
      .orderBy(asc(ownerAssistantMessages.createdAt), asc(ownerAssistantMessages.id))
      .limit(100);

    // Return session data
    return NextResponse.json({
      sessionId: sessionData.sessionId,
      title: sessionData.title,
      messages: rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        toolName: row.toolName,
        toolCallId: row.toolCallId,
        createdAt: row.createdAt.toISOString(),
      })),
      state: sessionData.state,
      createdAt: sessionData.createdAt,
      updatedAt: sessionData.updatedAt,
    });
  } catch (error) {
    console.error("Owner assistant session load error:", error);

    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 },
    );
  }
}
