import { Suspense } from "react";

import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { requireAdminUser } from "@/features/admin/access";
import { AdminShell } from "@/features/admin/components/admin-shell";

import AdminLoading from "./loading";

export const preferredRegion = "syd1";

/**
 * Exempt the layout entry point from instant validation — the admin session
 * cookie check always redirects unauthenticated users, which prevents
 * validation from reaching the page segment. Sibling navigations within
 * the console (e.g. /admin/users → /admin/businesses) are still validated
 * by the `unstable_instant` exports on each page.
 */
export const unstable_instant = false;

/**
 * Admin console layout (auth-gated).
 *
 * Lives inside the `(console)` route group so the login page in `(auth)`
 * is NOT affected by this gate.
 */
export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminConsoleShell>{children}</AdminConsoleShell>
    </Suspense>
  );
}

async function AdminConsoleShell({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();

  return (
    <AdminShell
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
  );
}
