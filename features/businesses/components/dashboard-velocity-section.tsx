import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFreeAnalytics } from "@/features/analytics/queries";
import { getBusinessAnalyticsPath } from "@/features/businesses/routes";
import { cn } from "@/lib/utils";

type DashboardVelocitySectionProps = {
  businessSlug: string;
  analyticsPromise: Promise<Awaited<ReturnType<typeof getFreeAnalytics>>>;
};

export async function DashboardVelocitySection({
  businessSlug,
  analyticsPromise,
}: DashboardVelocitySectionProps) {
  const analytics = await analyticsPromise;

  const hasActivity =
    analytics.inquirySubmissions > 0 ||
    analytics.quotesSent > 0 ||
    analytics.quotesAccepted > 0;

  if (!hasActivity) {
    return null;
  }

  const acceptanceRate = analytics.quoteAcceptanceRate;
  const inquiryToQuoteRate = analytics.inquiryToQuoteRate;

  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href={getBusinessAnalyticsPath(businessSlug)} prefetch={true}>
            Full analytics
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      }
      description="Last 30 days conversion and workflow velocity."
      title="Pulse"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VelocityStat
          label="Inquiries"
          value={analytics.inquirySubmissions}
          suffix="received"
        />
        <VelocityStat
          label="Inquiry → quote"
          value={formatPercent(inquiryToQuoteRate)}
          suffix="coverage"
          highlight={inquiryToQuoteRate >= 0.7}
        />
        <VelocityStat
          label="Quotes sent"
          value={analytics.quotesSent}
          suffix="sent"
        />
        <VelocityStat
          label="Acceptance rate"
          value={formatPercent(acceptanceRate)}
          suffix="accepted"
          highlight={acceptanceRate >= 0.5}
        />
      </div>
    </DashboardSection>
  );
}

function VelocityStat({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string;
  value: number | string;
  suffix: string;
  highlight?: boolean;
}) {
  return (
    <div className="soft-panel px-4 py-4">
      <p className="meta-label">{label}</p>
      <p
        className={cn(
          "mt-2 text-[1.5rem] font-semibold tracking-tight text-foreground",
          highlight && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{suffix}</p>
    </div>
  );
}

function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export function DashboardVelocitySectionFallback() {
  return (
    <DashboardSection
      action={<Skeleton className="h-9 w-28 rounded-lg" />}
      description={<Skeleton className="h-4 w-full max-w-xs rounded-md" />}
      title="Pulse"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="soft-panel px-4 py-4" key={index}>
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="mt-2 h-7 w-14 rounded-md" />
            <Skeleton className="mt-1 h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
