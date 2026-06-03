"use client";

import Link from "next/link";
import {
  Fragment,
  type CSSProperties,
  type ReactNode,
  useMemo,
} from "react";
import { LayoutDashboard as LayoutDashboardIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AdminFooterMenu } from "@/features/admin/components/admin-footer-menu";
import { AdminNav } from "@/features/admin/components/admin-nav";
import {
  ADMIN_ROOT_PATH,
  getActiveAdminNavigationItem,
  getAdminBreadcrumbs,
} from "@/features/admin/navigation";

export type AdminShellFrameProps = {
  children: ReactNode;
  headerActions?: ReactNode;
  banner?: ReactNode;
};

/**
 * Structural admin shell aligned with `DashboardShellFrame`.
 *
 * Renders sidebar navigation, breadcrumbs, and page content. Each route
 * owns its own `PageHeader` inside `DashboardPage` — this shell does not
 * inject a global operations header.
 */
export function AdminShellFrame({
  children,
  headerActions,
  banner,
}: AdminShellFrameProps) {
  const pathname = usePathname();
  const breadcrumbs = useMemo(() => getAdminBreadcrumbs(pathname), [pathname]);
  const activeNavItem = getActiveAdminNavigationItem(pathname);
  const ActiveIcon = activeNavItem?.icon ?? LayoutDashboardIcon;

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "17.5rem",
          "--sidebar-width-icon": "4.25rem",
        } as CSSProperties
      }
    >
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-0 px-0 py-0">
          <div className="flex min-h-9 items-center justify-between px-3 py-1.5 sm:py-2">
            <BrandMark
              collapseLabel
              className="min-w-0 px-2 py-1.5"
              href={ADMIN_ROOT_PATH}
              subtitle="Admin"
            />
            <SidebarTrigger className="size-7 shrink-0" />
          </div>
          <SidebarSeparator />
        </SidebarHeader>

        <SidebarContent className="gap-4 px-1 pb-3">
          <SidebarGroup className="px-3 pt-3">
            <AdminNav />
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3 pt-2">
          <AdminFooterMenu />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar flex items-center">
          <DesktopSidebarTrigger />
          <div className="dashboard-topbar-inner min-w-0 flex-1">
            <div className="flex min-h-9 min-w-0 items-center gap-2 md:gap-2.5">
              <SidebarTrigger className="size-8 shrink-0 lg:hidden" />
              <Button
                asChild
                className="hidden size-8 shrink-0 lg:inline-flex"
                size="icon-sm"
                variant="ghost"
              >
                <Link
                  aria-label={activeNavItem?.label ?? "Dashboard"}
                  href={activeNavItem?.href ?? ADMIN_ROOT_PATH}
                  prefetch={true}
                >
                  <ActiveIcon className="size-4" />
                </Link>
              </Button>
              <span
                aria-hidden="true"
                className="hidden h-3.5 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="hidden min-w-0 flex-1 md:block">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((item, index) => {
                      const isLast = index === breadcrumbs.length - 1;

                      return (
                        <Fragment key={`${item.label}-${item.href ?? index}`}>
                          {index > 0 ? <BreadcrumbSeparator /> : null}
                          <BreadcrumbItem>
                            {isLast || !item.href ? (
                              <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link href={item.href} prefetch={true}>
                                  {item.label}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              {headerActions ? (
                <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 md:ml-auto">
                  {headerActions}
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {banner}
        <div className="flex flex-1 flex-col">
          <main className="dashboard-main">
            <div className="dashboard-content">
              <div className="flex min-w-0 flex-col gap-6 pb-16 sm:gap-7 xl:pb-24">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DesktopSidebarTrigger() {
  const { state } = useSidebar();

  if (state === "expanded") {
    return null;
  }

  return (
    <div className="hidden items-center pl-3 lg:flex">
      <SidebarTrigger className="size-8 shrink-0" />
    </div>
  );
}
