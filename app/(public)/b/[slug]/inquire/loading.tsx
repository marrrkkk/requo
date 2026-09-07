export default function InquireHubLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto h-7 w-48 animate-pulse rounded-md bg-muted/60" />
          <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted/40" />
          <div className="mx-auto h-4 w-72 animate-pulse rounded bg-muted/40" />
        </div>

        {/* Options — chat card + service card, mirroring the hub page anatomy */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border/70 bg-card p-6 text-center">
            <div className="size-12 animate-pulse rounded-xl bg-muted/60" />
            <div className="w-full space-y-2">
              <div className="mx-auto h-4 w-28 animate-pulse rounded bg-muted/50" />
              <div className="mx-auto h-3 w-44 animate-pulse rounded bg-muted/40" />
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4">
            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
              <div className="h-3 w-44 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}