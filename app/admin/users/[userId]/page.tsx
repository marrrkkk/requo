import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

import {
  DashboardDetailHeader,
  DashboardDetailLayout,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/features/admin/access";
import { wrapAdminRouteWithViewLog } from "@/features/admin/audit";
import { AdminUserActions } from "@/features/admin/components/admin-user-actions";
import { AdminUserDetail } from "@/features/admin/components/admin-user-detail";
import { ADMIN_USERS_PATH } from "@/features/admin/navigation";
import { getAdminUserDetail } from "@/features/admin/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "User · Requo admin",
  description: "Inspect a Requo user and run support actions.",
});

type AdminUserDetailPageProps = {
  params: Promise<{ userId: string }>;
};

/**
 * Admin user detail page (task 12.2 / Req 3.3, 4.x, 8.1, 9.1).
 *
 * Renders `AdminUserDetail` (profile summary + subscription + owned
 * businesses + recent audit) alongside `AdminUserActions` (verify,
 * revoke, suspend/unsuspend, delete, impersonate) — each action
 * flowing through `ConfirmPasswordDialog` client-side.
 *
 * The top-level component stays sync + wraps the async body in
 * `<Suspense>` so `cacheComponents` can stream the dynamic detail
 * independently of the admin shell. Writes a `view.user` audit row on
 * every render via `wrapAdminRouteWithViewLog` (Req 10.1). The target
 * user id is captured in the audit row so the audit feed can be
 * filtered by target.
 */
export default function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminUserDetailPageContent params={params} />
    </Suspense>
  );
}

async function AdminUserDetailPageContent({
  params,
}: AdminUserDetailPageProps) {
  const { session, user: admin } = await requireAdminUser();
  const { userId } = await params;

  const renderPage = wrapAdminRouteWithViewLog(
    async () => renderDetail(userId, admin.id),
    {
      adminUserId: admin.id,
      adminEmail: admin.email,
      impersonatedUserId: session.session?.impersonatedBy
        ? session.user.id
        : null,
    },
    {
      action: "view.user",
      targetType: "user",
      targetId: userId,
    },
  );

  return renderPage();
}

async function renderDetail(userId: string, adminUserId: string) {
  const user = await getAdminUserDetail(userId);

  if (!user) {
    notFound();
  }

  return (
    <DashboardDetailLayout>
      <DashboardDetailHeader
        actions={
          <AdminUserActions
            adminUserId={adminUserId}
            targetEmail={user.email}
            targetEmailVerified={user.emailVerified}
            targetIsSuspended={user.banned}
            targetUserId={user.id}
          />
        }
        description={user.name || "Admin view of a Requo user."}
        eyebrow={
          <Link
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
            href={ADMIN_USERS_PATH}
            prefetch={true}
          >
            <ArrowLeft className="size-3.5" />
            All users
          </Link>
        }
        title={user.email}
      />

      <AdminUserDetail user={user} />

      <div className="flex justify-start">
        <Button asChild variant="ghost">
          <Link href={ADMIN_USERS_PATH} prefetch={true}>
            <ArrowLeft data-icon="inline-start" />
            Back to users
          </Link>
        </Button>
      </div>
    </DashboardDetailLayout>
  );
}
