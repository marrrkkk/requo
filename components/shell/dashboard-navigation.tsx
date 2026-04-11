import type { LucideIcon } from "lucide-react";
import {
  FormInput,
  FileText,
  Inbox,
  LayoutDashboard,
  Settings2,
} from "lucide-react";

import {
  getBusinessAnalyticsPath,
  getBusinessDashboardPath,
  getBusinessDashboardSlugFromPathname,
  getBusinessFormsPath,
  getBusinessInquiriesPath,
  getBusinessKnowledgeCompatibilityPath,
  getBusinessQuotesPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";

export type DashboardNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type DashboardBreadcrumbItem = {
  label: string;
  href?: string;
};

export function getDashboardNavigation(slug: string): DashboardNavigationItem[] {
  return [
    {
      href: getBusinessDashboardPath(slug),
      label: "Dashboard",
      description: "Your home base: queues, momentum, and the next actions to take.",
      icon: LayoutDashboard,
    },
    {
      href: getBusinessInquiriesPath(slug),
      label: "Requests",
      description: "Capture, review, and move customer requests forward.",
      icon: Inbox,
    },
    {
      href: getBusinessQuotesPath(slug),
      label: "Quotes",
      description: "Draft, send, and track quotes from one place.",
      icon: FileText,
    },
    {
      href: getBusinessFormsPath(slug),
      label: "Forms",
      description: "Manage inquiry forms, public pages, and live intake flows.",
      icon: FormInput,
    },
    {
      href: getBusinessSettingsPath(slug, "general"),
      label: "Settings",
      description: "Manage business setup, reusable responses, and quote defaults.",
      icon: Settings2,
    },
  ];
}

function resolveDashboardActivePathname(pathname: string) {
  const slug = getBusinessDashboardSlugFromPathname(pathname);

  if (!slug) {
    return pathname;
  }

  const analyticsPath = getBusinessAnalyticsPath(slug);
  const knowledgeCompatibilityPath = getBusinessKnowledgeCompatibilityPath(slug);

  if (pathname === analyticsPath || pathname.startsWith(`${analyticsPath}/`)) {
    return getBusinessDashboardPath(slug);
  }

  if (
    pathname === knowledgeCompatibilityPath ||
    pathname.startsWith(`${knowledgeCompatibilityPath}/`)
  ) {
    return getBusinessSettingsPath(slug, "knowledge");
  }

  return pathname;
}

export function isDashboardNavigationItemActive(
  pathname: string,
  href: string,
) {
  const activePathname = resolveDashboardActivePathname(pathname);

  if (href.endsWith("/dashboard/settings/general")) {
    const settingsRootPath = href.slice(0, -"/general".length);

    return (
      activePathname === settingsRootPath ||
      activePathname.startsWith(`${settingsRootPath}/`)
    );
  }

  if (href.endsWith("/dashboard")) {
    return activePathname === href;
  }

  return activePathname === href || activePathname.startsWith(`${href}/`);
}

export function getActiveDashboardNavigationItem(pathname: string) {
  const activePathname = resolveDashboardActivePathname(pathname);
  const slug = getBusinessDashboardSlugFromPathname(activePathname);

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

function formatBreadcrumbLabel(value: string) {
  const normalized = decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatRecordHint(value: string) {
  const decodedValue = decodeURIComponent(value).trim();

  if (!decodedValue) {
    return "";
  }

  // Keep UUID-like or opaque IDs short so breadcrumbs stay readable.
  if (/^[a-f0-9-]{12,}$/i.test(decodedValue)) {
    return decodedValue.slice(0, 8);
  }

  return formatBreadcrumbLabel(decodedValue);
}

function withDashboardHome(
  slug: string,
  items: DashboardBreadcrumbItem[],
): DashboardBreadcrumbItem[] {
  const dashboardPath = getBusinessDashboardPath(slug);

  if (items[0]?.label === "Dashboard") {
    return items;
  }

  return [{ label: "Dashboard", href: dashboardPath }, ...items];
}

export function getDashboardBreadcrumbs(pathname: string): DashboardBreadcrumbItem[] {
  const slug = getBusinessDashboardSlugFromPathname(pathname);

  if (!slug) {
    return [];
  }

  const dashboardPath = getBusinessDashboardPath(slug);
  const analyticsPath = getBusinessAnalyticsPath(slug);
  const inquiriesPath = getBusinessInquiriesPath(slug);
  const quotesPath = getBusinessQuotesPath(slug);
  const formsPath = getBusinessFormsPath(slug);
  const settingsPath = getBusinessSettingsPath(slug);

  if (pathname === dashboardPath) {
    return [{ label: "Dashboard" }];
  }

  if (pathname === analyticsPath || pathname.startsWith(`${analyticsPath}/`)) {
    return withDashboardHome(slug, [{ label: "Analytics" }]);
  }

  if (pathname === inquiriesPath) {
    return withDashboardHome(slug, [{ label: "Requests" }]);
  }

  if (pathname.startsWith(`${inquiriesPath}/`)) {
    const inquiryId = pathname.slice(`${inquiriesPath}/`.length).split("/")[0];

    return withDashboardHome(slug, [
      {
        label: "Requests",
        href: inquiriesPath,
      },
      {
        label: inquiryId
          ? `Request · ${formatRecordHint(inquiryId)}`
          : "Request details",
      },
    ]);
  }

  if (pathname === quotesPath) {
    return withDashboardHome(slug, [{ label: "Quotes" }]);
  }

  if (pathname === `${quotesPath}/new`) {
    return withDashboardHome(slug, [
      {
        label: "Quotes",
        href: quotesPath,
      },
      {
        label: "New quote",
      },
    ]);
  }

  if (pathname.startsWith(`${quotesPath}/`)) {
    const quoteId = pathname.slice(`${quotesPath}/`.length).split("/")[0];

    return withDashboardHome(slug, [
      {
        label: "Quotes",
        href: quotesPath,
      },
      {
        label: quoteId
          ? `Quote · ${formatRecordHint(quoteId)}`
          : "Quote details",
      },
    ]);
  }

  if (pathname === formsPath) {
    return withDashboardHome(slug, [{ label: "Forms" }]);
  }

  if (pathname.startsWith(`${formsPath}/`)) {
    const formSlug = pathname.slice(`${formsPath}/`.length).split("/")[0];

    return withDashboardHome(slug, [
      {
        label: "Forms",
        href: formsPath,
      },
      {
        label: formSlug ? formatBreadcrumbLabel(formSlug) : "Form details",
      },
    ]);
  }

  if (pathname === settingsPath) {
    return withDashboardHome(slug, [{ label: "Settings" }]);
  }

  if (pathname.startsWith(`${settingsPath}/`)) {
    const relativePath = pathname.slice(`${settingsPath}/`.length);
    const segments = relativePath.split("/").filter(Boolean);
    const section = segments[0];
    const sectionLabels: Record<string, string> = {
      general: "Business profile",
      notifications: "Notifications",
      profile: "Your profile",
      inquiry: "Forms",
      replies: "Saved replies",
      quote: "Quote defaults",
      pricing: "Pricing",
      knowledge: "Knowledge base",
    };
    const sectionLabel = sectionLabels[section] ?? formatBreadcrumbLabel(section);

    if (section === "inquiry" && segments[1]) {
      return withDashboardHome(slug, [
        {
          label: "Forms",
          href: formsPath,
        },
        {
          label: formatBreadcrumbLabel(segments[1]),
        },
      ]);
    }

    return withDashboardHome(slug, [
      {
        label: "Settings",
        href: getBusinessSettingsPath(slug, "general"),
      },
      {
        label: sectionLabel,
      },
    ]);
  }

  return [{ label: "Dashboard" }];
}
