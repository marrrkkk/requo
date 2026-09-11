import { BusinessNotificationSettingsStaticFallback } from "@/components/shell/settings-body-skeletons";

/**
 * Mirrors BusinessNotificationSettingsPage: real static copy (section
 * titles, descriptions, toggle labels) paints instantly, only DB-backed
 * Switch controls show skeletons — no full-page gray flash.
 */
export default function BusinessNotificationSettingsLoading() {
  return <BusinessNotificationSettingsStaticFallback />;
}
