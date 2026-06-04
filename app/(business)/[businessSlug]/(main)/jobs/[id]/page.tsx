import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardDetailPageSkeleton } from "@/components/shell/dashboard-detail-page-skeleton";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getJobDetailForBusiness } from "@/features/jobs/queries";
import { JobDetail } from "@/features/jobs/components/job-detail";
import { getInvoiceIdForJob } from "@/features/invoices/queries-light";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string; id: string }>;
}): Promise<Metadata> {
  const { businessSlug, id } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const job = await getJobDetailForBusiness(businessContext.business.id, id);

  return {
    title: job ? job.title : "Job not found",
  };
}

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo", id: "sample-job-id" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

type JobDetailPageProps = {
  params: Promise<{ businessSlug: string; id: string }>;
};

/**
 * Job detail page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getAppShellContext, job queries) are pushed into
 * a `<Suspense>`-wrapped child server component so the shell paints instantly
 * on client navigation.
 */
export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <RegionErrorBoundary fallback={<DashboardDetailPageSkeleton variant="job" />}>
      <Suspense fallback={<DashboardDetailPageSkeleton variant="job" />}>
        <JobDetailContent params={params} />
      </Suspense>
    </RegionErrorBoundary>
  );
}

async function JobDetailContent({ params }: JobDetailPageProps) {
  const { businessSlug, id } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const job = await getJobDetailForBusiness(businessContext.business.id, id);

  if (!job) {
    notFound();
  }

  const invoiceId = await getInvoiceIdForJob(id, businessContext.business.id);

  return (
    <JobDetail
      job={job}
      businessSlug={businessSlug}
      existingInvoiceId={invoiceId}
    />
  );
}
