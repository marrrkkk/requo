import { adminNavigationItems } from "@/features/admin/constants";

export type AdminBreadcrumb = {
  label: string;
  href?: string;
};

/**
 * Derive breadcrumbs from the current pathname against the admin nav items.
 *
 * - `/admin`              → [{label: "Overview"}]
 * - `/admin/users`        → [{label: "Users"}]
 * - `/admin/users/abc123` → [{label: "Users", href: "/admin/users"}, {label: "User detail"}]
 */
export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  // Exact match — single breadcrumb with no link (it's the current page).
  const exactMatch = adminNavigationItems.find(
    (item) => item.href === pathname,
  );

  if (exactMatch) {
    return [{ label: exactMatch.label }];
  }

  // Sub-route — find the parent nav item and add a generic "detail" breadcrumb.
  const parentMatch = adminNavigationItems.find(
    (item) => item.href !== "/admin" && pathname.startsWith(`${item.href}/`),
  );

  if (parentMatch) {
    return [
      { label: parentMatch.label, href: parentMatch.href },
      { label: "Detail" },
    ];
  }

  return [{ label: "Admin" }];
}
