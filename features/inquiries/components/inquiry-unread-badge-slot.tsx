import { NavBadgeSync } from "@/components/shell/nav-badge-context";
import { getUnreadInquiryCountForBusiness } from "@/features/inquiries/queries";
import { getAppShellContext } from "@/lib/app-shell/context";

/**
 * Streamed nav-badge data for the dashboard shell. Resolves business context
 * and the shared unread inquiry count independently of the page, so the
 * instant sidebar shell never blocks on it — `NavBadgeSync` applies the
 * count into client state once this streams in.
 */
export async function InquiryUnreadBadgeSlot({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const { businessContext } = await getAppShellContext(businessSlug);
  const unreadCount = await getUnreadInquiryCountForBusiness({
    businessId: businessContext.business.id,
  });

  return <NavBadgeSync value={unreadCount} />;
}
