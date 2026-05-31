import { BrandMark } from "@/components/shared/brand-mark";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Structural loading state for the admin console.
 *
 * Renders the full admin shell frame synchronously — branded sidebar
 * header, topbar, page header with real titles and description — so
 * navigation into the admin console feels instant. Only data-dependent
 * content (stat values and table rows) uses `<Skeleton>`.
 *
 * This component is the `<Suspense>` fallback in the console layout
 * while `requireAdminUser()` resolves the auth gate.
 *
 * Requirements: 2.1, 2.2, 8.3, 9.1, 9.2
 */
export default function AdminLoading() {
  return (
    <div className="min-h-svh w-full bg-background">
      {/* ── Sidebar placeholder (collapsed icon-width on mobile) ──── */}
      <div className="fixed inset-y-0 left-0 z-20 hidden w-[15.5rem] border-r border-sidebar-border bg-sidebar md:block">
        <div className="flex h-[4.5rem] items-center px-3">
          <BrandMark
            collapseLabel={false}
            className="min-w-0 px-2 py-1.5"
            href="/admin"
            subtitle="Admin"
          />
        </div>
        <div className="border-t border-sidebar-border" />
        {/* Nav skeleton — structural labels rendered as real text */}
        <nav className="flex flex-col gap-1 px-4 pt-4">
          {["Dashboard", "Users", "Businesses", "Subscriptions", "Audit logs"].map(
            (label) => (
              <div
                className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/70"
                key={label}
              >
                <Skeleton className="size-4 shrink-0 rounded" />
                <span>{label}</span>
              </div>
            ),
          )}
        </nav>
      </div>

      {/* ── Main content area (offset by sidebar width) ──────────── */}
      <div className="md:pl-[15.5rem]">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-9 min-w-0 items-center gap-2 md:gap-2.5">
              <Skeleton className="size-8 shrink-0 rounded-md md:hidden" />
              <span
                aria-hidden="true"
                className="hidden h-3.5 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
                  Admin console
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Internal operations surface
                </p>
              </div>
              <Skeleton className="size-9 shrink-0 rounded-full" />
            </div>
          </div>
        </header>

        {/* Page body */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <DashboardPage>
              <PageHeader
                description="Read-only oversight of users, businesses, and subscriptions, plus high-trust support actions."
                eyebrow="Admin console"
                title="Operations"
              />

              <div className="flex min-w-0 flex-col gap-6 pb-16 sm:gap-7 xl:pb-24">
                {/* ── Stats grid skeleton ───────────────────────── */}
                <section className="section-panel p-6">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Operations overview
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Live platform counts. Cached for up to 60 seconds.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {[
                        "Total users",
                        "Total businesses",
                        "Active plans",
                        "Sign-ups (last 7 days)",
                        "Inquiries (last 7 days)",
                        "Quotes sent (last 7 days)",
                      ].map((label) => (
                        <div
                          className="info-tile flex min-h-[5.5rem] flex-col gap-3"
                          key={label}
                        >
                          <span className="meta-label">{label}</span>
                          <Skeleton className="h-8 w-20 rounded-md" />
                          <Skeleton className="h-3 w-28 rounded-md" />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </DashboardPage>
          </div>
        </main>
      </div>
    </div>
  );
}
