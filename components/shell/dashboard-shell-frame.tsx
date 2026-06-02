"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Fragment, memo, type CSSProperties, type ReactNode, useMemo } from "react";
import { Home as HomeIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  getActiveDashboardNavigationItem,
  getDashboardBreadcrumbs,
  getDashboardNavigation,
  isDashboardNavigationItemActive,
  type DashboardNavigationItem as NavItem,
} from "@/components/shell/dashboard-navigation";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getBusinessChatNewPath, getBusinessDashboardPath } from "@/features/businesses/routes";
import { RequoIcon } from "@/components/shared/requo-icon";
import { cn } from "@/lib/utils";

const CommandMenu = dynamic(
  () =>
    import("@/components/shell/command-menu").then(
      (module) => module.CommandMenu,
    ),
  {
    loading: () => (
      <div className="hidden h-9 w-64 rounded-lg border border-border/60 bg-muted/20 md:block lg:w-80" />
    ),
  },
);

export type DashboardShellFrameProps = {
  children: ReactNode;
  /** Business slug from URL params — available synchronously. */
  businessSlug: string;
  /** Streamed business switcher slot (Suspense-wrapped). */
  businessSwitcherSlot: ReactNode;
  /** Streamed user menu slot (Suspense-wrapped). */
  userMenuSlot: ReactNode;
  /** Streamed notification bell slot (Suspense-wrapped). */
  notificationSlot: ReactNode;
  /** Streamed upgrade button slot (Suspense-wrapped). */
  upgradeSlot: ReactNode;
  /** Streamed getting started checklist for the sidebar. */
  checklistSlot?: ReactNode;
  /** Streamed theme sync slot (Suspense-wrapped). */
  themeSyncSlot?: ReactNode;
  /** Streamed banner slot below the top nav. */
  bannerSlot?: ReactNode;
  /** Streamed command menu slot (Suspense-wrapped, provides role/plan context). */
  commandMenuSlot?: ReactNode;
};

/**
 * Structural dashboard shell that renders instantly without awaiting data.
 *
 * The sidebar frame, navigation items, topbar, and page structure all render
 * from the URL slug alone. Data-dependent sections (business switcher, user
 * menu, notifications, upgrade button) are passed as ReactNode slots that
 * stream in via Suspense boundaries from the server layout.
 *
 * This eliminates the full-page skeleton on navigation — users see the real
 * shell chrome immediately and only data-dependent slots show loading states.
 */
export function DashboardShellFrame({
  children,
  businessSlug,
  businessSwitcherSlot,
  userMenuSlot,
  notificationSlot,
  upgradeSlot: _upgradeSlot,
  checklistSlot,
  themeSyncSlot,
  bannerSlot,
  commandMenuSlot,
}: DashboardShellFrameProps) {
  const pathname = usePathname();
  const breadcrumbs = useMemo(() => getDashboardBreadcrumbs(pathname), [pathname]);

  // Render all nav items (owner role) — role-gated items will still show for
  // the structural frame. In practice most users are owners. The nav is fully
  // functional immediately; role restrictions are enforced server-side on the
  // actual routes regardless.
  const dashboardNavigation = useMemo(
    () => getDashboardNavigation(businessSlug, "owner"),
    [businessSlug],
  );

  const currentPageLabel = breadcrumbs.at(-1)?.label ?? businessSlug;
  const dashboardPath = getBusinessDashboardPath(businessSlug);
  const activeNavItem = getActiveDashboardNavigationItem(pathname);
  const ActiveIcon = activeNavItem?.icon ?? HomeIcon;

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
      {themeSyncSlot}
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-0 px-0 py-0">
          <div className="flex min-h-9 items-center justify-between px-3 py-1.5 sm:py-2">
            <BrandMark
              collapseLabel
              className="min-w-0 px-2 py-1.5"
              subtitle={null}
              href={dashboardPath}
            />
            <SidebarTrigger className="size-7 shrink-0" />
          </div>
          <SidebarSeparator />
          <div className="px-3 py-3">
            {businessSwitcherSlot}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-4 px-1 pb-3">
          <SidebarGroup className="px-3 pt-3">
            <SidebarMenu>
              {dashboardNavigation.map((item) => (
                <DashboardNavigationItem
                  isActive={isDashboardNavigationItemActive(pathname, item.href)}
                  item={item}
                  key={item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {checklistSlot}
        <SidebarSeparator />

        <SidebarFooter className="p-3 pt-2">
          {userMenuSlot}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar flex items-center">
          <DesktopSidebarTrigger />
          <div className="dashboard-topbar-inner min-w-0 flex-1">
            <div className="flex min-h-9 min-w-0 items-center gap-2 md:gap-2.5">
              <SidebarTrigger className="size-8 shrink-0 lg:hidden" />
              <Button asChild variant="ghost" size="icon-sm" className="hidden size-8 shrink-0 lg:inline-flex">
                <Link href={activeNavItem?.href ?? dashboardPath} aria-label={activeNavItem?.label ?? "Home"}>
                  <ActiveIcon className="size-4" />
                </Link>
              </Button>
              <span
                aria-hidden="true"
                className="hidden h-3.5 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="min-w-0 flex-1 md:hidden">
              </div>
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
              <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 md:min-w-0 md:flex-initial md:justify-start">
                <div className="hidden md:block">
                  {commandMenuSlot ?? (
                    <CommandMenu
                      businessSlug={businessSlug}
                      businessId=""
                      role="owner"
                      plan="free"
                    />
                  )}
                </div>
                <Button asChild size="sm" className="whitespace-nowrap">
                  <Link href={getBusinessChatNewPath(businessSlug)}>
                    <RequoIcon className="size-3.5" />
                    Ask Requo
                  </Link>
                </Button>
                {notificationSlot}
              </div>
            </div>
          </div>
        </header>
        {bannerSlot}
        <div className="flex flex-1 flex-col">
          <main className="dashboard-main">
            <div className="dashboard-content">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Shows the sidebar toggle in the topbar only when the sidebar is collapsed on desktop. */
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

type DashboardNavigationItemProps = {
  isActive: boolean;
  item: NavItem;
};

const DashboardNavigationItem = memo(function DashboardNavigationItem({
  isActive,
  item,
}: DashboardNavigationItemProps) {
  const Icon = item.icon;
  const { isMobile, setOpenMobile } = useSidebar();

  function handleClick() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <SidebarMenuItem
      data-tour={`nav-${item.label.toLowerCase().replace(/[\s-]+/g, "-")}`}
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
          onClick={handleClick}
        >
          <Icon
            className={cn(
              "text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
              isActive && "text-primary",
            )}
          />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});
