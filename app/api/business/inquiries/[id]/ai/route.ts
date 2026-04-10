import {
  createInquiryAssistantStream,
  isInquiryAssistantStreamTruncated,
} from "@/features/ai/service";
import { aiAssistantRequestSchema } from "@/features/ai/schemas";
import type { AiAssistantStreamEvent } from "@/features/ai/types";
import { getInquiryAssistantContextForBusiness } from "@/features/ai/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import { getOwnerBusinessActionContext } from "@/lib/db/business-access";

const encoder = new TextEncoder();

function encodeStreamEvent(event: AiAssistantStreamEvent) {
  return encoder.encode(`${JSON.stringify(event)}\n`);
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

  const ownerAccess = await getOwnerBusinessActionContext();

  if (!ownerAccess.ok) {
    return Response.json({ error: ownerAccess.error }, { status: 403 });
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
      try {
        const { model, title, result } = createInquiryAssistantStream({
          context: assistantContext,
          request: validationResult.data,
        });

        controller.enqueue(
          encodeStreamEvent({
            type: "meta",
            title,
            model,
          }),
        );

        for await (const delta of result.getTextStream()) {
          if (!delta) {
            continue;
          }

          controller.enqueue(
            encodeStreamEvent({
              type: "delta",
              value: delta,
            }),
          );
        }

        const response = await result.getResponse();

        controller.enqueue(
          encodeStreamEvent({
            type: "done",
            truncated: isInquiryAssistantStreamTruncated(response),
          }),
        );
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
      "cache-control": "private, no-store",
      "content-type": "application/x-ndjson; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
