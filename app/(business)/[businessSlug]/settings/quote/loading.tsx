import {
  BusinessQuoteDefaultsStaticFallback,
  SettingsCollectionBodySkeleton,
} from "@/components/shell/settings-body-skeletons";
import { QuoteSettingsTabs } from "@/features/settings/components/quote-settings-tabs";

/**
 * Mirrors BusinessQuoteSettingsPage: the tab bar is static chrome that
 * paints instantly (like (main) PageHeader), the defaults tab shows real
 * static copy with skeletons only on DB-backed controls — no full-page
 * skeleton.
 */
export default function BusinessQuoteSettingsLoading() {
  return (
    <QuoteSettingsTabs
      quote={<BusinessQuoteDefaultsStaticFallback />}
      templates={<SettingsCollectionBodySkeleton />}
    />
  );
}
