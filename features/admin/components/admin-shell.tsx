import type { ReactNode } from "react";

import { AdminShellFrame } from "@/features/admin/components/admin-shell-frame";

/**
 * Admin console shell — re-exports {@link AdminShellFrame} for layout use.
 */
export function AdminShell({
  children,
  headerActions,
  banner,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  banner?: ReactNode;
}) {
  return (
    <AdminShellFrame banner={banner} headerActions={headerActions}>
      {children}
    </AdminShellFrame>
  );
}
