import "server-only";

import {
  requireAdminUser,
  type AdminContext,
} from "@/features/admin/access";
import {
  wrapAdminRouteWithViewLog,
  type AdminAuditContext,
  type AdminViewDescriptor,
} from "@/features/admin/audit";

/**
 * The single entry point for an admin console page.
 *
 * Every `/admin` page previously repeated the same three steps by hand:
 * resolve the admin session, build the audit context (including the
 * impersonation carve-out), then wrap the render in a view log. Doing that
 * inline made it easy to forget the audit write or to get the impersonation
 * fields wrong, so it now lives here.
 *
 * ```tsx
 * export default async function AdminUsersPage() {
 *   return withAdminViewLog({ action: "view.users", targetType: "user" }, () => (
 *     <DashboardPage>…</DashboardPage>
 *   ));
 * }
 * ```
 *
 * Authorization is not optional: `withAdminViewLog` always calls
 * `requireAdminUser()`, so a page cannot be rendered without the admin gate
 * having passed server-side.
 */
export async function withAdminViewLog<Result>(
  descriptor: AdminViewDescriptor,
  render: (context: AdminContext) => Result | Promise<Result>,
): Promise<Result> {
  const context = await requireAdminUser();

  const renderWithViewLog = wrapAdminRouteWithViewLog(
    async () => render(context),
    toAdminAuditContext(context),
    descriptor,
  );

  return renderWithViewLog();
}

/**
 * Project an `AdminContext` onto the shape the audit writer needs.
 *
 * `session.session.impersonatedBy` is only set on an impersonation session,
 * in which case the acting user id is the impersonated user — recording it
 * lets the audit log distinguish "admin did X" from "admin did X as Y".
 *
 * Exported because mutation call sites need the same projection before
 * calling `runAdminMutationWithAudit`.
 */
export function toAdminAuditContext({
  session,
  user,
}: AdminContext): AdminAuditContext {
  return {
    adminUserId: user.id,
    adminEmail: user.email,
    impersonatedUserId: session.session?.impersonatedBy ? user.id : null,
  };
}
