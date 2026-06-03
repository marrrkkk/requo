/**
 * Admin console navigation.
 *
 * Single source of truth for the admin left-rail, breadcrumbs, and route
 * helpers. Consumed by `admin-nav.tsx`, `admin-shell-frame.tsx`, and pages.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Briefcase,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Users,
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

export const ADMIN_ROOT_PATH = "/";
export const ADMIN_USERS_PATH = "/users";
export const ADMIN_BUSINESSES_PATH = "/businesses";
export const ADMIN_SUBSCRIPTIONS_PATH = "/subscriptions";
export const ADMIN_AUDIT_LOGS_PATH = "/audit-logs";
export const ADMIN_SYSTEM_PATH = "/system";

export const adminNavigation: readonly AdminNavigationItem[] = [
  {
    href: ADMIN_ROOT_PATH,
    label: "Dashboard",
    description: "Platform snapshot and system status.",
    icon: LayoutDashboard,
  },
  {
    href: ADMIN_SYSTEM_PATH,
    label: "System",
    description: "Integration health and environment configuration.",
    icon: Activity,
  },
  {
    href: ADMIN_USERS_PATH,
    label: "Users",
    description: "Search, inspect, and support Requo users.",
    icon: Users,
  },
  {
    href: ADMIN_BUSINESSES_PATH,
    label: "Businesses",
    description: "Read-only review of customer business setups.",
    icon: Briefcase,
  },
  {
    href: ADMIN_SUBSCRIPTIONS_PATH,
    label: "Subscriptions",
    description: "Inspect account subscriptions and billing state.",
    icon: CreditCard,
  },
  {
    href: ADMIN_AUDIT_LOGS_PATH,
    label: "Audit",
    description: "Every admin view and action, newest first.",
    icon: ScrollText,
  },
] as const;

export function getAdminUserDetailPath(userId: string) {
  return `${ADMIN_USERS_PATH}/${userId}`;
}

export function getAdminBusinessDetailPath(businessId: string) {
  return `${ADMIN_BUSINESSES_PATH}/${businessId}`;
}

export function getAdminSubscriptionDetailPath(subscriptionId: string) {
  return `${ADMIN_SUBSCRIPTIONS_PATH}/${subscriptionId}`;
}

export function getAdminStartImpersonationPath(userId: string) {
  return `${ADMIN_USERS_PATH}/${userId}/impersonate`;
}

export const ADMIN_STOP_IMPERSONATING_PATH = "/stop-impersonating";

export function isAdminNavigationItemActive(pathname: string, href: string) {
  if (href === ADMIN_ROOT_PATH) {
    return pathname === ADMIN_ROOT_PATH;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveAdminNavigationItem(pathname: string) {
  return adminNavigation.find((item) =>
    isAdminNavigationItemActive(pathname, item.href),
  );
}

function withDashboardHome(
  items: AdminBreadcrumbItem[],
): AdminBreadcrumbItem[] {
  return [{ label: "Dashboard", href: ADMIN_ROOT_PATH }, ...items];
}

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumbItem[] {
  if (pathname === ADMIN_ROOT_PATH) {
    return [{ label: "Dashboard" }];
  }

  if (pathname === ADMIN_SYSTEM_PATH) {
    return withDashboardHome([{ label: "System" }]);
  }

  if (pathname === ADMIN_USERS_PATH) {
    return withDashboardHome([{ label: "Users" }]);
  }

  if (pathname.startsWith(`${ADMIN_USERS_PATH}/`)) {
    const segment = pathname.slice(ADMIN_USERS_PATH.length + 1);
    if (segment.includes("/")) {
      return withDashboardHome([{ label: "Users", href: ADMIN_USERS_PATH }]);
    }
    return withDashboardHome([
      { label: "Users", href: ADMIN_USERS_PATH },
      { label: "User detail" },
    ]);
  }

  if (pathname === ADMIN_BUSINESSES_PATH) {
    return withDashboardHome([{ label: "Businesses" }]);
  }

  if (pathname.startsWith(`${ADMIN_BUSINESSES_PATH}/`)) {
    return withDashboardHome([
      { label: "Businesses", href: ADMIN_BUSINESSES_PATH },
      { label: "Business detail" },
    ]);
  }

  if (pathname === ADMIN_SUBSCRIPTIONS_PATH) {
    return withDashboardHome([{ label: "Subscriptions" }]);
  }

  if (pathname.startsWith(`${ADMIN_SUBSCRIPTIONS_PATH}/`)) {
    return withDashboardHome([
      { label: "Subscriptions", href: ADMIN_SUBSCRIPTIONS_PATH },
      { label: "Subscription detail" },
    ]);
  }

  if (pathname === ADMIN_AUDIT_LOGS_PATH) {
    return withDashboardHome([{ label: "Audit" }]);
  }

  return withDashboardHome([{ label: "Admin" }]);
}
