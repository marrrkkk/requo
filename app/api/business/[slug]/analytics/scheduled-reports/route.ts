import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { analyticsScheduledReports } from "@/lib/db/schema";
import { hasFeatureAccess } from "@/lib/plans";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

const emailSchema = z.string().email();

const scheduleSchema = z.enum(["daily", "weekly", "monthly"]);

const createBodySchema = z.object({
  recipientEmails: z
    .array(emailSchema)
    .min(1, "At least one recipient email is required.")
    .max(5, "Maximum 5 recipient emails allowed."),
  schedule: scheduleSchema,
  timezone: z.string().trim().min(1, "Timezone is required."),
  enabled: z.boolean().optional().default(true),
});

const updateBodySchema = z.object({
  id: z.string().trim().min(1),
  recipientEmails: z
    .array(emailSchema)
    .min(1, "At least one recipient email is required.")
    .max(5, "Maximum 5 recipient emails allowed.")
    .optional(),
  schedule: scheduleSchema.optional(),
  timezone: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
});

const deleteBodySchema = z.object({
  id: z.string().trim().min(1),
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
      "analyticsWorkflow",
    )
  ) {
    return Response.json(
      { error: "Upgrade to access scheduled reports." },
      { status: 403 },
    );
  }

  const reports = await db
    .select()
    .from(analyticsScheduledReports)
    .where(
      eq(
        analyticsScheduledReports.businessId,
        requestContext.businessContext.business.id,
      ),
    );

  return Response.json({ reports });
}

export async function POST(
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
      "analyticsWorkflow",
    )
  ) {
    return Response.json(
      { error: "Upgrade to access scheduled reports." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = createBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      { error: "Invalid input.", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { recipientEmails, schedule, timezone, enabled } = parsedBody.data;
  const businessId = requestContext.businessContext.business.id;
  const now = new Date();

  const [report] = await db
    .insert(analyticsScheduledReports)
    .values({
      id: createId("asr"),
      businessId,
      recipientEmails,
      schedule,
      timezone,
      enabled,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return Response.json({ report }, { status: 201 });
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
      "analyticsWorkflow",
    )
  ) {
    return Response.json(
      { error: "Upgrade to access scheduled reports." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = updateBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      { error: "Invalid input.", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...updates } = parsedBody.data;
  const businessId = requestContext.businessContext.business.id;
  const now = new Date();

  const [report] = await db
    .update(analyticsScheduledReports)
    .set({
      ...updates,
      updatedAt: now,
    })
    .where(
      and(
        eq(analyticsScheduledReports.id, id),
        eq(analyticsScheduledReports.businessId, businessId),
      ),
    )
    .returning();

  if (!report) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  return Response.json({ report });
}

export async function DELETE(
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
      "analyticsWorkflow",
    )
  ) {
    return Response.json(
      { error: "Upgrade to access scheduled reports." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const queryId = url.searchParams.get("id");

  let id = queryId;

  if (!id) {
    const body = await request.json().catch(() => null);
    const parsedBody = deleteBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return Response.json(
        { error: "Invalid input. Provide a report ID.", details: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    id = parsedBody.data.id;
  }

  const businessId = requestContext.businessContext.business.id;

  const [deleted] = await db
    .delete(analyticsScheduledReports)
    .where(
      and(
        eq(analyticsScheduledReports.id, id),
        eq(analyticsScheduledReports.businessId, businessId),
      ),
    )
    .returning();

  if (!deleted) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  return Response.json({ success: true });
}
