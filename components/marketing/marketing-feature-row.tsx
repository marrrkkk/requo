import type { LandingFeatureId } from "@/components/marketing/marketing-data";
import { MarketingFeatureMock } from "@/components/marketing/marketing-feature-mocks";
import { cn } from "@/lib/utils";

export function MarketingFeatureRow({
  title,
  description,
  featureId,
  reverse = false,
}: {
  title: string;
  description: string;
  featureId: LandingFeatureId;
  reverse?: boolean;
}) {
  return (
    <article
      className="[--page-gutter:1.25rem] overflow-x-clip py-5 sm:[--page-gutter:1.5rem] sm:py-7 lg:[--page-gutter:2rem] lg:py-8 xl:[--page-gutter:max(2rem,calc((100vw-72rem)/2))]"
      id={featureId}
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div
          className={cn(
            "px-[var(--page-gutter)]",
            reverse
              ? "lg:order-2 lg:pl-10 lg:pr-[var(--page-gutter)]"
              : "lg:pl-[var(--page-gutter)] lg:pr-10",
          )}
        >
          <div
            className={cn(
              "flex w-full max-w-[28rem] flex-col gap-4",
              reverse ? "lg:ml-auto" : "lg:mr-auto",
            )}
          >
            <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {title}
            </h3>
            <p className="text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 px-[var(--page-gutter)] lg:px-0",
            reverse && "lg:order-1",
          )}
        >
          <MarketingFeaturePreview featureId={featureId} reverse={reverse} />
        </div>
      </div>
    </article>
  );
}

function MarketingFeaturePreview({
  featureId,
  reverse = false,
}: {
  featureId: LandingFeatureId;
  reverse?: boolean;
}) {
  return (
    <div
      aria-label={`Preview of ${featureId}`}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border/70 bg-background ring-1 ring-border/30 ring-offset-2 ring-offset-background shadow-[0_20px_60px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.05)] dark:border-white/10 dark:ring-white/5 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
        reverse
          ? "lg:rounded-l-none lg:border-l-0 lg:ring-l-0"
          : "lg:rounded-r-none lg:border-r-0 lg:ring-r-0",
      )}
      role="img"
    >
      <div className="h-[28rem] p-4 sm:p-5 lg:p-6">
        <div className="h-full min-h-0">
          <MarketingFeatureMock featureId={featureId} />
        </div>
      </div>
    </div>
  );
}
