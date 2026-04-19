import type { LandingFeatureId } from "@/components/marketing/marketing-data";
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
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
        </div>

        <div className={cn("min-w-0", reverse && "lg:order-1")}>
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

export function WorkflowStep({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="marketing-step h-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_18px_-16px_rgba(0,128,96,0.45)]">
          {index}
        </div>
        <div className="min-w-0">
          <p className="meta-label">Step {index}</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        </div>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
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
        "h-full min-h-[18rem] overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/95 shadow-[var(--surface-shadow-md)]",
        reverse
          ? "lg:rounded-l-none lg:border-l-0"
          : "lg:rounded-r-none lg:border-r-0",
      )}
      size="sm"
    >
      <CardHeader className="gap-3 border-b border-border/70 bg-background/90 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="meta-label">Placeholder preview</p>
          <span className="font-medium">Landscape mockup</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="bg-muted/15 px-4 py-5 sm:px-6 sm:py-6">
        {featureId === "quotes" ? <QuotePreviewMock /> : null}
        {featureId === "forms" ? <FormsPreviewMock /> : null}
        {featureId === "analytics" ? <AnalyticsPreviewMock /> : null}
        {featureId === "collaboration" ? <CollaborationPreviewMock /> : null}
      </CardContent>
    </Card>
  );
}

function QuotePreviewMock() {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {["Draft ready", "Valid 7 days", "Customer link"].map((label) => (
          <div className="info-tile px-3.5 py-3 shadow-none" key={label}>
            <p className="meta-label">{label}</p>
            <div className="mt-3 h-2 rounded-full bg-border/70" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="rounded-xl border border-border/75 bg-background/95 p-4 shadow-[var(--surface-shadow-sm)]">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex flex-col gap-2">
              <p className="meta-label">Quote builder</p>
              <div className="h-4 w-48 rounded-full bg-foreground/10" />
              <div className="h-3 w-32 rounded-full bg-border/70" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Quote #1042
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {[1, 2, 3].map((row) => (
              <div
                className="soft-panel grid gap-3 px-3 py-3 shadow-none sm:grid-cols-[minmax(0,1fr)_5rem_7rem]"
                key={row}
              >
                <div className="h-3 rounded-full bg-foreground/10" />
                <div className="h-3 rounded-full bg-border/70" />
                <div className="h-3 rounded-full bg-border/70" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Totals</p>
            <div className="mt-4 flex flex-col gap-3">
              <PreviewMetric label="Subtotal" valueWidth="w-20" />
              <PreviewMetric label="Discount" valueWidth="w-14" />
              <PreviewMetric label="Total" valueWidth="w-20" />
            </div>
          </div>
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Customer view</p>
            <div className="mt-3 h-24 rounded-lg border border-border/70 bg-background/90 p-3">
              <div className="h-3 w-24 rounded-full bg-foreground/10" />
              <div className="mt-3 h-2 w-full rounded-full bg-border/70" />
              <div className="mt-2 h-2 w-5/6 rounded-full bg-border/70" />
              <div className="mt-4 h-8 w-28 rounded-lg bg-accent/75" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormsPreviewMock() {
  return (
    <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
        <p className="meta-label">Form setup</p>
        {["Project type", "Budget", "Deadline", "Attachments"].map((label) => (
          <div
            className="rounded-lg border border-border/70 bg-background/85 px-3 py-3"
            key={label}
          >
            <div className="h-3 w-24 rounded-full bg-foreground/10" />
            <p className="mt-2 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/75 bg-background/95 p-4 shadow-[var(--surface-shadow-sm)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <p className="meta-label">Public inquiry page</p>
            <div className="mt-2 h-4 w-44 rounded-full bg-foreground/10" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Public page preview
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["Your name", "Project details", "Needed by", "Reference files"].map(
            (field) => (
              <div className="grid gap-2" key={field}>
                <p className="text-xs font-medium text-foreground">{field}</p>
                <div className="h-11 rounded-lg border border-border/70 bg-background/90" />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPreviewMock() {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewStatCard label="Inquiries" value="42" />
        <PreviewStatCard label="Quotes sent" value="18" />
        <PreviewStatCard label="Won rate" value="34%" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="rounded-xl border border-border/75 bg-background/95 p-4 shadow-[var(--surface-shadow-sm)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="meta-label">Pipeline trend</p>
              <div className="mt-2 h-4 w-36 rounded-full bg-foreground/10" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Last 30 days
            </p>
          </div>

          <div className="mt-6 flex h-40 items-end gap-3">
            {[28, 42, 34, 51, 46, 62, 58].map((height, index) => (
              <div className="flex flex-1 flex-col justify-end gap-2" key={index}>
                <div
                  className="rounded-t-lg bg-accent"
                  style={{ height: `${height * 2}px` }}
                />
                <div className="h-2 rounded-full bg-border/70" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Stage breakdown</p>
            <div className="mt-4 flex flex-col gap-3">
              <PreviewMetric label="Waiting review" valueWidth="w-10" />
              <PreviewMetric label="Quoted" valueWidth="w-16" />
              <PreviewMetric label="Follow-up due" valueWidth="w-12" />
            </div>
          </div>
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Signals</p>
            <div className="mt-3 grid gap-2">
              {[
                "New inquiries up 12%",
                "Quote responses this week",
                "2 leads need follow-up",
              ].map((label) => (
                <div
                  className="rounded-lg border border-border/70 bg-background/90 px-3 py-3 text-xs text-muted-foreground"
                  key={label}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollaborationPreviewMock() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
      <div className="rounded-xl border border-border/75 bg-background/95 p-4 shadow-[var(--surface-shadow-sm)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <p className="meta-label">Shared activity</p>
            <div className="mt-2 h-4 w-40 rounded-full bg-foreground/10" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            3 teammates
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {[
            "Quoted and shared customer link",
            "Added note about install timing",
            "Marked follow-up due Friday",
          ].map((label, index) => (
            <div
              className="soft-panel flex items-start gap-3 px-3 py-3 shadow-none"
              key={label}
            >
              <div className="mt-0.5 size-8 shrink-0 rounded-full bg-accent" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {index === 0 ? "Ava" : index === 1 ? "Mark" : "You"}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="soft-panel px-4 py-4 shadow-none">
          <p className="meta-label">Team access</p>
          <div className="mt-4 grid gap-2">
            {["Owner", "Ops", "Estimator"].map((role) => (
              <div
                className="flex items-center justify-between rounded-lg border border-border/70 bg-background/90 px-3 py-3"
                key={role}
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-accent" />
                  <span className="text-sm font-medium text-foreground">
                    {role}
                  </span>
                </div>
                <div className="h-2 w-14 rounded-full bg-border/70" />
              </div>
            ))}
          </div>
        </div>

        <div className="soft-panel px-4 py-4 shadow-none">
          <p className="meta-label">Customer history</p>
          <div className="mt-3 grid gap-2">
            {[
              "2 past quotes",
              "Last reply 4 days ago",
              "Install notes saved",
            ].map((label) => (
              <div
                className="rounded-lg border border-border/70 bg-background/90 px-3 py-3 text-xs text-muted-foreground"
                key={label}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  valueWidth,
}: {
  label: string;
  valueWidth: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className={cn("h-3 rounded-full bg-foreground/10", valueWidth)} />
    </div>
  );
}

function PreviewStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="info-tile px-4 py-4 shadow-none">
      <p className="meta-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
