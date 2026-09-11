import { BillingStatusStaticFallback } from "@/components/shell/settings-body-skeletons";

/**
 * Mirrors BillingSettingsPage: sr-only title + max-w-2xl wrapper are static
 * chrome that paint instantly, the card shows real static copy (headings,
 * detail labels, usage notes) with skeletons only on DB-backed values — no
 * full-page gray flash.
 */
export default function BusinessBillingLoading() {
  return (
    <>
      <h1 className="sr-only">Billing</h1>
      <div className="mx-auto w-full max-w-2xl">
        <BillingStatusStaticFallback />
      </div>
    </>
  );
}
