import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  collapseLabel?: boolean;
  subtitle?: string | null;
};

export function BrandMark({
  className,
  collapseLabel = false,
  subtitle = "Owner workspace",
}: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-3 text-foreground",
        collapseLabel && "group-data-[collapsible=icon]:gap-0",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-[0.72rem] font-semibold tracking-[0.18em] text-primary-foreground shadow-sm">
        QF
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-col leading-none",
          collapseLabel && "group-data-[collapsible=icon]:hidden",
        )}
      >
        <span className="truncate font-heading text-[1.02rem] font-semibold tracking-tight">
          QuoteFlow
        </span>
        {subtitle !== null ? (
          <span className="truncate text-[0.64rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
