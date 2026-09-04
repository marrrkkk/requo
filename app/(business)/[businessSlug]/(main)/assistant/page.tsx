import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { AssistantComposer } from "@/features/owner-assistant/components/assistant-composer";
import { AssistantHistorySidebar } from "@/features/owner-assistant/components/assistant-history-sidebar";

type AssistantPageProps = {
  params: Promise<{ businessSlug: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Assistant",
  description: "AI-powered assistant for your business operations",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function AssistantPage({ params }: AssistantPageProps) {
  return (
    <DashboardPage className="flex flex-col h-full">
      <PageHeader
        title="Assistant"
        description="Ask questions, search data, or create inquiries and quotes"
      />
      <Suspense fallback={<AssistantSkeleton />}>
        <AssistantRegion params={params} />
      </Suspense>
    </DashboardPage>
  );
}

async function AssistantRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  // Membership gate for the section; the composer creates nothing.
  await getAppShellContext(businessSlug);

  return (
    <div className="relative flex flex-1 min-h-0">
      <AssistantHistorySidebar businessSlug={businessSlug} />
      <div className="flex-1 min-w-0">
        <AssistantComposer businessSlug={businessSlug} />
      </div>
    </div>
  );
}

function AssistantSkeleton() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <Skeleton className="h-full" />
    </div>
  );
}
