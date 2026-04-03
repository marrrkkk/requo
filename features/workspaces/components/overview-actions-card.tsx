import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type OverviewActionItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
};

type OverviewActionsCardProps = {
  items: OverviewActionItem[];
};

export function OverviewActionsCard({ items }: OverviewActionsCardProps) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card">
      <CardHeader className="gap-2">
        <CardTitle>Workspace shortcuts</CardTitle>
        <CardDescription>Fast access to the pages you use most.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="flex flex-col divide-y divide-border/70">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="group flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/35"
                href={item.href}
                key={item.label}
                prefetch={false}
                rel={item.external ? "noreferrer" : undefined}
                target={item.external ? "_blank" : undefined}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                {item.external ? (
                  <ArrowUpRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                ) : (
                  <ArrowRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
