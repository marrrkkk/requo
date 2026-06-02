import { publicInquiryChatRequestSchema } from "@/features/inquiries/public-inquiry-chat-schemas";
import type { PublicInquiryChatStreamEvent } from "@/features/inquiries/public-inquiry-chat-schemas";
import { createPublicInquiryChatStream } from "@/features/inquiries/public-inquiry-chat-service";
import {
  getPublicInquiryBusinessByFormSlug,
  getPublicInquiryBusinessBySlug,
} from "@/features/inquiries/queries";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import {
  checkPublicActionRateLimit,
  rateLimitHeaders,
} from "@/lib/rate-limit/redis-rate-limiter";

// ---------------------------------------------------------------------------
// POST /api/public/inquiry-chat
//
// Public (unauthenticated) streaming endpoint for conversational inquiry
// intake. The client sends the full message history on each request.
// Rate-limited per IP. Requires the business to have AI assistant access
// and conversational mode enabled on the form.
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function encodeStreamEvent(event: PublicInquiryChatStreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

const RATE_LIMIT = {
  action: "public-inquiry-chat" as const,
  limit: 30,
  windowMs: 5 * 60 * 1000,
};

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }

  const parsed = publicInquiryChatRequestSchema.safeParse(requestBody);

  if (!parsed.success) {
    return Response.json(
      { error: "Check the request and try again." },
      { status: 400 },
    );
  }

  // Rate limit by business slug (acts as IP scope via the underlying limiter)
  const rateLimitResult = await checkPublicActionRateLimit({
    ...RATE_LIMIT,
    scope: `inquiry-chat:${parsed.data.businessSlug}`,
  });

  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: rateLimitHeaders(rateLimitResult.metadata) },
    );
  }

  // Resolve the business
  const business = parsed.data.formSlug
    ? await getPublicInquiryBusinessByFormSlug({
        businessSlug: parsed.data.businessSlug,
        formSlug: parsed.data.formSlug,
      })
    : await getPublicInquiryBusinessBySlug(parsed.data.businessSlug);

  if (!business) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  // Gate: AI assistant entitlement
  if (!hasFeatureAccess(business.plan, "aiAssistant")) {
    return Response.json(
      { error: "Conversational intake is not available for this business." },
      { status: 403 },
    );
  }

  // Gate: conversational mode must be enabled on this form
  if (!business.inquiryFormConfig.conversationalMode?.enabled) {
    return Response.json(
      { error: "Conversational intake is not enabled for this form." },
      { status: 403 },
    );
  }

  // Stream the AI response
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of createPublicInquiryChatStream({
          business,
          messages: parsed.data.messages,
        })) {
          controller.enqueue(encodeStreamEvent(event));
        }
      } catch (error) {
        console.error("[inquiry-chat-route] Unexpected stream error:", error);
        controller.enqueue(
          encodeStreamEvent({
            type: "error",
            message: "An unexpected error occurred.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...rateLimitHeaders(rateLimitResult.metadata),
      "cache-control": "private, no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-accel-buffering": "no",
    },
  });
}
