import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireAdminUser } from "@/features/admin/access";
import {
  wrapAdminRouteWithViewLog,
  type AdminAuditContext,
} from "@/features/admin/audit";
import { AdminSubscriptionDetail } from "@/features/admin/components/admin-subscription-detail";
import { AdminSubscriptionOverrideForm } from "@/features/admin/components/admin-subscription-override-form";
import { getAdminSubscriptionDetail } from "@/features/admin/queries";
import { timed } from "@/lib/dev/server-timing";
import { createNoIndexMetadata } from "@/lib/seo/site";

import AdminLoading from "../../loading";

type AdminSubscriptionDetailPageProps = {
  params: Promise<{ subscriptionId: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Subscription · Requo admin",
  description: "Inspect subscription state and override plan or status.",
});

/**
 * Admin subscription detail (task 12.4 / Req 6.2, 7.1, 7.2, 7.3, 7.4,
 * 9.1).
 *
 * Renders the subscription fields, the most recent `payment_attempts`
 * for the owner, and the most recent `billing_events`. The
 * `AdminSubscriptionOverrideForm` sits below the informational
 * sections and is the ONLY mutation surface on the page — every
 * override flows through `ConfirmPasswordDialog` and then into
 * `manualPlanOverrideAction` / `forceCancelSubscriptionAction`, both
 * of which call `lib/billing/subscription-service.ts` so the
 * subscription ↔ business plan sync invariant holds.
 *
 * The top-level component stays sync + wraps the async body in
 * `<Suspense>` so `cacheComponents` can stream the dynamic detail
 * independently of the admin shell. Writes a `view.subscription` audit
 * row on every render (Req 10.1). When the subscription id does not
 * resolve we call `notFound()` before writing the view log so the
 * audit trail does not record misses.
 */
export default function AdminSubscriptionDetailPage({
  params,
}: AdminSubscriptionDetailPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminSubscriptionDetailPageContent params={params} />
    </Suspense>
  );
}

async function AdminSubscriptionDetailPageContent({
  params,
}: AdminSubscriptionDetailPageProps) {
  const [{ session, user }, { subscriptionId }] = await Promise.all([
    requireAdminUser(),
    params,
  ]);

  const subscription = await timed(
    "adminSubscriptionDetail.getAdminSubscriptionDetail",
    getAdminSubscriptionDetail(subscriptionId),
  );

  if (!subscription) {
    notFound();
  }

  const auditContext = buildAdminAuditContext(user.id, session);

  const renderPage = wrapAdminRouteWithViewLog(
    async () => (
      <div className="flex flex-col gap-6">
        <AdminSubscriptionDetail subscription={subscription} />
        <AdminSubscriptionOverrideForm
          currentPlan={subscription.plan}
          currentStatus={subscription.status}
          ownerEmail={subscription.ownerEmail}
          subscriptionId={subscription.id}
          userId={subscription.userId}
        />
      </div>
    ),
    auditContext,
    {
      action: "view.subscription",
      targetType: "subscription",
      targetId: subscription.id,
    },
  );

  return renderPage();
}

function buildAdminAuditContext(
  adminUserId: string,
  session: Awaited<ReturnType<typeof requireAdminUser>>["session"],
): AdminAuditContext {
  const impersonatedBy = session.session?.impersonatedBy ?? null;

  return {
    adminUserId,
    adminEmail: session.user.email,
    impersonatedUserId: impersonatedBy ? session.user.id : null,
  };
}
