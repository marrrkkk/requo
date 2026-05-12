import { createInquiryAssistantRouteResponse } from "@/features/ai/route-handlers";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";

export const preferredRegion = "syd1";

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

  if (
    !hasFeatureAccess(
      ownerAccess.businessContext.business.plan,
      "aiAssistant",
    )
  ) {
    return Response.json(
      { error: "Upgrade to Pro to use the AI assistant." },
      { status: 403 },
    );
  }

  return createInquiryAssistantRouteResponse({
    request,
    businessId: ownerAccess.businessContext.business.id,
    userId: ownerAccess.user.id,
    inquiryId: parsedParams.data.id,
  });
}
