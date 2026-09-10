"use client";

import {
  Astroid,
  Bell,
  BookOpen,
  Building2,
  Receipt,
  FileText,
  LifeBuoy,
  Mail,
  Palette,
  ScrollText,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  DashboardSidebar,
  type DashboardNavItem,
} from "@/components/application/dashboard/dashboard-sidebar";
import type { SettingsNavigationGroup } from "@/features/settings/navigation";

/**
 * String-icon map mirroring `settingsIcons` in `settings-shell-frame.tsx`.
 * Kept local so the frame can import this adapter without a module cycle.
 */
const boarduiSettingsIcons: Record<string, LucideIcon> = {
  user: User,
  palette: Palette,
  bell: Bell,
  building: Building2,
  astroid: Astroid,
  receipt: Receipt,
  "file-text": FileText,
  mail: Mail,
  tag: Tag,
  book: BookOpen,
  "life-buoy": LifeBuoy,
  scroll: ScrollText,
};

type BoarduiSettingsSidebarProps = {
  businessSlug: string;
  groups: SettingsNavigationGroup[];
  /** Rendered at the top of the sidebar in place of the demo workspace menu. */
  topSlot?: ReactNode;
  /** Rendered at the bottom of the sidebar in place of the demo team card. */
  bottomSlot?: ReactNode;
};

/**
 * Settings sidebar wired to the BoardUI Sidebar following the docs usage
 * example (`DashboardSidebar` with `items` + `selected`).
 *
 * The grouped settings navigation is flattened into BoardUI's flat item
 * list (group order preserved); the demo secondary Support/Settings rows
 * are hidden because the settings shell owns its own navigation, including
 * an explicit Help & Support entry rendered by the frame.
 */
export function BoarduiSettingsSidebar({
  businessSlug: _businessSlug,
  groups,
  topSlot,
  bottomSlot,
}: BoarduiSettingsSidebarProps) {
  const pathname = usePathname();

  const flatItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  const items = useMemo<DashboardNavItem[]>(
    () =>
      flatItems.map((item) => ({
        key: item.href,
        label: item.label,
        icon: boarduiSettingsIcons[item.icon] ?? User,
        href: item.href,
      })),
    [flatItems],
  );

  const selected = useMemo(() => {
    const match = flatItems
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];

    return match?.href ?? flatItems[0]?.href ?? "settings";
  }, [flatItems, pathname]);

  return (
    <DashboardSidebar
      items={items}
      selected={selected}
      topSlot={topSlot}
      bottomSlot={bottomSlot}
      hideSecondaryNav
    />
  );
}
