import { PrintPageShell } from "@/components/shared/print-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PrintPageShell
      backHref="#"
      backLabel="Back to invoice"
      description="Loading a print-friendly view of this invoice."
      title="Invoice"
    >
      <Skeleton className="mx-auto h-96 w-full max-w-[58rem]" />
    </PrintPageShell>
  );
}
