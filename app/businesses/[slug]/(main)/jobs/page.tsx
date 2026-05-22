import type { Metadata } from "next";

import { getAppShellContext } from "@/lib/app-shell/context";
import { getJobsBoardForBusiness } from "@/features/jobs/queries";
import { JobsBoard } from "@/features/jobs/components/jobs-board";

export const metadata: Metadata = {
  title: "Jobs",
};

export default async function JobsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { businessContext } = await getAppShellContext(slug);

  const board = await getJobsBoardForBusiness(businessContext.business.id);

  return <JobsBoard board={board} businessSlug={slug} />;
}
