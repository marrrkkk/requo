import Image from "next/image";

import { Badge } from "@/components/ui/badge";

export function MarketingShowcase() {
  return (
    <section className="hero-panel mx-auto w-full max-w-6xl overflow-hidden p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Example workspace</Badge>
            <Badge variant="secondary">Real product screen</Badge>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Quotes, customer context, and follow-up in one view.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Keep quote status, customer details, totals, and the next action
              visible without bouncing between separate tools.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/75 bg-background/92 shadow-[var(--surface-shadow-md)]">
          <Image
            alt="Requo dashboard quotes view"
            className="h-auto w-full"
            height={1180}
            priority
            sizes="(max-width: 1280px) 100vw, 1200px"
            src="/marketing/dashboard-overview.png"
            width={1440}
          />
        </div>
      </div>
    </section>
  );
}
