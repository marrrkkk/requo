"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";

import {
  getBusinessJobDetailCacheTags,
  getBusinessJobListCacheTags,
  getBusinessQuoteDetailCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import {
  createJobFromQuoteForBusiness,
  deleteJobForBusiness,
  toggleJobItemForBusiness,
  updateJobStatusForBusiness,
} from "@/features/jobs/mutations";
import type {
  JobEditorActionState,
  JobItemToggleActionState,
  JobStatus,
  JobStatusChangeActionState,
} from "@/features/jobs/types";

function revalidateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    revalidateTag(tag, "max");
  }
}

/**
 * Create a job from an accepted quote.
 */
export async function createJobFromQuoteAction(
  quoteId: string,
): Promise<JobEditorActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, businessContext } = access;

  // Check job usage limit
  const limit = getUsageLimit(businessContext.business.plan, "activeJobsPerBusiness");
  if (limit !== null) {
    const [{ activeCount }] = await db
      .select({ activeCount: count() })
      .from(jobs)
      .where(
        and(
          eq(jobs.businessId, businessContext.business.id),
          isNull(jobs.deletedAt),
          isNull(jobs.archivedAt),
        ),
      );

    if (activeCount >= limit) {
      return {
        error: `You've reached the free plan limit of ${limit} active jobs. Upgrade for unlimited jobs.`,
      };
    }
  }

  const result = await createJobFromQuoteForBusiness({
    businessId: businessContext.business.id,
    quoteId,
    userId: user.id,
  });

  if (result.error) {
    return { error: result.error, jobId: result.jobId };
  }

  revalidateCacheTags([
    ...getBusinessJobListCacheTags(businessContext.business.id),
    ...getBusinessQuoteDetailCacheTags(businessContext.business.id, quoteId),
  ]);

  return { success: "Job created.", jobId: result.jobId };
}

/**
 * Move a job to a new status column (kanban drag or status button).
 */
export async function updateJobStatusAction(
  jobId: string,
  status: JobStatus,
): Promise<JobStatusChangeActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, businessContext } = access;

  const result = await updateJobStatusForBusiness({
    businessId: businessContext.business.id,
    jobId,
    status,
    userId: user.id,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateCacheTags([
    ...getBusinessJobListCacheTags(businessContext.business.id),
    ...getBusinessJobDetailCacheTags(businessContext.business.id, jobId),
  ]);

  return { success: "Job updated." };
}

/**
 * Toggle a job item's completion.
 */
export async function toggleJobItemAction(
  jobId: string,
  itemId: string,
): Promise<JobItemToggleActionState> {
  const access = await getWorkspaceBusinessActionContext();

  if (!access.ok) {
    return { error: access.error };
  }

  const { businessContext } = access;

  const result = await toggleJobItemForBusiness({
    businessId: businessContext.business.id,
    jobId,
    itemId,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateCacheTags([
    ...getBusinessJobDetailCacheTags(businessContext.business.id, jobId),
    ...getBusinessJobListCacheTags(businessContext.business.id),
  ]);

  return { success: result.completed ? "Item completed." : "Item unchecked." };
}

/**
 * Soft-delete a job.
 */
export async function deleteJobAction(
  jobId: string,
  _prevState?: JobEditorActionState,
  formData?: FormData,
): Promise<JobEditorActionState> {
  const access = await getWorkspaceBusinessActionContext();
  const redirectHref = formData ? formData.get("redirectHref") as string | null : null;

  if (!access.ok) {
    return { error: access.error };
  }

  const { user, businessContext } = access;

  const result = await deleteJobForBusiness({
    businessId: businessContext.business.id,
    jobId,
    userId: user.id,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateCacheTags(getBusinessJobListCacheTags(businessContext.business.id));

  if (redirectHref) {
    redirect(redirectHref);
  }

  return { success: "Job deleted." };
}
