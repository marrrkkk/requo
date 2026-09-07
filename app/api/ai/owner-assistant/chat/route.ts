import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { runOwnerAssistant } from "@/features/owner-assistant/orchestrator";

const uiTextPartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const uiMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().optional(),
  parts: z.array(uiTextPartSchema).optional(),
});

const ownerAssistantChatRequestSchema = z.object({
  businessSlug: z.string().min(1),
  sessionId: z.string().optional(),
  // AI SDK UI messages (sent by useChat) — the latest user turn is the input.
  messages: z.array(uiMessageSchema).min(1),
  id: z.string().optional(),
  trigger: z.string().optional(),
  messageId: z.string().optional(),
});

function extractText(message: z.infer<typeof uiMessageSchema>): string {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }
  const text = (message.parts ?? [])
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text as string)
    .join("\n");
  return text;
}

/**
 * Owner Assistant Chat API Route
 *
 * POST /api/ai/owner-assistant/chat
 * Body: { businessSlug, sessionId?, messages: UIMessage[] }
 * Returns: UI message stream (tool calls/results as structured parts)
 *
 * Requires authentication and business membership. The server owns session
 * identity: the canonical session id is returned in `X-Session-Id`.
 */
export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    const parsed = ownerAssistantChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid request. Business slug and messages are required.",
        },
        { status: 400 },
      );
    }

    const { businessSlug, sessionId, messages } = parsed.data;

    // Validate business access (authoritative source of truth for identity)
    const result = await getBusinessActionContext({ businessSlug });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const { business, role } = result.businessContext;

    // Run the owner assistant (handles all business logic, tool execution, streaming)
    const { response, sessionId: canonicalSessionId } = await runOwnerAssistant({
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      userId: session.user.id,
      userRole: role,
      plan: business.plan,
      businessTimezone: business.timezone,
      sessionId,
      messages: messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: extractText(message),
      })),
    });

    // Return streaming response with the canonical session id
    const headers = new Headers(response.headers);
    headers.set("X-Session-Id", canonicalSessionId);
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Owner assistant chat API error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.startsWith("QUOTA_EXCEEDED:")) {
        const message = error.message
          .slice("QUOTA_EXCEEDED:".length)
          .trim();
        return NextResponse.json(
          {
            error:
              message ||
              "You've reached your Assistant usage limit for this month.",
            upgradeRequired: true,
          },
          { status: 429 },
        );
      }

      if (error.message.startsWith("ASSISTANT_LIMIT_EXCEEDED:")) {
        const message = error.message
          .slice("ASSISTANT_LIMIT_EXCEEDED:".length)
          .trim();
        return NextResponse.json(
          {
            error:
              message || "You've reached your daily Assistant message limit.",
            upgradeRequired: true,
          },
          { status: 429 },
        );
      }

      if (error.message.startsWith("INPUT_REJECTED:")) {
        const message = error.message.slice("INPUT_REJECTED:".length).trim();
        return NextResponse.json(
          { error: message || "That message can't be processed." },
          { status: 400 },
        );
      }

      if (error.message.includes("A user message is required")) {
        return NextResponse.json(
          { error: "Send a message to continue the conversation." },
          { status: 400 },
        );
      }

      if (error.message.includes("No suitable AI model")) {
        return NextResponse.json(
          {
            error:
              "AI service temporarily unavailable. Please try again in a moment.",
          },
          { status: 503 },
        );
      }
    }

    // Generic error
    return NextResponse.json(
      {
        error:
          "Something went wrong processing your message. Please try again.",
      },
      { status: 500 },
    );
  }
}
