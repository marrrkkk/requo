import {
  BillingStatusCardBodySkeleton,
  PaymentHistoryBodySkeleton,
} from "@/components/shell/settings-body-skeletons";

export default function AccountBillingLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-10">
        <BillingStatusCardBodySkeleton />
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold tracking-tight">Order history</h3>
          <PaymentHistoryBodySkeleton />
        </div>
      </div>
    </div>
  );
}
