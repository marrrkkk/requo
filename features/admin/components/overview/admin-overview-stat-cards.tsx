"use client";

import {
  RiBriefcaseLine,
  RiFileTextLine,
  RiInboxLine,
  RiUserLine,
} from "@remixicon/react";

import {
  StatCards,
  type Stat,
} from "@/components/application/dashboard/stat-cards";
import type { AdminOverviewStat } from "@/features/admin/components/overview/admin-overview-stats";

const ICONS: Record<AdminOverviewStat["icon"], Stat["icon"]> = {
  users: RiUserLine,
  businesses: RiBriefcaseLine,
  inquiries: RiInboxLine,
  quotes: RiFileTextLine,
};

/**
 * Client bridge for the admin Overview KPI tiles.
 *
 * Accepts serializable icon keys from the server and resolves them to
 * icon components here, because component references cannot cross the
 * server → client boundary (same bridge as `HomeKpiCards`).
 */
export function AdminOverviewStatCards({
  stats,
}: {
  stats: AdminOverviewStat[];
}) {
  const resolved: Stat[] = stats.map((stat) => ({
    ...stat,
    icon: ICONS[stat.icon],
  }));

  return <StatCards stats={resolved} variant="plain" />;
}
