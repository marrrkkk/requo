/**
 * BusinessSupportSettingsPage renders its PageHeader + cards synchronously
 * (static shell, like (main) list pages) with only a null auth gate
 * streaming — no skeleton needed. Null keeps hard load instant and avoids
 * a full-page flash that would contradict the page's own Suspense(null).
 */
export default function SupportSettingsLoading() {
  return null;
}
