import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardDetailPageSkeleton } from "@/components/shell/dashboard-detail-page-skeleton";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getJobDetailForBusiness } from "@/features/jobs/queries";
import { JobDetail } from "@/features/jobs/components/job-detail";

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
  unstable_disableValidation: true,
};

type JobDetailPageProps = {
  params: Promise<{ businessSlug: string; id: string }>;
};

export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <Suspense fallback={<DashboardDetailPageSkeleton variant="job" />}>
      <JobDetailContent params={params} />
    </Suspense>
  );
}

async function JobDetailContent({ params }: JobDetailPageProps) {
  const { businessSlug, id } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const job = await getJobDetailForBusiness(businessContext.business.id, id);

  if (!job) {
    notFound();
  }

  return <JobDetail job={job} businessSlug={businessSlug} />;
}
