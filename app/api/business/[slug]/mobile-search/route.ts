import { z } from "zod";

import {
  normalizeMobileSearchQuery,
  searchMobileRecordsForBusiness,
} from "@/features/search/queries";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const requestContext = await getBusinessRequestContextForSlug(
    parsedParams.data.slug,
  );

  if (!requestContext) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const query = normalizeMobileSearchQuery(rawQuery);

  if (!query) {
    return Response.json(
      { results: [] },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  const results = await searchMobileRecordsForBusiness({
    businessId: requestContext.businessContext.business.id,
    businessSlug: requestContext.businessContext.business.slug,
    query,
  });

  return Response.json(
    { results },
    { headers: { "cache-control": "private, no-store" } },
  );
}
