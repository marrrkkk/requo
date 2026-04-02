import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  ChartColumn,
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
    description: "Workspace summary and the next owner actions.",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/inquiries",
    label: "Inquiries",
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
    href: "/dashboard/knowledge",
    label: "Knowledge",
    description: "Store business files and FAQs for faster responses.",
    icon: BookCopy,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    description: "Watch inquiry flow and quote conversion at a glance.",
    icon: ChartColumn,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    description: "Manage workspace identity and public intake defaults.",
    icon: Settings2,
  },
];

export function isDashboardNavigationItemActive(
  pathname: string,
  href: string,
) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveDashboardNavigationItem(pathname: string) {
  return (
    dashboardNavigation.find((item) =>
      isDashboardNavigationItemActive(pathname, item.href),
    ) ?? dashboardNavigation[0]
  );
}
