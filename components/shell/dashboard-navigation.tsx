import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Inbox,
  LayoutDashboard,
  Settings2,
} from "lucide-react";

export type DashboardNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const dashboardNavigation: DashboardNavigationItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Action queues, momentum, and the next owner actions.",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/inquiries",
    label: "Requests",
    description: "Capture, review, and move customer requests forward.",
    icon: Inbox,
  },
  {
    href: "/dashboard/quotes",
    label: "Quotes",
    description: "Draft, send, and track quotes from one place.",
    icon: FileText,
  },
  {
    href: "/dashboard/settings",
    label: "Workspace",
    description: "Open general settings, pricing library, and reusable knowledge.",
    icon: Settings2,
  },
];

function resolveDashboardActivePathname(pathname: string) {
  if (
    pathname === "/dashboard/analytics" ||
    pathname.startsWith("/dashboard/analytics/")
  ) {
    return "/dashboard";
  }

  if (
    pathname === "/dashboard/knowledge" ||
    pathname.startsWith("/dashboard/knowledge/")
  ) {
    return "/dashboard/settings/knowledge";
  }

  return pathname;
}

export function isDashboardNavigationItemActive(
  pathname: string,
  href: string,
) {
  const activePathname = resolveDashboardActivePathname(pathname);

  if (href === "/dashboard") {
    return activePathname === href;
  }

  return activePathname === href || activePathname.startsWith(`${href}/`);
}

export function getActiveDashboardNavigationItem(pathname: string) {
  const activePathname = resolveDashboardActivePathname(pathname);

  return (
    dashboardNavigation.find((item) =>
      isDashboardNavigationItemActive(activePathname, item.href),
    ) ?? dashboardNavigation[0]
  );
}
