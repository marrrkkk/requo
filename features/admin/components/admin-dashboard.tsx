import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  Briefcase,
  CreditCard,
  LineChart,
  Send,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboardQuickLinks } from "@/features/admin/components/admin-dashboard-quick-links";
import { AdminDashboardStatCard } from "@/features/admin/components/admin-dashboard-stat-card";
import { AdminDashboardTileBoundary } from "@/features/admin/components/admin-dashboard-tile-boundary";
import { AdminSystemHealthBanner } from "@/features/admin/components/admin-system-health-summary";
import {
  ADMIN_BUSINESSES_PATH,
  ADMIN_SUBSCRIPTIONS_PATH,
  ADMIN_USERS_PATH,
} from "@/features/admin/navigation";
import { getAdminDashboardCounts } from "@/features/admin/queries";
import type { AdminDashboardCounts } from "@/features/admin/types";
import { planMeta, type BusinessPlan, isBusinessPlan } from "@/lib/plans/plans";

/**
 * Admin landing dashboard.
 *
 * Visual hierarchy (top to bottom):
 * 1. System health banner — prominent, colored accent, immediate status
 * 2. Platform KPIs — 4-up grid of elevated stat cards
 * 3. Weekly activity — 2-up grid showing recent throughput
 * 4. Quick access — subtle action links to admin workflows
 */
export function AdminDashboard() {
  const countsPromise = getAdminDashboardCounts();

  return (
    <div className="flex flex-col gap-8">
      {/* 1. System health — most prominent element */}
      <Suspense fallback={<HealthBannerSkeleton />}>
        <AdminSystemHealthBanner />
      </Suspense>

      {/* 2. Platform KPIs */}
      <section className="flex flex-col gap-4">
        <h2 className="meta-label">Platform</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardTile label="Total users">
            <TotalUsersTile countsPromise={countsPromise} />
          </DashboardTile>
          <DashboardTile label="Businesses">
            <BusinessesTile countsPromise={countsPromise} />
          </DashboardTile>
          <DashboardTile label="Subscriptions">
            <ActiveSubscriptionsTile countsPromise={countsPromise} />
          </DashboardTile>
          <DashboardTile label="Sign-ups (7d)">
            <SignUpsTile countsPromise={countsPromise} />
          </DashboardTile>
        </div>
      </section>

      {/* 3. Weekly activity */}
      <section className="flex flex-col gap-4">
        <h2 className="meta-label">Activity (last 7 days)</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardTile label="Inquiries">
            <InquiriesTile countsPromise={countsPromise} />
          </DashboardTile>
          <DashboardTile label="Quotes sent">
            <QuotesSentTile countsPromise={countsPromise} />
          </DashboardTile>
        </div>
      </section>

      {/* 4. Quick access */}
      <section className="flex flex-col gap-4">
        <h2 className="meta-label">Quick access</h2>
        <AdminDashboardQuickLinks />
      </section>
    </div>
  );
}

/* ─── Tiles ─────────────────────────────────────────────────────────── */

type DashboardTileProps = {
  label: string;
  children: ReactNode;
};

function DashboardTile({ label, children }: DashboardTileProps) {
  return (
    <AdminDashboardTileBoundary label={label}>
      <Suspense fallback={<StatCardSkeleton />}>{children}</Suspense>
    </AdminDashboardTileBoundary>
  );
}

type TileProps = {
  countsPromise: Promise<AdminDashboardCounts>;
};

async function TotalUsersTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <AdminDashboardStatCard
      href={ADMIN_USERS_PATH}
      icon={Users}
      label="Total users"
      value={formatCount(counts.totalUsers)}
      description={`${formatCount(counts.totalBusinesses)} businesses`}
      emphasize={counts.totalUsers > 0}
    />
  );
}

async function BusinessesTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <AdminDashboardStatCard
      href={ADMIN_BUSINESSES_PATH}
      icon={Briefcase}
      label="Businesses"
      value={formatCount(counts.totalBusinesses)}
      description="Active workspaces"
    />
  );
}

async function ActiveSubscriptionsTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;
  const breakdown = getPlanBreakdownEntries(counts.activeSubscriptionsByPlan);

  return (
    <AdminDashboardStatCard
      href={ADMIN_SUBSCRIPTIONS_PATH}
      icon={CreditCard}
      label="Active subscriptions"
      value={formatCount(counts.totalActiveSubscriptions)}
      emphasize={counts.totalActiveSubscriptions > 0}
      description={breakdown.length === 0 ? "No active paid plans" : "By tier"}
      footer={
        breakdown.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {breakdown.map(([plan, count]) => (
              <Badge key={plan} variant="secondary">
                {isBusinessPlan(plan) ? planMeta[plan].label : plan}{" "}
                {formatCount(count)}
              </Badge>
            ))}
          </div>
        ) : null
      }
    />
  );
}

async function SignUpsTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <AdminDashboardStatCard
      href={ADMIN_USERS_PATH}
      icon={UserPlus}
      label="Sign-ups (7d)"
      value={formatCount(counts.signUpsLast7d)}
      emphasize={counts.signUpsLast7d > 0}
      description="New accounts this week"
    />
  );
}

async function InquiriesTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <AdminDashboardStatCard
      href={ADMIN_BUSINESSES_PATH}
      icon={LineChart}
      label="Inquiries received"
      value={formatCount(counts.inquiriesLast7d)}
      emphasize={counts.inquiriesLast7d > 0}
      description="Customer requests this week"
    />
  );
}

async function QuotesSentTile({ countsPromise }: TileProps) {
  const counts = await countsPromise;

  return (
    <AdminDashboardStatCard
      href={ADMIN_BUSINESSES_PATH}
      icon={Send}
      label="Quotes sent"
      value={formatCount(counts.quotesSentLast7d)}
      emphasize={counts.quotesSentLast7d > 0}
      description="Proposals delivered this week"
    />
  );
}

/* ─── Skeletons ─────────────────────────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <div aria-busy className="section-panel flex flex-col gap-4 px-5 py-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
    </div>
  );
}

function HealthBannerSkeleton() {
  return (
    <div
      aria-busy
      className="section-panel border-l-4 border-l-border px-5 py-5 sm:px-6 sm:py-6"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton className="h-7 w-16 rounded-md" key={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const countFormatter = new Intl.NumberFormat("en-US");

function formatCount(value: number): string {
  return countFormatter.format(value);
}

function getPlanBreakdownEntries(
  activeByPlan: AdminDashboardCounts["activeSubscriptionsByPlan"],
): Array<[string, number]> {
  const entries = Object.entries(activeByPlan).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    return [];
  }

  const planOrder = Object.keys(planMeta) as BusinessPlan[];

  entries.sort(([a], [b]) => {
    const aIndex = isBusinessPlan(a)
      ? planOrder.indexOf(a)
      : Number.MAX_SAFE_INTEGER;
    const bIndex = isBusinessPlan(b)
      ? planOrder.indexOf(b)
      : Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b);
  });

  return entries;
}
