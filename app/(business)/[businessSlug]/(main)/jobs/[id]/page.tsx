import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ businessSlug: string; id: string }>;
}) {
  const { businessSlug, id } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const job = await getJobDetailForBusiness(businessContext.business.id, id);

  if (!job) {
    notFound();
  }

  return <JobDetail job={job} businessSlug={businessSlug} />;
}
