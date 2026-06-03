import {
  BellRing,
  Cloud,
  CreditCard,
  KeyRound,
  Mail,
  Server,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AdminConfigMatrixRow } from "@/lib/admin/health-checks";
import { cn } from "@/lib/utils";

const integrationIcons: Record<string, LucideIcon> = {
  Database: Server,
  "Better Auth": KeyRound,
  Supabase: Cloud,
  Email: Mail,
  AI: Sparkles,
  Inngest: Workflow,
  "Redis cache": Cloud,
  "Billing (Polar)": CreditCard,
  "Push (VAPID)": BellRing,
  "Admin access": KeyRound,
};

type AdminConfigMatrixProps = {
  rows: AdminConfigMatrixRow[];
};

export function AdminConfigMatrix({ rows }: AdminConfigMatrixProps) {
  const configuredCount = rows.filter((row) => row.configured).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Configuration
          </h2>
          <p className="text-sm text-muted-foreground">
            Which integrations have credentials set. Secret values are never
            shown.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {configuredCount}
          </span>{" "}
          of {rows.length} configured
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const Icon = integrationIcons[row.integration] ?? Server;

          return (
            <article
              className={cn(
                "soft-panel flex flex-col gap-3 px-4 py-4",
                row.configured
                  ? "border-primary/15"
                  : "opacity-95",
              )}
              key={row.integration}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <Badge variant={row.configured ? "default" : "outline"}>
                  {row.configured ? "Configured" : "Not set"}
                </Badge>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {row.integration}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {row.notes}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
