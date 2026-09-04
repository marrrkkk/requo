export default function InquireHubLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-7 w-48 animate-pulse rounded-md bg-muted/60" />
          <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    </main>
  );
}
