"use client";

import dynamic from "next/dynamic";

import { type ReactNode, useMemo, useState } from "react";
import { Home as HomeIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { BoarduiMainSidebar } from "@/components/shell/boardui-main-sidebar";
import {
  getActiveDashboardNavigationItem,
  getDashboardBreadcrumbs,
} from "@/components/shell/dashboard-navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
} from "@/components/base/breadcrumb/breadcrumb";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getBusinessAssistantPath } from "@/features/businesses/routes";

import { MobileTopBar } from "@/components/shell/mobile-top-bar";

const CommandMenu = dynamic(
  () =>
    import("@/components/shell/command-menu").then(
      (module) => module.CommandMenu,
    ),
  {
    loading: () => null,
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
  /** Streamed mobile top bar business switcher slot. */
  mobileBusinessSwitcherSlot?: ReactNode;
  /** Streamed mobile top bar user menu slot. */
  mobileUserMenuSlot?: ReactNode;
  /** Streamed getting started checklist for the sidebar. */
  checklistSlot?: ReactNode;
  /** Streamed theme sync slot (Suspense-wrapped). */
  themeSyncSlot?: ReactNode;
  /** Streamed banner slot below the top nav. */
  bannerSlot?: ReactNode;
};

/**
 * Structural dashboard shell that renders instantly without awaiting data.
 *
 * The sidebar follows the BoardUI docs usage example: `BoarduiMainSidebar`
 * maps Requo navigation onto BoardUI's `DashboardSidebar` (`items` +
 * `selected`) inside a `flex min-h-screen bg-background` layout. The
 * business switcher, checklist, and user menu stream in as BoardUI sidebar
 * slots; the topbar, breadcrumbs, and mobile navigation stay Requo-owned.
 *
 * Data-dependent sections stream in via Suspense boundaries from the server
 * layout, so users see the real shell chrome immediately. Role restrictions
 * are enforced server-side on the actual routes regardless.
 *
 * `SidebarProvider` is kept (without shadcn `Sidebar` chrome) because the
 * streamed business switcher / user menu slots consume its sidebar context
 * (`useSidebar` for mobile-drawer dismissal).
 */
export function DashboardShellFrame({
  children,
  businessSlug,
  businessSwitcherSlot,
  userMenuSlot,
  notificationSlot,
  upgradeSlot: _upgradeSlot,
  mobileBusinessSwitcherSlot,
  mobileUserMenuSlot,
  checklistSlot,
  themeSyncSlot,
  bannerSlot,
}: DashboardShellFrameProps) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const breadcrumbs = useMemo(() => getDashboardBreadcrumbs(pathname), [pathname]);

  const currentPageLabel = breadcrumbs.at(-1)?.label ?? "Home";
  const assistantPath = getBusinessAssistantPath(businessSlug);
  const isAssistantPaneRoute =
    pathname === assistantPath || pathname.startsWith(`${assistantPath}/chat/`);
  const activeNavItem = getActiveDashboardNavigationItem(pathname);
  const ActiveIcon = activeNavItem?.icon ?? HomeIcon;

  return (
    <SidebarProvider defaultOpen>
      {themeSyncSlot}
      <div className="flex min-h-svh flex-1 bg-background">
        {/* Desktop sidebar — BoardUI panel flush to the left screen edge (hidden below lg; mobile uses the top/bottom bars). */}
        <div className="sticky top-0 hidden h-svh shrink-0 lg:block">
          <BoarduiMainSidebar
            businessSlug={businessSlug}
            topSlot={businessSwitcherSlot}
            bottomSlot={
              <div className="flex w-full flex-col gap-2">
                {checklistSlot}
                {userMenuSlot}
              </div>
            }
            onQuickSearch={() => setCommandOpen(true)}
          />
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col"
          data-assistant-route={isAssistantPaneRoute || undefined}
          data-slot="sidebar-inset"
        >
          {/* Mobile top app bar (below lg) */}
          <MobileTopBar
            businessControl={mobileBusinessSwitcherSlot}
            pageTitle={currentPageLabel}
            notificationSlot={notificationSlot}
            userControl={mobileUserMenuSlot}
          />

          {/* Desktop Topbar row (lg and above) */}
          <div className="sticky top-0 z-30 hidden h-12 items-stretch bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80 lg:flex">
            <header className="flex min-w-0 flex-1 items-center">
              <div className="dashboard-topbar-inner min-w-0 flex-1">
                <div className="flex min-h-9 min-w-0 items-center gap-2 md:gap-2.5">
                  <div className="min-w-0 flex-1">
                    <Breadcrumb aria-label="Pages">
                      {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;

                    if (isLast || !item.href) {
                      return (
                        <BreadcrumbItem
                          key={`${item.label}-${item.href ?? index}`}
                          current
                          icon={ActiveIcon}
                          className="text-sm font-normal text-foreground"
                        >
                          {item.label}
                        </BreadcrumbItem>
                      );
                    }

                    return (
                      <BreadcrumbItem
                        key={`${item.label}-${item.href ?? index}`}
                        href={item.href}
                        className="text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
                      >
                        {item.label}
                      </BreadcrumbItem>
                    );
                      })}
                    </Breadcrumb>
                  </div>
                  <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 md:min-w-0 md:flex-initial md:justify-start">
                    {notificationSlot}
                  </div>
                </div>
              </div>
            </header>
          </div>
          {bannerSlot}

          {/* Content */}
          <div className="min-w-0 flex-1 pb-20 lg:pb-0" data-slot="dashboard-scroll-area">
            <main className="dashboard-main">
              <div className="dashboard-content">{children}</div>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav
            businessSlug={businessSlug}
            checklistSlot={checklistSlot}
          />
        </div>
      </div>
      {/* Global quick-actions dialog — opened from the sidebar Quick Search. */}
      <CommandMenu
        businessSlug={businessSlug}
        businessId=""
        userId=""
        role="owner"
        plan="free"
        open={commandOpen}
        onOpenChange={setCommandOpen}
        hideTrigger
      />
    </SidebarProvider>
  );
}
