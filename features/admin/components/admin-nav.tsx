"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  adminNavigation,
  isAdminNavigationItemActive,
  type AdminNavigationItem,
} from "@/features/admin/navigation";
import { cn } from "@/lib/utils";

/**
 * Left-rail/top-tabs navigation for `/admin`. Items are sourced from
 * `features/admin/navigation.ts` so the nav, breadcrumbs, and route
 * helpers stay in sync.
 *
 * Mirrors the convention in `components/shell/dashboard-navigation.tsx`:
 * a client component that reads `usePathname`, applies the active state
 * via `isAdminNavigationItemActive`, and wraps each item in a
 * `SidebarMenuButton` rendered `asChild` over a prefetched `<Link>`.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {adminNavigation.map((item) => (
        <AdminNavItem
          isActive={isAdminNavigationItemActive(pathname, item.href)}
          item={item}
          key={item.href}
        />
      ))}
    </SidebarMenu>
  );
}

type AdminNavItemProps = {
  isActive: boolean;
  item: AdminNavigationItem;
};

function AdminNavItem({ isActive, item }: AdminNavItemProps) {
  const Icon = item.icon;
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem
      data-tour={`admin-nav-${item.label.toLowerCase().replace(/[\s-]+/g, "-")}`}
    >
      <SidebarMenuButton
        asChild
        className="min-h-10 rounded-lg border border-transparent px-3 py-2 data-[active=true]:border-sidebar-primary/12 data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-primary data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        isActive={isActive}
        tooltip={item.label}
      >
        <Link
          href={item.href}
          prefetch={true}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <Icon
            className={cn(
              "text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
              isActive && "text-primary",
            )}
          />
          <span className="group-data-[collapsible=icon]:hidden">
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
