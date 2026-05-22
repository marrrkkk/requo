import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import { AdminShell } from "@/features/admin/components/admin-shell";

import AdminLoading from "./loading";

export const preferredRegion = "syd1";

/**
 * Admin console layout (auth-gated).
 *
 * Lives inside the `(console)` route group so the login page in `(auth)`
 * is NOT affected by this gate. Calls `requireAdminUser()` which verifies
 * the admin JWT session cookie — unauthenticated visitors are redirected
 * to the login page.
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

  return <AdminShell>{children}</AdminShell>;
}
