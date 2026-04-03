import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type InfoTileProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  valueClassName?: string;
};

export function InfoTile({
  label,
  value,
  description,
  icon: Icon,
  className,
  valueClassName,
}: InfoTileProps) {
  return (
    <div className={cn("info-tile", className)}>
      <div className="flex items-start gap-3.5">
        {Icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="meta-label">{label}</p>
          <div
            className={cn(
              "mt-2 text-base font-semibold leading-snug tracking-tight text-foreground",
              valueClassName,
            )}
          >
            {value}
          </div>
          {description ? (
            <div className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
