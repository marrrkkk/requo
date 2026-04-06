import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatusTone = "new" | "draft" | "waiting" | "sent";

export function HeroSignalPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border/75 bg-background/86 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-white/10 dark:bg-card dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_1px_rgba(0,0,0,0.16)]">
      <span className="meta-label">{label}</span>
      <span className="text-sm leading-6 text-foreground">{value}</span>
    </div>
  );
}

export function HeroDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="info-tile px-4 py-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="meta-label">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

export function QueueSignal({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/82 px-3 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </div>
  );
}

export function MarketingFeatureCard({
  icon: Icon,
  title,
  description,
  points,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  points: readonly string[];
}) {
  return (
    <Card size="sm">
      <CardHeader className="gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border/70 bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.34)] dark:border-white/8 dark:bg-accent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_1px_rgba(0,0,0,0.2)]">
          <Icon className="size-4" />
        </div>
        <div className="flex flex-col gap-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {points.map((point) => (
            <Badge className="h-7 px-3 text-[0.72rem]" key={point} variant="secondary">
              {point}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ShowcaseCallout({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="soft-panel px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
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

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <article className="marketing-faq-item">
      <h3 className="text-base font-semibold tracking-tight text-foreground">{question}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
    </article>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: string;
}) {
  const className = {
    new: "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/12 dark:text-sky-200",
    draft:
      "border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/12 dark:text-violet-200",
    waiting:
      "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-200",
    sent:
      "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200",
  }[tone];

  return (
    <Badge className={cn("shrink-0", className)} variant="secondary">
      {children}
    </Badge>
  );
}
