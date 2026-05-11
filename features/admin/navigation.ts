/**
 * Admin console navigation.
 *
 * Single source of truth for the admin left-rail/top tabs. Consumed by
 * `features/admin/components/admin-nav.tsx` and any breadcrumb helpers.
 */

import type { LucideIcon } from "lucide-react";
import {
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

export const ADMIN_ROOT_PATH = "/admin";
export const ADMIN_USERS_PATH = "/admin/users";
export const ADMIN_BUSINESSES_PATH = "/admin/businesses";
export const ADMIN_SUBSCRIPTIONS_PATH = "/admin/subscriptions";
export const ADMIN_AUDIT_LOGS_PATH = "/admin/audit-logs";

export const adminNavigation: readonly AdminNavigationItem[] = [
  {
    href: ADMIN_ROOT_PATH,
    label: "Dashboard",
    description: "Platform counts and operating snapshots.",
    icon: LayoutDashboard,
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

export const ADMIN_STOP_IMPERSONATING_PATH = "/admin/stop-impersonating";

export function isAdminNavigationItemActive(pathname: string, href: string) {
  if (href === ADMIN_ROOT_PATH) {
    return pathname === ADMIN_ROOT_PATH;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
