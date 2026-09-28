import { NextResponse } from "next/server";
import { z } from "zod";

import { createArtifactSignedUrl } from "@/features/approvals/artifacts";
import { getApprovalByCustomerToken } from "@/features/approvals/queries";
import { db } from "@/lib/db/client";
import { approvalArtifacts } from "@/lib/db/schema";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";
import { and, eq } from "drizzle-orm";

const artifactRouteParamsSchema = z.object({
  token: z.string().min(1).max(128),
});

/**
 * Token-scoped artifact access: possession of the approval link grants
 * exactly the linked artifact view — signed URL redirect, never a public
 * bucket URL. Rate-limited like the quote-response actions.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const parsed = artifactRouteParamsSchema.safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const allowed = await assertPublicActionRateLimit({
    action: "approval-artifact-view",
    scope: `approval-artifact:${parsed.data.token.slice(0, 8)}`,
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const view = await getApprovalByCustomerToken(parsed.data.token);

  if (!view || !view.approval.artifactId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [artifact] = await db
    .select()
    .from(approvalArtifacts)
    .where(
      and(
        eq(approvalArtifacts.id, view.approval.artifactId),
        eq(approvalArtifacts.businessId, view.approval.businessId),
      ),
    )
    .limit(1);

  if (!artifact) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const signedUrl = await createArtifactSignedUrl({ storagePath: artifact.storagePath });

    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch {
    return NextResponse.json({ error: "Could not prepare the file." }, { status: 500 });
  }
}
