import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminAiCapacitySection,
  AdminAiProviders,
} from "@/features/admin/components/ai/admin-ai-providers";
import { withAdminViewLog } from "@/features/admin/page-shell";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

export const instant = true;

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "AI providers - Requo admin",
  description: "Configured providers, routing, and live capacity.",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminAiProvidersPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

/**
 * Admin AI providers page.
 *
 * Provider state and routing profiles render with the page. Live Redis
 * capacity is opt-in (`?capacity=1`) behind its own Suspense boundary —
 * the snapshot fans out many Redis GETs, so it never blocks the page
 * and is never cached. No nested layout here: auth stays in the page
 * body via `withAdminViewLog` so `instant` validation keeps working.
 */
export default function AdminAiProvidersPage({
  searchParams,
}: AdminAiProvidersPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminAiProvidersPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminAiProvidersPageContent({
  searchParams,
}: AdminAiProvidersPageProps) {
  const rawParams = await searchParams;
  const showCapacity = rawParams.capacity === "1";

  return withAdminViewLog(
    { action: "view.ai-providers", targetType: "ai-provider" },
    () => (
      <DashboardPage>
        <PageHeader
          eyebrow="Admin"
          title="AI providers"
          description="Configured providers, routing, and live capacity."
        />
        <AdminAiProviders />
        {showCapacity ? (
          <Suspense fallback={<CapacityFallback />}>
            <AdminAiCapacitySection />
          </Suspense>
        ) : (
          <DashboardSection
            description="Per-model request counters and load, read live from Redis. Loading it fans out many reads, so it stays off until requested."
            title="Live capacity"
          >
            <Button asChild size="sm" variant="outline">
              <Link href="?capacity=1" prefetch={false}>
                Load live capacity
              </Link>
            </Button>
          </DashboardSection>
        )}
      </DashboardPage>
    ),
  );
}

function CapacityFallback() {
  return (
    <div className="section-panel space-y-4">
      <Skeleton className="h-5 w-40 rounded-md" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton className="h-9 w-full rounded-lg" key={index} />
        ))}
      </div>
    </div>
  );
}
