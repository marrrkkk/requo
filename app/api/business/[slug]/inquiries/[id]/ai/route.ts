import { z } from "zod";

import { createInquiryAssistantRouteResponse } from "@/features/ai/route-handlers";
import { getBusinessActionContext } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";

export const preferredRegion = "syd1";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  id: z.string().trim().min(1).max(128),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const actionContext = await getBusinessActionContext({
    businessSlug: parsedParams.data.slug,
    minimumRole: "staff",
    requireActiveBusiness: true,
    unauthorizedMessage: "You do not have access to that business action.",
  });

  if (!actionContext.ok) {
    return Response.json({ error: actionContext.error }, { status: 403 });
  }

  if (
    !hasFeatureAccess(
      actionContext.businessContext.business.plan,
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
    businessId: actionContext.businessContext.business.id,
    userId: actionContext.user.id,
    inquiryId: parsedParams.data.id,
  });
}
