import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors IntegrationsSettingsPage: sr-only title + max-w-2xl wrapper are
 * static chrome that paint instantly, skeletons only on DB-backed cards.
 */
export default function IntegrationsSettingsLoading() {
  return (
    <>
      <h1 className="sr-only">Integrations</h1>
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </>
  );
}
