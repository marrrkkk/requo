import type { CSSProperties, ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminNav } from "@/features/admin/components/admin-nav";

/**
 * Admin console shell.
 *
 * Reuses the shared `DashboardPage` + `PageHeader` wrappers from
 * `components/shared/*` per DESIGN.md so the admin surface stays
 * visually consistent with the rest of the signed-in product. The
 * shell itself is a dumb layout: auth gating, impersonation banner
 * mount, and view audit logging are owned by `app/admin/layout.tsx`.
 *
 * The shell pairs a collapsible `Sidebar` (carrying `AdminNav`) with
 * a `SidebarInset` content column. `AdminNav` already renders its
 * items through `SidebarMenuButton` + `useSidebar`, so the shell
 * MUST mount `SidebarProvider` for the nav to resolve correctly.
 * Keeping this structure in the admin feature (rather than reusing
 * `DashboardShell`) avoids pulling business-scoped concerns
 * (business switcher, notifications, upgrade button) into the admin
 * surface.
 */
export function AdminShell({
  children,
  headerActions,
  banner,
}: {
  children: ReactNode;
  /**
   * Optional slot rendered on the right of the top bar. Most admin
   * pages leave this empty; it's provided so future surfaces (e.g.
   * impersonation quick-switch) can plug in without restyling.
   */
  headerActions?: ReactNode;
  /**
   * Optional slot rendered above the page header. Used by the admin
   * layout to mount the impersonation banner while preserving the
   * shell as a pure layout component.
   */
  banner?: ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "15.5rem",
          "--sidebar-width-icon": "4.25rem",
        } as CSSProperties
      }
    >
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-0 px-0 py-0">
          <div className="flex h-[4.5rem] items-center px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
            <BrandMark
              collapseLabel
              className="min-w-0 px-2 py-1.5"
              href="/"
              subtitle="Admin"
            />
          </div>
          <SidebarSeparator />
        </SidebarHeader>

        <SidebarContent className="gap-4 px-1 pb-3 group-data-[collapsible=icon]:px-0">
          <SidebarGroup className="px-3 pt-3 group-data-[collapsible=icon]:px-2">
            <AdminNav />
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-11 min-w-0 items-center gap-2.5 md:gap-3">
              <SidebarTrigger className="size-10 shrink-0" />
              <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
                  Admin console
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Internal operations surface
                </p>
              </div>
              {headerActions ? (
                <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
                  {headerActions}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <main className="dashboard-main">
            <div className="dashboard-content">
              <DashboardPage>
                {banner}
                <PageHeader
                  description="Read-only oversight of users, businesses, and subscriptions, plus high-trust support actions."
                  eyebrow="Admin console"
                  title="Operations"
                />
                <div className="flex min-w-0 flex-col gap-6 pb-16 sm:gap-7 xl:pb-24">
                  {children}
                </div>
              </DashboardPage>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
