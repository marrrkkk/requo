import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { analyticsGoalThresholds } from "@/lib/db/schema";
import { hasFeatureAccess } from "@/lib/plans";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

const putBodySchema = z.object({
  metricKey: z.string().trim().min(1).max(100),
  targetValue: z.number().positive(),
});

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function GET(
  _request: Request,
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

  if (
    !hasFeatureAccess(
      requestContext.businessContext.business.plan,
      "analyticsConversion",
    )
  ) {
    return Response.json(
      { error: "Upgrade to Pro to use goal thresholds." },
      { status: 403 },
    );
  }

  const goals = await db
    .select()
    .from(analyticsGoalThresholds)
    .where(
      eq(
        analyticsGoalThresholds.businessId,
        requestContext.businessContext.business.id,
      ),
    );

  return Response.json({ goals });
}

export async function PUT(
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

  if (
    !hasFeatureAccess(
      requestContext.businessContext.business.plan,
      "analyticsConversion",
    )
  ) {
    return Response.json(
      { error: "Upgrade to Pro to use goal thresholds." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = putBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      { error: "Invalid input.", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { metricKey, targetValue } = parsedBody.data;
  const businessId = requestContext.businessContext.business.id;
  const now = new Date();

  const [goal] = await db
    .insert(analyticsGoalThresholds)
    .values({
      id: createId("agt"),
      businessId,
      metricKey,
      targetValue,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        analyticsGoalThresholds.businessId,
        analyticsGoalThresholds.metricKey,
      ],
      set: {
        targetValue,
        updatedAt: now,
      },
    })
    .returning();

  return Response.json({ goal });
}
