import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card size="sm" className="h-full">
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
    <article className="marketing-faq-item h-full">
      <h3 className="text-base font-semibold tracking-tight text-foreground">{question}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
    </article>
  );
}
