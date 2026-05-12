import type { ReactNode } from "react";
import { Suspense } from "react";

import {
  DashboardSection,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboardTileBoundary } from "@/features/admin/components/admin-dashboard-tile-boundary";
import { getAdminDashboardCounts } from "@/features/admin/queries";
import type { AdminDashboardCounts } from "@/features/admin/types";
import { planMeta, type BusinessPlan, isBusinessPlan } from "@/lib/plans/plans";

/**
 * Landing operations dashboard.
 *
 * Renders six tiles backed by {@link getAdminDashboardCounts}:
 *
 *   1. Total users
 *   2. Total businesses
 *   3. Active subscriptions grouped by plan
 *   4. Sign-ups in the last 7 days
 *   5. Inquiries in the last 7 days
 *   6. Quotes sent in the last 7 days
 *
 * Each tile lives in its own `<Suspense>` boundary with a dedicated
 * error boundary (`AdminDashboardTileBoundary`) so one slow or failing
 * count does not block or blank out the others (Req 2.1, 2.4). The
 * underlying query is cached + `React.cache`-deduped, so rendering
 * six tiles only fires one DB round-trip per render.
 */
export function AdminDashboard() {
  const countsPromise = getAdminDashboardCounts();

  return (
    <DashboardSection
      description="Live platform counts. Cached for up to 60 seconds."
      title="Operations overview"
    >
      <DashboardStatsGrid className="xl:grid-cols-3">
        <DashboardTile label="Total users">
          <TotalUsersTile countsPromise={countsPromise} />
        </DashboardTile>
        <DashboardTile label="Total businesses">
          <TotalBusinessesTile countsPromise={countsPromise} />
        </DashboardTile>
        <DashboardTile label="Active plans">
          <ActiveSubscriptionsTile countsPromise={countsPromise} />
        </DashboardTile>
        <DashboardTile label="Sign-ups (last 7 days)">
          <SignUpsTile countsPromise={countsPromise} />
        </DashboardTile>
        <DashboardTile label="Inquiries (last 7 days)">
          <InquiriesTile countsPromise={countsPromise} />
        </DashboardTile>
        <DashboardTile label="Quotes sent (last 7 days)">
          <QuotesSentTile countsPromise={countsPromise} />
        </DashboardTile>
      </DashboardStatsGrid>
    </DashboardSection>
  );
}

type DashboardTileProps = {
  label: string;
  children: ReactNode;
};

function DashboardTile({ label, children }: DashboardTileProps) {
  return (
    <AdminDashboardTileBoundary label={label}>
      <Suspense fallback={<AdminDashboardTileSkeleton label={label} />}>
        {children}
      </Suspense>
    </AdminDashboardTileBoundary>
  );
}

function AdminDashboardTileSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy className="info-tile flex flex-col gap-3">
      <div className="meta-label">{label}</div>
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-3 w-24 rounded-md" />
    </div>
  );
}

/* ── Tile implementations ────────────────────────────────────────────── */

type TileProps = {
  countsPromise: Promise<AdminDashboardCounts>;
};

async function TotalUsersTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <InfoTile
      description="All accounts on the platform."
      label="Total users"
      value={formatCount(counts.totalUsers)}
    />
  );
}

async function TotalBusinessesTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <InfoTile
      description="Non-deleted businesses across all owners."
      label="Total businesses"
      value={formatCount(counts.totalBusinesses)}
    />
  );
}

async function ActiveSubscriptionsTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;
  const breakdown = formatPlanBreakdown(counts.activeSubscriptionsByPlan);

  return (
    <InfoTile
      description={
        breakdown ? breakdown : "No active subscriptions right now."
      }
      label="Active plans"
      value={formatCount(counts.totalActiveSubscriptions)}
    />
  );
}

async function SignUpsTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <InfoTile
      description="New user accounts this week."
      label="Sign-ups (last 7 days)"
      value={formatCount(counts.signUpsLast7d)}
    />
  );
}

async function InquiriesTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <InfoTile
      description="Inquiries submitted across every business."
      label="Inquiries (last 7 days)"
      value={formatCount(counts.inquiriesLast7d)}
    />
  );
}

async function QuotesSentTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <InfoTile
      description="Quotes marked as sent across every business."
      label="Quotes sent (last 7 days)"
      value={formatCount(counts.quotesSentLast7d)}
    />
  );
}

/* ── Formatting helpers ──────────────────────────────────────────────── */

const countFormatter = new Intl.NumberFormat("en-US");

function formatCount(value: number): string {
  return countFormatter.format(value);
}

/**
 * Render the active-subscription breakdown as a compact string like
 * "Pro 12 · Business 3". Only plans with a non-zero active count are
 * included, and plans are ordered using {@link planMeta} for stability.
 * Unknown plan keys (future-proofing) fall back to their raw identifier.
 */
function formatPlanBreakdown(
  activeByPlan: AdminDashboardCounts["activeSubscriptionsByPlan"],
): string {
  const entries = Object.entries(activeByPlan).filter(
    ([, count]) => count > 0,
  );

  if (entries.length === 0) {
    return "";
  }

  const planOrder = Object.keys(planMeta) as BusinessPlan[];

  entries.sort(([a], [b]) => {
    const aIndex = isBusinessPlan(a) ? planOrder.indexOf(a) : Number.MAX_SAFE_INTEGER;
    const bIndex = isBusinessPlan(b) ? planOrder.indexOf(b) : Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b);
  });

  return entries
    .map(([plan, count]) => {
      const label = isBusinessPlan(plan) ? planMeta[plan].label : plan;
      return `${label} ${formatCount(count)}`;
    })
    .join(" · ");
}
