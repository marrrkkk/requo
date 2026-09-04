import { connection, NextResponse } from "next/server";
import { loadSessionByToken } from "@/features/ai-agent/session-service";
import { loadRecentMessages } from "@/features/ai-agent/message-service";

/**
 * Agent transcript rehydration (customer-owned).
 *
 * GET /api/ai/agent/session?token=<publicToken>
 * Returns the business name plus the customer's own user/assistant transcript
 * so a reload restores the conversation. Authorized by possession of the
 * token, which only the customer holds — the business gains no visibility
 * from this route.
 */
export async function GET(request: Request) {
  await connection();

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { error: "Invalid session token." },
        { status: 400 },
      );
    }

    const sessionData = await loadSessionByToken(token);
    if (!sessionData) {
      return NextResponse.json(
        { error: "Conversation not found or expired." },
        { status: 404 },
      );
    }

    const rows = await loadRecentMessages(sessionData.id, 50);

    return NextResponse.json({
      businessName: sessionData.business.name,
      status: sessionData.status,
      messages: rows
        .filter((row) => row.role === "user" || row.role === "assistant")
        .map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          createdAt: row.createdAt.toISOString(),
        })),
    });
  } catch (error) {
    console.error("Agent session load error:", error);
    return NextResponse.json(
      { error: "Could not load the conversation." },
      { status: 500 },
    );
  }
}
