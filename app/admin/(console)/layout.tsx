import { Suspense } from "react";

import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { requireAdminConsoleUser } from "@/features/admin/access";
import { AdminShell } from "@/features/admin/components/shell/admin-shell";
import { AdminShellSkeleton } from "@/features/admin/components/shell/admin-shell-skeleton";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { UiScaleSync } from "@/features/theme/components/ui-scale-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { getUiScalePreferenceForUser } from "@/features/theme/ui-scale-queries";

export const preferredRegion = "syd1";

/**
 * Exempt the layout entry point from instant validation — the admin session
 * cookie check always redirects unauthenticated users, which prevents
 * validation from reaching the page segment. Sibling navigations within
 * the console (e.g. /admin/users → /admin/businesses) are still validated
 * by the `instant` exports on each page.
 */
export const instant = false;

/**
 * Admin console layout (auth-gated).
 *
 * Lives inside the `(console)` route group so the login page in `(auth)`
 * is NOT affected by this gate.
 *
 * `requireAdminConsoleUser()` is the single authorization boundary for
 * every admin route: anyone without an admin session is sent back to the
 * main app's base URL, so the admin subdomain stays inaccessible to
 * non-admins without a 404 or an error page. Each page body (via
 * `withAdminViewLog`) and each query/mutation re-checks via
 * `requireAdminUser()`, so a page can never render privileged data on
 * the strength of the layout gate alone.
 */
export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminConsoleShell>{children}</AdminConsoleShell>
    </Suspense>
  );
}

async function AdminConsoleShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdminConsoleUser();

  return (
    <>
      {/* Keep the admin console's theme + UI scale in step with the rest of the
          product, the same way the business dashboard shell does. */}
      <Suspense fallback={null}>
        <ThemeSyncSlot userId={user.id} />
      </Suspense>

      <AdminShell
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          avatarSrc: user.image ?? null,
        }}
        banner={
          <Suspense fallback={null}>
            <div className="dashboard-content pt-4">
              <ImpersonationBanner />
            </div>
          </Suspense>
        }
      >
        {children}
      </AdminShell>
    </>
  );
}

async function ThemeSyncSlot({ userId }: { userId: string }) {
  const [themePreference, uiScale] = await Promise.all([
    getThemePreferenceForUser(userId),
    getUiScalePreferenceForUser(userId),
  ]);

  return (
    <>
      <ThemePreferenceSync themePreference={themePreference} userId={userId} />
      <UiScaleSync uiScale={uiScale} userId={userId} />
    </>
  );
}
