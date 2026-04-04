import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Inbox,
  LayoutDashboard,
  Settings2,
} from "lucide-react";

import {
  getWorkspaceAnalyticsPath,
  getWorkspaceDashboardPath,
  getWorkspaceDashboardSlugFromPathname,
  getWorkspaceInquiriesPath,
  getWorkspaceKnowledgeCompatibilityPath,
  getWorkspaceQuotesPath,
  getWorkspaceSettingsPath,
} from "@/features/workspaces/routes";

export type DashboardNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function getDashboardNavigation(slug: string): DashboardNavigationItem[] {
  return [
    {
      href: getWorkspaceDashboardPath(slug),
      label: "Overview",
      description: "Action queues, momentum, and the next owner actions.",
      icon: LayoutDashboard,
    },
    {
      href: getWorkspaceInquiriesPath(slug),
      label: "Requests",
      description: "Capture, review, and move customer requests forward.",
      icon: Inbox,
    },
    {
      href: getWorkspaceQuotesPath(slug),
      label: "Quotes",
      description: "Draft, send, and track quotes from one place.",
      icon: FileText,
    },
    {
      href: getWorkspaceSettingsPath(slug),
      label: "Settings",
      description: "Open general settings, pricing library, and reusable knowledge.",
      icon: Settings2,
    },
  ];
}

function resolveDashboardActivePathname(pathname: string) {
  const slug = getWorkspaceDashboardSlugFromPathname(pathname);

  if (!slug) {
    return pathname;
  }

  const analyticsPath = getWorkspaceAnalyticsPath(slug);
  const knowledgeCompatibilityPath = getWorkspaceKnowledgeCompatibilityPath(slug);

  if (pathname === analyticsPath || pathname.startsWith(`${analyticsPath}/`)) {
    return getWorkspaceDashboardPath(slug);
  }

  if (
    pathname === knowledgeCompatibilityPath ||
    pathname.startsWith(`${knowledgeCompatibilityPath}/`)
  ) {
    return getWorkspaceSettingsPath(slug, "knowledge");
  }

  return pathname;
}

export function isDashboardNavigationItemActive(
  pathname: string,
  href: string,
) {
  const activePathname = resolveDashboardActivePathname(pathname);

  if (href.endsWith("/dashboard")) {
    return activePathname === href;
  }

  return activePathname === href || activePathname.startsWith(`${href}/`);
}

export function getActiveDashboardNavigationItem(pathname: string) {
  const activePathname = resolveDashboardActivePathname(pathname);
  const slug = getWorkspaceDashboardSlugFromPathname(activePathname);

  if (!slug) {
    return null;
  }

  const dashboardNavigation = getDashboardNavigation(slug);

  return (
    dashboardNavigation.find((item) =>
      isDashboardNavigationItemActive(activePathname, item.href),
    ) ?? dashboardNavigation[0]
  );
}
