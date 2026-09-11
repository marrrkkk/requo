import { BusinessEmailTemplateStaticFallback } from "@/components/shell/settings-body-skeletons";
import {
  EMAIL_TEMPLATE_KIND_DESCRIPTIONS,
  EMAIL_TEMPLATE_KIND_LABELS,
  quoteEmailMergeTags,
} from "@/features/settings/email-templates";

/**
 * Mirrors BusinessEmailTemplateSettingsPage: real static copy (kind title,
 * subject label, merge-tag labels, canvas headings) paints instantly, only
 * DB-backed controls show skeletons — no full-page gray flash.
 */
export default function BusinessEmailSettingsLoading() {
  return (
    <BusinessEmailTemplateStaticFallback
      kindDescription={EMAIL_TEMPLATE_KIND_DESCRIPTIONS.quote}
      kindLabel={EMAIL_TEMPLATE_KIND_LABELS.quote}
      mergeTags={quoteEmailMergeTags}
    />
  );
}
