import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessFormSettingsLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title={<Skeleton className="h-9 w-48 rounded-xl" />}
        description="Edit the fields, public page, preview, and publishing controls for this inquiry workflow."
      />

      <div className="flex flex-col gap-5">
        {/* Tab bar + action button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Mobile: combobox placeholder */}
          <Skeleton className="h-9 w-full rounded-lg sm:hidden" />

          {/* Desktop: horizontal tabs */}
          <div className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-muted p-1">
            <Skeleton className="h-8 w-[4.25rem] rounded-md" />
            <Skeleton className="h-8 w-[4.25rem] rounded-md" />
            <Skeleton className="h-8 w-[6rem] rounded-md" />
          </div>

          {/* Open form button */}
          <Skeleton className="h-9 w-full rounded-lg sm:w-[7.5rem]" />
        </div>

        {/* Tab content area — matches page form (default tab) structure */}
        <div className="dashboard-side-stack min-w-0">
          {/* Page settings section */}
          <section className="flex flex-col gap-5">
            {/* Section heading */}
            <div className="space-y-1">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>

            {/* Form fields */}
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="grid gap-2" key={index}>
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}

              {/* Textarea field */}
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
