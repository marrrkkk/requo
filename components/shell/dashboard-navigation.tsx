import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  ClipboardList,
  FileText,
  FormInput,
  Home,
  Inbox,
  Receipt,
  Settings,
  Workflow,
} from "lucide-react";


import {
  canManageOperationalBusinessSettings,
  canViewBusinessAnalytics,
  type BusinessMemberRole,
} from "@/lib/business-members";
import {
  getBusinessAnalyticsPath,
  getBusinessAutomationsPath,
  getBusinessChatPath,
  getBusinessDashboardPath,
  getBusinessDashboardSlugFromPathname,
  getBusinessPath,
  getBusinessFollowUpsPath,
  getBusinessFormsPath,
  getBusinessInquiriesPath,
  getBusinessInvoicesPath,
  getBusinessJobsPath,
  getBusinessMembersPath,
  getBusinessNewInquiryPath,
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

export function getDashboardNavigation(
  slug: string,
  role: BusinessMemberRole,
): DashboardNavigationItem[] {
  return [
    {
      href: getBusinessDashboardPath(slug),
      label: "Home",
      description: "Your home base: see what needs attention.",
      icon: Home,
    },
    {
      href: getBusinessInquiriesPath(slug),
      label: "Inquiries",
      description: "Capture, review, and move customer inquiries forward.",
      icon: Inbox,
    },
    {
      href: getBusinessQuotesPath(slug),
      label: "Quotes",
      description: "Draft, send, and track quotes from one place.",
      icon: FileText,
    },
    {
      href: getBusinessFollowUpsPath(slug),
      label: "Follow-ups",
      description: "See who needs contact next and when.",
      icon: BellRing,
    },
    {
      href: getBusinessJobsPath(slug),
      label: "Jobs",
      description: "Track accepted work from start to finish.",
      icon: ClipboardList,
    },
    {
      href: getBusinessInvoicesPath(slug),
      label: "Invoices",
      description: "Generate, send, and track payment for completed work.",
      icon: Receipt,
    },
    {
      href: getBusinessFormsPath(slug),
      label: "Forms",
      description: "Build and manage the forms that capture customer inquiries.",
      icon: FormInput,
    },
    {
      href: getBusinessAutomationsPath(slug),
      label: "Automations",
      description: "Automate follow-ups, handoffs, and routine workflow steps.",
      icon: Workflow,
    },
    ...(canViewBusinessAnalytics(role)
      ? [
          {
            href: getBusinessAnalyticsPath(slug),
            label: "Analytics",
            description: "Track form performance, quote outcomes, and workflow timing.",
            icon: BarChart3,
          },
        ]
      : []),
    ...(canManageOperationalBusinessSettings(role)
      ? [
          {
            href: getBusinessSettingsPath(slug, "general"),
            label: "Settings",
            description: "Manage members, defaults, and business setup.",
            icon: Settings,
          },
        ]
      : []),
  ];
}

function resolveDashboardActivePathname(pathname: string) {
  const slug = getBusinessDashboardSlugFromPathname(pathname);

  if (!slug) {
    return pathname;
  }

  const membersPath = getBusinessMembersPath(slug);

  // Top-level members is still available, but the primary nav treats it as setup.
  if (
    pathname === membersPath ||
    pathname.startsWith(`${membersPath}/`)
  ) {
    return getBusinessSettingsPath(slug, "members");
  }

  const legacyDashboardPath = `${getBusinessPath(slug)}/dashboard`;
  const homePath = getBusinessDashboardPath(slug);

  if (pathname === legacyDashboardPath) {
    return homePath;
  }

  return pathname;
}

export function isDashboardNavigationItemActive(
  pathname: string,
  href: string,
) {
  const activePathname = resolveDashboardActivePathname(pathname);

  if (href.endsWith("/settings/general")) {
    const settingsRootPath = href.slice(0, -"/general".length);

    return (
      activePathname === settingsRootPath ||
      activePathname.startsWith(`${settingsRootPath}/`)
    );
  }

  if (href.endsWith("/home")) {
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

  const dashboardNavigation = getDashboardNavigation(slug, "owner");

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
  _slug: string,
  items: DashboardBreadcrumbItem[],
): DashboardBreadcrumbItem[] {
  const normalizedItems = items.map((item) => ({
    ...item,
    label: item.label
      .replace(/^Requests$/, "Inquiries")
      .replace(/^Request\b/, "Inquiry"),
  }));

  return normalizedItems;
}

export function getDashboardBreadcrumbs(pathname: string): DashboardBreadcrumbItem[] {
  const slug = getBusinessDashboardSlugFromPathname(pathname);

  if (!slug) {
    return [];
  }

  const dashboardPath = getBusinessDashboardPath(slug);
  const analyticsPath = getBusinessAnalyticsPath(slug);
  const followUpsPath = getBusinessFollowUpsPath(slug);
  const inquiriesPath = getBusinessInquiriesPath(slug);
  const quotesPath = getBusinessQuotesPath(slug);
  const formsPath = getBusinessFormsPath(slug);
  const membersPath = getBusinessMembersPath(slug);
  const settingsPath = getBusinessSettingsPath(slug);

  if (pathname === dashboardPath) {
    return [{ label: "Home" }];
  }

  if (pathname === analyticsPath || pathname.startsWith(`${analyticsPath}/`)) {
    return withDashboardHome(slug, [{ label: "Analytics" }]);
  }

  if (pathname === inquiriesPath) {
    return withDashboardHome(slug, [{ label: "Inquiries" }]);
  }

  if (pathname === getBusinessNewInquiryPath(slug)) {
    return withDashboardHome(slug, [
      {
        label: "Inquiries",
        href: inquiriesPath,
      },
      {
        label: "New inquiry",
      },
    ]);
  }

  if (pathname.startsWith(`${inquiriesPath}/`)) {
    const inquiryId = pathname.slice(`${inquiriesPath}/`.length).split("/")[0];

    return withDashboardHome(slug, [
      {
        label: "Inquiries",
        href: inquiriesPath,
      },
      {
        label: inquiryId
          ? `Inquiry: ${formatRecordHint(inquiryId)}`
          : "Inquiry details",
      },
    ]);
  }

  if (pathname === quotesPath) {
    return withDashboardHome(slug, [{ label: "Quotes" }]);
  }

  if (pathname === followUpsPath || pathname.startsWith(`${followUpsPath}/`)) {
    return withDashboardHome(slug, [{ label: "Follow-ups" }]);
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
          ? `Quote: ${formatRecordHint(quoteId)}`
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

  if (pathname === membersPath || pathname.startsWith(`${membersPath}/`)) {
    return withDashboardHome(slug, [{ label: "Members" }]);
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
      quote: "Quote defaults",
      pricing: "Pricing",
      knowledge: "Knowledge",
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

  const chatPath = getBusinessChatPath(slug);

  if (pathname === `${chatPath}/new`) {
    return [{ label: "New chat" }];
  }

  if (pathname.startsWith(`${chatPath}/`)) {
    return [{ label: "Chat" }];
  }

  return [{ label: "Home" }];
}

