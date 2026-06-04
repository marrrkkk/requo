import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createBusinessInquiryFormAction,
  unarchiveBusinessInquiryFormAction,
} from "@/features/settings/actions";
import { FormsList } from "@/features/settings/components/forms-list";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "@/app/(business)/[businessSlug]/settings/_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Forms",
  description: "Manage inquiry forms for this business.",
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

/**
 * Forms page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getBusinessOperationalPageContext, queries) are
 * pushed into a Suspense-wrapped child server component so the static shell
 * is prefetchable and sibling navigations paint instantly.
 */
export default function BusinessFormsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <>
      <PageHeader
        title="Forms"
        description="Manage inquiry capture, public URLs, and starting intake defaults."
      />
      <Suspense fallback={<FormsPageSkeleton />}>
        <FormsRegion params={params} />
      </Suspense>
    </>
  );
}

// ---------------------------------------------------------------------------
// Suspense-wrapped async child server component
// ---------------------------------------------------------------------------

async function FormsRegion({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getBusinessOperationalPageContext(businessSlug);
  const settings = await getBusinessInquiryFormsSettingsForBusiness(
    businessContext.business.id,
  );

  if (!settings) {
    notFound();
  }

  return (
    <FormsList
      createAction={createBusinessInquiryFormAction}
      unarchiveAction={unarchiveBusinessInquiryFormAction}
      settings={settings}
      plan={businessContext.business.plan}
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton fallback
// ---------------------------------------------------------------------------

function FormsPageSkeleton() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="flex flex-col gap-2 sm:hidden" style={{ minHeight: 240 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-4 py-3.5"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36 max-w-full rounded-md" />
              <Skeleton className="h-3 w-28 max-w-full rounded-md" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <DashboardTableContainer className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Inquiries</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-8 rounded-md" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardTableContainer>
    </>
  );
}
