import { Skeleton } from "@/components/ui/skeleton";

/**
 * Structural loading state for the marketing home page.
 * Renders hero structure, section headings, and CTA placeholders synchronously.
 * Uses Skeleton only for dynamic/testimonial content.
 * Header/footer are rendered by the page component (PublicPageShell) — they
 * will appear once the page streams in.
 */
export default function MarketingHomeLoading() {
  return (
    <div className="overflow-x-clip">
      {/* Hero section structure */}
      <section className="relative min-h-[480px] overflow-hidden px-5 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:min-h-[600px] lg:px-8 lg:pb-24 lg:pt-16 xl:px-10">
        <div className="flex flex-col gap-12 lg:gap-16">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
            {/* Announcement pill */}
            <Skeleton className="h-7 w-64 rounded-full" />

            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-12 w-full max-w-xl rounded-lg sm:h-16 lg:h-20" />
              <Skeleton className="h-6 w-full max-w-md rounded-md" />
            </div>

            {/* CTA button placeholders */}
            <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
              <Skeleton className="h-11 w-full rounded-md sm:w-40" />
              <Skeleton className="h-11 w-full rounded-md sm:w-36" />
            </div>

            <Skeleton className="h-4 w-72 rounded-md" />
          </div>

          {/* Showcase placeholder */}
          <Skeleton className="mx-auto h-64 w-full max-w-5xl rounded-xl sm:h-80 lg:h-96" />
        </div>
      </section>
      <div className="border-b border-border/70" />

      {/* Why Requo section */}
      <section className="mx-auto mt-32 w-full max-w-6xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8 xl:px-0">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="eyebrow">WHY REQUO</p>
          <Skeleton className="h-10 w-full max-w-lg rounded-lg sm:h-12" />
          <Skeleton className="h-5 w-full max-w-md rounded-md" />
        </div>

        <div className="mt-12 grid gap-4 sm:mt-14 sm:gap-5 lg:mt-16 lg:grid-cols-2 lg:gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton className="h-72 w-full rounded-2xl" key={`why-card-${i}`} />
          ))}
        </div>

        <Skeleton className="mt-4 h-32 w-full rounded-2xl sm:mt-5 lg:mt-6" />
      </section>

      {/* How it works section */}
      <section className="mx-auto mt-32 w-full max-w-6xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8 xl:px-0">
        <div className="flex flex-col items-start gap-4">
          <p className="eyebrow">HOW IT WORKS</p>
          <Skeleton className="h-10 w-full max-w-lg rounded-lg sm:h-12" />
          <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
        </div>

        <div className="mt-12 grid gap-6 sm:mt-14 lg:mt-16 lg:grid-cols-4 lg:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="flex flex-col gap-4" key={`workflow-step-${i}`}>
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* Features section */}
      <section className="mx-auto mt-32 w-full max-w-6xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8 xl:px-0">
        <Skeleton className="h-10 w-full max-w-lg rounded-lg sm:h-12" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl rounded-md" />
      </section>

      {/* FAQ section */}
      <section className="mx-auto mt-32 w-full max-w-4xl px-5 sm:mt-40 sm:px-6 lg:mt-48 lg:px-8">
        <div className="flex flex-col items-start gap-4">
          <p className="eyebrow">FAQ</p>
          <Skeleton className="h-10 w-full max-w-md rounded-lg sm:h-12" />
          <Skeleton className="h-5 w-full max-w-xl rounded-md" />
        </div>
      </section>

      {/* Final CTA section */}
      <section className="mx-auto mt-32 flex w-full max-w-4xl flex-col items-center gap-8 px-5 py-12 text-center sm:mt-40 sm:px-6 sm:py-16 lg:mt-48 lg:px-8 xl:px-0">
        <Skeleton className="h-12 w-full max-w-lg rounded-lg sm:h-14 lg:h-16" />
        <Skeleton className="h-11 w-40 rounded-full" />
        <Skeleton className="h-4 w-56 rounded-md" />
      </section>
    </div>
  );
}
