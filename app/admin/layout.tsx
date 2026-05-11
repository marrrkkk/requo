import type { Metadata } from "next";
import { Suspense } from "react";

import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { requireAdminUser } from "@/features/admin/access";
import {
  wrapAdminRouteWithViewLog,
  type AdminAuditContext,
} from "@/features/admin/audit";
import { AdminShell } from "@/features/admin/components/admin-shell";
import type { AuthSession, AuthUser } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "./loading";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Requo admin",
  description: "Internal operations surface for Requo administrators.",
});
export const preferredRegion = "syd1";

/**
 * Admin console root layout.
 *
 * Responsibilities (task 11.1):
 *
 * 1. Call `requireAdminUser()` (Req 1.1, 1.2, 1.3, 1.6) — denies
 *    unauthenticated, unverified, and non-allow-listed callers by
 *    triggering `notFound()` before any admin markup renders.
 * 2. Render `AdminShell` (which owns `DashboardPage` + `PageHeader`)
 *    with the impersonation banner mounted inside via `Suspense`.
 * 3. Record a `view.dashboard` audit row on every render via
 *    `wrapAdminRouteWithViewLog` (Req 10.1). The wrapper writes the
 *    view entry best-effort in a `finally` block so a transient audit
 *    failure never blocks a render. The per-page layer refines the
 *    audit action (e.g. `view.users`) once the page component runs.
 *
 * The layout itself is a sync component that wraps the async work in
 * `<Suspense>`. This lets `cacheComponents` stream the dynamic admin
 * shell independently from the static root layout, matching the
 * pattern used by `app/account/layout.tsx`.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </Suspense>
  );
}

async function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user } = await requireAdminUser();
  const auditContext = buildAdminAuditContext(user, session);

  const renderShell = wrapAdminRouteWithViewLog(
    async (content: React.ReactNode) => (
      <AdminShell
        banner={
          <Suspense fallback={null}>
            <ImpersonationBanner />
          </Suspense>
        }
      >
        {content}
      </AdminShell>
    ),
    auditContext,
    {
      action: "view.dashboard",
      targetType: "dashboard",
    },
  );

  return renderShell(children);
}

/**
 * Build the `AdminAuditContext` from a resolved admin session. When
 * the session itself carries an `impersonatedBy` tag we still treat
 * the allow-listed admin as the audit author and record the active
 * (impersonated) user id in metadata (Req 10.3). In practice the
 * admin layout is unreachable while impersonating — the access gate
 * runs against the impersonated user — but wiring the field through
 * keeps the audit shape consistent with every other admin write.
 */
function buildAdminAuditContext(
  admin: AuthUser,
  session: AuthSession,
): AdminAuditContext {
  const impersonatedBy = session.session?.impersonatedBy ?? null;

  return {
    adminUserId: admin.id,
    adminEmail: admin.email,
    impersonatedUserId: impersonatedBy ? session.user.id : null,
  };
}
