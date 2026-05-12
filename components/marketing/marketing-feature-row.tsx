import type { LandingFeatureId } from "@/components/marketing/marketing-data";
import { MarketingFeatureMock } from "@/components/marketing/marketing-feature-mocks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MarketingFeatureRow({
  title,
  description,
  previewTitle,
  previewDescription,
  featureId,
  reverse = false,
}: {
  title: string;
  description: string;
  previewTitle: string;
  previewDescription: string;
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
          <MarketingFeaturePreview
            description={previewDescription}
            featureId={featureId}
            reverse={reverse}
            title={previewTitle}
          />
        </div>
      </div>
    </article>
  );
}

function MarketingFeaturePreview({
  featureId,
  title,
  description,
  reverse = false,
}: {
  featureId: LandingFeatureId;
  title: string;
  description: string;
  reverse?: boolean;
}) {
  return (
    <Card
      className={cn(
        // Fixed preview frame: consistent height across all four features,
        // responsive steps up from mobile to desktop. Internal body scrolls
        // so variable-length mocks do not push the frame taller.
        "gap-0! flex h-[32rem] max-h-[32rem] flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/95 shadow-[var(--surface-shadow-md)] sm:h-[34rem] sm:max-h-[34rem] lg:h-[30rem] lg:max-h-[30rem] xl:h-[32rem] xl:max-h-[32rem]",
        reverse
          ? "lg:rounded-l-none lg:border-l-0"
          : "lg:rounded-r-none lg:border-r-0",
      )}
      size="sm"
    >
      <CardHeader className="shrink-0 border-b border-border/70 bg-background/90 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="truncate text-sm sm:text-base">
              {title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-[11px] leading-4 sm:text-sm sm:leading-5">
              {description}
            </CardDescription>
          </div>
          <div
            aria-hidden="true"
            className="hidden items-center gap-1.5 sm:flex"
          >
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "min-h-0 flex-1 overflow-hidden bg-muted/15 px-3 py-4 sm:px-6 sm:py-6",
        )}
      >
        <MarketingFeatureMock featureId={featureId} />
      </CardContent>
    </Card>
  );
}
