import { createInquiryAssistantStream } from "@/features/ai/service";
import { aiAssistantRequestSchema } from "@/features/ai/schemas";
import type { AiAssistantStreamEvent } from "@/features/ai/types";
import { getInquiryAssistantContextForBusiness } from "@/features/ai/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";

export const preferredRegion = "syd1";

const encoder = new TextEncoder();
const ssePaddingComment = `:${" ".repeat(2048)}\n\n`;

function encodeStreamEvent(event: AiAssistantStreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function encodeSseComment(comment: string) {
  return encoder.encode(comment);
}

function getValidationMessage(error: {
  flatten: () => {
    fieldErrors: Partial<Record<"customPrompt" | "sourceDraft", string[] | undefined>>;
  };
}) {
  const fieldErrors = error.flatten().fieldErrors;

  return (
    fieldErrors.customPrompt?.[0] ??
    fieldErrors.sourceDraft?.[0] ??
    "Check the AI request and try again."
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsedParams = inquiryRouteParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return Response.json({ error: ownerAccess.error }, { status: 403 });
  }

  const isAllowed = await assertPublicActionRateLimit({
    action: "business-inquiry-ai",
    limit: 10,
    scope: `${ownerAccess.businessContext.business.id}:${ownerAccess.user.id}:${parsedParams.data.id}`,
    windowMs: 60_000,
  });

  if (!isAllowed) {
    return Response.json(
      { error: "Too many AI requests. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return Response.json(
      { error: "Check the AI request and try again." },
      { status: 400 },
    );
  }

  const validationResult = aiAssistantRequestSchema.safeParse(requestBody);

  if (!validationResult.success) {
    return Response.json(
      { error: getValidationMessage(validationResult.error) },
      { status: 400 },
    );
  }

  const assistantContext = await getInquiryAssistantContextForBusiness({
    businessId: ownerAccess.businessContext.business.id,
    inquiryId: parsedParams.data.id,
  });

  if (!assistantContext) {
    return Response.json(
      { error: "That inquiry could not be found." },
      { status: 404 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeSseComment(ssePaddingComment));

      try {
        for await (const event of createInquiryAssistantStream({
          context: assistantContext,
          request: validationResult.data,
        })) {
          controller.enqueue(encodeStreamEvent(event));
        }
      } catch (error) {
        console.error("Failed to stream inquiry AI output.", error);

        controller.enqueue(
          encodeStreamEvent({
            type: "error",
            message:
              "The assistant could not generate an answer right now. Try again in a moment.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "private, no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-accel-buffering": "no",
    },
  });
}
