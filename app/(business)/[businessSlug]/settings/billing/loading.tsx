import { PageHeader } from "@/components/shared/page-header";
import {
  BillingStatusCardBodySkeleton,
  PaymentHistoryBodySkeleton,
} from "@/components/shell/settings-body-skeletons";

export default function BusinessBillingLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Plan & billing"
        description="Manage your subscription, payment method, and billing details."
      />

      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-10">
          <BillingStatusCardBodySkeleton />
          <PaymentHistoryBodySkeleton />
        </div>
      </div>
    </>
  );
}
