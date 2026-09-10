"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  DashboardSidebar,
  type DashboardNavItem,
} from "@/components/application/dashboard/dashboard-sidebar";
import {
  getDashboardNavigation,
  isDashboardNavigationItemActive,
} from "@/components/shell/dashboard-navigation";
import { getDefaultBusinessSettingsPath } from "@/features/settings/navigation";
import type { BusinessMemberRole } from "@/lib/business-members";

type BoarduiMainSidebarProps = {
  businessSlug: string;
  /**
   * Role used for role-gated items. The structural shell renders instantly
   * from the slug alone, so it passes the owner set — route access itself is
   * still enforced server-side.
   */
  role?: BusinessMemberRole;
  /** Rendered at the top of the sidebar in place of the demo workspace menu. */
  topSlot?: ReactNode;
  /** Rendered at the bottom of the sidebar in place of the demo team card. */
  bottomSlot?: ReactNode;
  /** When provided, Quick Search opens the global quick-actions dialog. */
  onQuickSearch?: () => void;
};

/**
 * Main dashboard sidebar wired to the BoardUI Sidebar following the docs
 * usage example (`DashboardSidebar` with `items` + `selected`).
 *
 * Requo navigation (hrefs, labels, icons, active states) is mapped onto
 * BoardUI's `DashboardNavItem[]`; the Settings secondary row points at the
 * business settings entry and Support at the settings support page.
 */
export function BoarduiMainSidebar({
  businessSlug,
  role = "owner",
  topSlot,
  bottomSlot,
  onQuickSearch,
}: BoarduiMainSidebarProps) {
  const pathname = usePathname();

  const navigation = useMemo(
    () => getDashboardNavigation(businessSlug, role),
    [businessSlug, role],
  );

  const items = useMemo<DashboardNavItem[]>(
    () =>
      navigation.map((item) => ({
        key: item.href,
        label: item.label,
        icon: item.icon,
        href: item.href,
      })),
    [navigation],
  );

  const selected = useMemo(
    () =>
      navigation.find((item) =>
        isDashboardNavigationItemActive(pathname, item.href),
      )?.href ??
      navigation[0]?.href ??
      "home",
    [navigation, pathname],
  );

  return (
    <DashboardSidebar
      items={items}
      selected={selected}
      topSlot={topSlot}
      bottomSlot={bottomSlot}
      settingsHref={getDefaultBusinessSettingsPath(businessSlug, role)}
      supportHref={`/${businessSlug}/settings/support`}
      onQuickSearch={onQuickSearch}
    />
  );
}
