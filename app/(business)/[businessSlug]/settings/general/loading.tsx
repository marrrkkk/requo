import { BusinessGeneralSettingsStaticFallback } from "@/components/shell/settings-body-skeletons";

/**
 * Mirrors BusinessGeneralSettingsPage: real static copy (section titles,
 * descriptions, field labels) paints instantly, only DB-backed controls
 * show skeletons — no full-page gray flash.
 */
export default function BusinessGeneralSettingsLoading() {
  return <BusinessGeneralSettingsStaticFallback />;
}
